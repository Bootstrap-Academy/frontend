// The pricing page for a visitor without an account: the plans and their prices, and nothing an account alone has.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { parse } from "@vue/compiler-sfc";

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

test("a visitor who logs in while the pricing page is open gets the Premium state of the account", async () => {
  const source = await read("pages/subscription/index.vue");
  // The page decides at arrival whether to load the state; a later login in another tab turns
  // the visitor into an account, and the page then loads what it skipped.
  const watchers = [...source.matchAll(/watch\(guest, \(isGuest\) => \{([^}]*)\}\);/g)];
  assert.equal(watchers.length, 1);
  assert.equal(watchers[0][1].trim(), "if (!isGuest) void refreshPremiumStatus();");
  // Loading the state marks the page as busy before it asks, so the message about a missing
  // state stays away while the answer is on its way.
  const refresh = source.slice(source.indexOf("async function refreshPremiumStatus()"));
  const body = refresh.slice(0, refresh.indexOf("await getPremiumStatus()"));
  assert.match(body, /premiumBusy\.value = true;/);
});
