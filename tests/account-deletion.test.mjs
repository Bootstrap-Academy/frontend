import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Mutex } from "async-mutex";
import { jwtDecode } from "jwt-decode";
import { createFetch } from "ofetch";
import ts from "typescript";
import { decodeApiError } from "../utils/apiError.ts";

const compile = (source) =>
  ts.transpileModule(source.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
  }).outputText;
const session = new Function(
  "Mutex",
  `${compile(await readFile(new URL("../utils/sessionRefresh.ts", import.meta.url), "utf8"))}
  return { sameSession, sameSessionContext, sameSessionPair };`
)(Mutex);
const fetchCode = compile(
  await readFile(new URL("../composables/fetch.js", import.meta.url), "utf8")
);
const userSource = await readFile(new URL("../composables/user.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("user.ts", userSource, ts.ScriptTarget.Latest, true);
const deletionCode = compile(
  ast.statements
    .find((node) => ts.isFunctionDeclaration(node) && node.name.text === "deleteUser")
    .getText(ast)
);
const token = (name) =>
  `e30.${Buffer.from(JSON.stringify({ name, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.synthetic`;
const ended = {
  identity: "A:S",
  userId: "A",
  sessionId: "S",
  generation: "first",
  accessToken: token("A"),
  refreshToken: "synthetic-refresh-A",
};
const later = (account) => ({
  ...ended,
  identity: `${account}:T`,
  userId: account,
  sessionId: "T",
  generation: "later",
  accessToken: token(account),
});

function fixture({
  changeTo,
  status = 200,
  networkFailure = false,
  retry = false,
  beforeDispatch,
} = {}) {
  let current = { ...ended },
    snapshots = 0,
    refreshes = 0;
  const calls = [],
    sent = [];
  const snapshot = () => {
    const value = { ...current };
    if (snapshots++ === 0 && beforeDispatch) current = beforeDispatch;
    return value;
  };
  const bindings = {
    ...session,
    jwtDecode,
    decodeApiError,
    sessionRefreshMutex: new Mutex(),
    useRuntimeConfig: () => ({
      public: { BASE_API_URL: "https://synthetic.invalid", NODE_ENV: "production" },
    }),
    getSessionSnapshot: snapshot,
    getAccessToken: () => current.accessToken,
    refresh: async () => {
      refreshes++;
      assert.equal(current.userId, "A");
      current.accessToken = token("A-refreshed");
      return [true, null];
    },
    $fetch: createFetch({
      fetch: async (request, options) => {
        assert.equal(request, "https://synthetic.invalid/auth/users/A");
        assert.equal(options.method, "DELETE");
        sent.push(options.headers.get("authorization"));
        if (retry && sent.length === 1)
          return new Response(JSON.stringify({ detail: "Invalid token" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        if (changeTo) current = changeTo;
        if (networkFailure) throw Error("Synthetic lost response");
        return new Response(JSON.stringify(status === 200 ? true : { detail: "Unavailable" }), {
          status,
          headers: { "content-type": "application/json" },
        });
      },
    }),
    setStates: (value) => {
      assert.equal(value, null);
      calls.push("reset");
      current = { identity: null, userId: "", sessionId: "", generation: "logout" };
    },
    clearLearningStorage: (user) => calls.push(`clear:${user}`),
    broadcastLearningLogout: (expected, deleted) => {
      assert.deepEqual(expected, ended);
      assert.equal(deleted, true);
      calls.push(`broadcast:${expected.userId}`);
    },
  };
  const api = new Function(
    ...Object.keys(bindings),
    `${fetchCode}\n${deletionCode}\nreturn { deleteUser, DELETE };`
  )(...Object.values(bindings));
  return { api, calls, sent, current: () => current, refreshes: () => refreshes };
}

for (const [name, changeTo, reset] of [
  ["unchanged session", null, true],
  ["other account", later("B"), false],
  ["new session of the deleted account", later("A"), true],
  ["logout", { identity: null, userId: "", sessionId: "", generation: "logout" }, false],
])
  test(`a real HTTP200 account DELETE completes cleanup after ${name}`, async () => {
    const f = fixture({ changeTo });
    assert.deepEqual(await f.api.deleteUser(), [true, null]);
    assert.deepEqual(f.calls, [...(reset ? ["reset"] : []), "clear:A", "broadcast:A"]);
    assert.deepEqual(f.sent, [`Bearer ${ended.accessToken}`]);
    if (!reset && changeTo) assert.deepEqual(f.current(), changeTo);
  });

for (const networkFailure of [false, true])
  test(`an unconfirmed ${networkFailure ? "network" : "HTTP503"} deletion after switching accounts preserves all work`, async () => {
    const other = later("B"),
      f = fixture({ changeTo: other, status: 503, networkFailure });
    assert.equal((await f.api.deleteUser())[0], null);
    assert.deepEqual(f.calls, []);
    assert.deepEqual(f.current(), other);
    assert.equal(f.sent.length, 1);
  });

test("a session change before dispatch cannot delete A using B's credentials", async () => {
  const other = later("B"),
    f = fixture({ beforeDispatch: other });
  assert.deepEqual(await f.api.deleteUser(), [null, { error: "session_changed" }]);
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.sent, []);
  assert.deepEqual(f.current(), other);
});

test("the generic DELETE response guard remains active after a session change", async () => {
  const other = later("B"),
    f = fixture({ changeTo: other });
  await assert.rejects(
    f.api.DELETE("/auth/users/A"),
    (error) => error.data.error === "session_changed"
  );
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.current(), other);
});

test("a confirmed deletion after a captured-session auth retry still cleans only A", async () => {
  const other = later("B"),
    f = fixture({ retry: true, changeTo: other });
  assert.deepEqual(await f.api.deleteUser(), [true, null]);
  assert.equal(f.refreshes(), 1);
  assert.deepEqual(f.sent, [`Bearer ${ended.accessToken}`, `Bearer ${token("A-refreshed")}`]);
  assert.deepEqual(f.calls, ["clear:A", "broadcast:A"]);
  assert.deepEqual(f.current(), other);
});

test("an unauthorized deletion response after switching accounts cannot refresh or replay", async () => {
  const other = later("B"),
    f = fixture({ status: 401, changeTo: other });
  assert.equal((await f.api.deleteUser())[0], null);
  assert.equal(f.refreshes(), 0);
  assert.equal(f.sent.length, 1);
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.current(), other);
});
