import { canonicalJson, cloneJson, jsonBytes } from "./schema";
import {
  HOST_ASSESSMENT,
  PROTOCOL_MINOR,
  hasCapability,
  operations,
  validateDefinition,
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

/**
 * Protocol 2.1: the server assessment of deterministic goals. The player binds
 * these adapters to the unit, the course and the package revision whose bytes
 * it loaded. Every answer is a server answer; the host adds nothing to it but
 * the session handle of a counted pass.
 */
export interface HostAssessment {
  revisionId: string;
  packageHash: string;
  /** The public start of a task and the submissions the server already holds for it. */
  start(goalId: string, operationId: string): Promise<JsonObject>;
  submit(
    goalId: string,
    stateRevision: number,
    answer: JsonObject,
    operationId: string
  ): Promise<JsonObject>;
  status(assessmentId: string): Promise<JsonObject>;
  /** Completed only when the server has booked the pass of the whole unit. */
  complete(goalIds: string[], stateRevision: number, operationId: string): Promise<JsonObject>;
}

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
  display?(requested: boolean): Promise<JsonObject>;
  /** Without these adapters the host grants no host.assessment. */
  assessment?: HostAssessment;
}
const MUTATIONS = [
  "state.save",
  "state.reset",
  "completion.request",
  "navigation.request",
  "navigation.gesture",
];
const ASSESSMENT_MUTATIONS = ["task.start", "assessment.submit"];

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
  private version: Version;
  /** Set when host.assessment was granted in this session. */
  private assessment?: HostAssessment;
  private views = new Map<string, { goalId: string; pending: boolean; handle?: string }>();
  private handles = new Map<string, string>();
  private polls = new Map<string, unknown>();
  private awards = new Set<string>();
  private rewards: JsonObject[] = [];
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
    const manifest = validateManifest(options.manifest);
    if (manifest.protocol.minor > PROTOCOL_MINOR)
      throw new ProtocolError("unsupported", "Unsupported protocol.");
    // The session speaks the minor version of its package: 2.0 packages keep 2.0.
    this.version = { major: 2, minor: manifest.protocol.minor };
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
  surface(value: JsonObject) {
    if ((value.revision as number) <= (this.options.context.surface.revision as number)) return;
    this.options.context.surface = cloneJson(value);
    if (this.init) this.init.surface = cloneJson(value);
    if (this.init && this.current()) this.send("host.surface", "event", value);
  }
  /** Host controls use the same flush/save/navigation contract as frame requests. */
  private navigating = false;
  async navigate(
    direction: "next" | "previous" | "skip" | "close",
    requestId?: string
  ): Promise<boolean> {
    if (
      !this.current() ||
      this.navigating ||
      (this.options.context.disabled && direction !== "close") ||
      (this.uncertain && this.uncertain !== requestId)
    )
      return false;
    this.navigating = true;
    try {
      if (!(await this.prepareNavigation())) return false;
      const accepted = await this.options.actions.navigate(direction);
      if (!accepted && this.current()) await this.visibility(false);
      return accepted;
    } catch (error) {
      if (this.current()) await this.visibility(false);
      throw error;
    } finally {
      this.navigating = false;
    }
  }
  /** Settles when the lifecycle change in flight has its answer, its timeout or the close. */
  private lifecycleSettled: Promise<unknown> = Promise.resolve();
  private transition(phase: "running" | "paused", reason: string): Promise<boolean> {
    if (!this.current() || this.lifecycle)
      return Promise.reject(new ProtocolError("locked", "Lifecycle already changing."));
    if (phase === "paused") {
      this.pointers.clear();
      this.gestureEpoch = undefined;
    }
    const changed = new Promise<boolean>((resolve, reject) => {
      const id = this.send("host.lifecycle", "request", { phase, reason })!;
      const timer = this.clock.setTimeout(() => {
        if (this.lifecycle?.id !== id) return;
        this.lifecycle = undefined;
        reject(new ProtocolError("timeout", "Preparation timed out.", true));
        this.fail();
      }, 10000);
      this.lifecycle = { id, phase, timer, resolve, reject };
    });
    this.lifecycleSettled = changed.catch(() => {});
    return changed;
  }
  /** Flush frame-local edits before a planned route, path or activity switch. */
  prepareNavigation(): Promise<boolean> {
    if (this.preparing) return this.preparing;
    const operation = (async () => {
      try {
        if (["loading", "negotiating", "ready"].includes(this.phase) && !(await this.opened))
          return false;
        // A page checks, resumes the frame and has its route guard check again; that resume ends first.
        while (this.lifecycle) await this.lifecycleSettled;
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
      protocol: this.version,
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
    if (message.protocol.major !== 2 || message.protocol.minor !== this.version.minor)
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
      const capabilities = this.grants(manifest);
      if (!manifest.requires.every((requirement) => hasCapability(capabilities, requirement)))
        throw new ProtocolError("missing_capability", "Required capability unavailable.");
      const state = await this.options.actions.read();
      if (!this.current()) return;
      this.options.validateState(state.value);
      this.init = validateInit(manifest, {
        lessonId: manifest.id,
        manifestHash: this.options.manifestHash,
        ...cloneJson(this.options.context),
        state,
        capabilities,
        limits: { messageBytes: 262144, stateBytes: Math.min(65536, manifest.state.maxBytes) },
      });
      if (capabilities.length) this.assessment = this.options.actions.assessment;
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
      if (message.type === "navigation.pointer") {
        if (this.phase !== "running" || this.lifecycle?.phase === "paused") return;
        const id = message.payload.pointerId as number;
        if (message.payload.phase === "begin") {
          this.gestureEpoch = undefined;
          if (this.pointers.size >= 16)
            throw new ProtocolError("rate_limited", "Too many pointers.");
          this.pointers.set(id, {
            owner: message.payload.owner as string,
            epoch: message.payload.epoch as number,
            solo: this.pointers.size === 0,
          });
          if (this.pointers.size > 1)
            for (const pointer of this.pointers.values()) pointer.solo = false;
        } else {
          const pointer = this.pointers.get(id);
          this.pointers.delete(id);
          if (
            message.payload.phase === "end" &&
            pointer?.solo &&
            pointer.owner === "navigation" &&
            pointer.owner === message.payload.owner &&
            pointer.epoch === message.payload.epoch &&
            pointer.epoch === this.policyEpoch
          )
            this.gestureEpoch = pointer.epoch;
          else this.gestureEpoch = undefined;
        }
        return;
      }
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
          return run();
        };
        const run = async () => {
          if (!this.current()) throw new ProtocolError("cancelled", "Connection closed.");
          if (
            operation?.capability &&
            !hasCapability(this.init?.capabilities ?? [], operation.capability)
          )
            throw new ProtocolError("missing_capability", "Capability unavailable.");
          const mutating = this.mutations().includes(message.type);
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
        const previous = ["navigation.request", "navigation.gesture"].includes(message.type)
          ? this.navigationTail.catch(() => {}).then(() => this.tail)
          : this.tail;
        bound.promise = previous.catch(() => {}).then(execute);
        // Lifecycle preparation may issue a final state.save; it must not queue behind navigation.
        if (["navigation.request", "navigation.gesture"].includes(message.type))
          this.navigationTail = bound.promise;
        else this.tail = bound.promise;
      }
      const promise = record.promise!;
      try {
        this.send("rpc.result", "response", { ok: true, data: await promise }, message.id);
        this.announceRewards();
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
      this.mutations().includes(type) &&
      this.options.context.disabled &&
      !(type === "navigation.request" && p.direction === "close")
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
      // The native adapter resets to the platform's empty initial room state.
      // Refuse before confirmation/write when that target violates this package's schema.
      try {
        this.options.validateState({});
      } catch {
        throw new ProtocolError("unsupported", "This lesson needs an approved reset state.");
      }
      const saved = await this.options.actions.reset(p.expectedRevision as number, operationId);
      return saved ? { cancelled: false, ...adopt(saved) } : { cancelled: true };
    }
    const assessment = this.assessment;
    if (assessment && type === "task.start") {
      const goalId = p.goalId as string;
      this.deterministic(manifest, [goalId]);
      // The frame runs the bytes of one revision; a start for another one belongs to a reload.
      if (p.revisionId !== assessment.revisionId)
        throw new ProtocolError("conflict", "The package revision changed.");
      const result = await assessment.start(goalId, operationId);
      validateDefinition("task.start.result", result);
      const start = result.start as JsonObject;
      if (start.goalId !== goalId || start.revisionId !== assessment.revisionId)
        throw new ProtocolError("invalid_receipt", "The start belongs to another task.");
      const assessments = (result.assessments as JsonObject[]).map((view) =>
        this.track(view, "start")
      );
      return { ...result, start, assessments };
    }
    if (assessment && type === "assessment.submit") {
      const goalId = p.goalId as string;
      this.deterministic(manifest, [goalId]);
      revision();
      const view = await assessment.submit(
        goalId,
        p.stateRevision as number,
        cloneJson(p.answer as JsonObject),
        operationId
      );
      validateDefinition("assessmentView", view);
      if (view.goalId !== goalId)
        throw new ProtocolError("invalid_receipt", "The verdict belongs to another task.");
      return this.track(view, "request");
    }
    if (assessment && type === "assessment.status") {
      const view = await assessment.status(p.assessmentId as string);
      validateDefinition("assessmentView", view);
      if (view.assessmentId !== p.assessmentId)
        throw new ProtocolError("invalid_receipt", "The verdict belongs to another submission.");
      return this.track(view, "request");
    }
    if (assessment && type === "completion.request" && (p.receiptHandles as string[]).length) {
      revision();
      const goals = p.goalIds as string[];
      const handles = p.receiptHandles as string[];
      this.deterministic(manifest, goals);
      // A handle is this session's reference to a counted pass the server reported.
      const passed = handles.map(
        (handle) => this.views.get(this.handles.get(handle) ?? "")?.goalId
      );
      if (
        new Set(goals).size !== goals.length ||
        new Set(handles).size !== handles.length ||
        passed.includes(undefined) ||
        goals.some((goal) => !passed.includes(goal))
      )
        throw new ProtocolError("invalid_receipt", "No verified assessment receipt.");
      const result = await assessment.complete(goals, p.stateRevision as number, operationId);
      validateDefinition("completion.request.result", result);
      return result;
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
      return {
        accepted: await this.navigate(
          p.direction as "next" | "previous" | "skip" | "close",
          message.id
        ),
      };
    if (type === "navigation.policy") {
      this.swipe = cloneJson(p.swipe as { forward: boolean; back: boolean });
      this.gestureEpoch = undefined;
      return { epoch: ++this.policyEpoch, swipe: this.swipe };
    }
    if (type === "navigation.gesture") {
      const released = this.gestureEpoch === this.policyEpoch && p.epoch === this.policyEpoch;
      this.gestureEpoch = undefined;
      const distance = p.distanceCss as number,
        cross = p.crossDistanceCss as number;
      const direction = p.direction as "next" | "previous";
      if (
        !released ||
        this.pointers.size ||
        !this.swipe[direction === "next" ? "forward" : "back"] ||
        Math.abs(distance) < 64 ||
        Math.abs(distance) < 1.5 * Math.abs(cross) ||
        (direction === "next" ? distance >= 0 : distance <= 0)
      )
        return { accepted: false };
      return { accepted: await this.navigate(direction, message.id) };
    }
    if (type === "display.fullscreen")
      return (
        this.options.actions.display?.(p.requested === true) ?? {
          mode: "page",
          needsHostGesture: false,
        }
      );
    if (type === "audio.preference") return { enabled: false, userActivationRequired: true };
    if (type === "request.cancel") return { cancelled: false };
    throw new ProtocolError(
      type.startsWith("llm.") ? "llm_paused" : "unsupported",
      "This action is unavailable."
    );
  }
  private mutations() {
    return this.assessment ? [...MUTATIONS, ...ASSESSMENT_MUTATIONS] : MUTATIONS;
  }
  /** A 2.1 package that asks for host.assessment gets it once the player has bound the adapters. */
  private grants(manifest: Manifest): Capability[] {
    const assessment = this.options.actions.assessment;
    const asked = [...manifest.requires, ...manifest.optional].some(
      (requirement) =>
        requirement.id === HOST_ASSESSMENT.id &&
        requirement.major === HOST_ASSESSMENT.major &&
        requirement.minMinor <= HOST_ASSESSMENT.minor
    );
    if (!assessment || !asked || manifest.protocol.minor < 1) return [];
    return [
      {
        ...HOST_ASSESSMENT,
        implementation: "academy-server",
        sha256: assessment.packageHash,
        revisionId: assessment.revisionId,
      },
    ];
  }
  private deterministic(manifest: Manifest, goalIds: string[]) {
    if (
      !goalIds.length ||
      goalIds.some(
        (id) =>
          !manifest.goals.some((goal) => goal.id === id && goal.assessment.kind === "deterministic")
      )
    )
      throw new ProtocolError("invalid_message", "Unknown goal.");
  }
  /**
   * Keeps what the server said about a submission. A counted pass gets a
   * handle that is valid in this session only; a pending one is read again
   * until it is final. A verdict from a start answer was shown before, so only
   * a verdict that arrives in this session announces its XP.
   */
  private track(view: JsonObject, source: "start" | "request" | "poll"): JsonObject {
    const id = view.assessmentId as string;
    const goalId = view.goalId as string;
    const known = this.views.get(id);
    const result = cloneJson(view);
    delete result.receiptHandle;
    if (view.status !== "final") {
      this.views.set(id, { goalId, pending: true });
      this.follow(id, source === "start" ? 0 : source === "request" ? 1 : undefined);
      return result;
    }
    this.clock.clearTimeout(this.polls.get(id));
    this.polls.delete(id);
    const counted = view.outcome === "passed" && view.counts === true;
    const handle = counted ? (known?.handle ?? crypto.randomUUID()) : undefined;
    if (handle) {
      this.handles.set(handle, id);
      result.receiptHandle = handle;
    }
    this.views.set(id, { goalId, pending: false, handle });
    const award = view.xp as JsonObject | undefined;
    if (award && counted && (source !== "start" || known?.pending)) {
      const awardId = award.awardId as string;
      if (!this.awards.has(awardId)) {
        this.awards.add(awardId);
        this.rewards.push({
          awardId,
          goalId,
          xp: award.xp as number,
          result: "passed",
          persisted: true,
        });
      }
    }
    return result;
  }
  private announceRewards() {
    for (const reward of this.rewards.splice(0)) this.send("reward.committed", "event", reward);
  }
  /** Reads a pending submission again: at once after opening, then after 1, 2, 3, 4 and every 5 seconds. */
  private follow(id: string, attempt?: number) {
    if (attempt === undefined || this.polls.has(id) || !this.current()) return;
    const timer = this.clock.setTimeout(
      () => {
        this.polls.delete(id);
        void this.reread(id, attempt);
      },
      Math.min(attempt, 5) * 1000
    );
    this.polls.set(id, timer);
  }
  private async reread(id: string, attempt: number) {
    const assessment = this.assessment;
    if (!assessment || !this.current()) return;
    let view: JsonObject | undefined;
    try {
      view = await assessment.status(id);
      validateDefinition("assessmentView", view);
      if (view.assessmentId !== id) view = undefined;
    } catch {
      // A technical failure leaves the submission pending; the next reading asks again.
      view = undefined;
    }
    if (!this.current()) return;
    if (view?.status === "final") {
      if (!this.views.get(id)?.pending) return;
      this.send("assessment.result", "event", this.track(view, "poll"));
      this.announceRewards();
    } else if (attempt < 120) this.follow(id, attempt + 1);
  }
  private policyEpoch = 0;
  private swipe = { forward: false, back: false };
  private pointers = new Map<number, { owner: string; epoch: number; solo: boolean }>();
  private gestureEpoch?: number;
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
    this.pointers.clear();
    this.gestureEpoch = undefined;
    for (const timer of this.polls.values()) this.clock.clearTimeout(timer);
    this.polls.clear();
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
