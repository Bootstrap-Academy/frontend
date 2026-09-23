import type { LearningModuleData, LearningProjectSnapshot } from "~/types/learningModule";
import type { LearningRequest } from "~/types/learningRooms";

/** The server refuses larger states with 413 (contract S1). */
export const PROJECT_STATE_LIMIT = 64 * 1024;

export type LearningProjectError = { code: "conflict" | "too_large" | "offline" };

const status = (error: any) => error?.statusCode || error?.status || error?.response?.status;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const isObject = (value: unknown): value is LearningModuleData =>
  !!value && typeof value === "object" && !Array.isArray(value);

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
}) {
  const id = options.id || (() => crypto.randomUUID());
  const path = `/skills/courses/${encodeURIComponent(options.courseId)}/project`;
  const reject = (code: LearningProjectError["code"]): Promise<never> =>
    Promise.reject({ code } satisfies LearningProjectError);

  return {
    async get(): Promise<LearningProjectSnapshot> {
      try {
        return snapshot(await options.request(path), options.courseId);
      } catch {
        return reject("offline");
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
          // Only a response that never arrived is worth repeating; refusals stay refusals.
          if (code || attempt >= 1) return reject("offline");
        }
      }
    },
  };
}
