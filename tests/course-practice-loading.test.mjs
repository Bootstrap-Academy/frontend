// How often the course page asks the server for its exercises: once per course while the learner
// stays in it, then only for what changed. The course list, the quiz page and the exercise list
// run with their real code against a stand-in server that records every request.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as Vue from "vue";
import { component, evaluate, host, settle, tag } from "./helpers/mounted-page.mjs";

const course = {
  tasks: [
    { id: "t1", section_id: "s1", lecture_id: "l1" },
    { id: "t2", section_id: "s1", lecture_id: "l2" },
    { id: "t3", section_id: "s2", lecture_id: "l3" },
  ],
  rows: {
    t1: {
      multiple_choice: [{ id: "q1", task_id: "t1", question: "First?", solved: false }],
      matchings: [{ id: "m1", task_id: "t1", left: ["a", "b"], solved: false }],
      coding_challenges: [],
    },
    t2: {
      multiple_choice: [{ id: "q2", task_id: "t2", question: "Second?", solved: false }],
      matchings: [],
      coding_challenges: [{ id: "c2", task_id: "t2", title: "Loop", solved: false }],
    },
    t3: {
      multiple_choice: [{ id: "q3", task_id: "t3", question: "Third?", solved: true }],
      matchings: [],
      coding_challenges: [],
    },
  },
};

/** A stand-in server. `wait` holds back the answer to a path until the test lets it go. */
function server(data = course, wait = {}) {
  const calls = [];
  const request = async (path) => {
    calls.push(path);
    if (wait[path]) await wait[path];
    if (/^\/challenges\/(courses|skills)\/[^/]+\/tasks$/.test(path))
      return structuredClone(data.tasks);
    const list = path.match(
      /^\/challenges\/tasks\/([^/]+)\/(multiple_choice|matchings|coding_challenges)$/
    );
    if (list) return structuredClone(data.rows[list[1]]?.[list[2]] ?? []);
    const one = path.match(/^\/challenges\/tasks\/([^/]+)\/(multiple_choice|matchings)\/([^/]+)$/);
    if (one)
      return {
        ...structuredClone(data.rows[one[1]][one[2]].find((row) => row.id === one[3])),
        answers: ["yes", "no"],
      };
    throw new Error(`unexpected request ${path}`);
  };
  return { request, calls, take: () => calls.splice(0) };
}
const rowsOf = (task) =>
  ["multiple_choice", "matchings", "coding_challenges"].map(
    (endpoint) => `/challenges/tasks/${task}/${endpoint}`
  );
const LIST = "/challenges/courses/python/tasks";

async function practiceModule() {
  return evaluate("utils/coursePractice.ts", {});
}
function lectures(practice, api, cache, owner = "learner:session") {
  return (section, lecture) =>
    practice.loadCoursePractice(
      api.request,
      { source: "course", id: "python", section, lecture, owner },
      () => true,
      cache
    );
}

test("a lecture change reads only the exercises the course has not read yet", async () => {
  const practice = await practiceModule();
  const api = server();
  const cache = practice.createPracticeCache();
  const lecture = lectures(practice, api, cache);

  const first = await lecture("s1", "l1");
  assert.deepEqual(api.take(), [LIST, ...rowsOf("t1")], "opening the course page");
  await lecture("s1", "l2");
  assert.deepEqual(api.take(), rowsOf("t2"), "first lecture change: no new task list");
  await lecture("s2", "l3");
  assert.deepEqual(api.take(), rowsOf("t3"), "second lecture change");
  assert.deepEqual(await lecture("s1", "l1"), first);
  assert.deepEqual(api.take(), [], "third lecture change, back to a lecture already shown");

  // Same items in the same order as a page that reads everything anew.
  for (const [section, id] of [
    ["s1", "l1"],
    ["s1", "l2"],
    ["s2", "l3"],
  ])
    assert.deepEqual(
      await lecture(section, id),
      await practice.loadCoursePractice(server().request, {
        source: "course",
        id: "python",
        section,
        lecture: id,
      })
    );
});

test("a confirmed answer shows as solved on the way back without any request", async () => {
  const practice = await practiceModule();
  const api = server();
  const cache = practice.createPracticeCache();
  const lecture = lectures(practice, api, cache);
  await lecture("s1", "l1");
  api.take();

  cache.solved("multiple_choice", "t1", "q1");
  const after = await lecture("s1", "l1");
  assert.deepEqual(api.take(), [], "one answer, no request");
  // What a full re-read shows once the server knows the answer: the solved item moves last.
  const known = structuredClone(course);
  known.rows.t1.multiple_choice[0].solved = true;
  assert.deepEqual(
    after,
    await practice.loadCoursePractice(server(known).request, {
      source: "course",
      id: "python",
      section: "s1",
      lecture: "l1",
    })
  );
  assert.deepEqual(
    after.map((item) => [item.id, item.solved]),
    [
      ["m1", false],
      ["q1", true],
    ]
  );
  // A wrong answer changes nothing the list shows, so nothing is marked and nothing is read.
  await lecture("s1", "l2");
  api.take();
  assert.equal((await lecture("s1", "l2")).find((item) => item.id === "q2").solved, false);
  assert.deepEqual(api.take(), []);
});

test("a coding submission reads only that task's coding exercises, on every visit until the course is left", async () => {
  const practice = await practiceModule();
  const api = server();
  const cache = practice.createPracticeCache();
  const lecture = lectures(practice, api, cache);
  await lecture("s1", "l2");
  await lecture("s1", "l1");
  api.take();

  cache.refresh("coding_challenges", "t2");
  await lecture("s1", "l2");
  assert.deepEqual(api.take(), ["/challenges/tasks/t2/coding_challenges"]);
  // The verdict arrives later; the next visit asks again, for this one task only.
  const judged = structuredClone(course);
  judged.rows.t2.coding_challenges[0].solved = true;
  const later = server(judged);
  const shown = await practice.loadCoursePractice(
    later.request,
    { source: "course", id: "python", section: "s1", lecture: "l2", owner: "learner:session" },
    () => true,
    cache
  );
  assert.deepEqual(later.take(), ["/challenges/tasks/t2/coding_challenges"]);
  assert.equal(shown.find((item) => item.id === "c2").solved, true);
  await lecture("s1", "l1");
  assert.deepEqual(api.take(), [], "other lectures stay as read");

  cache.forget();
  await lecture("s1", "l2");
  assert.deepEqual(api.take(), [LIST, ...rowsOf("t2")], "after leaving, the course is read anew");
});

test("another account, session or course never sees the rows read for this one", async () => {
  const practice = await practiceModule();
  const api = server();
  const cache = practice.createPracticeCache();
  await lectures(practice, api, cache, "learner:session")("s1", "l1");
  api.take();
  await lectures(practice, api, cache, "other:session")("s1", "l1");
  assert.deepEqual(api.take(), [LIST, ...rowsOf("t1")]);
  await lectures(practice, api, cache, "other:renewed")("s1", "l1");
  assert.deepEqual(api.take(), [LIST, ...rowsOf("t1")]);
  await practice.loadCoursePractice(
    api.request,
    { source: "skill", id: "python", owner: "other:renewed" },
    () => true,
    cache
  );
  assert.deepEqual(api.take().slice(0, 1), ["/challenges/skills/python/tasks"]);
});

test("a failed read is not kept and is tried again on the next visit", async () => {
  const practice = await practiceModule();
  const cache = practice.createPracticeCache();
  let failing = new Set([LIST]);
  const calls = [];
  const request = async (path) => {
    calls.push(path);
    if (failing.has(path)) throw new Error("Unavailable");
    return server().request(path);
  };
  const open = () =>
    practice.loadCoursePractice(
      request,
      { source: "course", id: "python", section: "s1", lecture: "l1", owner: "learner:session" },
      () => true,
      cache
    );
  await assert.rejects(open(), /Unavailable/);
  failing = new Set(["/challenges/tasks/t1/matchings"]);
  await assert.rejects(open(), /Unavailable/);
  failing = new Set();
  calls.splice(0);
  assert.equal((await open()).length, 2);
  assert.deepEqual(
    calls,
    ["/challenges/tasks/t1/matchings", "/challenges/tasks/t1/coding_challenges"],
    "the failed read and the one it stopped; the task list and the quizzes stay as read"
  );
});

test("the quiz and matching pages take every task's exercises from the same read, in task order", async () => {
  const practice = await practiceModule();
  const cache = practice.createPracticeCache();
  let release;
  const slow = new Promise((resolve) => (release = resolve));
  const api = server(course, { "/challenges/tasks/t2/multiple_choice": slow });
  await lectures(practice, api, cache)("s1", "l1");
  api.take();
  const source = { source: "course", id: "python", owner: "learner:session" };

  const reading = practice.loadPracticeRows(api.request, source, "multiple_choice", cache);
  await settle();
  release();
  const quizzes = await reading;
  assert.deepEqual(
    api.take(),
    ["/challenges/tasks/t2/multiple_choice", "/challenges/tasks/t3/multiple_choice"],
    "no task list and nothing the lecture list already read"
  );
  assert.deepEqual(
    quizzes.map((row) => row.id),
    ["q1", "q2", "q3"],
    "task order, even when a later task answers first"
  );
  assert.deepEqual(
    await practice.loadPracticeRows(api.request, source, "multiple_choice", cache),
    quizzes
  );
  assert.deepEqual(api.take(), [], "opening the quiz page again");

  // The page marks its own copies; only a confirmed answer reaches the course list.
  quizzes[1].solved = true;
  const list = await lectures(practice, api, cache)("s1", "l2");
  assert.equal(list.find((item) => item.id === "q2").solved, false);
  api.take();

  const matchings = await practice.loadPracticeRows(api.request, source, "matchings", cache);
  assert.deepEqual(
    matchings.map((row) => row.id),
    ["m1"]
  );
  assert.deepEqual(api.take(), ["/challenges/tasks/t3/matchings"]);
});

test("the exercises stay loaded on the pages of a course and are dropped anywhere else", async () => {
  const practice = await practiceModule();
  for (const path of [
    "/courses/python",
    "/courses/python/watch",
    "/courses/C%2B%2B/watch",
    "/quizzes/solve-python",
    "/matchings/solve-python",
    "/challenges/QuizCodingChallenge-task",
    "/skill-tree/start/python",
  ])
    assert.equal(practice.isPracticeRoute(path), true, path);
  for (const path of [
    "/",
    "/courses",
    "/courses/",
    "/learn",
    "/dashboard",
    "/skill-tree",
    "/skill-tree/start",
    "/challenges",
    "/auth/login",
  ])
    assert.equal(practice.isPracticeRoute(path), false, path);

  let afterEach;
  const plugin = await evaluate("plugins/course-practice.client.ts", {
    require: (name) => ({ "~/utils/coursePractice": practice })[name],
    defineNuxtPlugin: (setup) => setup,
    useRouter: () => ({ afterEach: (hook) => (afterEach = hook) }),
  });
  plugin.default();
  const api = server();
  const lecture = lectures(practice, api, practice.practiceCache);
  await lecture("s1", "l1");
  api.take();
  for (const path of ["/courses/python/watch", "/quizzes/solve-python", "/courses/python"]) {
    afterEach({ path });
    await lecture("s1", "l1");
  }
  assert.deepEqual(api.take(), [], "within the course");
  afterEach({ path: "/learn" });
  await lecture("s1", "l1");
  assert.deepEqual(api.take(), [LIST, ...rowsOf("t1")], "after a visit elsewhere");
});

/** The real composable module of quizzes, reading through the stand-in server. */
async function quizzesModule(practice, api, state) {
  return evaluate("composables/quizzes.ts", {
    require: (name) =>
      ({
        "#app": {
          useState: (key, init) => (state[key] ??= Vue.ref(init())),
        },
        "~/types/courseTypes": { Quiz: class {}, LecturesWithQuiz: class {} },
        "./fetch": { GET: api.request },
        "./matching": { useMatchingsForLectures: () => Vue.ref([]) },
        "~/types/matching": { MatchingForSections: class {} },
        "~/utils/coursePractice": practice,
      })[name],
    useUser: () => Vue.ref({ id: "learner" }),
    useSession: () => Vue.ref({ id: "session" }),
    openSnackbar: () => assert.fail("no error is shown"),
  });
}

test("per answer on the quiz page: no request for the course's exercises, and the course list shows it solved", async () => {
  const practice = await practiceModule();
  const api = server();
  const state = {};
  const quizzes = await quizzesModule(practice, api, state);
  const lecture = lectures(practice, api, practice.practiceCache);

  await lecture("s1", "l1");
  api.take();

  // The quiz page opened from the course page's list, as a learner clicks a quiz.
  const scope = { onMounted: null };
  const page = await evaluate("pages/quizzes/solve-[id].vue", {
    require: (name) =>
      ({
        vue: Vue,
        "vue-i18n": { useI18n: () => ({ t: (key) => key }) },
        "@heroicons/vue/24/outline": {},
        "~~/composables/quizzes": quizzes,
        "~/utils/coursePractice": practice,
      })[name],
    ...Vue,
    onMounted: (fn) => (scope.onMounted = fn),
    useRoute: () => ({
      path: "/quizzes/solve-python",
      params: { id: "python" },
      query: { quizzesFrom: "course", querySubTaskId: "q1", taskId: "t1" },
    }),
    useRouter: () => ({ replace: () => {} }),
    useUser: () => Vue.ref({ id: "learner" }),
    getSubTaskInQuiz: async (task, id) => [
      await api.request(`/challenges/tasks/${task}/multiple_choice/${id}`),
      null,
    ],
    setTimeout: () => {},
  });
  const open = async () => {
    const view = Vue.effectScope().run(() => page.setup({}, { emit() {} }));
    await scope.onMounted();
    return view;
  };

  const view = await open();
  assert.deepEqual(
    api.take(),
    [
      "/challenges/tasks/t1/multiple_choice/q1",
      "/challenges/tasks/t2/multiple_choice",
      "/challenges/tasks/t3/multiple_choice",
    ],
    "opening the quiz page reads the chosen quiz and the quizzes the course has not read yet"
  );
  assert.deepEqual(
    view.arrayOfSubtasks.value.map((row) => [row.id, row.solved]),
    [
      ["q1", false],
      ["q2", false],
      ["q3", true],
    ]
  );
  assert.equal(view.loading.value, false);
  assert.equal(state.quizzesInCourse.value.length, 3, "the skill tree's shortcut learns of them");

  view.setSolvedLocally("q1");
  assert.deepEqual(api.take(), [], "the answer itself reads nothing");
  assert.equal(view.solvedSubtaskCount.value, 2);
  const back = await lecture("s1", "l1");
  assert.deepEqual(api.take(), [], "back on the course page");
  assert.equal(back.find((item) => item.id === "q1").solved, true);

  await open();
  assert.deepEqual(
    api.take(),
    ["/challenges/tasks/t1/multiple_choice/q1"],
    "opening the quiz page again"
  );
});

test("per answer on the matching page: no request for the course's exercises, and the course list shows it solved", async () => {
  const practice = await practiceModule();
  const api = server();
  const state = {};
  const quizzes = await quizzesModule(practice, api, state);
  const lecture = lectures(practice, api, practice.practiceCache);
  await lecture("s1", "l1");
  api.take();

  let form;
  const Page = await component(
    "pages/matchings/solve-[id].vue",
    {
      useRoute: () => ({
        path: "/matchings/solve-python",
        params: { id: "python" },
        query: { quizzesFrom: "course", querySubTaskId: "m1", taskId: "t1" },
      }),
      useRouter: () => ({ replace: () => {} }),
      useUser: () => Vue.ref({ id: "learner" }),
      getMatching: async (id, task) => [
        await api.request(`/challenges/tasks/${task}/matchings/${id}`),
        null,
      ],
      setTimeout: () => {},
    },
    {
      "~~/composables/quizzes": quizzes,
      "~/utils/coursePractice": practice,
      "vue-i18n": { useI18n: () => ({ t: (key) => key }) },
      "@heroicons/vue/24/outline": {
        CheckCircleIcon: tag("svg"),
        MagnifyingGlassCircleIcon: tag("svg"),
      },
    }
  );
  const ui = host();
  const app = ui.renderer.createApp({ render: () => Vue.h(Page) });
  for (const name of ["MatchingCard", "InputButtonToggle", "QuizCardSkeleton", "NuxtLink"])
    app.component(name, tag("div"));
  app.component("FormSolveMatching", (props) => {
    form = props;
    return Vue.h("form");
  });
  app.mount(ui.root);
  await settle();
  assert.deepEqual(
    api.take(),
    [
      "/challenges/tasks/t1/matchings/m1",
      "/challenges/tasks/t2/matchings",
      "/challenges/tasks/t3/matchings",
      "/challenges/tasks/t2/multiple_choice",
      "/challenges/tasks/t3/multiple_choice",
    ],
    "the chosen matching, what the course has not read yet, and the quizzes for the skill tree"
  );

  form.onSolved("m1");
  await settle();
  assert.deepEqual(api.take(), [], "the answer itself reads nothing");
  const back = await lecture("s1", "l1");
  assert.deepEqual(api.take(), [], "back on the course page");
  assert.equal(back.find((item) => item.id === "m1").solved, true);
  app.unmount();
});

test("the matching page reads the course's matchings once and tells the skill tree about its quizzes", async () => {
  const practice = await practiceModule();
  const api = server();
  const state = {};
  const quizzes = await quizzesModule(practice, api, state);
  const rows = await quizzes.getPracticeExercises("course", "python", "matchings");
  assert.deepEqual(
    rows.map((row) => row.id),
    ["m1"]
  );
  await settle();
  assert.deepEqual(api.take(), [
    LIST,
    "/challenges/tasks/t1/matchings",
    "/challenges/tasks/t2/matchings",
    "/challenges/tasks/t3/matchings",
    "/challenges/tasks/t1/multiple_choice",
    "/challenges/tasks/t2/multiple_choice",
    "/challenges/tasks/t3/multiple_choice",
  ]);
  assert.equal(state.quizzesInCourse.value.length, 3);
  await quizzes.getPracticeExercises("course", "python", "matchings");
  await settle();
  assert.deepEqual(api.take(), [], "opening the matching page again");
});

async function lectureList(practice, api, path) {
  return component(
    "components/course/Practice.vue",
    {
      useCourseExperienceCopy: () => ({ copy: Vue.ref({ loading: "Loading" }) }),
      useRoute: () => ({ path }),
      useUser: () => Vue.ref({ id: "learner" }),
      useSession: () => Vue.ref({ id: "session" }),
      GET: api.request,
    },
    { "~/utils/coursePractice": practice }
  );
}

test("the lecture list on the course page: what each lecture change sends, with the real component", async () => {
  const practice = await practiceModule();
  const api = server();
  const ui = host();
  const lecture = Vue.ref("l1");
  const section = Vue.computed(() => (lecture.value === "l3" ? "s2" : "s1"));
  const Practice = await lectureList(practice, api, "/courses/python/watch");
  const app = ui.renderer.createApp({
    // The course player gives the list a new key per lecture, so every change mounts it anew.
    render: () =>
      Vue.h(Practice, {
        key: lecture.value,
        source: "course",
        sourceId: "python",
        section: section.value,
        lecture: lecture.value,
      }),
  });
  app.component("NuxtLink", tag("a"));
  app.mount(ui.root);
  await settle();
  const sent = { open: api.take() };
  for (const next of ["l2", "l3", "l1"]) {
    lecture.value = next;
    await settle();
    sent[next] = api.take();
  }
  assert.deepEqual(sent, {
    open: [LIST, ...rowsOf("t1")],
    l2: rowsOf("t2"),
    l3: rowsOf("t3"),
    l1: [],
  });
  assert.match(ui.text(), /First\?/);

  practice.practiceCache.solved("multiple_choice", "t1", "q1");
  lecture.value = "l2";
  await settle();
  lecture.value = "l1";
  await settle();
  assert.deepEqual(api.take(), []);
  assert.match(ui.text(), /✓\s+First\?/, "the answered quiz carries its tick");
  app.unmount();
});

test("in a learning room the lecture list reads anew on every visit, as before", async () => {
  const practice = await practiceModule();
  const api = server();
  const ui = host();
  const lecture = Vue.ref("l1");
  const Practice = await lectureList(practice, api, "/learn");
  const app = ui.renderer.createApp({
    render: () =>
      Vue.h(Practice, {
        key: lecture.value,
        source: "course",
        sourceId: "python",
        section: "s1",
        lecture: lecture.value,
      }),
  });
  app.component("NuxtLink", tag("a"));
  app.mount(ui.root);
  await settle();
  const sent = [api.take()];
  for (const next of ["l2", "l1"]) {
    lecture.value = next;
    await settle();
    sent.push(api.take());
  }
  assert.deepEqual(sent, [
    [LIST, ...rowsOf("t1")],
    [LIST, ...rowsOf("t2")],
    [LIST, ...rowsOf("t1")],
  ]);
  app.unmount();
});
