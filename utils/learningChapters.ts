import type { CourseLearningPlan } from "../types/courseTypes";
/** Chapter order comes from the server; achievements come only from unit progress. */
export function learningChapterGroups(plan: CourseLearningPlan) {
  const chapters = plan.path.chapters || [];
  const nextId =
    plan.next?.unit.id ||
    plan.units.find((u) => u.status === "in_progress")?.id ||
    plan.units.find((u) => !["completed", "skipped"].includes(u.status))?.id;
  return chapters
    .map((chapter, index) => {
      const units = plan.units.filter((u) => u.chapter_id === chapter.id);
      return {
        ...chapter,
        units,
        completed: units.filter((u) => u.status === "completed").length,
        skipped: units.filter((u) => u.status === "skipped").length,
        active: units.some((u) => u.id === nextId) || (!nextId && index === chapters.length - 1),
      };
    })
    .filter((chapter) => chapter.units.length);
}
