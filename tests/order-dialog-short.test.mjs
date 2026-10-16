// The short order dialog (Kaufdialog Stufe 1): an offer with its own summary is shown line
// by line, every fact once, in the language of the interface, with the acceptance linking the
// documents of this offer. Older offers keep the long layout. Synthetic stand-ins only.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { component, evaluate, host, settle, tag } from "./helpers/mounted-page.mjs";
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
const purchases = await evaluate("composables/purchases.ts", { require: () => ({}) });

// The lines the backend issues for a heart refill, in both languages.
const de = {
  lines: [
    { role: "product", text: "Herzen auffüllen" },
    {
      role: "detail",
      text: "Du bekommst 2,5 Herzen dazu und hast dann 3 von 3. Wir füllen direkt nach der Bestätigungsmail auf, spätestens in 24 Stunden.",
    },
    {
      role: "price",
      text: "Gesamtpreis: 50 Morphcoins (0,50 € inkl. 19 % MwSt.), keine weiteren Kosten.",
    },
    { role: "payment", text: "Du zahlst aus deinem Guthaben." },
  ],
  declaration:
    "Ich verlange ausdrücklich, dass mit der bestellten Leistung vor Ablauf der Widerrufsfrist begonnen wird. Meine gesetzlichen Widerrufs- und Mängelrechte bleiben unberührt.",
};
const en = {
  lines: [
    { role: "product", text: "Refill hearts" },
    {
      role: "detail",
      text: "You get 2.5 more hearts and then have 3 of 3. We refill right after the confirmation email, within 24 hours at the latest.",
    },
    { role: "price", text: "Total price: 50 Morphcoins (€0.50 incl. 19% VAT), no further costs." },
    { role: "payment", text: "You pay from your balance." },
  ],
  declaration:
    "I expressly request that the ordered service begins before the withdrawal period ends. My statutory withdrawal and warranty rights remain unaffected.",
};
const offer = (patch = {}) => ({
  id: "50000000-0000-4000-8000-000000000001",
  hash: "hash",
  text: de.lines.map((line) => line.text).join("\n"),
  declaration: de.declaration,
  recipient: "Synthetic <synthetic@example.invalid>",
  expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  user_id: "10000000-0000-4000-8000-000000000001",
  source: "backend",
  product: { kind: "hearts", reference: "hearts", coins: 50, title: "Herzen auffüllen" },
  summary: { de, en },
  ...patch,
});

test("the summary in the language of the interface, and only one that matches the agreed text", () => {
  const { offerWording } = purchases;
  assert.deepEqual(offerWording(offer(), "de"), { lang: "de", ...de });
  assert.deepEqual(offerWording(offer(), "en-US"), { lang: "en", ...en });
  // Without English lines the English interface shows the German ones.
  assert.equal(offerWording(offer({ summary: { de } }), "en-US").lang, "de");
  for (const [what, patch] of [
    ["no summary", { summary: undefined }],
    ["text differs from the German lines", { text: "Anderer Text" }],
    ["declaration differs", { declaration: "Andere Erklärung" }],
    ["no lines", { summary: { de: { ...de, lines: [] }, en } }],
    ["a line without text", { summary: { de: { ...de, lines: [{ role: "price" }] }, en } }],
  ])
    assert.equal(offerWording(offer(patch), "de"), null, what);
  assert.equal(offerWording(null, "de"), null);
});

/** Stand-in for vue-i18n's `<i18n-t>`: the sentence of `keypath` with its slots in place. */
const translation =
  (language) =>
  (props, { slots }) => {
    const sentence = props.keypath.split(".").reduce((part, name) => part[name], locales[language]);
    return Vue.h(
      props.tag || "span",
      sentence
        .split(/(\{\w+\})/)
        .filter(Boolean)
        .map((piece) => {
          const slot = piece.match(/^\{(\w+)\}$/)?.[1];
          return slot ? slots[slot]() : piece;
        })
    );
  };
const t = (language) => (key) =>
  key.split(".").reduce((part, name) => part?.[name], locales[language]) ?? key;

async function contract(subject, language) {
  const downloads = [];
  const Contract = await component(
    "components/order/Contract.vue",
    { offerWording: purchases.offerWording },
    { "vue-i18n": { useI18n: () => ({ t: t(language), locale: Vue.ref(language) }) } }
  );
  const ui = host();
  const app = ui.renderer.createApp(() => Vue.h(Contract, { offer: subject, modelValue: false }));
  app.component("i18n-t", translation(language));
  // The template reaches the auto-imported helper through the component instance.
  app.config.globalProperties.downloadPurchaseDocument = (...a) => downloads.push(a);
  app.mount(ui.root);
  await settle();
  // The element tree joins text nodes with a space; punctuation closes up again.
  const text = (node) =>
    ui
      .text(node)
      .replace(/\s+/g, " ")
      .replace(/ ([.,])/g, "$1")
      .trim();
  return { ui, text, downloads, app };
}

test("a short offer shows its lines once, highlights product, term and price, and links its documents", async () => {
  const { ui, text, downloads, app } = await contract(offer(), "de");
  const root = ui.root.children[0];
  assert.equal(root.props.lang, "de");
  const lines = ui.all().filter((node) => node.props["data-line"]);
  assert.deepEqual(
    lines.map((node) => [node.props["data-line"], text(node)]),
    de.lines.map((line) => [line.role, line.text])
  );
  for (const node of lines)
    assert.equal(
      node.props.class.includes("text-heading-4"),
      ["product", "term", "price"].includes(node.props["data-line"]),
      node.props["data-line"]
    );
  const all = text(root);
  // Every fact once, and nothing of the long layout.
  assert.equal(all.split("Gesamtpreis").length - 1, 1);
  assert.equal(all.split("24 Stunden").length - 1, 1);
  for (const gone of ["Bestätigung an", "Angebot im Wortlaut", "herunterladen", "Anbieter"])
    assert.equal(all.includes(gone), false, gone);
  assert.equal(
    ui.all().some((node) => node.type === "details"),
    false
  );
  // Nothing of the page's own stands between the lines and the boxes; German needs no language note.
  assert.ok(all.includes(`Du zahlst aus deinem Guthaben. Ich nehme dieses Angebot`));
  assert.equal(all.includes(locales.de.Body.OfferGermanBinding), false);
  // The acceptance names and links the two documents of this offer; the declaration is the agreed one.
  assert.ok(
    all.includes("Ich nehme dieses Angebot mit seinen AGB und seiner Widerrufsbelehrung an.")
  );
  assert.ok(all.includes(de.declaration));
  const label = ui.all().find((node) => node.type === "label" && node.props.for);
  const box = ui.all().find((node) => node.props["data-purchase-acceptance"] !== undefined);
  assert.equal(label.props.for, box.props.id);
  const links = ui.all().filter((node) => node.props["data-purchase-document"]);
  assert.deepEqual(
    links.map((node) => [node.props["data-purchase-document"], text(node)]),
    [
      ["terms", "AGB"],
      ["withdrawal", "Widerrufsbelehrung"],
    ]
  );
  for (const link of links) link.props.onClick({ preventDefault() {} });
  assert.deepEqual(downloads, [
    [offer().id, "terms"],
    [offer().id, "withdrawal"],
  ]);
  assert.equal(
    ui.all().filter((node) => node.type === "input").length,
    2,
    "still two boxes in stage 1"
  );
  app.unmount();
});

test("the English interface shows the English wording and says that the German one is binding", async () => {
  const { ui, text, app } = await contract(offer(), "en-US");
  assert.equal(ui.root.children[0].props.lang, "en");
  const all = text(ui.root);
  for (const line of en.lines) assert.ok(all.includes(line.text), line.text);
  assert.ok(all.includes(en.declaration));
  assert.ok(all.includes(locales["en-US"].Body.OfferGermanBinding));
  assert.ok(
    all.includes("I accept this offer with its Terms & Conditions and its withdrawal policy.")
  );
  for (const line of de.lines) assert.equal(all.includes(line.text), false, line.text);
  app.unmount();
});

test("an offer without its own summary keeps the long layout with the full text", async () => {
  const old = offer({ summary: undefined, text: "Anbieter: bootstrap academy GmbH.\nLanger Text" });
  const { ui, text, app } = await contract(old, "en-US");
  assert.equal(ui.root.children[0].props.lang, "de");
  assert.ok(ui.all().some((node) => node.type === "details"));
  const all = text(ui.root);
  assert.ok(all.includes("Langer Text"));
  assert.ok(all.includes("Bestätigung an: Synthetic"));
  app.unmount();
});

async function summary(worded) {
  const Summary = await component(
    "components/order/Summary.vue",
    {},
    { "vue-i18n": { useI18n: () => ({ t: (key) => key, locale: Vue.ref("de") }) } }
  );
  const ui = host();
  const app = ui.renderer.createApp(() =>
    Vue.h(
      Summary,
      { coins: 50, exactOffer: true, worded },
      {
        characteristics: () => Vue.h("p", "OWN CHARACTERISTICS"),
        consent: () => Vue.h("p", "OFFER"),
      }
    )
  );
  for (const name of ["Price", "InputBtn", "NuxtLink"])
    app.component(name, tag(name.toLowerCase()));
  app.mount(ui.root);
  await settle();
  const text = ui.text(ui.root);
  app.unmount();
  return text;
}

test("with a worded offer the summary shows neither its own characteristics nor its own price", async () => {
  const worded = await summary(true);
  assert.equal(worded.includes("OWN CHARACTERISTICS"), false);
  assert.equal(worded.includes("Headings.TotalPrice"), false);
  assert.ok(worded.includes("OFFER"));
  assert.ok(worded.includes("Buttons.OrderWithObligationToPay"));
  const long = await summary(false);
  assert.ok(long.includes("OWN CHARACTERISTICS"));
  assert.ok(long.includes("Headings.TotalPrice"));
});

test("every dialog tells the summary whether the offer is worded", async () => {
  for (const path of [
    "components/user/HeartsEmpty.vue",
    "pages/morphcoins/paypal.vue",
    "pages/subscription/index.vue",
  ]) {
    const source = await read(path);
    assert.match(source, /:worded="(worded|orderWorded)"/, path);
    assert.match(
      source,
      /!!offerWording\((offer\.value|order\.value\?\.offer), locale\.value\)/,
      path
    );
  }
});

test("a Premium order leaves a running renewal to the term line of the offer", async () => {
  // The backend names a separately ordered renewal in the term line of the agreed text, so the
  // page adds no line of its own: one fact, one place.
  const page = await read("pages/subscription/index.vue");
  const contract = await read("components/order/Contract.vue");
  assert.equal(page.includes("data-order-renewal"), false);
  assert.equal(page.includes("OrderRenewal"), false);
  assert.equal(contract.includes("<slot"), false);
  for (const language of ["de", "en-US"])
    for (const key of ["OrderRenewalContinues", "OrderRenewalPending"])
      assert.equal(locales[language].Body[key], undefined, `${language} ${key}`);
});

// A Premium offer as the backend issues it: the term line names a separately ordered monthly
// renewal, which the offer binds in `facts.renewal`.
function premium(renewal, id = "60000000-0000-4000-8000-000000000001") {
  const term = renewal
    ? `Laufzeit: 1 Monat. Danach läuft deine monatliche Verlängerung weiter (${renewal} Morphcoins je Monat).`
    : "Laufzeit: 1 Monat, ohne automatische Verlängerung.";
  const lines = [
    { role: "product", text: "Premium für einen Monat" },
    { role: "detail", text: "Unbegrenzte Herzen." },
    { role: "term", text: term },
    {
      role: "price",
      text: "Gesamtpreis: 1.000 Morphcoins (10,00 € inkl. 19 % MwSt.), keine weiteren Kosten.",
    },
    { role: "payment", text: "Du zahlst aus deinem Guthaben." },
  ];
  return offer({
    id,
    text: lines.map((line) => line.text).join("\n"),
    product: {
      kind: "premium_monthly",
      reference: "premium_monthly",
      coins: 1000,
      title: "Premium für einen Monat",
      facts: { months: 1, renewal: renewal ? { monthly_price: renewal } : null },
    },
    summary: {
      de: { lines, declaration: de.declaration },
      en: { lines, declaration: en.declaration },
    },
  });
}
const running = (monthly_price, confirmation_sent = true) => ({
  premium: true,
  autopay: "MONTHLY",
  renewal: { id: "r-1", monthly_price, confirmation_sent },
});
const none = { premium: true, autopay: null, renewal: null };

test("a Premium offer highlights its term line with product and price", async () => {
  const { ui, app } = await contract(premium(1000), "de");
  const roles = ui
    .all()
    .filter((node) => node.props["data-line"])
    .map((node) => [node.props["data-line"], node.props.class.includes("text-heading-4")]);
  assert.deepEqual(roles, [
    ["product", true],
    ["detail", false],
    ["term", true],
    ["price", true],
    ["payment", false],
  ]);
  app.unmount();
});

/** The Premium part of the subscription page, with the account's renewal in `state.status`. */
async function premiumPage(state) {
  const calls = { offers: [], snackbars: [], accepted: [] };
  const scope = {
    premiumBusy: Vue.ref(false),
    order: Vue.ref(null),
    renewalOrder: Vue.ref(null),
    ordering: Vue.ref(false),
    withdrawalConsent: Vue.ref(false),
    coins: Vue.ref(50000),
    locale: Vue.ref("de"),
    offerWording: purchases.offerWording,
    refreshPremiumStatus: async () => state.status,
    requestPurchaseOffer: async (path, fits) => {
      calls.offers.push(path);
      // An open quote is taken up again only if it fits; otherwise a new one comes.
      if (state.open && fits(state.open)) return state.open;
      return state.fresh();
    },
    openSnackbar: (kind, key) => calls.snackbars.push([kind, key]),
    acceptPurchase: async (accepted) => {
      calls.accepted.push(accepted.id);
      return true;
    },
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
      "confirmOrder",
    ],
    scope
  );
  return { ...page, scope, calls };
}

test("a Premium order takes up an open offer only while its term line fits the renewal", async () => {
  for (const [status, open, reused] of [
    [running(1000), premium(1000), true],
    [running(1000), premium(null), false],
    [running(750), premium(1000), false],
    [none, premium(null), true],
    [none, premium(1000), false],
  ]) {
    const fresh = premium(
      status.renewal?.monthly_price ?? null,
      "60000000-0000-4000-8000-000000000009"
    );
    const page = await premiumPage({ status, open, fresh: () => fresh });
    await page.subscribe(false);
    assert.deepEqual(page.calls.offers, ["/shop/purchases/offers/premium_monthly"]);
    assert.equal(
      page.scope.order.value.offer.id,
      reused ? open.id : fresh.id,
      JSON.stringify(status)
    );
    assert.equal(
      page.scope.order.value.offer.product.facts.renewal?.monthly_price ?? null,
      status.renewal?.monthly_price ?? null
    );
  }
});

test("a renewal that changes while the dialog is open brings a new offer, not a patched line", async () => {
  let n = 0;
  const state = {
    status: running(1000),
    fresh: () =>
      premium(
        state.status.renewal?.monthly_price ?? null,
        `60000000-0000-4000-8000-00000000001${n++}`
      ),
  };
  const page = await premiumPage(state);
  await page.subscribe(false);
  const first = page.scope.order.value.offer;
  assert.match(
    first.text,
    /Danach läuft deine monatliche Verlängerung weiter \(1000 Morphcoins je Monat\)/
  );
  page.scope.withdrawalConsent.value = true;
  // The renewal ends in another tab before the order.
  state.status = none;
  await page.confirmOrder();
  assert.deepEqual(page.calls.accepted, [], "the stale offer is not sent");
  const second = page.scope.order.value.offer;
  assert.notEqual(second.id, first.id);
  assert.match(second.text, /Laufzeit: 1 Monat, ohne automatische Verlängerung\./);
  assert.equal(page.scope.withdrawalConsent.value, false, "the boxes start empty again");
  assert.deepEqual(page.calls.snackbars, [["info", "Body.OfferRenewed"]]);
  assert.equal(page.scope.ordering.value, false);
  // Confirmed again with the renewal unchanged, the new offer is ordered.
  page.scope.withdrawalConsent.value = true;
  await page.confirmOrder();
  assert.deepEqual(page.calls.accepted, [second.id]);
  assert.equal(page.scope.order.value, null);
});

test("a renewal confirmed in the meantime keeps the offer, its term line is still true", async () => {
  const state = { status: running(1000, false), fresh: () => premium(1000) };
  const page = await premiumPage(state);
  await page.subscribe(false);
  page.scope.withdrawalConsent.value = true;
  state.status = running(1000, true);
  await page.confirmOrder();
  assert.deepEqual(page.calls.accepted, [premium(1000).id]);
  assert.deepEqual(page.calls.snackbars, []);
});

test("an offer without its own summary still shows a changed renewal in the line of the page", async () => {
  const old = offer({
    summary: undefined,
    product: {
      kind: "premium_monthly",
      reference: "premium_monthly",
      coins: 1000,
      title: "Premium",
      facts: { months: 1, automatic_renewal: false },
    },
  });
  const state = { status: running(1000), fresh: () => old };
  const page = await premiumPage(state);
  await page.subscribe(false);
  page.scope.withdrawalConsent.value = true;
  state.status = none;
  await page.confirmOrder();
  assert.deepEqual(page.calls.accepted, []);
  assert.equal(page.scope.order.value.offer.id, old.id);
  assert.equal(page.scope.order.value.details[1].value, "Body.AutomaticRenewalOff");
  assert.deepEqual(page.calls.snackbars, [["info", "Error.PremiumRenewalChanged"]]);
});

/** composables/purchases.ts with the globals it reaches stubbed. */
async function purchasesWith({ status, saved }) {
  const store = new Map(saved ? [[saved.key, JSON.stringify(saved.value)]] : []);
  const requested = [];
  const module = await evaluate("composables/purchases.ts", {
    require: () => ({}),
    useUser: () => ({ value: { id: offer().user_id } }),
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
    GET: async (path) => {
      requested.push(path);
      if (status instanceof Error) throw status;
      return status;
    },
  });
  return { ...module, store, requested };
}

test("a coin quote the server refuses as stale is dropped only while nothing was ordered", async () => {
  const quote = offer({
    source: "paypal",
    product: { kind: "coins", reference: "1000", coins: 1000, title: "1.000 Morphcoins" },
  });
  const key = `purchase-checkout:${quote.user_id}:paypal:coins`;
  const saved = { key, value: { owner: quote.user_id, orderId: quote.id } };
  for (const state of ["offered", "failed"]) {
    const { discardStaleOffer, store, requested } = await purchasesWith({
      status: { state, offer: quote },
      saved,
    });
    assert.equal(await discardStaleOffer(quote), true, state);
    assert.equal(store.has(key), false, state);
    assert.deepEqual(requested, [`/shop/purchases/${quote.id}`]);
  }
  // Accepted, waiting for payment or unreadable: the identity stays and leads to the orders.
  for (const status of [
    { state: "awaiting_payment", offer: quote },
    { state: "paid", offer: quote },
    { state: "offered", offer: { ...quote, id: "another" } },
    new Error("offline"),
  ]) {
    const { discardStaleOffer, store } = await purchasesWith({ status, saved });
    assert.equal(
      await discardStaleOffer(quote),
      false,
      JSON.stringify(status.state ?? status.message)
    );
    assert.equal(store.has(key), true);
  }
});

test("the 409 of a refused PayPal order reaches the page through createPaypalOrder and create()", async () => {
  // What `$fetch` (ofetch) throws for an HTTP error: status, statusCode and the parsed body.
  const refusal = Object.assign(new Error("[POST] /shop/coins/paypal/orders: 409 Conflict"), {
    status: 409,
    statusCode: 409,
    data: { detail: "Exact offer required; retrieve the original order" },
  });
  const coins = await evaluate("composables/coins.ts", {
    require: () => ({}),
    POST: async () => {
      throw refusal;
    },
  });
  assert.deepEqual(await coins.createPaypalOrder({}), [
    null,
    { detail: "Exact offer required; retrieve the original order", status: 409 },
  ]);
  const owner = { value: { id: "10000000-0000-4000-8000-000000000001" } };
  const states = new Map();
  const store = new Map();
  const { usePaypalCheckout } = await evaluate("composables/paypalCheckout.ts", {
    require: () => ({ useEventListener() {} }),
    useUser: () => owner,
    useCoins: () => Vue.ref(0),
    useState: (key, init) => {
      if (!states.has(key)) states.set(key, Vue.ref(init()));
      return states.get(key);
    },
    computed: Vue.computed,
    watch() {},
    window: {},
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
    navigator: { locks: { request: (_name, action) => action() } },
    createPaypalOrder: coins.createPaypalOrder,
  });
  const checkout = usePaypalCheckout();
  await assert.rejects(checkout.create(1000, "{}"), (error) => error.status === 409);
  // Nothing was handed to PayPal, so nothing is kept for recovery.
  assert.equal([...store.keys()].length, 0);
});

test("a refused PayPal order brings a new quote instead of a payment error", async () => {
  const page = await read("pages/morphcoins/paypal.vue");
  const handler = page.match(/\} catch \(failure\) \{[\s\S]*?\n {6}\} finally \{/)?.[0];
  assert.ok(handler);
  const steps = [
    "if (!current()) return;",
    "if (failure?.status === 409 && (await discardStaleOffer(acceptedOffer))) {",
    'openSnackbar("info", "Body.OfferRenewed");',
    "await refreshOffer();",
    "sdkError.value = true;",
  ];
  let at = -1;
  for (const step of steps) {
    const next = handler.indexOf(step);
    assert.ok(next > at, step);
    at = next;
  }
  // The status of the failed request reaches the page.
  const coins = await read("composables/coins.ts");
  assert.match(
    coins,
    /return \[null, \{ detail: "Request failed", \.\.\.\(error\?\.data \?\? \{\}\), status \}\];/
  );
  const checkout = await read("composables/paypalCheckout.ts");
  assert.match(checkout, /status: failure\?\.status,/);
  for (const language of ["de", "en-US"]) assert.ok(locales[language].Body.OfferRenewed, language);
});

test("the refill box on the Premium page states both prices with their Euro amount and the VAT", async () => {
  const shop = await evaluate("composables/shop.ts", {});
  const config = { coins_per_euro: 100, vat_percent: 19 };
  const expected = {
    de: [
      "Das Auffüllen kostet 50 Morphcoins (0,50 € inkl. 19 % MwSt.). Der kleinste Kauf sind 500 Morphcoins (5,00 € inkl. 19 % MwSt.), der Rest bleibt auf deinem Konto.",
    ],
    "en-US": [
      "A refill costs 50 Morphcoins (€0.50 incl. 19% VAT). The smallest purchase is 500 Morphcoins (€5.00 incl. 19% VAT), and the rest stays in your account.",
    ],
  };
  for (const language of ["de", "en-US"]) {
    // vue-i18n's message format: named values in braces, plural forms split by " | ".
    const translate = (key, named = {}, plural) => {
      let sentence = key.split(".").reduce((part, name) => part[name], locales[language]);
      const forms = sentence.split(" | ");
      if (plural !== undefined && forms.length === 3)
        sentence = forms[Math.min(Math.abs(plural), 2)];
      else if (plural !== undefined && forms.length === 2) sentence = forms[plural === 1 ? 0 : 1];
      return sentence.replace(/\{(\w+)\}/g, (whole, name) => named[name] ?? whole);
    };
    const notice = {
      coins: shop.coinPriceText(50, config, language, translate),
      min: shop.coinPriceText(500, config, language, translate),
    };
    // The no-break spaces of Intl stand where a line must not break.
    assert.deepEqual(
      [translate("Body.NeedCoinsForRefill", notice).replace(/\u00a0/g, " ")],
      expected[language]
    );
    assert.doesNotMatch(locales[language].Body.NeedCoinsForRefill, /\d|€|\{price\}/, language);
  }
});

test("the coin shop names PayPal at the start and asks for no box before the order summary", async () => {
  const shop = await read("components/form/BuyCoins.vue");
  const { descriptor } = parse(shop);
  assert.equal(descriptor.template.content.includes("<InputCheckbox"), false);
  assert.equal(shop.includes("termsAndConditions"), false);
  assert.match(descriptor.template.content, /body="Body\.MorphcoinRate"/);
  assert.match(locales.de.Body.MorphcoinRate, /Du zahlst mit PayPal\.$/);
  assert.match(locales["en-US"].Body.MorphcoinRate, /You pay with PayPal\.$/);
});

test("the acceptance sentence links both documents in both languages", () => {
  for (const language of ["de", "en-US"]) {
    const sentence = locales[language].Body.OfferAcceptance;
    assert.ok(sentence.includes("{terms}") && sentence.includes("{withdrawal}"), language);
    assert.ok(locales[language].Body.OfferGermanBinding, language);
  }
});

test("the coin order page looks again once the fonts have loaded where the summary seemed to fit", async () => {
  const page = await read("pages/morphcoins/paypal.vue");
  const watcher = page.match(/watch\(offer, async \(value\) => \{[\s\S]*?\n {4}\}\);/)?.[0];
  assert.ok(watcher);
  const steps = [
    "await nextTick();",
    "if (showOrderSummary(page.value, summaryCard.value)) return;",
    "await document.fonts?.ready;",
    "if (offer.value === value) showOrderSummary(page.value, summaryCard.value);",
  ];
  let at = -1;
  for (const step of steps) {
    const next = watcher.indexOf(step);
    assert.ok(next > at, step);
    at = next;
  }
});
