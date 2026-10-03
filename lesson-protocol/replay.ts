import { canonicalJson, cloneJson } from "./schema";
import { validateReplay, validateTranscript, type Replay } from "./validation";
import {
  type Capability,
  type Envelope,
  type JsonObject,
  type JsonValue,
  type Manifest,
  type Sender,
} from "./types";

export async function canonicalHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export interface ReplayDriver {
  bindings: {
    manifest: Manifest;
    packageHash: string;
    hostBuild: string;
    capabilities: Capability[];
  };
  initialize(
    input: Pick<
      Replay,
      "lessonId" | "locale" | "viewport" | "seed" | "clock" | "initial" | "fixtures"
    >
  ): void | Promise<void>;
  advanceTo(atMs: number): void | Promise<void>;
  perform(action: JsonObject): void | Promise<void>;
  snapshot(): JsonObject | Promise<JsonObject>;
  takeMessages():
    | Envelope[]
    | { sender: Sender; message: Envelope }[]
    | Promise<Envelope[] | { sender: Sender; message: Envelope }[]>;
  screenshot?(path: string): void | Promise<void>;
  dispose(): void | Promise<void>;
}
export class ReplayError extends Error {
  constructor(
    public readonly step: number,
    message: string
  ) {
    super(message);
    this.name = "ReplayError";
  }
}
export function readPointer(value: JsonValue, pointer: string): JsonValue {
  if (!/^\/(?:[^~]|~[01])*$/.test(pointer)) throw new Error("Invalid JSON Pointer.");
  let current = value;
  for (const token of pointer.slice(1).split("/")) {
    const key = token.replaceAll("~1", "/").replaceAll("~0", "~");
    if (current === null || typeof current !== "object" || !Object.hasOwn(current, key))
      throw new Error(`Missing snapshot path ${pointer}`);
    const next = (current as JsonObject)[key];
    if (next === undefined) throw new Error(`Missing snapshot path ${pointer}`);
    current = next;
  }
  return current;
}

/** Runs synthetic fixtures through an injected lesson/host test driver, with no network. */
export async function playReplay(
  value: unknown,
  driver: ReplayDriver
): Promise<{ steps: number; stateHash: string; snapshot: JsonObject }> {
  const transcript: Envelope[] = [];
  let senders: Sender[] | undefined;
  const takeMessages = async () => {
    const entries = cloneJson(await driver.takeMessages());
    const messages: Envelope[] = [];
    const directions: Sender[] = [];
    for (const entry of entries) {
      if (!("protocol" in entry) && "message" in entry) {
        messages.push(entry.message);
        directions.push(entry.sender);
      } else messages.push(entry);
    }
    if (directions.length || senders) {
      if (directions.length !== messages.length || (transcript.length && !senders))
        throw new ReplayError(stepIndex, "Driver direction metadata must cover the segment.");
      senders = [...(senders ?? []), ...directions];
    }
    transcript.push(...messages);
    validateTranscript(transcript, { senders });
    return { messages, directions };
  };
  const compare = (actual: unknown, expected: unknown, step: number, path: string) => {
    if (canonicalJson(actual) !== canonicalJson(expected))
      throw new ReplayError(step, `Replay mismatch at ${path}.`);
  };
  let stepIndex = -1;
  try {
    const manifestHash = await canonicalHash(driver.bindings.manifest);
    const replay = cloneJson(validateReplay(value, { ...driver.bindings, manifestHash }));
    const { lessonId, locale, viewport, seed, clock, initial, fixtures } = replay;
    await driver.initialize(
      cloneJson({ lessonId, locale, viewport, seed, clock, initial, fixtures })
    );
    await takeMessages();
    for (const [index, step] of replay.steps.entries()) {
      stepIndex = index;
      await driver.advanceTo(step.atMs);
      await driver.perform(cloneJson(step.action));
      if (step.action.kind === "reload") {
        transcript.length = 0;
        senders = undefined;
      }
      const snapshot = cloneJson(await driver.snapshot());
      for (const assertion of step.expect.assertions)
        compare(readPointer(snapshot, assertion.path), assertion.equals, index, assertion.path);
      const { messages, directions } = await takeMessages();
      if (step.expect.messages) compare(messages, step.expect.messages, index, "messages");
      if (step.expect.senders) compare(directions, step.expect.senders, index, "senders");
      if (step.expect.screenshot) {
        if (!driver.screenshot) throw new ReplayError(index, "Screenshot driver is missing.");
        await driver.screenshot(step.expect.screenshot);
      }
    }
    const snapshot = cloneJson(await driver.snapshot());
    for (const field of ["outcome", "xp", "providerCalls", "persisted"] as const)
      compare(
        readPointer(snapshot, `/host/${field}`),
        replay.expectFinal[field],
        replay.steps.length,
        `/host/${field}`
      );
    const stateHash = await canonicalHash(snapshot.state);
    compare(stateHash, replay.expectFinal.stateHash, replay.steps.length, "/stateHash");
    return { steps: replay.steps.length, stateHash, snapshot };
  } catch (error) {
    if (error instanceof ReplayError) throw error;
    throw new ReplayError(stepIndex, error instanceof Error ? error.message : "Replay failed.");
  } finally {
    await driver.dispose();
  }
}
