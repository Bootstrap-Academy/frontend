import type { Course, Lecture } from "../types/courseTypes";

export type CourseStep = Lecture & { sectionID: string; sectionTitle: string };

/** Only detailed, server-issued lecture identifiers can become learning links. */
export function courseSteps(course: Pick<Course, "sections"> | null | undefined): CourseStep[] {
  return (Array.isArray(course?.sections) ? course.sections : []).flatMap((section) =>
    section.id && Array.isArray(section.lectures)
      ? section.lectures
          .filter((lecture) => !!lecture.id)
          .map((lecture) => ({ ...lecture, sectionID: section.id!, sectionTitle: section.title }))
      : []
  );
}

export function courseResumeStep(course: Pick<Course, "sections"> | null | undefined) {
  const steps = courseSteps(course);
  return steps.find((step) => !step.completed) || steps[0] || null;
}

export function lectureHasVideo(lecture?: Pick<Lecture, "type" | "video_id"> | null) {
  return lecture?.type === "mp4" || (lecture?.type === "youtube" && !!lecture.video_id);
}

export function courseWatchLocation(
  courseId: string,
  step?: Pick<CourseStep, "sectionID" | "id"> | null,
  context: { skillID?: string; subSkillID?: string } = {}
) {
  return {
    path: `/courses/${encodeURIComponent(courseId)}/watch`,
    query: {
      ...(step ? { section: step.sectionID, lecture: step.id } : {}),
      ...(context.skillID ? { skillID: context.skillID } : {}),
      ...(context.subSkillID ? { subSkillID: context.subSkillID } : {}),
    },
  };
}

export function courseProgress(course: Pick<Course, "sections"> | null | undefined) {
  const steps = courseSteps(course);
  const completed = steps.filter((step) => step.completed).length;
  return {
    total: steps.length,
    completed,
    percent: steps.length ? Math.round((completed / steps.length) * 100) : 0,
  };
}
