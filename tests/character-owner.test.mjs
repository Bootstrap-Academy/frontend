import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse } from "@vue/compiler-sfc";
import * as vue from "vue";
import ts from "typescript";

const pageSource = await readFile(new URL("../pages/dashboard/index.vue", import.meta.url), "utf8");
const userSource = await readFile(new URL("../composables/user.ts", import.meta.url), "utf8");
const dataSource = await readFile(new URL("../utils/dashboardData.ts", import.meta.url), "utf8");
const { descriptor } = parse(pageSource);

function statements(source, include = (node) => !ts.isImportDeclaration(node)) {
  const file = ts.createSourceFile("fixture.ts", source, ts.ScriptTarget.Latest, true);
  return file.statements
    .filter(include)
    .map((node) => node.getText(file).replace(/^export\s+/, ""))
    .join("\n");
}

function evaluate(source, bindings, exports) {
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
  }).outputText;
  return new Function(...Object.keys(bindings), `${code}\nreturn { ${exports.join(", ")} };`)(
    ...Object.values(bindings)
  );
}

const { createDashboardData } = evaluate(statements(dataSource), {}, ["createDashboardData"]);
const setupSource = statements(descriptor.scriptSetup.content);
const authSource = statements(
  userSource,
  (node) =>
    ts.isFunctionDeclaration(node) && ["setStates", "getAccessToken"].includes(node.name.text)
);
const settle = () => new Promise(setImmediate);
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};

function fixture(t, get, roomsEnabled = false) {
  const user = vue.ref({ id: "A", name: "Person A" });
  const session = vue.ref({ id: "session-A" });
  const accessToken = vue.ref("token-A");
  const refreshToken = vue.ref("refresh-A");
  const cookies = new Map([["accessToken", vue.ref("token-A")]]);
  const state = new Map();
  const calls = [];
  const navigation = [];
  const cleanups = [];
  const scope = vue.effectScope();
  const useState = (key, initial) => {
    if (!state.has(key)) state.set(key, vue.ref(initial()));
    return state.get(key);
  };
  const authBindings = {
    useUser: () => user,
    useSession: () => session,
    useAccessToken: () => accessToken,
    useRefreshToken: () => refreshToken,
    setUser: (value) => (user.value = value),
    useProfileLoaded: () => useState("profileLoaded", () => true),
    useAppCookie: (key) => {
      if (!cookies.has(key)) cookies.set(key, vue.ref(null));
      return cookies.get(key);
    },
    isOnPublicLegalRoute: () => true,
  };
  const auth = evaluate(authSource, authBindings, ["setStates", "getAccessToken"]);
  const response = (path, token) => {
    if (path === "/skills/xp/me")
      return {
        total_xp: token.startsWith("token-B") ? 20 : 10,
        total_level: 1,
        progress: 0.2,
        skills: [],
      };
    if (path === "/skills/skilltree")
      return { skills: [{ id: "programming", name: "Programmieren", skills: [] }] };
    if (path.startsWith("/skills/courses")) return [];
    throw new Error(`Unexpected request: ${path}`);
  };
  const page = scope.run(() =>
    evaluate(
      setupSource,
      {
        computed: vue.computed,
        reactive: vue.reactive,
        ref: vue.ref,
        shallowRef: vue.shallowRef,
        watch: vue.watch,
        ...authBindings,
        useState,
        useRuntimeConfig: () => ({ public: { learningRoomsEnabled: roomsEnabled } }),
        $fetch: async () => ({ enabled: roomsEnabled }),
        useI18n: () => ({ t: (key) => key, locale: vue.ref("de") }),
        definePageMeta: () => {},
        useHead: () => {},
        useRouter: () => ({ push: async (route) => navigation.push(route) && undefined }),
        onBeforeUnmount: (cleanup) => cleanups.push(cleanup),
        createDashboardData,
        GET: async (path) => {
          const token = auth.getAccessToken();
          calls.push({ path, token });
          return get ? get(path, token, response) : response(path, token);
        },
      },
      ["view", "focus", "details", "practiceMessage", "practiceLabel", "startPractice", "reload"]
    )
  );
  t.after(() => {
    cleanups.forEach((cleanup) => cleanup());
    scope.stop();
  });
  return {
    page,
    calls,
    navigation,
    transition(id, token = `token-${id}`) {
      auth.setStates({
        user: { id, name: `Person ${id}` },
        session: { id: `session-${id}` },
        access_token: token,
        refresh_token: `refresh-${id}`,
      });
    },
  };
}

test("account replacement clears immediately and reads only after setStates updates its cookie", async (t) => {
  const f = fixture(t);
  await settle();
  assert.equal(f.page.view.value.xp.total_xp, 10);
  f.calls.length = 0;
  f.page.details.private = { status: "ready", names: new Map() };
  f.transition("B");
  assert.equal(f.page.view.value.xp, null);
  assert.deepEqual(Object.keys(f.page.details), []);
  assert.equal(f.calls.length, 0);
  await settle();
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every((call) => call.token === "token-B"));
  assert.equal(f.page.view.value.owner, "B:session-B");
  assert.equal(f.page.view.value.xp.total_xp, 20);
});

test("a token replacement for the same session refreshes data after the new cookie is installed", async (t) => {
  const f = fixture(t);
  await settle();
  f.page.focus.value = "programming";
  f.calls.length = 0;
  f.transition("A", "token-A-renewed");
  assert.equal(f.page.view.value.xp, null);
  assert.equal(f.calls.length, 0);
  await settle();
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every((call) => call.token === "token-A-renewed"));
  assert.equal(f.page.view.value.owner, "A:session-A");
  assert.equal(f.page.focus.value, "programming");
});

test("an old practice callback cannot affect a session switched away and back to the same owner", async (t) => {
  const exercise = deferred();
  const f = fixture(t, (path, token, response) =>
    path.startsWith("/challenges/subtasks?") ? exercise.promise : response(path, token)
  );
  await settle();
  const pending = f.page.startPractice();
  f.transition("B");
  f.transition("A");
  await settle();
  exercise.resolve([
    {
      id: "old-question",
      task_id: "old-task",
      type: "MULTIPLE_CHOICE_QUESTION",
      enabled: true,
      retired: false,
      solved: false,
    },
  ]);
  await pending;
  assert.deepEqual(f.navigation, []);
  assert.equal(f.page.practiceMessage.value, "");
});

test("a removed focus is cleared when the catalogue arrives before the remaining dashboard reads", async (t) => {
  let refreshing = false;
  const xp = deferred();
  const f = fixture(t, (path, token, response) => {
    if (refreshing && path === "/skills/xp/me") return xp.promise;
    if (refreshing && path === "/skills/skilltree") return { skills: [] };
    return response(path, token);
  });
  await settle();
  f.page.focus.value = "programming";
  refreshing = true;
  f.page.reload();
  await settle();
  assert.equal(f.page.view.value.status, "loading");
  assert.equal(f.page.focus.value, "programming");
  xp.resolve({ total_xp: 10, total_level: 1, progress: 0.2, skills: [] });
  await settle();
  assert.equal(f.page.view.value.status, "ready");
  assert.equal(f.page.focus.value, "");
});

test("enabled learning rooms preserve an explicit focus and label the selected destination", async (t) => {
  const f = fixture(
    t,
    (path, token, response) => {
      if (path === "/skills/skilltree")
        return { skills: [{ id: "topic-a", name: "Topic A", skills: ["subtopic-a"] }] };
      if (path === "/challenges/skills/subtopic-a/tasks") return [{ id: "task-a" }];
      if (path.startsWith("/challenges/subtasks?"))
        return [
          {
            id: "question-a",
            task_id: "task-a",
            creator: "another-user",
            type: "MULTIPLE_CHOICE_QUESTION",
            coins: 0,
            enabled: true,
            retired: false,
            solved: false,
          },
        ];
      return response(path, token);
    },
    true
  );
  await settle();
  f.page.focus.value = "topic-a";
  assert.equal(f.page.practiceLabel.value, "CharacterDashboard.Practice");
  await f.page.startPractice();
  assert.deepEqual(f.navigation, [
    "/quizzes/solve-task-a?quizzesFrom=quiz&taskId=task-a&querySubTaskId=question-a",
  ]);
  assert.ok(f.calls.some(({ path }) => path === "/challenges/skills/subtopic-a/tasks"));
  const previousReads = f.calls.length;
  f.page.focus.value = "";
  assert.equal(f.page.practiceLabel.value, "LearningRooms.ContinueLearning");
  await f.page.startPractice();
  assert.equal(f.navigation.at(-1), "/learn");
  assert.equal(f.calls.length, previousReads);
});
