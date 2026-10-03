import { canonicalJson, cloneJson, jsonBytes } from "./schema";
import {
  hasCapability,
  operations,
  validateInit,
  validateManifest,
  validateMessage,
} from "./validation";
import {
  ProtocolError,
  systemClock,
  type Clock,
  type Envelope,
  type Init,
  type JsonObject,
  type Phase,
  type StateSnapshot,
  type Transport,
} from "./types";

/** Bound by the player to one owner, room, review and server-issued package. */
export interface HostActions {
  read(): Promise<StateSnapshot>;
  save(state: JsonObject, expectedRevision: number, operationId: string): Promise<StateSnapshot>;
  reset(expectedRevision: number, operationId: string): Promise<StateSnapshot | null>;
  complete(goalIds: string[], revision: number, operationId: string): Promise<JsonObject>;
  navigate(direction: string): Promise<boolean>;
  progress(goalId: string, fraction: number): void;
  busy(value: boolean): void;
  current(): boolean;
}

/** No frame-supplied URL, RPC, receipt or XP is an authority. */
export class LessonHost {
  private phaseValue: Phase = "loading";
  private receivedSeq = 0;
  private sentSeq = 0;
  private unsubscribe?: () => void;
  private timer?: unknown;
  private lifecycle?: {
    id: string;
    phase: string;
    timer: unknown;
    resolve(clean: boolean): void;
    reject(error: ProtocolError): void;
  };
  private preparing?: Promise<boolean>;
  private markOpened!: (opened: boolean) => void;
  private opened = new Promise<boolean>((resolve) => {
    this.markOpened = resolve;
  });
  private init?: Init;
  private helloReceived = false;
  private uncertain?: string;
  private tail: Promise<unknown> = Promise.resolve();
  private navigationTail: Promise<unknown> = Promise.resolve();
  private records = new Map<
    string,
    { signature: string; key: string; promise?: Promise<JsonObject>; result?: JsonObject }
  >();
  private clock: Clock;
  readonly sessionId: string;
  constructor(
    private options: {
      manifest: unknown;
      manifestHash: string;
      transport: Transport;
      actions: HostActions;
      context: { locale: string; content: JsonObject; disabled: boolean; surface: JsonObject };
      validateState(state: JsonObject): void;
      status(phase: Phase): void;
      clock?: Clock;
      id?: () => string;
    }
  ) {
    validateManifest(options.manifest);
    this.clock = options.clock ?? systemClock;
    this.sessionId = (options.id ?? (() => crypto.randomUUID()))();
  }
  get phase() {
    return this.phaseValue;
  }
  private current() {
    return (
      this.phase !== "disposed" &&
      this.phase !== "recoverable-error" &&
      this.options.actions.current()
    );
  }
  private phaseTo(value: Phase) {
    this.phaseValue = value;
    this.options.status(value);
  }
  start() {
    if (this.unsubscribe || this.phase !== "loading")
      throw new ProtocolError("locked", "Already started.");
    this.unsubscribe = this.options.transport.subscribe((value) => {
      void this.receive(value).catch(() => this.fail());
    });
    this.timer = this.clock.setTimeout(() => this.fail(), 10000);
    this.phaseTo("negotiating");
    this.send("host.connect", "event", {
      transport: "message-port",
      manifestHash: this.options.manifestHash,
      manifest: cloneJson(this.options.manifest) as JsonObject,
    });
  }
  context(locale: string, disabled: boolean) {
    this.options.context.locale = locale;
    this.options.context.disabled = disabled;
    if (this.init && this.current()) this.send("host.context", "event", { locale, disabled });
  }
  private transition(phase: "running" | "paused", reason: string): Promise<boolean> {
    if (!this.current() || this.lifecycle)
      return Promise.reject(new ProtocolError("locked", "Lifecycle already changing."));
    return new Promise((resolve, reject) => {
      const id = this.send("host.lifecycle", "request", { phase, reason })!;
      const timer = this.clock.setTimeout(() => {
        if (this.lifecycle?.id !== id) return;
        this.lifecycle = undefined;
        reject(new ProtocolError("timeout", "Preparation timed out.", true));
        this.fail();
      }, 10000);
      this.lifecycle = { id, phase, timer, resolve, reject };
    });
  }
  /** Flush frame-local edits before a planned route, path or activity switch. */
  prepareNavigation(): Promise<boolean> {
    if (this.preparing) return this.preparing;
    const operation = (async () => {
      try {
        if (["loading", "negotiating", "ready"].includes(this.phase) && !(await this.opened))
          return false;
        if (!["running", "paused"].includes(this.phase)) return false;
        if (this.phase === "paused") await this.transition("running", "retained");
        const clean = await this.transition("paused", "navigation");
        if (!clean) await this.transition("running", "retained");
        return clean;
      } catch {
        return false;
      } finally {
        this.preparing = undefined;
      }
    })();
    this.preparing = operation;
    return operation;
  }
  async visibility(hidden: boolean) {
    if (this.preparing || this.lifecycle || !["running", "paused"].includes(this.phase)) return;
    const phase = hidden ? "paused" : "running";
    if (phase === this.phase) return;
    try {
      await this.transition(phase, hidden ? "background" : "foreground");
    } catch {
      this.fail();
    }
  }
  private send(type: string, kind: Envelope["kind"], payload: JsonObject, replyTo?: string) {
    if (!this.current()) return;
    const message: Envelope = {
      protocol: { major: 2, minor: 0 },
      sessionId: this.sessionId,
      seq: ++this.sentSeq,
      id: `host-${this.sentSeq}`,
      kind,
      type,
      payload: cloneJson(payload),
    };
    if (replyTo) message.replyTo = replyTo;
    validateMessage(message, {
      sender: "host",
      ...(kind === "response" ? { requestType: this.requestTypes.get(replyTo!) } : {}),
    });
    this.options.transport.send(message);
    return message.id;
  }
  private requestTypes = new Map<string, string>();
  private async receive(value: unknown) {
    if (!this.current()) {
      this.dispose();
      return;
    }
    const message = cloneJson(validateMessage(value, { sender: "lesson" }));
    if (message.sessionId !== this.sessionId || message.seq <= this.receivedSeq) return;
    if (message.protocol.major !== 2 || message.protocol.minor !== 0)
      throw new ProtocolError("unsupported", "Unsupported protocol.");
    this.receivedSeq = message.seq;
    const manifest = validateManifest(this.options.manifest);
    if (message.type === "lesson.hello") {
      if (
        this.phase !== "negotiating" ||
        this.helloReceived ||
        this.init ||
        message.payload.lessonId !== manifest.id ||
        message.payload.manifestHash !== this.options.manifestHash ||
        (message.payload.sdk as JsonObject).major !== 1
      )
        throw new ProtocolError("invalid_message", "Hello binding mismatch.");
      this.helloReceived = true;
      if (manifest.requires.length)
        throw new ProtocolError("missing_capability", "Required capability unavailable.");
      const state = await this.options.actions.read();
      if (!this.current()) return;
      this.options.validateState(state.value);
      this.init = validateInit(manifest, {
        lessonId: manifest.id,
        manifestHash: this.options.manifestHash,
        ...cloneJson(this.options.context),
        state,
        capabilities: [],
        limits: { messageBytes: 262144, stateBytes: Math.min(65536, manifest.state.maxBytes) },
      });
      this.send("host.init", "event", this.init as unknown as JsonObject);
      return;
    }
    if (message.type === "lesson.ready") {
      if (
        !this.init ||
        this.phase !== "negotiating" ||
        message.payload.stateRevision !== this.init.state.revision
      )
        throw new ProtocolError("invalid_message", "Ready mismatch.");
      this.phaseTo("ready");
      void this.transition("running", "opened").catch(() => this.fail());
      return;
    }
    if (message.kind === "response") {
      if (!this.lifecycle || message.replyTo !== this.lifecycle.id)
        throw new ProtocolError("invalid_message", "Unexpected lifecycle result.");
      validateMessage(message, { sender: "lesson", requestType: "host.lifecycle" });
      if (
        !message.payload.ok ||
        (message.payload.data as JsonObject).phase !== this.lifecycle.phase
      )
        throw new ProtocolError("invalid_message", "Lifecycle refused.");
      this.phaseTo(this.lifecycle.phase as Phase);
      if (this.phase === "running") this.markOpened(true);
      const pending = this.lifecycle;
      this.lifecycle = undefined;
      this.clock.clearTimeout(pending.timer);
      pending.resolve((message.payload.data as JsonObject).dirty !== true);
      this.clock.clearTimeout(this.timer);
      return;
    }
    if (!["running", "paused"].includes(this.phase))
      throw new ProtocolError("locked", "Not running.");
    const operation = Object.hasOwn(operations, message.type)
      ? operations[message.type]
      : undefined;
    if (message.kind === "event") {
      if (message.type === "lesson.error") {
        this.fail();
        return;
      }
      if (message.type === "lesson.busy") this.options.actions.busy(message.payload.busy === true);
      if (message.type === "goals.progress") {
        if (!manifest.goals.some((goal) => goal.id === message.payload.goalId))
          throw new ProtocolError("invalid_message", "Unknown goal.");
        this.options.actions.progress(
          message.payload.goalId as string,
          message.payload.fraction as number
        );
      }
      return;
    }
    if (this.records.size >= 1024 && !this.records.has(message.id))
      throw new ProtocolError("rate_limited", "Too many operations in one document.");
    this.requestTypes.set(message.id, message.type);
    const signature = canonicalJson({ type: message.type, payload: message.payload });
    let record = this.records.get(message.id);
    if (record && record.signature !== signature) {
      this.replyError(message, new ProtocolError("operation_conflict", "Operation changed."));
      return;
    }
    if (!record) {
      // Bound resource ordering also covers malicious parallel requests, independently of the SDK.
      record = { signature, key: crypto.randomUUID() };
      this.records.set(message.id, record);
    }
    try {
      if (record.result) {
        this.send("rpc.result", "response", { ok: true, data: record.result }, message.id);
        return;
      }
      if (!record.promise) {
        const bound = record;
        const execute = async () => {
          if (message.type === "navigation.request" && !(await this.prepareNavigation()))
            return { accepted: false };
          return run();
        };
        const run = async () => {
          if (!this.current()) throw new ProtocolError("cancelled", "Connection closed.");
          if (operation?.capability && !hasCapability([], operation.capability))
            throw new ProtocolError("missing_capability", "Capability unavailable.");
          const mutating = [
            "state.save",
            "state.reset",
            "completion.request",
            "navigation.request",
          ].includes(message.type);
          if (mutating && this.uncertain && this.uncertain !== message.id)
            throw new ProtocolError("locked", "Retry the unconfirmed operation first.");
          let result: JsonObject;
          try {
            result = await this.perform(message, bound.key);
            if (this.uncertain === message.id) this.uncertain = undefined;
          } catch (error) {
            if (mutating && (!(error instanceof ProtocolError) || error.retryable))
              this.uncertain = message.id;
            throw error;
          }
          if (!this.current()) throw new ProtocolError("cancelled", "Connection closed.");
          bound.result = cloneJson(result);
          return result;
        };
        const previous =
          message.type === "navigation.request"
            ? this.navigationTail.catch(() => {}).then(() => this.tail)
            : this.tail;
        bound.promise = previous.catch(() => {}).then(execute);
        // Lifecycle preparation may issue a final state.save; it must not queue behind navigation.
        if (message.type === "navigation.request") this.navigationTail = bound.promise;
        else this.tail = bound.promise;
      }
      const promise = record.promise!;
      try {
        this.send("rpc.result", "response", { ok: true, data: await promise }, message.id);
      } finally {
        if (record.promise === promise) record.promise = undefined;
      }
    } catch (error) {
      this.replyError(message, error);
    }
  }
  private async perform(message: Envelope, operationId: string): Promise<JsonObject> {
    const { type, payload: p } = message;
    const manifest = validateManifest(this.options.manifest);
    const revision = () => {
      if (
        (p.expectedRevision !== undefined && p.expectedRevision !== this.init!.state.revision) ||
        (p.stateRevision !== undefined && p.stateRevision !== this.init!.state.revision)
      )
        throw new ProtocolError("conflict", "Saved work changed.", false, {
          revision: this.init!.state.revision,
        });
    };
    const adopt = (snapshot: StateSnapshot) => {
      this.options.validateState(snapshot.value);
      if (
        snapshot.schemaVersion !== manifest.state.schemaVersion ||
        jsonBytes(snapshot.value) > this.init!.limits.stateBytes
      )
        throw new ProtocolError("unsupported", "Incompatible saved work.");
      if (snapshot.revision >= this.init!.state.revision) this.init!.state = cloneJson(snapshot);
      return {
        revision: snapshot.revision,
        schemaVersion: snapshot.schemaVersion,
        state: snapshot.value,
        maxBytes: this.init!.limits.stateBytes,
      };
    };
    if (type === "state.read") return adopt(await this.options.actions.read());
    if (
      ["state.save", "state.reset", "completion.request", "navigation.request"].includes(type) &&
      this.options.context.disabled
    )
      throw new ProtocolError("locked", "Activity locked.");
    if (type === "state.save") {
      revision();
      if (p.schemaVersion !== manifest.state.schemaVersion)
        throw new ProtocolError("unsupported", "State needs migration.");
      if (serverStateBytes(p.state) > this.init!.limits.stateBytes)
        throw new ProtocolError("too_large", "Work too large.");
      this.options.validateState(p.state as JsonObject);
      const saved = await this.options.actions.save(
        cloneJson(p.state as JsonObject),
        p.expectedRevision as number,
        operationId
      );
      adopt(saved);
      return { revision: saved.revision, persisted: true };
    }
    if (type === "state.reset") {
      revision();
      const saved = await this.options.actions.reset(p.expectedRevision as number, operationId);
      return saved ? { cancelled: false, ...adopt(saved) } : { cancelled: true };
    }
    if (type === "completion.request") {
      revision();
      const goals = p.goalIds as string[];
      if (
        !goals.length ||
        new Set(goals).size !== goals.length ||
        goals.some(
          (id) =>
            !manifest.goals.some((goal) => goal.id === id && goal.assessment.kind === "introduced")
        ) ||
        (p.receiptHandles as string[]).length
      )
        throw new ProtocolError("invalid_receipt", "No verified assessment receipt.");
      // Only the existing server introduction check can confirm this path. No client XP.
      return this.options.actions.complete(goals, p.stateRevision as number, operationId);
    }
    if (type === "navigation.request")
      return { accepted: await this.options.actions.navigate(p.direction as string) };
    if (type === "navigation.policy")
      return { epoch: ++this.policyEpoch, swipe: { forward: false, back: false } };
    if (type === "navigation.gesture") return { accepted: false }; // Gesture arbitration is J3.
    if (type === "display.fullscreen")
      return { mode: "page", needsHostGesture: p.requested === true };
    if (type === "audio.preference") return { enabled: false, userActivationRequired: true };
    if (type === "request.cancel") return { cancelled: false };
    throw new ProtocolError(
      type.startsWith("llm.") ? "llm_paused" : "unsupported",
      "This action is unavailable."
    );
  }
  private policyEpoch = 0;
  private replyError(message: Envelope, error: unknown) {
    const e =
      error instanceof ProtocolError
        ? error
        : new ProtocolError(
            "offline",
            "Confirmation is unavailable. Retry keeps the same operation.",
            true
          );
    this.send(
      "rpc.result",
      "response",
      {
        ok: false,
        error: { code: e.code, message: e.message, retryable: e.retryable, ...e.details },
      },
      message.id
    );
  }
  fail() {
    if (this.phase === "disposed" || this.phase === "recoverable-error") return;
    this.close();
    this.phaseTo("recoverable-error");
  }
  dispose() {
    if (this.phase === "disposed") return;
    this.close();
    this.phaseTo("disposed");
  }
  private close() {
    this.markOpened(false);
    this.clock.clearTimeout(this.timer);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.options.transport.close();
    this.options.actions.busy(false);
    if (this.lifecycle) {
      this.clock.clearTimeout(this.lifecycle.timer);
      this.lifecycle.reject(new ProtocolError("cancelled", "Connection closed."));
      this.lifecycle = undefined;
    }
  }
}

/** Skills uses JSON separators with spaces; preserve its actual 64 KiB limit. */
export function serverStateBytes(value: unknown): number {
  let size = jsonBytes(value),
    quoted = false,
    escaped = false;
  for (const char of JSON.stringify(value)) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quoted && char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') quoted = !quoted;
    if (!quoted && (char === ":" || char === ",")) size++;
  }
  return size;
}
