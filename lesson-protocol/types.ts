export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type Sender = "host" | "lesson";
export interface Version {
  major: number;
  minor: number;
}
export interface CapabilityRequirement {
  id: string;
  major: number;
  minMinor: number;
}
export interface Capability {
  id: string;
  major: number;
  minor: number;
  implementation: string;
  sha256: string;
  availability?: "paused" | "available";
}
export interface Manifest {
  id: string;
  protocol: Version;
  entry: string;
  requires: CapabilityRequirement[];
  optional: CapabilityRequirement[];
  languages: string[];
  goals: {
    id: string;
    label: Record<string, string>;
    subskill_id: string;
    xp: number;
    assessment: { kind: "introduced" | "deterministic" | "llm"; ref: string };
  }[];
  assets: { path: string; mediaType: string; loading: "initial" | "lazy" }[];
  state: { schemaVersion: number; schema: string; maxBytes: number };
  stage: { orientation: string; reason?: Record<string, string> };
}
export interface Envelope {
  protocol: Version;
  sessionId: string;
  seq: number;
  id: string;
  kind: "request" | "response" | "event";
  type: string;
  replyTo?: string;
  payload: JsonObject;
}
export interface StateSnapshot {
  revision: number;
  schemaVersion: number;
  value: JsonObject;
}
export interface Init {
  lessonId: string;
  manifestHash: string;
  locale: string;
  content: JsonObject;
  state: StateSnapshot;
  disabled: boolean;
  capabilities: Capability[];
  limits: { messageBytes: number; stateBytes: number; projectBytes?: number };
  surface: JsonObject;
}
export interface Operation {
  senders: Sender[];
  kind: "event" | "request";
  payload: { $ref: string };
  result?: { $ref: string };
  capability?: CapabilityRequirement;
}
export type Phase =
  | "loading"
  | "negotiating"
  | "ready"
  | "running"
  | "paused"
  | "suspending"
  | "disposed"
  | "recoverable-error";
export interface Transport {
  send(message: Envelope): void;
  subscribe(receive: (message: unknown) => void): () => void;
  close(): void;
}
export interface Clock {
  setTimeout(callback: () => void, milliseconds: number): unknown;
  clearTimeout(handle: unknown): void;
}
export const systemClock: Clock = {
  setTimeout: (callback, milliseconds) => globalThis.setTimeout(callback, milliseconds),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class ProtocolError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable = false,
    public readonly details: JsonObject = {}
  ) {
    super(message);
    this.name = "ProtocolError";
  }
}
