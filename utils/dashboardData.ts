export interface DashboardSkillXP {
  skill: string;
  xp: number;
  level: number;
  progress: number;
  skills: DashboardSkillXP[];
}

export interface DashboardXP {
  total_xp: number;
  total_level: number;
  progress: number;
  skills: DashboardSkillXP[];
}

export interface DashboardSkill {
  id: string;
  name: string;
  icon: string | null;
  skills: string[];
  is_bookmarked: boolean;
}

export interface DashboardCourse {
  id: string;
  title: string;
  image: string | null;
  completed: boolean | null;
  completedLectures: number | null;
  totalLectures: number;
}

export interface DashboardPractice {
  id: string;
  taskId: string;
  type: "MULTIPLE_CHOICE_QUESTION" | "CODING_CHALLENGE";
  title?: string;
  route: string;
}

type Resource = "xp" | "skills" | "courses" | "practice";
export interface DashboardView {
  owner: string | null;
  status: "idle" | "loading" | "ready" | "error";
  xp: DashboardXP | null;
  skills: DashboardSkill[];
  courses: DashboardCourse[];
  practice: DashboardPractice | null;
  practiceStatus: "idle" | "loading" | "ready" | "error";
  errors: Record<Resource, boolean>;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid response");
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid response");
  return value;
}

function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Invalid response");
  return value;
}

function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error("Invalid response");
  return value;
}

function progress(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1)
    throw new Error("Invalid response");
  return value;
}

function completion(value: unknown): boolean | null {
  if (value !== null && typeof value !== "boolean") throw new Error("Invalid course progress");
  return value;
}

function skillXP(value: unknown, root = false): DashboardSkillXP {
  const row = object(value);
  return {
    skill: text(row.skill),
    xp: count(row.xp),
    level: count(row.level),
    progress: progress(row.progress),
    skills: root ? array(row.skills).map((skill) => skillXP(skill)) : [],
  };
}

function parseXP(value: unknown): DashboardXP {
  const row = object(value);
  return {
    total_xp: count(row.total_xp),
    total_level: count(row.total_level),
    progress: progress(row.progress),
    skills: array(row.skills).map((skill) => skillXP(skill, true)),
  };
}

function parseSkills(value: unknown): DashboardSkill[] {
  return array(object(value).skills).map((value) => {
    const row = object(value);
    return {
      id: text(row.id),
      name: text(row.name),
      icon: typeof row.icon === "string" ? row.icon : null,
      skills: array(row.skills).map(text),
      is_bookmarked: row.is_bookmarked === true,
    };
  });
}

function parseCourses(value: unknown): DashboardCourse[] {
  return array(value).map((value) => {
    const row = object(value);
    const lectures = array(row.sections).flatMap((section) => array(object(section).lectures));
    // CourseSummary always includes completion fields. They are nullable for
    // public reads; unknown completion must not become zero or hide the course.
    const completed = completion(row.completed);
    const lectureCompletion = lectures.map((lecture) => completion(object(lecture).completed));
    const completedLectures =
      completed === null || lectureCompletion.includes(null)
        ? null
        : lectureCompletion.filter((complete) => complete).length;
    return {
      id: text(row.id),
      title: text(row.title),
      image: typeof row.image === "string" ? row.image : null,
      completed,
      completedLectures,
      totalLectures: lectures.length,
    };
  });
}

/** Existing solvers support these two direct routes without global skill state. */
export function dashboardPractice(
  value: unknown,
  taskIds?: ReadonlySet<string>,
  excludeCreatorId?: string
): DashboardPractice | null {
  const candidates = array(value);
  for (const value of candidates) {
    const row = object(value);
    if (row.enabled !== true || row.retired !== false || row.solved !== false) continue;
    if (excludeCreatorId && row.creator === excludeCreatorId) continue;
    if (row.type !== "MULTIPLE_CHOICE_QUESTION" && row.type !== "CODING_CHALLENGE") continue;
    const id = text(row.id);
    const taskId = text(row.task_id);
    if (taskIds && !taskIds.has(taskId)) continue;
    const taskPath = encodeURIComponent(taskId);
    const query = new URLSearchParams(
      row.type === "CODING_CHALLENGE"
        ? { codingChallenge: id }
        : { quizzesFrom: "quiz", taskId, querySubTaskId: id }
    );
    return {
      id,
      taskId,
      type: row.type,
      route:
        row.type === "CODING_CHALLENGE"
          ? `/challenges/QuizCodingChallenge-${taskPath}?${query}`
          : `/quizzes/solve-${taskPath}?${query}`,
    };
  }
  return null;
}

function empty(owner: string | null): DashboardView {
  return {
    owner,
    status: owner ? "loading" : "idle",
    xp: null,
    skills: [],
    courses: [],
    practice: null,
    practiceStatus: "idle",
    errors: { xp: false, skills: false, courses: false, practice: false },
  };
}

/** Page-local reads: no storage, global user cache, publication or reward writes. */
export function createDashboardData(options: {
  get: (path: string) => Promise<unknown>;
  changed: (view: DashboardView) => void;
}) {
  let owner: string | null = null;
  let generation = 0;
  let practiceGeneration = 0;
  let alive = true;
  let view = empty(null);

  function publish() {
    options.changed({ ...view, errors: { ...view.errors } });
  }

  async function reload() {
    if (!alive || !owner) return;
    const ticket = ++generation;
    practiceGeneration++;
    view = empty(owner);
    publish();
    const resources = [
      ["xp", "/skills/xp/me", parseXP],
      ["skills", "/skills/skilltree", parseSkills],
      ["courses", "/skills/courses?owned=true&recent_first=true", parseCourses],
    ] as const;

    await Promise.all(
      resources.map(async ([key, path, parse]) => {
        try {
          const value = parse(await options.get(path));
          if (!alive || ticket !== generation) return;
          // The resource list binds each parser to its own field.
          view = { ...view, [key]: value };
        } catch {
          if (!alive || ticket !== generation) return;
          view.errors[key] = true;
        }
        publish();
      })
    );
    if (!alive || ticket !== generation) return;
    view.status = resources.every(([key]) => view.errors[key]) ? "error" : "ready";
    publish();
  }

  return {
    select(next: string | null) {
      if (!alive || next === owner) return Promise.resolve();
      owner = next;
      generation++;
      practiceGeneration++;
      view = empty(owner);
      publish();
      return owner ? reload() : Promise.resolve();
    },
    reload,
    async loadPractice(
      focusRootId?: string,
      excludeCreatorId?: string
    ): Promise<DashboardPractice | null> {
      if (!alive || !owner || view.practiceStatus === "loading") return null;
      const ticket = generation;
      const practiceTicket = ++practiceGeneration;
      view.practice = null;
      view.practiceStatus = "loading";
      view.errors.practice = false;
      publish();
      try {
        let taskIds: Set<string> | undefined;
        if (focusRootId) {
          const skill = view.skills.find((skill) => skill.id === focusRootId);
          if (!skill) throw new Error("Unknown learning focus");
          taskIds = new Set();
          const skills = [...new Set(skill.skills)];
          let next = 0;
          // Keep the catalogue's full scope while limiting simultaneous requests.
          await Promise.all(
            Array.from({ length: Math.min(4, skills.length) }, async () => {
              while (next < skills.length) {
                if (!alive || ticket !== generation || practiceTicket !== practiceGeneration)
                  return;
                const skill = skills[next++];
                const tasks = array(
                  await options.get(`/challenges/skills/${encodeURIComponent(skill)}/tasks`)
                );
                for (const task of tasks) taskIds!.add(text(object(task).id));
              }
            })
          );
        }
        if (!alive || ticket !== generation || practiceTicket !== practiceGeneration) return null;
        const result = dashboardPractice(
          taskIds?.size === 0
            ? []
            : await options.get("/challenges/subtasks?enabled=true&retired=false&solved=false"),
          taskIds,
          excludeCreatorId
        );
        if (!alive || ticket !== generation || practiceTicket !== practiceGeneration) return null;
        view.practice = result;
        view.practiceStatus = "ready";
        publish();
        return result;
      } catch {
        if (!alive || ticket !== generation || practiceTicket !== practiceGeneration) return null;
        view.practiceStatus = "error";
        view.errors.practice = true;
        publish();
        return null;
      }
    },
    dispose() {
      alive = false;
      owner = null;
      generation++;
      practiceGeneration++;
      view = empty(null);
    },
  };
}
