import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { renderToString } from "@vue/server-renderer";
import { createI18n } from "vue-i18n";
import ts from "typescript";

const url = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const compile = (code) =>
  ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
const journeyUrl = url(
  compile(await readFile(new URL("../utils/courseJourney.ts", import.meta.url), "utf8"))
);
const adapterSource = await readFile(
  new URL("../utils/learningActivityAdapters.ts", import.meta.url),
  "utf8"
);
const adapterUrl = url(
  compile(adapterSource).replaceAll('"./courseJourney"', JSON.stringify(journeyUrl))
);
const adapters = await import(adapterUrl);
const { learningModuleIdentity } = await import(
  url(compile(await readFile(new URL("../utils/learningModule.ts", import.meta.url), "utf8")))
);
const room = (id = "old-unit", kind = "loop-explorer") => ({
  unit: {
    id,
    path_id: "old-path",
    title: { de: "Alt", en: "Old" },
    room: kind,
    content: { de: { body: "Hallo" }, en: { body: "Hello" } },
    teaches: [],
    practices: [],
    requires: [],
  },
  progress: {
    revision: 12,
    review_id: "review-a",
    state: { code: "preserve", submission_id: "existing" },
    status: "in_progress",
    result: null,
  },
});

test("the room adapter preserves one native identity, draft and proof without an extra completion", () => {
  const original = room();
  const lesson = adapters.roomLesson(original, "course-a");
  assert.equal(lesson.activities.length, 1);
  assert.equal(lesson.id, original.unit.id);
  assert.deepEqual(lesson.activities[0].source, { kind: "room", unit_id: original.unit.id });
  assert.equal(lesson.activities[0].progress, original.progress);
  assert.equal(lesson.activities[0].content, original.unit.content);
  assert.equal(lesson.completed, false);
  assert.deepEqual(adapters.activityContent(lesson.activities[0], "de-DE"), { body: "Hallo" });
  assert.equal(
    adapters.roomLesson(room("itf-project-recover", "file-workspace")).activities[0].presentation
      .allow_skip,
    false
  );
  const declared = room("itf-project-recover", "file-workspace");
  declared.unit.skip_allowed = true;
  assert.equal(adapters.roomLesson(declared).activities[0].presentation.allow_skip, true);
});

test("legacy lesson keeps its optional video separate from native practice and completion", () => {
  const course = { id: "old-course", sections: [] };
  const section = { id: "section-a" };
  const lecture = { id: "lecture-a", title: "Video", type: "mp4", completed: true };
  const lesson = adapters.legacyLectureLesson(course, lecture, section);
  assert.equal(lesson.activities.length, 1);
  assert.equal(lesson.activities[0].source.lecture_id, lecture.id);
  assert.deepEqual(lesson.legacy_practice, {
    course_id: "old-course",
    section_id: "section-a",
    lecture_id: "lecture-a",
  });
  assert.equal(lesson.completed, true);
  assert.equal(
    adapters.legacyLectureLesson(course, { ...lecture, type: "text" }, section).activities.length,
    0
  );
});

test("the actual registry imports only the requested renderer and rejects unknown names", async () => {
  const key = `academy-registry-${Math.random()}`;
  globalThis[key] = [];
  let source = compile(
    await readFile(new URL("../components/learning/activityRegistry.ts", import.meta.url), "utf8")
  );
  source = source.replace(
    /import\("([^"]+\.vue)"\)/g,
    (_, file) =>
      `import(${JSON.stringify(url(`globalThis[${JSON.stringify(key)}].push(${JSON.stringify(file)}); export default {name:${JSON.stringify(file)}};`))})`
  );
  const registry = await import(url(source));
  assert.deepEqual(globalThis[key], []);
  await registry.loadActivityRenderer("guided-lesson");
  assert.deepEqual(globalThis[key], ["./GuidedLesson.vue"]);
  await registry.loadActivityRenderer("guided-lesson");
  assert.deepEqual(globalThis[key], ["./GuidedLesson.vue"]);
  await assert.rejects(registry.loadActivityRenderer("constructor"));
  await registry.loadActivityRenderer("custom");
  assert.deepEqual(globalThis[key], ["./GuidedLesson.vue", "./CustomActivity.vue"]);
  delete globalThis[key];
});

for (const file of [
  "components/learning/ActivityHost.vue",
  "components/learning/LessonPlayer.vue",
  "components/learning/LessonActivity.vue",
  "components/learning/VideoActivity.vue",
  "components/course/CurriculumLessons.vue",
  "pages/courses/[id]/lessons/[lesson].vue",
])
  test(`${file} compiles its actual script and template`, async () => {
    const { descriptor, errors } = parse(
      await readFile(new URL(`../${file}`, import.meta.url), "utf8"),
      { filename: file }
    );
    assert.deepEqual(errors, []);
    assert.doesNotThrow(() => compileScript(descriptor, { id: file, inlineTemplate: true }));
  });

test("shared activity, room and module contracts pass strict TypeScript checking", () => {
  const paths = [
    "types/learningActivities.ts",
    "types/learningRooms.ts",
    "types/learningModule.ts",
    "utils/learningActivityAdapters.ts",
  ].map((file) => new URL(`../${file}`, import.meta.url).pathname);
  const program = ts.createProgram(paths, {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: [],
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(
    diagnostics.map(
      (d) => `${d.file?.fileName || ""}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`
    ),
    []
  );
});

function evaluateScript(source, bindings, exports) {
  bindings = { learningModuleIdentity, ...bindings };
  const script = parse(source).descriptor.scriptSetup.content;
  const ast = ts.createSourceFile("component.ts", script, ts.ScriptTarget.Latest, true);
  const body = ast.statements
    .filter((node) => !ts.isImportDeclaration(node))
    .map((node) => node.getText(ast))
    .join("\n");
  return new Function(...Object.keys(bindings), `${compile(body)}\nreturn {${exports}};`)(
    ...Object.values(bindings)
  );
}
const tick = async () => {
  await new Promise(setImmediate);
  await Vue.nextTick();
};

test("saving a room projection keeps the active renderer and its submission preparation alive", async () => {
  const source = await readFile(
    new URL("../components/learning/ActivityHost.vue", import.meta.url),
    "utf8"
  );
  const original = room("assessment", "exercise");
  original.unit.exercise = { type: "multiple_choice", task_id: "task", subtask_id: "question" };
  const props = Vue.reactive({
    activity: adapters.roomActivity(original),
    state: {},
    locale: "de",
    disabled: false,
    userId: "owner-a",
    reviewId: "review-a",
  });
  const scope = Vue.effectScope();
  const loads = [];
  let cancellations = 0;
  try {
    const fixture = scope.run(() =>
      evaluateScript(
        source,
        {
          ...Vue,
          ...adapters,
          defineProps: () => props,
          defineEmits: () => () => {},
          defineExpose: () => {},
          onErrorCaptured: () => {},
          onBeforeUnmount: () => {},
          loadActivityRenderer: async (name) => {
            loads.push(name);
            return { name };
          },
        },
        "renderer,instance,generation,listeners"
      )
    );
    await tick();
    const selectedRenderer = fixture.renderer.value;
    const selectedListeners = fixture.listeners.value;
    fixture.instance.value = { cancelPreparation: () => cancellations++ };
    // The pre-submit checkpoint replaces the server envelope and therefore the
    // activity object; the renderer must survive until its Challenge POST.
    props.activity = adapters.roomActivity(structuredClone(original));
    props.state = { answers: [true], submission_unknown: true };
    props.locale = "en";
    await tick();
    assert.deepEqual(loads, ["exercise"]);
    assert.equal(cancellations, 0);
    assert.equal(fixture.renderer.value, selectedRenderer);
    assert.equal(fixture.listeners.value, selectedListeners);
    assert.equal(fixture.generation.value, 1);
    props.reviewId = "review-b";
    await tick();
    assert.equal(loads.length, 2);
    assert.equal(cancellations, 1);
    props.userId = "owner-b";
    await tick();
    assert.equal(loads.length, 3);
    assert.equal(cancellations, 2);
  } finally {
    scope.stop();
  }
});

test("the actual activity host retains private code across grant rotation but remounts changed artifacts", async () => {
  const source = await readFile(
    new URL("../components/learning/ActivityHost.vue", import.meta.url),
    "utf8"
  );
  const original = room("custom-unit", "custom");
  original.unit.module = {
    id: "custom-module",
    api_version: 1,
    entry_url: `https://api.example/skills/lesson-assets/${"a".repeat(43)}/${"1".repeat(64)}/index.js`,
  };
  const props = Vue.reactive({
    activity: adapters.roomActivity(original),
    state: { own: "saved" },
    locale: "de",
    disabled: false,
    userId: "owner-a",
  });
  const scope = Vue.effectScope();
  const loads = [],
    changes = [];
  let cancelled = 0;
  try {
    const component = scope.run(() =>
      evaluateScript(
        source,
        {
          ...Vue,
          ...adapters,
          defineProps: () => props,
          defineEmits: () => (name, value) => {
            if (name === "change") changes.push(value);
          },
          defineExpose: () => {},
          onErrorCaptured: () => {},
          onBeforeUnmount: () => {},
          loadActivityRenderer: async (name) => {
            loads.push(name);
            return { name };
          },
        },
        "renderer,instance,generation,listeners"
      )
    );
    await tick();
    const previous = component.listeners.value;
    component.instance.value = { cancelPreparation: () => cancelled++ };
    props.activity = {
      ...props.activity,
      module: {
        ...props.activity.module,
        entry_url: original.unit.module.entry_url.replace("a".repeat(43), "b".repeat(43)),
      },
    };
    props.state = { own: "checkpoint" };
    await tick();
    assert.equal(component.listeners.value, previous);
    assert.equal(component.generation.value, 1);
    assert.equal(cancelled, 0);
    assert.deepEqual(loads, ["custom"]);
    previous.change({ own: "still current" });
    assert.equal(changes.length, 1);
    props.activity = {
      ...props.activity,
      module: {
        ...props.activity.module,
        entry_url: props.activity.module.entry_url.replace("1".repeat(64), "2".repeat(64)),
      },
    };
    await tick();
    assert.equal(component.generation.value, 2);
    assert.equal(cancelled, 1);
    previous.change({ foreign: "old code" });
    assert.equal(changes.length, 1);
    props.userId = "owner-b";
    await tick();
    assert.equal(component.generation.value, 3);
    props.reviewId = "another-review";
    await tick();
    assert.equal(component.generation.value, 4);
  } finally {
    scope.stop();
  }
});

test("the host rejects late module loads and old events while preserving accepted submission checkpoints", async () => {
  const source = await readFile(
    new URL("../components/learning/ActivityHost.vue", import.meta.url),
    "utf8"
  );
  const scope = Vue.effectScope();
  const activity = adapters.roomActivity(room());
  const props = Vue.reactive({ activity, state: {}, locale: "de", disabled: false });
  const loads = [];
  const events = [];
  const cleanups = [];
  const fixture = scope.run(() =>
    evaluateScript(
      source,
      {
        ...Vue,
        ...adapters,
        defineProps: () => props,
        defineEmits: () => (name, value) => events.push({ name, value }),
        defineExpose: () => {},
        onErrorCaptured: () => {},
        onBeforeUnmount: (callback) => cleanups.push(callback),
        loadActivityRenderer: (name) => new Promise((resolve) => loads.push({ name, resolve })),
      },
      "renderer,listeners,error"
    )
  );
  const oldListeners = fixture.listeners.value;
  props.activity = {
    ...adapters.roomActivity(room("new-unit", "custom")),
    kind: "custom",
    module: { id: "new-module", api_version: 1, entry_url: "https://lessons.example/new.js" },
    exercise: { type: "coding", task_id: "task-a", subtask_id: "code-a" },
  };
  assert.deepEqual(
    loads.map((load) => load.name),
    ["loop-explorer", "custom"]
  );
  const selectedRenderer = { name: "Selected" };
  loads[1].resolve(selectedRenderer);
  await tick();
  loads[0].resolve({ name: "Stale" });
  await tick();
  assert.equal(fixture.renderer.value, selectedRenderer);
  oldListeners.change({ stolen: "old activity" });
  oldListeners.complete({ answer: "old activity" });
  assert.equal(events.filter((event) => ["change", "complete"].includes(event.name)).length, 0);
  fixture.listeners.value.posting(true);
  fixture.listeners.value.change({ submission_id: "confirmed-by-server" });
  fixture.listeners.value.complete({ untrusted: "client answer" }, "verified-attempt-id");
  assert.deepEqual(events.find((event) => event.name === "change").value, {
    submission_id: "confirmed-by-server",
  });
  assert.deepEqual(events.find((event) => event.name === "complete").value, {
    attempt_id: "verified-attempt-id",
  });
  cleanups.forEach((callback) => callback());
  const before = events.length;
  fixture.listeners.value.change({ late: true });
  assert.equal(events.length, before);
  scope.stop();
});

async function activityFixture(
  activity,
  { request = async () => true, roomView, roomData = {}, stored = null } = {}
) {
  const scope = Vue.effectScope();
  const events = [];
  const writes = [];
  const owner = Vue.ref("user-a:session-a");
  const user = Vue.ref({ id: "user-a" });
  const callbacks = [];
  const storage = {
    getItem: () => stored,
    setItem: (key, value) => {
      writes.push({ key, value });
      stored = value;
    },
  };
  const source = await readFile(
    new URL("../components/learning/LessonActivity.vue", import.meta.url),
    "utf8"
  );
  let options;
  const bindings = {
    ...Vue,
    ...adapters,
    defineProps: () => ({
      activity,
      course: { id: "course-a", learning_path_id: "old-path", sections: [] },
      locale: "de",
    }),
    defineEmits: () => (name, value) => events.push({ name, value }),
    defineExpose: () => {},
    onBeforeUnmount: (callback) => callbacks.push(callback),
    useI18n: () => ({ t: (key) => key }),
    useLearningRooms: (value) => {
      options = value;
      return {
        owner,
        user,
        request: Vue.ref(request),
        view: Vue.ref(roomView || null),
        data: roomData,
        edit: () => {},
        reauthRequired: Vue.ref(false),
        recovering: Vue.ref(false),
        retry: () => {},
      };
    },
    window: { sessionStorage: storage },
  };
  const component = scope.run(() =>
    evaluateScript(
      source,
      bindings,
      "complete,canLeave,posting,completing,draft,save,change,finished,saveError"
    )
  );
  return {
    ...component,
    options,
    events,
    writes,
    owner,
    user,
    stop: () => {
      callbacks.forEach((callback) => callback());
      scope.stop();
    },
  };
}

test("a composed room delegates the exact native selection, save and completion proof", async () => {
  const activity = adapters.roomActivity(room());
  const calls = [];
  const fixture = await activityFixture(activity, {
    roomView: { room: room(), dirty: false },
    roomData: {
      save: async () => {
        calls.push("save");
        return true;
      },
      complete: async (...args) => {
        calls.push(args);
        return true;
      },
    },
  });
  assert.deepEqual(fixture.options.selection, {
    path: "old-path",
    courseId: "course-a",
    unitId: "old-unit",
  });
  assert.equal(fixture.options.syncLocation, false);
  assert.equal(await fixture.canLeave(), true);
  assert.deepEqual(calls, []);
  await fixture.complete({ attempt_id: "real-attempt" });
  assert.deepEqual(calls, [["complete", undefined, "real-attempt"]]);
  assert.equal(fixture.events.filter((event) => event.name === "completed").length, 1);
  fixture.stop();
});

// Renders the actual LessonActivity template with the real locale files; only the
// nested renderer and the room composable are stand-ins.
const locales = Object.fromEntries(
  await Promise.all(
    [
      ["de", "de"],
      ["en", "en-US"],
    ].map(async ([locale, file]) => [
      locale,
      JSON.parse(await readFile(new URL(`../locales/${file}.json`, import.meta.url), "utf8")),
    ])
  )
);
const escapeHtml = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
async function renderLessonActivity(view, locale) {
  const vueUrl = JSON.stringify(import.meta.resolve("vue"));
  const hostStub = url(
    `import { h } from ${vueUrl};
export default { inheritAttrs: false, props: ["state", "disabled"], setup: (props) => () =>
  h("div", { "data-state": JSON.stringify(props.state), "data-disabled": String(props.disabled) }) };`
  );
  const file = "components/learning/LessonActivity.vue";
  const { descriptor } = parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"), {
    filename: file,
  });
  const code = compile(compileScript(descriptor, { id: file, inlineTemplate: true }).content)
    .replace(/from ["']vue["']/g, `from ${vueUrl}`)
    .replace(/from ["']vue-i18n["']/g, `from ${JSON.stringify(import.meta.resolve("vue-i18n"))}`)
    .replace(
      /from ["']~\/utils\/learningActivityAdapters["']/,
      `from ${JSON.stringify(adapterUrl)}`
    )
    .replace(/from ["']\.\/ActivityHost\.vue["']/, `from ${JSON.stringify(hostStub)}`);
  const LessonActivity = (await import(url(code))).default;
  globalThis.useLearningRooms = () => ({
    view: Vue.ref(view),
    data: {},
    edit: () => {},
    request: Vue.ref(async () => ({})),
    owner: Vue.ref("user-a:session-a"),
    user: Vue.ref({ id: "user-a" }),
    reauthRequired: Vue.ref(false),
    reauthenticate: async () => {},
    recovering: Vue.ref(false),
    retry: () => {},
  });
  try {
    const app = Vue.createSSRApp(LessonActivity, {
      activity: adapters.roomActivity(room()),
      course: { id: "course-a", learning_path_id: "old-path", sections: [] },
      locale,
    });
    app.component("CoursePractice", { render: () => null });
    app.use(createI18n({ legacy: false, locale, messages: locales }));
    return await renderToString(app);
  } finally {
    delete globalThis.useLearningRooms;
  }
}
const readyRoom = (extra) => ({
  status: "ready",
  room: room(),
  draft: { labels: "SAASNN" },
  dirty: false,
  saving: false,
  completing: false,
  completionPending: false,
  reviewStarting: false,
  reviewPending: false,
  conflict: false,
  error: "",
  ...extra,
});

test("a rejected completion answer is shown as not yet right, keeps the work editable and offers no save retry", async () => {
  const technical = {
    de: ["Dein Stand konnte noch nicht gespeichert werden.", "Nochmal versuchen"],
    en: ["Your work hasn't been saved yet.", "Try again"],
  };
  for (const locale of ["de", "en"]) {
    const html = await renderLessonActivity(readyRoom({ error: "CheckIntroduction" }), locale);
    const message = escapeHtml(locales[locale].LearningRooms.Incorrect);
    assert.match(
      html,
      new RegExp(`<p[^>]*role="status"[^>]*>${message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</p>`)
    );
    for (const text of technical[locale]) assert.ok(!html.includes(escapeHtml(text)), text);
    assert.ok(!html.includes('role="alert"'));
    assert.ok(html.includes(`data-state="${escapeHtml(JSON.stringify({ labels: "SAASNN" }))}"`));
    assert.ok(html.includes('data-disabled="false"'));
  }
});

test("technical save and completion errors in the lesson player keep the retryable save error", async () => {
  for (const view of [
    readyRoom({ error: "SaveError", completionPending: true }),
    readyRoom({ error: "SaveError", dirty: true }),
  ]) {
    const html = await renderLessonActivity(view, "de");
    assert.match(
      html,
      /role="alert"[^>]*><p>Dein Stand konnte noch nicht gespeichert werden\.<\/p><button[^>]*>Nochmal versuchen<\/button>/
    );
    assert.ok(!html.includes(escapeHtml(locales.de.LearningRooms.Incorrect)));
  }
});

test("legacy completion uncertainty is reconciled with a read and never automatically sent twice", async () => {
  const activity = adapters.legacyLectureLesson(
    { id: "course-a" },
    { id: "lecture-a", title: "Old", type: "mp4" },
    { id: "section-a" }
  ).activities[0];
  const calls = [];
  const fixture = await activityFixture(activity, {
    request: async (path, method = "GET") => {
      calls.push({ path, method });
      if (method === "PUT") throw new Error("Response lost");
      return { sections: [{ lectures: [{ id: "lecture-a", completed: true }] }] };
    },
  });
  await fixture.complete({});
  assert.equal(calls.filter((call) => call.method === "PUT").length, 1);
  assert.equal(calls.filter((call) => call.method === "GET").length, 1);
  assert.equal(fixture.finished.value, true);
  assert.equal(fixture.saveError.value, false);
  fixture.stop();
});

test("challenge checkpoints use native identities and an in-flight POST still blocks activity navigation", async () => {
  const reference = { type: "coding", task_id: "task-a", subtask_id: "code-a" };
  const activity = {
    id: "occurrence-a",
    kind: "coding",
    source: { kind: "challenge", ...reference },
    exercise: reference,
    content: {},
    completed: null,
  };
  const fixture = await activityFixture(activity);
  fixture.change({ code: "print(42)", submission_unknown: true });
  assert.ok(fixture.writes.at(-1).key.endsWith("coding:task-a:code-a"));
  assert.equal(JSON.parse(fixture.writes.at(-1).value).state.submission_unknown, true);
  fixture.posting.value = true;
  assert.equal(await fixture.canLeave(), false);
  fixture.posting.value = false;
  assert.equal(await fixture.canLeave(), true);
  fixture.owner.value = "user-b:session-b";
  fixture.user.value = { id: "user-b" };
  await tick();
  assert.equal(await fixture.save(), false);
  fixture.stop();
});

test("the composed lesson page advances ordered native activities, preserves direct selection and does not award progress", async () => {
  const source = await readFile(
    new URL("../pages/courses/[id]/lessons/[lesson].vue", import.meta.url),
    "utf8"
  );
  const scope = Vue.effectScope();
  const route = Vue.reactive({
    params: { id: "course-a", lesson: "lesson-a" },
    query: { activity: "custom-step" },
  });
  const owner = Vue.ref("user-a:session-a");
  const calls = [];
  const navigation = [];
  const activities = [
    { id: "video-step", source: { kind: "lecture", lecture_id: "old-video" }, completed: false },
    { id: "custom-step", source: { kind: "room", unit_id: "native-room" }, completed: false },
    {
      id: "coding-step",
      source: { kind: "challenge", task_id: "task-a", subtask_id: "code-a", type: "coding" },
      completed: null,
    },
  ];
  const lesson = {
    course_id: "course-a",
    id: "lesson-a",
    explicit: true,
    title: { de: "Lektion", en: "Lesson" },
    activities,
  };
  const fixture = scope.run(() =>
    evaluateScript(
      source,
      {
        ...Vue,
        definePageMeta: () => {},
        useHead: () => {},
        useRoute: () => route,
        useRouter: () => ({
          replace: async (location) => {
            navigation.push(location);
            route.query = location.query;
          },
          push: async (location) => navigation.push(location),
        }),
        useI18n: () => ({ locale: Vue.ref("de") }),
        useLearningRooms: () => ({
          owner,
          reauthRequired: Vue.ref(false),
          reauthenticate: async () => {},
          request: Vue.ref(async (path, method = "GET") => {
            calls.push({ path, method });
            return path.endsWith("/lessons/lesson-a")
              ? structuredClone(lesson)
              : path.endsWith("/curriculum")
                ? { course_id: "course-a", lessons: [{ id: "lesson-a" }, { id: "lesson-b" }] }
                : { id: "course-a", sections: [] };
          }),
        }),
        onBeforeRouteLeave: () => {},
        onBeforeRouteUpdate: () => {},
        onBeforeUnmount: () => {},
        onMounted: () => {},
      },
      "activeId,activityHandle,lesson,loading,error,select,next,recordCompletion"
    )
  );
  await tick();
  assert.equal(fixture.error.value, false);
  assert.equal(fixture.activeId.value, "custom-step");
  assert.equal(navigation.length, 0);
  let allowed = false;
  fixture.activityHandle.value = { canLeave: async () => allowed, shouldWarn: () => !allowed };
  await fixture.next();
  assert.equal(fixture.activeId.value, "custom-step");
  allowed = true;
  fixture.recordCompletion("custom-step");
  await fixture.next();
  assert.equal(fixture.activeId.value, "coding-step");
  await fixture.select("video-step");
  assert.equal(fixture.activeId.value, "video-step");
  assert.equal(fixture.lesson.value.activities[0].completed, false);
  await fixture.select("coding-step");
  await fixture.next();
  assert.equal(navigation.at(-1), "/courses/course-a/lessons/lesson-b");
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.method === "GET"));
  scope.stop();
});
