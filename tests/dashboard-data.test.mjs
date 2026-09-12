import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const temporary = await mkdtemp(join(tmpdir(), "academy-dashboard-data-"));
after(() => rm(temporary, { recursive: true, force: true }));
const moduleFile = join(temporary, "dashboardData.mjs");
const source = await readFile(new URL("../utils/dashboardData.ts", import.meta.url), "utf8");
await writeFile(
  moduleFile,
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText
);
const { createDashboardData, dashboardPractice } = await import(pathToFileURL(moduleFile));

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

const xp = (amount = 30) => ({
  total_xp: amount,
  total_level: 1,
  progress: 1 / 6,
  skills: [{ skill: "programming", xp: amount, level: 1, progress: 1 / 6, skills: [] }],
});
const catalogue = {
  skills: [{ id: "programming", name: "Programmieren", skills: ["python", "java"], icon: null }],
};
const course = {
  id: "python",
  title: "Python",
  completed: false,
  image: null,
  sections: [{ lectures: [{ completed: true }, { completed: false }] }],
};
const task = (overrides = {}) => ({
  id: "question-a",
  task_id: "task-a",
  type: "MULTIPLE_CHOICE_QUESTION",
  coins: 20,
  enabled: true,
  retired: false,
  solved: false,
  ...overrides,
});

function fixture(get) {
  let view;
  const calls = [];
  const controller = createDashboardData({
    get: async (path) => {
      calls.push(path);
      if (get) return get(path);
      if (path === "/skills/xp/me") return xp();
      if (path === "/skills/skilltree") return catalogue;
      if (path.startsWith("/skills/courses")) return [course];
      throw new Error("Unexpected path");
    },
    changed: (next) => (view = next),
  });
  return {
    controller,
    calls,
    get view() {
      return view;
    },
  };
}

test("mount reads personal progress without selecting tasks or changing account data", async () => {
  const f = fixture();
  await f.controller.select("person-a:session-a");
  assert.equal(f.view.status, "ready");
  assert.equal(f.view.xp.total_xp, 30);
  assert.equal(f.view.xp.progress, 1 / 6);
  assert.equal(f.view.skills[0].name, "Programmieren");
  assert.equal(f.view.courses[0].completedLectures, 1);
  assert.equal(f.view.courses[0].totalLectures, 2);
  assert.equal(f.view.practiceStatus, "idle");
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every((path) => !path.includes("/subtasks")));
  assert.ok(f.calls.every((path) => !path.includes("person-a") && !path.includes("session-a")));
});

test("account replacement and logout discard delayed personal responses", async () => {
  const pending = [];
  const f = fixture(() => {
    const request = deferred();
    pending.push(request);
    return request.promise;
  });
  const first = f.controller.select("person-a:session-a");
  const second = f.controller.select("person-b:session-b");
  assert.equal(f.view.xp, null);
  assert.deepEqual(f.view.courses, []);
  [xp(200), catalogue, [course]].forEach((value, i) => pending[i].resolve(value));
  await first;
  assert.equal(f.view.owner, "person-b:session-b");
  assert.equal(f.view.xp, null);
  [xp(40), catalogue, []].forEach((value, i) => pending[i + 3].resolve(value));
  await second;
  assert.equal(f.view.xp.total_xp, 40);
  const refresh = f.controller.reload();
  await f.controller.select(null);
  [xp(50), catalogue, [course]].forEach((value, i) => pending[i + 6].resolve(value));
  await refresh;
  assert.equal(f.view.owner, null);
  assert.equal(f.view.status, "idle");
  assert.equal(f.view.xp, null);
});

test("overlapping reloads keep only the latest results even for the same session", async () => {
  const pending = [];
  const f = fixture(() => {
    const request = deferred();
    pending.push(request);
    return request.promise;
  });
  const first = f.controller.select("person-a:session-a");
  const second = f.controller.reload();
  [xp(70), catalogue, []].forEach((value, i) => pending[i + 3].resolve(value));
  await second;
  [xp(10), catalogue, [course]].forEach((value, i) => pending[i].resolve(value));
  await first;
  assert.equal(f.view.xp.total_xp, 70);
  assert.deepEqual(f.view.courses, []);
});

test("failed or malformed reads remain unavailable instead of pretending zero progress", async () => {
  let recovering = false;
  const f = fixture((path) => {
    if (path === "/skills/xp/me") return recovering ? xp(0) : { ...xp(), progress: 42 };
    if (path === "/skills/skilltree") return catalogue;
    if (path.startsWith("/skills/courses")) throw new Error("Unavailable");
  });
  await f.controller.select("person-a");
  assert.equal(f.view.status, "ready");
  assert.equal(f.view.xp, null);
  assert.equal(f.view.errors.xp, true);
  assert.equal(f.view.errors.courses, true);
  assert.equal(f.view.skills.length, 1);
  recovering = true;
  await f.controller.reload();
  assert.equal(f.view.errors.xp, false);
  assert.equal(f.view.xp.total_xp, 0);
});

test("course summaries preserve nullable completion and accept empty courses from the API", async () => {
  const f = fixture((path) => {
    if (path === "/skills/xp/me") return xp();
    if (path === "/skills/skilltree") return catalogue;
    if (path.startsWith("/skills/courses"))
      return [
        { ...course, completed: null, sections: [{ lectures: [{ completed: null }] }] },
        { ...course, id: "empty", completed: true, sections: [] },
        {
          ...course,
          id: "partial",
          sections: [{ lectures: [{ completed: true }, { completed: null }] }],
        },
      ];
    throw new Error("Unexpected path");
  });
  await f.controller.select("person-a");
  assert.equal(f.view.errors.courses, false);
  assert.equal(f.view.courses.length, 3);
  assert.equal(f.view.courses[0].completed, null);
  assert.equal(f.view.courses[0].completedLectures, null);
  assert.equal(f.view.courses[0].totalLectures, 1);
  assert.equal(f.view.courses[1].completed, true);
  assert.equal(f.view.courses[1].completedLectures, 0);
  assert.equal(f.view.courses[1].totalLectures, 0);
  assert.equal(f.view.courses[2].completedLectures, null);
});

test("practice only uses available unsolved supported tasks and preserves awarded coins", () => {
  const choices = [
    task({ enabled: false }),
    task({ retired: true }),
    task({ solved: true }),
    task({ type: "MATCHING" }),
    task({ type: "QUESTION" }),
    task({ task_id: "another-topic" }),
    task({ id: "own-question", creator: "current-user" }),
    task(),
  ];
  const selected = dashboardPractice(choices, new Set(["task-a"]), "current-user");
  assert.equal(selected.id, "question-a");
  assert.equal(
    selected.route,
    "/quizzes/solve-task-a?quizzesFrom=quiz&taskId=task-a&querySubTaskId=question-a"
  );
  const coding = dashboardPractice([task({ type: "CODING_CHALLENGE" })]);
  assert.equal(coding.route, "/challenges/QuizCodingChallenge-task-a?codingChallenge=question-a");
  assert.equal(dashboardPractice([task()], new Set(["another-topic"])), null);
  assert.equal(dashboardPractice([task({ enabled: undefined })]), null);
  assert.equal(
    dashboardPractice([task({ creator: "current-user" })], undefined, "current-user"),
    null
  );
});

test("explicit focus selects matching tasks and never silently changes the subject", async () => {
  let candidates = [task({ task_id: "unrelated" })];
  const f = fixture((path) => {
    if (path === "/skills/xp/me") return xp();
    if (path === "/skills/skilltree") return catalogue;
    if (path.startsWith("/skills/courses")) return [];
    if (path.startsWith("/challenges/skills/")) return [{ id: "task-a" }];
    if (path.startsWith("/challenges/subtasks?")) return candidates;
    throw new Error(path);
  });
  await f.controller.select("person-a");
  assert.equal(await f.controller.loadPractice("programming"), null);
  assert.equal(f.view.practiceStatus, "ready");
  assert.equal(f.view.errors.practice, false);
  candidates = [task({ id: "own-question", creator: "current-user" }), task()];
  const practice = await f.controller.loadPractice("programming", "current-user");
  assert.equal(practice.taskId, "task-a");
  assert.equal(practice.id, "question-a");
  assert.equal(await f.controller.loadPractice("missing"), null);
  assert.equal(f.view.practiceStatus, "error");
});

test("late practice results cannot navigate a replaced session and repeated clicks do not duplicate reads", async () => {
  const request = deferred();
  const f = fixture((path) => {
    if (path.startsWith("/challenges/subtasks?")) return request.promise;
    if (path === "/skills/xp/me") return xp();
    if (path === "/skills/skilltree") return catalogue;
    if (path.startsWith("/skills/courses")) return [];
    throw new Error("Unexpected path");
  });
  await f.controller.select("person-a:session-a");
  const first = f.controller.loadPractice();
  assert.equal(await f.controller.loadPractice(), null);
  await f.controller.select("person-a:session-b");
  request.resolve([task()]);
  assert.equal(await first, null);
  assert.equal(f.view.practice, null);
  assert.equal(f.view.practiceStatus, "idle");
  assert.equal(f.calls.filter((path) => path.startsWith("/challenges/subtasks?")).length, 1);
});

test("focus resolution limits concurrency and stops new reads after disposal", async () => {
  let active = 0,
    maximum = 0;
  const pending = [];
  const f = fixture((path) => {
    if (path === "/skills/xp/me") return xp();
    if (path === "/skills/skilltree")
      return {
        skills: [
          { ...catalogue.skills[0], skills: Array.from({ length: 12 }, (_, i) => `skill-${i}`) },
        ],
      };
    if (path.startsWith("/skills/courses")) return [];
    active++;
    maximum = Math.max(active, maximum);
    const request = deferred();
    pending.push(request);
    return request.promise.finally(() => active--);
  });
  await f.controller.select("person-a");
  const selected = f.controller.loadPractice("programming");
  assert.equal(maximum, 4);
  f.controller.dispose();
  pending.forEach((request) => request.resolve([{ id: "task-a" }]));
  assert.equal(await selected, null);
  assert.equal(pending.length, 4);
});
