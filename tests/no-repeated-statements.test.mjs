// The same statement stands once on a page; read from the templates, with synthetic balances.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { pieces } from "./helpers/component-pieces.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const template = async (path) => parse(await read(path)).descriptor.template.ast;

/** Every element of a template, each with the elements it stands in. */
function elements(root) {
  const found = [];
  (function visit(node, parents) {
    if (node.type === 1) found.push({ node, parents });
    for (const child of node.children ?? [])
      visit(child, node.type === 1 ? [...parents, node] : parents);
  })(root, []);
  return found;
}
/** Every `{{ … }}` of a template, each with the elements it stands in. */
function sayings(root) {
  const found = [];
  (function visit(node, parents) {
    if (node.type === 5) found.push({ says: node.content.content, parents });
    for (const child of node.children ?? [])
      visit(child, node.type === 1 ? [...parents, node] : parents);
  })(root, []);
  return found;
}
const bound = (node, name) => node.props.find((p) => p.arg?.content === name)?.exp?.content;
const condition = (node) =>
  node.props.find((p) => p.type === 7 && ["if", "else-if", "show"].includes(p.name))?.exp?.content;

const minimum = Number(
  (await read("composables/shop.ts")).match(/export const COIN_PURCHASE_MIN = (\d+);/)[1]
);

test("the Premium card button names an amount only when it orders another one than the price above it", async () => {
  for (const [balance, yearly, missing, differs] of [
    [0, false, 1000, false],
    [0, true, 10000, false],
    [300, false, 700, true],
    [900, false, 500, true],
    [300, true, 9700, true],
    [9990, true, 500, true],
  ]) {
    const { missingCoins, orderDiffers } = await pieces(
      "components/subscription/card.vue",
      ["planPrice", "hasEnoughCoins", "missingCoins", "orderDiffers"],
      {
        computed: Vue.computed,
        props: { yearly, monthlyPrice: 1000, yearlyPrice: 10000 },
        coins: Vue.ref(balance),
        COIN_PURCHASE_MIN: minimum,
      }
    );
    assert.equal(missingCoins.value, missing, `balance ${balance}`);
    assert.equal(
      orderDiffers.value,
      differs,
      `balance ${balance}, ${yearly ? "yearly" : "monthly"}`
    );
  }

  const all = elements(await template("components/subscription/card.vue"));
  const links = all.filter(
    ({ node }) => node.tag === "NuxtLink" && bound(node, "to") === "coinOrder"
  );
  assert.equal(links.length, 1);
  const button = links[0].node;
  const inButton = all.filter(({ parents }) => parents.includes(button)).map(({ node }) => node);
  // The label is always there; the amount only when it is another one.
  const label = inButton.filter((node) => node.loc.source.includes('t("Headings.BuyMorphcoins")'));
  assert.equal(label.length, 1);
  assert.equal(condition(label[0]), undefined);
  const amounts = inButton.filter((node) => node.tag === "Price");
  assert.equal(amounts.length, 1);
  assert.equal(bound(amounts[0], "coins"), "missingCoins");
  assert.equal(condition(amounts[0]), "orderDiffers");
  // The price of the plan stands above the button, in the same state of the card.
  const state = links[0].parents.at(-1);
  const above = all.filter(
    ({ node, parents }) =>
      node.tag === "Price" && parents.includes(state) && !parents.includes(button)
  );
  assert.equal(above.length, 1);
  assert.equal(bound(above[0].node, "coins"), "planPrice");
  assert.equal(condition(above[0].node), undefined);
});

test("the coin order page states the amount and its price once, in the order summary", async () => {
  const ast = await template("pages/morphcoins/paypal.vue");
  const all = elements(ast);
  const headings = all.filter(({ node }) => node.tag === "h1");
  assert.equal(headings.length, 1);
  assert.match(headings[0].node.loc.source, /\{\{ t\("Headings\.BuyMorphcoins"\) \}\}/);
  // § 312j Abs. 2 BGB asks for the price right before the order is placed: the summary has it.
  const summaries = all.filter(({ node }) => node.tag === "OrderSummary");
  assert.equal(summaries.length, 1);
  assert.equal(bound(summaries[0].node, "coins"), "coinsToBuy");
  // Nothing else on the page says the amount or the price.
  const elsewhere = sayings(ast).filter(({ parents }) => !parents.includes(summaries[0].node));
  for (const { says } of elsewhere) assert(!/coinsToBuy|totalPrice|Euros|Price/.test(says), says);
  const outside = all.filter(
    ({ node, parents }) => node.tag === "Price" && !parents.includes(summaries[0].node)
  );
  assert.equal(outside.length, 0);
  for (const language of ["de", "en-US"]) {
    const heading = JSON.parse(await read(`locales/${language}.json`)).Headings.BuyMorphcoins;
    assert(!/[\d{]/.test(heading), `${language}: ${heading}`);
  }
});
