// Small steps on the way to a purchase: where "Back" leads, what a heart refill takes,
// the label of the save button, and the way back after the login. Synthetic stand-ins only.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import * as Vue from "vue";
import { pieces } from "./helpers/component-pieces.mjs";
import { evaluate } from "./helpers/mounted-page.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const locales = Object.fromEntries(
  await Promise.all(
    ["de", "en-US"].map(async (language) => [
      language,
      JSON.parse(await read(`locales/${language}.json`)),
    ])
  )
);
const shop = await evaluate("composables/shop.ts", {});

test("Back on the coin order leads to the page the order began on", async () => {
  for (const [next, target] of [
    ["subscription", "/subscription"],
    [undefined, "/morphcoins/buy"],
    ["", "/morphcoins/buy"],
    ["/subscription", "/morphcoins/buy"],
    ["https://example.invalid", "/morphcoins/buy"],
    [["subscription"], "/morphcoins/buy"],
  ]) {
    const { backRoute } = await pieces("components/NavbarBack.vue", ["backRoute"], {
      computed: Vue.computed,
      console: { log() {} },
      route: { name: "morphcoins-paypal", query: { next } },
    });
    assert.deepEqual(
      backRoute.value,
      { pathname: target, label: "Links.GoBack" },
      JSON.stringify(next)
    );
  }
});

test("the note on a heart refill names its price and the smallest coin purchase from what the shop knows", async () => {
  for (const [hearts, coins, language, expected] of [
    [{ hearts_max: 6, hearts_refill_price: 50 }, { coins_per_euro: 100, vat_percent: 19 }, "de", 5],
    [
      { hearts_max: 6, hearts_refill_price: 80 },
      { coins_per_euro: 200, vat_percent: 19 },
      "en",
      2.5,
    ],
  ]) {
    const notice = shop.heartRefillNotice(hearts, coins, language);
    assert.deepEqual(notice, {
      coins: hearts.hearts_refill_price,
      min: shop.COIN_PURCHASE_MIN,
      price: shop.formatEuros(expected, language),
    });
    // The coin shop and the Premium page hand exactly this to the sentence.
    const { refillNotice } = await pieces("components/form/BuyCoins.vue", ["refillNotice"], {
      computed: Vue.computed,
      heartRefillNotice: shop.heartRefillNotice,
      heartConfig: Vue.ref(hearts),
      coinConfig: Vue.ref(coins),
      locale: Vue.ref(language),
    });
    assert.deepEqual(refillNotice.value, notice);
  }
  for (const language of ["de", "en-US"]) {
    const sentence = locales[language].Body.NeedCoinsForRefill;
    for (const value of ["{coins}", "{min}", "{price}"])
      assert.ok(sentence.includes(value), language);
    assert.doesNotMatch(sentence, /\d/, "no figure is written into the sentence");
  }
  const premium = await read("pages/subscription/index.vue");
  assert.match(premium, /t\("Body\.NeedCoinsForRefill", refillNotice\)/);
  assert.match(
    premium,
    /heartRefillNotice\(heartConfig\.value, coinConfig\.value, locale\.value\)/
  );
  // The box on the Premium page leads into the same way as the button next to a task.
  assert.match(
    premium,
    /<NuxtLink\s+:to="\{ path: '\/morphcoins\/buy', query: \{ for: 'hearts' \} \}"/
  );
});

test("the save button of the profile form is called Save in English", async () => {
  assert.equal(locales["en-US"].Buttons.Safe, "Save");
  assert.equal(locales.de.Buttons.Safe, "Speichern");
  assert.match(await read("components/form/Profile.vue"), /\{\{ t\("Buttons\.Safe"\) \}\}/);
});

test("a protected page sends a visitor without a session to the login with the way back", async () => {
  const here = "/morphcoins/paypal?coins=500";
  const login = { path: "/auth/login", query: { redirect: here } };
  for (const token of ["token", "", null, undefined]) {
    const left = [];
    const { default: auth } = await evaluate("middleware/auth.ts", {
      defineNuxtRouteMiddleware: (middleware) => middleware,
      useAppCookie: (name) => ({ value: name === "accessToken" ? token : "other" }),
      navigateTo: (to) => (left.push(to), "navigation"),
    });
    const result = auth({ fullPath: here }, { fullPath: "/" });
    assert.deepEqual(left, token ? [] : [login], JSON.stringify(token));
    assert.equal(result, token ? undefined : "navigation");
  }
  // A page that loses its session while it is open leaves for the same target.
  const target =
    /navigateTo\(\{ path: "\/auth\/login", query: \{ redirect: (?:to|route)\.fullPath \} \}\)/;
  assert.match(await read("middleware/auth.ts"), target);
  assert.match(await read("composables/profileLoad.ts"), target);
});

test("the login only follows a way back that stays on this site", async () => {
  const { internalPath } = await evaluate("composables/loginRedirect.ts", {});
  for (const [value, kept] of [
    ["/profile/edit", true],
    ["/morphcoins/paypal?coins=500&next=subscription", true],
    ["/", true],
    ["//example.invalid/x", false],
    ["/\\example.invalid/x", false],
    ["/profile\\edit", false],
    ["/profile\n/edit", false],
    ["https://example.invalid/x", false],
    ["javascript:alert(1)", false],
    ["profile/edit", false],
    ["", false],
    [["/profile/edit"], false],
    [null, false],
    [undefined, false],
  ]) {
    assert.equal(internalPath(value), kept ? value : "", JSON.stringify(value));
    const pushed = [];
    const { successHandler } = await pieces(
      "components/form/Login.vue",
      ["redirect", "successHandler"],
      {
        computed: Vue.computed,
        internalPath,
        route: { query: { redirect: value } },
        router: { push: (path) => pushed.push(path) },
        needRecoveryCode: Vue.ref(false),
        guestReturnPath: () => "",
        hasEmail: Vue.ref(true),
      }
    );
    successHandler({ user: { id: "member" } });
    assert.deepEqual(pushed, [kept ? value : "/dashboard"], JSON.stringify(value));
  }
});
