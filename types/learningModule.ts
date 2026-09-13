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

export interface LearningModuleHost {
  /** A snapshot; changing it never changes the player's state. */
  readonly context: LearningModuleContext;
  readonly signal: AbortSignal;
  readonly assessment?: LearningModuleAssessmentActions;
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
