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
    useLearningGateway: () => ({ send: async () => Promise.reject(new Error("offline")) }),
    createLearningLlm: () => ({ peekProof: () => null, fallbackAvailable: () => false }),
    createLearningProject: () => ({}),
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

test("optional platform features are flagged, and a v1 host without them is unchanged", async () => {
  const plain = setup();
  await plain.session.start();
  assert.deepEqual(plain.host.capabilities, []);
  assert.equal(plain.host.llm, undefined);
  assert.equal(plain.host.project, undefined);

  const llm = {
    info: async () => ({ id: "chat" }),
    respond: async () => ({ ok: true, outputs: [] }),
    grade: async () => ({ ok: true, passed: true }),
    label: () => ({ label: true }),
    fallbackAvailable: () => false,
  };
  const project = { get: async () => ({ revision: 0, state: {} }), save: async () => ({}) };
  const full = setup({ llm, project });
  await full.session.start();
  assert.deepEqual(full.host.capabilities, ["llm", "project"]);
  assert.equal(Object.isFrozen(full.host.capabilities), true);
  assert.deepEqual(Object.keys(full.host.llm).sort(), [
    "fallbackAvailable",
    "fallbackComplete",
    "grade",
    "info",
    "label",
    "respond",
  ]);
  assert.deepEqual(Object.keys(full.host.project).sort(), ["get", "save"]);
});

test("LLM and project results are copies and nothing arrives after the activity closed", async () => {
  const deltas = [];
  let release;
  const shared = { ok: true, outputs: [{ type: "text", text: "host copy" }] };
  const llm = {
    info: async () => ({ output: { type: "grading" } }),
    respond: async (request, options) => {
      options.onDelta({ sample: 0, text: "early" });
      await new Promise((resolve) => (release = resolve));
      options.onDelta({ sample: 0, text: "late" });
      return shared;
    },
    grade: async () => ({ ok: true, passed: true, counts: true }),
    label: () => ({}),
  };
  const saved = [];
  const project = {
    get: async () => ({ revision: 2, state: { bot: "Klingel" } }),
    save: async (state, revision) => {
      saved.push({ state, revision });
      return { revision: revision + 1, state };
    },
  };
  const f = setup({ llm, project });
  await f.session.start();
  const request = { profile: "chat", input: [{ role: "user", content: "hi" }] };
  const pending = f.host.llm.respond(request, { onDelta: (delta) => deltas.push(delta.text) });
  await new Promise(setImmediate);
  release();
  const answer = await pending;
  answer.outputs[0].text = "module mutation";
  assert.equal(shared.outputs[0].text, "host copy");
  assert.deepEqual(deltas, ["early", "late"]);

  const state = { bot: "Klingel", step: 1 };
  const stored = await f.host.project.save(state, 2);
  state.step = 99;
  assert.deepEqual(saved, [{ state: { bot: "Klingel", step: 1 }, revision: 2 }]);
  assert.deepEqual(stored, { revision: 3, state: { bot: "Klingel", step: 1 } });
  assert.deepEqual(await f.host.project.get(), { revision: 2, state: { bot: "Klingel" } });

  // A late answer after navigation reaches neither the callback nor the caller.
  const late = f.host.llm.respond(request, { onDelta: (delta) => deltas.push(delta.text) });
  await new Promise(setImmediate);
  f.session.dispose();
  release();
  const closed = await late;
  assert.equal(closed.ok, false);
  assert.equal(closed.error.code, "cancelled");
  assert.deepEqual(deltas, ["early", "late", "early"]);
  assert.equal((await f.host.llm.grade("answer")).error.code, "cancelled");
  assert.equal(await f.host.llm.info("chat"), null);
  await assert.rejects(f.host.project.get(), (error) => error.code === "offline");
  await assert.rejects(f.host.project.save({}, 0), (error) => error.code === "offline");
});

test("a disabled activity cannot grade or save project state; bad requests never throw", async () => {
  const calls = [];
  const f = setup({
    llm: {
      info: async () => null,
      respond: async (request) => {
        calls.push(request);
        return { ok: false, error: { code: "invalid_request" } };
      },
      grade: async () => assert.fail("disabled"),
      label: () => ({}),
    },
    project: { get: async () => ({}), save: async () => assert.fail("disabled") },
  });
  await f.session.start();
  const circular = {};
  circular.self = circular;
  assert.equal((await f.host.llm.respond(circular)).ok, false);
  assert.equal((await f.host.llm.respond(undefined)).ok, false);
  assert.deepEqual(calls, [null, null]);
  f.session.update({ ...context, disabled: true });
  assert.equal((await f.host.llm.grade("answer")).error.code, "cancelled");
  // Review 24.09. N7: a locked activity says so instead of pretending to be offline.
  await assert.rejects(f.host.project.save({}, 0), (error) => error.code === "locked");
});

test("the real custom activity completes a counting grade with its exact text and verdict", async () => {
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
  const props = Vue.reactive({
    module: { ...descriptor },
    ...context,
    unitId: "llm-unit",
    courseId: "llm-course",
    request: async () => ({}),
  });
  const events = [];
  const sessions = [];
  const created = { llm: [], project: [] };
  const proof = { text: "Hallo Frau Berg", verdict: "signed.verdict.value" };
  const mounts = [];
  const cleanups = [];
  const bindings = {
    ...Vue,
    ...assessmentModule,
    learningModuleIdentity,
    window: { location: { origin: "https://bootstrap.example" } },
    defineProps: () => props,
    defineEmits:
      () =>
      (name, ...args) =>
        events.push([name, ...args]),
    defineExpose: () => {},
    useI18n: () => ({ t: (key) => key }),
    useHeartInfo: () => Vue.ref(null),
    useLearningGateway: () => ({ send: "gateway-send" }),
    createLearningLlm: (options) => {
      created.llm.push(options);
      return { peekProof: () => ({ ...proof }), fallbackAvailable: () => false };
    },
    createLearningProject: (options) => {
      created.project.push(options);
      return { project: true };
    },
    onMounted: (callback) => mounts.push(callback),
    onBeforeUnmount: (callback) => cleanups.push(callback),
    createLearningModuleSession: (options) => {
      sessions.push(options);
      return { start() {}, update() {}, dispose() {} };
    },
  };
  const scope = Vue.effectScope();
  try {
    const fixture = scope.run(() =>
      new Function(...Object.keys(bindings), `${compiled}\nreturn {surface};`)(
        ...Object.values(bindings)
      )
    );
    fixture.surface.value = { ownerDocument: "document" };
    mounts.forEach((callback) => callback());
    const [session] = sessions;
    assert.ok(session.llm && session.project);
    assert.deepEqual(
      [created.llm[0].unitId, created.llm[0].courseId, created.llm[0].send],
      ["llm-unit", "llm-course", "gateway-send"]
    );
    assert.equal(created.project[0].courseId, "llm-course");
    session.complete({ anything: "the module sent" });
    // Review 24.09. M1: a completion that did not go out is sent again with the same verdict.
    session.complete({ other: "answer" });
    assert.deepEqual(events, [
      ["complete", { text: "Hallo Frau Berg" }, undefined, "signed.verdict.value"],
      ["complete", { text: "Hallo Frau Berg" }, undefined, "signed.verdict.value"],
    ]);
    // Leaving the activity ends the grant's lifetime.
    session.status("disposed");
    assert.equal(created.llm[0].signal.aborted, true);
  } finally {
    cleanups.forEach((callback) => callback());
    scope.stop();
  }
});

// Review 24.09. H1, N2 and N7 at the module-facing host.
test("the ungraded way on is closed without a host decision, while locked and after closing", async () => {
  let available = false;
  const requested = [];
  const seen = [];
  const llm = {
    info: async () => null,
    respond: async (request, options) => {
      seen.push(options);
      return { ok: true, outputs: [] };
    },
    grade: async (answer, options) => {
      seen.push(options);
      return { ok: true, passed: true, counts: false };
    },
    label: () => ({}),
    fallbackAvailable: () => available,
  };
  const without = setup({ llm });
  await without.session.start();
  assert.equal(without.host.llm.fallbackComplete(), false, "no player wiring, no completion");

  const f = setup({
    llm,
    fallbackComplete: () => {
      requested.push(available);
      return available;
    },
  });
  await f.session.start();
  assert.deepEqual([f.host.llm.fallbackAvailable(), f.host.llm.fallbackComplete()], [false, false]);
  available = true;
  assert.deepEqual([f.host.llm.fallbackAvailable(), f.host.llm.fallbackComplete()], [true, true]);
  f.session.update({ ...context, disabled: true });
  assert.equal(f.host.llm.fallbackComplete(), false, "a locked activity cannot complete");
  f.session.update(context);

  // Options a module gets wrong are ignored instead of throwing (N2).
  const request = { profile: "chat", input: [] };
  assert.equal((await f.host.llm.respond(request, null)).ok, true);
  assert.equal((await f.host.llm.respond(request, { signal: {}, onDelta: 1 })).ok, true);
  assert.equal((await f.host.llm.grade("answer", null)).ok, true);
  assert.equal((await f.host.llm.grade("answer", { signal: "x", profile: 3 })).ok, true);
  assert.deepEqual(seen, [
    { signal: undefined },
    { signal: undefined },
    { signal: undefined },
    { signal: undefined },
  ]);
  const listen = new AbortController();
  await f.host.llm.grade("answer", { signal: listen.signal, profile: "grader" });
  assert.deepEqual(seen.at(-1), { signal: listen.signal, profile: "grader" });

  // A non-object is a programming error with the documented type (N7).
  assert.throws(() => f.host.change("text"), TypeError);
  assert.throws(() => f.host.complete(null), TypeError);

  f.session.dispose();
  assert.deepEqual([f.host.llm.fallbackAvailable(), f.host.llm.fallbackComplete()], [false, false]);
  assert.deepEqual(requested, [false, true]);
});

const { LLM_FALLBACK_ANSWER } = await import(
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(
      await readFile(new URL("../utils/learningLlm.ts", import.meta.url), "utf8"),
      { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }
    ).outputText
  ).toString("base64")}`
);

async function customActivity(llm, extraProps = {}) {
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
  const props = Vue.reactive({
    module: { ...descriptor },
    ...context,
    unitId: "llm-unit",
    courseId: "llm-course",
    request: async () => ({}),
    ...extraProps,
  });
  const events = [];
  const sessions = [];
  const mounts = [];
  const cleanups = [];
  const bindings = {
    ...Vue,
    ...assessmentModule,
    learningModuleIdentity,
    LLM_FALLBACK_ANSWER,
    window: { location: { origin: "https://bootstrap.example" } },
    defineProps: () => props,
    defineEmits:
      () =>
      (name, ...args) =>
        events.push([name, ...args]),
    defineExpose: () => {},
    useI18n: () => ({ t: (key) => key }),
    useHeartInfo: () => Vue.ref(null),
    useLearningGateway: () => ({ send: () => {} }),
    createLearningLlm: () => llm,
    createLearningProject: () => ({}),
    onMounted: (callback) => mounts.push(callback),
    onBeforeUnmount: (callback) => cleanups.push(callback),
    createLearningModuleSession: (options) => {
      sessions.push(options);
      return { start() {}, update() {}, dispose() {} };
    },
  };
  const scope = Vue.effectScope();
  const fixture = scope.run(() =>
    new Function(...Object.keys(bindings), `${compiled}\nreturn {surface};`)(
      ...Object.values(bindings)
    )
  );
  fixture.surface.value = { ownerDocument: "document" };
  mounts.forEach((callback) => callback());
  return {
    session: sessions[0],
    events,
    props,
    stop() {
      cleanups.forEach((callback) => callback());
      scope.stop();
    },
  };
}

test("the real custom activity completes ungraded only after a fallback, never with a verdict it lacks", async () => {
  let available = false;
  let proof = null;
  const f = await customActivity(
    {
      peekProof: () => proof && { ...proof },
      fallbackAvailable: () => available,
    },
    { completionKind: "llm-verdict" }
  );
  try {
    assert.equal(f.session.fallbackComplete(), false, "the model works: grading decides");
    assert.deepEqual(f.events, []);
    available = true;
    assert.equal(f.session.fallbackComplete(), true);
    assert.deepEqual(f.events, [["complete", { fallback: "example" }]]);
    // A counting pass is the stronger result and completes as graded.
    proof = { text: "Hallo Frau Berg", verdict: "signed.verdict.value" };
    assert.equal(f.session.fallbackComplete(), true);
    assert.deepEqual(f.events.at(-1), [
      "complete",
      { text: "Hallo Frau Berg" },
      undefined,
      "signed.verdict.value",
    ]);
  } finally {
    f.stop();
  }
  // An activity bound to a challenge exercise keeps its own completion authority.
  const exercise = await customActivity(
    { peekProof: () => null, fallbackAvailable: () => true },
    { exercise: { type: "coding", task_id: "t", subtask_id: "s" }, completionKind: "llm-verdict" }
  );
  try {
    assert.equal(exercise.session.fallbackComplete(), false);
  } finally {
    exercise.stop();
  }
});

// skills-ms `completion_kind`: only a unit it completes by verdict takes the ungraded completion.
test("the real custom activity offers the ungraded way on only where skills-ms completes by verdict", async () => {
  for (const completionKind of ["introduced", null, undefined, "LLM-VERDICT"]) {
    const f = await customActivity(
      { peekProof: () => null, fallbackAvailable: () => true },
      { completionKind }
    );
    try {
      assert.equal(f.session.llm.fallbackAvailable(), false, String(completionKind));
      assert.equal(f.session.fallbackComplete(), false, String(completionKind));
      assert.deepEqual(f.events, [], "nothing goes out");
      // The kind comes with the room; when it says graded by verdict, the way on follows.
      f.props.completionKind = "llm-verdict";
      assert.equal(f.session.llm.fallbackAvailable(), true);
      assert.equal(f.session.fallbackComplete(), true);
      assert.deepEqual(f.events, [["complete", { fallback: "example" }]]);
    } finally {
      f.stop();
    }
  }
  // A counting pass at a unit that is not graded by verdict still goes out as before.
  const proof = { text: "Hallo", verdict: "signed.verdict.value" };
  const introduced = await customActivity(
    { peekProof: () => ({ ...proof }), fallbackAvailable: () => true },
    { completionKind: "introduced" }
  );
  try {
    assert.equal(introduced.session.fallbackComplete(), false);
    introduced.session.complete({ answer: 6 });
    assert.deepEqual(introduced.events, [
      ["complete", { text: "Hallo" }, undefined, "signed.verdict.value"],
    ]);
  } finally {
    introduced.stop();
  }
});

test("a verdict refused by skills-ms for good ends counting grades in the mounted activity", async () => {
  let refusals = 0;
  const llm = {
    peekProof: () => null,
    fallbackAvailable: () => refusals > 0,
    refuseVerdicts: () => refusals++,
  };
  const f = await customActivity(llm, { completionKind: "llm-verdict" });
  try {
    assert.equal(refusals, 0);
    assert.equal(f.session.llm.fallbackAvailable(), false);
    f.props.gradingRefused = true;
    await Vue.nextTick();
    assert.equal(refusals, 1);
    assert.equal(f.session.llm.fallbackAvailable(), true);
    assert.equal(f.session.fallbackComplete(), true);
    assert.deepEqual(f.events, [["complete", { fallback: "example" }]]);
    // The notice going away does not bring counting grades back.
    f.props.gradingRefused = false;
    await Vue.nextTick();
    assert.equal(refusals, 1);
  } finally {
    f.stop();
  }
  // A remount while the refusal is shown starts refused as well.
  refusals = 0;
  const remounted = await customActivity(llm, {
    completionKind: "llm-verdict",
    gradingRefused: true,
  });
  try {
    assert.equal(refusals, 1);
  } finally {
    remounted.stop();
  }
});
