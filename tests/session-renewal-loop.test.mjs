import { decodeApiError } from "../utils/apiError.ts";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Mutex, Semaphore, withTimeout } from "async-mutex";
import { createFetch } from "ofetch";
import ts from "typescript";

// A device clock that runs a few minutes fast made every fresh five-minute token look expired.
// Each request then renewed the session first, and each renewal revoked the token of the
// request before it (the backend rotates the refresh token and invalidates the old access
// token). The character page reloads whenever the token changes, so it never came to rest.

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const sources = {
  sessionRefresh: await read("../utils/sessionRefresh.ts"),
  fetch: await read("../composables/fetch.js"),
  learningTransport: await read("../utils/learningTransport.ts"),
  refreshComposable: await read("../composables/sessionRefresh.ts"),
  loginPage: await read("../pages/auth/login.vue"),
  de: JSON.parse(await read("../locales/de.json")),
  en: JSON.parse(await read("../locales/en-US.json")),
};

/** A module instance with its imports bound, as one browser tab has it. */
function evaluate(source, bindings, names) {
  const ast = ts.createSourceFile("module.ts", source, ts.ScriptTarget.Latest, true);
  const body = ast.statements
    .filter((node) => !ts.isImportDeclaration(node))
    .map((node) => node.getText(ast).replace(/^export\s+/, ""))
    .join("\n");
  const code = ts.transpileModule(body, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
  }).outputText;
  const exported = names.map(
    (name) => `${name}: typeof ${name} === "undefined" ? undefined : ${name}`
  );
  return new Function(...Object.keys(bindings), `${code}\nreturn { ${exported.join(", ")} };`)(
    ...Object.values(bindings)
  );
}

const RealDate = Date;
/** The device clock of the tab, `skew` milliseconds ahead of the server. */
function deviceClock(skew) {
  return class DeviceDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(RealDate.now() + skew);
      else super(...args);
    }
    static now() {
      return RealDate.now() + skew;
    }
  };
}
const jwt = (name, exp) =>
  `e30.${Buffer.from(JSON.stringify({ name, exp })).toString("base64url")}.synthetic`;
const expiry = (token) =>
  JSON.parse(Buffer.from(String(token).split(".")[1] || "", "base64url").toString() || "{}").exp;
// The older fetch composable decoded the token with `jwt-decode`; this stands in for it.
const jwtDecode = (token) => ({ exp: expiry(token) });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Auth and a service behind it, on the server clock, with five-minute access tokens. */
function server({ refuseAll = false } = {}) {
  const now = () => Math.floor(RealDate.now() / 1000);
  const state = { renewals: 0, served: 0, unauthorized: 0 };
  let refreshToken = "R0";
  let accessToken = jwt("A0", now() + 300);
  return {
    state,
    pair: () => ({ accessToken, refreshToken }),
    /** PUT /auth/session: rotates the refresh token and revokes the previous access token. */
    renew(token) {
      if (token !== refreshToken)
        throw { statusCode: 401, data: { detail: "Invalid refresh token" } };
      state.renewals++;
      refreshToken = `R${state.renewals}`;
      accessToken = jwt(`A${state.renewals}`, now() + 300);
      return {
        user: { id: "A" },
        session: { id: "S", last_update: now() },
        access_token: accessToken,
        refresh_token: refreshToken,
      };
    },
    /** A service accepts only the current, unexpired access token of the session. */
    authorize(header) {
      const token = String(header || "").replace(/^Bearer /, "");
      const ok = !refuseAll && token === accessToken && expiry(token) > now();
      if (ok) state.served++;
      else state.unauthorized++;
      return ok;
    },
  };
}

/** One browser tab: the shared cookie pair, the real renewal and the real fetch composable. */
function tab(api, { skew = 0 } = {}) {
  const DeviceDate = deviceClock(skew);
  const session = evaluate(sources.sessionRefresh, { Mutex, Date: DeviceDate }, [
    "renewSession",
    "sameSession",
    "sameSessionContext",
    "sameSessionPair",
    "accessTokenExpired",
    "serverNow",
  ]);
  let cookies = api.pair();
  let cleared = 0;
  let halted = 0;
  const listeners = new Set();
  const changed = () => listeners.forEach((listener) => listener());
  const snapshot = () => ({
    identity: cookies.accessToken ? "A:S" : null,
    generation: "login",
    userId: "A",
    sessionId: "S",
    accessToken: cookies.accessToken || "",
    refreshToken: cookies.refreshToken || "",
  });
  const clear = () => {
    cleared++;
    cookies = { accessToken: "", refreshToken: "" };
    changed();
  };
  const mutex = new Mutex();
  const renew = (expected, extra = {}) =>
    session.renewSession({
      expected,
      snapshot,
      lock: (run) => mutex.runExclusive(run),
      raw: async (token) => {
        await pause(1);
        return api.renew(token);
      },
      apply: (response) => {
        cookies = { accessToken: response.access_token, refreshToken: response.refresh_token };
        changed();
      },
      refused: clear,
      halted: () => {
        halted++;
        clear();
      },
      ...extra,
    });
  const $fetch = createFetch({
    fetch: async (_request, options) => {
      await pause(1);
      const ok = api.authorize(options.headers.get("authorization"));
      return new Response(JSON.stringify(ok ? { ok: true } : { detail: "Invalid token" }), {
        status: ok ? 200 : 401,
        headers: { "content-type": "application/json" },
      });
    },
  });
  const { GET } = evaluate(
    sources.fetch,
    {
      Date: DeviceDate,
      decodeApiError,
      jwtDecode,
      accessTokenExpired: session.accessTokenExpired,
      sessionRefreshMutex: mutex,
      sameSession: session.sameSession,
      sameSessionContext: session.sameSessionContext,
      sameSessionPair: session.sameSessionPair,
      getSessionSnapshot: snapshot,
      Semaphore,
      withTimeout,
      useRuntimeConfig: () => ({
        public: { BASE_API_URL: "https://synthetic.invalid", NODE_ENV: "production" },
      }),
      getAccessToken: () => cookies.accessToken,
      refresh: async (expected) => {
        try {
          return [await renew(expected), null];
        } catch (error) {
          return [null, error];
        }
      },
      $fetch,
      setStates: (value) => {
        assert.equal(value, null);
        clear();
      },
      useRouter: () => ({ push() {} }),
      useRoute: () => ({ fullPath: "/dashboard" }),
      isOnPublicLegalRoute: () => false,
      console: { log() {} },
    },
    ["GET"]
  );
  return {
    DeviceDate,
    session,
    GET,
    renew,
    snapshot,
    onTokenChange: (listener) => listeners.add(listener),
    get cleared() {
      return cleared;
    },
    get halted() {
      return halted;
    },
  };
}

/**
 * The character page (`pages/dashboard/index.vue`) reloads its reads whenever the access
 * token changes. It stays open until it comes to rest or the server has seen 60 renewals.
 */
async function openCharacterPage(browser, api) {
  const reads = [
    "/skills/skilltree",
    "/skills/courses?owned=true&recent_first=true",
    "/skills/xp/me",
    "/skills/rooms?continuous=true",
  ];
  const pending = new Set();
  let open = true;
  const load = () => {
    if (!open || !browser.snapshot().accessToken) return;
    for (const path of reads) {
      const request = browser
        .GET(path)
        .catch(() => {})
        .finally(() => pending.delete(request));
      pending.add(request);
    }
  };
  browser.onTokenChange(() => {
    const token = browser.snapshot().accessToken;
    queueMicrotask(() => {
      if (browser.snapshot().accessToken === token) load();
    });
  });
  load();
  const started = RealDate.now();
  while (pending.size && api.state.renewals < 60 && RealDate.now() - started < 2000) await pause(5);
  open = false;
  while (pending.size) await Promise.allSettled([...pending]);
}

test("a device clock ten minutes fast renews once and the character page comes to rest", async () => {
  const api = server();
  const browser = tab(api, { skew: 10 * 60 * 1000 });
  await openCharacterPage(browser, api);
  assert.equal(api.state.renewals, 1, "renewals");
  assert.equal(api.state.unauthorized, 0, "rejected requests");
  assert.equal(api.state.served, 8, "the first load and the one after the renewal");
  assert.equal(browser.cleared, 0);
  assert.ok(browser.snapshot().identity);
});

test("with a correct clock the character page loads without any renewal", async () => {
  const api = server();
  const browser = tab(api);
  await openCharacterPage(browser, api);
  assert.equal(api.state.renewals, 0);
  assert.equal(api.state.unauthorized, 0);
  assert.equal(api.state.served, 4);
});

test("a token judged by the server clock: fresh on a fast device, expired once the server says so", async () => {
  const api = server();
  const browser = tab(api, { skew: 10 * 60 * 1000 });
  const { accessToken } = api.pair();
  // Before any renewal the tab only has its own clock, which says expired.
  assert.equal(browser.session.accessTokenExpired(accessToken), true);
  await browser.renew(browser.snapshot());
  const renewed = browser.snapshot().accessToken;
  assert.equal(browser.session.accessTokenExpired(renewed), false);
  assert.ok(Math.abs(browser.session.serverNow() - RealDate.now()) < 2000);
  // The margin of 100 s counts on the server clock: 150 s left is fresh, 60 s left is due.
  const now = Math.floor(RealDate.now() / 1000);
  assert.equal(browser.session.accessTokenExpired(jwt("later", now + 150)), false);
  assert.equal(browser.session.accessTokenExpired(jwt("due", now + 60)), true);
});

test("renewals that do not help stop at the limit and end the session cleanly", async () => {
  const api = server();
  const browser = tab(api);
  // As after each 401: the pair the request was sent with is still the current one.
  for (let i = 0; i < 3; i++) await browser.renew(browser.snapshot());
  assert.equal(api.state.renewals, 3);
  await assert.rejects(
    browser.renew(browser.snapshot()),
    (error) => error.data?.error === "session_renewal_halted"
  );
  assert.equal(api.state.renewals, 3, "the fourth renewal never reaches the server");
  assert.equal(browser.halted, 1);
  assert.equal(browser.cleared, 1);
  assert.equal(browser.snapshot().identity, null);
});

test("the limit counts per login and frees up after a minute", async () => {
  const api = server();
  let offset = 0;
  const Real = RealDate;
  const clock = class extends Real {
    static now() {
      return Real.now() + offset;
    }
  };
  const session = evaluate(sources.sessionRefresh, { Mutex, Date: clock }, ["renewSession"]);
  let cookies = api.pair();
  let generation = "first";
  let halted = 0;
  const snapshot = () => ({
    identity: "A:S",
    generation,
    userId: "A",
    sessionId: "S",
    accessToken: cookies.accessToken,
    refreshToken: cookies.refreshToken,
  });
  const renew = () =>
    session.renewSession({
      expected: snapshot(),
      snapshot,
      lock: (run) => run(),
      raw: async (token) => api.renew(token),
      apply: (response) => {
        cookies = { accessToken: response.access_token, refreshToken: response.refresh_token };
      },
      refused: () => assert.fail("no refusal"),
      halted: () => halted++,
    });
  for (let i = 0; i < 3; i++) await renew();
  await assert.rejects(renew());
  assert.equal(halted, 1);
  // A minute later the earlier renewals no longer count.
  offset = 61000;
  for (let i = 0; i < 3; i++) await renew();
  assert.equal(api.state.renewals, 6);
  await assert.rejects(renew());
  assert.equal(halted, 2);
  // A new login starts its own count.
  generation = "second";
  await renew();
  assert.equal(api.state.renewals, 7);
  assert.equal(halted, 2);
});

test("the service rejecting even fresh tokens ends the session after at most three renewals", async () => {
  const api = server({ refuseAll: true });
  const browser = tab(api);
  await openCharacterPage(browser, api);
  assert.ok(api.state.renewals <= 3, `renewals: ${api.state.renewals}`);
  assert.equal(browser.snapshot().identity, null);
});

test("a learning room polling against rejected tokens stops renewing and asks for a new login", async () => {
  const api = server({ refuseAll: true });
  const browser = tab(api);
  let reauth = false;
  const { createLearningTransport } = evaluate(
    sources.learningTransport,
    { Date: browser.DeviceDate },
    ["createLearningTransport"]
  );
  const request = createLearningTransport({
    snapshot: () => ({ ...browser.snapshot(), epoch: 0 }),
    // The room renews without clearing the login, so that its draft stays (useLearningRooms).
    renew: (expected) => browser.renew(expected, { refused: () => {}, halted: () => {} }),
    raw: async (_path, _method, _body, token) => {
      await pause(1);
      if (!api.authorize(`Bearer ${token}`)) throw { statusCode: 401 };
      return { ok: true };
    },
    expired: (required) => {
      reauth = required;
    },
    now: browser.session.serverNow,
  });
  for (let i = 0; i < 10; i++) await request("/skills/rooms?continuous=true").catch(() => {});
  assert.ok(api.state.renewals <= 3, `renewals: ${api.state.renewals}`);
  assert.equal(reauth, true);
});

test("a learning room on a fast device clock renews once, not before every request", async () => {
  const api = server();
  const browser = tab(api, { skew: 10 * 60 * 1000 });
  const { createLearningTransport } = evaluate(
    sources.learningTransport,
    { Date: browser.DeviceDate },
    ["createLearningTransport"]
  );
  const request = createLearningTransport({
    snapshot: () => ({ ...browser.snapshot(), epoch: 0 }),
    renew: (expected) => browser.renew(expected),
    raw: async (_path, _method, _body, token) => {
      await pause(1);
      if (!api.authorize(`Bearer ${token}`)) throw { statusCode: 401 };
      return { ok: true };
    },
    expired: () => {},
    now: browser.session.serverNow,
  });
  for (let i = 0; i < 10; i++) await request("/skills/rooms?continuous=true");
  assert.equal(api.state.renewals, 1);
  assert.equal(api.state.served, 10);
});

test("a stopped renewal logs out with a note on the log-in page; a learning room keeps its login", async () => {
  const states = new Map();
  const calls = [];
  const { refreshSession, useSessionRenewalStopped } = evaluate(
    sources.refreshComposable,
    {
      // The renewal reaches its limit at once.
      renewSession: async (options) => {
        options.halted();
        throw { statusCode: 401, data: { error: "session_renewal_halted" } };
      },
      withSessionRefreshLock: (run) => run(),
      useRuntimeConfig: () => ({ public: { BASE_API_URL: "https://synthetic.invalid" } }),
      useNuxtApp: () => ({ runWithContext: (run) => run() }),
      useState: (key, init) => {
        if (!states.has(key)) states.set(key, { value: init() });
        return states.get(key);
      },
      setStates: (value) => calls.push(value),
      navigator: { locks: {} },
    },
    ["refreshSession", "useSessionRenewalStopped"]
  );
  const expected = { identity: "A:S", generation: "login", accessToken: "a", refreshToken: "r" };
  // A learning room renews without clearing the login, so its draft stays.
  await assert.rejects(refreshSession(expected, false));
  assert.deepEqual(calls, []);
  assert.equal(useSessionRenewalStopped().value, false);
  await assert.rejects(refreshSession(expected));
  assert.deepEqual(calls, [null]);
  assert.equal(useSessionRenewalStopped().value, true);
  // The log-in page shows the note below its form and forgets it once left.
  const form = sources.loginPage.indexOf("<FormLogin />");
  const note = sources.loginPage.search(/<p v-if="renewalStopped" role="status"/);
  assert.ok(form > 0 && note > form);
  assert.match(sources.loginPage, /t\("Body\.SessionRenewalStopped"\)/);
  assert.match(sources.loginPage, /onBeforeUnmount\(\(\) => \{\s+renewalStopped\.value = false;/);
  assert.match(sources.de.Body.SessionRenewalStopped, /abgemeldet\. Melde dich einfach neu an\.$/);
  assert.match(sources.en.Body.SessionRenewalStopped, /logged you out\. Just log in again\.$/);
});
