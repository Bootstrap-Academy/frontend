import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import * as vue from "vue";
import { Mutex } from "async-mutex";
import ts from "typescript";

function evaluate(source, bindings, names) {
  const ast = ts.createSourceFile("module.ts", source, ts.ScriptTarget.Latest, true);
  const body = ast.statements
    .filter((node) => !ts.isImportDeclaration(node))
    .map((node) => node.getText(ast).replace(/^export\s+/, ""))
    .join("\n");
  const code = ts.transpileModule(body, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
  }).outputText;
  return new Function(...Object.keys(bindings), `${code}\nreturn { ${names.join(", ")} };`)(
    ...Object.values(bindings)
  );
}
const transportSource = await readFile(
  new URL("../utils/learningTransport.ts", import.meta.url),
  "utf8"
);
const roomsSource = await readFile(new URL("../utils/learningRooms.ts", import.meta.url), "utf8");
const composableSource = await readFile(
  new URL("../composables/useLearningRooms.ts", import.meta.url),
  "utf8"
);
const { createLearningTransport, createLearningRecovery } = evaluate(transportSource, {}, [
  "createLearningTransport",
  "createLearningRecovery",
]);
const { createLearningRooms } = evaluate(roomsSource, {}, ["createLearningRooms"]);
const token = (expires) =>
  `header.${Buffer.from(JSON.stringify({ exp: expires })).toString("base64url")}.signature`;
const fresh = () => token(Math.floor(Date.now() / 1000) + 3600);
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const settle = () => new Promise(setImmediate);

test("parallel expired reads share refresh, while an unsafe challenge POST is never replayed", async () => {
  let snapshot = {
    identity: "A:S",
    epoch: 1,
    userId: "A",
    sessionId: "S",
    accessToken: token(1),
    refreshToken: "refresh-A",
  };
  const mutex = new Mutex();
  const calls = [];
  const request = createLearningTransport({
    snapshot: () => snapshot,
    lock: () => mutex.acquire(),
    expired: () => {},
    apply: (response) => {
      snapshot = {
        ...snapshot,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      };
    },
    raw: async (path, method, body, access) => {
      calls.push({ path, method, body, access });
      if (path === "/auth/session")
        return {
          user: { id: "A" },
          session: { id: "S" },
          access_token: fresh(),
          refresh_token: "renewed",
        };
      if (method === "POST") throw { statusCode: 401 };
      return {};
    },
  });
  await Promise.all([request("/skills/rooms"), request("/skills/rooms/capabilities")]);
  assert.equal(calls.filter(({ path }) => path === "/auth/session").length, 1);
  await assert.rejects(
    request("/challenges/tasks/a/multiple_choice/b/attempts", "POST", { answers: [true] })
  );
  assert.equal(calls.filter(({ method }) => method === "POST").length, 1);
});

test("an idempotent room write retries its exact request only after a confirmed 401", async () => {
  let snapshot = {
    identity: "A:S",
    epoch: 1,
    userId: "A",
    sessionId: "S",
    accessToken: fresh(),
    refreshToken: "refresh-A",
  };
  const bodies = [];
  const request = createLearningTransport({
    snapshot: () => snapshot,
    lock: async () => () => {},
    expired: () => {},
    apply: (r) => {
      snapshot = { ...snapshot, accessToken: r.access_token, refreshToken: r.refresh_token };
    },
    raw: async (path, method, body) => {
      if (path === "/auth/session")
        return {
          user: { id: "A" },
          session: { id: "S" },
          access_token: fresh(),
          refresh_token: "renewed",
        };
      bodies.push(structuredClone(body));
      if (bodies.length === 1) throw { statusCode: 401 };
      return { ok: true };
    },
  });
  const body = { request_id: "one-id", expected_revision: 4, state: { code: "private draft" } };
  await request("/skills/rooms/unit/state", "PUT", body);
  assert.deepEqual(bodies, [body, body]);
});

test("a delayed refresh cannot restore a session after an account-switch ABA", async () => {
  let snapshot = {
    identity: "A:S",
    epoch: 1,
    userId: "A",
    sessionId: "S",
    accessToken: token(1),
    refreshToken: "refresh-A",
  };
  const pending = deferred();
  let applied = 0;
  const request = createLearningTransport({
    snapshot: () => snapshot,
    lock: async () => () => {},
    expired: () => {},
    apply: () => {
      applied++;
    },
    raw: async () => pending.promise,
  });
  const read = request("/skills/rooms");
  await settle();
  snapshot = { ...snapshot, epoch: 3 };
  pending.resolve({
    user: { id: "A" },
    session: { id: "S" },
    access_token: fresh(),
    refresh_token: "late",
  });
  await assert.rejects(read);
  assert.equal(applied, 0);
});

function fixture(t, options = {}) {
  const user = vue.ref({ id: "A" });
  const session = vue.ref({ id: "session-A" });
  const access = vue.ref(fresh());
  const refresh = vue.ref("refresh-A");
  const states = new Map();
  const cookies = new Map([
    ["accessToken", vue.ref(access.value)],
    ["refreshToken", vue.ref(refresh.value)],
    ["user", vue.ref(user.value)],
    ["session", vue.ref(session.value)],
  ]);
  const storage = options.storage || new Map();
  const calls = [];
  const navigation = [];
  const cleanups = [];
  const scope = vue.effectScope();
  const auth = (response) => {
    user.value = response.user;
    session.value = response.session;
    access.value = response.access_token;
    cookies.get("accessToken").value = access.value;
    refresh.value = response.refresh_token;
    cookies.get("refreshToken").value = refresh.value;
  };
  const envelope = (revision = 0, state = {}) => ({
    unit: {
      id: "unit",
      path_id: "python-loops",
      room: "exercise",
      title: { de: "Code", en: "Code" },
      content: {},
    },
    progress: { revision, state, status: "in_progress", result: null },
  });
  let remote = envelope(options.serverState ? 2 : 0, options.serverState || {});
  const bindings = {
    ref: vue.ref,
    computed: vue.computed,
    shallowRef: vue.shallowRef,
    watch: vue.watch,
    createLearningTransport,
    createLearningRecovery,
    createLearningRooms,
    mutex: new Mutex(),
    useRuntimeConfig: () => ({
      public: { learningRoomsEnabled: true, BASE_API_URL: "https://fixture.invalid" },
    }),
    useUser: () => user,
    useSession: () => session,
    useAccessToken: () => access,
    useRefreshToken: () => refresh,
    useRoute: () => ({ query: options.query || {}, fullPath: options.fullPath }),
    useRouter: () => ({
      replace: async (to) => {
        navigation.push(to);
      },
      push: async (to) => {
        navigation.push(to);
      },
    }),
    useState: (key, init) => {
      if (!states.has(key)) states.set(key, vue.ref(init()));
      return states.get(key);
    },
    useAppCookie: (key) => {
      if (!cookies.has(key)) cookies.set(key, vue.ref(null));
      return cookies.get(key);
    },
    setStates: auth,
    setUser: (next) => {
      user.value = next;
    },
    onBeforeUnmount: (fn) => {
      cleanups.push(fn);
    },
    window: {
      sessionStorage: {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => {
          if (options.storageFailure) throw new Error("disabled");
          storage.set(key, value);
        },
        removeItem: (key) => storage.delete(key),
      },
    },
    $fetch: async (path, init) => {
      calls.push({ path, ...init, body: structuredClone(init.body) });
      assert.equal(init.retry, 0);
      if (path === "/auth/session") {
        if (options.refreshFailure) throw { statusCode: 401 };
        return {
          user: { id: user.value.id },
          session: { id: session.value.id },
          access_token: fresh(),
          refresh_token: "renewed",
        };
      }
      if (path.endsWith("/capabilities")) return { enabled: true };
      if (init.method === "PUT") {
        remote = envelope(init.body.expected_revision + 1, init.body.state);
        return remote;
      }
      if (path.split("?")[0] === "/skills/rooms/unit") return remote;
      return {
        paths: [{ id: "python-loops", title: { de: "Python", en: "Python" } }],
        path: { id: "python-loops", title: { de: "Python", en: "Python" } },
        next: remote,
      };
    },
  };
  const api = scope.run(() =>
    evaluate(composableSource, bindings, ["useLearningRooms"]).useLearningRooms()
  );
  const dispose = () => {
    cleanups.splice(0).forEach((fn) => fn());
    scope.stop();
  };
  t.after(dispose);
  return { api, access, user, session, storage, calls, cookies, navigation, auth, dispose };
}

test("the actual composable preserves drafts and its editor request binding through same-session refresh", async (t) => {
  const f = fixture(t);
  await settle();
  const request = f.api.request.value;
  f.api.edit({ code: "print(4)", submission_unknown: true, submission_id: "pending-id" });
  f.access.value = token(1);
  assert.equal(f.api.view.value.draft.code, "print(4)");
  assert.equal(await f.api.data.save(), true);
  assert.equal(f.api.view.value.draft.submission_unknown, true);
  assert.equal(f.api.view.value.draft.submission_id, "pending-id");
  assert.equal(f.api.request.value, request);
  assert.equal(f.calls.filter(({ path }) => path === "/skills/rooms?continuous=true").length, 1);
  assert.equal(f.calls.filter(({ path }) => path === "/auth/session").length, 1);
});

test("failed refresh keeps a recoverable owned draft, clears stale login cookies, and hides it from another account", async (t) => {
  const options = { refreshFailure: true };
  const f = fixture(t, options);
  await settle();
  f.api.edit({ code: "private code", submission_unknown: true });
  f.access.value = token(1);
  assert.equal(await f.api.data.save(), false);
  assert.equal(f.api.reauthRequired.value, true);
  assert.equal(f.api.view.value.draft.code, "private code");
  const retry = f.api.data.recovery().pendingSave.body;
  assert.equal(await f.api.reauthenticate(), true);
  assert.equal(f.cookies.get("accessToken").value, null);
  assert.deepEqual(f.navigation.at(-1), { path: "/auth/login", query: { redirect: "/learn" } });
  assert.equal(f.api.view.value.room, null);
  const backup = f.storage.get("academy-learning-recovery:A");
  assert.ok(backup.includes("private code"));
  assert.ok(!backup.includes("refresh-A") && !backup.includes("access_token"));
  options.refreshFailure = false;
  f.auth({
    user: { id: "B" },
    session: { id: "session-B" },
    access_token: fresh(),
    refresh_token: "B",
  });
  await settle();
  assert.deepEqual(f.api.view.value.draft, {});
  f.auth({
    user: { id: "A" },
    session: { id: "new-session-A" },
    access_token: fresh(),
    refresh_token: "A-new",
  });
  await settle();
  assert.equal(f.api.view.value.draft.code, "private code");
  assert.equal(f.api.view.value.draft.submission_unknown, true);
  assert.equal(await f.api.data.save(), true);
  assert.deepEqual(
    f.calls.filter(({ path, method }) => path.endsWith("/state") && method === "PUT").at(-1).body,
    retry
  );
});

test("blocked tab storage does not navigate away from an unsaved draft", async (t) => {
  const f = fixture(t, { storageFailure: true });
  await settle();
  f.api.edit({ code: "keep this" });
  assert.equal(await f.api.reauthenticate(), false);
  assert.equal(f.api.recoveryError.value, true);
  assert.equal(f.api.view.value.draft.code, "keep this");
  assert.equal(f.navigation.length, 0);
  assert.ok(f.cookies.get("accessToken").value);
});

test("clean exit removes only owned recovery and the next visit uses the latest server state", async (t) => {
  const storage = new Map();
  const first = fixture(t, { storage });
  await settle();
  first.api.edit({ code: "old answer", submission_id: "saved-id", submission_unknown: true });
  const oldRecovery = first.api.data.recovery();
  assert.ok(oldRecovery);
  storage.set("academy-learning-recovery:A", JSON.stringify({ user: "A", state: oldRecovery }));
  storage.set("academy-learning-recovery:B", "another account's private backup");
  assert.equal(await first.api.data.save(), true);
  assert.equal(first.api.data.recovery(), null);
  first.dispose();
  assert.equal(storage.has("academy-learning-recovery:A"), false);
  assert.equal(storage.get("academy-learning-recovery:B"), "another account's private backup");
  const latest = { code: "edited on another device", submission_id: "new-id" };
  const second = fixture(t, { storage, serverState: latest });
  await settle();
  assert.deepEqual(second.api.view.value.draft, latest);
  assert.equal(second.api.view.value.room.progress.revision, 2);
  assert.equal(second.api.data.recovery(), null);
});

test("course login recovery retains the exact chosen lesson and all room writes stay in that course", async (t) => {
  const query = { path: "python-loops", course: "python-foundations", unit: "unit" };
  const fullPath = "/learn?path=python-loops&course=python-foundations&unit=unit";
  const options = { query, fullPath, refreshFailure: true };
  const f = fixture(t, options);
  await settle();
  assert.equal(f.api.view.value.courseId, query.course);
  assert(f.calls.some((c) => c.path.includes("course=python-foundations&unit=unit")));
  f.api.edit({ code: "private resumed draft" });
  f.access.value = token(1);
  assert.equal(await f.api.data.save(), false);
  assert.equal(await f.api.reauthenticate(), true);
  assert.equal(f.navigation.at(-1).query.redirect, fullPath);
  options.refreshFailure = false;
  f.auth({
    user: { id: "A" },
    session: { id: "new-session" },
    access_token: fresh(),
    refresh_token: "new-refresh",
  });
  await settle();
  assert.equal(f.api.view.value.courseId, query.course);
  assert.equal(f.api.view.value.draft.code, "private resumed draft");
  assert.equal(await f.api.data.save(), true);
  assert(
    f.calls
      .filter((c) => c.path.includes("/rooms/unit") && c.method === "PUT")
      .every((c) => c.path.endsWith("?course=python-foundations"))
  );
});
