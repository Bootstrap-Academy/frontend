import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const compile = async (name) =>
  ts.transpileModule(
    (await readFile(new URL(`../composables/${name}.ts`, import.meta.url), "utf8"))
      .replace(/^import .*;\n/gm, "")
      .replace(/^export /gm, ""),
    { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None } }
  ).outputText;
const purchases = await compile("purchases"),
  paypal = await compile("paypalCheckout");
const owner = "10000000-0000-4000-8000-000000000001",
  id = "20000000-0000-4000-8000-000000000002";
function fixture() {
  const map = new Map(),
    user = { value: { id: owner } },
    states = new Map();
  const localStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
  return { map, user, localStorage, states };
}
const key = `purchase-checkout:${owner}:backend:premium`;
const order = (state = "fulfilled") => ({
  state,
  offer: {
    id,
    user_id: owner,
    source: "backend",
    expires_at: "2000-01-01T00:00:00Z",
    product: { kind: "premium_monthly", reference: "", coins: 1, title: "Premium" },
  },
});
test("orders read cleans only confirmed final orders or an unused expired offer, with exact owner/order identity", async () => {
  for (const state of ["fulfilled", "failed", "offered", "awaiting_payment", "pending", "review"]) {
    const f = fixture();
    f.map.set(key, JSON.stringify({ owner, orderId: id }));
    const api = new Function(
      "useUser",
      "localStorage",
      "navigator",
      "GET",
      purchases + "\nreturn {cleanupPurchaseRecovery};"
    )(
      () => f.user,
      f.localStorage,
      { locks: { request: (k, fn) => fn() } },
      async () => order(state)
    );
    await api.cleanupPurchaseRecovery(order(state));
    assert.equal(f.map.has(key), ["awaiting_payment", "pending", "review"].includes(state), state);
  }
});
test("a stale expired offer cannot erase a newly accepted payment or an uncoordinated checkout", async () => {
  for (const scenario of ["accepted", "status-lost", "no-lock"]) {
    const f = fixture();
    const original = JSON.stringify({ owner, orderId: id });
    f.map.set(key, original);
    let reads = 0;
    const api = new Function(
      "useUser",
      "localStorage",
      "navigator",
      "GET",
      purchases + "\nreturn {cleanupPurchaseRecovery};"
    )(
      () => f.user,
      f.localStorage,
      scenario === "no-lock" ? {} : { locks: { request: (k, fn) => fn() } },
      async () => {
        reads++;
        if (scenario === "status-lost") throw Error("lost status");
        return order("awaiting_payment");
      }
    );
    await api.cleanupPurchaseRecovery(order("offered"));
    assert.equal(f.map.get(key), original);
    assert.equal(reads, scenario === "no-lock" ? 0 : 1);
  }
});
test("late cleanup, an owner change and malformed saved data cannot erase another order", async () => {
  for (const scenario of ["new-order", "new-owner", "malformed", "unexpired"]) {
    const f = fixture();
    f.map.set(
      key,
      scenario === "malformed"
        ? "unreadable"
        : JSON.stringify({ owner, orderId: scenario === "new-order" ? id.replace(/2/g, "3") : id })
    );
    const before = f.map.get(key),
      status = order(scenario === "unexpired" ? "offered" : "fulfilled");
    if (scenario === "unexpired") status.offer.expires_at = "2100-01-01T00:00:00Z";
    const api = new Function(
      "useUser",
      "localStorage",
      "navigator",
      purchases + "\nreturn {cleanupPurchaseRecovery};"
    )(() => f.user, f.localStorage, {
      locks: {
        request: (k, fn) => {
          if (scenario === "new-owner") f.user.value = { id: "other" };
          return fn();
        },
      },
    });
    await api.cleanupPurchaseRecovery(status);
    assert.equal(f.map.get(key), before);
  }
});
function checkout(f, capture = async () => [null]) {
  const computed = (fn) => ({
      get value() {
        return fn();
      },
    }),
    useState = (k, init) => {
      if (!f.states.has(k)) f.states.set(k, { value: init() });
      return f.states.get(k);
    };
  return new Function(
    "useUser",
    "useCoins",
    "useState",
    "computed",
    "watch",
    "useEventListener",
    "window",
    "localStorage",
    "navigator",
    "onApproveCapturePaypalOrder",
    paypal + "\nreturn usePaypalCheckout();"
  )(
    () => f.user,
    () => ({ value: 0 }),
    useState,
    computed,
    (fn, run, opt) => {
      if (opt?.immediate) run(fn());
    },
    () => {},
    {},
    f.localStorage,
    { locks: { request: (k, fn) => fn() } },
    capture
  );
}
const pkey = `paypal-checkout:${owner}`;
test("PayPal confirmation removes persistent recovery and retains the mounted end card", async () => {
  const f = fixture();
  f.map.set(pkey, JSON.stringify({ owner, orderId: "original", coins: 100, phase: "approval" }));
  const api = checkout(f, async () => [{ coins: 100 }]);
  await api.capture("original");
  assert(!f.map.has(pkey));
  assert.equal(api.checkout.value.phase, "complete");
  await api.dismiss("original", "complete");
  assert.equal(api.checkout.value, null);
});
test("PayPal every unconfirmed capture retains its original identity even after a year", async () => {
  for (const result of [null, {}, { coins: "unverified" }]) {
    const f = fixture();
    f.map.set(
      pkey,
      JSON.stringify({ owner, orderId: "original", coins: 100, phase: "approval", createdAt: 0 })
    );
    const api = checkout(f, async () => [result]);
    await api.capture("original");
    assert.equal(JSON.parse(f.map.get(pkey)).orderId, "original");
    assert.equal(JSON.parse(f.map.get(pkey)).phase, "pending");
  }
});
test("legacy confirmed PayPal copies and abandoned probes are removed on reentry; unreadable payments stay", () => {
  const f = fixture();
  f.map.set(pkey, JSON.stringify({ owner, orderId: "old", coins: 100, phase: "complete" }));
  f.map.set(pkey + ":probe", "1");
  checkout(f);
  assert.equal(f.map.size, 0);
  f.map.set(pkey, "unreadable");
  const api = checkout(f);
  assert.equal(f.map.get(pkey), "unreadable");
  assert.equal(api.error.value, "PaypalRecovery.StorageError");
});

// Cross-tab edge cases: tabs share localStorage and one origin-wide Web Locks manager.
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => ((resolve = yes), (reject = no)));
  return { promise, resolve, reject };
};
const tick = () => new Promise((r) => setTimeout(r, 0));
const SETTLE_MS = 10 * 60 * 1000;
/** Exclusive Web Locks, FIFO per name. */
function webLocks() {
  const tails = new Map();
  return {
    request(name, fn) {
      const previous = tails.get(name) || Promise.resolve();
      let release;
      const gate = new Promise((r) => (release = r));
      tails.set(
        name,
        previous.then(() => gate)
      );
      return previous.then(async () => {
        try {
          return await fn();
        } finally {
          release();
        }
      });
    },
  };
}
const offer = (expires) => ({
  ...order("offered").offer,
  hash: "h",
  expires_at: new Date(expires).toISOString(),
});
function tab({ f, locks, server }) {
  return new Function(
    "useUser",
    "localStorage",
    "navigator",
    "GET",
    "navigateTo",
    purchases + "\nreturn {cleanupPurchaseRecovery, withPurchaseRecovery};"
  )(
    () => f.user,
    f.localStorage,
    locks === null ? {} : { locks },
    async () => server(),
    async () => {}
  );
}

test("cleanup of an expired offer waits for an acceptance holding the lock and then rereads", async () => {
  for (const committed of ["fulfilled", "awaiting_payment", "paid"]) {
    const f = fixture(),
      locks = webLocks();
    const expired = offer(Date.now() - SETTLE_MS - 1000);
    let state = "offered";
    const server = () => ({ state, offer: expired });
    const a = tab({ f, locks, server }),
      b = tab({ f, locks, server });
    const response = deferred();
    const acceptance = a.withPurchaseRecovery(expired, async () => {
      await response.promise;
      state = committed;
      return { state: committed };
    });
    await tick();
    assert(f.map.has(key), "identity saved before dispatch");
    const cleanup = b.cleanupPurchaseRecovery({ state: "offered", offer: expired });
    await tick();
    await tick();
    assert(f.map.has(key), `${committed}: cleanup waits for the acceptance`);
    response.resolve();
    await acceptance;
    await cleanup;
    assert.equal(f.map.has(key), committed !== "fulfilled", committed);
  }
});

test("a lost acceptance response shortly before expiry keeps its identity until the settle time has passed", async () => {
  const f = fixture(),
    locks = webLocks();
  let state = "offered";
  const justExpired = offer(Date.now() - 60 * 1000);
  const server = () => ({ state, offer: justExpired });
  const a = tab({ f, locks, server }),
    b = tab({ f, locks, server });
  // Tab A: the request reached the server, the client gave up and released the lock.
  await assert.rejects(
    a.withPurchaseRecovery(justExpired, async () => {
      throw new Error("network");
    })
  );
  await b.cleanupPurchaseRecovery({ state: "offered", offer: justExpired });
  assert(f.map.has(key), "identity kept while a late commit is still possible");
  state = "paid"; // the server transaction commits late
  await b.cleanupPurchaseRecovery({ state, offer: justExpired });
  assert.equal(JSON.parse(f.map.get(key)).orderId, id, "the order stays resumable");
  // After the settle time an unaccepted offer is removed after a fresh read.
  state = "offered";
  const settled = offer(Date.now() - SETTLE_MS - 1000);
  await tab({ f, locks, server: () => ({ state, offer: settled }) }).cleanupPurchaseRecovery({
    state,
    offer: settled,
  });
  assert.equal(f.map.has(key), false);
});

test("without Web Locks an unreadable recovery is kept and no rejection escapes the cleanup", async () => {
  // A child process, because node:test fails a test on any unhandled rejection.
  const { execFileSync } = await import("node:child_process");
  const script = `const code = ${JSON.stringify(purchases)};
const map = new Map([[${JSON.stringify(key)}, "{not json"], ["other", "x"]]);
const local = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) };
const seen = [];
process.on("unhandledRejection", (r) => seen.push(r?.name));
const api = new Function("useUser", "localStorage", "navigator", "GET", code + "\\nreturn {cleanupPurchaseRecovery};")(
  () => ({ value: { id: ${JSON.stringify(owner)} } }), local, {}, async () => null);
await api.cleanupPurchaseRecovery(${JSON.stringify(order("fulfilled"))});
await new Promise((r) => setTimeout(r, 10));
console.log(JSON.stringify({ seen, kept: map.get(${JSON.stringify(key)}) }));`;
  const out = JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
    }).trim()
  );
  assert.equal(out.kept, "{not json", "unreadable recovery stays");
  assert.deepEqual(out.seen, [], "the documented catch handles the failure");
});

test("a client clock far ahead can remove a valid offer's identity early; acceptance saves it again first", async () => {
  const f = fixture(),
    locks = webLocks();
  const validOnServer = offer(Date.now() - SETTLE_MS - 1000);
  const a = tab({ f, locks, server: () => ({ state: "offered", offer: validOnServer }) });
  f.map.set(key, JSON.stringify({ owner, orderId: id }));
  await a.cleanupPurchaseRecovery({ state: "offered", offer: validOnServer });
  assert.equal(f.map.has(key), false);
  let savedBeforeDispatch = false;
  await a.withPurchaseRecovery(validOnServer, async () => {
    savedBeforeDispatch = JSON.parse(f.map.get(key)).orderId === id;
    return { state: "fulfilled" };
  });
  assert(savedBeforeDispatch);
});

function paypalTab(f, locks, capture) {
  const computed = (fn) => ({
      get value() {
        return fn();
      },
    }),
    useState = (k, init) => {
      if (!f.states.has(k)) f.states.set(k, { value: init() });
      return f.states.get(k);
    };
  return new Function(
    "useUser",
    "useCoins",
    "useState",
    "computed",
    "watch",
    "useEventListener",
    "window",
    "localStorage",
    "navigator",
    "onApproveCapturePaypalOrder",
    "createPaypalOrder",
    paypal + "\nreturn usePaypalCheckout();"
  )(
    () => f.user,
    () => ({ value: 0 }),
    useState,
    computed,
    (fn, run, opt) => opt?.immediate && run(fn()),
    () => {},
    {},
    f.localStorage,
    { locks },
    capture,
    async () => ["new-order"]
  );
}

test("PayPal: a late cancel in another tab never erases a running or lost capture", async () => {
  for (const outcome of ["success", "lost"]) {
    const f = fixture(),
      locks = webLocks();
    f.map.set(pkey, JSON.stringify({ owner, orderId: "o1", coins: 100, phase: "approval" }));
    const response = deferred();
    let calls = 0;
    const capture = async () => {
      calls++;
      if (calls === 1) {
        await response.promise;
        if (outcome === "lost") throw new Error("network");
      }
      return [{ coins: 100 }];
    };
    // Separate component state per tab, shared storage and locks.
    const a = paypalTab({ ...f, states: new Map() }, locks, capture),
      b = paypalTab({ ...f, states: new Map() }, locks, capture);
    const running = a.capture("o1");
    await tick();
    assert.equal(JSON.parse(f.map.get(pkey)).phase, "pending");
    const cancel = b.dismiss("o1", "approval");
    response.resolve();
    await running;
    await cancel;
    if (outcome === "success") {
      assert.equal(f.map.has(pkey), false);
      assert.equal(a.checkout.value.phase, "complete");
    } else {
      assert.equal(JSON.parse(f.map.get(pkey)).phase, "pending");
      // No new PayPal order before the first capture is confirmed.
      await assert.rejects(b.create(100, "{}"));
    }
  }
});
