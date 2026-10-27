import { decodeApiError } from "../utils/apiError.ts";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Mutex, Semaphore, withTimeout } from "async-mutex";
import { createFetch } from "ofetch";
import ts from "typescript";

const utilitySource = (
  await readFile(new URL("../utils/sessionRefresh.ts", import.meta.url), "utf8")
)
  .replace(/^import[\s\S]*?;\n/gm, "")
  .replace(/^export /gm, "");
const utilityCode = ts.transpileModule(utilitySource, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
}).outputText;
// One module instance per fixture, as one per browser tab: its renewal limit counts per tab.
const loadUtility = () =>
  new Function(
    "Mutex",
    `${utilityCode}\nreturn { renewSession, sameSession, sameSessionContext, sameSessionPair, accessTokenExpired };`
  )(Mutex);

const source = (await readFile(new URL("../composables/fetch.js", import.meta.url), "utf8"))
  .replace(/^import[\s\S]*?;\n/gm, "")
  .replace(/^export /gm, "");

function token(name, seconds) {
  const payload = { name, exp: Math.floor(Date.now() / 1000) + seconds };
  return `e30.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.synthetic`;
}

function fixture({
  expired = false,
  refuseFirst = false,
  refuseAll = false,
  beforeResponse,
  refreshFailure,
  fullPath = "/subscription",
} = {}) {
  const utility = loadUtility();
  let accessToken = token("original", expired ? -3600 : 3600);
  let generation = "first";
  let identity = "A:S";
  let refreshes = 0;
  let clearings = 0;
  const sent = [];
  const redirects = [];
  const transport = createFetch({
    fetch: async (request, options) => {
      assert.equal(new URL(request).origin, "https://synthetic.invalid");
      assert.ok(options.headers instanceof Headers);
      const authorization = options.headers.get("authorization");
      sent.push({ authorization, body: options.body, method: options.method });
      if (beforeResponse) await beforeResponse(sent.length);
      const accepted =
        authorization === `Bearer ${accessToken}` &&
        !refuseAll &&
        !(refuseFirst && sent.length === 1);
      return new Response(JSON.stringify(accepted ? { ok: true } : { detail: "Invalid token" }), {
        status: accepted ? 200 : 401,
        headers: { "content-type": "application/json" },
      });
    },
  });
  const mutex = new Mutex();
  const snapshot = () => ({
    identity: accessToken ? identity : null,
    generation,
    userId: "A",
    sessionId: "S",
    accessToken,
    refreshToken: "original-refresh",
  });
  const clear = () => {
    accessToken = null;
    clearings++;
  };
  const api = new Function(
    "decodeApiError",
    "accessTokenExpired",
    "sessionRefreshMutex",
    "sameSession",
    "sameSessionContext",
    "sameSessionPair",
    "getSessionSnapshot",
    "Semaphore",
    "withTimeout",
    "useRuntimeConfig",
    "getAccessToken",
    "refresh",
    "$fetch",
    "setStates",
    "useRouter",
    "useRoute",
    "isOnPublicLegalRoute",
    "console",
    `${source}\nreturn { GET, POST, mutex };`
  )(
    decodeApiError,
    utility.accessTokenExpired,
    mutex,
    utility.sameSession,
    utility.sameSessionContext,
    utility.sameSessionPair,
    snapshot,
    Semaphore,
    withTimeout,
    () => ({ public: { BASE_API_URL: "https://synthetic.invalid", NODE_ENV: "production" } }),
    () => accessToken,
    async (expected) => {
      try {
        const result = await utility.renewSession({
          expected,
          snapshot,
          lock: (run) => mutex.runExclusive(run),
          raw: async () => {
            if (refreshFailure) throw refreshFailure;
            return {
              user: { id: "A" },
              session: { id: "S" },
              access_token: token(`refreshed-${++refreshes}`, 3600),
              refresh_token: "new-refresh",
            };
          },
          apply: (response) => {
            accessToken = response.access_token;
          },
          refused: clear,
        });
        return [result, null];
      } catch (error) {
        return [null, error];
      }
    },
    transport,
    (value) => {
      assert.equal(value, null);
      clear();
    },
    () => ({ push: (path) => redirects.push(path) }),
    () => ({ fullPath }),
    () => false,
    { log() {} }
  );
  return {
    api,
    sent,
    redirects,
    get accessToken() {
      return accessToken;
    },
    get refreshes() {
      return refreshes;
    },
    get clearings() {
      return clearings;
    },
    changeAccount(account, nextGeneration) {
      identity = `${account}:S`;
      generation = nextGeneration;
      accessToken = token(account, 3600);
    },
    completeConcurrentRefresh() {
      accessToken = token("concurrent-refresh", 3600);
    },
  };
}

test("proactive refresh replaces the actual ofetch Headers authorization before dispatch", async () => {
  const f = fixture({ expired: true });
  assert.deepEqual(await f.api.GET("/auth/users/me"), { ok: true });
  assert.equal(f.refreshes, 1);
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].authorization, `Bearer ${f.accessToken}`);
  assert.equal(f.clearings, 0);
});

test("a request waiting for another refresh uses that fresh token without a second refresh", async () => {
  const f = fixture({ expired: true });
  const release = await f.api.mutex.acquire();
  const pending = f.api.GET("/auth/users/me");
  f.completeConcurrentRefresh();
  release();
  assert.deepEqual(await pending, { ok: true });
  assert.equal(f.refreshes, 0);
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].authorization, `Bearer ${f.accessToken}`);
  assert.equal(f.clearings, 0);
});

test("a 401 retry replaces authorization case-insensitively and preserves the request body", async () => {
  const f = fixture({ refuseFirst: true });
  const body = { command_id: "synthetic-command", evidence: ["original request"] };
  assert.deepEqual(await f.api.POST("/synthetic/action", body), { ok: true });
  assert.equal(f.refreshes, 1);
  assert.equal(f.sent.length, 2);
  assert.notEqual(f.sent[0].authorization, f.sent[1].authorization);
  assert.equal(f.sent[1].authorization, `Bearer ${f.accessToken}`);
  assert.equal(f.sent[1].authorization.includes(","), false);
  assert.equal(f.sent[0].body, JSON.stringify(body));
  assert.equal(f.sent[1].body, f.sent[0].body);
  assert.equal(f.sent[1].method, "POST");
  assert.equal(f.clearings, 0);
});

test("a genuine 401 after fresh-token retry still clears the session and stops retrying", async () => {
  const f = fixture({ refuseAll: true });
  await assert.rejects(f.api.GET("/auth/users/me"), (error) => error.response.status === 401);
  assert.equal(f.refreshes, 1);
  assert.equal(f.sent.length, 2);
  assert.equal(f.sent[1].authorization.includes(","), false);
  assert.equal(f.accessToken, null);
  assert.ok(f.clearings > 0);
  assert.ok(f.redirects.length > 0);
});

test("a session the server no longer accepts leads to the login with the whole way back", async () => {
  for (const fullPath of [
    "/subscription",
    "/morphcoins/paypal?coins=500&next=subscription",
    "/profile/edit?coins=1000#address",
    "/courses?redirect=/dashboard&page=2",
  ]) {
    const f = fixture({ refuseAll: true, fullPath });
    await assert.rejects(f.api.GET("/auth/users/me"), (error) => error.response.status === 401);
    // The router encodes the query itself, so nothing after an `&` or a `#` is lost.
    assert.deepEqual(f.redirects, [{ path: "/auth/login", query: { redirect: fullPath } }]);
  }
  // Pages that need no session stay where they are.
  for (const fullPath of ["/", "/contact", "/skill-tree", "/auth/login?redirect=/dashboard"]) {
    const f = fixture({ refuseAll: true, fullPath });
    await assert.rejects(f.api.GET("/auth/users/me"), (error) => error.response.status === 401);
    assert.deepEqual(f.redirects, [], fullPath);
  }
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("late unauthorized responses cannot clear or replay under a different account", async () => {
  const arrived = deferred(),
    answer = deferred();
  const f = fixture({
    beforeResponse: async () => {
      arrived.resolve();
      await answer.promise;
    },
  });
  const pending = f.api.POST("/synthetic/action", { private: "A" });
  const rejected = assert.rejects(pending);
  await arrived.promise;
  f.changeAccount("B", "second");
  answer.resolve();
  await rejected;
  assert.equal(f.refreshes, 0);
  assert.equal(f.clearings, 0);
  assert.equal(f.sent.length, 1);
});

test("a late unauthorized response is fenced after switching away and back", async () => {
  const arrived = deferred(),
    answer = deferred();
  const f = fixture({
    beforeResponse: async () => {
      arrived.resolve();
      await answer.promise;
    },
  });
  const pending = f.api.GET("/auth/users/me");
  const rejected = assert.rejects(pending);
  await arrived.promise;
  f.changeAccount("B", "second");
  f.changeAccount("A", "third");
  answer.resolve();
  await rejected;
  assert.equal(f.refreshes, 0);
  assert.equal(f.clearings, 0);
});

test("network failure during proactive refresh preserves the session and does not dispatch a stale write", async () => {
  const f = fixture({
    expired: true,
    refreshFailure: { statusCode: 503, data: { error: "unavailable" } },
  });
  await assert.rejects(f.api.POST("/synthetic/action", { keep: true }));
  assert.equal(f.clearings, 0);
  assert.ok(f.accessToken);
  assert.equal(f.sent.length, 0);
});
