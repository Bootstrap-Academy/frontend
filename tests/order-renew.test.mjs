// An order the server refuses as changed, without a charge (`refusal: "offer_changed"`), gets a
// new quote in the dialog, which stays open with empty boxes and says Body.OfferRenewed, as
// the coin page does after a 409. Synthetic stand-ins only.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as Vue from "vue";
import { evaluate } from "./helpers/mounted-page.mjs";
import { pieces } from "./helpers/component-pieces.mjs";

const owner = "10000000-0000-4000-8000-000000000001";
const quote = (id, kind, facts = {}) => ({
  id,
  hash: `hash-${id}`,
  text: "Angebot",
  declaration: "Erklärung",
  recipient: "Synthetic <synthetic@example.invalid>",
  expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  user_id: owner,
  source: "backend",
  product: { kind, reference: kind, coins: 50, title: kind, facts },
});
const ids = (n) => `70000000-0000-4000-8000-00000000000${n}`;
const changed = "Offer expired or changed; no charge";

/** composables/purchases.ts with the server answering the acceptance with `answer`; the
 * account holds `hearts` of 6 half hearts when they are read again. */
async function accepting(answer, hearts = 0) {
  const calls = { snackbars: [], navigated: [], refreshed: 0 };
  const store = new Map();
  const heartInfo = Vue.ref(null);
  const { acceptPurchase } = await evaluate("composables/purchases.ts", {
    useHeartInfo: () => heartInfo,
    useHeartConfig: () => Vue.ref({ hearts_max: 6, hearts_refill_price: 50 }),
    require: () => ({}),
    useUser: () => ({ value: { id: owner } }),
    navigator: {},
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
    POST: async (path) => {
      assert.equal(path, "/shop/purchases/accept");
      return answer;
    },
    getBalance: async () => calls.refreshed++,
    getHearts: async () => {
      calls.refreshed++;
      heartInfo.value = { hearts };
      return [{ hearts }, null];
    },
    getPremiumStatus: async () => calls.refreshed++,
    openSnackbar: (kind, key) => calls.snackbars.push([kind, key]),
    navigateTo: async (to) => calls.navigated.push(to),
  });
  return { acceptPurchase, calls, store };
}

test("an acceptance refused as a changed offer asks for a new quote and leaves the page", async () => {
  const offer = quote(ids(1), "hearts");
  const refused = { state: "failed", offer, review_reason: changed, refusal: "offer_changed" };
  const renewed = await accepting(refused);
  assert.equal(await renewed.acceptPurchase(offer), "renew");
  // Nothing was ordered: no notice of a rejected order, no way to the orders, no recovery entry.
  assert.deepEqual(renewed.calls.snackbars, []);
  assert.deepEqual(renewed.calls.navigated, []);
  assert.equal(renewed.calls.refreshed, 3, "balance, hearts and Premium are read again");
  assert.equal(renewed.store.size, 0);
  // Any other refusal, and one from a server without the code, keep their way to the orders;
  // the English review reason is not read.
  for (const answer of [
    { state: "failed", offer, review_reason: "Not enough coins; order rejected without charge" },
    { state: "failed", offer, review_reason: changed },
  ]) {
    const { acceptPurchase, calls } = await accepting(answer);
    assert.equal(await acceptPurchase(offer), true, answer.review_reason);
    assert.deepEqual(calls.snackbars, [["info", "Body.PurchaseRejected"]]);
    assert.deepEqual(calls.navigated, ["/orders"]);
  }
  const done = await accepting({ state: "fulfilled", offer });
  assert.equal(await done.acceptPurchase(offer), true);
  assert.deepEqual(done.calls.snackbars, [["success", "Body.PurchaseProvided"]]);
  assert.deepEqual(done.calls.navigated, []);
});

test("a refill refused because the hearts filled up meanwhile closes the dialog and stays on the page", async () => {
  const offer = quote(ids(1), "hearts", { refill_units: 6 });
  const full = { state: "failed", offer, review_reason: "No refill necessary; no charge" };
  // The free refill came in between: nothing left to buy, the learner stays in the quiz.
  const filled = await accepting(full, 6);
  assert.equal(await filled.acceptPurchase(offer), true);
  assert.deepEqual(filled.calls.snackbars, [["info", "Error.AlreadyHaveHearts"]]);
  assert.deepEqual(filled.calls.navigated, []);
  // With hearts still missing, a refusal keeps its way to the orders, and so does one of
  // another product while the hearts are full.
  for (const [answer, hearts] of [
    [full, 4],
    [{ state: "failed", offer: quote(ids(2), "premium_monthly"), review_reason: "x" }, 6],
  ]) {
    const { acceptPurchase, calls } = await accepting(answer, hearts);
    assert.equal(await acceptPurchase(answer.offer), true);
    assert.deepEqual(calls.snackbars, [["info", "Body.PurchaseRejected"]]);
    assert.deepEqual(calls.navigated, ["/orders"]);
  }
});

/** The order dialog of the subscription page; `answers` are what the acceptances return. */
async function subscriptionPage(answers, offers) {
  // `sequence` keeps the reads and requests in their order.
  const calls = { accepted: [], requested: [], snackbars: [], sequence: [] };
  const scope = {
    premiumBusy: Vue.ref(false),
    order: Vue.ref(null),
    renewalOrder: Vue.ref(null),
    ordering: Vue.ref(false),
    withdrawalConsent: Vue.ref(false),
    offerRenewed: Vue.ref(false),
    coins: Vue.ref(50000),
    locale: Vue.ref("de"),
    isDaily: Vue.ref(false),
    hearts: Vue.ref(2),
    refillPrice: Vue.ref(50),
    heartConfig: Vue.ref({ hearts_max: 6, hearts_refill_price: 50 }),
    offerWording: () => null,
    refreshPremiumStatus: async () => {
      calls.sequence.push("premium status");
      return { premium: false, autopay: null, renewal: null };
    },
    getHearts: async () => calls.sequence.push("hearts"),
    requestPurchaseOffer: async (path, fits) => {
      calls.requested.push(path);
      calls.sequence.push("quote");
      const next = offers.shift() ?? null;
      if (next) assert.equal(fits(next), true, "a new quote fits the account");
      return next;
    },
    acceptPurchase: async (offer) => {
      calls.accepted.push(offer.id);
      return answers.shift();
    },
    openSnackbar: (kind, key) => calls.snackbars.push([kind, key]),
  };
  const page = await pieces(
    "pages/subscription/index.vue",
    [
      "renewalKey",
      "renewalDescription",
      "offerRenewal",
      "accountRenewal",
      "premiumOffer",
      "premiumOrder",
      "subscribe",
      "heartsOffer",
      "heartsOrder",
      "filHearts",
      "confirmOrder",
    ],
    scope
  );
  return { ...page, scope, calls };
}

// What the confirmation reads and requests, in order: Premium reads its status before the
// order and again for the new quote; a heart refill reads the hearts for the new quote.
for (const [name, open, kind, facts, steps] of [
  [
    "Premium",
    (page) => page.subscribe(false),
    "premium_monthly",
    { renewal: null },
    ["premium status", "premium status", "quote"],
  ],
  [
    "a heart refill",
    (page) => page.filHearts(),
    "hearts",
    { refill_units: 4 },
    ["hearts", "quote"],
  ],
]) {
  test(`${name} on the subscription page: a changed offer is replaced in the open dialog`, async () => {
    const first = quote(ids(1), kind, facts);
    const second = quote(ids(2), kind, facts);
    const offers = [first, second];
    const page = await subscriptionPage(["renew", true], offers);
    await open(page);
    assert.equal(page.scope.order.value.offer.id, first.id);
    assert.equal(page.scope.offerRenewed.value, false);
    page.scope.withdrawalConsent.value = true;
    const before = page.calls.sequence.length;
    await page.confirmOrder();
    // The dialog stays with the new quote, empty boxes and the notice above them; nothing
    // was ordered, and no notice covers the order button.
    assert.equal(page.scope.order.value?.offer.id, second.id);
    assert.equal(page.scope.withdrawalConsent.value, false);
    assert.equal(page.scope.offerRenewed.value, true);
    assert.deepEqual(page.calls.snackbars, []);
    assert.equal(page.scope.ordering.value, false);
    assert.equal(page.calls.requested.length, 2);
    // The new quote is asked for the account as it is now: read again right before it.
    assert.deepEqual(page.calls.sequence.slice(before), steps);
    // Confirmed again, the new quote is ordered and the dialog closes.
    page.scope.withdrawalConsent.value = true;
    await page.confirmOrder();
    assert.deepEqual(page.calls.accepted, [first.id, second.id]);
    assert.equal(page.scope.order.value, null);
    // Opened again later, the dialog starts without the notice.
    offers.push(quote(ids(3), kind, facts));
    await open(page);
    assert.equal(page.scope.order.value?.offer.id, ids(3));
    assert.equal(page.scope.offerRenewed.value, false);
  });
}

test("without a new quote the dialog of the subscription page closes", async () => {
  const page = await subscriptionPage(["renew"], [quote(ids(1), "premium_monthly")]);
  await page.subscribe(false);
  page.scope.withdrawalConsent.value = true;
  await page.confirmOrder();
  assert.equal(page.scope.order.value, null);
  // requestPurchaseOffer has said why; the page adds nothing.
  assert.deepEqual(page.calls.snackbars, []);
});

test("the heart dialog at the limit replaces a changed offer and stays open", async () => {
  for (const [next, open] of [
    [quote(ids(2), "hearts", { refill_units: 6 }), true],
    [null, false],
  ]) {
    const snackbars = [];
    const requested = [];
    const scope = {
      offer: Vue.ref(quote(ids(1), "hearts", { refill_units: 4 })),
      ordering: Vue.ref(true),
      loading: Vue.ref(false),
      withdrawalConsent: Vue.ref(true),
      offerRenewed: Vue.ref(false),
      hearts: Vue.ref(0),
      heartConfig: Vue.ref({ hearts_max: 6, hearts_refill_price: 50 }),
      acceptPurchase: async () => "renew",
      requestPurchaseOffer: async (path, fits) => {
        requested.push(path);
        // The new quote is asked for the hearts the account has now.
        assert.equal(fits({ product: { facts: { refill_units: 6 } } }), true);
        return next;
      },
      openSnackbar: (kind, key) => snackbars.push([kind, key]),
    };
    const { confirmOrder, fnRefillHearts } = await pieces(
      "components/user/HeartsEmpty.vue",
      ["fnRefillHearts", "heartsOffer", "confirmOrder"],
      scope
    );
    await confirmOrder();
    assert.deepEqual(requested, ["/shop/purchases/offers/hearts"]);
    assert.equal(scope.ordering.value, open);
    assert.equal(scope.withdrawalConsent.value, false);
    assert.equal(scope.loading.value, false);
    // The notice stands in the dialog above the boxes, never over the order button.
    assert.equal(scope.offerRenewed.value, true);
    assert.deepEqual(snackbars, []);
    if (open) assert.equal(scope.offer.value.id, next.id);
    // Cancelled and opened again, the dialog shows its quote without the notice.
    Object.assign(scope, {
      ordering: Vue.ref(false),
      opening: Vue.ref(false),
      isDaily: Vue.ref(false),
      coins: Vue.ref(1000),
      refillPrice: Vue.ref(50),
      getBalance: async () => {},
      getHearts: async () => {},
      requestPurchaseOffer: async () => quote(ids(3), "hearts", { refill_units: 6 }),
    });
    await fnRefillHearts();
    assert.equal(scope.ordering.value, true);
    assert.equal(scope.offer.value.id, ids(3));
    assert.equal(scope.offerRenewed.value, false, "a dialog opened again has no notice");
  }
});
