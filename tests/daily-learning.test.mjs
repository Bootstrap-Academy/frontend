import { decodeApiError } from "../utils/apiError.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as Vue from "vue";

async function evaluate(file, bindings, exported) {
  bindings = { decodeApiError, ...bindings };
  const input = (await readFile(new URL(`../${file}`, import.meta.url), "utf8")).replaceAll(
    "import.meta.client",
    "true"
  );
  const code = ts
    .transpileModule(input, {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    })
    .outputText.replace(/^import .*?;\n/gm, "")
    .replaceAll("export function", "function");
  return new Function(...Object.keys(bindings), code + `\nreturn {${exported}};`)(
    ...Object.values(bindings)
  );
}
const helpers = await evaluate(
  "utils/dailyLearning.ts",
  {},
  "dailyLearning,dailyBlocked,dailyError"
);
const status = (patch = {}) => ({
  mode: "daily",
  enforced: true,
  limit: 3,
  used: 2,
  remaining: 1,
  resets_at: new Date(Date.now() + 3600000).toISOString(),
  timezone: "Europe/Berlin",
  unlimited: false,
  started: false,
  can_start: true,
  exempt: null,
  ...patch,
});
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};

test("the daily boundary never blocks a started, bought or premium lesson; shadow never warns", () => {
  assert.equal(helpers.dailyBlocked(status({ remaining: 0, can_start: false })), true);
  for (const patch of [
    { started: true },
    { exempt: "purchase" },
    { unlimited: true },
    { mode: "shadow" },
    { enforced: false },
  ])
    assert.equal(helpers.dailyBlocked(status({ remaining: 0, can_start: false, ...patch })), false);
  assert.equal(helpers.dailyLearning(status({ remaining: -1 })), null);
});

async function stateFixture(t, get) {
  const user = Vue.ref({ id: "a" }),
    session = Vue.ref({ id: "s" }),
    premium = Vue.ref({ premium: false });
  const state = new Map(),
    cleanup = [],
    timers = [];
  const scope = Vue.effectScope();
  const bindings = {
    ...Object.fromEntries(Object.entries(Vue).filter(([name]) => name !== "module.exports")),
    ...helpers,
    useUser: () => user,
    useSession: () => session,
    usePremiumInfo: () => premium,
    useState: (key, initial) => {
      if (!state.has(key)) state.set(key, Vue.ref(initial()));
      return state.get(key);
    },
    GET: get,
    setTimeout: (callback, ms) => {
      timers.push({ callback, ms });
      return timers.length;
    },
    clearTimeout: () => {},
    onMounted: () => {},
    onBeforeUnmount: (fn) => cleanup.push(fn),
    window: { removeEventListener() {} },
    document: { removeEventListener() {}, visibilityState: "visible" },
  };
  const { useDailyLearning } = await evaluate(
    "composables/useDailyLearning.ts",
    bindings,
    "useDailyLearning"
  );
  const api = scope.run(useDailyLearning);
  t.after(() => {
    cleanup.forEach((fn) => fn());
    scope.stop();
  });
  return { api, user, session, state, timers, remount: () => scope.run(useDailyLearning) };
}
test("a late count read cannot restore the allowance consumed by an action", async (t) => {
  const waiting = deferred();
  const { api } = await stateFixture(t, (p) =>
    p === "/skills/daily-limit"
      ? waiting.promise
      : Promise.resolve({ mode: "daily", premium: false })
  );
  api.observe(
    status({ used: 3, remaining: 0, started: true, exempt: "started" }),
    "course",
    "lesson"
  );
  waiting.resolve(status());
  await tick();
  assert.equal(api.daily.value.remaining, 0);
  assert.equal(api.forLesson("course", "lesson").started, true);
});
test("a bought course exemption never grants unlimited learning to another course", async (t) => {
  const { api } = await stateFixture(t, (p) =>
    Promise.resolve(p === "/skills/daily-limit" ? status() : { mode: "daily", premium: false })
  );
  await tick();
  api.observe(status({ unlimited: true, remaining: null, exempt: "purchase" }), "bought", "lesson");
  assert.equal(api.daily.value.unlimited, false);
  assert.equal(api.daily.value.remaining, 1);
  assert.equal(api.forLesson("other", "lesson", status()).unlimited, false);
  assert.equal(api.forLesson("bought", "lesson").unlimited, true);
});
test("account changes discard a former learner's delayed count and policy", async (t) => {
  const old = [];
  const { api, user } = await stateFixture(t, () => {
    const d = deferred();
    old.push(d);
    return d.promise;
  });
  user.value = { id: "b" };
  old[0].resolve(status({ used: 3, remaining: 0 }));
  old[1].resolve({ mode: "daily", premium: true });
  await tick();
  assert.equal(api.daily.value, null);
  assert.equal(api.mode.value, null);
  assert.equal(api.showHearts.value, false);
  old[2].resolve(status({ mode: "shadow", enforced: false, remaining: null }));
  old[3].resolve({ mode: "shadow", premium: false });
  await tick();
  assert.equal(api.mode.value, "shadow");
});

async function startFixture(
  t,
  { read = status(), post = async () => status({ started: true }) } = {}
) {
  const user = Vue.ref({ id: "a" }),
    session = Vue.ref({ id: "s" }),
    course = Vue.ref("course"),
    lesson = Vue.ref("lesson");
  const reads = [],
    writes = [],
    cleanup = [];
  const scope = Vue.effectScope();
  const shared = {
    mode: Vue.ref(read.mode),
    refresh: async () => {},
    observe: () => {},
    forLesson: (_c, _l, value) => value,
  };
  const { useLessonStart } = await evaluate(
    "composables/useLessonStart.ts",
    {
      ...Object.fromEntries(Object.entries(Vue).filter(([name]) => name !== "module.exports")),
      ...helpers,
      useUser: () => user,
      useSession: () => session,
      useDailyLearning: () => shared,
      GET: async (path) => {
        reads.push(path);
        return { daily: read };
      },
      POST: async (path, body) => {
        writes.push({ path, body });
        return post();
      },
      onBeforeUnmount: (fn) => cleanup.push(fn),
    },
    "useLessonStart"
  );
  const api = scope.run(() => useLessonStart(course, lesson));
  await tick();
  t.after(() => {
    cleanup.forEach((fn) => fn());
    scope.stop();
  });
  return { api, reads, writes, user };
}
test("opening only reads; explicit start retries one idempotent request after a connection loss", async (t) => {
  let fail = true;
  const { api, writes, reads } = await startFixture(t, {
    post: async () => {
      if (fail) throw new Error("offline");
      return status({ started: true });
    },
  });
  assert.equal(reads.length, 1);
  assert.equal(writes.length, 0);
  assert.equal(await api.start(), false);
  assert.equal(api.error.value, true);
  fail = false;
  assert.equal(await api.start(), true);
  assert.equal(writes.length, 2);
  assert.equal(writes[0].body.request_id, writes[1].body.request_id);
});
test("a quota refusal is shown as a daily limit, without reporting a failed answer", async (t) => {
  const daily = status({ used: 3, remaining: 0, can_start: false });
  const { api } = await startFixture(t, {
    post: async () => {
      throw { statusCode: 429, data: { code: "daily_limit_reached", daily } };
    },
  });
  assert.equal(await api.start(), false);
  assert.equal(api.limited.value.remaining, 0);
  assert.equal(api.error.value, false);
});

test("Premium expiry restores the limit for an unopened lesson and preserves started work", async (t) => {
  const { api } = await stateFixture(t, (path) =>
    Promise.resolve(
      path === "/skills/daily-limit"
        ? status({ unlimited: true, remaining: null })
        : { mode: "daily", premium: true }
    )
  );
  await tick();
  api.observe(status({ unlimited: true, remaining: null, exempt: "premium" }), "course", "new");
  api.observe(
    status({ unlimited: true, remaining: null, exempt: "premium", started: true }),
    "course",
    "started"
  );
  api.observe(status({ used: 3, remaining: 0, unlimited: false, can_start: false }));
  assert.equal(helpers.dailyBlocked(api.forLesson("course", "new")), true);
  assert.equal(helpers.dailyBlocked(api.forLesson("course", "started")), false);
  const earlierPreview = status({ mode: "shadow", enforced: false, remaining: null });
  assert.equal(helpers.dailyBlocked(api.forLesson("course", "unopened", earlierPreview)), true);
});

test("a newly mounted view schedules the already-known daily reset", async (t) => {
  const { timers, remount } = await stateFixture(t, (path) =>
    Promise.resolve(path === "/skills/daily-limit" ? status() : { mode: "daily", premium: false })
  );
  await tick();
  const before = timers.length;
  remount();
  assert.equal(timers.length, before + 1);
  assert.ok(timers.at(-1).ms > 0 && timers.at(-1).ms <= 3601000);
});

test("unknown or failed policy never exposes heart sales; two absent endpoints retain legacy compatibility", async (t) => {
  const pending = deferred();
  const unknown = await stateFixture(t, () => pending.promise);
  assert.equal(unknown.api.policyKnown.value, false);
  assert.equal(unknown.api.showHearts.value, false);
  pending.reject({ statusCode: 503 });
  await tick();
  assert.equal(unknown.api.showHearts.value, false);
  const old = await stateFixture(t, async () => {
    throw { statusCode: 404 };
  });
  await tick();
  assert.equal(old.api.mode.value, "legacy");
  assert.equal(old.api.showHearts.value, true);
});

test("legacy quiz, matching and coding quota errors remain structured and clear after restored access", async (t) => {
  const state = Vue.ref(status({ remaining: 0, used: 3, can_start: false }));
  const user = Vue.ref({ id: "a" });
  const scope = Vue.effectScope();
  t.after(() => scope.stop());
  const { useDailyAttemptLimit } = await evaluate(
    "composables/useDailyAttemptLimit.ts",
    {
      ...Object.fromEntries(Object.entries(Vue).filter(([name]) => name !== "module.exports")),
      dailyError: helpers.dailyError,
      useDailyLearning: () => ({
        daily: state,
        observe: (value) => {
          state.value = value;
        },
      }),
      useUser: () => user,
      useSession: () => Vue.ref({ id: "session" }),
    },
    "useDailyAttemptLimit"
  );
  const api = scope.run(useDailyAttemptLimit);
  for (const [file, name] of [
    ["quizzes.ts", "attempQuiz"],
    ["matching.ts", "solveMatching"],
    ["codingChallenges.ts", "createSubmission"],
  ]) {
    const source = await readFile(new URL(`../composables/${file}`, import.meta.url), "utf8");
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const node = ast.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name);
    const code = ts.transpileModule(node.getText(ast).replace(/^export /, ""), {
      compilerOptions: { target: ts.ScriptTarget.ES2023 },
    }).outputText;
    const attempt = new Function("POST", code + `;return ${name}`)(async () => {
      throw { statusCode: 429, data: { code: "daily_limit_reached", daily: state.value } };
    });
    const draft = { code: "private answer", answers: [true], answer: [0] };
    const before = structuredClone(draft);
    const [success, error] = await attempt("course", "unit", draft);
    assert.equal(success, null);
    assert.equal(api.handleLimit(error), true);
    assert.equal(api.attemptLimit.value.remaining, 0);
    assert.deepEqual(draft, before);
  }
  state.value = status({ remaining: 3, used: 0, can_start: true });
  await Vue.nextTick();
  assert.equal(api.attemptLimit.value, null);
  assert.equal(api.handleLimit(new Error("Offline")), false);
});

test("an unavailable policy never promises a free quiz, matching or coding retry", async () => {
  for (const file of [
    "components/form/QuizAnswer.vue",
    "components/form/SolveMatching.vue",
    "components/challenges/CodeEditor.vue",
  ]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    const body = source.match(/const heartFree = computed\(\(\) => \{([\s\S]*?)\}\);/)[1];
    const premiumInfo = Vue.ref({ premium: false }),
      isDaily = Vue.ref(false);
    const actual = Vue.computed(
      new Function("premiumInfo", "isDaily", `return () => {${body}};`)(premiumInfo, isDaily)
    );
    assert.equal(actual.value, false, `${file}: unknown policy retains legacy heart charge`);
    isDaily.value = true;
    assert.equal(actual.value, true, `${file}: confirmed daily policy is heart-free`);
    isDaily.value = false;
    premiumInfo.value = { premium: true };
    assert.equal(actual.value, true, `${file}: existing Premium stays heart-free`);
  }
});
