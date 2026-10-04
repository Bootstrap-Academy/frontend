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
