import type { RoomEnvelope } from "../types/learningRooms";
import type { HostAssessment } from "./host";
import {
  RETRY_AFTER_SECONDS,
  createHoldOff,
  type AssessmentBinding,
  type RoomController,
} from "./rooms";
import { ProtocolError, type JsonObject } from "./types";

/**
 * Protocol 2.1 adapters to the lesson engine in skills (stage 1, step 4).
 *
 * - POST `/skills/engine/units/{unit}/tasks/{goal}/start` `{requestId, revisionId, courseId?}`
 *   answers `{start, assessments}`; the answer goes to the host unchanged.
 * - POST `/skills/engine/units/{unit}/tasks/{goal}/submissions`
 *   `{requestId, stateRevision, answer: {startId, input}, courseId?}` answers a view, 202 while pending.
 * - GET `/skills/engine/submissions/{assessmentId}` answers a view and books a result that is ready.
 *   The route takes a submission id only, so nothing else from the frame reaches the path.
 *
 * `requestId` is the host's key of the frame's operation, so the same operation reaches the
 * service with the same id. The client never completes a lesson of the engine: the service
 * completes it when it books the last required pass, and the host reads that from the room.
 */
export type EngineRequest = (
  path: string,
  method?: "GET" | "POST" | "PUT",
  body?: unknown
) => Promise<unknown>;

const CODE = /^[a-z][a-z0-9_]{0,63}$/;
// The pattern of the submission route in skills.
const SUBMISSION = /^[0-9a-f-]{36}$/;
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function statusOf(error: unknown): number | null {
  const source = record(error);
  const value = source.statusCode ?? source.status ?? record(source.response).status;
  return typeof value === "number" && Number.isInteger(value) && value >= 400 && value <= 599
    ? value
    : null;
}

/**
 * Seconds a 429 asks to wait: Retry-After where the browser may read it, `retry_after` in the body,
 * otherwise the save window of skills.
 */
function retryAfterSeconds(error: unknown): number {
  const source = record(error);
  const response = record(source.response);
  const headers = (source.headers ?? response.headers) as
    | { get?: (name: string) => string | null }
    | undefined;
  const body = record(source.data ?? response._data);
  const value =
    (typeof headers?.get === "function" ? headers.get("retry-after") : null) ??
    body.retry_after ??
    body.retryAfter;
  const seconds =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value.trim())
        ? Number(value)
        : NaN;
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : RETRY_AFTER_SECONDS;
}

function fallbackCode(status: number) {
  if (status === 401 || status === 403) return "no_access";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 413) return "too_large";
  if (status === 400 || status === 422) return "invalid_message";
  return "refused";
}

/**
 * The error a frame receives for a failed call. A refusal of the service stays a refusal with the
 * service's code (409 `conflict`, `start_required`, `revision_changed`); no answer, a timeout, a
 * 5xx and a 429 may still turn out differently and are retryable. The HTTP status decides, never
 * the body: a proxy's 502 has no body, refusals of the shared helpers of skills (account, path
 * access, daily limit, validation) carry no `retryable`, and the runtime chooses by `retryable` and
 * `code` alone. A 429 names how long to wait. The service's prose stays out of the frame.
 */
export function engineRefusal(error: unknown): ProtocolError {
  if (error instanceof ProtocolError) return error;
  const status = statusOf(error);
  const source = record(error);
  const body = record(source.data ?? record(source.response)._data);
  const named = body.code ?? record(body.detail).code;
  const code = typeof named === "string" && CODE.test(named) ? named : undefined;
  if (status === null || status === 408 || status >= 500)
    return new ProtocolError(
      code ?? "offline",
      "The service could not be reached. Retry keeps the same operation.",
      true
    );
  if (status === 429)
    return new ProtocolError(
      code ?? "rate_limited",
      "Too many requests just now. Retry keeps the same operation.",
      true,
      { retryAfterSeconds: retryAfterSeconds(error) }
    );
  return new ProtocolError(code ?? fallbackCode(status), "The service refused this request.");
}

/**
 * The adapters for one opened unit, or none. They exist only for a lesson of the engine whose room
 * names exactly the package revision the player loaded, for the account that opened it.
 */
export function bindEngineAssessment(options: {
  request: EngineRequest;
  room: Pick<RoomController, "protocolSnapshot" | "protocolRead">;
  owner: () => string | null;
  binding: AssessmentBinding;
  now?: () => number;
}): HostAssessment | undefined {
  const { request, room, owner, binding } = options;
  const initial = room.protocolSnapshot().room;
  const identity = owner();
  const module = initial?.unit.module;
  if (
    !identity ||
    !initial ||
    initial.unit.id !== binding.unitId ||
    initial.unit.completion_kind !== "engine" ||
    module?.api_version !== 2 ||
    module.revision_id !== binding.revisionId ||
    module.package_hash !== binding.packageHash
  )
    return undefined;
  const courseId = initial.course_id || null;
  const course: JsonObject = courseId ? { courseId } : {};
  const task = (goalId: string) =>
    `/skills/engine/units/${encodeURIComponent(binding.unitId)}/tasks/${encodeURIComponent(goalId)}`;
  const assertCurrent = () => {
    if (owner() !== identity) throw new ProtocolError("cancelled", "Learning room changed.");
  };
  // Ä41 b: after a 429 nothing goes out before its wait has passed.
  const holdOff = createHoldOff(options.now ?? Date.now);
  const call = async (path: string, method: "GET" | "POST", body?: JsonObject) => {
    assertCurrent();
    holdOff.check();
    let answer: unknown;
    try {
      answer = await request(path, method, body);
    } catch (error) {
      assertCurrent();
      const refusal = engineRefusal(error);
      const wait = refusal.details.retryAfterSeconds;
      if (typeof wait === "number") holdOff.hold(wait);
      throw refusal;
    }
    assertCurrent();
    return answer as JsonObject;
  };
  const read = async (): Promise<RoomEnvelope> => {
    assertCurrent();
    try {
      return await room.protocolRead();
    } catch (error) {
      assertCurrent();
      throw engineRefusal(error);
    }
  };
  /**
   * Ä32b, Ä40 a: a start refused for another revision, or for a unit or task that is gone, reads
   * the room again. A newer package there reloads the player through its descriptor; without one
   * the session ends, so the frame does not offer to repeat a refusal.
   */
  const renew = async () => {
    try {
      await room.protocolRead();
    } catch {
      /* What the page shows now decides. */
    }
    if (owner() !== identity) return;
    const shown = room.protocolSnapshot().room?.unit.module;
    const newer =
      shown?.api_version === 2 &&
      typeof shown.revision_id === "string" &&
      shown.revision_id !== binding.revisionId;
    if (!newer) binding.stale();
  };
  return {
    revisionId: binding.revisionId,
    packageHash: binding.packageHash,
    async start(goalId, operationId) {
      let answer: JsonObject;
      try {
        answer = await call(`${task(goalId)}/start`, "POST", {
          requestId: operationId,
          revisionId: binding.revisionId,
          ...course,
        });
      } catch (error) {
        if (
          error instanceof ProtocolError &&
          (error.code === "revision_changed" || error.code === "not_found")
        )
          await renew();
        throw error;
      }
      // Host task 3: a start that reports the unit completed elsewhere brings the page up to date;
      // the runtime then sends no completion of its own.
      const views = record(answer).assessments;
      if (
        Array.isArray(views) &&
        views.some((view) => record(view).completed === true) &&
        room.protocolSnapshot().room?.progress.status !== "completed"
      )
        void room.protocolRead().catch(() => {});
      return answer;
    },
    submit: (goalId, stateRevision, answer, operationId) =>
      call(`${task(goalId)}/submissions`, "POST", {
        requestId: operationId,
        stateRevision,
        answer,
        ...course,
      }),
    async status(assessmentId) {
      // Ä40 b: an id the route would not take never becomes a path.
      if (!SUBMISSION.test(assessmentId))
        throw new ProtocolError("invalid_message", "Unknown submission.");
      return call(`/skills/engine/submissions/${assessmentId}`, "GET");
    },
    async complete() {
      // The pass of the unit is booked with the last required pass; the room shows it.
      const current = await read();
      assertCurrent();
      return current.progress.status === "completed"
        ? { outcome: "completed", persisted: true }
        : { outcome: "pending", persisted: false };
    },
  };
}
