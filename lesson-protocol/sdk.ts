import { canonicalJson, cloneJson, jsonBytes } from "./schema";
import {
  hasCapability,
  operations,
  recognizedResult,
  resultSignature,
  validateInit,
  validateManifest,
  validateMessage,
} from "./validation";
import {
  ProtocolError,
  systemClock,
  type Capability,
  type Clock,
  type Envelope,
  type Init,
  type JsonObject,
  type Manifest,
  type Phase,
  type StateSnapshot,
  type Transport,
  type Version,
} from "./types";

interface RequestRecord {
  type: string;
  payload: JsonObject;
  signature: string;
  promise?: Promise<JsonObject>;
  resolve?: (data: JsonObject) => void;
  reject?: (error: ProtocolError) => void;
  timer?: unknown;
  result?: JsonObject;
}
export interface SDKOptions {
  manifest: unknown;
  manifestHash: string;
  transport: Transport;
  protocol?: Version;
  clock?: Clock;
  validateState?: (value: JsonObject, schemaVersion: number) => void;
  onError?: (error: ProtocolError) => void;
  onLifecycle?: (
    phase: "running" | "paused" | "suspending" | "disposed",
    reason: string
  ) => boolean | Promise<boolean>;
}
const opposite = (direction: "next" | "previous") => (direction === "next" ? "forward" : "back");
const MUTATIONS: Record<string, string> = {
  "state.save": "state",
  "state.reset": "state",
  "project.save": "project",
  "assessment.submit": "assessment",
  "assessment.fallback": "assessment",
  "assessment.appeal": "assessment",
  "completion.request": "assessment",
};

/** Lesson-side connection. The host owns registry, authentication and server commits. */
export class LessonSDK {
  readonly manifest: Manifest;
  private readonly version: Version;
  private readonly clock: Clock;
  private phaseValue: Phase = "loading";
  private closed = false;
  private initValue?: Init;
  private sessionId?: string;
  private sentSeq = 0;
  private receivedSeq = 0;
  private nextId = 0;
  private unsubscribe?: () => void;
  private handshakeTimer?: unknown;
  private startPromise?: Promise<Init>;
  private resolveStart?: (init: Init) => void;
  private rejectStart?: (error: ProtocolError) => void;
  private requests = new Map<string, RequestRecord>();
  private hostRequests = new Map<string, { signature: string; result?: Promise<JsonObject> }>();
  private queues = new Map<string, Promise<unknown>>();
  private listeners = new Map<string, Set<(payload: JsonObject) => void>>();
  private awards = new Set<string>();
  private policy = { epoch: 0, swipe: { forward: false, back: false } };

  constructor(private readonly options: SDKOptions) {
    this.manifest = cloneJson(validateManifest(options.manifest));
    this.version = cloneJson(options.protocol ?? { major: 2, minor: 0 });
    if (
      this.version.major !== 2 ||
      !Number.isSafeInteger(this.version.minor) ||
      this.version.minor < this.manifest.protocol.minor
    )
      throw new ProtocolError("unsupported", "Unsupported protocol version.");
    if (!/^[a-f0-9]{64}$/.test(options.manifestHash))
      throw new ProtocolError("invalid_message", "Invalid manifest hash.");
    this.clock = options.clock ?? systemClock;
  }
  get phase(): Phase {
    return this.phaseValue;
  }
  get snapshot(): StateSnapshot | undefined {
    return this.initValue && cloneJson(this.initValue.state);
  }
  get context(): Init | undefined {
    return this.initValue && cloneJson(this.initValue);
  }
  get navigationPolicy() {
    return cloneJson(this.policy);
  }
  capability(id: string, major = 1, minMinor = 0): Capability | undefined {
    const capability = this.initValue?.capabilities.find(
      (item) => item.id === id && item.major === major && item.minor >= minMinor
    );
    return capability && cloneJson(capability);
  }
  on(type: string, listener: (payload: JsonObject) => void): () => void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
    return () => {
      set.delete(listener);
      if (!set.size) this.listeners.delete(type);
    };
  }

  start(): Promise<Init> {
    if (this.phaseValue === "disposed")
      return Promise.reject(new ProtocolError("cancelled", "Connection closed."));
    if (this.startPromise) return this.startPromise;
    this.startPromise = new Promise((resolve, reject) => {
      this.resolveStart = resolve;
      this.rejectStart = reject;
    });
    this.handshakeTimer = this.clock.setTimeout(
      () =>
        this.failStart(
          new ProtocolError("timeout", "Connection timed out; retry with a new connection.", true)
        ),
      10000
    );
    try {
      this.unsubscribe = this.options.transport.subscribe((value) => {
        void this.receive(value).catch((error) => {
          if (!this.initValue && !this.closed) this.failStart(this.asError(error));
          else this.report(error);
        });
      });
    } catch (error) {
      this.failStart(this.asError(error));
    }
    return this.startPromise;
  }
  ready(sceneId: string): void {
    if (this.phaseValue !== "negotiating" || !this.initValue)
      throw new ProtocolError("invalid_message", "Init must be applied before ready.");
    this.phaseValue = "ready";
    try {
      this.send("lesson.ready", "event", { stateRevision: this.initValue.state.revision, sceneId });
    } catch (error) {
      this.phaseValue = "negotiating";
      throw error;
    }
  }

  event(type: string, payload: JsonObject): void {
    this.assertActive();
    this.assertOperation(type, "event");
    this.assertGoals(type, payload);
    this.send(type, "event", payload);
  }
  progress(goalId: string, fraction: number): void {
    this.event("goals.progress", { goalId, fraction });
  }
  busy(busy: boolean, reason: "saving" | "checking" | "preparing"): void {
    this.event("lesson.busy", { busy, reason });
  }
  error(code: string, recoverable = true): void {
    this.event("lesson.error", { code, recoverable });
  }
  readState(): Promise<JsonObject> {
    return this.request("state.read", {});
  }
  saveState(
    state: JsonObject,
    options: { id?: string; expectedRevision?: number } = {}
  ): Promise<JsonObject> {
    const previous = options.id ? this.requests.get(options.id) : undefined;
    return this.request(
      "state.save",
      {
        state,
        expectedRevision:
          options.expectedRevision ??
          (previous?.type === "state.save"
            ? // Cached requests have passed the state.save schema, including this integer.
              (previous.payload.expectedRevision as number)
            : (this.initValue?.state.revision ?? 0)),
        schemaVersion: this.manifest.state.schemaVersion,
      },
      { id: options.id }
    );
  }
  resetState(id?: string): Promise<JsonObject> {
    const previous = id ? this.requests.get(id) : undefined;
    return this.request(
      "state.reset",
      {
        expectedRevision:
          previous?.type === "state.reset"
            ? // Cached requests have passed the state.reset schema, including this integer.
              (previous.payload.expectedRevision as number)
            : (this.initValue?.state.revision ?? 0),
      },
      { id }
    );
  }
  navigation(swipe: { forward: boolean; back: boolean }, id?: string): Promise<JsonObject> {
    return this.request("navigation.policy", { swipe }, { id });
  }
  navigate(direction: "next" | "previous" | "skip" | "close", id?: string): Promise<JsonObject> {
    return this.request("navigation.request", { direction }, { id });
  }
  /** J3 supplies the pointer recognizer. Only a completed, eligible swipe reaches this method. */
  gesture(input: {
    direction: "next" | "previous";
    epoch: number;
    distanceCss: number;
    crossDistanceCss: number;
    owner: "scene" | "navigation";
    completed: boolean;
    cancelled?: boolean;
    multiTouch?: boolean;
    zooming?: boolean;
    selectingText?: boolean;
    inputOpen?: boolean;
  }): Promise<JsonObject> {
    if (
      !input.completed ||
      input.owner !== "navigation" ||
      input.cancelled ||
      input.multiTouch ||
      input.zooming ||
      input.selectingText ||
      input.inputOpen ||
      input.epoch !== this.policy.epoch ||
      !this.policy.swipe[opposite(input.direction)] ||
      Math.abs(input.distanceCss) < 64 ||
      Math.abs(input.distanceCss) < 1.5 * Math.abs(input.crossDistanceCss) ||
      (input.direction === "next" ? input.distanceCss >= 0 : input.distanceCss <= 0)
    )
      return Promise.reject(
        new ProtocolError("locked", "Swipe belongs to the scene or is not released.")
      );
    return this.performRequest(
      "navigation.gesture",
      {
        direction: input.direction,
        epoch: input.epoch,
        distanceCss: input.distanceCss,
        crossDistanceCss: input.crossDistanceCss,
      },
      {},
      true
    );
  }

  request(type: string, payload: JsonObject, options: { id?: string } = {}): Promise<JsonObject> {
    return this.performRequest(type, payload, options);
  }
  retry(id: string): Promise<JsonObject> {
    const record = this.requests.get(id);
    if (!record)
      return Promise.reject(new ProtocolError("invalid_message", "Unknown operation ID."));
    return this.performRequest(
      record.type,
      record.payload,
      { id },
      record.type === "navigation.gesture"
    );
  }
  private performRequest(
    type: string,
    payload: JsonObject,
    options: { id?: string },
    verifiedGesture = false
  ): Promise<JsonObject> {
    try {
      this.assertActive();
      this.assertOperation(type, "request");
      this.assertGoals(type, payload);
      if (type === "navigation.gesture" && !verifiedGesture)
        throw new ProtocolError("locked", "Use a verified gesture candidate.");
      const id = options.id ?? `l-operation-${++this.nextId}`;
      const stablePayload = cloneJson(payload);
      const signature = canonicalJson({ type, payload: stablePayload });
      const existing = this.requests.get(id);
      if (existing && existing.signature !== signature)
        throw new ProtocolError("operation_conflict", "Operation ID has changed data.");
      if (existing?.result) return Promise.resolve(cloneJson(existing.result));
      if (existing?.promise) return existing.promise;
      const record: RequestRecord = existing ?? { type, payload: stablePayload, signature };
      this.requests.set(id, record);
      const resource = MUTATIONS[type];
      const previous = resource && this.queues.get(resource);
      const transmit = () =>
        new Promise<JsonObject>((resolve, reject) => {
          record.resolve = resolve;
          record.reject = reject;
          try {
            this.assertActive();
            this.assertOperation(type, "request");
            if (record.result) {
              resolve(cloneJson(record.result));
              record.resolve = undefined;
              record.reject = undefined;
              return;
            }
            if (resource && this.initValue!.disabled)
              throw new ProtocolError("locked", "Activity is locked.");
            this.checkStateRequest(type, stablePayload);
            record.timer = this.clock.setTimeout(
              () =>
                this.rejectRequest(
                  record,
                  new ProtocolError(
                    "timeout",
                    "Confirmation timed out; the operation may have committed. Retry the same ID.",
                    true
                  )
                ),
              10000
            );
            this.send(type, "request", stablePayload, id);
          } catch (error) {
            this.rejectRequest(record, this.asError(error));
          }
        });
      record.promise = previous ? previous.catch(() => {}).then(transmit) : transmit();
      if (resource) this.queues.set(resource, record.promise);
      void record.promise
        .finally(() => {
          record.promise = undefined;
        })
        .catch(() => {});
      return record.promise;
    } catch (error) {
      return Promise.reject(this.asError(error));
    }
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    this.phaseValue = "disposed";
    this.clock.clearTimeout(this.handshakeTimer);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.options.transport.close();
    const cancelled = new ProtocolError("cancelled", "Connection closed.");
    this.rejectStart?.(cancelled);
    this.resolveStart = undefined;
    this.rejectStart = undefined;
    for (const record of this.requests.values()) this.rejectRequest(record, cancelled);
    this.requests.clear();
    this.hostRequests.clear();
    this.queues.clear();
    this.listeners.clear();
    this.awards.clear();
    this.initValue = undefined;
    this.sessionId = undefined;
    this.policy = { epoch: 0, swipe: { forward: false, back: false } };
  }

  private assertActive(): void {
    if (!["ready", "running", "paused", "suspending"].includes(this.phaseValue))
      throw new ProtocolError("cancelled", "Connection is not ready.");
  }
  private assertOperation(type: string, kind: "event" | "request"): void {
    const operation = Object.hasOwn(operations, type) ? operations[type] : undefined;
    if (
      !operation ||
      operation.kind !== kind ||
      !operation.senders.includes("lesson") ||
      ["lesson.hello", "lesson.ready"].includes(type)
    )
      throw new ProtocolError("unsupported", "Unsupported lesson operation.");
    if (
      operation.capability &&
      !hasCapability(this.initValue?.capabilities ?? [], operation.capability)
    )
      throw new ProtocolError("missing_capability", "Capability is unavailable.");
    if (type === "llm.respond" && this.capability("host.llm")?.availability !== "available")
      throw new ProtocolError("llm_paused", "Model access is paused.");
  }
  private assertGoals(type: string, payload: JsonObject): void {
    if (
      ![
        "goals.progress",
        "assessment.submit",
        "assessment.fallback",
        "assessment.result",
        "reward.committed",
        "completion.request",
      ].includes(type)
    )
      return;
    const goals = new Set(this.manifest.goals.map((goal) => goal.id));
    if (
      type !== "completion.request" &&
      payload.goalId !== undefined &&
      !goals.has(payload.goalId as string)
    )
      throw new ProtocolError("invalid_message", "Unknown goal.");
    if (
      type === "completion.request" &&
      Array.isArray(payload.goalIds) &&
      payload.goalIds.some((goal) => !goals.has(goal as string))
    )
      throw new ProtocolError("invalid_message", "Unknown goal.");
  }
  private checkStateRequest(type: string, payload: JsonObject): void {
    if (type === "state.save") {
      if (payload.schemaVersion !== this.manifest.state.schemaVersion)
        throw new ProtocolError("unsupported", "State needs migration.");
      if (jsonBytes(payload.state) > this.initValue!.limits.stateBytes)
        throw new ProtocolError("too_large", "State too large.");
      this.options.validateState?.(payload.state as JsonObject, payload.schemaVersion as number);
    }
    if (
      type === "project.save" &&
      jsonBytes(payload.state) > (this.initValue!.limits.projectBytes ?? 65536)
    )
      throw new ProtocolError("too_large", "Project too large.");
  }
  private send(
    type: string,
    kind: Envelope["kind"],
    payload: JsonObject,
    id = `l-message-${++this.nextId}`,
    replyTo?: string
  ): void {
    if (this.sentSeq >= Number.MAX_SAFE_INTEGER)
      throw new ProtocolError("unsupported", "Sequence exhausted; reconnect.");
    const message: Envelope = {
      protocol: this.version,
      sessionId: this.sessionId!,
      seq: ++this.sentSeq,
      id,
      kind,
      type,
      payload: cloneJson(payload),
    };
    if (replyTo) message.replyTo = replyTo;
    validateMessage(message, { sender: "lesson", maxBytes: this.initValue?.limits.messageBytes });
    this.options.transport.send(message);
  }
  private async receive(value: unknown): Promise<void> {
    if (this.phaseValue === "disposed" || this.phaseValue === "recoverable-error") return;
    const message = cloneJson(
      validateMessage(value, { sender: "host", maxBytes: this.initValue?.limits.messageBytes })
    );
    if (
      message.protocol.major !== this.version.major ||
      message.protocol.minor < this.manifest.protocol.minor
    )
      throw new ProtocolError("unsupported", "Host protocol is too old.");
    if (this.sessionId && message.sessionId !== this.sessionId) return;
    if (message.seq <= this.receivedSeq) return;
    this.receivedSeq = message.seq;
    if (message.type === "host.connect") {
      if (
        this.sessionId ||
        this.phaseValue !== "loading" ||
        message.payload.manifestHash !== this.options.manifestHash
      )
        return this.failStart(new ProtocolError("invalid_message", "Unexpected connect binding."));
      this.sessionId = message.sessionId;
      this.phaseValue = "negotiating";
      this.send("lesson.hello", "event", {
        lessonId: this.manifest.id,
        manifestHash: this.options.manifestHash,
        sdk: { major: 1, minor: 0 },
      });
      return;
    }
    if (!this.sessionId) throw new ProtocolError("invalid_message", "Connect required.");
    if (message.type === "host.init") {
      if (this.initValue || this.phaseValue !== "negotiating")
        throw new ProtocolError("invalid_message", "Unexpected init.");
      try {
        const init = validateInit(this.manifest, message.payload);
        if (init.manifestHash !== this.options.manifestHash)
          throw new ProtocolError("invalid_message", "Init manifest mismatch.");
        this.options.validateState?.(init.state.value, init.state.schemaVersion);
        this.initValue = cloneJson(init);
        this.clock.clearTimeout(this.handshakeTimer);
        this.resolveStart?.(cloneJson(init));
        this.resolveStart = undefined;
        this.rejectStart = undefined;
      } catch (error) {
        this.failStart(this.asError(error));
      }
      return;
    }
    this.assertActive();
    if (message.kind === "response") {
      const record = this.requests.get(message.replyTo!);
      if (!record) throw new ProtocolError("invalid_message", "Unknown response reference.");
      validateMessage(message, { sender: "host", requestType: record.type });
      if (record.result) {
        if (
          !message.payload.ok ||
          resultSignature(record.type, record.result) !==
            resultSignature(record.type, message.payload.data as JsonObject)
        )
          throw new ProtocolError("operation_conflict", "Conflicting duplicate response.");
        return;
      }
      if (!message.payload.ok) {
        const error = message.payload.error as JsonObject;
        this.rejectRequest(
          record,
          new ProtocolError(
            error.code as string,
            error.message as string,
            error.retryable as boolean,
            cloneJson(error)
          )
        );
        return;
      }
      const data = cloneJson(message.payload.data as JsonObject);
      this.applyResult(record, recognizedResult(record.type, data));
      record.result = data;
      this.clock.clearTimeout(record.timer);
      record.resolve?.(cloneJson(data));
      record.resolve = undefined;
      record.reject = undefined;
      return;
    }
    const operation = Object.hasOwn(operations, message.type)
      ? operations[message.type]
      : undefined;
    if (!operation) {
      if (message.kind === "request")
        this.send(
          "rpc.result",
          "response",
          {
            ok: false,
            error: { code: "unsupported", message: "Unsupported operation.", retryable: false },
          },
          undefined,
          message.id
        );
      return;
    }
    if (operation.capability && !hasCapability(this.initValue!.capabilities, operation.capability))
      throw new ProtocolError("missing_capability", "Unnegotiated host event.");
    if (message.kind === "request") return this.handleHostRequest(message);
    this.assertGoals(message.type, message.payload);
    if (message.type === "host.context") {
      if (!this.manifest.languages.includes(message.payload.locale as string))
        throw new ProtocolError("unsupported", "Undeclared locale.");
      this.initValue!.locale = message.payload.locale as string;
      this.initValue!.disabled = message.payload.disabled as boolean;
    }
    if (message.type === "host.surface") {
      if ((message.payload.revision as number) <= (this.initValue!.surface.revision as number))
        return;
      this.initValue!.surface = cloneJson(message.payload);
    }
    if (message.type === "reward.committed") {
      if (this.awards.has(message.payload.awardId as string)) return;
      this.awards.add(message.payload.awardId as string);
    }
    for (const listener of this.listeners.get(message.type) ?? [])
      listener(cloneJson(message.payload));
  }
  private async handleHostRequest(message: Envelope): Promise<void> {
    const signature = canonicalJson({ type: message.type, payload: message.payload });
    const existing = this.hostRequests.get(message.id);
    if (existing && existing.signature !== signature) {
      this.send(
        "rpc.result",
        "response",
        {
          ok: false,
          error: {
            code: "operation_conflict",
            message: "Operation ID has changed data.",
            retryable: false,
          },
        },
        undefined,
        message.id
      );
      return;
    }
    const perform = async (): Promise<JsonObject> => {
      if (message.type === "request.cancel") return { cancelled: false };
      const phase = message.payload.phase as "running" | "paused" | "suspending" | "disposed";
      const allowed: Partial<Record<Phase, string[]>> = {
        ready: ["running", "disposed"],
        running: ["paused", "suspending", "disposed"],
        paused: ["running", "suspending", "disposed"],
        suspending: ["disposed"],
      };
      if (!allowed[this.phaseValue]?.includes(phase))
        throw new ProtocolError("invalid_message", "Invalid lifecycle transition.");
      const dirty =
        (await this.options.onLifecycle?.(phase, message.payload.reason as string)) ?? false;
      if (this.closed) throw new ProtocolError("cancelled", "Connection closed.");
      this.phaseValue = phase;
      return { phase, dirty };
    };
    const previous = this.queues.get("host-lifecycle");
    const result =
      existing?.result ??
      (previous
        ? previous
            .catch(() => {})
            .then(() => {
              if (this.closed) throw new ProtocolError("cancelled", "Connection closed.");
              return perform();
            })
        : perform());
    if (!existing?.result) {
      this.hostRequests.set(message.id, { signature, result });
      this.queues.set("host-lifecycle", result);
    }
    try {
      const data = await result;
      if (!this.sessionId) return;
      const response: Envelope = {
        protocol: this.version,
        sessionId: this.sessionId,
        seq: this.sentSeq + 1,
        id: "response-check",
        kind: "response",
        type: "rpc.result",
        replyTo: message.id,
        payload: { ok: true, data },
      };
      validateMessage(response, { sender: "lesson", requestType: message.type });
      this.send("rpc.result", "response", { ok: true, data }, undefined, message.id);
      if (data.phase === "disposed") this.dispose();
    } catch (error) {
      if (!this.sessionId) return;
      const failure = this.asError(error);
      if (failure.retryable) {
        const record = this.hostRequests.get(message.id);
        if (record?.result === result) record.result = undefined;
      }
      this.send(
        "rpc.result",
        "response",
        {
          ok: false,
          error: { code: failure.code, message: failure.message, retryable: failure.retryable },
        },
        undefined,
        message.id
      );
    }
  }
  private applyResult(record: RequestRecord, data: JsonObject): void {
    if (
      ["state.read", "state.save", "state.reset"].includes(record.type) &&
      data.cancelled !== true
    ) {
      const revision = data.revision as number;
      const state = record.type === "state.save" ? record.payload.state : data.state;
      const schemaVersion = (data.schemaVersion ??
        record.payload.schemaVersion ??
        this.initValue!.state.schemaVersion) as number;
      if (schemaVersion !== this.manifest.state.schemaVersion)
        throw new ProtocolError("unsupported", "State needs migration.");
      if (jsonBytes(state) > this.initValue!.limits.stateBytes)
        throw new ProtocolError("too_large", "State too large.");
      this.options.validateState?.(state as JsonObject, schemaVersion);
      if (revision >= this.initValue!.state.revision)
        this.initValue!.state = { revision, schemaVersion, value: cloneJson(state as JsonObject) };
    }
    if (record.type === "navigation.policy" && (data.epoch as number) > this.policy.epoch)
      this.policy = {
        epoch: data.epoch as number,
        swipe: cloneJson(data.swipe as { forward: boolean; back: boolean }),
      };
  }
  private rejectRequest(record: RequestRecord, error: ProtocolError): void {
    this.clock.clearTimeout(record.timer);
    record.reject?.(error);
    record.reject = undefined;
    record.resolve = undefined;
  }
  private failStart(error: ProtocolError): void {
    this.phaseValue = "recoverable-error";
    this.clock.clearTimeout(this.handshakeTimer);
    this.rejectStart?.(error);
    this.rejectStart = undefined;
    this.resolveStart = undefined;
    this.report(error);
  }
  private asError(error: unknown): ProtocolError {
    return error instanceof ProtocolError
      ? error
      : new ProtocolError("internal", "Connection operation failed.", true);
  }
  private report(error: unknown): void {
    this.options.onError?.(this.asError(error));
  }
}
