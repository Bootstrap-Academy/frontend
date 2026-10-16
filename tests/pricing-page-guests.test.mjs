// The pricing page for a visitor without an account: the plans and their prices, and nothing an account alone has.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { pieces } from "./helpers/component-pieces.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const locales = Object.fromEntries(
  await Promise.all(
    ["de", "en-US"].map(async (language) => [
      language,
      JSON.parse(await read(`locales/${language}.json`)),
    ])
  )
);

/** Every element of a component's template, each with the elements it stands in. */
async function elements(path) {
  const found = [];
  (function visit(node, parents) {
    if (node.type === 1) found.push({ node, parents });
    for (const child of node.children ?? [])
      visit(child, node.type === 1 ? [...parents, node] : parents);
    for (const branch of node.branches ?? []) visit(branch, parents);
  })(parse(await read(path)).descriptor.template.ast, []);
  return found;
}
const attribute = (node, name) => node.props.find((p) => p.name === name)?.value?.content;
const bound = (node, name) => node.props.find((p) => p.arg?.content === name)?.exp?.content;
const condition = (node) =>
  node.props.find((p) => ["if", "else-if"].includes(p.name))?.exp?.content.replace(/\s+/g, " ");

test("the pricing page shows a visitor without an account the plans, and reports nothing as missing", async () => {
  const page = await elements("pages/subscription/index.vue");
  // The cards do not wait for what only an account can load.
  const card = page.find(({ node }) => node.tag === "SubscriptionCard").node;
  assert.equal(condition(card), "policyKnown || guest");
  assert.equal(bound(card, "guest"), "guest");
  // The message about a Premium state that did not load is for accounts.
  const alerts = page.filter(({ node }) => attribute(node, "role") === "alert");
  const missing = alerts.filter(({ node }) =>
    node.loc.source.includes("Error.PremiumStatusUnavailable")
  );
  assert.equal(missing.length, 1);
  assert.equal(condition(missing[0].node), "!guest && !premiumStatusKnown && !premiumBusy");
  // Nothing asks for that state on arrival, so nothing fails and nothing pops up.
  const source = await read("pages/subscription/index.vue");
  assert.match(source, /const guest = computed\(\(\) => !accessToken\.value\);/);
  const mounted = source.slice(source.indexOf("onMounted(async () => {"));
  const loads = mounted.slice(0, mounted.indexOf("});"));
  assert.match(loads, /\.\.\.\(guest\.value \? \[\] : \[refreshPremiumStatus\(\)\]\)/);
  assert.equal(loads.match(/refreshPremiumStatus\(\)/g).length, 1);
  assert.match(loads, /getPremiumPlans\(\)/);
  for (const language of ["de", "en-US"]) assert(locales[language].Links.CreateAccount, language);
});

/** The page's own session handling, run against a token and a stand-in for the API. */
async function sessionHandling(token, premiumStatus) {
  const page = await pieces(
    "pages/subscription/index.vue",
    [
      "premiumBusy",
      "accessToken",
      "guest",
      "renewalOrder",
      "order",
      "refreshPremiumStatus",
      "sessionChanged",
    ],
    {
      ref: Vue.ref,
      computed: Vue.computed,
      useAccessToken: () => token,
      getPremiumStatus: premiumStatus,
      openSnackbar() {},
    }
  );
  // The page hands its watcher exactly this function.
  const source = await read("pages/subscription/index.vue");
  assert.equal(source.match(/watch\(guest, sessionChanged\);/g)?.length, 1);
  Vue.watch(page.guest, page.sessionChanged);
  return page;
}

test("a visitor who logs in while the pricing page is open gets the Premium state of the account", async () => {
  // The page decides at arrival whether to load the state; a later login in another tab turns
  // the visitor into an account, and the page then loads what it skipped.
  const token = Vue.ref("");
  let asked = 0;
  let answer;
  const page = await sessionHandling(token, () => {
    asked++;
    return new Promise((resolve) => (answer = resolve));
  });
  assert.equal(page.guest.value, true);
  token.value = "a token";
  await Vue.nextTick();
  assert.equal(asked, 1);
  // While the answer is on its way the page is busy, so the message about a missing state
  // (shown for `!guest && !premiumStatusKnown && !premiumBusy`) stays away.
  assert.equal(page.premiumBusy.value, true);
  answer([{ premium: false, autopay: null }, null]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(page.premiumBusy.value, false);
});

test("an order or a renewal offer of an account closes when the account logs out while the page is open", async () => {
  // The logout happens in another tab; the open page learns of it through the token only.
  const token = Vue.ref("a token");
  let asked = 0;
  const page = await sessionHandling(token, async () => {
    asked++;
    return [{ premium: true, autopay: null }, null];
  });
  page.order.value = { kind: "premium", coins: 1000 };
  page.renewalOrder.value = { id: "offer", monthly_price: 1000 };
  token.value = "";
  await Vue.nextTick();
  assert.equal(page.order.value, null);
  assert.equal(page.renewalOrder.value, null);
  assert.equal(asked, 0);
  // A visitor who stays an account keeps an open order.
  const stays = await sessionHandling(Vue.ref("a token"), async () => [{ premium: true }, null]);
  stays.order.value = { kind: "premium", coins: 1000 };
  await Vue.nextTick();
  assert.deepEqual(stays.order.value, { kind: "premium", coins: 1000 });
});

test("on the pricing page a guest has no plan, whatever an account that logged out left in memory", async () => {
  // The session ends in another tab, or before "Back": the token is gone, the Premium state of
  // the account is still in memory. The page shows the visitor the plans of a guest.
  const token = Vue.ref("a token");
  const stored = Vue.ref({ premium: true });
  const { guest, isPremium } = await pieces(
    "pages/subscription/index.vue",
    ["premiumInfo", "accessToken", "guest", "isPremium"],
    { computed: Vue.computed, useAccessToken: () => token, usePremiumInfo: () => stored }
  );
  assert.equal(guest.value, false);
  assert.equal(isPremium.value, true);
  token.value = "";
  assert.equal(guest.value, true);
  assert.equal(isPremium.value, false);
  stored.value = { premium: false };
  token.value = "a token";
  assert.equal(isPremium.value, false);
});

test("a guest reads the header without the sentence about a renewal only an account can order", async () => {
  // The expression of the header, run for each kind of visitor.
  const header = (await elements("pages/subscription/index.vue")).find(
    ({ node }) => node.tag === "p" && node.loc.source.includes("Body.PremiumCardMain")
  ).node;
  const says = header.children.find((child) => child.type === 5).content.content;
  const key = (isDaily, guest) =>
    new Function("isDaily", "guest", "t", `return ${says}`)(isDaily, guest, (k) => k);
  assert.equal(key(false, true), "Body.PremiumCardMainGuest");
  assert.equal(key(false, false), "Body.PremiumCardMain");
  assert.equal(key(true, false), "DailyLearning.PremiumBenefit");
  for (const [language, renewal] of [
    ["de", /verlängerung/i],
    ["en-US", /renewal/i],
  ]) {
    const { PremiumCardMain, PremiumCardMainGuest } = locales[language].Body;
    // The guest reads the first sentence of what an account reads, and nothing about a renewal.
    assert(PremiumCardMain.startsWith(PremiumCardMainGuest + " "), language);
    assert(renewal.test(PremiumCardMain) && !renewal.test(PremiumCardMainGuest), language);
  }
});

test("the Premium link of a course page lands on the Premium card", async () => {
  const links = (await elements("components/course/Overview.vue")).filter(
    ({ node }) => node.tag === "NuxtLink" && node.loc.source.includes("Links.MorePremium")
  );
  assert.equal(links.length, 1);
  assert.equal(attribute(links[0].node, "to"), "/subscription#premium");
  const anchors = (await elements("components/subscription/card.vue")).filter(
    ({ node }) => attribute(node, "id") === "premium"
  );
  assert.equal(anchors.length, 1);
});
