import type { DailyLearning } from "./dailyLearning";
import type { Course, Lecture, Section } from "./courseTypes";
import type { ExerciseReference, LocalizedText, RoomEnvelope } from "./learningRooms";
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
}

export interface LearningLesson {
  initial_activity_id?: string | null;
  daily?: DailyLearning;
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
    daily?: DailyLearning;
    completed: boolean;
  }[];
}

export interface LearningActivityCompletion {
  answer?: Record<string, any>;
  attempt_id?: string;
}

export interface LearningActivityHandle {
  cancelPreparation(): void;
}

export interface LegacyVideoContext {
  lessonId?: string;
  course: Course;
  lecture: Lecture;
  section?: Section | null;
}
