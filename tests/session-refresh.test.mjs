import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Mutex } from "async-mutex";
import ts from "typescript";

const source = (await readFile(new URL("../utils/sessionRefresh.ts", import.meta.url), "utf8"))
  .replace(/^import .*;\n/gm, "")
  .replace(/^export /gm, "");
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
}).outputText;
function tab({ locks, storage, clock = Date } = {}) {
  return new Function(
    "Mutex",
    "navigator",
    "localStorage",
    "Date",
    `${code}\nreturn { renewSession, revokeSession, withSessionRefreshLock };`
  )(Mutex, { locks }, storage, clock);
}
const token = (name, exp = 1) =>
  `e30.${Buffer.from(JSON.stringify({ name, exp })).toString("base64url")}.synthetic`;
const initial = () => ({
  identity: "A:S",
  generation: "initial",
  userId: "A",
  sessionId: "S",
  accessToken: token("old"),
  refreshToken: "R0",
});
const response = (name = "R1") => ({
  user: { id: "A" },
  session: { id: "S" },
  access_token: token(name, Math.floor(Date.now() / 1000) + 3600),
  refresh_token: name,
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};
function cookieJar() {
  let shared = initial();
  let applications = 0;
  let clearings = 0;
  return {
    snapshot: () => ({ ...shared }),
    replace: (next) => (shared = next),
    apply: (r) => {
      applications++;
      shared = { ...shared, accessToken: r.access_token, refreshToken: r.refresh_token };
    },
    refused: () => clearings++,
    get applications() {
      return applications;
    },
    get clearings() {
      return clearings;
    },
  };
}
function options(api, jar, raw, extra = {}) {
  return {
    expected: jar.snapshot(),
    snapshot: jar.snapshot,
    lock: api.withSessionRefreshLock,
    raw,
    apply: jar.apply,
    refused: jar.refused,
    ...extra,
  };
}

test("separate tab runtimes use the origin lock and reread the winner pair", async () => {
  const sharedLock = new Mutex();
  const locks = { request: (_name, run) => sharedLock.runExclusive(run) };
  const a = tab({ locks }),
    b = tab({ locks }),
    jar = cookieJar();
  let rotations = 0;
  const raw = async (refresh) => {
    assert.equal(refresh, "R0");
    rotations++;
    return response();
  };
  await Promise.all([a.renewSession(options(a, jar, raw)), b.renewSession(options(b, jar, raw))]);
  assert.equal(rotations, 1);
  assert.equal(jar.applications, 1);
  assert.equal(jar.snapshot().refreshToken, "R1");
  assert.equal(jar.clearings, 0);
});

test("the storage fallback coordinates separate tabs without storing credentials", async () => {
  const values = new Map();
  const written = [];
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      written.push(value);
      values.set(key, value);
    },
    removeItem: (key) => values.delete(key),
  };
  const a = tab({ storage }),
    b = tab({ storage }),
    jar = cookieJar();
  let rotations = 0;
  const raw = async () => {
    rotations++;
    return response();
  };
  await Promise.all([
    a.renewSession(options(a, jar, raw, { fallback: true })),
    b.renewSession(options(b, jar, raw, { fallback: true })),
  ]);
  assert.equal(rotations, 1);
  assert.equal(jar.clearings, 0);
  assert.equal(values.size, 0);
  assert(written.every((value) => !value.includes("R0") && !value.includes("accessToken")));
});

test("a fallback loser arriving before the winner response adopts the winner instead of clearing it", async () => {
  const a = tab(),
    b = tab(),
    jar = cookieJar(),
    winner = deferred();
  let calls = 0;
  const raw = async () => {
    if (++calls === 1) return winner.promise;
    throw { statusCode: 401 };
  };
  const first = a.renewSession(options(a, jar, raw, { fallback: true }));
  const second = b.renewSession(options(b, jar, raw, { fallback: true }));
  setTimeout(() => winner.resolve(response()), 20);
  await Promise.all([first, second]);
  assert.equal(calls, 2);
  assert.equal(jar.applications, 1);
  assert.equal(jar.clearings, 0);
  assert.equal(jar.snapshot().refreshToken, "R1");
});

test("a late successful response never overwrites a newer published pair", async () => {
  const api = tab(),
    jar = cookieJar(),
    answer = deferred();
  const pending = api.renewSession(
    options(api, jar, () => answer.promise, {
      discard: async () => assert.fail("A newer pair in the same generation must stay valid"),
    })
  );
  await new Promise(setImmediate);
  jar.apply(response("newer"));
  answer.resolve(response("late"));
  await pending;
  assert.equal(jar.applications, 1);
  assert.equal(jar.snapshot().refreshToken, "newer");
});

test("a successful in-flight rotation discarded after logout revokes only its old session", async () => {
  const api = tab(),
    jar = cookieJar(),
    answer = deferred();
  let revoked = null;
  const pending = api.renewSession(
    options(api, jar, () => answer.promise, {
      discard: async (result, original) => {
        revoked = {
          userId: original.userId,
          sessionId: original.sessionId,
          access: result.access_token,
        };
      },
    })
  );
  const rejected = assert.rejects(pending);
  await new Promise(setImmediate);
  jar.replace({
    ...initial(),
    identity: "B:T",
    userId: "B",
    sessionId: "T",
    generation: "new-login",
    refreshToken: "B-R0",
  });
  answer.resolve(response("old-session-R1"));
  await rejected;
  assert.deepEqual(revoked, {
    userId: "A",
    sessionId: "S",
    access: response("old-session-R1").access_token,
  });
  assert.equal(jar.snapshot().identity, "B:T");
  assert.equal(jar.snapshot().refreshToken, "B-R0");
  assert.equal(jar.applications, 0);
});

test("a discarded response with a different owner is never used for revocation", async () => {
  const api = tab(),
    jar = cookieJar(),
    answer = deferred();
  let revoked = 0;
  const pending = api.renewSession(
    options(api, jar, () => answer.promise, {
      discard: async () => revoked++,
    })
  );
  const rejected = assert.rejects(pending);
  await new Promise(setImmediate);
  jar.replace({ ...initial(), identity: null, generation: "logout" });
  answer.resolve({ ...response(), user: { id: "B" } });
  await rejected;
  assert.equal(revoked, 0);
});

for (const change of ["logout", "account", "ABA"]) {
  test(`a delayed refresh is discarded after ${change}`, async () => {
    const api = tab(),
      jar = cookieJar(),
      answer = deferred();
    const pending = api.renewSession(options(api, jar, () => answer.promise));
    const rejected = assert.rejects(pending);
    await new Promise(setImmediate);
    jar.replace({
      ...initial(),
      identity: change === "logout" ? null : change === "account" ? "B:T" : "A:S",
      generation: "changed-and-returned",
    });
    answer.resolve(response());
    await rejected;
    assert.equal(jar.applications, 0);
    assert.equal(jar.clearings, 0);
  });
}

test("network failures and malformed refresh responses preserve the current session", async () => {
  for (const raw of [
    async () => {
      throw { statusCode: 503 };
    },
    async () => ({ ...response(), user: { id: "B" } }),
  ]) {
    const api = tab(),
      jar = cookieJar();
    await assert.rejects(api.renewSession(options(api, jar, raw)));
    assert.equal(jar.clearings, 0);
    assert.equal(jar.applications, 0);
    assert.equal(jar.snapshot().refreshToken, "R0");
  }
});

test("a confirmed native-lock refusal clears its own pair; an uncertain fallback never does", async () => {
  for (const fallback of [false, true]) {
    let now = Date.now();
    const api = tab({
        clock: { now: () => now },
        locks: fallback ? undefined : { request: (_name, run) => run() },
      }),
      jar = cookieJar();
    await assert.rejects(
      api.renewSession(
        options(
          api,
          jar,
          async () => {
            throw { statusCode: 401 };
          },
          { fallback, wait: async () => (now += 20001) }
        )
      )
    );
    assert.equal(jar.clearings, fallback ? 0 : 1);
  }
});

test("policy-denied Web Locks use a conservative fallback and never repeat a started action", async () => {
  let now = Date.now();
  const denied = tab({
    locks: {
      request: async () => {
        throw new DOMException("Denied", "SecurityError");
      },
    },
    clock: { now: () => now },
  });
  const jar = cookieJar();
  let calls = 0;
  await assert.rejects(
    denied.renewSession(
      options(
        denied,
        jar,
        async () => {
          calls++;
          throw { statusCode: 401 };
        },
        { wait: async () => (now += 20001) }
      )
    )
  );
  assert.equal(calls, 1);
  assert.equal(jar.clearings, 0);
  for (const statusCode of [401, 503]) {
    const native = tab({ locks: { request: (_name, run) => run() } });
    calls = 0;
    await assert.rejects(
      native.renewSession(
        options(native, cookieJar(), async () => {
          calls++;
          throw { statusCode };
        })
      )
    );
    assert.equal(calls, 1);
  }
});

const authSource = (await readFile(new URL("../composables/auth.ts", import.meta.url), "utf8"))
  .replace(/^import .*;\n/gm, "")
  .replace(/^export /gm, "");
const authCode = ts.transpileModule(authSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
}).outputText;

for (const result of ["success", "unauthorized", "offline"]) {
  test(`explicit logout clears immediately and a late ${result} leaves a subsequent login untouched`, async () => {
    let current = { ...initial(), accessToken: response().access_token };
    const captured = { ...current };
    const answer = deferred();
    const calls = [];
    const cleanup = {};
    const bindings = {
      revokeSession: tab().revokeSession,
      withSessionRefreshLock: (run) => run(),
      getSessionSnapshot: () => ({ ...current }),
      useRuntimeConfig: () => ({ public: { BASE_API_URL: "https://synthetic.invalid" } }),
      useUser: () => ({ value: { id: "A" } }),
      prepareLearningLogout: async () => true,
      clearLearningStorage: () => {},
      setStates: (value) => {
        assert.equal(value, null);
        current = { ...current, identity: null, generation: "logout" };
      },
      $fetch: async (url, options) => {
        calls.push({ url, options });
        await answer.promise;
        if (result !== "success") throw { statusCode: result === "offline" ? 503 : 401 };
        return { ok: true };
      },
    };
    for (const name of [
      "Calendar",
      "ICS",
      "Events",
      "EventFilter",
      "Coachings",
      "Coins",
      "PaypalClientID",
      "MyCourses",
      "Courses",
      "Course",
      "VideoSRC",
      "UnratedWebinars",
      "Webinar",
      "Webinars",
      "MyWebinars",
      "XP",
    ])
      bindings[`use${name}`] = () => (cleanup[name] ||= { value: "old" });
    const { logout } = new Function(...Object.keys(bindings), `${authCode}\nreturn { logout };`)(
      ...Object.values(bindings)
    );
    const pending = logout();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(current.identity, null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://synthetic.invalid/auth/sessions/A/S");
    assert.equal(calls[0].options.retry, 0);
    assert.equal(calls[0].options.headers.Authorization, `Bearer ${captured.accessToken}`);
    current = { ...initial(), identity: "B:T", generation: "new-login" };
    cleanup.Coins.value = 123;
    answer.resolve();
    await pending;
    assert.equal(current.identity, "B:T");
    assert.equal(current.generation, "new-login");
    assert.equal(cleanup.Coins.value, 123);
  });
}

const userSource = await readFile(new URL("../composables/user.ts", import.meta.url), "utf8");
const userAst = ts.createSourceFile("user.ts", userSource, ts.ScriptTarget.Latest, true);
const cookieCode = ts.transpileModule(
  userAst.statements
    .filter(
      (node) =>
        ts.isFunctionDeclaration(node) &&
        ["readSessionCookie", "setStates"].includes(node.name.text)
    )
    .map((node) => node.getText(userAst).replace(/^export /, ""))
    .join("\n"),
  { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None } }
).outputText;

test("logout with expired access privately renews and revokes the captured session without publishing cookies", async () => {
  const api = tab(),
    expected = initial(),
    calls = [];
  let published = 0;
  await api.revokeSession({
    expected,
    lock: (run) => run(),
    raw: async (path, method, body, access) => {
      calls.push({ path, method, body, access });
      if (method === "PUT") {
        assert.equal(body.refresh_token, "R0");
        return response("private-revoke-pair");
      }
      assert.equal(path, "/auth/sessions/A/S");
      assert.equal(access, response("private-revoke-pair").access_token);
      return { ok: true };
    },
    apply: () => published++,
  });
  assert.deepEqual(
    calls.map(({ method }) => method),
    ["PUT", "DELETE"]
  );
  assert.equal(published, 0);
  assert.equal(expected.refreshToken, "R0");
});

test("a rejected captured access token gets exactly one private refresh and a targeted revoke", async () => {
  const api = tab(),
    calls = [];
  await api.revokeSession({
    expected: { ...initial(), accessToken: response().access_token },
    lock: (run) => run(),
    raw: async (path, method) => {
      calls.push({ path, method });
      if (calls.length === 1) throw { statusCode: 401 };
      if (method === "PUT") return response();
      return { ok: true };
    },
  });
  assert.deepEqual(
    calls.map(({ method }) => method),
    ["DELETE", "PUT", "DELETE"]
  );
  assert.equal(calls[0].path, calls[2].path);
});

test("cookie publication is synchronous, keeps the refresh generation, and reads create no Nuxt listeners", () => {
  const cookies = new Map(),
    refs = new Map();
  const document = {
    get cookie() {
      return [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
    },
    set cookie(value) {
      assert.match(value, /; Secure; SameSite=Lax/);
      const [entry] = value.split(";");
      const separator = entry.indexOf("=");
      const name = entry.slice(0, separator);
      if (value.includes("Max-Age=0")) cookies.delete(name);
      else cookies.set(name, entry.slice(separator + 1));
    },
  };
  const state = (key) => {
    if (!refs.has(key)) refs.set(key, { value: null });
    return refs.get(key);
  };
  let expected;
  const checkPair = () => {
    assert.deepEqual(readSessionCookie("user")?.id || null, expected?.user?.id || null);
    assert.deepEqual(readSessionCookie("session")?.id || null, expected?.session?.id || null);
    assert.equal(readSessionCookie("accessToken"), expected?.access_token || null);
    assert.equal(readSessionCookie("refreshToken"), expected?.refresh_token || null);
  };
  const bindings = {
    document,
    useAppCookie: (name) => {
      assert(!["user", "session", "accessToken", "refreshToken", "authGeneration"].includes(name));
      return state(`cookie:${name}`);
    },
    refreshCookie: checkPair,
    setUser: (user) => {
      checkPair();
      state("user").value = user;
    },
    useProfileLoaded: () => state("profile"),
    useSession: () => state("session"),
    useAccessToken: () => state("access"),
    useRefreshToken: () => state("refresh"),
    isOnPublicLegalRoute: () => true,
  };
  const { readSessionCookie, setStates } = new Function(
    ...Object.keys(bindings),
    `${cookieCode}\nreturn { readSessionCookie, setStates };`
  )(...Object.values(bindings));
  expected = response("login");
  setStates(expected);
  const generation = readSessionCookie("authGeneration");
  assert(generation);
  assert.deepEqual(readSessionCookie("user"), { id: "A", name: null, display_name: null });
  for (let count = 0; count < 100; count++)
    assert.equal(readSessionCookie("refreshToken"), "login");
  expected = response("renewed");
  setStates(expected, true);
  assert.equal(readSessionCookie("authGeneration"), generation);
  assert.equal(readSessionCookie("refreshToken"), "renewed");
  expected = null;
  setStates(null);
  assert.notEqual(readSessionCookie("authGeneration"), generation);
  assert.equal(readSessionCookie("user"), null);
  assert.equal(readSessionCookie("accessToken"), null);
  assert.equal(readSessionCookie("refreshToken"), null);
});
