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

test("the coin shop states the total once, with the tax", async () => {
  const ast = await template("components/form/BuyCoins.vue");
  const prices = elements(ast).filter(({ node }) => node.tag === "Price");
  assert.equal(prices.length, 1);
  assert.equal(bound(prices[0].node, "coins"), "coinsToBuy");
  assert.equal(condition(prices[0].node), undefined);
  // The line carries the tax note: `Price` adds it unless told otherwise.
  assert.equal(bound(prices[0].node, "vat"), undefined);
  assert.equal(bound(prices[0].node, "euroOnly") ?? bound(prices[0].node, "euro-only"), undefined);
  for (const { says } of sayings(ast)) assert(!/totalPrice|coinsToBuy|Euros\(/.test(says), says);
  assert(!(await read("components/form/BuyCoins.vue")).includes("totalPrice"));
});

/** The elements of the two cards of the Premium page. */
async function cards() {
  const all = elements(await template("components/subscription/card.vue"));
  const premium = all.find(({ node }) =>
    node.props.some((p) => p.name === "id" && p.value?.content === "premium")
  ).node;
  const free = all.find(({ node, parents }) => parents.length === 2 && node !== premium).node;
  const inside = (card) =>
    all.filter(({ parents }) => parents.includes(card)).map(({ node }) => node);
  return { all, premium, free, inside };
}

test("the Premium card says what Premium brings once, in its list", async () => {
  const { premium, inside } = await cards();
  // Under the name follows the price; no sentence stands between them, in either mode.
  const paragraphs = inside(premium).filter((node) => node.tag === "p");
  const says = (node) => node.loc.source;
  assert(!says(premium).includes("GetAllServices"));
  assert(!says(premium).includes("PremiumIntro"));
  const benefits = paragraphs.filter((node) =>
    /UnlimitedHearts|PremiumPace|AccessToAllCourses/.test(says(node))
  );
  assert.equal(benefits.length, 2);
  for (const language of ["de", "en-US"]) {
    const texts = JSON.parse(await read(`locales/${language}.json`));
    assert.equal(texts.Body.GetAllServices, undefined);
    assert.equal(texts.DailyLearning.PremiumIntro, undefined);
  }
});

test("what both plans have in common stands in the free card only", async () => {
  const { premium, free, inside } = await cards();
  const common = (card) =>
    inside(card).filter(
      (node) => node.tag === "p" && /LearnNewThings|FreeReview/.test(node.loc.source)
    );
  assert.equal(common(free).length, 1);
  assert.equal(common(premium).length, 0);
});

test("the Premium page names the time of the free refill once", async () => {
  // The box with the countdown stands exactly while hearts are missing.
  for (const [hearts, shown] of [
    [0, true],
    [5, true],
    [6, false],
  ]) {
    const { refillBoxShown } = await pieces("pages/subscription/index.vue", ["refillBoxShown"], {
      computed: Vue.computed,
      hearts: Vue.ref(hearts),
      heartConfig: Vue.ref({ hearts_max: 6 }),
    });
    assert.equal(refillBoxShown.value, shown, `hearts ${hearts}`);
  }
  const page = elements(await template("pages/subscription/index.vue"));
  const section = page.find(({ node }) => condition(node) === "!isPremium && showHearts").node;
  const inSection = page.filter(({ parents }) => parents.includes(section));
  const full = inSection.find(({ node }) => condition(node) === "!refillBoxShown").node;
  assert(full.loc.source.includes("Body.HeartsAreFilled"));
  const sentences = sayings(await template("pages/subscription/index.vue")).filter(({ says }) =>
    says.includes("Body.AutomaticRefillAt")
  );
  assert.equal(sentences.length, 1);
  assert(sentences[0].parents.includes(section) && !sentences[0].parents.includes(full));
  // The card is told, and its hint then leaves the time out.
  const card = page.find(({ node }) => node.tag === "SubscriptionCard").node;
  assert.equal(bound(card, "refill-time-stated"), "!isPremium && showHearts && refillBoxShown");
  const { free, inside } = await cards();
  const hint = inside(free).find(
    (node) => node.tag === "Tooltip" && bound(node, "heading").includes("Hearts")
  );
  assert.equal(
    bound(hint, "heading").trim(),
    "refillTimeStated ? 'Body.WrongAnswerCostsOneHeart' : 'Body.UnlimitedHeartsTooltip'"
  );
  for (const language of ["de", "en-US"]) {
    const { Body } = JSON.parse(await read(`locales/${language}.json`));
    assert(!Body.WrongAnswerCostsOneHeart.includes("{time}"), language);
    assert(Body.UnlimitedHeartsTooltip.includes("{time}"), language);
    assert(Body.UnlimitedHeartsTooltip.startsWith(Body.WrongAnswerCostsOneHeart), language);
  }
});

test("on the Premium page two ways to buy Morphcoins carry two labels", async () => {
  const page = elements(await template("pages/subscription/index.vue"));
  const toShop = page.filter(
    ({ node }) => node.tag === "NuxtLink" && (bound(node, "to") ?? "").includes("/morphcoins/buy")
  );
  assert.equal(toShop.length, 1);
  assert.match(toShop[0].node.loc.source, /\{\{ t\("Links\.BuyMorphcoinsForHearts"\) \}\}/);
  const { premium, inside } = await cards();
  const toOrder = inside(premium).filter((node) => node.tag === "NuxtLink");
  assert.equal(toOrder.length, 1);
  assert(toOrder[0].loc.source.includes('t("Headings.BuyMorphcoins")'));
  for (const language of ["de", "en-US"]) {
    const texts = JSON.parse(await read(`locales/${language}.json`));
    assert.notEqual(texts.Links.BuyMorphcoinsForHearts, texts.Headings.BuyMorphcoins, language);
    assert.match(texts.Links.BuyMorphcoinsForHearts, /Herzen|hearts/);
  }
});
