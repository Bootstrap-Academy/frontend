// The Premium card says what its price is for, once and in every state. The card is rendered
// with its real script and template; balances, plans and texts are synthetic stand-ins.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "typescript";
import * as Vue from "vue";
import { renderToString } from "vue/server-renderer";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const locales = Object.fromEntries(
  await Promise.all(
    ["de", "en-US"].map(async (language) => [
      language,
      JSON.parse(await read(`locales/${language}.json`)),
    ])
  )
);
const { descriptor } = parse(await read("components/subscription/card.vue"));
const code = ts.transpileModule(
  compileScript(descriptor, { id: "premium-card", inlineTemplate: true }).content,
  { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } }
).outputText;

const PRICES = { MONTHLY: 1000, YEARLY: 10000 };

/** The Premium card as the page shows it in one state, as text and as markup. */
async function card({ language, yearly, balance, premium, daily, guest = false }) {
  const sentence = (key, named = {}) =>
    key
      .split(".")
      .reduce((part, name) => part?.[name], locales[language])
      ?.replace(/\{(\w+)\}/g, (whole, name) => (name in named ? named[name] : whole)) ?? key;
  const icon = () => Vue.h("svg");
  const scope = {
    require: (name) =>
      ({
        vue: Vue,
        "vue-i18n": { useI18n: () => ({ t: sentence, locale: Vue.ref(language) }) },
        "@heroicons/vue/20/solid": { CheckIcon: icon },
        "@heroicons/vue/24/outline": {
          BookOpenIcon: icon,
          InformationCircleIcon: icon,
          RocketLaunchIcon: icon,
        },
        "../../composables/coins": { useCoins: () => Vue.ref(balance) },
      })[name],
    PREMIUM_PRICE_FALLBACK: PRICES,
    COIN_PURCHASE_MIN: 500,
    computed: Vue.computed,
    onMounted: Vue.onMounted,
    usePremiumInfo: () => Vue.ref({ premium }),
    useDailyLearning: () => ({ isDaily: Vue.ref(daily), daily: Vue.ref({ limit: 3 }) }),
    useCoinConfig: () => Vue.ref({ coins_per_euro: 100, vat_percent: 19 }),
    useHeartConfig: () => Vue.ref({ hearts_max: 6 }),
    loadHeartConfig() {},
    formatHearts: (halves) => String(halves / 2),
    heartRefillTime: () => "02:00",
    coinsToEuros: (coins) => coins / 100,
    formatEuros: (euros) => `${euros.toFixed(2)} EUR`,
  };
  const exports = {};
  const environment = new Proxy(scope, {
    has: () => true,
    get: (target, key) =>
      key === Symbol.unscopables
        ? undefined
        : key === "exports"
          ? exports
          : key in target
            ? target[key]
            : key in globalThis
              ? globalThis[key]
              : () => {},
  });
  new Function("environment", `with (environment) { ${code} }`)(environment);
  const app = Vue.createSSRApp({ render: () => Vue.h(exports.default, { yearly, guest }) });
  // The price stands in for itself, so it shows where a price is said.
  app.component("Price", (props) => Vue.h("span", `[price of ${props.coins}]`));
  app.component("NuxtLink", (props, { slots }) => Vue.h("a", { to: props.to }, slots.default?.()));
  app.component("Tooltip", (props, { slots }) => Vue.h("span", slots.default?.()));
  const html = await renderToString(app);
  const markup = html.slice(html.indexOf('id="premium"'));
  assert(markup.length < html.length, "the Premium card is rendered");
  const text = (part) =>
    part
      .replace(/<!--.*?-->/gs, "")
      .replace(/<[^>]+>/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  return { markup, lines: text(markup), text, all: text(html) };
}

const WORDS = { de: /monat|jahr|jährlich/i, "en-US": /month|year/i };

test("the Premium card names the period of its price once, right above the price, in every state", async () => {
  let states = 0;
  for (const language of ["de", "en-US"])
    for (const yearly of [false, true])
      for (const balance of [0, 300, 20000])
        for (const premium of [false, true])
          for (const daily of [false, true]) {
            const state = { language, yearly, balance, premium, daily };
            const where = JSON.stringify(state);
            const { markup, lines, text } = await card(state);
            const period =
              locales[language].Body[yearly ? "PremiumForOneYear" : "PremiumForOneMonth"];
            // One line carries the period, and it says the period of the chosen plan.
            const marked = markup.match(/<p[^>]*data-premium-period[^>]*>.*?<\/p>/gs) ?? [];
            assert.equal(marked.length, 1, where);
            assert.deepEqual(text(marked[0]), [period], where);
            assert.equal(lines.filter((line) => line.includes(period)).length, 1, where);
            // It stands between the name of the plan and the price.
            const name = lines.indexOf(locales[language].Headings.Premium);
            const at = lines.indexOf(period);
            const price = lines.findIndex((line) => line.startsWith("[price of "));
            assert(name >= 0 && name < at && at < price, where);
            assert.equal(
              lines[price],
              `[price of ${yearly ? PRICES.YEARLY : PRICES.MONTHLY}]`,
              where
            );
            // Besides it only the monthly share of a year speaks of months, and only next to
            // the buy button of the yearly plan.
            const enough = balance >= (yearly ? PRICES.YEARLY : PRICES.MONTHLY);
            const others = lines.filter((line) => line !== period && WORDS[language].test(line));
            const share = locales[language].Body.PricePerMonth.replace("{amount}", "8.33 EUR");
            assert.deepEqual(others, yearly && enough ? [share] : [], where);
            // The buy button says the price and leaves the period to the line above.
            const button = markup.match(/<button[^>]*>.*?<\/button>/gs) ?? [];
            assert.equal(button.length, enough ? 1 : 0, where);
            if (enough) assert.deepEqual(text(button[0]), [lines[price]], where);
            states++;
          }
  assert.equal(states, 48);
});

test("a visitor without an account sees the price of each plan and the way to a free account", async () => {
  for (const language of ["de", "en-US"])
    for (const yearly of [false, true])
      for (const daily of [false, true]) {
        const state = { language, yearly, balance: 0, premium: undefined, daily, guest: true };
        const where = JSON.stringify(state);
        const { markup, lines, text, all } = await card(state);
        const { Body, Headings, Links } = locales[language];
        // Both plans stand there with what they say, and the Premium card with its price.
        assert(all.includes(Headings.Free) && lines.includes(Headings.Premium), where);
        assert(lines.includes(`[price of ${yearly ? PRICES.YEARLY : PRICES.MONTHLY}]`), where);
        // Where an account finds the button to buy, the visitor finds the way to an account.
        const links = markup.match(/<a[^>]*>.*?<\/a>/gs) ?? [];
        assert.equal(links.length, 1, where);
        assert.match(links[0], /^<a[^>]* to="\/auth\/signup"/, where);
        assert.deepEqual(text(links[0]), [Links.CreateFreeAccount], where);
        assert.equal((markup.match(/<button/g) ?? []).length, 0, where);
        const price = lines.findIndex((line) => line.startsWith("[price of "));
        assert.equal(lines[price + 1], Links.CreateFreeAccount, where);
        // Nothing speaks of a coin balance, and no plan is marked as the visitor's.
        assert(!all.includes(Body.NotEnoughMorphcoins) && !all.includes(Headings.BuyMorphcoins));
        assert(!all.includes(Body.CurrentPlan), where);
      }
  // With an account the card is as before: its plan is marked, and no link leads to the sign-up.
  for (const language of ["de", "en-US"]) {
    const { markup, all } = await card({ language, yearly: false, balance: 0, daily: false });
    assert(all.includes(locales[language].Body.CurrentPlan), language);
    assert(!all.includes(locales[language].Links.CreateFreeAccount), language);
    assert(!markup.includes('to="/auth/signup"'), language);
  }
});

test("the period reads as one purchase, not as a subscription", () => {
  assert.equal(locales.de.Body.PremiumForOneMonth, "Für einen Monat");
  assert.equal(locales.de.Body.PremiumForOneYear, "Für ein Jahr");
  assert.equal(locales["en-US"].Body.PremiumForOneMonth, "For one month");
  assert.equal(locales["en-US"].Body.PremiumForOneYear, "For one year");
});
