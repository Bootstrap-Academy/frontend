// How often the course page asks the server for its exercises: once per course while the learner
// stays in it, then only for what changed. The course list, the quiz page and the exercise list
// run with their real code against a stand-in server that records every request.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse } from "@vue/compiler-sfc";
import ts from "typescript";
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

  cache.solved("learner:session", "multiple_choice", "t1", "q1");
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

  cache.refresh("learner:session", "coding_challenges", "t2");
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
    "/courses/python/lessons",
    "/courses/python/lessons/lesson-1",
    "/dashboard",
    "/skill-tree",
    "/skill-tree/start",
    "/challenges",
    "/auth/login",
  ])
    assert.equal(practice.isPracticeRoute(path), false, path);

  let afterEach;
  const visits = await evaluate("utils/courseVisit.ts", {});
  const plugin = await evaluate("plugins/course-practice.client.ts", {
    require: (name) =>
      ({ "~/utils/coursePractice": practice, "~/utils/courseVisit": visits })[name],
    defineNuxtPlugin: (setup) => setup,
    useRouter: () => ({ afterEach: (hook) => (afterEach = hook) }),
  });
  plugin.default();
  const api = server();
  const lecture = lectures(practice, api, practice.practiceCache);
  await lecture("s1", "l1");
  api.take();
  const opened = { id: "python", sections: [] };
  visits.courseVisit.keep("learner:session", "python", opened);
  for (const path of ["/courses/python/watch", "/quizzes/solve-python", "/courses/python"]) {
    afterEach({ path });
    await lecture("s1", "l1");
  }
  assert.deepEqual(api.take(), [], "within the course");
  assert.equal(visits.courseVisit.course("learner:session", "python"), opened, "the visit goes on");
  for (const path of ["/learn", "/courses/python/lessons/lesson-1"]) {
    visits.courseVisit.keep("learner:session", "python", opened);
    afterEach({ path });
    await lecture("s1", "l1");
    assert.deepEqual(api.take(), [LIST, ...rowsOf("t1")], `after a visit to ${path}`);
    assert.equal(visits.courseVisit.course("learner:session", "python"), null, `ended by ${path}`);
  }
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

/** The quiz page opened from the course page's list, as a learner clicks a quiz. */
async function quizPage(practice, api, quizzes, query, names = {}) {
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
      query: { quizzesFrom: "course", ...query },
    }),
    useRouter: () => ({ replace: () => {} }),
    useUser: () => Vue.ref({ id: "learner" }),
    getSubTaskInQuiz: async (task, id) => [
      await api.request(`/challenges/tasks/${task}/multiple_choice/${id}`),
      null,
    ],
    setTimeout: () => {},
    ...names,
  });
  const view = Vue.effectScope().run(() => page.setup({}, { emit() {} }));
  return { view, mounted: scope.onMounted() };
}

/** The quiz form with its real script, as the quiz page hands it the chosen quiz. */
async function quizForm(quizzes) {
  const form = await evaluate("components/form/QuizAnswer.vue", {
    require: (name) =>
      ({
        vue: Vue,
        "~/utils/apiError": { decodeApiError: () => ({}) },
        "~~/composables/quizzes": quizzes,
        "vue-i18n": { useI18n: () => ({ t: (key) => key }) },
        "@heroicons/vue/24/outline": {},
        "@heroicons/vue/24/solid": {},
        "../svg/FullHeart.vue": {},
      })[name],
    ...Vue,
    useUser: () => Vue.ref({ id: "learner" }),
    useSubTaskInQuiz: quizzes.useSubTaskInQuiz,
    getSubTaskInQuiz: quizzes.getSubTaskInQuiz,
    usePremiumInfo: () => Vue.ref({ premium: false }),
    useDailyLearning: () => ({ isDaily: Vue.ref(false) }),
    useDailyAttemptLimit: () => ({ attemptLimit: Vue.ref(null), handleLimit: () => false }),
    useHeartsEmpty: () => ({ heartsEmpty: Vue.ref(false), handleNoHearts: () => false }),
  });
  const props = Vue.reactive({ data: null, doubleColumnOptions: false, amountQuestionsLeft: 1 });
  const emitted = [];
  const view = Vue.effectScope().run(() =>
    form.setup(props, { emit: (...args) => emitted.push(args) })
  );
  return { props, view, emitted };
}

/** The matching page, rendered; the form and the cards are stand-ins that keep what they get. */
async function matchingPage(practice, api, quizzes, query) {
  const page = { form: null, cards: [] };
  const Page = await component(
    "pages/matchings/solve-[id].vue",
    {
      useRoute: () => ({
        path: "/matchings/solve-python",
        params: { id: "python" },
        query: { quizzesFrom: "course", ...query },
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
  for (const name of ["InputButtonToggle", "QuizCardSkeleton", "NuxtLink"])
    app.component(name, tag("div"));
  app.component("MatchingCard", (props) => {
    page.cards.push(props.data);
    return Vue.h("div");
  });
  app.component("FormSolveMatching", (props) => {
    page.form = props;
    return Vue.h("form");
  });
  app.mount(ui.root);
  await settle();
  page.unmount = () => app.unmount();
  return page;
}

test("per answer on the quiz page: no request for the course's exercises, and the course list shows it solved", async () => {
  const practice = await practiceModule();
  const api = server();
  const state = {};
  const quizzes = await quizzesModule(practice, api, state);
  const lecture = lectures(practice, api, practice.practiceCache);
  await lecture("s1", "l1");
  api.take();

  const first = await quizPage(practice, api, quizzes, { querySubTaskId: "q1", taskId: "t1" });
  await first.mounted;
  const view = first.view;
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

  await (
    await quizPage(practice, api, quizzes, { querySubTaskId: "q1", taskId: "t1" })
  ).mounted;
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

  const page = await matchingPage(practice, api, quizzes, { querySubTaskId: "m1", taskId: "t1" });
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

  page.form.onSolved("m1");
  await settle();
  assert.deepEqual(api.take(), [], "the answer itself reads nothing");
  const back = await lecture("s1", "l1");
  assert.deepEqual(api.take(), [], "back on the course page");
  assert.equal(back.find((item) => item.id === "m1").solved, true);
  page.unmount();
});

test("rated on the quiz page, back, opened again: rated stays true", async () => {
  const practice = await practiceModule();
  const data = structuredClone(course);
  const api = server(data);
  const quizzes = await quizzesModule(practice, api, {});
  const lecture = lectures(practice, api, practice.practiceCache);
  await lecture("s1", "l1");

  const first = await quizPage(practice, api, quizzes, { querySubTaskId: "q1", taskId: "t1" });
  await first.mounted;
  first.view.setSolvedLocally("q1");
  first.view.setRatedLocally("q1");
  Object.assign(data.rows.t1.multiple_choice[0], { solved: true, rated: true });
  await lecture("s1", "l1");
  api.take();

  // Back on the course page, then to another quiz; the rated one is chosen from the list.
  const second = await quizPage(practice, api, quizzes, { querySubTaskId: "q2", taskId: "t2" });
  await second.mounted;
  assert.deepEqual(api.take(), ["/challenges/tasks/t2/multiple_choice/q2"]);
  second.view.solveThis(second.view.arrayOfSubtasks.value.find((row) => row.id === "q1"));
  const shown = second.view.selectedQuiz.value;
  // components/input/QuizRating.vue offers rating and report while `!data.rated`.
  assert.deepEqual([shown.solved, shown.rated], [true, true]);
});

test("rated on the matching page, back, opened again: rated stays true", async () => {
  const practice = await practiceModule();
  const data = structuredClone(course);
  const api = server(data);
  const quizzes = await quizzesModule(practice, api, {});
  const lecture = lectures(practice, api, practice.practiceCache);
  await lecture("s1", "l1");

  const first = await matchingPage(practice, api, quizzes, { querySubTaskId: "m1", taskId: "t1" });
  first.form.onSolved("m1");
  first.form.onRated("m1");
  first.unmount();
  Object.assign(data.rows.t1.matchings[0], { solved: true, rated: true });
  await lecture("s1", "l1");
  api.take();

  // Opened again without a chosen matching: the card comes from the course's read.
  const second = await matchingPage(practice, api, quizzes, {});
  assert.deepEqual(api.take(), [], "nothing read again");
  const card = second.cards.findLast((row) => row.id === "m1");
  assert.deepEqual([card.solved, card.rated], [true, true]);
  second.unmount();
});

test("an answer that comes before the quiz page's list still reaches the course page", async () => {
  const practice = await practiceModule();
  const data = structuredClone(course);
  let release;
  const slow = new Promise((resolve) => (release = resolve));
  const api = server(data, { "/challenges/tasks/t2/multiple_choice": slow });
  const quizzes = await quizzesModule(practice, api, {});
  const lecture = lectures(practice, api, practice.practiceCache);
  await lecture("s1", "l1");
  const page = await quizPage(practice, api, quizzes, { querySubTaskId: "q1", taskId: "t1" });
  await settle();
  // The form already shows the chosen quiz; the page's list is still loading.
  assert.equal(page.view.loading.value, true);
  assert.equal(page.view.selectedQuiz.value.id, "q1");
  page.view.setSolvedLocally("q1");
  release();
  await page.mounted;
  assert.equal(page.view.arrayOfSubtasks.value.find((row) => row.id === "q1").solved, true);
  const back = await lecture("s1", "l1");
  assert.equal(back.find((item) => item.id === "q1").solved, true);
});

test("an answer that comes before the matching page's list still reaches the course page", async () => {
  const practice = await practiceModule();
  const data = structuredClone(course);
  let release;
  const slow = new Promise((resolve) => (release = resolve));
  const api = server(data, { "/challenges/tasks/t2/matchings": slow });
  const quizzes = await quizzesModule(practice, api, {});
  const lecture = lectures(practice, api, practice.practiceCache);
  await lecture("s1", "l1");
  const page = await matchingPage(practice, api, quizzes, { querySubTaskId: "m1", taskId: "t1" });
  // The form already shows the chosen matching; the page's list is still loading.
  assert.equal(page.form?.data?.id, "m1");
  assert.equal(page.cards.length, 0);
  page.form.onSolved("m1");
  data.rows.t1.matchings[0].solved = true;
  release();
  await settle();
  const back = await lecture("s1", "l1");
  assert.equal(back.find((item) => item.id === "m1").solved, true);
  page.unmount();
});

test("a mark made while the task's exercises are still being read is kept", async () => {
  const practice = await practiceModule();
  let release;
  const slow = new Promise((resolve) => (release = resolve));
  const api = server(structuredClone(course), { "/challenges/tasks/t1/multiple_choice": slow });
  const lecture = lectures(practice, api, practice.practiceCache);
  const reading = lecture("s1", "l1");
  await settle();
  practice.practiceCache.solved("learner:session", "multiple_choice", "t1", "q1");
  practice.practiceCache.rated("learner:session", "multiple_choice", "t1", "q1");
  release();
  await reading;
  const back = await lecture("s1", "l1");
  assert.equal(back.find((item) => item.id === "q1").solved, true);
  const rows = await practice.loadPracticeRows(
    api.request,
    { source: "course", id: "python", owner: "learner:session" },
    "multiple_choice",
    practice.practiceCache
  );
  assert.equal(rows.find((row) => row.id === "q1").rated, true);
});

test("a matching opened from a link shows solved and rated in its form once the server confirms", async () => {
  const practice = await practiceModule();
  const api = server();
  const quizzes = await quizzesModule(practice, api, {});
  await lectures(practice, api, practice.practiceCache)("s1", "l1");
  const page = await matchingPage(practice, api, quizzes, { querySubTaskId: "m1", taskId: "t1" });
  const shown = page.form.data;
  const row = page.cards.findLast((card) => card.id === "m1");
  assert.notEqual(Vue.toRaw(shown), Vue.toRaw(row), "the form shows its own read, not a list row");
  // components/form/SolveMatching.vue offers the answer while `!data.solved` and
  // components/input/QuizRating.vue the rating while `!data.rated`.
  page.form.onSolved("other");
  page.form.onRated("other");
  assert.deepEqual(
    [shown.solved, !!shown.rated],
    [false, false],
    "another matching changes nothing"
  );
  page.form.onSolved("m1");
  assert.deepEqual([shown.solved, row.solved], [true, true]);
  page.form.onRated("m1");
  assert.deepEqual([shown.rated, row.rated], [true, true]);
  page.unmount();
});

test("a quiz opened from a link is read once for the page and its form; one chosen from the list is read by the form", async () => {
  const practice = await practiceModule();
  const api = server();
  const quizzes = await quizzesModule(practice, api, {});
  await lectures(practice, api, practice.practiceCache)("s1", "l1");
  api.take();
  const page = await quizPage(
    practice,
    api,
    quizzes,
    { querySubTaskId: "q1", taskId: "t1" },
    { getSubTaskInQuiz: quizzes.getSubTaskInQuiz }
  );
  await page.mounted;
  assert.equal(api.take()[0], "/challenges/tasks/t1/multiple_choice/q1");
  // The page hands the form `selectedQuiz ?? quizzesToShow[0]`, first nothing, then its read.
  const form = await quizForm(quizzes);
  await settle();
  form.props.data = page.view.selectedQuiz.value;
  await settle();
  assert.deepEqual(api.take(), [], "the form does not read the same quiz again");
  assert.equal(form.view.loading.value, false);
  assert.deepEqual(
    [form.view.subtask.value.id, form.view.subtask.value.question],
    ["q1", "First?"]
  );
  assert.deepEqual(form.view.arrayOfAnswers.value, [false, false]);
  assert.notEqual(
    Vue.toRaw(form.view.subtask.value),
    Vue.toRaw(page.view.selectedQuiz.value),
    "the form keeps its own copy, as after its own read"
  );
  assert.deepEqual(form.emitted, [["updateQuestion", form.view.subtask.value]]);

  form.props.data = page.view.arrayOfSubtasks.value.find((row) => row.id === "q2");
  await settle();
  assert.deepEqual(api.take(), ["/challenges/tasks/t2/multiple_choice/q2"], "chosen from the list");
  assert.equal(form.view.subtask.value.id, "q2");
});

test("a confirmed answer marks exactly the answered row", async () => {
  const practice = await practiceModule();
  const data = structuredClone(course);
  data.rows.t1.multiple_choice.push({ id: "q1b", task_id: "t1", question: "First b?" });
  const api = server(data);
  const lecture = lectures(practice, api, practice.practiceCache);
  await lecture("s1", "l1");
  practice.practiceCache.solved("learner:session", "multiple_choice", "t1", "q1");
  practice.practiceCache.rated("learner:session", "multiple_choice", "t1", "q1");
  const back = await lecture("s1", "l1");
  assert.deepEqual(
    back.filter((item) => item.kind === "multiple_choice").map((item) => [item.id, item.solved]),
    [
      ["q1b", false],
      ["q1", true],
    ]
  );
  const rows = await practice.loadPracticeRows(
    api.request,
    { source: "course", id: "python", owner: "learner:session" },
    "multiple_choice",
    practice.practiceCache
  );
  assert.deepEqual(
    rows.filter((row) => row.task_id === "t1").map((row) => [row.id, !!row.rated]),
    [
      ["q1", true],
      ["q1b", false],
    ]
  );
});

test("changes reported for another account or session touch nothing", async () => {
  const practice = await practiceModule();
  const api = server();
  const cache = practice.createPracticeCache();
  const lecture = lectures(practice, api, cache);
  await lecture("s1", "l1");
  await lecture("s1", "l2");
  api.take();
  for (const other of ["other:session", "learner:renewed", ":"]) {
    cache.solved(other, "multiple_choice", "t1", "q1");
    cache.rated(other, "multiple_choice", "t1", "q1");
    cache.refresh(other, "coding_challenges", "t2");
  }
  assert.equal((await lecture("s1", "l1")).find((item) => item.id === "q1").solved, false);
  await lecture("s1", "l2");
  assert.deepEqual(api.take(), [], "no task marked for reading again");
  const rows = await practice.loadPracticeRows(
    api.request,
    { source: "course", id: "python", owner: "learner:session" },
    "multiple_choice",
    cache
  );
  assert.equal(rows.find((row) => row.id === "q1").rated === true, false);
});

test("an account change in the same tab reads anew and shows nothing of the first account", async () => {
  const practice = await practiceModule();
  const data = structuredClone(course);
  data.rows.t1.multiple_choice[0].solved = true; // solved for account A
  const api = server(data);
  const user = Vue.ref({ id: "learner-a" });
  const session = Vue.ref({ id: "session-a" });
  const ui = host();
  const Practice = await component(
    "components/course/Practice.vue",
    {
      useCourseExperienceCopy: () => ({ copy: Vue.ref({ loading: "Loading" }) }),
      useRoute: () => ({ path: "/courses/python/watch" }),
      useUser: () => user,
      useSession: () => session,
      GET: api.request,
    },
    { "~/utils/coursePractice": practice }
  );
  const app = ui.renderer.createApp({
    render: () =>
      Vue.h(Practice, { source: "course", sourceId: "python", section: "s1", lecture: "l1" }),
  });
  app.component("NuxtLink", tag("a"));
  app.mount(ui.root);
  await settle();
  assert.match(ui.text(), /✓\s+First\?/);
  api.take();
  data.rows.t1.multiple_choice[0].solved = false; // account B has not solved q1
  user.value = { id: "learner-b" };
  session.value = { id: "session-b" };
  await settle();
  // Account and session change one after the other; each change reads for its owner.
  const sent = api.take();
  assert.ok(sent.includes(LIST), "task list read again");
  assert.deepEqual(sent.slice(-3), rowsOf("t1"));
  assert.doesNotMatch(ui.text(), /✓\s+First\?/, "no tick of account A");
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

  practice.practiceCache.solved("learner:session", "multiple_choice", "t1", "q1");
  lecture.value = "l2";
  await settle();
  lecture.value = "l1";
  await settle();
  assert.deepEqual(api.take(), []);
  assert.match(ui.text(), /✓\s+First\?/, "the answered quiz carries its tick");
  app.unmount();
});

test("under a lesson of a course the lecture list reads anew on every visit, as before", async () => {
  const practice = await practiceModule();
  const api = server();
  const ui = host();
  const lecture = Vue.ref("l1");
  const Practice = await lectureList(practice, api, "/courses/python/lessons/lesson-1");
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

/** One function of a `<script setup>` component, with its names bound to `bindings`. */
async function setupFunction(path, name, bindings) {
  const source = parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8")).descriptor
    .scriptSetup.content;
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const node = tree.statements.find(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name
  );
  const code = ts.transpileModule(node.getText(tree), {
    compilerOptions: { target: ts.ScriptTarget.ES2023 },
  }).outputText;
  return new Function(...Object.keys(bindings), `${code}\nreturn ${name};`)(
    ...Object.values(bindings)
  );
}

test("the matching form does not send a matching the server already counts as solved", async () => {
  const sent = [];
  const emitted = [];
  let current;
  const submit = await setupFunction("components/form/SolveMatching.vue", "onclickSubmitForm", {
    props: { data: { id: "m1", task_id: "t1", solved: false, creator: "author", left: ["a"] } },
    user: Vue.ref({ id: "learner" }),
    formSubmitting: Vue.ref(false),
    setSolution: () => [0],
    getMatching: async (id, task) => {
      sent.push(`GET ${task}/${id}`);
      return current();
    },
    solveMatching: async (task, id) => {
      sent.push(`POST ${task}/${id}`);
      return [true, null];
    },
    getHearts: async () => {},
    successHandler: () => {},
    errorHandler: () => {},
    emits: (...args) => emitted.push(args),
    console: { log: () => {} },
  });
  // Solved in another tab or on another device while this list was kept: no attempt, no heart.
  current = () => [{ id: "m1", task_id: "t1", solved: true }, null];
  await submit();
  assert.deepEqual(sent.splice(0), ["GET t1/m1"]);
  assert.deepEqual(
    emitted.splice(0),
    [["solved", "m1"]],
    "the page and the course list learn of it"
  );
  // Still open: the answer goes out as before.
  current = () => [{ id: "m1", task_id: "t1", solved: false }, null];
  await submit();
  assert.deepEqual(sent.splice(0), ["GET t1/m1", "POST t1/m1"]);
  // The check cannot be read: the answer goes out as it did before the check existed.
  current = () => [null, new Error("Unavailable")];
  await submit();
  assert.deepEqual(sent.splice(0), ["GET t1/m1", "POST t1/m1"]);
  assert.deepEqual(emitted, []);
});
