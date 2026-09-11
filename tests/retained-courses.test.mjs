import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { compileScript, parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { createI18n } from "vue-i18n";

const scratch = await mkdtemp(join(tmpdir(), "retained-courses-test-"));
after(() => rm(scratch, { recursive: true, force: true }));
async function load(relative, component = false) {
  let source = await readFile(new URL(relative, import.meta.url), "utf8");
  if (component)
    source = compileScript(parse(source).descriptor, {
      id: relative,
      inlineTemplate: true,
    }).content;
  let code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const dependency of ["vue", "vue-i18n"])
    code = code.replace(
      new RegExp(`from ["']${dependency}["']`, "g"),
      `from ${JSON.stringify(import.meta.resolve(dependency))}`
    );
  code = code.replaceAll(
    'from "../composables/retainedCourses"',
    `from ${JSON.stringify(pathToFileURL(join(scratch, "retainedCourses.mjs")).href)}`
  );
  const path = join(
    scratch,
    relative
      .split("/")
      .at(-1)
      .replace(/\.(ts|vue)$/, ".mjs")
  );
  await writeFile(path, code);
  return import(pathToFileURL(path));
}
const { createLearningAccess } = await load("../composables/learningAccess.ts");
const { createRetainedCourses } = await load("../composables/retainedCourses.ts");
const subject = "10000000-0000-4000-8000-000000000001",
  learner = "10000000-0000-4000-8000-000000000002",
  caseId = "20000000-0000-4000-8000-000000000001";
const apiBase = "http://127.0.0.1:3198";
const httpError = (status) => Object.assign(Error(`Synthetic ${status}`), { response: { status } });
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
function fixture() {
  const stored = new Map(),
    calls = [];
  let identity = "owner-a",
    expires = Date.now() + 600000,
    failure = null,
    completeMode = "normal",
    mediaOverride = null;
  let held = null,
    captured = false,
    denyDetails = false;
  const data = {
    id: "arithmetic",
    title: "Synthetic arithmetic",
    description: "A synthetic course.",
    sections: [
      {
        id: "intro",
        title: "Introduction",
        lectures: [
          { id: "local", title: "Local lecture", description: null, type: "mp4", completed: false },
          {
            id: "youtube",
            title: "YouTube lecture",
            description: "Synthetic remote lecture.",
            type: "youtube",
            video_id: "abcdefghijk",
            completed: false,
          },
        ],
      },
    ],
  };
  const learning = createLearningAccess({
    owner: () => ({ case_id: caseId, subject }),
    identity: () => identity,
    ambient: () => identity,
    storage: { getItem: (k) => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v) },
    summary: async () => ({ subjects: [{ case_id: caseId, subject: learner, erased_at: null }] }),
    refresh: async () => ({
      subject: learner,
      expires_at: new Date(expires).toISOString(),
      purpose: "retained_learning",
      ordinary_authority: false,
      financial_authority: false,
      claims_satisfied: false,
    }),
    fetch: async (path, options) => {
      calls.push({ path, options: structuredClone(options) });
      assert.equal(options.credentials, "omit");
      assert.equal(options.retry, 0);
      assert.deepEqual(Object.keys(options.headers), ["x-learning-key"]);
      assert.equal(options.headers["x-learning-key"], learning.pending.value.body.key);
      if (path === "/shop/learning/resources")
        return {
          subject: learner,
          purpose: "retained_learning",
          ordinary_authority: false,
          coins: 17,
          withheld_coins: 2,
          hearts: 3,
          hearts_max: 5,
          premium: null,
          renewal_activated: false,
          purchase_performed: false,
        };
      if (failure) throw httpError(failure);
      if (path.endsWith("/course_access"))
        return [{ id: data.id, title: data.title, description: data.description }];
      if (path.endsWith("/arithmetic")) {
        if (denyDetails) throw httpError(403);
        const result = structuredClone(data);
        if (held && !captured) {
          captured = true;
          await held.promise;
        }
        return result;
      }
      if (path.endsWith("/watch")) return true;
      if (path.endsWith("/lectures/local"))
        return (
          mediaOverride ??
          `${apiBase}/skills/learning/lectures/synthetic-token/arithmetic_local.mp4`
        );
      if (path.endsWith("/complete")) {
        if (completeMode !== "before")
          data.sections[0].lectures.find((l) =>
            path.endsWith(`/lectures/${l.id}/complete`)
          ).completed = true;
        if (completeMode === "after-read-fails") {
          denyDetails = true;
          throw Error("Synthetic lost committed reply");
        }
        if (completeMode !== "normal") throw Error("Synthetic missing reply");
        return true;
      }
      throw Error(`Unexpected route ${path}`);
    },
  });
  const course = createRetainedCourses({
    request: learning.courseRequest,
    identity: () => `${identity}:${learning.generation.value}`,
    apiBase,
  });
  return {
    learning,
    course,
    calls,
    data,
    stored,
    ready: async () => {
      await learning.prepare(learner);
      await learning.submit();
      await course.load();
      await course.openCourse("arithmetic");
    },
    failure: (v) => (failure = v),
    completeMode: (v) => (completeMode = v),
    deny: (v) => (denyDetails = v),
    hold: (v) => {
      held = v;
      captured = false;
    },
    media: (v) => (mediaOverride = v),
    changeOwner: () => {
      identity = "owner-b";
      learning.clear();
      course.clear();
    },
    expire: () => (expires = Date.now() - 1000),
    dispose: () => {
      course.dispose();
      learning.dispose();
    },
  };
}

test("saved learning material cannot open courses until current issuance and resources are confirmed", async () => {
  const f = fixture();
  try {
    await f.learning.prepare(learner);
    await assert.rejects(f.learning.courseRequest({ kind: "list" }), /learning_inactive/);
    assert.equal(f.calls.length, 0);
  } finally {
    f.dispose();
  }
});
test("available course and MP4 journey uses only fixed scoped endpoints and no ordinary state", async () => {
  const f = fixture();
  try {
    await f.ready();
    await f.course.openLecture("intro", "local");
    assert.match(f.course.media.value, /synthetic-token/);
    assert.deepEqual(
      f.calls.slice(1).map((c) => [c.path, c.options.method]),
      [
        ["/skills/learning/course_access", "GET"],
        ["/skills/learning/courses/arithmetic", "GET"],
        ["/skills/learning/courses/arithmetic", "GET"],
        ["/skills/learning/courses/arithmetic/watch", "POST"],
        ["/skills/learning/courses/arithmetic/lectures/local", "GET"],
      ]
    );
    assert(!f.calls.some((c) => /offer|purchase|accept|auth|premium/.test(c.path)));
    await assert.rejects(
      f.learning.courseRequest({ kind: "buy", course: "arithmetic" }),
      /invalid_resource/
    );
  } finally {
    f.dispose();
  }
});
test("YouTube selection creates no embed until explicit load with another protected course read", async () => {
  const f = fixture();
  try {
    await f.ready();
    await f.course.openLecture("intro", "youtube");
    assert.equal(f.course.media.value, "");
    const reads = f.calls.filter((c) => c.path.endsWith("/arithmetic")).length;
    await f.course.openLecture("intro", "youtube", true);
    assert.match(f.course.media.value, /youtube-nocookie/);
    assert.equal(f.calls.filter((c) => c.path.endsWith("/arithmetic")).length, reads + 1);
    await f.course.openLecture("intro", "local");
    assert.equal(f.course.youtubeLoaded.value, false);
  } finally {
    f.dispose();
  }
});
test("revoked course access blocks a formerly cached YouTube lecture before any embed", async () => {
  const f = fixture();
  try {
    await f.ready();
    await f.course.openLecture("intro", "youtube");
    f.deny(true);
    await assert.rejects(f.course.openLecture("intro", "youtube", true));
    assert.equal(f.course.media.value, "");
    assert.equal(f.course.course.value, null);
    assert(
      f.learning.resources.value,
      "course refusal does not invalidate personal or global learning proof"
    );
  } finally {
    f.dispose();
  }
});
for (const mode of ["normal", "after", "before"]) {
  test(`completion ${mode} rereads recorded progress without automatic mutation retry`, async () => {
    const f = fixture();
    try {
      await f.ready();
      await f.course.openLecture("intro", "local");
      f.completeMode(mode);
      await f.course.complete();
      assert.equal(f.calls.filter((c) => c.options.method === "PUT").length, 1);
      assert.equal(f.calls.at(-1).options.method, "GET");
      assert.equal(f.course.lecture.value.completed, mode !== "before");
      assert.equal(f.course.progressUncertain.value, false);
      assert.equal(f.course.media.value, "");
      if (mode === "before") assert.equal(f.course.error.value, "CompletionUnconfirmed");
    } finally {
      f.dispose();
    }
  });
}
test("uncertain completion with unavailable progress blocks another completion until authoritative recovery", async () => {
  const f = fixture();
  try {
    await f.ready();
    await f.course.openLecture("intro", "local");
    f.completeMode("after-read-fails");
    await assert.rejects(f.course.complete());
    assert.equal(f.course.progressUncertain.value, true);
    await assert.rejects(f.course.complete());
    assert.equal(f.calls.filter((c) => c.options.method === "PUT").length, 1);
    f.deny(false);
    await f.course.refreshProgress();
    assert.equal(f.course.lecture.value.completed, true);
    assert.equal(f.course.progressUncertain.value, false);
  } finally {
    f.dispose();
  }
});
test("held previous lecture cannot replace a later selected lecture", async () => {
  const f = fixture();
  try {
    await f.ready();
    const gate = deferred();
    f.hold(gate);
    const old = f.course.openLecture("intro", "local");
    await Promise.resolve();
    await f.course.openLecture("intro", "youtube");
    gate.resolve();
    await assert.rejects(old, /stale_view/);
    assert.equal(f.course.lecture.value.id, "youtube");
    assert.equal(f.course.media.value, "");
  } finally {
    f.dispose();
  }
});
test("owner change or learning401 rejects held course results and preserves exact recovery material", async () => {
  for (const change of ["owner", "401"]) {
    const f = fixture();
    try {
      await f.ready();
      const saved = [...f.stored.values()];
      const gate = deferred();
      f.hold(gate);
      const old = f.course.openLecture("intro", "local");
      await Promise.resolve();
      if (change === "owner") f.changeOwner();
      else {
        f.failure(401);
        await assert.rejects(f.learning.courseRequest({ kind: "list" }));
      }
      gate.resolve();
      await assert.rejects(old, /stale_view/);
      assert.equal(f.course.media.value, "");
      assert.equal(f.learning.resources.value, null);
      assert.deepEqual([...f.stored.values()], saved);
    } finally {
      f.dispose();
    }
  }
});
test("expired receipt rejects course use even before an expiry timer callback", async () => {
  const f = fixture();
  const now = Date.now;
  try {
    await f.ready();
    Date.now = () => now() + 700000;
    await assert.rejects(f.learning.courseRequest({ kind: "list" }), /learning_inactive/);
    assert.equal(f.learning.resources.value, null);
  } finally {
    Date.now = now;
    f.dispose();
  }
});
for (const source of [
  "https://foreign.invalid/video.mp4",
  `${apiBase}/skills/lectures/token/ordinary.mp4`,
  `${apiBase}/skills/learning/lectures/token/file.mp4?key=secret`,
]) {
  test(`rejects media outside scoped configured service: ${source}`, async () => {
    const f = fixture();
    try {
      await f.ready();
      f.media(source);
      await assert.rejects(f.course.openLecture("intro", "local"));
      assert.equal(f.course.media.value, "");
    } finally {
      f.dispose();
    }
  });
}

test("RC1 null course description preserves list, protected lecture and authoritative progress", async () => {
  const f = fixture();
  try {
    f.data.description = null;
    await f.ready();
    assert.equal(f.course.courses.value[0].id, "arithmetic");
    assert.equal(f.course.course.value.description, null);
    await f.course.openLecture("intro", "local");
    assert.match(f.course.media.value, /synthetic-token/);
    await f.course.complete();
    await f.course.refreshProgress();
    assert.equal(f.course.lecture.value.completed, true);
    assert.equal(f.course.course.value.description, null);
    assert.equal(f.data.description, null);
  } finally {
    f.dispose();
  }
});

for (const description of [0, {}, [], undefined]) {
  test(`RC1 rejects malformed course description ${JSON.stringify(description)}`, async () => {
    const f = fixture();
    try {
      f.data.description = description;
      await f.learning.prepare(learner);
      await f.learning.submit();
      await f.course.load();
      await assert.rejects(f.course.openCourse("arithmetic"), /invalid_response/);
      assert.equal(f.course.course.value, null);
      assert.equal(f.course.media.value, "");
    } finally {
      f.dispose();
    }
  });
}

async function mountedCourseDescription(description) {
  const { default: Component } = await load("../components/RetainedCourses.vue", true);
  const messages = {};
  for (const lang of ["de", "en-US"])
    messages[lang] = JSON.parse(
      await readFile(new URL(`../locales/${lang}.json`, import.meta.url), "utf8")
    );
  const node = (type, text = "") => ({ type, text, props: {}, children: [], parent: null });
  const detach = (n) => {
    if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1);
  };
  const renderer = Vue.createRenderer({
    createElement: node,
    createText: (s) => node("text", s),
    createComment: (s) => node("comment", s),
    setText: (n, s) => (n.text = s),
    setElementText: (n, s) => {
      n.text = s;
      n.children = [];
    },
    patchProp: (n, k, _v, v) => (n.props[k] = v),
    insert: (n, p, a = null) => {
      detach(n);
      n.parent = p;
      p.children.splice(a ? p.children.indexOf(a) : p.children.length, 0, n);
    },
    remove: detach,
    parentNode: (n) => n.parent,
    nextSibling: (n) => n.parent?.children[n.parent.children.indexOf(n) + 1],
  });
  const root = node("root"),
    all = (n = root) => [n, ...n.children.flatMap(all)],
    text = (n = root) => [n.type === "comment" ? "" : n.text, ...n.children.map(text)].join(" ");
  const flush = async () => {
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
      await Vue.nextTick();
    }
  };
  const f = fixture(),
    props = Vue.reactive({ identity: "a", request: f.learning.courseRequest });
  f.data.description = description;
  const previous = globalThis.useRuntimeConfig;
  globalThis.useRuntimeConfig = () => ({ public: { BASE_API_URL: apiBase } });
  const app = renderer.createApp({ render: () => Vue.h(Component, props) });
  const i18n = createI18n({ legacy: false, locale: "en-US", messages });
  app.use(i18n);
  app.component("NuxtLink", {
    setup:
      (p, { slots }) =>
      () =>
        Vue.h("a", slots.default?.()),
  });
  app.component("RetainedCoursePlayer", {
    props: ["source"],
    setup: (p) => () => Vue.h("video", { src: p.source }),
  });
  try {
    await f.learning.prepare(learner);
    await f.learning.submit();
    app.mount(root);
    await flush();
    const button = (label) => all().find((n) => n.type === "button" && text(n).trim() === label);
    await button("Show available courses").props.onClick();
    await flush();
    await button("Synthetic arithmetic").props.onClick();
    await flush();
    const article = all().find((n) => n.props["aria-labelledby"] === "retained-course-title");
    assert(article, "a valid nullable description must not prevent opening the course");
    const descriptions = article.children.filter((n) => n.type === "p");
    if (description === null)
      assert.equal(descriptions.length, 0, "absent course description is omitted");
    else assert.equal(text(descriptions[0]).trim(), description);
    await button("Local lecture").props.onClick();
    await flush();
    assert(all().some((n) => n.type === "video" && n.props.src));
    await button("Mark this lecture as completed").props.onClick();
    await flush();
    assert.match(text(), /Completed/);
    i18n.global.locale.value = "de";
    await flush();
    assert.match(text(), /Abgeschlossen/);
    props.identity = "b";
    await flush();
    assert(!all().some((n) => n.type === "video"));
    assert.doesNotMatch(text(), /Synthetic arithmetic/);
  } finally {
    app.unmount();
    f.dispose();
    if (previous === undefined) delete globalThis.useRuntimeConfig;
    else globalThis.useRuntimeConfig = previous;
  }
}

test("mounted retained course component uses keyboard buttons, isolates progress and removes media on identity change", () =>
  mountedCourseDescription("A synthetic course."));
test("RC1 mounted course omits null description and retains lecture/progress flow", () =>
  mountedCourseDescription(null));
