import type { ExerciseDraft, ExerciseKind, ExerciseView } from "./learningRooms";

/** Public browser contract for centrally reviewed Academy lesson modules. */
export interface LearningModuleDescriptor {
  id: string;
  api_version: 1;
  entry_url: string;
}

export type LearningModuleData = Record<string, unknown>;

export type LearningModuleAnswer = Pick<
  ExerciseDraft,
  "answers" | "answer" | "code" | "environment"
>;

export interface LearningModuleAssessmentContext {
  readonly type: ExerciseKind;
  readonly view: Readonly<ExerciseView>;
  readonly draft: Readonly<LearningModuleAnswer>;
}

export interface LearningModuleAssessmentActions {
  /** True means an answer was accepted for submission, never that it was correct. */
  submit(answer: LearningModuleAnswer): Promise<boolean>;
  check(): Promise<void>;
  newAttempt(): Promise<void>;
}

export interface LearningModuleContext {
  activityId: string;
  reviewId?: string;
  locale: string;
  content: LearningModuleData;
  state: LearningModuleData;
  disabled: boolean;
  readonly assessment?: LearningModuleAssessmentContext;
}

export type LlmMessage = { role: "user" | "assistant"; content: string };

export interface LlmRequest {
  /** A profile of this activity; the server defines prompt, models and limits. */
  profile: string;
  input: LlmMessage[];
  variables?: Record<string, string>;
  params?: { temperature?: number; top_p?: number; reasoning?: string; samples?: number };
  /** A model alias the profile allows, e.g. "fast". */
  model?: string;
}

export type LlmOutput =
  | { sample: number; status: LlmStatus; type: "text" | "refusal"; text: string }
  | { sample: number; status: LlmStatus; type: "json"; json: unknown };

export type LlmStatus = "completed" | "truncated" | "refused" | "blocked";

export interface LlmUsage {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
}

export interface LlmError {
  /** The gateway's code (e.g. "llm_paused") or a host code ("network", "cancelled", "session"). */
  code: string;
  /**
   * Show the lesson's prepared example and let the learner continue. True whenever
   * no live answer can come from pressing again soon (paused, allowance used up, …).
   */
  fallback: boolean;
  /** Pressing again may work, after `retryAfterMs` if given. */
  retryable: boolean;
  retryAfterMs?: number;
  /** When a used-up allowance or lesson limit resets. */
  resetsAt?: string;
  /** A short friendly text in the activity's language. */
  message: string;
}

export type LlmResult =
  | {
      ok: true;
      requestId: string;
      status: LlmStatus;
      outputs: LlmOutput[];
      usage: LlmUsage;
      model: { alias: string; id: string };
      /** E-mail addresses, phone numbers or IBANs were replaced before sending. */
      redacted: boolean;
    }
  | { ok: false; error: LlmError };

export interface LlmCriterion {
  id: string;
  met: boolean;
  points: number;
  /** A verbatim quote from the learner's answer. */
  evidence: string;
}

export type LlmGradeResult =
  | {
      ok: true;
      passed: boolean;
      /**
       * A passing verdict that counts: the next `host.complete()` completes the
       * activity with it. False for a failed answer or an ungraded practice run.
       */
      counts: boolean;
      score: number;
      maxScore: number;
      passScore: number;
      /** Feedback for the learner, written by the model. */
      reason: string;
      criteria: LlmCriterion[];
      model: { alias: string; id: string };
    }
  | { ok: false; error: LlmError };

export type LlmLabelKind = "live" | "example" | "grading";

export interface LearningModuleLlm {
  /** Public profile data (models, limits, grading criteria ids); never a prompt. */
  info(profile: string): Promise<Record<string, unknown> | null>;
  /** Never rejects: expected failures come back as `{ ok: false, error }`. */
  respond(
    request: LlmRequest,
    options?: {
      onDelta?(delta: { sample: number; text: string }): void;
      /** Stops listening; a started answer is still finished and billed on the server. */
      signal?: AbortSignal;
    }
  ): Promise<LlmResult>;
  /** Grades a free-text answer with the activity's grading profile. Never rejects. */
  grade(
    answer: string,
    options?: { profile?: string; signal?: AbortSignal }
  ): Promise<LlmGradeResult>;
  /** A label to show next to model output the module draws itself (required for live output). */
  label(kind?: LlmLabelKind): HTMLElement;
}

export interface LearningProjectSnapshot {
  revision: number;
  state: LearningModuleData;
}

export interface LearningModuleProject {
  get(): Promise<LearningProjectSnapshot>;
  /** Rejects with `{ code: "conflict" | "too_large" | "offline" }`. */
  save(state: LearningModuleData, expectedRevision: number): Promise<LearningProjectSnapshot>;
}

export type LearningModuleCapability = "llm" | "project";

export interface LearningModuleHost {
  /** A snapshot; changing it never changes the player's state. */
  readonly context: LearningModuleContext;
  readonly signal: AbortSignal;
  /** Optional platform features of this player release; check before use. */
  readonly capabilities: readonly LearningModuleCapability[];
  readonly assessment?: LearningModuleAssessmentActions;
  /** Present for lesson activities; without server-side LLM profiles every call returns a fallback. */
  readonly llm?: LearningModuleLlm;
  /** The course-wide project state; present inside a course. */
  readonly project?: LearningModuleProject;
  change(state: LearningModuleData): void;
  save(): Promise<boolean>;
  /** Requests evaluation. The server, not this call, confirms completion. */
  complete(answer: LearningModuleData): void;
  setBusy(busy: boolean): void;
}

export interface LearningModuleInstance {
  update(context: LearningModuleContext): void;
  dispose(): void;
  cancelPreparation?(): void;
}

export interface LearningModuleExports {
  apiVersion: 1;
  mount(
    element: HTMLElement,
    host: LearningModuleHost
  ): LearningModuleInstance | Promise<LearningModuleInstance>;
}
