// Without enough Morphcoins a purchase leads to the coin order and back; synthetic stand-ins only.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { parse } from "@vue/compiler-sfc";
import * as Vue from "vue";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const transpile = (source) =>
  ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023 } }).outputText;

/** Named functions and constants of a component, run against stand-ins for everything they reach. */
async function pieces(path, names, scope) {
  const { descriptor } = parse(await read(path));
  const script = (descriptor.scriptSetup ?? descriptor.script).content;
  const ast = ts.createSourceFile("component.ts", script, ts.ScriptTarget.Latest, true);
  const found = new Map();
  (function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text))
      found.set(node.name.text, node.getText(ast));
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((d) => names.includes(d.name.getText(ast)))
    )
      found.set(node.declarationList.declarations[0].name.getText(ast), node.getText(ast));
    ts.forEachChild(node, visit);
  })(ast);
  assert.deepEqual([...found.keys()].sort(), [...names].sort(), path);
  const environment = new Proxy(scope, {
    has: () => true,
    get: (target, key) =>
      key === Symbol.unscopables
        ? undefined
        : key in target
          ? target[key]
          : key in globalThis
            ? globalThis[key]
            : () => {},
  });
  return new Function(
    "environment",
    `with (environment) { ${transpile(names.map((name) => found.get(name)).join("\n"))}\nreturn { ${names.join(", ")} }; }`
  )(environment);
}
const minimum = Number(
  (await read("composables/shop.ts")).match(/export const COIN_PURCHASE_MIN = (\d+);/)[1]
);

test("the Premium card leads to the order of exactly the missing Morphcoins", async () => {
  assert.equal(minimum, 500);
  for (const [balance, yearly, missing] of [
    [0, false, 1000],
    [300, false, 700],
    [900, false, 500],
    [0, true, 10000],
    [9990, true, 500],
  ]) {
    const { hasEnoughCoins, coinOrder } = await pieces(
      "components/subscription/card.vue",
      ["planPrice", "hasEnoughCoins", "missingCoins", "coinOrder"],
      {
        computed: Vue.computed,
        props: { yearly, monthlyPrice: 1000, yearlyPrice: 10000 },
        coins: Vue.ref(balance),
        COIN_PURCHASE_MIN: minimum,
      }
    );
    assert.equal(hasEnoughCoins.value, false);
    assert.equal(coinOrder.value, `/morphcoins/paypal?coins=${missing}&next=subscription`);
  }
  const template = parse(await read("components/subscription/card.vue")).descriptor.template
    .content;
  assert.match(template, /<NuxtLink\s+:to="coinOrder"/);
  assert(!template.includes("!hasEnoughCoins"), "no disabled price button without a way out");
});

test("after the coin purchase only the Premium page is a return target", async () => {
  for (const [next, target] of [
    ["subscription", "/subscription"],
    [undefined, "/morphcoins/buy"],
    ["", "/morphcoins/buy"],
    ["/subscription", "/morphcoins/buy"],
    ["https://example.invalid", "/morphcoins/buy"],
    [["subscription"], "/morphcoins/buy"],
  ]) {
    const pushed = [];
    const dismissed = [];
    const { finish } = await pieces("components/PaypalCheckoutStatus.vue", ["finish"], {
      checkout: Vue.ref({ orderId: "ORDER-1" }),
      dismiss: async (...args) => dismissed.push(args),
      router: { push: (path) => pushed.push(path) },
      route: { query: { next } },
    });
    await finish();
    assert.deepEqual(dismissed, [["ORDER-1", "complete"]]);
    assert.deepEqual(pushed, [target], JSON.stringify(next));
  }
});

test("a heart refill without coins is explained in the coin shop, not by a snackbar", async () => {
  const block = await read("components/user/HeartsEmpty.vue");
  assert.match(block, /navigateTo\(\{ path: "\/morphcoins\/buy", query: \{ for: "hearts" \} \}\)/);
  assert(!block.includes("Error.NeedCoinsForRefill"));
  const shop = await read("components/form/BuyCoins.vue");
  assert.match(shop, /<p v-if="forHearts"[^>]*role="status">\s*\{\{ t\("Body\.NeedCoinsForRefill"/);
  assert.match(shop, /route\.query\.for === "hearts"/);
  for (const language of ["de", "en-US"]) {
    const locale = JSON.parse(await read(`locales/${language}.json`));
    assert.match(locale.Body.NeedCoinsForRefill, /\{coins\}/);
  }
});
