// The order button stays operable so that it can say which declaration is still open.
// These tests prove that no order path dispatches without the declarations.
// Synthetic stand-ins only; nothing is requested or bought.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { pieces } from "./helpers/component-pieces.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function spy(result) {
  const calls = [];
  const fn = (...args) => {
    calls.push(args);
    return typeof result === "function" ? result(...args) : result;
  };
  fn.calls = calls;
  return fn;
}
const offer = { id: "offer-1", hash: "hash", user_id: "buyer", product: { coins: 500 } };

test("the order button never orders while a declaration is open and takes the buyer to it", async () => {
  const emitted = [];
  // What happens in which order once the button is pressed with a declaration open.
  const steps = [];
  const element = (name) => ({
    scrollIntoView: (options) => steps.push([name + " into view", options]),
    focus: (options) => steps.push([name + " focused", options]),
  });
  const box = element("declaration");
  let open = box;
  const props = { disabled: true, loading: false };
  const missing = Vue.ref(false);
  const { onclickOrder } = await pieces(
    "components/order/Summary.vue",
    ["onclickOrder", "showMissing"],
    {
      props,
      missing,
      emit: (event) => emitted.push(event),
      // The hint is rendered by the time the tick resolves.
      nextTick: () => Promise.resolve().then(() => steps.push(["hint rendered", missing.value])),
      actions: { value: element("buttons") },
      consent: {
        value: {
          querySelector(selector) {
            assert.equal(selector, "input[type=checkbox]:not(:checked)");
            return open;
          },
        },
      },
    }
  );
  const pressed = onclickOrder();
  assert.deepEqual(emitted, []);
  assert.equal(missing.value, true, "the hint is shown");
  assert.deepEqual(steps, [], "nothing moves before the hint has taken its place");
  await pressed;
  // The buttons first, the open declaration last: where the three do not fit on the
  // screen, the declaration wins. `nearest` leaves alone what is already in view.
  const nearest = { block: "nearest", behavior: "instant" };
  assert.deepEqual(steps, [
    ["hint rendered", true],
    ["buttons into view", nearest],
    ["declaration into view", nearest],
    ["declaration focused", { preventScroll: true }],
  ]);

  // Locked for another reason: still no order, and no hint about declarations.
  missing.value = false;
  steps.length = 0;
  open = null;
  await onclickOrder();
  assert.deepEqual(emitted, []);
  assert.equal(missing.value, false);
  assert.deepEqual(steps, []);

  props.disabled = false;
  props.loading = true;
  onclickOrder();
  assert.deepEqual(emitted, []);
  props.loading = false;
  onclickOrder();
  assert.deepEqual(emitted, ["order"]);

  const template = parse(await read("components/order/Summary.vue")).descriptor.template.content;
  assert.match(template, /:aria-disabled="disabled"/);
  assert(!template.includes("pointer-events-none"), "the button has to receive the click");
  assert.match(template, /v-if="missing"[^>]*role="alert"/);
  // The hint stands between the declarations and the buttons that are brought into view.
  const consentAt = template.indexOf('ref="consent"'),
    hintAt = template.indexOf('v-if="missing"'),
    actionsAt = template.indexOf('ref="actions"');
  assert(consentAt > 0 && consentAt < hintAt && hintAt < actionsAt);
});

test("the heart refill is not accepted without the declarations", async () => {
  for (const consented of [false, true]) {
    const acceptPurchase = spy(true);
    const openSnackbar = spy();
    const { confirmOrder } = await pieces("components/user/HeartsEmpty.vue", ["confirmOrder"], {
      loading: Vue.ref(false),
      ordering: Vue.ref(true),
      withdrawalConsent: Vue.ref(consented),
      offer: Vue.ref(offer),
      acceptPurchase,
      openSnackbar,
    });
    await confirmOrder();
    assert.equal(acceptPurchase.calls.length, consented ? 1 : 0);
    assert.deepEqual(
      openSnackbar.calls,
      consented ? [] : [["error", "Error.WithdrawalConsentMissing"]]
    );
  }
});

test("Premium and hearts on the Premium page are not ordered without the declarations", async () => {
  for (const consented of [false, true]) {
    const submit = spy(true);
    const openSnackbar = spy();
    const { confirmOrder } = await pieces("pages/subscription/index.vue", ["confirmOrder"], {
      order: Vue.ref({ kind: "", submit }),
      ordering: Vue.ref(false),
      withdrawalConsent: Vue.ref(consented),
      openSnackbar,
    });
    await confirmOrder();
    assert.equal(submit.calls.length, consented ? 1 : 0);
    assert.deepEqual(
      openSnackbar.calls,
      consented ? [] : [["error", "Error.WithdrawalConsentMissing"]]
    );
  }
});

test("the Premium renewal is not ordered while one of its declarations is open", async () => {
  for (const [accepted, withdrawal] of [
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ]) {
    const GET = spy({ id: "renewal-1" });
    const updatePremiumAutoPay = spy([{ renewal: { id: "request-1" } }, null]);
    const { confirmRenewal } = await pieces("pages/subscription/index.vue", ["confirmRenewal"], {
      renewalOrder: Vue.ref({ id: "renewal-1", request_id: "request-1" }),
      premiumBusy: Vue.ref(false),
      renewalAccepted: Vue.ref(accepted),
      renewalWithdrawalConsent: Vue.ref(withdrawal),
      GET,
      updatePremiumAutoPay,
    });
    await confirmRenewal();
    const ordered = accepted && withdrawal;
    assert.equal(GET.calls.length, ordered ? 1 : 0);
    assert.equal(updatePremiumAutoPay.calls.length, ordered ? 1 : 0);
    if (ordered)
      assert.deepEqual(updatePremiumAutoPay.calls[0][0].consent, {
        request_id: "request-1",
        offer_id: "renewal-1",
        accepted: true,
        withdrawal_consent: true,
      });
  }
});

test("a course is not unlocked without the declarations", async () => {
  for (const consented of [false, true]) {
    const enrollIntoCourse = spy([{ state: "fulfilled" }, null]);
    const snackbar = Vue.ref({});
    const { onclickOrder } = await pieces(
      "components/course/Overview.vue",
      ["onclickOrder", "canOrder"],
      {
        computed: Vue.computed,
        purchaseOffer: Vue.ref(offer),
        withdrawalConsent: Vue.ref(consented),
        snackbar,
        loading: Vue.ref(false),
        confirming: Vue.ref(true),
        props: { data: { id: "course-1" } },
        link: Vue.ref("/courses/course-1"),
        router: { push() {} },
        withPurchaseRecovery: async (_offer, action) => action(),
        enrollIntoCourse,
      }
    );
    await onclickOrder();
    assert.equal(enrollIntoCourse.calls.length, consented ? 1 : 0);
    assert.equal(
      snackbar.value.heading,
      consented ? undefined : "Error.MustAgreeToBothPointsInOrderToMoveForward"
    );
  }
});

test("a Morphcoin order is not created without the declarations", async () => {
  for (const consented of [false, true]) {
    const create = spy("ORDER-1");
    const getPaypalClientID = spy();
    const openSnackbar = spy();
    const { onclickOrder } = await pieces("pages/morphcoins/paypal.vue", ["onclickOrder"], {
      active: true,
      actionGeneration: 0,
      offerGeneration: 0,
      placing: Vue.ref(false),
      busy: Vue.ref(false),
      ordered: Vue.ref(false),
      checkout: Vue.ref(null),
      error: Vue.ref(""),
      sdkError: Vue.ref(false),
      validAmount: Vue.ref(true),
      canBuy: Vue.ref(true),
      offer: Vue.ref(offer),
      user: Vue.ref({ id: "buyer" }),
      withdrawalConsent: Vue.ref(consented),
      paypalClientID: Vue.ref("client"),
      purchaseAcceptance: () => ({ accepted: true, early_performance_requested: true }),
      withPurchaseRecovery: async (_offer, action) => action(),
      nextTick: async () => {},
      getPaypalClientID,
      openSnackbar,
      create,
    });
    await onclickOrder();
    assert.equal(getPaypalClientID.calls.length, consented ? 1 : 0);
    assert.equal(create.calls.length, consented ? 1 : 0);
    assert.deepEqual(
      openSnackbar.calls,
      consented ? [] : [["error", "Error.WithdrawalConsentMissing"]]
    );
  }
});

test("the declaration labels use the colour of the surrounding order text", async () => {
  const template = parse(await read("components/order/Contract.vue")).descriptor.template.content;
  // Two declarations in each layout: the short offer and the long one.
  const labels = template.match(/<label\b[^>]*>/g);
  assert.equal(labels.length, 4);
  for (const label of labels) {
    if (/class="[^"]*\btext-body\b/.test(label)) continue;
    // The acceptance of a short offer is labelled by `for`; its row carries the colour.
    assert.match(label, /:for="acceptanceId"/);
    assert.match(
      template,
      /<div class="flex items-start gap-3 text-body">\s*<input\s+:id="acceptanceId"/
    );
  }
});
