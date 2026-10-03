import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import {
  GUEST_RETURN_KEY,
  guestReturnPath,
  authorizeGuestHandoff,
  takeGuestAuthorization,
} from "../utils/guest/handoff.ts";

const exercise = JSON.parse(
  await readFile(new URL("../utils/guest/loops-intro.json", import.meta.url))
);
const source = await readFile(new URL("../utils/guest/learning.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("guest.ts", source, ts.ScriptTarget.Latest, true);
const code = ts.transpileModule(
  ast.statements
    .filter((n) => !ts.isImportDeclaration(n))
    .map((n) => n.getText(ast).replace(/^export\s+/, ""))
    .join("\n"),
  {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
  }
).outputText;
const { createGuestLearning, guestState, guestFinished, GUEST_KEY, GUEST_TTL_MS } = new Function(
  "exercise",
  "GUEST_RETURN_KEY",
  code + "\nreturn {createGuestLearning, guestState, guestFinished, GUEST_KEY, GUEST_TTL_MS};"
)(exercise, GUEST_RETURN_KEY);
const solved = {
  stage: 4,
  singleDone: true,
  prediction: "6",
  predictionChecked: true,
  practiceRepetitions: 4,
};
const memory = () => {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) || null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
};
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};
function fixture(overrides = {}) {
  let user = null,
    view;
  const calls = [],
    local = overrides.local === undefined ? memory() : overrides.local,
    tab = memory();
  const controller = createGuestLearning({
    local,
    tab,
    now: overrides.now,
    user: () => user,
    lock: async (run) => run(),
    changed: (value) => (view = value),
    request: async (path, method = "GET", body) => {
      calls.push({ path, method, body: body && structuredClone(body), user });
      if (overrides.request) return overrides.request(path, method, body);
      return {
        unit: exercise,
        progress: {
          revision: body ? body.expected_revision + 1 : 0,
          state: body?.state || {},
          status: body ? "in_progress" : "new",
          result: null,
        },
      };
    },
  });
  return {
    controller,
    calls,
    local,
    tab,
    get view() {
      return view;
    },
    setUser: (value, reload = true) => {
      user = value;
      if (reload) controller.load();
    },
  };
}
function ready(f) {
  f.controller.edit(solved);
  f.controller.finish();
  f.setUser("A");
}

test("guest exercise survives reload; local completion never calls the API", () => {
  const f = fixture();
  f.controller.edit(solved);
  f.controller.finish();
  assert.equal(f.view.draft.finished, true);
  f.controller.load();
  assert.deepEqual(f.view.draft.state, solved);
  assert.equal(f.view.draft.finished, true);
  assert.equal(f.calls.length, 0);
  assert.equal(f.controller.beginHandoff(), true);
  assert.equal(guestReturnPath(f.tab), "/start");
});

test("malformed/untrusted state cannot inject result, XP, arbitrary strings or completion", () => {
  assert.deepEqual(
    guestState({ ...solved, xp: 999, result: "solved", stage: 999, prediction: "<script>" }),
    {
      practiceRepetitions: 4,
      singleDone: true,
      predictionChecked: true,
    }
  );
  assert.equal(guestFinished({ ...solved, prediction: "wrong" }), false);
  assert.equal(guestFinished({ ...solved, practiceRepetitions: 1 }), false);
  const storage = memory();
  storage.setItem(GUEST_KEY, "broken");
  const f = fixture({ local: storage });
  assert.deepEqual(f.view.draft.state, {});
  assert.equal(f.calls.length, 0);
});

test("explicit handoff saves only a draft to the exact existing course unit", async () => {
  const f = fixture();
  ready(f);
  assert.equal(f.calls.length, 0, "logging in alone must not import");
  assert.equal(await f.controller.transfer(), true);
  assert.deepEqual(
    f.calls.map((c) => [c.path, c.method]),
    [
      ["/skills/rooms/loops-intro?course=python-foundations", "GET"],
      ["/skills/rooms/loops-intro/state?course=python-foundations", "PUT"],
    ]
  );
  assert.deepEqual(Object.keys(f.calls[1].body).sort(), [
    "expected_revision",
    "request_id",
    "state",
  ]);
  assert.deepEqual(f.calls[1].body.state, solved);
  assert.equal(f.view.draft.saved, true);
  assert.equal(f.local.getItem(GUEST_KEY), null);
  await f.controller.transfer();
  assert.equal(f.calls.length, 2);
  f.setUser(null);
  assert.deepEqual(f.view.draft.state, {});
  f.setUser("B");
  assert.deepEqual(f.view.draft.state, {});
  f.setUser("A");
  assert.deepEqual(f.view.draft.state, {}, "confirmed work belongs on the server now");
});

test("uncertain save persists the exact request and retries it after reload without duplicate mutation", async () => {
  let receipt,
    writes = 0;
  const f = fixture({
    request: async (path, method, body) => {
      if (method === "GET")
        return {
          unit: exercise,
          progress: receipt?.progress || { revision: 0, state: {}, status: "new", result: null },
        };
      if (!receipt) {
        writes++;
        receipt = {
          unit: exercise,
          progress: { revision: 1, state: body.state, status: "in_progress", result: null },
        };
        throw { statusCode: 503 };
      }
      return receipt;
    },
  });
  ready(f);
  assert.equal(await f.controller.transfer(), false);
  const pending = structuredClone(f.view.draft.pending);
  assert.deepEqual(JSON.parse(f.local.getItem(GUEST_KEY)).accounts.A.pending, pending);
  assert.equal(f.view.error, "save");
  f.controller.load();
  assert.deepEqual(f.view.draft.pending, pending);
  assert.equal(await f.controller.transfer(), true);
  assert.deepEqual(f.calls[1].body, f.calls[3].body);
  assert.equal(writes, 1);
  assert.equal(f.local.getItem(GUEST_KEY), null);
});

test("a double click runs only one transfer", async () => {
  const d = deferred();
  const f = fixture({
    request: async (path, method, body) => {
      if (method === "GET") await d.promise;
      return {
        unit: exercise,
        progress: {
          revision: body ? 1 : 0,
          state: body?.state || {},
          status: body ? "in_progress" : "new",
          result: null,
        },
      };
    },
  });
  ready(f);
  const first = f.controller.transfer();
  assert.equal(await f.controller.transfer(), false);
  d.resolve();
  assert.equal(await first, true);
  assert.equal(f.calls.length, 2);
});

for (const status of ["in_progress", "completed", "skipped"])
  test(`existing ${status} work is never overwritten`, async () => {
    const f = fixture({
      request: async () => ({
        unit: exercise,
        progress: { status, revision: 3, state: { stage: 2 }, result: null },
      }),
    });
    ready(f);
    assert.equal(await f.controller.transfer(), false);
    assert.equal(f.view.error, "conflict");
    assert.deepEqual(f.view.draft.state, solved);
    assert.equal(f.calls.length, 1);
  });

test("changed or wrong exercise is refused before any write", async () => {
  const f = fixture({
    request: async () => ({
      unit: { ...exercise, content: {} },
      progress: { revision: 0, status: "new", state: {}, result: null },
    }),
  });
  ready(f);
  assert.equal(await f.controller.transfer(), false);
  assert.equal(f.view.error, "changed");
  assert.equal(f.calls.length, 1);
});

test("switching accounts during a read prevents the write and hides the previous draft", async () => {
  const d = deferred();
  const f = fixture({
    request: async () => {
      await d.promise;
      return { unit: exercise, progress: { revision: 0, state: {}, status: "new", result: null } };
    },
  });
  ready(f);
  const pending = f.controller.transfer();
  f.setUser("B");
  d.resolve();
  assert.equal(await pending, false);
  assert.equal(f.calls.length, 1);
  assert.deepEqual(f.view.draft.state, {});
  f.setUser("A");
  assert.deepEqual(f.view.draft.state, solved);
});

test("account ABA changes invalidate an outstanding response", async () => {
  const d = deferred();
  const f = fixture({
    request: async () => {
      await d.promise;
      return { unit: exercise, progress: { revision: 0, state: {}, status: "new", result: null } };
    },
  });
  ready(f);
  const pending = f.controller.transfer();
  f.setUser("B");
  f.setUser("A");
  d.resolve();
  assert.equal(await pending, false);
  assert.equal(f.calls.length, 1);
});

test("another tab/account cannot claim or rewrite a draft after ownership was assigned", async () => {
  const local = memory(),
    a = fixture({ local });
  a.controller.edit(solved);
  a.controller.finish();
  const b = fixture({ local });
  b.setUser("B");
  a.setUser("A");
  assert.equal(await a.controller.transfer(), true);
  assert.equal(await b.controller.transfer(), false);
  assert.equal(b.calls.length, 0);
  b.controller.load();
  b.controller.edit({ stage: 1, singleDone: true });
  a.controller.load();
  assert.notDeepEqual(a.view.draft.state, solved, "confirmed account work isn't cached locally");
});

test("storage failure preserves in-memory play and prevents all account writes", async () => {
  const f = fixture({ local: null });
  f.controller.edit(solved);
  f.controller.finish();
  assert.equal(f.view.draft.finished, true);
  assert.equal(f.view.persisted, false);
  assert.equal(f.controller.beginHandoff(), false);
  f.setUser("A", false);
  assert.equal(await f.controller.transfer(), false);
  assert.equal(f.calls.length, 0);
});

test("failed atomic ownership write leaves the guest draft unclaimed and creates no server write", async () => {
  const local = memory(),
    f = fixture({ local });
  ready(f);
  const saved = local.setItem;
  local.setItem = () => {
    throw new Error("quota");
  };
  assert.equal(await f.controller.transfer(), false);
  assert.equal(f.calls.length, 0);
  local.setItem = saved;
  f.setUser(null);
  assert.deepEqual(f.view.draft.state, solved);
});

for (const [status, error] of [
  [401, "session"],
  [409, "conflict"],
  [429, "limit"],
  [503, "save"],
])
  test(`HTTP ${status} keeps the draft`, async () => {
    const f = fixture({
      request: async () => {
        throw { statusCode: status, data: status === 429 ? { code: "daily_limit_reached" } : {} };
      },
    });
    ready(f);
    assert.equal(await f.controller.transfer(), false);
    assert.equal(f.view.error, error);
    f.controller.load();
    assert.deepEqual(f.view.draft.state, solved);
  });

test("one deliberate auth handoff authorizes only the returned account and draft, once", () => {
  const f = fixture();
  f.controller.edit(solved);
  const draftId = f.view.draft.id;
  assert.equal(authorizeGuestHandoff("A", f.tab), false);
  assert.equal(f.controller.beginHandoff(), true);
  assert.equal(authorizeGuestHandoff("A", f.tab), true);
  assert.equal(takeGuestAuthorization("B", draftId, f.tab), false);
  assert.equal(takeGuestAuthorization("A", crypto.randomUUID(), f.tab), false);
  assert.equal(takeGuestAuthorization("A", draftId, f.tab), true);
  assert.equal(takeGuestAuthorization("A", draftId, f.tab), false);
  assert.equal(authorizeGuestHandoff("B", f.tab), false);
});

test("expired or inaccessible handoff storage never authorizes automatic import", () => {
  const tab = memory();
  tab.setItem(
    GUEST_RETURN_KEY,
    JSON.stringify({ id: crypto.randomUUID(), expires: Date.now() - 1 })
  );
  assert.equal(guestReturnPath(tab), null);
  assert.equal(tab.getItem(GUEST_RETURN_KEY), null);
  assert.equal(authorizeGuestHandoff("A", tab), false);
  const denied = {
    getItem() {
      throw new Error("denied");
    },
  };
  assert.equal(guestReturnPath(denied), null);
  assert.equal(takeGuestAuthorization("A", "draft", denied), false);
});

test("visiting required email verification preserves the already authorized account handoff", () => {
  const f = fixture();
  f.controller.edit(solved);
  f.controller.beginHandoff();
  const draftId = f.view.draft.id;
  authorizeGuestHandoff("A", f.tab);
  f.setUser("A");
  f.controller.beginHandoff();
  assert.equal(takeGuestAuthorization("A", draftId, f.tab), true);
});

test("a generic service rate limit is not presented as a daily lesson allowance", async () => {
  const f = fixture({
    request: async () => {
      throw { statusCode: 429, data: { code: "rate_limited" } };
    },
  });
  ready(f);
  assert.equal(await f.controller.transfer(), false);
  assert.equal(f.view.error, "save");
});

test("guest use renews the 30-day inactivity period; an expired read removes the bytes", () => {
  let time = 1000;
  const f = fixture({ now: () => time });
  f.controller.edit(solved);
  time += GUEST_TTL_MS - 1;
  f.controller.load();
  assert.deepEqual(f.view.draft.state, solved);
  assert.equal(JSON.parse(f.local.getItem(GUEST_KEY)).guest.lastUsedAt, time);
  time += GUEST_TTL_MS;
  f.controller.load();
  assert.deepEqual(f.view.draft.state, {});
  assert.equal(f.local.getItem(GUEST_KEY), null);
  assert.equal(f.calls.length, 0);
});

test("legacy guest drafts get one grace period and confirmed legacy account copies are pruned", () => {
  let time = 1000;
  const local = memory();
  const draft = { version: 1, id: crypto.randomUUID(), owner: null, state: solved, finished: true };
  const pending = {
    ...draft,
    owner: "B",
    pending: { request_id: crypto.randomUUID(), expected_revision: 0, state: solved },
  };
  local.setItem(
    GUEST_KEY,
    JSON.stringify({
      version: 1,
      guest: draft,
      accounts: { A: { ...draft, owner: "A", saved: true }, B: pending },
    })
  );
  const f = fixture({ local, now: () => time });
  const store = JSON.parse(local.getItem(GUEST_KEY));
  assert.equal(store.guest.lastUsedAt, time);
  assert.equal(store.accounts.A, undefined);
  assert.deepEqual(store.accounts.B.pending, pending.pending);
  time += GUEST_TTL_MS;
  f.controller.load();
  assert.equal(JSON.parse(local.getItem(GUEST_KEY)).guest, null);
  f.setUser("B");
  assert.deepEqual(
    f.view.draft.pending,
    pending.pending,
    "uncertain account writes never expire as guest drafts"
  );
});

test("failed cleanup after a confirmed server save retains the exact retry request", async () => {
  const f = fixture();
  ready(f);
  const remove = f.local.removeItem;
  f.local.removeItem = () => {
    throw new Error("denied");
  };
  assert.equal(await f.controller.transfer(), false);
  const pending = structuredClone(f.view.draft.pending);
  assert.equal(f.view.error, "storage");
  assert.equal(f.view.draft.saved, undefined);
  assert.deepEqual(JSON.parse(f.local.getItem(GUEST_KEY)).accounts.A.pending, pending);
  f.local.removeItem = remove;
  assert.equal(await f.controller.transfer(), true);
  assert.deepEqual(f.calls[1].body, f.calls[3].body);
  assert.equal(f.local.getItem(GUEST_KEY), null);
});
