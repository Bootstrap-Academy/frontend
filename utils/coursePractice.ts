export interface CoursePracticeItem {
  id: string;
  task_id: string;
  kind: "multiple_choice" | "matching" | "coding";
  title: string;
  solved: boolean;
}
export function practiceLocation(
  item: CoursePracticeItem,
  source: "course" | "skill",
  sourceId: string,
  context: { skillID?: string; subSkillID?: string } = {}
) {
  if (item.kind === "coding")
    return {
      path: `/challenges/QuizCodingChallenge-${encodeURIComponent(item.task_id)}`,
      query: { codingChallenge: item.id, solveFrom: source },
    };
  return {
    path: `/${item.kind === "matching" ? "matchings" : "quizzes"}/solve-${encodeURIComponent(sourceId)}`,
    query: {
      quizzesFrom: source,
      querySubTaskId: item.id,
      taskId: item.task_id,
      rootSkillID: context.skillID || "",
      subSkillID: context.subSkillID || "",
    },
  };
}
export async function loadCoursePractice(
  request: (path: string) => Promise<any>,
  options: {
    source: "course" | "skill";
    id: string;
    section?: string;
    lecture?: string;
    excludeLectureIds?: string[];
  },
  current: () => boolean = () => true
): Promise<CoursePracticeItem[]> {
  const tasks = await request(
    `/challenges/${options.source === "course" ? "courses" : "skills"}/${encodeURIComponent(options.id)}/tasks`
  );
  if (!Array.isArray(tasks)) throw new Error("Invalid tasks");
  const selected = tasks.filter(
    (task) =>
      (!options.section || task.section_id === options.section) &&
      (!options.lecture || task.lecture_id === options.lecture) &&
      (!options.excludeLectureIds || !options.excludeLectureIds.includes(task.lecture_id))
  );
  const result: CoursePracticeItem[] = [];
  let cursor = 0;
  // Bound fan-out for old courses with many task containers.
  await Promise.all(
    Array.from({ length: Math.min(4, selected.length) }, async () => {
      while (current() && cursor < selected.length) {
        const task = selected[cursor++];
        if (!task?.id) continue;
        for (const [endpoint, kind] of [
          ["multiple_choice", "multiple_choice"],
          ["matchings", "matching"],
          ["coding_challenges", "coding"],
        ] as const) {
          if (!current()) return;
          const rows = await request(
            `/challenges/tasks/${encodeURIComponent(task.id)}/${endpoint}`
          );
          if (!Array.isArray(rows)) throw new Error("Invalid exercises");
          for (const row of rows) {
            if (!row?.id || row.enabled === false || row.retired === true) continue;
            result.push({
              id: row.id,
              task_id: row.task_id || task.id,
              kind,
              title: row.question || row.title || row.left?.join(" · ") || "",
              solved: !!row.solved,
            });
          }
        }
      }
    })
  );
  const ordered = new Map(selected.map((task, index) => [task.id, index]));
  return [...new Map(result.map((item) => [`${item.kind}:${item.id}`, item])).values()].sort(
    (a, b) =>
      Number(a.solved) - Number(b.solved) ||
      (ordered.get(a.task_id) ?? 0) - (ordered.get(b.task_id) ?? 0) ||
      a.id.localeCompare(b.id)
  );
}
