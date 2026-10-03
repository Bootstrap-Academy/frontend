import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const GUEST_KEY = "academy-guest-learning:1",
  GUEST_RETURN_KEY = "academy-guest-return:1";
const source = await readFile(new URL("../utils/learningStorage.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source.replace(/^import .*;\n/gm, "").replace(/^export /gm, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
}).outputText;
const { prepareLearningLogout, clearLearningStorage, registerLearningLogout } = new Function(
  "GUEST_KEY",
  "GUEST_RETURN_KEY",
  code + "\nreturn { prepareLearningLogout, clearLearningStorage, registerLearningLogout };"
)(GUEST_KEY, GUEST_RETURN_KEY);
const storage = () => {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) || null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
    key: (i) => [...map.keys()][i] || null,
    get length() {
      return map.size;
    },
  };
};

test("explicit logout warns before removing unconfirmed work; cancelling keeps exact owned requests", async () => {
  const stores = { local: storage(), tab: storage() };
  const guest = { owner: null, state: { stage: 1 } };
  const own = { owner: "A", pending: { request_id: "same-request", state: { stage: 2 } } };
  const other = { owner: "B", pending: { request_id: "other" } };
  stores.local.setItem(
    GUEST_KEY,
    JSON.stringify({ version: 1, guest, accounts: { A: own, B: other } })
  );
  stores.tab.setItem("academy-challenge-draft:A:coding:t:s", "private code");
  stores.tab.setItem("academy-learning-recovery:activity:c:u:A", "uncertain completion");
  stores.tab.setItem("academy-learning-recovery:A", "draft");
  stores.tab.setItem("academy-challenge-draft:B:coding:t:s", "another account");
  stores.tab.setItem("purchase-checkout:A:product", "uncertain purchase");
  stores.tab.setItem(GUEST_RETURN_KEY, JSON.stringify({ owner: "A", authorizedFor: "A" }));
  let prompts = 0;
  assert.equal(
    await prepareLearningLogout(
      "A",
      () => {
        prompts++;
        return false;
      },
      stores
    ),
    false
  );
  assert.deepEqual(JSON.parse(stores.local.getItem(GUEST_KEY)).accounts.A, own);
  assert.equal(
    stores.tab.getItem("academy-learning-recovery:activity:c:u:A"),
    "uncertain completion"
  );
  assert.equal(
    await prepareLearningLogout(
      "A",
      () => {
        prompts++;
        return true;
      },
      stores
    ),
    true
  );
  clearLearningStorage("A", stores);
  const retained = JSON.parse(stores.local.getItem(GUEST_KEY));
  assert.deepEqual(retained.guest, guest);
  assert.deepEqual(retained.accounts, { B: other });
  assert.equal(stores.tab.getItem("academy-learning-recovery:A"), null);
  assert.equal(stores.tab.getItem("academy-learning-recovery:activity:c:u:A"), null);
  assert.equal(stores.tab.getItem("academy-challenge-draft:A:coding:t:s"), null);
  assert.equal(stores.tab.getItem(GUEST_RETURN_KEY), null);
  assert.equal(stores.tab.getItem("academy-challenge-draft:B:coding:t:s"), "another account");
  assert.equal(stores.tab.getItem("purchase-checkout:A:product"), "uncertain purchase");
  assert.equal(prompts, 2);
});

test("mounted guards checkpoint first, block an active submission and clear in-memory recovery", async () => {
  const stores = { local: storage(), tab: storage() };
  let busy = true,
    cleared = false,
    writes = 0;
  const unregister = registerLearningLogout({
    user: () => "A",
    prepare: () => {
      if (busy) return false;
      writes++;
      stores.tab.setItem("academy-learning-recovery:A", "checkpoint");
      return true;
    },
    unsaved: () => true,
    clear: (user) => {
      cleared = user === "A";
    },
  });
  try {
    assert.equal(
      await prepareLearningLogout(
        "A",
        () => assert.fail("don't discard during a submission"),
        stores
      ),
      false
    );
    busy = false;
    assert.equal(await prepareLearningLogout("A", () => false, stores), false);
    assert.equal(writes, 1);
    assert.equal(cleared, false);
    assert.equal(await prepareLearningLogout("A", () => true, stores), true);
    clearLearningStorage("A", stores);
    assert.equal(cleared, true);
    assert.equal(stores.tab.getItem("academy-learning-recovery:A"), null);
  } finally {
    unregister();
  }
});

test("confirmed work and an unclaimed guest do not require a loss warning", async () => {
  const stores = { local: storage(), tab: storage() };
  stores.local.setItem(
    GUEST_KEY,
    JSON.stringify({ version: 1, guest: { owner: null }, accounts: { A: { saved: true } } })
  );
  assert.equal(
    await prepareLearningLogout("A", () => assert.fail("already confirmed"), stores),
    true
  );
  clearLearningStorage("A", stores);
  assert.deepEqual(JSON.parse(stores.local.getItem(GUEST_KEY)).accounts, {});
  stores.local.setItem(
    GUEST_KEY,
    JSON.stringify({ version: 1, guest: null, accounts: { A: { saved: true } } })
  );
  clearLearningStorage("A", stores);
  assert.equal(stores.local.getItem(GUEST_KEY), null);
});

for (const failure of ["getItem", "setItem", "removeItem"])
  test(`logout cleans accessible tab copies despite a local ${failure} failure`, async () => {
    const stores = { local: storage(), tab: storage() };
    stores.local.setItem(
      GUEST_KEY,
      JSON.stringify({
        version: 1,
        guest: failure === "setItem" ? { owner: null } : null,
        accounts: { A: { owner: "A" } },
      })
    );
    stores.local[failure] = () => {
      throw new Error("blocked");
    };
    stores.tab.setItem("academy-challenge-draft:A:quiz:t:s", "private answer");
    stores.tab.setItem("academy-learning-recovery:A", "pending save");
    stores.tab.setItem(GUEST_RETURN_KEY, JSON.stringify({ authorizedFor: "A" }));
    stores.tab.setItem("academy-challenge-draft:B:quiz:t:s", "other account");
    stores.tab.setItem("purchase-checkout:A:product", "uncertain payment");
    assert.equal(await prepareLearningLogout("A", () => true, stores), true);
    assert.doesNotThrow(() => clearLearningStorage("A", stores));
    assert.equal(stores.tab.getItem("academy-challenge-draft:A:quiz:t:s"), null);
    assert.equal(stores.tab.getItem("academy-learning-recovery:A"), null);
    assert.equal(stores.tab.getItem(GUEST_RETURN_KEY), null);
    assert.equal(stores.tab.getItem("academy-challenge-draft:B:quiz:t:s"), "other account");
    assert.equal(stores.tab.getItem("purchase-checkout:A:product"), "uncertain payment");
  });

test("one blocked tab key cannot prevent removing the remaining copies", () => {
  const stores = { local: storage(), tab: storage() };
  const blockedKey = "academy-challenge-draft:A:quiz:t:s";
  stores.tab.setItem(blockedKey, "blocked");
  stores.tab.setItem("academy-learning-recovery:A", "pending save");
  stores.tab.setItem(GUEST_RETURN_KEY, JSON.stringify({ owner: "A" }));
  const remove = stores.tab.removeItem;
  stores.tab.removeItem = (key) => {
    if (key === blockedKey) throw new Error("blocked");
    remove(key);
  };
  clearLearningStorage("A", stores);
  assert.equal(stores.tab.getItem(blockedKey), "blocked");
  assert.equal(stores.tab.getItem("academy-learning-recovery:A"), null);
  assert.equal(stores.tab.getItem(GUEST_RETURN_KEY), null);
});
