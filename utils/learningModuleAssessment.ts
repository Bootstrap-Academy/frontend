import type {
  ExerciseDraft,
  ExerciseReference,
  ExerciseView,
  LearningRequest,
} from "../types/learningRooms";
import type {
  LearningModuleAnswer,
  LearningModuleAssessmentContext,
  LearningModuleData,
} from "../types/learningModule";
import { createLearningExercise } from "./learningExercise";

const namespace = "__academy_assessment";
const snapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const object = (value: unknown): value is LearningModuleData =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** The module can replace its own state, but never the host's attempt checkpoint. */
export function learningModuleState(state: LearningModuleData): LearningModuleData {
  const copy = snapshot(state);
  delete copy[namespace];
  return copy;
}

/** A narrow bridge to the existing assessment controller, bound to one server reference. */
export function createLearningModuleAssessment(options: {
  activityId: string;
  reference: ExerciseReference;
  userId: string;
  reviewId?: string;
  state: LearningModuleData;
  request: LearningRequest;
  disabled: () => boolean;
  save: () => Promise<boolean>;
  changed: (state: LearningModuleData) => void;
  updated: (context: LearningModuleAssessmentContext) => void;
  busy: (busy: boolean) => void;
  heartsChanged: (info: any) => void;
}) {
  const reference = snapshot(options.reference);
  const key = JSON.stringify([
    options.activityId,
    options.userId,
    options.reviewId,
    reference.type,
    reference.task_id,
    reference.subtask_id,
  ]);
  let state = snapshot(options.state);
  let closed = false;
  let view: ExerciseView = {
    data: null,
    environments: [],
    examples: [],
    premium: null,
    phase: "idle",
    error: "",
    submissionId: null,
    result: null,
    posting: false,
  };
  function savedDraft(): ExerciseDraft {
    const stored = state[namespace];
    return object(stored) && stored.key === key && object(stored.draft)
      ? snapshot(stored.draft)
      : {};
  }
  let draft = savedDraft();
  const answer = (): LearningModuleAnswer => {
    const { answers, answer, code, environment } = draft;
    return snapshot({ answers, answer, code, environment });
  };
  function publish() {
    if (!closed) options.updated(snapshot({ type: reference.type, view, draft: answer() }));
  }
  function checkpoint() {
    state = { ...state, [namespace]: { key, draft: snapshot(draft) } };
    options.changed(snapshot(state));
    publish();
  }
  const controller = createLearningExercise({
    request: options.request,
    heartsChanged: options.heartsChanged,
    changed: (next) => {
      if (closed) return;
      view = next;
      options.busy(next.posting);
      publish();
    },
    persistSubmission: async (unknown, submissionId, attemptId) => {
      if (closed) return false;
      draft = {
        ...draft,
        submission_unknown: unknown || undefined,
        submission_id: submissionId,
        attempt_id: attemptId,
      };
      checkpoint();
      const saved = await options.save();
      return !closed && saved;
    },
  });

  function submission(value: LearningModuleAnswer): LearningModuleAnswer | null {
    if (!object(value)) return null;
    if (reference.type === "multiple_choice") {
      const answers = value.answers;
      if (
        !Array.isArray(answers) ||
        answers.length !== view.data?.answers?.length ||
        !answers.every((item) => typeof item === "boolean") ||
        !answers.some(Boolean) ||
        (view.data.single_choice && answers.filter(Boolean).length !== 1)
      )
        return null;
      return { answers: [...answers] };
    }
    if (reference.type === "matching") {
      const answer = value.answer;
      if (
        !Array.isArray(answer) ||
        !answer.length ||
        answer.length !== view.data?.left?.length ||
        !answer.every(
          (item) => Number.isInteger(item) && item >= 0 && item < (view.data?.right?.length || 0)
        ) ||
        new Set(answer).size !== answer.length
      )
        return null;
      return { answer: [...answer] };
    }
    const environment =
      value.environment ||
      draft.environment ||
      view.environments.find((item) => item.toLowerCase().startsWith("python")) ||
      view.environments[0];
    return typeof value.code === "string" &&
      value.code.trim() &&
      typeof environment === "string" &&
      view.environments.includes(environment)
      ? { code: value.code, environment }
      : null;
  }

  return {
    load() {
      if (closed) return Promise.resolve();
      return controller.load(
        reference,
        options.userId,
        draft.submission_id,
        draft.submission_unknown === true,
        options.reviewId,
        draft.attempt_id
      );
    },
    updateState(next: LearningModuleData) {
      if (closed) return;
      state = snapshot(next);
      draft = savedDraft();
      publish();
    },
    changeModuleState(next: LearningModuleData) {
      if (closed || options.disabled()) return;
      state = {
        ...learningModuleState(next),
        ...(state[namespace] ? { [namespace]: state[namespace] } : {}),
      };
      options.changed(snapshot(state));
    },
    async submit(value: LearningModuleAnswer) {
      if (closed || options.disabled() || !["ready", "incorrect"].includes(view.phase))
        return false;
      const body = submission(value);
      if (!body) return false;
      draft = { ...draft, ...body };
      await controller.submit(body);
      return !closed;
    },
    async check() {
      if (!closed && !options.disabled()) await controller.check();
    },
    async newAttempt() {
      if (!closed && !options.disabled()) await controller.newAttempt();
    },
    completion(): { attemptId?: string } | null {
      if (closed || options.disabled() || view.phase !== "correct" || view.posting) return null;
      const attemptId = draft.attempt_id || draft.submission_id;
      return options.reviewId && !attemptId ? null : { attemptId };
    },
    cancelPreparation() {
      if (!closed) controller.cancelPreparation();
    },
    dispose() {
      if (closed) return;
      closed = true;
      controller.dispose();
      options.busy(false);
    },
  };
}
