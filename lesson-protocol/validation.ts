import manifestSchema from "./schemas/manifest.schema.json";
import messageSchema from "./schemas/message.schema.json";
import replaySchema from "./schemas/replay.schema.json";
import { canonicalJson, jsonBytes, recognizedFields, validateSchema } from "./schema";
import {
  ProtocolError,
  type Capability,
  type Envelope,
  type Init,
  type Manifest,
  type Operation,
  type Sender,
} from "./types";
export { assertSchema, validateSchema, canonicalJson, jsonBytes } from "./schema";

export const operations = messageSchema["x-operations"] as Record<string, Operation>;
export const schemas = { manifest: manifestSchema, message: messageSchema, replay: replaySchema };
export const MESSAGE_BYTES = 262144;
export function recognizedResult(type: string, data: JsonObject): JsonObject {
  const operation = Object.hasOwn(operations, type) ? operations[type] : undefined;
  return (
    operation?.result ? recognizedFields(operation.result, data, messageSchema) : data
  ) as JsonObject;
}
export function resultSignature(type: string, data: JsonObject): string {
  return canonicalJson(recognizedResult(type, data));
}
const require = (condition: unknown, message: string, code = "invalid_message") => {
  if (!condition) throw new ProtocolError(code, message);
};
const unique = (values: string[]) => new Set(values).size === values.length;

export function validateManifest(value: unknown): Manifest {
  validateSchema(manifestSchema, value);
  const item = value as Manifest;
  require(unique(item.goals.map((goal) => goal.id)), "Duplicate goal.");
  require(unique(item.assets.map((asset) => asset.path)), "Duplicate asset.");
  const capabilities = [...item.requires, ...item.optional];
  require(unique(capabilities.map((capability) => capability.id)), "Duplicate capability.");
  require(!item.requires.some((capability) =>
    ["host.llm", "host.project", "host.haptics"].includes(capability.id)
  ), "Optional service required.");
  const entry = item.assets.find((asset) => asset.path === item.entry);
  require(entry?.mediaType === "text/html" &&
    entry.loading === "initial", "Missing initial HTML entry.");
  require(item.assets.some(
    (asset) => asset.path === item.state.schema && asset.mediaType === "application/json"
  ), "Missing state schema asset.");
  const localized = item.goals.map((goal) => goal.label);
  if (item.stage.orientation === "landscape") localized.push(item.stage.reason!);
  require(localized.every((text) =>
    item.languages.every((locale) => Object.hasOwn(text, locale))
  ), "Missing translation.");
  return item;
}

export function validateMessage(
  value: unknown,
  options: { sender?: Sender; requestType?: string; maxBytes?: number } = {}
): Envelope {
  require(jsonBytes(value) <=
    Math.min(options.maxBytes ?? MESSAGE_BYTES, MESSAGE_BYTES), "Message too large.", "too_large");
  validateSchema(messageSchema, value);
  const message = value as Envelope;
  const operation = Object.hasOwn(operations, message.type) ? operations[message.type] : undefined;
  if (operation && options.sender)
    require(operation.senders.includes(options.sender), "Wrong message direction.");
  if (message.kind === "response" && options.requestType) {
    const request = Object.hasOwn(operations, options.requestType)
      ? operations[options.requestType]
      : undefined;
    if (!request) {
      require(message.payload.ok === false &&
        (message.payload.error as JsonObject).code ===
          "unsupported", "Unknown request must return unsupported.");
      return message;
    }
    require(request.kind === "request", "Invalid response request.");
    if (options.sender)
      require(request.senders.includes(
        options.sender === "host" ? "lesson" : "host"
      ), "Wrong response direction.");
    if (message.payload.ok) validateSchema(request.result!, message.payload.data, messageSchema);
  }
  return message;
}

export function hasCapability(
  capabilities: readonly Capability[],
  requirement: { id: string; major: number; minMinor: number }
): boolean {
  return capabilities.some(
    (capability) =>
      capability.id === requirement.id &&
      capability.major === requirement.major &&
      capability.minor >= requirement.minMinor
  );
}

export function validateInit(manifest: Manifest, value: unknown): Init {
  validateSchema(operations["host.init"].payload, value, messageSchema);
  const init = value as Init;
  require(init.lessonId === manifest.id, "Init lesson mismatch.");
  require(manifest.languages.includes(init.locale), "Undeclared locale.");
  require(unique(init.capabilities.map((capability) => capability.id)), "Duplicate grant.");
  require(manifest.requires.every((capability) =>
    hasCapability(init.capabilities, capability)
  ), "Missing required capability.", "missing_capability");
  require(init.capabilities.every((capability) =>
    [...manifest.requires, ...manifest.optional].some((requirement) =>
      hasCapability([capability], requirement)
    )
  ), "Undeclared grant.");
  require(init.limits.stateBytes <= manifest.state.maxBytes, "State limit exceeds manifest.");
  require(init.state.schemaVersion ===
    manifest.state.schemaVersion, "State needs migration.", "unsupported");
  require(jsonBytes(init.state.value) <= init.limits.stateBytes, "State too large.", "too_large");
  return init;
}

export function validateTranscript(
  messages: unknown[],
  options: { senders?: Sender[] } = {}
): Envelope[] {
  require(!options.senders ||
    options.senders.length === messages.length, "Transcript direction count mismatch.");
  const previous = { host: 0, lesson: 0 };
  let sessionId: string | undefined;
  const requests = new Map<string, { sender: Sender; signature: string; type: string }>();
  const results = new Map<string, string>();
  return messages.map((value, index) => {
    const message = validateMessage(value);
    require(sessionId === undefined ||
      message.sessionId === sessionId, "Transcript session mismatch.");
    sessionId = message.sessionId;
    let sender: Sender;
    if (message.kind === "response") {
      const request = requests.get(message.replyTo!);
      require(request, "Unknown response reference.");
      sender = request!.sender === "host" ? "lesson" : "host";
      if (options.senders)
        require(options.senders[index] === sender, "Wrong transcript response direction.");
      validateMessage(message, { sender, requestType: request!.type });
      if (results.has(message.replyTo!))
        require(message.payload.ok ===
          true, "Conflicting duplicate response.", "operation_conflict");
      if (message.payload.ok) {
        const signature = resultSignature(request!.type, message.payload.data as JsonObject);
        require(!results.has(message.replyTo!) ||
          results.get(message.replyTo!) ===
            signature, "Conflicting duplicate response.", "operation_conflict");
        results.set(message.replyTo!, signature);
      }
    } else {
      const operation = Object.hasOwn(operations, message.type)
        ? operations[message.type]
        : undefined;
      require(options.senders ||
        operation?.senders.length === 1, "Transcript needs explicit direction.");
      sender = options.senders?.[index] ?? operation!.senders[0];
      require(sender === "host" || sender === "lesson", "Invalid transcript direction.");
      if (operation) require(operation.senders.includes(sender), "Wrong transcript direction.");
      if (message.kind === "request") {
        const signature = canonicalJson({ type: message.type, payload: message.payload });
        require(!requests.has(message.id) ||
          (requests.get(message.id)!.signature === signature &&
            requests.get(message.id)!.sender ===
              sender), "Operation ID conflict.", "operation_conflict");
        requests.set(message.id, { sender, signature, type: message.type });
      }
    }
    require(message.seq > previous[sender], "Non-monotonic sequence.");
    previous[sender] = message.seq;
    return message;
  });
}

export interface Replay {
  formatVersion: number;
  lessonId: string;
  manifestHash: string;
  packageHash: string;
  hostBuild: string;
  engines: { id: string; implementation: string; sha256: string }[];
  locale: string;
  viewport: {
    width: number;
    height: number;
    dpr: number;
    safeInsets: Record<string, number>;
    reducedMotion: boolean;
  };
  seed: number;
  clock: "virtual" | "real";
  initial: { state: JsonObject; project: JsonObject | null; stateRevision: number };
  fixtures: { providerMode: "off" | "fake"; server: string; faults: JsonObject[] };
  steps: {
    atMs: number;
    action: JsonObject;
    expect: {
      assertions: { path: string; equals: JsonValue }[];
      screenshot?: string;
      messages?: Envelope[];
      senders?: Sender[];
    };
  }[];
  expectFinal: {
    outcome: string;
    xp: number;
    providerCalls: number;
    persisted: boolean;
    stateHash: string;
  };
}
import type { JsonObject, JsonValue } from "./types";

export function validateReplay(
  value: unknown,
  bindings: {
    manifest: Manifest;
    capabilities?: Capability[];
    manifestHash?: string;
    packageHash?: string;
    hostBuild?: string;
  }
): Replay {
  validateSchema(replaySchema, value);
  const replay = value as Replay;
  const manifest = validateManifest(bindings.manifest);
  require(replay.lessonId === manifest.id &&
    manifest.languages.includes(replay.locale), "Replay lesson or locale mismatch.");
  for (const key of ["manifestHash", "packageHash", "hostBuild"] as const)
    if (bindings[key] !== undefined)
      require(replay[key] === bindings[key], `Replay ${key} mismatch.`);
  require(unique(replay.engines.map((engine) => engine.id)), "Duplicate replay engine.");
  if (bindings.capabilities)
    for (const engine of replay.engines) {
      const capability = bindings.capabilities.find((item) => item.id === engine.id);
      require(capability &&
        engine.implementation === capability.implementation &&
        engine.sha256 === capability.sha256, "Replay engine drift.");
    }
  let previous = 0;
  let transcript: Envelope[] = [];
  let senders: Sender[] | undefined;
  for (const step of replay.steps) {
    require(step.atMs >= previous, "Unordered replay.");
    previous = step.atMs;
    if (["tap", "drag", "input", "key", "step"].includes(step.action.kind as string))
      require(step.action.target, "Missing action target.");
    if (step.action.kind === "drag") {
      const points = (step.action.points ?? []) as JsonObject[];
      require(points.length >= 2, "Drag needs two points.");
      require(points.every(
        (point, index) => index === 0 || (point.tMs as number) >= (points[index - 1].tMs as number)
      ), "Unordered drag.");
    }
    for (const assertion of step.expect.assertions)
      require(/^\/(?:[^~]|~[01])*$/.test(assertion.path), "Invalid JSON Pointer.");
    if (step.expect.screenshot)
      require(!step.expect.screenshot.startsWith("/"), "Absolute screenshot path.");
    if (step.action.kind === "reload") {
      transcript = [];
      senders = undefined;
    }
    const messages = step.expect.messages ?? [];
    if (step.expect.senders || senders) {
      require(step.expect.senders &&
        (!transcript.length || senders), "Replay direction metadata must cover the segment.");
      require(step.expect.senders!.length === messages.length, "Replay direction count mismatch.");
      senders = [...(senders ?? []), ...step.expect.senders!];
    }
    transcript.push(...messages);
    validateTranscript(transcript, { senders });
  }
  return replay;
}
