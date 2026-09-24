import type {
  LearningModuleData,
  LearningProjectErrorCode,
  LearningProjectSnapshot,
} from "~/types/learningModule";
import type { LearningRequest } from "~/types/learningRooms";

/** The server refuses larger states with 413 (contract S1). */
export const PROJECT_STATE_LIMIT = 64 * 1024;

export type LearningProjectError = { code: LearningProjectErrorCode };

const status = (error: any) => error?.statusCode || error?.status || error?.response?.status;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const isObject = (value: unknown): value is LearningModuleData =>
  !!value && typeof value === "object" && !Array.isArray(value);
/**
 * A lone surrogate, as `JSON.stringify` escapes it (an odd number of backslashes before
 * `\ud800`–`\udfff`). The server cannot encode it as UTF-8 and would fail with a 500.
 */
const LONE_SURROGATE = /(?<!\\)(?:\\\\)*\\ud[89a-f][0-9a-f]{2}/;

/** Refusals that pressing again never fixes. */
function refusal(code: unknown): LearningProjectErrorCode | null {
  if (code === 401 || code === 403 || code === 404) return "no_access";
  if (code === 422) return "invalid";
  return null;
}

function snapshot(value: any, courseId: string): LearningProjectSnapshot {
  if (
    value?.course_id !== courseId ||
    !Number.isInteger(value?.revision) ||
    value.revision < 0 ||
    !isObject(value.state)
  )
    throw new Error("Invalid project state");
  return { revision: value.revision, state: copy(value.state) };
}

/** `host.project`: the learner's private course-wide project state (contract S1). */
export function createLearningProject(options: {
  courseId: string;
  request: LearningRequest;
  id?: () => string;
  wait?: (ms: number) => Promise<void>;
}) {
  const id = options.id || (() => crypto.randomUUID());
  const wait = options.wait || ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  const path = `/skills/courses/${encodeURIComponent(options.courseId)}/project`;
  const reject = (code: LearningProjectErrorCode): Promise<never> =>
    Promise.reject({ code } satisfies LearningProjectError);

  return {
    async get(): Promise<LearningProjectSnapshot> {
      try {
        return snapshot(await options.request(path), options.courseId);
      } catch (error) {
        return reject(refusal(status(error)) === "no_access" ? "no_access" : "offline");
      }
    },
    async save(
      state: LearningModuleData,
      expectedRevision: number
    ): Promise<LearningProjectSnapshot> {
      if (!isObject(state)) throw new TypeError("Project state must be an object");
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0)
        throw new TypeError("Expected revision must be a non-negative integer");
      const serialized = JSON.stringify(state);
      if (LONE_SURROGATE.test(serialized)) return reject("invalid");
      if (new TextEncoder().encode(serialized).length > PROJECT_STATE_LIMIT)
        return reject("too_large");
      // One request id per save: a lost response is replayed with exactly this body.
      const body = {
        request_id: id(),
        expected_revision: expectedRevision,
        state: JSON.parse(serialized),
      };
      for (let attempt = 0; ; attempt++) {
        try {
          return snapshot(await options.request(path, "PUT", body), options.courseId);
        } catch (error) {
          const code = status(error);
          if (code === 409) return reject("conflict");
          if (code === 413) return reject("too_large");
          const refused = refusal(code);
          if (refused) return reject(refused);
          // A response that never arrived or a server error: once more after a short pause,
          // with the same id and body, so a save that did land is answered, not repeated.
          const lost = !code || code === 408 || code >= 500;
          if (!lost || attempt >= 1) return reject("offline");
          await wait(1000);
        }
      }
    },
  };
}
