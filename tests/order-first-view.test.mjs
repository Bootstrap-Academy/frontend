// The order summary fits one screen: characteristics, total price, the two declarations and
// the order button come first, the full offer text stands in a disclosure that starts closed.
// A dialog opened again shows the still open quote instead of asking for a new one.
// Synthetic stand-ins only; nothing is requested or bought.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { parse } from "@vue/compiler-sfc";
import ts from "typescript";
import { pieces } from "./helpers/component-pieces.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const template = async (path) => parse(await read(path)).descriptor.template.ast;
function elements(root) {
  const found = [];
  (function visit(node, parents) {
    if (node.type === 1) found.push({ node, parents });
    for (const child of node.children ?? [])
      visit(child, node.type === 1 ? [...parents, node] : parents);
  })(root, []);
  return found;
}
const hasAttribute = (node, name) => node.props.some((p) => p.type === 6 && p.name === name);
const textOf = (node) => node.loc.source.replace(/\s+/g, " ");

test("the offer text, the recipient and the documents stand in a closed disclosure above the two declarations", async () => {
  // The long layout, for offers without their own summary (see order-dialog-short.test.mjs).
  const roots = (await template("components/order/Contract.vue")).children.filter(
    (c) => c.type === 1
  );
  const long = roots.find((node) => !hasAttribute(node, "data-purchase-summary"));
  const all = elements(long);
  const disclosures = all.filter(({ node }) => node.tag === "details");
  assert.equal(disclosures.length, 1);
  const details = disclosures[0].node;
  assert.equal(hasAttribute(details, "data-purchase-wording"), true);
  // Closed until the buyer opens it.
  assert.equal(hasAttribute(details, "open"), false);
  assert.equal(
    details.props.some((p) => p.type === 7 && p.arg?.content === "open"),
    false
  );
  const summary = details.children.find((c) => c.type === 1 && c.tag === "summary");
  assert.equal(!!summary, true, "the disclosure says what it holds");
  assert.match(textOf(summary), /Angebot im Wortlaut, AGB und Widerrufsinformationen/);
  const inside = textOf(details);
  for (const part of [
    "{{ offer.text }}",
    "Bestätigung an: {{ offer.recipient }}",
    "AGB dieses Angebots herunterladen (PDF)",
    "Widerrufsinformationen dieses Angebots herunterladen (PDF)",
  ])
    assert.equal(inside.includes(part), true, part);
  // The two boxes are outside the disclosure and follow it.
  for (const marker of ["data-purchase-acceptance", "data-purchase-early"]) {
    const box = all.find(({ node }) => node.tag === "input" && hasAttribute(node, marker));
    assert.equal(!!box, true, marker);
    assert.equal(box.parents.includes(details), false, `${marker} is not hidden in the disclosure`);
    assert.equal(
      box.node.loc.start.offset > details.loc.end.offset,
      true,
      `${marker} follows the text`
    );
  }
  // The wording of the acceptance stays as it was.
  assert.match(
    textOf(all.find(({ node }) => node.tag === "label").node),
    /Ich nehme dieses konkrete Angebot einschließlich der beigefügten AGB und Widerrufsinformationen an\./
  );
});

test("the summary puts characteristics and total before the declarations and the button", async () => {
  const ast = await template("components/order/Summary.vue");
  const section = ast.children.find((c) => c.type === 1 && c.tag === "section");
  const order = section.children
    .filter((c) => c.type === 1)
    .map((c) =>
      hasAttribute(c, "data-order-characteristics")
        ? "characteristics"
        : hasAttribute(c, "data-order-total")
          ? "total"
          : c.props.some((p) => p.type === 6 && p.name === "ref" && p.value?.content === "consent")
            ? "consent"
            : c.props.some(
                  (p) => p.type === 6 && p.name === "ref" && p.value?.content === "actions"
                )
              ? "actions"
              : null
    )
    .filter(Boolean);
  assert.deepEqual(order, ["characteristics", "total", "consent", "actions"]);
  // Label and amount share a line on a phone too.
  const total = section.children.find((c) => c.type === 1 && hasAttribute(c, "data-order-total"));
  const classes = total.props.find((p) => p.type === 6 && p.name === "class").value.content;
  assert.equal(classes.split(/\s+/).includes("grid-cols-1"), false);
  assert.equal(classes.split(/\s+/).includes("grid-cols-[auto_minmax(0,1fr)]"), true);
});

// composables/purchases.ts as a plain function body, with every global it reaches stubbed.
const purchases = ts.transpileModule(
  (await read("composables/purchases.ts")).replace(/^import .*;\n/gm, "").replace(/^export /gm, ""),
  { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None } }
).outputText;
const owner = "10000000-0000-4000-8000-000000000001";
const minutes = (n) => new Date(Date.now() + n * 60 * 1000).toISOString();
const quote = (id, kind, left, extra = {}) => ({
  id,
  hash: "hash",
  text: "Angebot",
  declaration: "Erklärung",
  recipient: "Käufer <buyer@example.invalid>",
  expires_at: minutes(left),
  user_id: owner,
  source: "backend",
  product: { kind, reference: kind, coins: 50, title: kind, facts: { refill_units: 2 } },
  // A quote of the short order dialog: its German lines are its text.
  summary: {
    de: { lines: [{ role: "product", text: "Angebot" }], declaration: "Erklärung" },
    en: { lines: [{ role: "product", text: "Offer" }], declaration: "Declaration" },
  },
  ...extra,
});
function shop({ list = [], listFails = false } = {}) {
  const calls = { list: 0, posts: [] };
  const fresh = quote("fresh-offer", "hearts", 20);
  const api = new Function(
    "useUser",
    "localStorage",
    "navigator",
    "GET",
    "POST",
    "navigateTo",
    "openSnackbar",
    "decodeApiError",
    "useRouter",
    "emailVerificationRoute",
    purchases + "\nreturn { requestPurchaseOffer };"
  )(
    () => ({ value: { id: owner } }),
    { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    {},
    async (path) => {
      assert.equal(path, "/shop/purchases");
      calls.list++;
      if (listFails) throw new Error("offline");
      return list;
    },
    async (path) => {
      calls.posts.push(path);
      return { state: "offered", offer: fresh };
    },
    async () => {},
    () => {},
    () => ({}),
    () => ({ currentRoute: { value: { fullPath: "/" } } }),
    () => "/"
  );
  return { api, calls };
}

test("a dialog opened again shows the still open quote and asks for no new one", async () => {
  const open = quote("open-offer", "hearts", 15);
  const { api, calls } = shop({ list: [{ state: "offered", offer: open }] });
  const offer = await api.requestPurchaseOffer("/shop/purchases/offers/hearts");
  assert.equal(offer.id, "open-offer");
  assert.equal(calls.posts.length > 0, false, "no new quote");
  // Of two open quotes the one with the most time left.
  const older = quote("older-offer", "premium_monthly", 12);
  const newer = quote("newer-offer", "premium_monthly", 18);
  const two = shop({
    list: [
      { state: "offered", offer: older },
      { state: "offered", offer: newer },
    ],
  });
  assert.equal(
    (await two.api.requestPurchaseOffer("/shop/purchases/offers/premium_monthly")).id,
    "newer-offer"
  );
  assert.equal(two.calls.posts.length > 0, false);
});

test("a quote is new when the open one is short of time, taken, foreign, for another product or no longer fits", async () => {
  for (const [what, entry, fits] of [
    ["less than ten minutes left", { state: "offered", offer: quote("o", "hearts", 9) }],
    ["already accepted", { state: "paid", offer: quote("o", "hearts", 15) }],
    ["failed", { state: "failed", offer: quote("o", "hearts", 15) }],
    [
      "another account",
      { state: "offered", offer: quote("o", "hearts", 15, { user_id: "someone-else" }) },
    ],
    ["another product", { state: "offered", offer: quote("o", "premium_yearly", 15) }],
    ["another source", { state: "offered", offer: quote("o", "hearts", 15, { source: "skills" }) }],
    ["the hearts changed", { state: "offered", offer: quote("o", "hearts", 15) }, () => false],
    [
      "issued before the short summary",
      { state: "offered", offer: quote("o", "hearts", 15, { summary: undefined }) },
    ],
  ]) {
    const { api, calls } = shop({ list: [entry] });
    const offer = await api.requestPurchaseOffer("/shop/purchases/offers/hearts", fits);
    assert.equal(offer.id, "fresh-offer", what);
    assert.deepEqual(calls.posts, ["/shop/purchases/offers/hearts"], what);
  }
  // A list that cannot be read never blocks the purchase.
  const down = shop({ listFails: true });
  assert.equal(
    (await down.api.requestPurchaseOffer("/shop/purchases/offers/hearts")).id,
    "fresh-offer"
  );
});

test("coin, course and event quotes keep their own flow and are not looked up in the list", async () => {
  for (const path of [
    "/shop/coins/paypal/offers/500",
    "/skills/course_access/python/offer",
    "/events/webinars/w1/offer",
  ]) {
    const { api, calls } = shop({ list: [{ state: "offered", offer: quote("o", "hearts", 15) }] });
    await api.requestPurchaseOffer(path);
    assert.equal(calls.list > 0, false, path);
    assert.deepEqual(calls.posts, [path], path);
  }
});

test("the heart dialogs reuse a quote only while it fits the current hearts", async () => {
  for (const path of ["components/user/HeartsEmpty.vue", "pages/subscription/index.vue"]) {
    assert.match(
      await read(path),
      /requestPurchaseOffer\(\s*"\/shop\/purchases\/offers\/hearts",\s*\(quote\) =>\s*quote\.product\.facts\?\.refill_units === heartConfig\.value\.hearts_max - hearts\.value\s*\)/,
      path
    );
  }
  // The block at the limit reads the hearts together with the balance before it decides.
  const calls = [];
  let quoteFits;
  const hearts = { value: 0 };
  const { fnRefillHearts } = await pieces(
    "components/user/HeartsEmpty.vue",
    ["fnRefillHearts", "heartsOffer"],
    {
      isDaily: { value: false },
      opening: { value: false },
      ordering: { value: false },
      withdrawalConsent: { value: true },
      offer: { value: null },
      hearts,
      heartConfig: { value: { hearts_max: 6, hearts_refill_price: 50 } },
      coins: { value: 1000 },
      refillPrice: { value: 50 },
      getBalance: async () => calls.push("balance"),
      getHearts: async () => {
        calls.push("hearts");
        hearts.value = 2;
      },
      requestPurchaseOffer: async (path, fits) => {
        calls.push(path);
        quoteFits = fits;
        return quote("open-offer", "hearts", 15);
      },
    }
  );
  await fnRefillHearts();
  assert.deepEqual(calls.slice(0, 2).sort(), ["balance", "hearts"]);
  assert.equal(calls[2], "/shop/purchases/offers/hearts");
  assert.equal(quoteFits({ product: { facts: { refill_units: 4 } } }), true);
  assert.equal(quoteFits({ product: { facts: { refill_units: 6 } } }), false);
});

test("the coin order page brings the summary into the window once, across both scroll levels", async () => {
  const code = ts.transpileModule(
    (await read("utils/orderView.ts"))
      .replace(/^import .*;\n/gm, "")
      .replace(/^export /gm, "")
      .replace(/^type .*;$/gm, ""),
    { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None } }
  ).outputText;
  const show = new Function(code + "\nreturn showOrderSummary;")();
  // No change of page under way: no move to the top is pending.
  const settled = { pending: () => false, cancel: () => false };
  const showOrderSummary = (area, card, view) => show(area, card, view, settled);
  // The page scrolls inside its `main`; with the notice about privacy above it the window
  // scrolls as well. What counts is where the order button ends against the window.
  const main = (scrollTop = 0) => ({ scrollTop });
  const window = (innerHeight, scrollY = 0) => ({ innerHeight, scrollY });
  const summary = (buttonBottom) => {
    const moves = [];
    return {
      moves,
      querySelector: (selector) =>
        selector === "[data-order-actions]"
          ? { getBoundingClientRect: () => ({ bottom: buttonBottom }) }
          : null,
      scrollIntoView: (options) => moves.push(options),
    };
  };
  // Measured on test (review of #828): with the notice the button ends at 1,039 of 900 px
  // and 1,151 of 844 px; without it at 944 of 844 px. All three are brought up, once.
  for (const [what, bottom, height] of [
    ["notice, 1280 x 900", 1039, 900],
    ["notice, 390 x 844", 1151, 844],
    ["no notice, 390 x 844", 944, 844],
  ]) {
    const card = summary(bottom);
    assert.equal(showOrderSummary(main(), card, window(height)), true, what);
    assert.deepEqual(card.moves, [{ block: "start", behavior: "instant" }], what);
  }
  // A large window shows the button anyway and keeps its heading (898 of 900 px).
  for (const [what, area, card, view] of [
    ["button in view at 1280 x 900", main(), summary(898), window(900)],
    ["the buyer scrolled the page", main(40), summary(1151), window(844)],
    ["the buyer scrolled the window", main(), summary(1151), window(844, 120)],
    ["no summary yet", main(), null, window(844)],
  ]) {
    assert.equal(showOrderSummary(area, card, view), false, what);
    assert.equal((card?.moves.length ?? 0) > 0, false, what);
  }
  // The button block the page measures is the one of the order summary.
  const actions = elements(await template("components/order/Summary.vue")).filter(({ node }) =>
    hasAttribute(node, "data-order-actions")
  );
  assert.equal(actions.length, 1);
  assert.equal(actions[0].node.loc.source.includes("{{ t(submitLabel) }}"), true);
});

test("a change of page leaves the coin summary where the page brought it", async () => {
  const compile = async (path) =>
    ts.transpileModule(
      (await read(path))
        .replace(/^import .*;\n/gm, "")
        .replace(/^export /gm, "")
        .replace(/^type .*;$/gm, ""),
      { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None } }
    ).outputText;
  // The shared state of the move to the top, with a clock and a window of its own.
  const timers = new Map();
  const scrolls = [];
  let next = 0;
  const pageTop = new Function(
    "setTimeout",
    "clearTimeout",
    "window",
    (await compile("utils/pageTop.ts")) +
      "\nreturn { schedulePageTop, pageTopPending, cancelPageTop };"
  )(
    (handler, delay) => {
      timers.set(++next, { handler, delay });
      return next;
    },
    (id) => timers.delete(id),
    { scrollTo: (options) => scrolls.push(options) }
  );
  const fire = () => {
    for (const [id, { handler }] of [...timers]) {
      timers.delete(id);
      handler();
    }
  };
  // Without a page of its own the window goes to the top 450 ms after a change of page.
  pageTop.schedulePageTop();
  assert.equal(pageTop.pageTopPending(), true);
  assert.deepEqual(
    [...timers.values()].map((t) => t.delay),
    [450]
  );
  fire();
  assert.deepEqual(scrolls, [{ top: 0, left: 0, behavior: "smooth" }]);
  assert.equal(pageTop.pageTopPending(), false);
  assert.equal(pageTop.cancelPageTop(), false);

  const show = new Function((await compile("utils/orderView.ts")) + "\nreturn showOrderSummary;")();
  const main = { scrollTop: 0 };
  const summary = (buttonBottom) => {
    const moves = [];
    return {
      moves,
      querySelector: () => ({ getBoundingClientRect: () => ({ bottom: buttonBottom }) }),
      scrollIntoView: (options) => moves.push(options),
    };
  };
  const shared = { pending: pageTop.pageTopPending, cancel: pageTop.cancelPageTop };
  // Coming from the coin shop with the notice (review of #829): the offer arrives about
  // 200 ms after the change of page, the summary is brought up, and the move to the top,
  // which would undo it 250 ms later, is cancelled.
  for (const [what, bottom, height, scrollY] of [
    ["notice, 1280 x 900", 1039, 900, 0],
    ["notice, 390 x 844", 1151, 844, 0],
    // From the premium card the window still stands where the premium page left it.
    ["from a scrolled page, 390 x 844", 851, 844, 300],
  ]) {
    scrolls.length = 0;
    pageTop.schedulePageTop();
    const card = summary(bottom);
    assert.equal(show(main, card, { innerHeight: height, scrollY }, shared), true, what);
    assert.deepEqual(card.moves, [{ block: "start", behavior: "instant" }], what);
    assert.equal(pageTop.pageTopPending(), false, what);
    fire();
    assert.equal(scrolls.length > 0, false, `${what}: nothing moves the window back up`);
  }
  // A page whose button stands in view once at the top keeps the move to the top.
  scrolls.length = 0;
  pageTop.schedulePageTop();
  const fits = summary(598);
  assert.equal(show(main, fits, { innerHeight: 900, scrollY: 300 }, shared), false);
  assert.equal(fits.moves.length > 0, false);
  assert.equal(pageTop.pageTopPending(), true);
  fire();
  assert.equal(scrolls.length, 1);
  // Without a change of page a scrolled window is the buyer's: nothing moves, nothing is cancelled.
  let cancelled = false;
  const still = summary(1151);
  const settled = { pending: () => false, cancel: () => (cancelled = true) };
  assert.equal(show(main, still, { innerHeight: 844, scrollY: 120 }, settled), false);
  assert.equal(still.moves.length > 0, false);
  assert.equal(cancelled, false);
  // The global middleware schedules the move through the shared state and nowhere else.
  const middleware = await read("middleware/route.global.ts");
  assert.match(middleware, /schedulePageTop\(\)/);
  assert.equal(/setTimeout|scrollTo/.test(middleware), false);
});

test("a heart refill states the exact quantity of its quote next to the characteristic", async () => {
  const shop = ts.transpileModule(
    (await read("composables/shop.ts")).replace(/^import .*;\n/gm, "").replace(/^export /gm, ""),
    { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None } }
  ).outputText;
  const refillQuantity = new Function(shop + "\nreturn refillQuantity;")();
  const quoteOf = (units) => ({ product: { facts: { refill_units: units } } });
  assert.deepEqual(refillQuantity(quoteOf(2), "de"), { n: "1", plural: 1 });
  assert.deepEqual(refillQuantity(quoteOf(6), "de"), { n: "3", plural: 2 });
  assert.deepEqual(refillQuantity(quoteOf(3), "de"), { n: "1,5", plural: 2 });
  assert.deepEqual(refillQuantity(quoteOf(3), "en"), { n: "1.5", plural: 2 });
  for (const quote of [null, {}, { product: {} }, quoteOf(0), quoteOf("x")])
    assert.equal(refillQuantity(quote, "de"), null);
  // Both heart dialogs show the line in the characteristics, right above the total.
  for (const [path, quantity] of [
    ["components/user/HeartsEmpty.vue", "quantity"],
    ["pages/subscription/index.vue", "order.quantity"],
  ]) {
    const lines = elements(await template(path)).filter(({ node }) =>
      hasAttribute(node, "data-order-quantity")
    );
    assert.equal(lines.length, 1, path);
    const line = lines[0];
    assert.equal(
      line.parents.some(
        (p) => p.tag === "template" && p.loc.source.startsWith("<template #characteristics")
      ),
      true,
      path
    );
    assert.equal(line.node.loc.source.includes(`v-if="${quantity}"`), true, path);
    assert.equal(line.node.loc.source.includes('t("Body.OrderHeartsQuantity"'), true, path);
  }
  for (const [language, one, many] of [
    ["de", "Du bekommst 1 Herz dazu.", "Du bekommst 3 Herzen dazu."],
    ["en-US", "You get 1 more heart.", "You get 3 more hearts."],
  ]) {
    const [singular, plural] = JSON.parse(
      await read(`locales/${language}.json`)
    ).Body.OrderHeartsQuantity.split(" | ");
    assert.equal(singular.replace("{n}", "1"), one, language);
    assert.equal(plural.replace("{n}", "3"), many, language);
  }
});
