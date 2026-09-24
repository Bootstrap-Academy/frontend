import type { Course, Lecture, Section } from "./courseTypes";
import type {
  ExerciseReference,
  LearningCompletionKind,
  LocalizedText,
  RoomEnvelope,
} from "./learningRooms";
import type { LearningModuleDescriptor } from "./learningModule";

export type LearningActivityKind =
  | "video"
  | "explainer"
  | "quiz"
  | "matching"
  | "coding"
  | "legacy-room"
  | "custom";

export type LearningActivitySource =
  | { kind: "room"; unit_id: string }
  | { kind: "lecture"; course_id: string; section_id: string; lecture_id: string }
  | ({ kind: "challenge" } & ExerciseReference);

export interface LearningActivity {
  id: string;
  kind: LearningActivityKind;
  roles: ("explanation" | "practice")[];
  title: LocalizedText;
  source: LearningActivitySource;
  room?: string | null;
  content: Record<string, any>;
  exercise?: ExerciseReference | null;
  module?: LearningModuleDescriptor | null;
  progress?: RoomEnvelope["progress"] | null;
  completed: boolean | null;
  skip_allowed?: boolean;
  presentation?: { allow_skip?: boolean };
  /** How skills-ms checks the completion of a room activity; see `LearningUnit`. */
  completion_kind?: LearningCompletionKind | null;
}

export interface LearningLesson {
  course_id: string;
  explicit?: boolean;
  id: string;
  title: LocalizedText;
  chapter_id?: string | null;
  activities: LearningActivity[];
  completed: boolean;
  legacy_practice?: { course_id: string; section_id: string; lecture_id: string } | null;
}

export interface CourseCurriculum {
  course_id: string;
  explicit?: boolean;
  chapters: { id: string; title: LocalizedText }[];
  lessons: {
    id: string;
    title: LocalizedText;
    chapter_id?: string | null;
    activity_ids: string[];
    completed: boolean;
  }[];
}

export interface LearningActivityCompletion {
  answer?: Record<string, any>;
  attempt_id?: string;
  /** A signed passing verdict from the LLM gateway for exactly `answer.text`. */
  verdict?: string;
}

export interface LearningActivityHandle {
  cancelPreparation(): void;
}

export interface LegacyVideoContext {
  course: Course;
  lecture: Lecture;
  section?: Section | null;
}
