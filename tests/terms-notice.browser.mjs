/**
 * Mounted Nuxt UI, synthetic API only. Every unrelated network origin is blocked.
 *
 * The notice of terms 2026-10 (part 2 of the announcement) in a real browser whose clock is set
 * before, inside and after its window. Inside, it says part 2 with the date once and links both
 * documents in a small card that takes at most a quarter of the screen; a "×" closes it for the
 * account. It is not on the amount page or on learning pages, and it takes nothing from an
 * order: the order button and every box of the heart dialog in a quiz, the Premium dialog and
 * the coin order page stand exactly where they stand with the notice closed. In German and
 * English, on a phone (390 × 844) and on a laptop (1280 × 800).
 *
 * Build this checkout with NUXT_PUBLIC_BASE_API_URL=NOTICE_TEST_API,
 * NUXT_PUBLIC_TERMS_2026_10_FROM=2026-12-09T00:00:00+01:00 and
 * NUXT_PUBLIC_TERMS_2026_10_ANNOUNCED=2026-10-21T09:00:00+02:00, serve it on NOTICE_TEST_APP,
 * then run
 *   PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/terms-notice.browser.mjs
 * NOTICE_EVIDENCE_DIR keeps a picture of every page with the notice.
 */
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.NOTICE_TEST_APP || "http://127.0.0.1:58731";
const api = process.env.NOTICE_TEST_API || "http://127.0.0.1:58733";
const evidence = process.env.NOTICE_EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });
const locales = {
  de: JSON.parse(await readFile(new URL("../locales/de.json", import.meta.url), "utf8")),
  "en-US": JSON.parse(await readFile(new URL("../locales/en-US.json", import.meta.url), "utf8")),
};
const tr = (language, key) =>
  key.split(".").reduce((part, name) => part?.[name], locales[language]);

const at = {
  beforeAnnouncement: Date.parse("2026-10-21T06:59:00Z"),
  announcement: Date.parse("2026-10-21T07:00:00Z"),
  during: Date.parse("2026-11-20T12:00:00Z"),
  start: Date.parse("2026-12-08T23:00:00Z"),
  after: Date.parse("2027-01-15T12:00:00Z"),
};
const date = { de: "9. Dezember 2026", "en-US": "9 December 2026" };
const body = (language) =>
  tr(language, "TermsNotice.Body")
    .replace("{date}", date[language])
    .replace("{withdrawal}", tr(language, "TermsNotice.Withdrawal"))
    .replace("{changes}", tr(language, "TermsNotice.Changes"));
const withdrawalLink = {
  de: "/docs/right-of-withdrawal-2026-10",
  "en-US": "/docs/right-of-withdrawal-2026-10#english",
};

const user = {
  id: "98000000-0000-4000-8000-000000000003",
  name: "SyntheticNotice",
  display_name: "Synthetic Notice",
  email: "synthetic-notice@example.invalid",
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
  session: { id: "notice-session" },
  accessToken: token,
  refreshToken: "synthetic-refresh-notice",
  authGeneration: "generation-notice",
};
const termsKey = `bootstrap-academy:update-notice:2026-10-terms:${user.id}`;
// The update notice of October is closed, so only the terms notice is in question.
const updateKey = `bootstrap-academy:update-notice:2026-10-privacy-r2:${user.id}`;
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

const declaration = {
  de: "Ich verlange ausdrücklich, dass mit der bestellten Leistung vor Ablauf der Widerrufsfrist begonnen wird. Meine gesetzlichen Widerrufs- und Mängelrechte bleiben unberührt.",
  en: "I expressly request that the ordered service begins before the withdrawal period ends. My statutory withdrawal and warranty rights remain unaffected.",
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
          "Gesamtpreis: 50 Morphcoins (0,50 € inkl. 19 % MwSt.), keine weiteren Kosten."
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
        line("price", `Gesamtpreis: ${coins / 100},00 € inkl. 19 % MwSt., keine weiteren Kosten.`),
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
        "Gesamtpreis: 1.000 Morphcoins (10,00 € inkl. 19 % MwSt.), keine weiteren Kosten."
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

/** Offers of today's order dialog, dated by the clock of the browser. */
function shop(time) {
  const S = { offers: [] };
  S.quote = (kind, coins = 0) => {
    const { de, en } = wording(kind, coins);
    const offer = {
      id: `96000000-0000-4000-8000-${String(S.offers.length + 1).padStart(12, "0")}`,
      hash: `notice-hash-${S.offers.length + 1}`,
      text: de.map((l) => l.text).join("\n"),
      declaration: declaration.de,
      recipient: `${user.display_name} <${user.email}>`,
      created_at: new Date(time).toISOString(),
      expires_at: new Date(time + 60 * 60 * 1000).toISOString(),
      user_id: user.id,
      source: kind === "coins" ? "paypal" : "backend",
      document_hash: "notice-documents",
      provision_window_seconds: 86400,
      product: {
        kind,
        reference: kind === "coins" ? String(coins) : kind,
        title: kind,
        description: "",
        coins: kind === "coins" ? coins : kind === "hearts" ? 50 : 1000,
        facts:
          kind === "hearts"
            ? { maximum: 6, unit: "half_heart", refill_units: 6 }
            : kind === "coins"
              ? {}
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

/** A signed in browser at `time`, with `stored` in its local storage before the app starts. */
async function fixture(language, [width, height], time, stored = {}) {
  const S = shop(time);
  const context = await browser.newContext({
    viewport: { width, height },
    locale: language === "de" ? "de-DE" : "en-US",
    reducedMotion: "reduce",
  });
  await context.clock.install({ time });
  await context.addInitScript(
    (entries) => {
      for (const [key, value] of entries) localStorage.setItem(key, value);
    },
    Object.entries({ [updateKey]: "1", ...stored })
  );
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
    if (path === `/shop/hearts/${user.id}`) return answer({ hearts: 0 });
    if (path === `/shop/premium/${user.id}`)
      return answer({ premium: false, autopay: null, renewal: null, since: null, until: null });
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
    if (method !== "GET") return answer({ detail: "Nothing is sent in this test" }, 503);
    return answer({});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  return { context, page, foreign: () => foreign };
}

async function settle(page, ms = 600) {
  await page.waitForTimeout(ms);
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, {
      timeout: 5000,
    })
    .catch(() => {});
}

/** What the notice shows, or `null` without one. */
const noticeOn = (page) =>
  page.evaluate(() => {
    const notice = document.querySelector("[data-terms-notice]");
    if (!notice) return null;
    const rect = notice.getBoundingClientRect();
    return {
      text: notice.querySelector("p").textContent.replace(/\s+/g, " ").trim(),
      links: [...notice.querySelectorAll("a")].map((a) => [
        a.getAttribute("href"),
        a.textContent.trim(),
      ]),
      // Whether every link has the size and font of its sentence.
      linksInLine: [...notice.querySelectorAll("a")].every((a) => {
        const [link, sentence] = [a, notice.querySelector("p")].map((n) => getComputedStyle(n));
        return link.fontSize === sentence.fontSize && link.fontFamily === sentence.fontFamily;
      }),
      button: (() => {
        const button = notice.querySelector("button");
        const box = button.getBoundingClientRect();
        return {
          text: button.textContent.trim(),
          label: button.getAttribute("aria-label"),
          size: [Math.round(box.width), Math.round(box.height)],
        };
      })(),
      label: notice.getAttribute("aria-label"),
      viewport: innerHeight,
      position: getComputedStyle(notice).position,
      top: Math.round(rect.top),
      height: Math.round(rect.height),
      page: document.body.innerText,
    };
  });
const count = (text, part) => text.split(part).length - 1;
// An ordinary page that carries the notice, and the share of the screen the card may take.
const NOTICE_PAGE = "/dashboard";
const NOTICE_SHARE = 0.25;

/** Where the order button and every box of an order form stand, and whether a notice is there. */
const orderForm = (page, [root, label]) =>
  page.evaluate(
    ([root, label]) => {
      const scope = document.querySelector(root);
      const contract = scope?.querySelector("[data-purchase-contract]");
      if (!contract) return null;
      const box = (element) => {
        const rect = element.getBoundingClientRect();
        return [Math.round(rect.top), Math.round(rect.bottom)];
      };
      const button = [...scope.querySelectorAll("[data-order-actions] button")].find(
        (candidate) => candidate.textContent.trim() === label
      );
      return {
        notice: !!document.querySelector("[data-terms-notice]"),
        button: button ? box(button) : null,
        boxes: [...contract.querySelectorAll("input[type=checkbox]")].map(box),
        height: innerHeight,
      };
    },
    [root, label]
  );
const premiumButton = (page) =>
  page
    .locator("button:has(img[src*='coin'])")
    .filter({ hasText: /Morphcoins/i })
    .first();
const surfaces = {
  "hearts-in-a-quiz": {
    path: "/quizzes/solve-quiz-task?quizzesFrom=quiz",
    open: (page, language) =>
      page.locator("button", { hasText: tr(language, "Headings.RefillHearts") }).first(),
    root: ".modal-content",
    // A learning page carries no notice.
    notice: false,
  },
  "premium-dialog": {
    path: "/subscription",
    open: premiumButton,
    root: ".modal-content",
    notice: false,
  },
  "coin-order-page": { path: "/morphcoins/paypal?coins=1500", root: "main", notice: false },
};

async function measure(language, size, name, closed) {
  const surface = surfaces[name];
  const f = await fixture(language, size, at.during, closed ? { [termsKey]: "1" } : {});
  try {
    await f.page.goto(app + surface.path);
    if (surface.open) {
      const opener = surface.open(f.page, language);
      await opener.waitFor({ state: "visible" });
      await opener.click();
    }
    await f.page.locator(`${surface.root} [data-purchase-contract]`).waitFor();
    await settle(f.page, 800);
    const seen = await orderForm(f.page, [
      surface.root,
      tr(language, "Buttons.OrderWithObligationToPay"),
    ]);
    assert(seen?.button, "the order button is there");
    assert.equal(f.foreign(), 0);
    return seen;
  } finally {
    await f.context.close();
  }
}

const cases = {
  "inside-the-window": async (language, size, label) => {
    const f = await fixture(language, size, at.during);
    try {
      await f.page.goto(app + NOTICE_PAGE);
      await f.page.locator("[data-terms-notice]").waitFor();
      await settle(f.page);
      const seen = await noticeOn(f.page);
      if (evidence) await f.page.screenshot({ path: join(evidence, `${label}.png`) });
      assert.equal(seen.text, body(language));
      assert.equal(count(seen.page, date[language]), 1, "the date stands once on the page");
      assert.deepEqual(seen.links, [
        [withdrawalLink[language], tr(language, "TermsNotice.Withdrawal")],
        ["/docs/terms-and-conditions-2026-10", tr(language, "TermsNotice.Changes")],
      ]);
      assert.equal(seen.linksInLine, true, "the links have the size and font of the sentence");
      // Closed with a "×" in the corner, named for screen readers, large enough to tap.
      assert.equal(seen.button.text, "×");
      assert.equal(seen.button.label, tr(language, "UpdateNotice.Dismiss"));
      assert(
        seen.button.size.every((side) => side >= 44),
        JSON.stringify(seen.button.size)
      );
      assert.equal(seen.label, tr(language, "TermsNotice.Label"));
      assert.equal(seen.position, "static", "it lies in the page and covers nothing");
      assert(
        seen.height <= seen.viewport * NOTICE_SHARE,
        `the card takes ${seen.height} of ${seen.viewport} px`
      );
      // Where someone came to buy or to learn, there is none.
      for (const path of ["/morphcoins/buy", "/quizzes/solve-quiz-task?quizzesFrom=quiz"]) {
        await f.page.goto(app + path);
        await f.page.locator("main").first().waitFor();
        await settle(f.page, 1500);
        assert.equal(await noticeOn(f.page), null, path);
      }
      await f.page.goto(app + NOTICE_PAGE);
      await f.page.locator("[data-terms-notice]").waitFor();
      // The document it leads to shows without the notice.
      await f.page
        .locator("[data-terms-notice] a", { hasText: tr(language, "TermsNotice.Changes") })
        .click();
      await f.page.waitForURL((url) => url.pathname === "/docs/terms-and-conditions-2026-10");
      await f.page.locator("main, body").first().waitFor();
      await settle(f.page);
      assert.equal(await noticeOn(f.page), null, "no notice on the document");
      // Its box names the start, who the version applies to and the changed clauses (20.1).
      const documentText = (await f.page.innerText("body")).replace(/\s+/g, " ");
      for (const part of [
        "Diese Fassung haben wir angekündigt. Sie gilt ab dem 9. Dezember 2026 für neue Konten und neue Bestellungen",
        "Geändert sind der Kopf mit Beginn und Geltungsbereich und diese Ziffern:",
        "(Ziffer 12.2)",
      ])
        assert(documentText.includes(part), `the announced terms name: ${part}`);
      // Closed, it stays closed for this account.
      await f.page.goto(app + NOTICE_PAGE);
      await f.page.locator("[data-terms-notice]").waitFor();
      await f.page.locator("[data-terms-notice] button").click();
      await f.page.locator("[data-terms-notice]").waitFor({ state: "detached" });
      assert.equal(await f.page.evaluate((key) => localStorage.getItem(key), termsKey), "1");
      await f.page.reload();
      await settle(f.page, 1500);
      assert.equal(await noticeOn(f.page), null, "closed, it does not come back");
      assert.equal(f.foreign(), 0);
      return { top: seen.top, height: seen.height };
    } finally {
      await f.context.close();
    }
  },
  "outside-the-window": async (language, size) => {
    const seen = {};
    for (const [name, time, shown] of [
      ["before", at.beforeAnnouncement, false],
      ["announcement", at.announcement, true],
      ["start", at.start, false],
      ["after", at.after, false],
    ]) {
      const f = await fixture(language, size, time);
      try {
        await f.page.goto(app + NOTICE_PAGE);
        await f.page.locator("main").first().waitFor();
        if (shown) await f.page.locator("[data-terms-notice]").waitFor();
        else await settle(f.page, 1500);
        seen[name] = !!(await noticeOn(f.page));
        assert.equal(seen[name], shown, name);
      } finally {
        await f.context.close();
      }
    }
    return seen;
  },
  "order-forms-keep-their-place": async (language, size) => {
    const seen = {};
    for (const name of Object.keys(surfaces)) {
      const open = await measure(language, size, name, false);
      const closed = await measure(language, size, name, true);
      assert.equal(closed.notice, false);
      assert.equal(open.notice, surfaces[name].notice, `${name}: notice ${open.notice}`);
      // Where the notice stays away, nothing can move, and two loads of the coin page have
      // differed by a few pixels without it. Where it shows, the order form has to stand at
      // the same pixels.
      if (surfaces[name].notice)
        assert.deepEqual(
          { button: open.button, boxes: open.boxes },
          { button: closed.button, boxes: closed.boxes },
          `${name}: the order form does not move`
        );
      seen[name] = { button: open.button, boxes: open.boxes };
    }
    return seen;
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
        try {
          const seen = await run(language, size, label);
          results.push({ label, passed: true, seen });
          console.log("PASS", label, JSON.stringify(seen));
        } catch (error) {
          results.push({ label, passed: false, error: error.message });
          console.log("FAIL", label, error.message);
        }
      }
} finally {
  await browser.close();
}
assert.deepEqual(errors, [], "no page errors");
const failed = results.filter((r) => !r.passed);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exitCode = failed.length ? 1 : 0;
