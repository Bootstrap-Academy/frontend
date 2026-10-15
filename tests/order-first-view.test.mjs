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
  const all = elements(await template("components/order/Contract.vue"));
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
  const { fnRefillHearts } = await pieces("components/user/HeartsEmpty.vue", ["fnRefillHearts"], {
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
  });
  await fnRefillHearts();
  assert.deepEqual(calls.slice(0, 2).sort(), ["balance", "hearts"]);
  assert.equal(calls[2], "/shop/purchases/offers/hearts");
  assert.equal(quoteFits({ product: { facts: { refill_units: 4 } } }), true);
  assert.equal(quoteFits({ product: { facts: { refill_units: 6 } } }), false);
});

test("the coin order page brings the summary up once, and only when its end is out of view", async () => {
  const code = ts.transpileModule((await read("utils/orderView.ts")).replace(/^export /gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
  }).outputText;
  const showOrderSummary = new Function(code + "\nreturn showOrderSummary;")();
  const area = (scrollTop) => {
    const moves = [];
    return {
      scrollTop,
      moves,
      getBoundingClientRect: () => ({ top: 100, bottom: 844 }),
      scrollTo: (options) => moves.push(options),
    };
  };
  const card = (top, bottom) => ({ getBoundingClientRect: () => ({ top, bottom }) });
  const below = area(0);
  assert.equal(showOrderSummary(below, card(400, 1100)), true);
  assert.deepEqual(below.moves, [{ top: 300, behavior: "instant" }]);
  for (const [what, a, c] of [
    ["the whole summary is in view", area(0), card(300, 800)],
    ["the buyer has scrolled", area(40), card(400, 1100)],
    ["no summary yet", area(0), null],
  ]) {
    assert.equal(showOrderSummary(a, c), false, what);
    assert.equal(a.moves.length > 0, false, what);
  }
});
