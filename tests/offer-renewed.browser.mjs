/**
 * Mounted Nuxt UI, synthetic API only. Every unrelated network origin is blocked.
 *
 * An order the server refuses as changed, without a charge (`refusal: "offer_changed"`), gets
 * a new quote in the dialog, which stays open with empty boxes and says Body.OfferRenewed; the
 * next confirmation orders the new quote. On the Premium page, for Premium and for a heart
 * refill whose hearts were lost in another tab, in German and English, on a phone and on a
 * laptop.
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

// The wording the backend issues (short order summary, both languages).
const declaration = {
  de: "Ich verlange ausdrücklich, dass mit der bestellten Leistung vor Ablauf der Widerrufsfrist begonnen wird. Meine gesetzlichen Widerrufs- und Mängelrechte bleiben unberührt.",
  en: "I expressly request that the ordered service begins before the withdrawal period ends. My statutory withdrawal and warranty rights remain unaffected.",
};
const line = (role, text) => ({ role, text });
const half = (units, separator) =>
  units % 2 ? `${Math.floor(units / 2)}${separator}5` : String(units / 2);
function wording(kind, units) {
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

/** The synthetic shop: quotes, acceptances and the account's hearts, coins and Premium. */
function shop({ hearts }) {
  const S = { hearts, coins: 50000, premium: false, offers: [], states: {}, accepted: [] };
  S.quote = (kind) => {
    const units = 6 - S.hearts;
    const { de, en } = wording(kind, units);
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
            : { months: 1, automatic_renewal: false, renewal: null },
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
 * A signed in browser on the Premium page. `refuse(offer, S)` decides whether the server
 * refuses an acceptance as changed.
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
    if (path === `/shop/premium/${user.id}`)
      return answer({ premium: S.premium, autopay: null, renewal: null });
    if (path === "/shop/purchases" && method === "GET")
      return answer(S.offers.map((offer) => ({ state: S.states[offer.id], offer })));
    const kind = path.match(/^\/shop\/purchases\/offers\/(hearts|premium_monthly)$/)?.[1];
    if (kind && method === "POST") return answer({ state: "offered", offer: S.quote(kind) });
    const one = path.match(/^\/shop\/purchases\/([0-9a-f-]{36})$/)?.[1];
    if (one && method === "GET") {
      const offer = S.offers.find((o) => o.id === one);
      return offer ? answer({ state: S.states[offer.id], offer }) : answer({ detail: "x" }, 404);
    }
    if (path === "/shop/purchases/accept" && method === "POST") {
      const offer = S.offers.find((o) => o.id === req.postDataJSON()?.order_id);
      S.accepted.push(offer?.id);
      if (!offer || S.states[offer.id] !== "offered") return answer({ detail: "x" }, 409);
      if (refuse(offer, S)) {
        S.states[offer.id] = "failed";
        return answer({
          state: "failed",
          offer,
          review_reason: "Offer expired or changed; no charge",
          refusal: "offer_changed",
        });
      }
      S.states[offer.id] = "fulfilled";
      if (offer.product.kind === "hearts") S.hearts = 6;
      else S.premium = true;
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

/** The open dialog: its offer lines, the boxes, and whether the order button is in view. */
const dialog = (page, label) =>
  page.evaluate((label) => {
    const modal = document.querySelector(".modal-content");
    const contract = modal?.querySelector("[data-purchase-contract]");
    if (!contract) return null;
    const button = [...modal.querySelectorAll("[data-order-actions] button")].find(
      (candidate) => candidate.textContent.trim() === label
    );
    const rect = button?.getBoundingClientRect();
    return {
      lines: [...contract.querySelectorAll("[data-line]")].map((node) => node.textContent.trim()),
      boxes: [...modal.querySelectorAll("input[type=checkbox]")].map((box) => box.checked),
      buttonInView: !!rect && rect.top >= 0 && rect.bottom <= innerHeight,
    };
  }, label);

async function order(page, language) {
  await page.locator(".modal-content [data-purchase-acceptance]").check({ force: true });
  await page.locator(".modal-content [data-purchase-early]").check({ force: true });
  await page
    .locator(".modal-content [data-order-actions] button", {
      hasText: tr(language, "Buttons.OrderWithObligationToPay"),
    })
    .click();
}

const cases = {
  // The server refuses the first Premium quote as changed (a new revision of the texts).
  premium: {
    hearts: 6,
    refuse: (offer, S) => offer.id === S.offers[0].id,
    open: (page) =>
      page
        .locator("button:has(img[src*='coin'])")
        .filter({ hasText: /Morphcoins/i })
        .first(),
    renewed: (language) => (language === "de" ? "Premium" : "Premium"),
  },
  // The account loses its last hearts in another tab while the dialog is open: the quote no
  // longer ends at 3 of 3, so the server refuses it as changed.
  hearts: {
    hearts: 2,
    refuse: (offer, S) => S.hearts + offer.product.facts.refill_units !== 6,
    before: (S) => (S.hearts = 0),
    open: (page, language) =>
      page.locator("button", { hasText: tr(language, "Buttons.Refill") }).first(),
    renewed: (language) =>
      language === "de" ? "Du bekommst 3 Herzen dazu" : "You get 3 more hearts",
  },
};

try {
  for (const [name, run] of Object.entries(cases))
    for (const language of ["de", "en-US"])
      for (const size of [
        [390, 844],
        [1280, 800],
      ]) {
        const label = `${name}-${language}-${size.join("x")}`;
        const S = shop({ hearts: run.hearts });
        const f = await fixture(S, language, size, run.refuse);
        try {
          const buttonLabel = tr(language, "Buttons.OrderWithObligationToPay");
          await f.page.goto(app + "/subscription");
          const opener = run.open(f.page, language);
          await opener.waitFor({ state: "visible" });
          await opener.click();
          await f.page.locator(".modal-content [data-purchase-contract]").waitFor();
          await settle(f.page);
          const first = await dialog(f.page, buttonLabel);
          run.before?.(S);
          await order(f.page, language);
          await f.page.waitForFunction(
            (notice) => document.body.innerText.includes(notice),
            tr(language, "Body.OfferRenewed")
          );
          await settle(f.page);
          const renewed = await dialog(f.page, buttonLabel);
          if (evidence) await f.page.screenshot({ path: join(evidence, `${label}.png`) });
          // The dialog stays with the new quote and empty boxes, the page stays.
          assert.ok(renewed, "the dialog stays open");
          assert.deepEqual(renewed.boxes, [false, false], "the boxes start empty");
          assert.ok(
            renewed.lines.some((text) => text.includes(run.renewed(language))),
            renewed.lines.join(" | ")
          );
          assert.equal(renewed.buttonInView, true, "order button in view");
          assert.equal(new URL(f.page.url()).pathname, "/subscription");
          assert.equal(S.offers.length, 2, "one new quote");
          assert.deepEqual(S.accepted, [S.offers[0].id]);
          assert.equal(
            (await f.page.evaluate(() => document.body.innerText)).includes(
              tr(language, "Body.PurchaseRejected")
            ),
            false
          );
          // Confirmed again, the new quote is ordered and the dialog closes.
          await order(f.page, language);
          await f.page.locator(".modal-content [data-purchase-contract]").waitFor({
            state: "detached",
          });
          assert.deepEqual(S.accepted, [S.offers[0].id, S.offers[1].id]);
          assert.equal(new URL(f.page.url()).pathname, "/subscription");
          assert.equal(f.foreign(), 0, "no request to another origin");
          results.push({ name: label, passed: true, first: first?.lines[0], renewed });
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
