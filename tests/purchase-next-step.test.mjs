// Small steps on the way to a purchase: where "Back" leads, what a heart refill takes,
// the label of the save button, and the way back after the login. Synthetic stand-ins only.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import * as Vue from "vue";
import { pieces } from "./helpers/component-pieces.mjs";
import { evaluate, host, settle, tag } from "./helpers/mounted-page.mjs";

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

test("the coin order page goes back to its amount, and cancelling leaves the purchase", async () => {
  for (const [next, back, cancelled] of [
    [undefined, { coins: "1500" }, "/dashboard"],
    ["subscription", { coins: "1500", next: "subscription" }, "/subscription"],
    ["https://example.invalid", { coins: "1500" }, "/dashboard"],
  ]) {
    const visited = [];
    const { backToAmount, cancelOrder } = await pieces(
      "pages/morphcoins/paypal.vue",
      ["backToAmount", "cancelOrder"],
      {
        coinsToBuy: Vue.ref(1500),
        route: { query: { coins: "1500", next } },
        navigateTo: async (to) => visited.push(to),
      }
    );
    await backToAmount();
    await cancelOrder();
    assert.deepEqual(
      visited,
      [{ path: "/morphcoins/buy", query: back }, cancelled],
      JSON.stringify(next)
    );
  }
});

test("the amount page passes the way back to Premium on to the order page", async () => {
  for (const [next, pushed] of [
    [undefined, "/morphcoins/paypal?coins=700"],
    ["subscription", "/morphcoins/paypal?coins=700&next=subscription"],
    ["https://example.invalid", "/morphcoins/paypal?coins=700"],
  ]) {
    const visited = [];
    const { onclickSubmitForm } = await pieces(
      "components/form/BuyCoins.vue",
      ["onclickSubmitForm"],
      {
        user: Vue.ref({ email_verified: true }),
        profileLoaded: Vue.ref(true),
        form: { validate: () => true, morphCoins: { value: 700 } },
        route: { query: { coins: "700", next } },
        router: { push: (path) => visited.push(path) },
        openSnackbar: () => assert.fail("no notice"),
      }
    );
    await onclickSubmitForm();
    assert.deepEqual(visited, [pushed], JSON.stringify(next));
  }
});

/** vue-i18n's message format: named values in braces, plural forms split by " | ". */
const translate =
  (language) =>
  (key, named = {}, plural) => {
    const message = key.split(".").reduce((part, name) => part?.[name], locales[language]);
    if (typeof message !== "string") return key;
    const forms = message.split(" | ");
    const chosen =
      plural === undefined || forms.length === 1
        ? message
        : forms.length === 3
          ? forms[Math.min(Math.abs(plural), 2)]
          : forms[plural === 1 ? 0 : 1];
    return chosen.replace(/\{(\w+)\}/g, (whole, name) => (name in named ? named[name] : whole));
  };
// Intl writes a no-break space before € and %; the sentences compare with plain spaces.
const plain = (text) => text.replace(/ /g, " ");

test("the note on a heart refill names its price and the smallest coin purchase from what the shop knows", async () => {
  for (const [hearts, coins, language, expected] of [
    [
      { hearts_max: 6, hearts_refill_price: 50 },
      { coins_per_euro: 100, vat_percent: 19 },
      "de",
      "50 Morphcoins (0,50 € inkl. 19 % MwSt.)",
    ],
    [
      { hearts_max: 6, hearts_refill_price: 80 },
      { coins_per_euro: 200, vat_percent: 19 },
      "en-US",
      "80 Morphcoins (€0.40 incl. 19% VAT)",
    ],
  ]) {
    // The price of the refill with its Euro amount and VAT, from what the shop published.
    const notice = shop.heartRefillNotice(hearts, coins, language, translate(language));
    assert.deepEqual(Object.keys(notice), ["coins"]);
    assert.equal(plain(notice.coins), expected);
    // The coin shop hands exactly this to the sentence.
    const { refillNotice } = await pieces("components/form/BuyCoins.vue", ["refillNotice"], {
      computed: Vue.computed,
      heartRefillNotice: shop.heartRefillNotice,
      heartConfig: Vue.ref(hearts),
      coinConfig: Vue.ref(coins),
      locale: Vue.ref(language),
      t: translate(language),
    });
    assert.deepEqual(refillNotice.value, notice);
  }
  for (const language of ["de", "en-US"]) {
    const sentence = locales[language].Body.NeedCoinsForRefill;
    for (const value of ["{coins}", "{min}"]) assert.ok(sentence.includes(value), language);
    assert.doesNotMatch(sentence, /\d/, "no figure is written into the sentence");
  }
  // The Premium page writes both prices like `Price`, Euro amount and VAT included.
  const premium = await read("pages/subscription/index.vue");
  assert.match(premium, /t\("Body\.NeedCoinsForRefill", refillNotice\)/);
  assert.match(
    premium,
    /coins: coinPriceText\(refillPrice\.value, coinConfig\.value, locale\.value, t\)/
  );
  assert.match(
    premium,
    /min: coinPriceText\(COIN_PURCHASE_MIN, coinConfig\.value, locale\.value, t\)/
  );
  // The box on the Premium page leads into the same way as the button next to a task.
  assert.match(
    premium,
    /<NuxtLink\s+:to="\{ path: '\/morphcoins\/buy', query: \{ for: 'hearts' \} \}"/
  );
});

test("the coin shop opened for a heart refill shows the whole note, with every value filled in", async (t) => {
  // The form is mounted with its real script and template; the sentences come from the locales.
  async function open(query, language) {
    const sentence = translate(language);
    const scope = {
      ...shop,
      require: (name) =>
        ({
          vue: Vue,
          "vue-i18n": { useI18n: () => ({ t: sentence, locale: Vue.ref(language) }) },
          "@heroicons/vue/24/solid": { ArrowDownCircleIcon: tag("svg") },
        })[name],
      ref: Vue.ref,
      reactive: Vue.reactive,
      computed: Vue.computed,
      onMounted: Vue.onMounted,
      // What the server published; neither figure is the built-in fallback.
      useHeartConfig: () => Vue.ref({ hearts_max: 6, hearts_refill_price: 80 }),
      useCoinConfig: () => Vue.ref({ coins_per_euro: 200, vat_percent: 19 }),
      loadHeartConfig() {},
      loadCoinConfig() {},
      useRoute: () => ({ query }),
      useRouter: () => ({ push() {} }),
      useUser: () => Vue.ref(null),
      useProfileLoaded: () => Vue.ref(false),
    };
    const ui = host();
    const app = ui.renderer.createApp(await evaluate("components/form/BuyCoins.vue", scope));
    for (const name of ["SectionTitle", "Price", "InputCheckbox", "Btn"])
      app.component(name, tag(name.toLowerCase()));
    app.mount(ui.root);
    t.after(() => app.unmount());
    await settle();
    return ui
      .all()
      .filter((node) => node.type === "p" && node.props.role === "status")
      .map((node) => plain(ui.text(node).trim()));
  }
  // The price of the refill comes with its Euro amount and VAT, like the box on the Premium page.
  assert.deepEqual(await open({ for: "hearts" }, "de"), [
    "Das Auffüllen kostet 80 Morphcoins (0,40 € inkl. 19 % MwSt.). Der Rest deines Kaufs bleibt auf deinem Konto.",
  ]);
  assert.deepEqual(await open({ for: "hearts" }, "en-US"), [
    "A refill costs 80 Morphcoins (€0.40 incl. 19% VAT). The rest of your purchase stays in your account.",
  ]);
  // Opened for anything else, the shop says nothing about hearts.
  for (const query of [{}, { for: "premium" }, { for: ["hearts"] }])
    assert.deepEqual(await open(query, "de"), [], JSON.stringify(query));
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
  // A page that loses its session while it is open leaves for the same target, and so does
  // a request the server answers with a rejected session.
  const target =
    /(?:navigateTo|router\.push)\(\{ path: "\/auth\/login", query: \{ redirect: (?:to|route)\.fullPath \} \}\)/;
  for (const file of ["middleware/auth.ts", "composables/profileLoad.ts", "composables/fetch.js"])
    assert.match(await read(file), target, file);
  // No place builds the address of the login by hand, where an `&` would cut the way back.
  for (const file of ["middleware/auth.ts", "composables/profileLoad.ts", "composables/fetch.js"])
    assert.doesNotMatch(await read(file), /auth\/login\?redirect=/, file);
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
    // The router decodes the path once. What then holds `//`, a backslash, a control
    // character or a `..` segment would be read as another host by a browser.
    ["/%2F%2Fexample.invalid", false],
    ["/%2fexample.invalid/%2e%2e", false],
    ["/%5Cexample.invalid", false],
    ["/%5c%5cexample.invalid", false],
    ["/%09/example.invalid", false],
    ["/..//example.invalid", false],
    ["/.//example.invalid", false],
    ["/x//y", false],
    ["/a/../b", false],
    ["/..", false],
    ["/%2e%2e/x", false],
    ["/.%2E/x", false],
    ["/profile/%0aedit", false],
    // A path that cannot be decoded is not one this site hands out.
    ["/100%", false],
    ["/%E0%A4%A", false],
    // Ordinary paths of this site stay, known to the router or not: none of them leaves it.
    ["/@example.invalid", true],
    ["/javascript:alert(document.domain)", true],
    ["/ /example.invalid", true],
    ["/\uff0fexample.invalid", true],
    ["/\u2215example.invalid", true],
    ["/a..b", true],
    ["/.well-known/x", true],
    ["/a%20b", true],
    ["/100%25", true],
    ["/%252F%252Fexample.invalid", true],
    // The query and the anchor are not part of the path and pass as they are.
    ["/profile/edit#address", true],
    ["/morphcoins/paypal?coins=500&next=subscription#summary", true],
    ["/oauth/callback?code=synthetic&state=synthetic", true],
    ["/search?q=a%2F%2Fb&back=..%2F..", true],
    ["/dashboard#//example.invalid", true],
    ["/profile/edit?redirect=//example.invalid#//example.invalid", true],
    ["/dashboard?x=100%", true],
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
