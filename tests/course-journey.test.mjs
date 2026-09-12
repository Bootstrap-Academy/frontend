import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "typescript";

async function moduleAt(file) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}
const journey = await moduleAt("utils/courseJourney.ts");
const practice = await moduleAt("utils/coursePractice.ts");
const course = {
  sections: [
    {
      id: "first",
      title: "Foundations",
      lectures: [
        { id: "intro", title: "Intro", completed: true, duration: 60 },
        { id: "variables", title: "Variables", completed: false, duration: 120 },
      ],
    },
    {
      id: "second",
      title: "Application",
      lectures: [{ id: "solution", title: "Solution", completed: false }],
    },
  ],
};

test("course continuation chooses the first unfinished step across section boundaries", () => {
  assert.equal(journey.courseResumeStep(course).id, "variables");
  const progressed = structuredClone(course);
  progressed.sections[0].lectures[1].completed = true;
  assert.equal(journey.courseResumeStep(progressed).sectionID, "second");
  assert.deepEqual(journey.courseProgress(progressed), { total: 3, completed: 2, percent: 67 });
  progressed.sections[1].lectures[0].completed = true;
  assert.equal(journey.courseResumeStep(progressed).id, "intro");
});

test("a video-free course is neither empty fake video nor completed historical lectures", () => {
  assert.equal(journey.courseResumeStep({ sections: [] }), null);
  assert.deepEqual(journey.courseProgress({ sections: [] }), {
    total: 0,
    completed: 0,
    percent: 0,
  });
  assert.equal(journey.lectureHasVideo(undefined), false);
  assert.equal(journey.lectureHasVideo({ type: "youtube", video_id: "" }), false);
  assert.equal(journey.lectureHasVideo({ type: "youtube", video_id: "video" }), true);
  assert.equal(journey.lectureHasVideo({ type: "mp4" }), true);
  assert.equal(journey.lectureHasVideo({ type: "exercise" }), false);
  assert.deepEqual(
    journey.courseSteps({
      sections: [{ title: "Summary only", lectures: [{ title: "Unaddressable" }] }],
    }),
    []
  );
});

test("learning navigation preserves exact server IDs and omits absent legacy query placeholders", () => {
  const route = journey.courseWatchLocation(
    "C++ / basics",
    { sectionID: "s&2", id: "lesson?1" },
    { skillID: "programming" }
  );
  assert.equal(route.path, "/courses/C%2B%2B%20%2F%20basics/watch");
  assert.deepEqual(route.query, { section: "s&2", lecture: "lesson?1", skillID: "programming" });
  assert(!JSON.stringify(route).includes("undefined"));
});

test("legacy exercises stay available through one list, scoped to the selected lecture", async () => {
  const calls = [];
  const rows = await practice.loadCoursePractice(
    async (url) => {
      calls.push(url);
      if (url.endsWith("/tasks"))
        return [
          { id: "task-a", section_id: "s1", lecture_id: "l1" },
          { id: "task-b", section_id: "s1", lecture_id: "l2" },
        ];
      if (url.endsWith("/multiple_choice"))
        return [
          { id: "mcq", question: "What changes?", enabled: true, solved: true },
          { id: "retired", retired: true },
        ];
      if (url.endsWith("/matchings"))
        return [{ id: "match", left: ["Concept", "Example"], enabled: true }];
      if (url.endsWith("/coding_challenges"))
        return [
          { id: "code", title: "Write a loop", enabled: true },
          { id: "draft", enabled: false },
        ];
      throw new Error("unexpected request");
    },
    { source: "course", id: "python", section: "s1", lecture: "l1" }
  );
  assert.equal(rows.length, 3);
  assert.equal(rows.at(-1).id, "mcq");
  assert(rows.every((row) => row.task_id === "task-a"));
  assert(!calls.some((path) => path.includes("task-b")));
  const link = practice.practiceLocation(
    rows.find((row) => row.id === "match"),
    "course",
    "python",
    { skillID: "programming", subSkillID: "python" }
  );
  assert.equal(link.path, "/matchings/solve-python");
  assert.deepEqual(link.query, {
    quizzesFrom: "course",
    querySubTaskId: "match",
    taskId: "task-a",
    rootSkillID: "programming",
    subSkillID: "python",
  });
});

test("failed exercise loads do not masquerade as a topic with no exercises", async () => {
  await assert.rejects(
    practice.loadCoursePractice(
      async (path) => {
        if (path.endsWith("/tasks")) return [{ id: "task-a" }];
        throw new Error("Unavailable");
      },
      { source: "skill", id: "python" }
    ),
    /Unavailable/
  );
});

test("leaving the course prevents subsequent old-context exercise requests", async () => {
  let current = true;
  const calls = [];
  await practice.loadCoursePractice(
    async (path) => {
      calls.push(path);
      current = false;
      return [{ id: "task-a" }];
    },
    { source: "course", id: "python" },
    () => current
  );
  assert.equal(calls.length, 1);
});

for (const file of [
  "pages/courses/[id]/index.vue",
  "pages/courses/[id]/watch.vue",
  "pages/skill-tree/[id]/[skill].vue",
  "components/course/Curriculum.vue",
  "components/course/Overview.vue",
  "components/course/Practice.vue",
  "components/course/Video.vue",
]) {
  test(`${file}: Vue compiles the complete script and template`, async () => {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    const parsed = parse(source, { filename: file });
    assert.deepEqual(parsed.errors, []);
    assert.doesNotThrow(() => compileScript(parsed.descriptor, { id: file, inlineTemplate: true }));
  });
}

async function pageFixture(file, request) {
  const Vue = await import("vue");
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const script = parse(source).descriptor.scriptSetup.content;
  const ast = ts.createSourceFile("page.ts", script, ts.ScriptTarget.Latest, true);
  const stripped = ast.statements
    .filter((node) => !ts.isImportDeclaration(node))
    .map((node) => node.getText(ast))
    .join("\n");
  const user = Vue.ref({ id: "user-a" });
  const session = Vue.ref({ id: "session-a" });
  const route = Vue.reactive({ params: { id: "python" }, query: {} });
  const navigation = [];
  const bindings = {
    ...journey,
    ref: Vue.ref,
    computed: Vue.computed,
    useUser: () => user,
    useSession: () => session,
    useRoute: () => route,
    useRouter: () => ({
      push: async (next) => navigation.push(next),
      replace: async (next) => {
        navigation.push(next);
        route.query = next.query;
      },
    }),
    useCourseExperienceCopy: () => ({
      copy: Vue.ref({}),
      localized: (value) => value?.en,
      localizeCourse: (value) => value,
    }),
    useHead: () => {},
    definePageMeta: () => {},
    watch: () => {},
    onMounted: () => {},
    onBeforeUnmount: () => {},
    onBeforeRouteLeave: () => {},
    GET: (path) => request(path, "GET"),
    POST: (path) => request(path, "POST"),
    PUT: (path) => request(path, "PUT"),
  };
  const compiled = ts.transpileModule(stripped, {
    compilerOptions: { target: ts.ScriptTarget.ES2023 },
  }).outputText;
  const exports = file.endsWith("watch.vue")
    ? "{ load, course, error, saving, saveError, finishLecture, active }"
    : "{ load, course, error, accessible, learningPlan }";
  return {
    ...new Function(...Object.keys(bindings), `${compiled}\nreturn ${exports}`)(
      ...Object.values(bindings)
    ),
    user,
    session,
    route,
    navigation,
  };
}

test("course page keeps the purchase preview after an explicit access refusal", async () => {
  const calls = [];
  const f = await pageFixture("pages/courses/[id]/index.vue", async (path) => {
    calls.push(path);
    if (path.endsWith("/summary")) return { id: "python", title: "Python", sections: [] };
    throw { statusCode: 403 };
  });
  await f.load();
  assert.equal(f.course.value.title, "Python");
  assert.equal(f.accessible.value, false);
  assert.equal(f.error.value, false);
  assert.equal(calls.length, 2);
});

test("a transport outage never turns an owned course into a purchase prompt", async () => {
  const calls = [];
  const f = await pageFixture("pages/courses/[id]/index.vue", async (path) => {
    calls.push(path);
    throw { statusCode: 503 };
  });
  await f.load();
  assert.equal(f.course.value, null);
  assert.equal(f.error.value, true);
  assert.equal(calls.length, 1);
});

test("a delayed course response cannot reveal the preceding account's progress", async () => {
  let resolve;
  const f = await pageFixture(
    "pages/courses/[id]/index.vue",
    async () =>
      new Promise((yes) => {
        resolve = yes;
      })
  );
  const loading = f.load();
  f.user.value = { id: "user-b" };
  resolve({ id: "python", ...course });
  await loading;
  assert.equal(f.course.value, null);
  assert.equal(f.accessible.value, false);
});

test("legacy player resumes and only records completion after an explicit action", async () => {
  const calls = [];
  const f = await pageFixture("pages/courses/[id]/watch.vue", async (path, method) => {
    calls.push({ path, method });
    return method === "GET" ? { id: "python", ...structuredClone(course) } : true;
  });
  await f.load();
  assert.equal(f.active.value.id, "variables");
  assert.equal(calls.filter((call) => call.method === "PUT").length, 0);
  await f.finishLecture();
  assert.equal(calls.filter((call) => call.method === "PUT").length, 1);
  assert.equal(f.active.value.id, "solution");
  assert.equal(f.course.value.sections[0].lectures[1].completed, true);
});

test("lost completion response is reconciled by a read, without a second award request", async () => {
  const snapshot = { id: "python", ...structuredClone(course) };
  let writes = 0;
  const f = await pageFixture("pages/courses/[id]/watch.vue", async (path, method) => {
    if (method === "GET") return structuredClone(snapshot);
    if (method === "PUT") {
      writes++;
      snapshot.sections[0].lectures[1].completed = true;
      throw new Error("Response lost");
    }
    return true;
  });
  await f.load();
  await f.finishLecture();
  assert.equal(writes, 1);
  assert.equal(f.saveError.value, false);
  assert.equal(f.course.value.sections[0].lectures[1].completed, true);
});

test("unattached historical course exercises stay accessible without duplicating lecture exercises", async () => {
  const requests = [];
  const rows = await practice.loadCoursePractice(
    async (path) => {
      requests.push(path);
      if (path.endsWith("/tasks"))
        return [
          { id: "attached", section_id: "s1", lecture_id: "l1" },
          { id: "standalone", section_id: null, lecture_id: null },
        ];
      return path.endsWith("/multiple_choice")
        ? [{ id: "question", question: "Apply what you learned", enabled: true }]
        : [];
    },
    { source: "course", id: "python", excludeLectureIds: ["l1"] }
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].task_id, "standalone");
  assert(!requests.some((path) => path.includes("/tasks/attached/")));
});

test("MP4 resume survives startup events and signed URL renewal without changing playback choice", async () => {
  const Vue = await import("vue");
  const source = await readFile(new URL("../components/course/Video.vue", import.meta.url), "utf8");
  const ast = ts.createSourceFile(
    "video.ts",
    parse(source).descriptor.scriptSetup.content,
    ts.ScriptTarget.Latest,
    true
  );
  const script = ast.statements
    .filter((node) => !ts.isImportDeclaration(node))
    .map((node) => node.getText(ast))
    .join("\n");
  const cookies = { currentVideo: Vue.ref("intro"), currentVideoTime: Vue.ref(42) };
  const props = {
    course: { id: "python" },
    activeLecture: { id: "intro", type: "mp4" },
  };
  let nextSource = () => Promise.resolve("https://example.invalid/own-video.mp4");
  let unmount;
  const bindings = {
    ref: Vue.ref,
    computed: Vue.computed,
    defineProps: () => props,
    useI18n: () => ({ t: (key) => key }),
    useCourseExperienceCopy: () => ({ copy: Vue.ref({}) }),
    useUser: () => Vue.ref({ id: "learner" }),
    useSession: () => Vue.ref({ id: "session" }),
    useAppCookie: (name) => cookies[name],
    watch: () => {},
    onMounted: () => {},
    onBeforeUnmount: (callback) => {
      unmount = callback;
    },
    GET: () => nextSource(),
  };
  const code = ts.transpileModule(script, {
    compilerOptions: { target: ts.ScriptTarget.ES2023 },
  }).outputText;
  const player = new Function(
    ...Object.keys(bindings),
    `${code}\nreturn { load, video, rememberPosition, restorePosition }`
  )(...Object.values(bindings));
  await player.load();
  let plays = 0;
  player.video.value = {
    currentTime: 0,
    duration: 120,
    paused: true,
    play: async () => {
      plays++;
    },
  };
  const event = { target: player.video.value };
  player.rememberPosition(event);
  assert.equal(cookies.currentVideoTime.value, 42);
  player.restorePosition(event);
  assert.equal(player.video.value.currentTime, 42);
  player.video.value.currentTime = 50;
  player.rememberPosition(event);
  assert.equal(cookies.currentVideoTime.value, 50);
  assert.equal(plays, 0, "Reload restores position without autoplay");

  // A changing URL resets the existing media element. Use its position at
  // response arrival, even if it was paused/seeking while the request ran.
  let resolveRefresh;
  nextSource = () =>
    new Promise((resolve) => {
      resolveRefresh = resolve;
    });
  const refreshing = player.load(true);
  player.video.value.currentTime = 57;
  player.video.value.paused = false;
  resolveRefresh("https://example.invalid/renewed-video.mp4");
  await refreshing;
  player.video.value.currentTime = 0;
  player.video.value.paused = true;
  player.rememberPosition(event);
  assert.equal(cookies.currentVideoTime.value, 50, "Source reset cannot erase saved progress");
  player.restorePosition(event);
  assert.equal(player.video.value.currentTime, 57);
  assert.equal(plays, 1, "Renewal resumes a previously playing video");
  player.rememberPosition(event);
  assert.equal(cookies.currentVideoTime.value, 57);

  nextSource = async () => "https://example.invalid/renewed-again.mp4";
  await player.load(true);
  player.video.value.currentTime = 0;
  player.restorePosition(event);
  assert.equal(player.video.value.currentTime, 57);
  assert.equal(plays, 1, "Renewal respects a paused video");

  // An unchanged URL has no new metadata event and must not leave recording blocked.
  await player.load(true);
  player.video.value.currentTime = 60;
  player.rememberPosition(event);
  assert.equal(cookies.currentVideoTime.value, 60);
  nextSource = async () => {
    throw new Error("Renewal unavailable");
  };
  await player.load(true);
  player.video.value.currentTime = 61;
  player.rememberPosition(event);
  assert.equal(
    cookies.currentVideoTime.value,
    61,
    "Failed renewal keeps the current source usable"
  );

  nextSource = async () => "https://example.invalid/next-video.mp4";
  props.activeLecture = { id: "next", type: "mp4" };
  await player.load();
  const oldEvent = event;
  player.video.value = { currentTime: 0, duration: 120 };
  player.rememberPosition(oldEvent);
  assert.equal(cookies.currentVideo.value, "intro");
  player.restorePosition({ target: player.video.value });
  assert.equal(player.video.value.currentTime, 0);
  unmount();
  player.rememberPosition({ target: player.video.value });
  assert.equal(
    cookies.currentVideo.value,
    "intro",
    "Unmount events cannot overwrite the saved lecture"
  );
});
