import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import ts from "typescript";

const source = await readFile(new URL("../utils/learningModule.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
const { createLearningModuleSession, learningModuleUrl, learningModuleIdentity } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const assessmentSource = await readFile(
  new URL("../utils/learningModuleAssessment.ts", import.meta.url),
  "utf8"
);
const exerciseSource = await readFile(
  new URL("../utils/learningExercise.ts", import.meta.url),
  "utf8"
);
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    }).outputText
  ).toString("base64")}`;
const assessmentModule = await import(
  moduleUrl(
    assessmentSource.replace('"./learningExercise"', JSON.stringify(moduleUrl(exerciseSource)))
  )
);
const descriptor = {
  id: "test-module",
  api_version: 1,
  entry_url: "https://lessons.example/immutable/index.js",
};
const context = {
  activityId: "existing-unit",
  locale: "de",
  content: { label: "Test" },
  state: { answer: "old" },
  disabled: false,
};

test("a saved room projection updates the mounted custom module without restarting it", async () => {
  const source = await readFile(
    new URL("../components/learning/CustomActivity.vue", import.meta.url),
    "utf8"
  );
  const script = parse(source).descriptor.scriptSetup.content;
  const ast = ts.createSourceFile("custom.ts", script, ts.ScriptTarget.Latest, true);
  const body = ast.statements
    .filter((node) => !ts.isImportDeclaration(node))
    .map((node) => node.getText(ast))
    .join("\n");
  const compiled = ts.transpileModule(body, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  const props = Vue.reactive({ module: { ...descriptor }, ...context });
  const sessions = [];
  const mounts = [];
  const cleanups = [];
  const bindings = {
    ...Vue,
    ...assessmentModule,
    learningModuleIdentity,
    window: { location: { origin: "https://bootstrap.example" } },
    defineProps: () => props,
    defineEmits: () => () => {},
    defineExpose: () => {},
    useI18n: () => ({ t: (key) => key }),
    useHeartInfo: () => Vue.ref(null),
    onMounted: (callback) => mounts.push(callback),
    onBeforeUnmount: (callback) => cleanups.push(callback),
    createLearningModuleSession: () => {
      const session = {
        updates: [],
        disposed: false,
        start() {},
        update(value) {
          this.updates.push(value);
        },
        dispose() {
          this.disposed = true;
        },
      };
      sessions.push(session);
      return session;
    },
  };
  const scope = Vue.effectScope();
  try {
    const fixture = scope.run(() =>
      new Function(...Object.keys(bindings), `${compiled}\nreturn {surface};`)(
        ...Object.values(bindings)
      )
    );
    fixture.surface.value = {};
    mounts.forEach((callback) => callback());
    assert.equal(sessions.length, 1);
    props.module = { ...descriptor };
    props.state = { answer: "saved" };
    props.locale = "en";
    await Vue.nextTick();
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].disposed, false);
    assert.equal(sessions[0].updates.at(-1).state.answer, "saved");
    props.module = { ...descriptor, entry_url: "https://lessons.example/replaced.js" };
    await Vue.nextTick();
    assert.equal(sessions.length, 2);
    assert.equal(sessions[0].disposed, true);
    props.reviewId = "new-review";
    await Vue.nextTick();
    assert.equal(sessions.length, 3);
    assert.equal(sessions[1].disposed, true);
  } finally {
    cleanups.forEach((callback) => callback());
    scope.stop();
  }
});

test("only canonical private grant rotation preserves module identity", () => {
  const grant = "a".repeat(43),
    artifact = "1".repeat(64);
  const entry = `https://api.example/skills/lesson-assets/${grant}/${artifact}/nested/index.js`;
  const identity = (entry_url, extra = {}) =>
    learningModuleIdentity({ ...descriptor, entry_url, ...extra });
  assert.equal(identity(entry), identity(entry.replace(grant, "b".repeat(43))));
  for (const changed of [
    entry.replace(artifact, "2".repeat(64)),
    entry.replace("api.example", "other.example"),
    entry.replace("index.js", "other.js"),
  ])
    assert.notEqual(identity(entry), identity(changed));
  assert.notEqual(identity(entry), identity(entry, { id: "other-module" }));
  assert.notEqual(identity(entry), identity(entry, { api_version: 2 }));
  for (const transform of [
    (value) => value.replace("https:", "http:"),
    (value) => value.replace("/skills/", "/other/"),
    (value) => value.replace(grant, grant.slice(1)),
    (value) => value.replace(artifact, "invalid"),
    (value) => value + "?version=1",
    (value) => value + "#part",
    (value) => value.replace("/nested/", "/%2F/"),
    (value) => value.replace("/nested/", "/%00/"),
    (value) => value.replace("api.example", "name@api.example"),
  ]) {
    const original = transform(entry);
    const changed = original.replace(/a{42,43}/, "b".repeat(43));
    assert.notEqual(identity(original), identity(changed));
  }
  assert.notEqual(
    identity("https://modules.example/one.js"),
    identity("https://modules.example/two.js")
  );
});

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};
function element() {
  return {
    children: [],
    parent: null,
    ownerDocument: { createElement: element },
    replaceChildren(...next) {
      this.children.forEach((child) => (child.parent = null));
      this.children = next;
      next.forEach((child) => (child.parent = this));
    },
    remove() {
      if (this.parent)
        this.parent.children = this.parent.children.filter((child) => child !== this);
      this.parent = null;
    },
  };
}
function setup(overrides = {}) {
  const events = { states: [], answers: [], busy: [], status: [], updates: [], loads: [] };
  let host;
  let disposed = 0;
  const node = overrides.element || element();
  const instance = {
    update: (value) => events.updates.push(value),
    dispose: () => disposed++,
  };
  const session = createLearningModuleSession({
    descriptor,
    element: node,
    origin: "https://bootstrap.example",
    context,
    change: (state) => events.states.push(state),
    save: async () => true,
    complete: (answer) => events.answers.push(answer),
    busy: (busy) => events.busy.push(busy),
    status: (status) => events.status.push(status),
    load: async (url) => {
      events.loads.push(url);
      return {
        apiVersion: 1,
        mount: (_node, bridge) => {
          host = bridge;
          return instance;
        },
      };
    },
    ...overrides,
  });
  return {
    session,
    events,
    node,
    get host() {
      return host;
    },
    get disposed() {
      return disposed;
    },
  };
}

test("remote modules load only when opened and use a compatible server descriptor", async () => {
  const f = setup();
  assert.deepEqual(f.events.loads, []);
  await f.session.start();
  await f.session.start();
  assert.deepEqual(f.events.loads, [descriptor.entry_url]);
  assert.deepEqual(f.events.status, ["loading", "ready"]);
  for (const entry_url of [
    "javascript:alert(1)",
    "data:text/javascript,export{}",
    "https://user:pass@example/a",
    "http://example/a",
    "/query-module.js",
  ]) {
    assert.throws(() =>
      learningModuleUrl({ ...descriptor, entry_url }, "https://bootstrap.example")
    );
  }
  assert.throws(() =>
    learningModuleUrl({ ...descriptor, api_version: 2 }, "https://bootstrap.example")
  );
  assert.equal(
    learningModuleUrl(
      { ...descriptor, entry_url: "http://127.0.0.1:1234/a.js" },
      "http://127.0.0.1:1234"
    ),
    "http://127.0.0.1:1234/a.js"
  );
});

test("module snapshots cannot mutate host work, disabled and disposed modules cannot submit", async () => {
  const f = setup();
  await f.session.start();
  f.host.context.state.answer = "mutation";
  assert.equal(f.host.context.state.answer, "old");
  const state = { answer: "draft" };
  f.host.change(state);
  state.answer = "later mutation";
  assert.deepEqual(f.events.states, [{ answer: "draft" }]);
  assert.equal(await f.host.save(), true);
  f.session.update({ ...context, disabled: true });
  f.host.change({ answer: "blocked" });
  f.host.complete({ answer: "blocked" });
  assert.equal(f.events.states.length, 1);
  assert.equal(f.events.answers.length, 0);
  f.host.setBusy(true);
  f.session.dispose();
  f.session.dispose();
  f.host.change({ answer: "too late" });
  f.host.setBusy(true);
  assert.equal(await f.host.save(), false);
  assert.equal(f.disposed, 1);
  assert.equal(f.host.signal.aborted, true);
  assert.equal(f.events.busy.at(-1), false);
  assert.equal(f.node.children.length, 0);
});

test("the module assessment API passes copied answers and rejects disabled or closed calls", async () => {
  const calls = [];
  const assessment = {
    submit: async (answer) => {
      calls.push({ submit: answer });
      return true;
    },
    check: async () => {
      calls.push("check");
    },
    newAttempt: async () => {
      calls.push("newAttempt");
    },
  };
  const f = setup({
    assessment,
    context: {
      ...context,
      assessment: { type: "multiple_choice", view: { phase: "ready" }, draft: { answers: [true] } },
    },
  });
  await f.session.start();
  const value = { answers: [true] };
  assert.equal(await f.host.assessment.submit(value), true);
  value.answers[0] = false;
  assert.deepEqual(calls, [{ submit: { answers: [true] } }]);
  f.host.context.assessment.view.phase = "correct";
  assert.equal(f.host.context.assessment.view.phase, "ready");
  await f.host.assessment.check();
  await f.host.assessment.newAttempt();
  f.session.update({ ...context, disabled: true });
  assert.equal(await f.host.assessment.submit({ answers: [true] }), false);
  await f.host.assessment.check();
  f.session.dispose();
  await f.host.assessment.newAttempt();
  assert.equal(calls.length, 3);
});

test("activity and review changes close the session instead of adopting another owner's work", async () => {
  for (const next of [
    { ...context, activityId: "other" },
    { ...context, reviewId: "new-review" },
  ]) {
    const f = setup();
    await f.session.start();
    f.session.update(next);
    assert.equal(f.disposed, 1);
    assert.equal(f.events.status.at(-1), "disposed");
  }
});

test("an import finishing after navigation never mounts", async () => {
  const pending = deferred();
  let mounts = 0;
  const f = setup({ load: () => pending.promise });
  const started = f.session.start();
  f.session.dispose();
  pending.resolve({ apiVersion: 1, mount: () => mounts++ });
  await started;
  assert.equal(mounts, 0);
  assert.equal(f.events.status.at(-1), "disposed");
});

test("a late asynchronous mount disposes its own surface without erasing the replacement", async () => {
  const pending = deferred();
  const node = element();
  let oldSurface,
    oldHost,
    oldDisposals = 0;
  const old = setup({
    element: node,
    load: async () => ({
      apiVersion: 1,
      mount: (surface, host) => {
        oldSurface = surface;
        oldHost = host;
        return pending.promise;
      },
    }),
  });
  const started = old.session.start();
  await Promise.resolve();
  old.session.dispose();
  const current = setup({ element: node });
  await current.session.start();
  const currentSurface = node.children[0];
  pending.resolve({
    update() {},
    dispose() {
      oldDisposals++;
      oldSurface.replaceChildren();
    },
  });
  await started;
  oldHost.complete({ obsolete: true });
  assert.equal(oldDisposals, 1);
  assert.equal(node.children[0], currentSurface);
  assert.deepEqual(old.events.answers, []);
});

test("load or update failure releases busy state and leaves saved work available to retry", async () => {
  const failed = setup({
    load: async () => {
      throw new Error("unavailable");
    },
  });
  await failed.session.start();
  assert.equal(failed.events.status.at(-1), "error");
  assert.equal(failed.events.busy.at(-1), false);
  assert.deepEqual(failed.events.states, []);
  const retry = setup();
  await retry.session.start();
  assert.deepEqual(retry.host.context.state, context.state);
  const broken = setup({
    load: async () => ({
      apiVersion: 1,
      mount: () => ({
        update() {
          throw new Error();
        },
        dispose() {
          throw new Error();
        },
      }),
    }),
  });
  await broken.session.start();
  assert.equal(broken.events.status.at(-1), "error");
});
