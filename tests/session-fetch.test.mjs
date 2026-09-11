import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Mutex, Semaphore, withTimeout } from "async-mutex";
import { jwtDecode } from "jwt-decode";
import { createFetch } from "ofetch";

const source = (await readFile(new URL("../composables/fetch.js", import.meta.url), "utf8"))
  .replace(/^import .*;\n/gm, "")
  .replace(/^export /gm, "");

function token(name, seconds) {
  const payload = { name, exp: Math.floor(Date.now() / 1000) + seconds };
  return `e30.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.synthetic`;
}

function fixture({ expired = false, refuseFirst = false, refuseAll = false } = {}) {
  let accessToken = token("original", expired ? -3600 : 3600);
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
  const api = new Function(
    "jwtDecode",
    "Mutex",
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
    jwtDecode,
    Mutex,
    Semaphore,
    withTimeout,
    () => ({ public: { BASE_API_URL: "https://synthetic.invalid", NODE_ENV: "production" } }),
    () => accessToken,
    async () => {
      accessToken = token(`refreshed-${++refreshes}`, 3600);
      return [{ access_token: accessToken }, null];
    },
    transport,
    (value) => {
      assert.equal(value, null);
      accessToken = null;
      clearings++;
    },
    () => ({ push: (path) => redirects.push(path) }),
    () => ({ fullPath: "/subscription" }),
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
