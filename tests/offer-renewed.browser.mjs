/**
 * Mounted Nuxt UI, synthetic API only. Every unrelated network origin is blocked.
 *
 * An order whose offer the server no longer takes gets a new quote in the dialog, which stays
 * open. "Dieses Angebot war nicht mehr aktuell …" stands inside the dialog above the boxes from
 * the moment the refusal is known, once on the page, and the boxes start empty; the next
 * confirmation orders the new quote. Boxes ticked at the old quote while the new one loads do
 * not count for it: a click without ticks sends nothing. Four ways in: Premium and a heart
 * refill on the Premium page, the heart dialog in a quiz, and a renewal that ends while the
 * Premium dialog is open. Also: switching the language inside the dialog keeps the boxes, and
 * a refill refused because the hearts filled up meanwhile closes the dialog in the quiz. In
 * German and English, on a phone and on a laptop.
 *
 * Serve this checkout on RENEW_TEST_APP with NUXT_PUBLIC_BASE_API_URL set to RENEW_TEST_API,
 * as a generated build or with `nuxt dev`, then run
 *   PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/offer-renewed.browser.mjs
 * RENEW_EVIDENCE_DIR keeps a picture of every dialog after the refusal.
 */
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.RENEW_TEST_APP || "http://127.0.0.1:58731";
const api = process.env.RENEW_TEST_API || "http://127.0.0.1:58733";
const evidence = process.env.RENEW_EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });
const locales = {
  de: JSON.parse(await readFile(new URL("../locales/de.json", import.meta.url), "utf8")),
  "en-US": JSON.parse(await readFile(new URL("../locales/en-US.json", import.meta.url), "utf8")),
};
const tr = (language, key) =>
  key.split(".").reduce((part, name) => part?.[name], locales[language]);

const user = {
  id: "98000000-0000-4000-8000-000000000001",
  name: "SyntheticRenew",
  display_name: "Synthetic Renew",
  email: "synthetic-renew@example.invalid",
  email_verified: true,
  description: "",
  tags: [],
  admin: false,
  terms_version: "2026-09-r4",
  age_confirmed: true,
  leaderboard_opt_out: true,
  business: false,
  country: "Deutschland",
};
const token = `e30.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800 })).toString("base64url")}.synthetic`;
const session = {
  user: { id: user.id, name: user.name, display_name: user.display_name },
  session: { id: "renew-session" },
  accessToken: token,
  refreshToken: "synthetic-refresh-renew",
  authGeneration: "generation-renew",
};
const seconds = () => Math.floor(Date.now() / 1000);
const noPremium = () => ({
  premium: false,
  autopay: null,
  renewal: null,
  since: null,
  until: null,
});
const withRenewal = (price) => ({
  premium: true,
  autopay: "MONTHLY",
  renewal: {
    id: "11111111-1111-4111-8111-111111111114",
    monthly_price: price,
    confirmation_sent: true,
  },
  since: seconds() - 86400,
  until: seconds() + 86400 * 20,
});
const withoutRenewal = () => ({ ...withRenewal(1000), autopay: null, renewal: null });
const quiz = {
  id: "mc-1",
  task_id: "quiz-task",
  question: "Synthetische Quizfrage?",
  answers: ["Erste Antwort", "Zweite Antwort"],
  single_choice: true,
  creator: "someone-else",
  solved: false,
  rated: false,
  xp: 10,
  coins: 0,
  enabled: true,
  retired: false,
};

// The wording the backend issues (short order summary, both languages).
const declaration = {
  de: "Ich verlange ausdrücklich, dass mit der bestellten Leistung vor Ablauf der Widerrufsfrist begonnen wird. Meine gesetzlichen Widerrufs- und Mängelrechte bleiben unberührt.",
  en: "I expressly request that the ordered service begins before the withdrawal period ends. My statutory withdrawal and warranty rights remain unaffected.",
};
const line = (role, text) => ({ role, text });
const half = (units, separator) =>
  units % 2 ? `${Math.floor(units / 2)}${separator}5` : String(units / 2);
function wording(kind, units, renewal) {
  if (kind === "hearts")
    return {
      de: [
        line("product", "Herzen auffüllen"),
        line(
          "detail",
          `Du bekommst ${half(units, ",")} ${units === 2 ? "Herz" : "Herzen"} dazu und hast dann 3 von 3. Wir füllen direkt nach der Bestätigungsmail auf, spätestens in 24 Stunden.`
        ),
        line(
          "price",
          "Gesamtpreis: 50 Morphcoins (0,50 € inkl. 19 % MwSt.), keine weiteren Kosten."
        ),
        line("payment", "Du zahlst aus deinem Guthaben."),
      ],
      en: [
        line("product", "Refill hearts"),
        line(
          "detail",
          `You get ${half(units, ".")} more ${units === 2 ? "heart" : "hearts"} and then have 3 of 3. We refill right after the confirmation email, within 24 hours at the latest.`
        ),
        line("price", "Total price: 50 Morphcoins (€0.50 incl. 19% VAT), no further costs."),
        line("payment", "You pay from your balance."),
      ],
    };
  const [termDe, termEn] = renewal
    ? [
        `Laufzeit: 1 Monat. Danach läuft deine monatliche Verlängerung weiter (${renewal.toLocaleString("de-DE")} Morphcoins je Monat).`,
        `Term: 1 month. After that, your monthly renewal continues (${renewal.toLocaleString("en-US")} Morphcoins per month).`,
      ]
    : [
        "Laufzeit: 1 Monat, ohne automatische Verlängerung.",
        "Term: 1 month, no automatic renewal.",
      ];
  return {
    de: [
      line("product", "Premium"),
      line("detail", "Unbegrenzte Herzen."),
      line("term", termDe),
      line(
        "detail",
        "Premium startet direkt nach der Bestätigungsmail, spätestens in 24 Stunden. Läuft schon Premium, schließt die neue Zeit daran an."
      ),
      line(
        "price",
        "Gesamtpreis: 1.000 Morphcoins (10,00 € inkl. 19 % MwSt.), keine weiteren Kosten."
      ),
      line("payment", "Du zahlst aus deinem Guthaben."),
    ],
    en: [
      line("product", "Premium"),
      line("detail", "Unlimited hearts."),
      line("term", termEn),
      line(
        "detail",
        "Premium starts right after the confirmation email, within 24 hours at the latest. If Premium is already running, the new period follows it."
      ),
      line("price", "Total price: 1,000 Morphcoins (€10.00 incl. 19% VAT), no further costs."),
      line("payment", "You pay from your balance."),
    ],
  };
}
const renewalOf = (status) =>
  status.autopay && status.renewal ? status.renewal.monthly_price : null;

/** The synthetic shop: quotes, acceptances and the account's hearts, coins and Premium. */
function shop({ hearts, premium = noPremium() }) {
  const S = { hearts, coins: 50000, premium, offers: [], states: {}, accepted: [], delay: 0 };
  S.quote = (kind) => {
    const units = 6 - S.hearts;
    const renewal = renewalOf(S.premium);
    const { de, en } = wording(kind, units, renewal);
    const offer = {
      id: `97000000-0000-4000-8000-${String(S.offers.length + 1).padStart(12, "0")}`,
      hash: `synthetic-hash-${S.offers.length + 1}`,
      text: de.map((l) => l.text).join("\n"),
      declaration: declaration.de,
      recipient: `${user.display_name} <${user.email}>`,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      user_id: user.id,
      source: "backend",
      document_hash: "synthetic-documents",
      provision_window_seconds: 86400,
      product: {
        kind,
        reference: kind,
        title: kind === "hearts" ? "Herzen auffüllen" : "Premium für einen Monat",
        description: "",
        coins: kind === "hearts" ? 50 : 1000,
        facts:
          kind === "hearts"
            ? { maximum: 6, unit: "half_heart", refill_units: units }
            : {
                months: 1,
                automatic_renewal: false,
                renewal: renewal ? { monthly_price: renewal } : null,
              },
        revision: "synthetic",
        service_starts_at: null,
      },
      summary: {
        de: { lines: de, declaration: declaration.de },
        en: { lines: en, declaration: declaration.en },
      },
    };
    S.offers.push(offer);
    S.states[offer.id] = "offered";
    return offer;
  };
  return S;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/run/current-system/sw/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-background-networking"],
});
const results = [],
  errors = [];

/**
 * A signed in browser. `refuse(offer, S)` decides an acceptance: `"changed"` refuses it as a
 * changed offer (with the code), `"full"` as a refill no longer needed (without one), anything
 * else accepts it. A quote after the first takes `S.delay` milliseconds.
 */
async function fixture(S, language, [width, height], refuse) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: language === "de" ? "de-DE" : "en-US",
    reducedMotion: "reduce",
  });
  await context.addCookies(
    Object.entries({ locale: language, ...session }).map(([name, value]) => ({
      name,
      value: encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value)),
      url: app,
    }))
  );
  let foreign = 0;
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.origin === app || url.protocol === "data:") return route.continue();
    if (url.origin !== api) {
      foreign++;
      return route.abort();
    }
    const path = url.pathname,
      method = req.method();
    const answer = (data, status = 200) =>
      route
        .fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
          headers: { "cache-control": "private, no-store" },
        })
        .catch(() => {});
    if (path === "/auth/oauth/providers") return answer([]);
    if ((req.headers()["authorization"] || "") !== `Bearer ${token}`)
      return answer({ detail: "x" }, 401);
    if (path === "/auth/users/me") return answer(user);
    if (path === "/shop/learning/policy")
      return answer({
        mode: "legacy",
        premium: true,
        heart_sales: true,
        single_course_sales: false,
      });
    if (path === "/shop/coins/config") return answer({ coins_per_euro: 100, vat_percent: 19 });
    if (path === "/shop/hearts/config") return answer({ hearts_max: 6, hearts_refill_price: 50 });
    if (path === "/shop/premium_plans")
      return answer({ MONTHLY: { price: 1000, months: 1 }, YEARLY: { price: 10000, months: 12 } });
    if (path === `/shop/coins/${user.id}`) return answer({ coins: S.coins });
    if (path === `/shop/hearts/${user.id}`) return answer({ hearts: S.hearts });
    if (path === `/shop/premium/${user.id}`) return answer(S.premium);
    if (path === "/challenges/tasks/quiz-task/multiple_choice") return answer([quiz]);
    if (path === "/challenges/tasks/quiz-task/multiple_choice/mc-1") return answer(quiz);
    if (path.includes("unrated") || path.includes("notifications")) return answer([]);
    if (path === "/shop/purchases" && method === "GET")
      return answer(S.offers.map((offer) => ({ state: S.states[offer.id], offer })));
    const kind = path.match(/^\/shop\/purchases\/offers\/(hearts|premium_monthly)$/)?.[1];
    if (kind && method === "POST") {
      if (S.offers.length && S.delay) await new Promise((done) => setTimeout(done, S.delay));
      return answer({ state: "offered", offer: S.quote(kind) });
    }
    const one = path.match(/^\/shop\/purchases\/([0-9a-f-]{36})$/)?.[1];
    if (one && method === "GET") {
      const offer = S.offers.find((o) => o.id === one);
      return offer ? answer({ state: S.states[offer.id], offer }) : answer({ detail: "x" }, 404);
    }
    if (path === "/shop/purchases/accept" && method === "POST") {
      const offer = S.offers.find((o) => o.id === req.postDataJSON()?.order_id);
      S.accepted.push(offer?.id);
      if (!offer || S.states[offer.id] !== "offered") return answer({ detail: "x" }, 409);
      const refusal = refuse(offer, S);
      if (refusal) {
        S.states[offer.id] = "failed";
        return answer(
          refusal === "changed"
            ? {
                state: "failed",
                offer,
                review_reason: "Offer expired or changed; no charge",
                refusal: "offer_changed",
              }
            : { state: "failed", offer, review_reason: "No refill necessary; no charge" }
        );
      }
      S.states[offer.id] = "fulfilled";
      if (offer.product.kind === "hearts") S.hearts = 6;
      else S.premium = { ...S.premium, premium: true };
      S.coins -= offer.product.coins;
      return answer({ state: "fulfilled", offer });
    }
    return answer({});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  return { context, page, foreign: () => foreign };
}

async function settle(page, ms = 400) {
  await page.waitForTimeout(ms);
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, {
      timeout: 5000,
    })
    .catch(() => {});
}

/** The open dialog: its offer lines, the boxes, the notice, and the order button. */
const dialog = (page, [label, notice]) =>
  page.evaluate(
    ([label, notice]) => {
      const modal = document.querySelector(".modal-content");
      const contract = modal?.querySelector("[data-purchase-contract]");
      if (!contract) return null;
      const button = [...modal.querySelectorAll("[data-order-actions] button")].find(
        (candidate) => candidate.textContent.trim() === label
      );
      const rect = button?.getBoundingClientRect();
      const shown = modal.querySelector("[data-offer-renewed]");
      const box = modal.querySelector("[data-purchase-acceptance]");
      const text = document.body.innerText;
      return {
        lines: [...contract.querySelectorAll("[data-line]")].map((node) => node.textContent.trim()),
        boxes: [...modal.querySelectorAll("input[type=checkbox]")].map((input) => input.checked),
        buttonInView: !!rect && rect.top >= 0 && rect.bottom <= innerHeight,
        buttonBottom: rect ? Math.round(rect.bottom) : null,
        notice: shown?.textContent.trim() ?? null,
        noticeHeight: shown ? Math.round(shown.getBoundingClientRect().height) : null,
        noticeAboveBoxes:
          !!shown &&
          !!box &&
          shown.getBoundingClientRect().bottom <= box.getBoundingClientRect().top,
        noticeOnPage: text.split(notice).length - 1,
      };
    },
    [label, notice]
  );

const tick = async (page) => {
  await page.locator(".modal-content [data-purchase-acceptance]").check({ force: true });
  await page.locator(".modal-content [data-purchase-early]").check({ force: true });
};
const orderButton = (page, language) =>
  page.locator(".modal-content [data-order-actions] button", {
    hasText: tr(language, "Buttons.OrderWithObligationToPay"),
  });
const contract = (page) => page.locator(".modal-content [data-purchase-contract]");
const premiumButton = (page) =>
  page
    .locator("button:has(img[src*='coin'])")
    .filter({ hasText: /Morphcoins/i })
    .first();

const quizPage = "/quizzes/solve-quiz-task?quizzesFrom=quiz";
const ways = {
  // The server refuses the first Premium quote as changed (a new revision of the texts).
  premium: {
    page: "/subscription",
    shop: () => shop({ hearts: 6 }),
    refuse: (offer, S) => offer.id === S.offers[0].id && "changed",
    open: (page) => premiumButton(page),
  },
  // The account loses its last hearts in another tab while the dialog is open: the quote no
  // longer ends at 3 of 3, so the server refuses it as changed.
  hearts: {
    page: "/subscription",
    shop: () => shop({ hearts: 2 }),
    refuse: (offer, S) => S.hearts + offer.product.facts.refill_units !== 6 && "changed",
    before: (S) => (S.hearts = 0),
    open: (page, language) =>
      page.locator("button", { hasText: tr(language, "Buttons.Refill") }).first(),
    renewed: (language) =>
      language === "de" ? "Du bekommst 3 Herzen dazu" : "You get 3 more hearts",
  },
  // The heart dialog at the limit, inside a quiz; the learner stays in the quiz.
  quiz: {
    page: quizPage,
    shop: () => shop({ hearts: 0 }),
    refuse: (offer, S) => offer.id === S.offers[0].id && "changed",
    open: (page, language) =>
      page.locator("button", { hasText: tr(language, "Headings.RefillHearts") }).first(),
  },
  // The renewal ends in another tab while the Premium dialog is open (#832): the page brings
  // a new quote before anything is sent.
  renewal: {
    page: "/subscription",
    shop: () => shop({ hearts: 6, premium: withRenewal(1000) }),
    refuse: () => false,
    before: (S) => (S.premium = withoutRenewal()),
    open: (page) => premiumButton(page),
    renewed: (language) =>
      language === "de" ? "ohne automatische Verlängerung" : "no automatic renewal",
    sent: 0,
  },
  // The renewal starts while the dialog is open: the new quote names it in its term line, the
  // tallest dialog after a renewal.
  renewalStart: {
    page: "/subscription",
    shop: () => shop({ hearts: 6, premium: withoutRenewal() }),
    refuse: () => false,
    before: (S) => (S.premium = withRenewal(1000)),
    open: (page) => premiumButton(page),
    renewed: (language) =>
      language === "de"
        ? "Danach läuft deine monatliche Verlängerung weiter"
        : "After that, your monthly renewal continues",
    sent: 0,
  },
};

async function openDialog(way, f, language) {
  await f.page.goto(app + way.page);
  const opener = way.open(f.page, language);
  await opener.waitFor({ state: "visible" });
  await opener.click();
  await contract(f.page).waitFor();
  await settle(f.page);
}

/** Refused (or renewed) and replaced; with `retick`, the old boxes are ticked while the new
 * quote loads, and a click without ticks then sends nothing. */
async function renew(way, f, S, language, retick) {
  const labels = [
    tr(language, "Buttons.OrderWithObligationToPay"),
    tr(language, "Body.OfferRenewed"),
  ];
  const sent = way.sent ?? 1;
  await openDialog(way, f, language);
  await tick(f.page);
  way.before?.(S);
  if (retick) S.delay = 2500;
  await orderButton(f.page, language).click();
  // The notice stands as soon as the refusal is known, while the new quote is on its way.
  await f.page.locator(".modal-content [data-offer-renewed]").waitFor();
  if (retick) {
    assert.equal(S.offers.length, 1, "the new quote is still loading");
    await tick(f.page);
  }
  for (let i = 0; S.offers.length < 2 && i < 100; i++) await f.page.waitForTimeout(100);
  await settle(f.page, 800);
  const renewed = await dialog(f.page, labels);
  if (evidence)
    await f.page.screenshot({
      path: join(evidence, `${retick ? "retick-" : ""}${f.label}.png`),
    });
  assert.ok(renewed, "the dialog stays open");
  assert.equal(S.offers.length, 2, "one new quote");
  assert.deepEqual(renewed.boxes, [false, false], "the boxes start empty");
  assert.equal(renewed.notice, labels[1]);
  assert.equal(renewed.noticeAboveBoxes, true, "the notice stands above the boxes");
  assert.equal(renewed.noticeOnPage, 1, "the notice stands once on the page");
  // The notice is small enough that the order button stays fully in the first view.
  assert.equal(renewed.buttonInView, true, `order button ends at ${renewed.buttonBottom} px`);
  if (way.renewed)
    assert.ok(
      renewed.lines.some((text) => text.includes(way.renewed(language))),
      renewed.lines.join(" | ")
    );
  assert.equal(new URL(f.page.url()).pathname, new URL(app + way.page).pathname);
  assert.equal(S.accepted.length, sent);
  if (retick) {
    // Ticked at the old quote only: the order button of the new one is blocked, and a click
    // on it anyway sends nothing.
    renewed.blocked = await orderButton(f.page, language).getAttribute("aria-disabled");
    assert.equal(renewed.blocked, "true");
    await orderButton(f.page, language).click({ force: true });
    await f.page.waitForTimeout(1000);
    assert.equal(S.accepted.length, sent, "a click without ticks sends nothing");
    assert.ok(await contract(f.page).count(), "the dialog stays");
    assert.deepEqual((await dialog(f.page, labels)).boxes, [false, false]);
  }
  // Confirmed again, the new quote is ordered and the dialog closes.
  await tick(f.page);
  await orderButton(f.page, language).click();
  await contract(f.page).waitFor({ state: "detached" });
  assert.deepEqual(S.accepted.at(-1), S.offers[1].id);
  assert.equal(new URL(f.page.url()).pathname, new URL(app + way.page).pathname);
  return renewed;
}

const cases = [];
for (const [name, way] of Object.entries(ways))
  for (const retick of [false, true])
    cases.push({
      name: `${retick ? "retick-" : ""}${name}`,
      way,
      run: (f, S, language) => renew(way, f, S, language, retick),
    });
// Switching the language inside the dialog keeps the ticked boxes, and the order goes out.
cases.push({
  name: "language-switch",
  languages: ["en-US"],
  way: { ...ways.quiz, refuse: () => false },
  async run(f, S, language) {
    await openDialog(this.way, f, language);
    await tick(f.page);
    await f.page
      .locator("[role=dialog] button", { hasText: /^\s*Deutsch\s*$/ })
      .first()
      .click();
    await settle(f.page, 800);
    const after = await dialog(f.page, [tr("de", "Buttons.OrderWithObligationToPay"), "-"]);
    assert.deepEqual(after.boxes, [true, true], "the boxes stay ticked");
    assert.equal(after.lines[0], "Herzen auffüllen");
    await orderButton(f.page, "de").click();
    await contract(f.page).waitFor({ state: "detached" });
    assert.deepEqual(S.accepted, [S.offers[0].id]);
    return after;
  },
});
// The free refill came in while the dialog was open: nothing left to buy, the learner stays.
cases.push({
  name: "hearts-filled-meanwhile",
  way: { ...ways.quiz, refuse: () => "full", before: (S) => (S.hearts = 6) },
  async run(f, S, language) {
    await openDialog(this.way, f, language);
    await tick(f.page);
    this.way.before(S);
    await orderButton(f.page, language).click();
    await contract(f.page).waitFor({ state: "detached" });
    await f.page.waitForFunction(
      (text) => document.body.innerText.includes(text),
      tr(language, "Error.AlreadyHaveHearts")
    );
    const text = await f.page.evaluate(() => document.body.innerText);
    assert.equal(text.includes(tr(language, "Body.PurchaseRejected")), false);
    assert.equal(new URL(f.page.url()).pathname, "/quizzes/solve-quiz-task");
    assert.equal(S.offers.length, 1, "no new quote");
    return { url: new URL(f.page.url()).pathname };
  },
});

try {
  for (const entry of cases)
    for (const language of entry.languages ?? ["de", "en-US"])
      for (const size of [
        [390, 844],
        [1280, 800],
      ]) {
        const label = `${entry.name}-${language}-${size.join("x")}`;
        const S = entry.way.shop();
        const f = await fixture(S, language, size, entry.way.refuse);
        f.label = label;
        try {
          const seen = await entry.run(f, S, language);
          assert.equal(f.foreign(), 0, "no request to another origin");
          results.push({ name: label, passed: true, seen });
        } catch (error) {
          results.push({
            name: label,
            passed: false,
            error: String(error?.message || error).split("\n")[0],
          });
        }
        await f.context.close().catch(() => {});
      }
  const failed = results.filter((result) => !result.passed).map((result) => result.name);
  console.log(
    JSON.stringify({
      passed: failed.length === 0 && errors.length === 0,
      app,
      syntheticAPI: api,
      failed,
      pageErrors: errors,
      results,
    })
  );
} finally {
  await browser.close();
}
assert.deepEqual(
  results.filter((result) => !result.passed).map((result) => result.name),
  [],
  "failed cases"
);
assert.deepEqual(errors, [], "page errors");
