export interface CoursePracticeItem {
  id: string;
  task_id: string;
  kind: "multiple_choice" | "matching" | "coding";
  title: string;
  solved: boolean;
}
export type PracticeEndpoint = "multiple_choice" | "matchings" | "coding_challenges";
export interface PracticeSource {
  source: "course" | "skill";
  id: string;
  /** The account and session the rows were read for; another one never sees them. */
  owner: string;
}
type Request = (path: string) => Promise<any>;

type Identity = { id?: string | null } | null | undefined;
export function practiceOwner(user: Identity, session: Identity) {
  return `${user?.id || ""}:${session?.id || ""}`;
}

/**
 * The exercises of one course or skill, read once while the learner works in it. A lecture
 * change, the quiz and matching pages and the way back to the course take them from here.
 * An answer updates its own row; nothing else is read again until the learner leaves.
 */
export function createPracticeCache() {
  let key = "";
  let tasks: Promise<any[]> | undefined;
  let rows = new Map<string, { promise: Promise<any[]>; value?: any[] }>();
  // Rows whose state the server settles later (a coding verdict) are read on every visit.
  let live = new Set<string>();
  function forget() {
    key = "";
    tasks = undefined;
    rows = new Map();
    live = new Set();
  }
  function open(source: PracticeSource) {
    const next = JSON.stringify([source.owner, source.source, source.id]);
    if (next !== key) {
      forget();
      key = next;
    }
  }
  return {
    forget,
    tasks(request: Request, source: PracticeSource): Promise<any[]> {
      open(source);
      if (!tasks) {
        const path = `/challenges/${source.source === "course" ? "courses" : "skills"}/${encodeURIComponent(source.id)}/tasks`;
        const read = Promise.resolve()
          .then(() => request(path))
          .then((list) => {
            if (!Array.isArray(list)) throw new Error("Invalid tasks");
            return list;
          });
        tasks = read;
        // A failed read is tried again on the next visit.
        read.catch(() => {
          if (tasks === read) tasks = undefined;
        });
      }
      return tasks;
    },
    rows(
      request: Request,
      source: PracticeSource,
      taskId: string,
      endpoint: PracticeEndpoint
    ): Promise<any[]> {
      open(source);
      const name = `${taskId}/${endpoint}`;
      const known = rows.get(name);
      if (known && !live.has(name)) return known.promise;
      const path = `/challenges/tasks/${encodeURIComponent(taskId)}/${endpoint}`;
      const slot: { promise: Promise<any[]>; value?: any[] } = {
        promise: Promise.resolve()
          .then(() => request(path))
          .then((list) => {
            if (!Array.isArray(list)) throw new Error("Invalid exercises");
            return (slot.value = list);
          }),
      };
      const store = rows;
      store.set(name, slot);
      slot.promise.catch(() => {
        if (store.get(name) === slot) store.delete(name);
      });
      return slot.promise;
    },
    /** The server confirmed this answer as solved. */
    solved(endpoint: PracticeEndpoint, taskId: string, id: string) {
      const slot = rows.get(`${taskId}/${endpoint}`);
      const mark = (list: any[]) => {
        for (const row of list) if (row?.id === id) row.solved = true;
      };
      if (slot?.value) mark(slot.value);
      else slot?.promise.then(mark, () => {});
    },
    /** This task's rows change after the answer; read them again whenever they are shown. */
    refresh(endpoint: PracticeEndpoint, taskId: string) {
      const name = `${taskId}/${endpoint}`;
      rows.delete(name);
      live.add(name);
    },
  };
}
export type PracticeCache = ReturnType<typeof createPracticeCache>;
/** The app's exercises of the course the learner is in (see `plugins/course-practice.client.ts`). */
export const practiceCache = createPracticeCache();

/** Pages on which the learner works through the exercises of one course or skill. */
export function isPracticeRoute(path: string) {
  return /^\/(courses\/[^/]+(\/|$)|quizzes\/solve-|matchings\/solve-|challenges\/QuizCodingChallenge-|skill-tree\/[^/]+\/[^/]+\/?$)/.test(
    path
  );
}

// Bound fan-out for old courses with many task containers.
async function inTurns<T>(items: T[], work: (item: T, index: number) => Promise<void>) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        await work(items[index] as T, index);
      }
    })
  );
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
  request: Request,
  options: {
    source: "course" | "skill";
    id: string;
    section?: string;
    lecture?: string;
    excludeLectureIds?: string[];
    owner?: string;
  },
  current: () => boolean = () => true,
  // Without one, everything is read anew.
  cache: PracticeCache = createPracticeCache()
): Promise<CoursePracticeItem[]> {
  const source = { source: options.source, id: options.id, owner: options.owner ?? "" };
  const tasks = await cache.tasks(request, source);
  const selected = tasks.filter(
    (task) =>
      (!options.section || task.section_id === options.section) &&
      (!options.lecture || task.lecture_id === options.lecture) &&
      (!options.excludeLectureIds || !options.excludeLectureIds.includes(task.lecture_id))
  );
  const result: CoursePracticeItem[] = [];
  await inTurns(selected, async (task) => {
    if (!task?.id) return;
    for (const [endpoint, kind] of [
      ["multiple_choice", "multiple_choice"],
      ["matchings", "matching"],
      ["coding_challenges", "coding"],
    ] as const) {
      if (!current()) return;
      for (const row of await cache.rows(request, source, task.id, endpoint)) {
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
  });
  const ordered = new Map(selected.map((task, index) => [task.id, index]));
  return [...new Map(result.map((item) => [`${item.kind}:${item.id}`, item])).values()].sort(
    (a, b) =>
      Number(a.solved) - Number(b.solved) ||
      (ordered.get(a.task_id) ?? 0) - (ordered.get(b.task_id) ?? 0) ||
      a.id.localeCompare(b.id)
  );
}

/**
 * Every quiz or every matching of a course or skill, in the order of its tasks, as the quiz and
 * matching pages list them. The rows are copies the page may mark. A task whose exercises cannot
 * be read is left out and read again on the next visit.
 */
export async function loadPracticeRows(
  request: Request,
  source: PracticeSource,
  endpoint: PracticeEndpoint,
  cache: PracticeCache = practiceCache
): Promise<any[]> {
  const tasks = await cache.tasks(request, source);
  const lists: any[][] = [];
  await inTurns(tasks, async (task, index) => {
    if (task?.id)
      lists[index] = await cache.rows(request, source, task.id, endpoint).catch(() => []);
  });
  return lists.flat().map((row) => ({ ...row }));
}
