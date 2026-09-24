import type { Course, Lecture, Section } from "../types/courseTypes";
import type {
  LearningActivity,
  LearningActivityKind,
  LearningLesson,
} from "../types/learningActivities";
import type { LocalizedText, RoomEnvelope } from "../types/learningRooms";
import { lectureHasVideo } from "./courseJourney";

const translated = (value: string): LocalizedText => ({ de: value, en: value });
export function activityContent(activity: Pick<LearningActivity, "content">, locale: string) {
  const content = activity.content || {};
  return content[locale.startsWith("de") ? "de" : "en"] || content;
}

/** Compatibility metadata stays beside the old content adapter, outside the player. */
const legacyRequiredUnits = new Set([
  "itf-project-recover",
  "itf-project-generator",
  "itf-project-publish",
]);

export function roomActivity(room: RoomEnvelope): LearningActivity {
  const unit = room.unit;
  const exerciseKind = { multiple_choice: "quiz", matching: "matching", coding: "coding" } as const;
  const kind: LearningActivityKind =
    unit.room === "exercise" && unit.exercise
      ? exerciseKind[unit.exercise.type]
      : unit.room === "custom" || unit.room === "video"
        ? unit.room
        : unit.room === "guided-lesson"
          ? "explainer"
          : "legacy-room";
  return {
    id: unit.id,
    kind,
    roles: unit.exercise ? ["practice"] : ["explanation"],
    title: unit.title,
    source: { kind: "room", unit_id: unit.id },
    room: unit.room,
    content: unit.content,
    exercise: unit.exercise,
    module: unit.module,
    progress: room.progress,
    completed: ["completed", "skipped"].includes(room.progress.status),
    presentation: {
      allow_skip:
        unit.skip_allowed ??
        unit.presentation?.allow_skip ??
        (unit.room !== "exercise" && !legacyRequiredUnits.has(unit.id)),
    },
    ...(unit.completion_kind !== undefined ? { completion_kind: unit.completion_kind } : {}),
  };
}

export function roomLesson(room: RoomEnvelope, courseId?: string | null): LearningLesson {
  return {
    course_id: courseId || "",
    id: room.unit.id,
    title: room.unit.title,
    chapter_id: room.unit.chapter_id,
    activities: [roomActivity(room)],
    completed: ["completed", "skipped"].includes(room.progress.status),
    legacy_practice: null,
  };
}

/** Existing videos and exercises keep their own completion authorities. */
export function legacyLectureLesson(
  course: Course,
  lecture: Lecture,
  section?: Section | null
): LearningLesson {
  return {
    course_id: course.id,
    id: lecture.id,
    title: translated(lecture.title),
    chapter_id: section?.id,
    activities: lectureHasVideo(lecture)
      ? [
          {
            id: lecture.id,
            kind: "video",
            roles: ["explanation"],
            title: translated(lecture.title),
            source: {
              kind: "lecture",
              course_id: course.id,
              section_id: section?.id || "",
              lecture_id: lecture.id,
            },
            content: { ...lecture },
            completed: lecture.completed,
          },
        ]
      : [],
    completed: lecture.completed,
    legacy_practice: {
      course_id: course.id,
      section_id: section?.id || "",
      lecture_id: lecture.id,
    },
  };
}

export function activityRenderer(activity: LearningActivity) {
  if (activity.kind === "custom") return activity.module ? "custom" : null;
  if (activity.source.kind === "lecture") return activity.kind === "video" ? "legacy-video" : null;
  if (activity.kind === "video") return "video";
  if (activity.room && activity.room !== "exercise") return activity.room;
  if (["quiz", "matching", "coding"].includes(activity.kind) && activity.exercise)
    return "exercise";
  if (activity.kind === "explainer") return "guided-lesson";
  return null;
}
