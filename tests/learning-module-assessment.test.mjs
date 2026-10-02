import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import ts from "typescript";

const url = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
const exerciseUrl = url(
  compile(await readFile(new URL("../utils/learningExercise.ts", import.meta.url), "utf8"))
);
const assessmentSource = await readFile(
  new URL("../utils/learningModuleAssessment.ts", import.meta.url),
  "utf8"
);
const assessmentModule = await import(
  url(compile(assessmentSource).replace('"./learningExercise"', JSON.stringify(exerciseUrl)))
);
const { createLearningModuleAssessment, learningModuleState } = assessmentModule;
const { learningModuleIdentity } = await import(
  url(compile(await readFile(new URL("../utils/learningModule.ts", import.meta.url), "utf8")))
);
const reference = { type: "multiple_choice", task_id: "bound-task", subtask_id: "bound-question" };
const question = {
  ...reference,
  id: reference.subtask_id,
  enabled: true,
  creator: "teacher",
  solved: false,
  answers: ["A", "B"],
  single_choice: true,
};
const defer = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};
const tick = async () => {
  await new Promise(setImmediate);
  await Vue.nextTick();
};

function fixture(overrides = {}) {
  let state = overrides.state || { exploration: { value: 3 } };
  let view;
  const calls = [],
    busy = [],
    hearts = [];
  const selected = overrides.reference || reference;
  const exercise = { ...question, ...selected, id: selected.subtask_id, ...(overrides.data || {}) };
  const request = async (path, method = "GET", body) => {
    calls.push({ path, method, body: body && structuredClone(body) });
    if (overrides.request) {
      const value = await overrides.request(path, method, body);
      if (value !== undefined) return value;
    }
    if (path.startsWith("/shop/premium/")) return { premium: false };
    if (path.startsWith("/shop/hearts/")) return { hearts: 4 };
    if (method === "POST")
      return { solved: body.answers?.[1] === true, attempt_id: "real-attempt" };
    return structuredClone(exercise);
  };
  const options = {
    activityId: "bound-activity",
    reference: selected,
    userId: "owner",
    reviewId: overrides.reviewId,
    state,
    request,
    disabled: () => false,
    save: overrides.save || (async () => true),
    changed: (next) => {
      state = next;
    },
    updated: (next) => {
      view = next;
    },
    busy: (next) => busy.push(next),
    heartsChanged: (next) => hearts.push(next),
  };
  const assessment = createLearningModuleAssessment(options);
  return {
    assessment,
    calls,
    busy,
    hearts,
    options,
    get state() {
      return state;
    },
    get view() {
      return view;
    },
  };
}

test("custom assessments use only the bound challenge, validate answer fields and keep server proofs private", async () => {
  const f = fixture();
  await f.assessment.load();
  assert.equal(f.view.view.phase, "ready");
  assert.equal(f.assessment.completion(), null);
  f.view.view.data.answers.push("outside mutation");
  assert.equal(await f.assessment.submit({ answers: [true, true] }), false);
  assert.equal(await f.assessment.submit({ answers: [true, false, true] }), false);
  assert.equal(
    await f.assessment.submit({
      answers: [false, true],
      attempt_id: "forged",
      url: "/foreign",
      environment: "ignored",
    }),
    true
  );
  assert.deepEqual(
    f.calls.filter((call) => call.method === "POST"),
    [
      {
        path: "/challenges/tasks/bound-task/multiple_choice/bound-question/attempts",
        method: "POST",
        body: { answers: [false, true] },
      },
    ]
  );
  assert.deepEqual(f.assessment.completion(), { attemptId: "real-attempt" });
  assert.deepEqual(f.view.draft, { answers: [false, true] });
  const checkpoint = structuredClone(f.state.__academy_assessment);
  f.assessment.changeModuleState({
    exploration: { value: 7 },
    __academy_assessment: { draft: { attempt_id: "forged" } },
  });
  assert.deepEqual(f.state.__academy_assessment, checkpoint);
  assert.deepEqual(learningModuleState(f.state), { exploration: { value: 7 } });
  assert.deepEqual(f.hearts, [{ hearts: 4 }]);
  f.assessment.dispose();
});

test("incorrect answers cannot complete and a later correct attempt uses the same controller", async () => {
  const f = fixture();
  await f.assessment.load();
  await f.assessment.submit({ answers: [true, false] });
  assert.equal(f.view.view.phase, "incorrect");
  assert.equal(f.assessment.completion(), null);
  await f.assessment.submit({ answers: [false, true] });
  assert.equal(f.view.view.phase, "correct");
  assert.equal(f.calls.filter((call) => call.method === "POST").length, 2);
  f.assessment.dispose();
});

test("matching submits only a complete one-to-one mapping", async () => {
  const f = fixture({
    reference: { ...reference, type: "matching" },
    data: { left: ["A", "B"], right: ["1", "2"] },
    request: (_path, method) =>
      method === "POST" ? { solved: true, attempt_id: "matching-attempt" } : undefined,
  });
  await f.assessment.load();
  assert.equal(await f.assessment.submit({ answer: [1, 1] }), false);
  assert.equal(await f.assessment.submit({ answer: [1, 2] }), false);
  assert.equal(await f.assessment.submit({ answer: [1, 0] }), true);
  assert.deepEqual(f.calls.find((call) => call.method === "POST").body, { answer: [1, 0] });
  assert.deepEqual(f.assessment.completion(), { attemptId: "matching-attempt" });
  f.assessment.dispose();
});

test("lost responses persist uncertainty across reload and require an explicit new attempt", async () => {
  const f = fixture({
    request: (_path, method) => {
      if (method === "POST") throw new Error("lost");
    },
  });
  await f.assessment.load();
  await f.assessment.submit({ answers: [false, true] });
  assert.equal(f.view.view.phase, "uncertain");
  assert.equal(f.state.__academy_assessment.draft.submission_unknown, true);
  f.assessment.dispose();
  const resumed = fixture({ state: f.state });
  await resumed.assessment.load();
  assert.equal(resumed.view.view.phase, "uncertain");
  await resumed.assessment.check();
  assert.equal(resumed.view.view.phase, "uncertain");
  assert.equal(
    resumed.calls.some((call) => call.method === "POST"),
    false
  );
  await resumed.assessment.newAttempt();
  assert.equal(resumed.view.view.phase, "ready");
  assert.deepEqual(resumed.state.exploration, { value: 3 });
  await resumed.assessment.submit({ answers: [false, true] });
  assert.equal(resumed.calls.filter((call) => call.method === "POST").length, 1);
  resumed.assessment.dispose();
});

test("coding loads public examples and completes only the exact returned submission", async () => {
  const selected = { ...reference, type: "coding" };
  const f = fixture({
    reference: selected,
    request: (path, method) => {
      if (path.endsWith("/environments")) return { Python: {} };
      if (path.endsWith("/examples")) return [{ id: "example", input: "3", output: "6" }];
      if (path.endsWith("/submissions"))
        return method === "POST"
          ? { id: "own-submission" }
          : [
              { id: "another-submission", result: { verdict: "WA" } },
              { id: "own-submission", result: { verdict: "OK" } },
            ];
    },
  });
  await f.assessment.load();
  assert.equal(f.view.view.examples[0].output, "6");
  assert.equal(await f.assessment.submit({ code: "print(6)", environment: "foreign" }), false);
  await f.assessment.submit({ code: "print(6)" });
  assert.deepEqual(f.assessment.completion(), { attemptId: "own-submission" });
  assert.equal(f.state.__academy_assessment.draft.submission_id, "own-submission");
  assert.deepEqual(f.calls.find((call) => call.method === "POST").body, {
    code: "print(6)",
    environment: "Python",
  });
  f.assessment.dispose();
});

test("review scope ignores historical solved and another review's private checkpoint", async () => {
  const old = fixture({ reviewId: "old-review" });
  await old.assessment.load();
  await old.assessment.submit({ answers: [false, true] });
  old.assessment.dispose();
  const current = fixture({ state: old.state, reviewId: "new-review", data: { solved: true } });
  await current.assessment.load();
  assert.equal(current.view.view.phase, "ready");
  assert.deepEqual(current.view.draft, {});
  assert.equal(current.assessment.completion(), null);
  await current.assessment.submit({ answers: [false, true] });
  assert.deepEqual(current.assessment.completion(), { attemptId: "real-attempt" });
  current.assessment.dispose();
});

test("module edits retain an in-flight checkpoint and disposal during preparation never dispatches", async () => {
  const pending = defer();
  const f = fixture({ save: () => pending.promise });
  await f.assessment.load();
  const submitting = f.assessment.submit({ answers: [false, true] });
  f.assessment.changeModuleState({ note: "edited while saving" });
  assert.equal(f.state.note, "edited while saving");
  assert.equal(f.state.__academy_assessment.draft.submission_unknown, true);
  f.assessment.dispose();
  pending.resolve(true);
  await submitting;
  assert.equal(
    f.calls.some((call) => call.method === "POST"),
    false
  );
  assert.equal(await f.assessment.submit({ answers: [true, false] }), false);
});

for (const rotateGrant of [false, true])
  test(`the actual CustomActivity keeps its assessment through saved projections${rotateGrant ? " and private grant rotation" : ""}`, async () => {
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
    const pending = defer();
    const f = fixture({
      request: (_path, method) => (method === "POST" ? pending.promise : undefined),
    });
    const props = Vue.reactive({
      module: {
        id: "custom-assessment",
        api_version: 1,
        entry_url: rotateGrant
          ? `https://api.example/skills/lesson-assets/${"a".repeat(43)}/${"1".repeat(64)}/index.js`
          : "https://lessons.example/test.js",
      },
      activityId: "bound-activity",
      exercise: reference,
      userId: "owner",
      state: { note: "keep" },
      content: {},
      locale: "de",
      disabled: false,
      request: f.options.request,
      save: async () => {
        if (rotateGrant)
          props.module = {
            ...props.module,
            entry_url: props.module.entry_url.replace("a".repeat(43), "b".repeat(43)),
          };
        await Vue.nextTick();
        return true;
      },
    });
    const mounted = [],
      cleanups = [],
      sessions = [],
      events = [];
    const bindings = {
      ...Object.fromEntries(Object.entries(Vue).filter(([name]) => name !== "module.exports")),
      ...assessmentModule,
      learningModuleIdentity,
      window: { location: { origin: "https://academy.example" } },
      defineProps: () => props,
      defineExpose: () => {},
      useI18n: () => ({ t: (key) => key }),
      useHeartInfo: () => Vue.ref(null),
      defineEmits:
        () =>
        (name, ...args) => {
          events.push({ name, args });
          if (name === "change") props.state = args[0];
        },
      onMounted: (callback) => mounted.push(callback),
      onBeforeUnmount: (callback) => cleanups.push(callback),
      createLearningModuleSession: (options) => {
        sessions.push(options);
        return {
          start() {},
          update() {},
          dispose() {
            options.busy(false);
          },
        };
      },
    };
    const scope = Vue.effectScope();
    try {
      const component = scope.run(() =>
        new Function(
          ...Object.keys(bindings),
          `${compile(body)}\nreturn {surface, context, start};`
        )(...Object.values(bindings))
      );
      component.surface.value = {};
      mounted.forEach((callback) => callback());
      await tick();
      assert.equal(sessions.length, 1);
      sessions[0].complete({ fake: "success" }, "forged-attempt");
      assert.equal(events.filter((event) => event.name === "complete").length, 0);
      const submitted = sessions[0].assessment.submit({ answers: [false, true] });
      await tick();
      assert.equal(events.filter((event) => event.name === "posting").at(-1).args[0], true);
      sessions[0].busy(false);
      assert.equal(events.filter((event) => event.name === "posting").at(-1).args[0], true);
      sessions[0].change({
        note: "updated",
        __academy_assessment: { draft: { attempt_id: "forged" } },
      });
      await tick();
      assert.equal(sessions.length, 1);
      assert.equal(component.context.value.state.__academy_assessment, undefined);
      assert.equal(props.state.__academy_assessment.draft.submission_unknown, true);
      pending.resolve({ solved: true, attempt_id: "server-attempt" });
      await submitted;
      await tick();
      assert.equal(component.context.value.assessment.view.phase, "correct");
      assert.equal(props.state.note, "updated");
      sessions[0].complete({ value: 1 }, "forged-attempt");
      assert.deepEqual(events.filter((event) => event.name === "complete").at(-1).args, [
        { value: 1 },
        "server-attempt",
      ]);
      component.start();
      assert.equal(sessions.length, 2);
      assert.equal(sessions[1].assessment, sessions[0].assessment);
      assert.equal(f.calls.filter((call) => call.method === "POST").length, 1);
    } finally {
      cleanups.forEach((callback) => callback());
      scope.stop();
      f.assessment.dispose();
    }
  });

test("the custom assessment bridge passes strict TypeScript checking", () => {
  const program = ts.createProgram(
    [new URL("../utils/learningModuleAssessment.ts", import.meta.url).pathname],
    {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: [],
    }
  );
  assert.deepEqual(
    ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")),
    []
  );
});

for (const file of ["CustomActivity.vue", "ActivityHost.vue"])
  test(`${file} retries a failed import with a fresh page only after preserving work`, async () => {
    const source = await readFile(
      new URL(`../components/learning/${file}`, import.meta.url),
      "utf8"
    );
    const script = parse(source).descriptor.scriptSetup.content;
    const ast = ts.createSourceFile("retry.ts", script, ts.ScriptTarget.Latest, true);
    const body = ast.statements
      .filter((node) => !ts.isImportDeclaration(node))
      .map((node) => node.getText(ast))
      .join("\n");
    const pending = defer();
    const props = Vue.reactive({
      activity: { id: "room", kind: "custom" },
      module: { id: "custom", api_version: 1, entry_url: "https://lessons.example/module.js" },
      state: { keep: "my work" },
      content: {},
      locale: "de",
      disabled: false,
      save: () => pending.promise,
    });
    let reloads = 0;
    const mounted = [],
      cleanups = [];
    const bindings = {
      ...Object.fromEntries(Object.entries(Vue).filter(([name]) => name !== "module.exports")),
      ...assessmentModule,
      learningModuleIdentity,
      window: { location: { origin: "https://academy.example", reload: () => reloads++ } },
      defineProps: () => props,
      defineEmits: () => () => {},
      defineExpose: () => {},
      useI18n: () => ({ t: (key) => key }),
      useHeartInfo: () => Vue.ref(null),
      onMounted: (callback) => mounted.push(callback),
      onBeforeUnmount: (callback) => cleanups.push(callback),
      onErrorCaptured: () => {},
      activityRenderer: () => "custom",
      activityContent: () => ({}),
      loadActivityRenderer: async () => {
        throw new Error("import failed");
      },
      createLearningModuleSession: (options) => ({
        start() {
          options.status("error");
        },
        update() {},
        dispose() {},
        cancelPreparation() {},
      }),
    };
    const scope = Vue.effectScope();
    try {
      const component = scope.run(() =>
        new Function(
          ...Object.keys(bindings),
          `${compile(body)}\nreturn {retry,retryError${file === "CustomActivity.vue" ? ",surface" : ""}};`
        )(...Object.values(bindings))
      );
      if (component.surface) component.surface.value = {};
      mounted.forEach((callback) => callback());
      await tick();
      const retry = component.retry();
      assert.equal(reloads, 0);
      pending.resolve(false);
      await retry;
      assert.equal(reloads, 0);
      assert.equal(component.retryError.value, true);
      props.save = async () => true;
      await component.retry();
      assert.equal(reloads, 1);
      assert.equal(component.retryError.value, false);
    } finally {
      cleanups.forEach((callback) => callback());
      scope.stop();
    }
  });
