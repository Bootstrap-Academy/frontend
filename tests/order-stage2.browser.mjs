/**
 * Mounted Nuxt UI, synthetic API only. Every unrelated network origin is blocked.
 *
 * Stage 2 of the order dialog (terms 2026-10): offers with `acceptance: "button"` are accepted
 * with the order button. Heart refills and coins have no box at all; Premium has one box, the
 * early start, only when its period begins within the withdrawal period. The order goes out
 * with the early start only where the box was ticked. The statement above the button is one
 * block with the accent border. The coin order page offers "Zurück" to the amount, which it
 * keeps together with the way back to Premium, and "Abbrechen", which leaves the purchase. In
 * German and English, on a phone and on a laptop; the order button stands in the first view.
 *
 * Serve this checkout on STAGE2_TEST_APP with NUXT_PUBLIC_BASE_API_URL set to STAGE2_TEST_API,
 * as a generated build or with `nuxt dev`, then run
 *   PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/order-stage2.browser.mjs
 * STAGE2_EVIDENCE_DIR keeps a picture of every dialog.
 */
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.STAGE2_TEST_APP || "http://127.0.0.1:58731";
const api = process.env.STAGE2_TEST_API || "http://127.0.0.1:58733";
const evidence = process.env.STAGE2_EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });
const locales = {
  de: JSON.parse(await readFile(new URL("../locales/de.json", import.meta.url), "utf8")),
  "en-US": JSON.parse(await readFile(new URL("../locales/en-US.json", import.meta.url), "utf8")),
};
const tr = (language, key) =>
  key.split(".").reduce((part, name) => part?.[name], locales[language]);

const user = {
  id: "98000000-0000-4000-8000-000000000002",
  name: "SyntheticStage2",
  display_name: "Synthetic Stage2",
  email: "synthetic-stage2@example.invalid",
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
  session: { id: "stage2-session" },
  accessToken: token,
  refreshToken: "synthetic-refresh-stage2",
  authGeneration: "generation-stage2",
};
const seconds = () => Math.floor(Date.now() / 1000);
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

// The wording of stage 2 as the backend issues it.
const EARLY = {
  de: "Ich verlange ausdrücklich, dass das bestellte Premium schon vor Ablauf der Widerrufsfrist von 14 Tagen startet. Widerrufe ich, zahle ich nur den Anteil des Preises für die Tage, an denen dieses Premium bis zu meinem Widerruf schon lief.",
  en: "I expressly request that the Premium I have ordered starts before the 14-day withdrawal period ends. If I withdraw, I pay only the share of the price for the days on which this Premium had already been running up to my withdrawal.",
};
const line = (role, text) => ({ role, text });
function wording(kind, coins) {
  if (kind === "hearts")
    return {
      de: [
        line("product", "Herzen auffüllen"),
        line(
          "detail",
          "Du bekommst 3 Herzen dazu und hast dann 3 von 3. Wir füllen direkt nach der Bestätigungsmail auf, spätestens in 24 Stunden."
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
          "You get 3 more hearts and then have 3 of 3. We refill right after the confirmation email, within 24 hours at the latest."
        ),
        line("price", "Total price: 50 Morphcoins (€0.50 incl. 19% VAT), no further costs."),
        line("payment", "You pay from your balance."),
      ],
    };
  if (kind === "coins")
    return {
      de: [
        line("product", `${coins.toLocaleString("de-DE")} Morphcoins`),
        line(
          "detail",
          "Guthaben für Angebote auf Bootstrap Academy, einmaliger Kauf. Die Morphcoins sind nach der Zahlung und der Bestätigungsmail auf deinem Konto, spätestens in 24 Stunden."
        ),
        line("price", `Gesamtpreis: ${coins / 100},00 € inkl. 19 % MwSt., keine weiteren Kosten.`),
        line("payment", "Du zahlst mit PayPal."),
      ],
      en: [
        line("product", `${coins.toLocaleString("en-US")} Morphcoins`),
        line(
          "detail",
          "Balance for offers on Bootstrap Academy, one-time purchase. The Morphcoins are in your account after payment and the confirmation email, within 24 hours at the latest."
        ),
        line("price", `Total price: €${coins / 100}.00 incl. 19% VAT, no further costs.`),
        line("payment", "You pay with PayPal."),
      ],
    };
  return {
    de: [
      line("product", "Premium"),
      line("detail", "Unbegrenzte Herzen."),
      line("term", "Laufzeit: 1 Monat, ohne automatische Verlängerung."),
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
      line("term", "Term: 1 month, no automatic renewal."),
      line(
        "detail",
        "Premium starts right after the confirmation email, within 24 hours at the latest. If Premium is already running, the new period follows it."
      ),
      line("price", "Total price: 1,000 Morphcoins (€10.00 incl. 19% VAT), no further costs."),
      line("payment", "You pay from your balance."),
    ],
  };
}

/** The synthetic shop of stage 2; `early` says whether a Premium offer carries the box. */
function shop({ hearts, paidUntil = null, early = true, renewal = null }) {
  const S = { hearts, accepted: [], paypalOrders: [], offers: [], paidUntil, early, renewal };
  S.quote = (kind, coins = 0) => {
    const { de, en } = wording(kind, coins);
    // A running monthly renewal stands in the term line with its Euro amount.
    if (renewal && kind.startsWith("premium_")) {
      de[2] = line(
        "term",
        "Laufzeit: 1 Monat. Danach läuft deine monatliche Verlängerung weiter (1.000 Morphcoins = 10,00 € inkl. 19 % MwSt. je Monat)."
      );
      en[2] = line(
        "term",
        "Term: 1 month. After that, your monthly renewal continues (1,000 Morphcoins = €10.00 incl. 19% VAT per month)."
      );
    }
    const declaration = kind.startsWith("premium_") && early ? EARLY : { de: "", en: "" };
    const offer = {
      id: `95000000-0000-4000-8000-${String(S.offers.length + 1).padStart(12, "0")}`,
      hash: `stage2-hash-${S.offers.length + 1}`,
      text: de.map((l) => l.text).join("\n"),
      declaration: declaration.de,
      recipient: `${user.display_name} <${user.email}>`,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      user_id: user.id,
      source: kind === "coins" ? "paypal" : "backend",
      document_hash: "stage2-documents",
      provision_window_seconds: 86400,
      acceptance: "button",
      product: {
        kind,
        reference: kind === "coins" ? String(coins) : kind,
        title: kind,
        description: "",
        coins: kind === "coins" ? coins : kind === "hearts" ? 50 : 1000,
        facts: kind.startsWith("premium_")
          ? { months: 1, renewal: renewal ? { monthly_price: renewal } : null, early_start: early }
          : {},
        revision: "synthetic",
        service_starts_at: null,
      },
      summary: {
        de: { lines: de, declaration: declaration.de },
        en: { lines: en, declaration: declaration.en },
      },
    };
    S.offers.push(offer);
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

async function fixture(S, language, [width, height]) {
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
    if (path === `/shop/coins/${user.id}`) return answer({ coins: 50000 });
    if (path === `/shop/hearts/${user.id}`) return answer({ hearts: S.hearts });
    if (path === `/shop/premium/${user.id}`)
      return answer({
        premium: !!S.paidUntil,
        autopay: S.renewal ? "MONTHLY" : null,
        renewal: S.renewal
          ? {
              id: "11111111-1111-4111-8111-111111111115",
              monthly_price: S.renewal,
              confirmation_sent: true,
            }
          : null,
        since: S.paidUntil ? seconds() - 86400 : null,
        until: S.paidUntil,
      });
    if (path === "/challenges/tasks/quiz-task/multiple_choice") return answer([quiz]);
    if (path === "/challenges/tasks/quiz-task/multiple_choice/mc-1") return answer(quiz);
    if (path.includes("unrated") || path.includes("notifications")) return answer([]);
    if (path === "/shop/purchases" && method === "GET") return answer([]);
    const kind = path.match(/^\/shop\/purchases\/offers\/(hearts|premium_monthly)$/)?.[1];
    if (kind && method === "POST") return answer({ state: "offered", offer: S.quote(kind) });
    const coins = path.match(/^\/shop\/coins\/paypal\/offers\/(\d+)$/)?.[1];
    if (coins && method === "POST")
      return answer({ state: "offered", offer: S.quote("coins", Number(coins)) });
    if (path === "/shop/coins/paypal" && method === "GET") return answer("synthetic-client-id");
    if (path === "/shop/coins/paypal/orders" && method === "POST") {
      S.paypalOrders.push(req.postDataJSON());
      // Nothing is paid here: the provider order is refused, the request is what counts.
      return answer({ detail: "Synthetic refusal" }, 503);
    }
    if (path === "/shop/purchases/accept" && method === "POST") {
      const body = req.postDataJSON();
      S.accepted.push(body);
      const offer = S.offers.find((o) => o.id === body.order_id);
      if (offer?.product.kind === "hearts") S.hearts = 6;
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

/** The order summary: its boxes, the acceptance sentence and the order button. */
const summary = (page, [root, label]) =>
  page.evaluate(
    ([root, label]) => {
      const scope = document.querySelector(root);
      const contract = scope?.querySelector("[data-purchase-contract]");
      if (!contract) return null;
      const button = [...scope.querySelectorAll("[data-order-actions] button")].find(
        (candidate) => candidate.textContent.trim() === label
      );
      const rect = button?.getBoundingClientRect();
      const area =
        root === "main" ? scope.getBoundingClientRect() : { top: 0, bottom: innerHeight };
      // The border of the highlighted block as the browser draws it, against the accent colour.
      const lines = contract.querySelector("[data-purchase-lines]");
      const style = lines ? getComputedStyle(lines) : null;
      const probe = document.createElement("span");
      probe.className = "text-accent";
      document.body.append(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      return {
        border: style && {
          width: style.borderLeftWidth,
          style: style.borderLeftStyle,
          accent: style.borderLeftColor === accent,
        },
        acceptanceBox: !!contract.querySelector("[data-purchase-acceptance]"),
        earlyBox: !!contract.querySelector("[data-purchase-early]"),
        sentence:
          contract
            .querySelector("[data-purchase-accepted-by-button]")
            ?.textContent.replace(/\s+/g, " ")
            .trim() ?? null,
        highlighted: contract
          .querySelector("[data-purchase-lines]")
          ?.getAttribute("data-purchase-lines"),
        blocked: button?.getAttribute("aria-disabled"),
        buttonBottom: rect ? Math.round(rect.bottom) : null,
        inView:
          !!rect &&
          rect.top >= Math.max(0, area.top) &&
          rect.bottom <= Math.min(innerHeight, area.bottom),
      };
    },
    [root, label]
  );
const byButton = (language) =>
  tr(language, "Body.OfferAcceptanceByButton")
    .replace("{button}", tr(language, "Buttons.OrderWithObligationToPay"))
    .replace("{terms}", tr(language, "Links.TermsAndConditions"))
    .replace("{withdrawal}", tr(language, "Links.RightOfWithdrawalLinkText"));
const premiumButton = (page) =>
  page
    .locator("button:has(img[src*='coin'])")
    .filter({ hasText: /Morphcoins/i })
    .first();
const orderButton = (page, root, language) =>
  page.locator(`${root} [data-order-actions] button`, {
    hasText: tr(language, "Buttons.OrderWithObligationToPay"),
  });

/** Opens a dialog of stage 2 and checks what it shows before anything is sent. */
async function open(f, language, path, opener, label) {
  await f.page.goto(app + path);
  const button = opener(f.page);
  await button.waitFor({ state: "visible" });
  await button.click();
  await f.page.locator(".modal-content [data-purchase-contract]").waitFor();
  await settle(f.page);
  const seen = await summary(f.page, [
    ".modal-content",
    tr(language, "Buttons.OrderWithObligationToPay"),
  ]);
  if (evidence) await f.page.screenshot({ path: join(evidence, `${label}.png`) });
  assert.equal(seen.acceptanceBox, false, "no acceptance box");
  assert.equal(seen.sentence, byButton(language));
  assert.equal(seen.highlighted, "highlighted");
  assert.deepEqual(seen.border, HIGHLIGHT, "the block carries the accent border");
  assert.equal(seen.inView, true, `order button ends at ${seen.buttonBottom} px`);
  return seen;
}
const HIGHLIGHT = { width: "4px", style: "solid", accent: true };

const cases = {
  "hearts-in-a-quiz": async (f, S, language, label) => {
    const seen = await open(
      f,
      language,
      "/quizzes/solve-quiz-task?quizzesFrom=quiz",
      (page) => page.locator("button", { hasText: tr(language, "Headings.RefillHearts") }).first(),
      label
    );
    assert.equal(seen.earlyBox, false, "a heart refill has no box");
    assert.equal(seen.blocked, "false", "ready to be ordered at once");
    await orderButton(f.page, ".modal-content", language).click();
    await f.page.locator(".modal-content [data-purchase-contract]").waitFor({ state: "detached" });
    assert.deepEqual(
      S.accepted.map((a) => [a.accepted, a.early_performance_requested]),
      [[true, false]]
    );
    assert.equal(new URL(f.page.url()).pathname, "/quizzes/solve-quiz-task");
    return seen;
  },
  "hearts-on-the-premium-page": async (f, S, language, label) => {
    const seen = await open(
      f,
      language,
      "/subscription",
      (page) => page.locator("button", { hasText: tr(language, "Buttons.Refill") }).first(),
      label
    );
    assert.equal(seen.earlyBox, false);
    await orderButton(f.page, ".modal-content", language).click();
    await f.page.locator(".modal-content [data-purchase-contract]").waitFor({ state: "detached" });
    assert.deepEqual(
      S.accepted.map((a) => a.early_performance_requested),
      [false]
    );
    return seen;
  },
  "premium-starting-at-once": async (f, S, language, label) => {
    const seen = await open(f, language, "/subscription", premiumButton, label);
    assert.equal(seen.earlyBox, true, "one box: the early start");
    assert.equal(seen.blocked, "true");
    // Without the box nothing goes out, and the page says which box is open.
    await orderButton(f.page, ".modal-content", language).click({ force: true });
    await f.page.waitForFunction(
      (text) => document.body.innerText.includes(text),
      tr(language, "Error.EarlyStartMissing")
    );
    assert.deepEqual(S.accepted, []);
    await f.page.locator(".modal-content [data-purchase-early]").check({ force: true });
    await orderButton(f.page, ".modal-content", language).click();
    await f.page.locator(".modal-content [data-purchase-contract]").waitFor({ state: "detached" });
    assert.deepEqual(
      S.accepted.map((a) => a.early_performance_requested),
      [true]
    );
    return seen;
  },
  "premium-with-renewal-starting-early": async (f, S, language, label) => {
    const seen = await open(f, language, "/subscription", premiumButton, label);
    assert.equal(seen.earlyBox, true);
    await f.page.locator(".modal-content [data-purchase-early]").check({ force: true });
    await orderButton(f.page, ".modal-content", language).click();
    await f.page.locator(".modal-content [data-purchase-contract]").waitFor({ state: "detached" });
    assert.deepEqual(
      S.accepted.map((a) => a.early_performance_requested),
      [true]
    );
    return seen;
  },
  "premium-after-a-paid-period": async (f, S, language, label) => {
    const seen = await open(f, language, "/subscription", premiumButton, label);
    assert.equal(seen.earlyBox, false, "no box when the period begins after 14 days");
    assert.equal(seen.blocked, "false");
    await orderButton(f.page, ".modal-content", language).click();
    await f.page.locator(".modal-content [data-purchase-contract]").waitFor({ state: "detached" });
    assert.deepEqual(
      S.accepted.map((a) => a.early_performance_requested),
      [false]
    );
    return seen;
  },
  "coin-order-page": async (f, S, language, label) => {
    await f.page.goto(app + "/morphcoins/paypal?coins=1500");
    await f.page.locator("main [data-purchase-contract]").waitFor();
    await settle(f.page, 800);
    const seen = await summary(f.page, ["main", tr(language, "Buttons.OrderWithObligationToPay")]);
    if (evidence) await f.page.screenshot({ path: join(evidence, `${label}.png`) });
    assert.equal(seen.acceptanceBox, false);
    assert.equal(seen.earlyBox, false, "a coin purchase has no box");
    assert.equal(seen.sentence, byButton(language));
    assert.deepEqual(seen.border, HIGHLIGHT, "the block carries the accent border");
    assert.equal(seen.inView, true, `order button ends at ${seen.buttonBottom} px`);
    const actionButton = (key) =>
      f.page.locator("main [data-order-actions] button", { hasText: tr(language, key) });
    // From Premium, "Zurück" leads to the amount, which the amount page shows again, and the
    // way back to Premium stays with it through "Weiter".
    await f.page.goto(app + "/morphcoins/paypal?coins=1500&next=subscription");
    await f.page.locator("main [data-purchase-contract]").waitFor();
    await actionButton("Buttons.Back").click();
    await f.page.waitForURL(
      (url) =>
        url.pathname === "/morphcoins/buy" &&
        url.searchParams.get("coins") === "1500" &&
        url.searchParams.get("next") === "subscription"
    );
    await f.page.waitForFunction(() =>
      [...document.querySelectorAll("main input")].some(
        (input) => input.value.replace(/\D/g, "") === "1500"
      )
    );
    await f.page
      .locator("main button", { hasText: tr(language, "Buttons.ContinueToOrderSummary") })
      .click();
    await f.page.waitForURL(
      (url) =>
        url.pathname === "/morphcoins/paypal" &&
        url.searchParams.get("coins") === "1500" &&
        url.searchParams.get("next") === "subscription"
    );
    // "Abbrechen" stops the order and leaves the purchase: back to Premium, or home.
    await f.page.locator("main [data-purchase-contract]").waitFor();
    await actionButton("Buttons.Cancel").click();
    await f.page.waitForURL((url) => url.pathname === "/subscription");
    await f.page.goto(app + "/morphcoins/paypal?coins=1500");
    await f.page.locator("main [data-purchase-contract]").waitFor();
    await actionButton("Buttons.Cancel").click();
    await f.page.waitForURL((url) => url.pathname === "/dashboard");
    // The order goes out without an early start.
    await f.page.goto(app + "/morphcoins/paypal?coins=1500");
    await f.page.locator("main [data-purchase-contract]").waitFor();
    await settle(f.page);
    await orderButton(f.page, "main", language).click();
    for (let i = 0; !S.paypalOrders.length && i < 50; i++) await f.page.waitForTimeout(100);
    assert.equal(S.paypalOrders.length, 1);
    assert.equal(S.paypalOrders[0].early_performance_requested, false);
    assert.equal(S.paypalOrders[0].accepted, true);
    return seen;
  },
};
const shops = {
  "hearts-in-a-quiz": () => shop({ hearts: 0 }),
  "hearts-on-the-premium-page": () => shop({ hearts: 0 }),
  "premium-starting-at-once": () => shop({ hearts: 6 }),
  "premium-after-a-paid-period": () =>
    shop({ hearts: 6, paidUntil: seconds() + 86400 * 30, early: false }),
  // The tallest dialog of stage 2: a running renewal in the term line and the early start.
  "premium-with-renewal-starting-early": () =>
    shop({ hearts: 6, paidUntil: seconds() + 86400 * 5, early: true, renewal: 1000 }),
  "coin-order-page": () => shop({ hearts: 6 }),
};

try {
  for (const [name, run] of Object.entries(cases))
    for (const language of ["de", "en-US"])
      for (const size of [
        [390, 844],
        [1280, 800],
      ]) {
        const label = `${name}-${language}-${size.join("x")}`;
        const S = shops[name]();
        const f = await fixture(S, language, size);
        try {
          const seen = await run(f, S, language, label);
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
