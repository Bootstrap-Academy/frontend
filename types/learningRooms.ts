export type ExerciseKind = "multiple_choice" | "matching" | "coding";

export interface ExerciseReference {
  task_id: string;
  subtask_id: string;
  type: ExerciseKind;
}

export interface ExerciseDraft {
  answers?: boolean[];
  answer?: number[];
  code?: string;
  environment?: string;
  submission_id?: string;
  submission_unknown?: boolean;
}

export interface ExerciseData {
  id: string;
  task_id: string;
  question?: string;
  description?: string;
  title?: string;
  answers?: string[];
  single_choice?: boolean;
  left?: string[];
  right?: string[];
  solved?: boolean;
  enabled?: boolean;
  retired?: boolean;
  creator?: string;
}

export type LearningRequest = (
  path: string,
  method?: "GET" | "POST" | "PUT",
  body?: unknown
) => Promise<any>;

export interface ExerciseView {
  data: ExerciseData | null;
  environments: string[];
  examples: { id: string; input?: string; output?: string }[];
  premium: boolean | null;
  phase:
    | "idle"
    | "loading"
    | "ready"
    | "preparing"
    | "submitting"
    | "pending"
    | "correct"
    | "incorrect"
    | "error"
    | "uncertain";
  error: string;
  submissionId: string | null;
  result: Record<string, any> | null;
  posting: boolean;
}

export type LocalizedText = { de: string; en: string };
export interface LearningUnit {
  id: string;
  path_id: string;
  title: LocalizedText;
  room: "loop-explorer" | "percentage-explorer" | "exercise";
  content: Record<string, any>;
  teaches: string[];
  practices: string[];
  requires: string[];
  exercise?: ExerciseReference;
}
export interface RoomEnvelope {
  unit: LearningUnit;
  progress: {
    revision: number;
    state: Record<string, any>;
    status: "new" | "in_progress" | "completed" | "skipped";
    result: null | { kind: "introduced" | "solved" };
  };
}
export interface LearningRoomsView {
  status: "idle" | "loading" | "ready" | "disabled" | "error";
  paths: { id: string; title: LocalizedText }[];
  path: { id: string; title: LocalizedText } | null;
  room: RoomEnvelope | null;
  draft: Record<string, any>;
  dirty: boolean;
  saving: boolean;
  completing: boolean;
  completionPending: boolean;
  conflict: boolean;
  error: string;
  emptyReason: "completed" | "unavailable" | "prerequisites" | null;
}
