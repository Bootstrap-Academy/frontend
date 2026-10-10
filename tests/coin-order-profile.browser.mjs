/**
 * Mounted Nuxt UI, synthetic API only. Every unrelated network origin is blocked.
 *
 * Serve this checkout on COIN_ORDER_TEST_APP with NUXT_PUBLIC_BASE_API_URL set to
 * COIN_ORDER_TEST_API, as a generated build or with `nuxt dev`, then run
 *   PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/coin-order-profile.browser.mjs
 * COIN_ORDER_EVIDENCE_DIR keeps pictures of the loading state, the failed load and the
 * country question.
 */
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.COIN_ORDER_TEST_APP || "http://127.0.0.1:58731";
const api = process.env.COIN_ORDER_TEST_API || "http://127.0.0.1:58733";
const evidence = process.env.COIN_ORDER_EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });
const de = JSON.parse(await readFile(new URL("../locales/de.json", import.meta.url), "utf8"));

const order = "/morphcoins/paypal?coins=500";
const account = (tail, patch) => ({
  id: `33000000-0000-4000-8000-0000000000${tail}`,
  name: `Synthetic${tail}`,
  display_name: `Synthetic ${tail}`,
  email: `synthetic-${tail}@example.invalid`,
  email_verified: true,
  tags: [],
  admin: false,
  terms_version: "2026-09-r4",
  age_confirmed: true,
  business: false,
  country: null,
  ...patch,
});
const invoice = {
  business: true,
  first_name: "Ada",
  last_name: "Synthetic",
  street: "Example Street 1",
  zip_code: "12345",
  city: "Example",
  country: "Deutschland",
  vat_id: "DE000000000",
};
const privateWithoutCountry = () => account("0a");
const privateWithCountry = () => account("0b", { country: "Deutschland" });
const business = () => account("0c", invoice);
const businessIncomplete = () => account("0d", { ...invoice, vat_id: "" });

const token = (user) =>
  `e30.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800 })).toString("base64url")}.synthetic`;
/** The cookies a sign-in writes. */
const signedIn = (user) => ({
  user: { id: user.id, name: user.name, display_name: user.display_name },
  session: { id: `coin-order-session-${user.name}` },
  accessToken: token(user),
  refreshToken: `synthetic-refresh-${user.name}`,
  authGeneration: `generation-${user.name}`,
});
const signedOut = { user: null, session: null, accessToken: null, refreshToken: null };
const cookies = (user) =>
  Object.entries({ locale: "de", ...signedIn(user) }).map(([name, value]) => ({
    name,
    value: encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value)),
    url: app,
  }));
const gate = () => {
  let open;
  const passed = new Promise((resolve) => (open = resolve));
  return { passed, open };
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/run/current-system/sw/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-background-networking"],
});
const results = [],
  errors = [];

/**
 * A signed in browser at phone width. `profile(n)` decides the n-th profile request:
 * it may wait before the answer and may return a failing status.
 */
async function fixture(accounts, profile = () => {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "de-DE",
    reducedMotion: "reduce",
  });
  await context.addCookies(cookies(accounts[0]));
  // Everything the page ever said about the buyer, however briefly.
  await context.addInitScript((privateBuyer) => {
    const seen = (window.__seen = { question: false, privateBuyer: false });
    new MutationObserver(() => {
      seen.question ||= !!document.getElementById("order-country");
      seen.privateBuyer ||= !!document.querySelector("main")?.textContent.includes(privateBuyer);
    }).observe(document, { childList: true, subtree: true, characterData: true });
  }, de.Headings.Person);
  const owners = new Map(accounts.map((user) => [token(user), user]));
  const calls = [];
  let profileRequests = 0,
    foreign = 0;
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
    const owner = owners.get((req.headers()["authorization"] || "").replace(/^Bearer /, ""));
    const call = { path, method, at: Date.now(), owner: owner?.name };
    if (method === "PATCH") call.body = req.postDataJSON();
    calls.push(call);
    const answer = (data, status = 200) =>
      route
        .fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
          headers: { "cache-control": "private, no-store" },
        })
        // The context of a finished case may already be closed.
        .catch(() => {});
    if (path === "/auth/oauth/providers") return answer([]);
    if (!owner) return answer({ detail: "x" }, 401);
    if (path === "/auth/users/me" && method === "GET") {
      const status = (await profile(profileRequests++))?.status ?? 200;
      return status === 200 ? answer(owner) : answer({ detail: "Internal Server Error" }, status);
    }
    if (path === `/auth/users/${owner.id}` && method === "PATCH")
      return answer(Object.assign(owner, call.body));
    if (path.startsWith("/shop/coins/paypal/offers/") && method === "POST") {
      const coins = Number(path.split("/").pop());
      return answer({
        state: "offered",
        offer: {
          id: "44000000-0000-4000-8000-000000000001",
          hash: "synthetic-hash",
          text: `Synthetic offer for ${coins} Morphcoins`,
          declaration: "Synthetic declaration",
          recipient: owner.email,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          user_id: owner.id,
          source: "paypal",
          product: { kind: "coins", reference: String(coins), coins, title: "Morphcoins" },
        },
      });
    }
    if (path === "/shop/coins/config") return answer({ coins_per_euro: 100, vat_percent: 19 });
    if (path === `/shop/coins/${owner.id}`) return answer({ coins: 0 });
    return answer({});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  const count = (method, start) =>
    calls.filter((c) => c.method === method && c.path.startsWith(start)).length;
  /** The API has been quiet for a second. */
  async function settled() {
    for (let last = -1; last !== calls.length || Date.now() - (calls.at(-1)?.at ?? 0) < 1000; ) {
      last = calls.length;
      await page.waitForTimeout(250);
    }
  }
  /** What the order page tells the buyer right now, and what it ever showed. */
  async function shown() {
    const { text, ...rest } = await page.evaluate(() => ({
      text: document.querySelector("main")?.innerText ?? "",
      question: !!document.getElementById("order-country"),
      offer: !!document.querySelector("[data-purchase-contract]"),
      ever: window.__seen,
    }));
    return {
      loading: text.includes(de.Moderation.Loading),
      failed: text.includes(de.Error.TryAgainLater),
      buyer: !text.includes(`${de.Headings.UserType}:`)
        ? null
        : text.includes(de.Headings.Business)
          ? "business"
          : "private",
      incomplete: text.includes(de.Body.MissingProfileInfo) || text.includes(de.Headings.Missing),
      ...rest,
    };
  }
  return {
    context,
    page,
    calls,
    settled,
    shown,
    profileRequests: () => count("GET", "/auth/users/me"),
    offers: () => count("POST", "/shop/coins/paypal/offers/"),
    saved: () => calls.filter((c) => c.method === "PATCH").map((c) => c.body),
    /** Another tab changes the session cookies, and this tab reads them again. */
    otherTab: (changes) =>
      page.evaluate((entries) => {
        for (const [name, value] of entries)
          document.cookie =
            value === null
              ? `${name}=; Path=/; Max-Age=0`
              : `${name}=${encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value))}; Path=/`;
        window.dispatchEvent(new Event("focus"));
      }, Object.entries(changes)),
    /** Puts this tab into the background or brings it back. */
    background: (hidden) =>
      page.evaluate(
        (state) => {
          Object.defineProperty(document, "visibilityState", {
            configurable: true,
            get: () => state,
          });
          document.dispatchEvent(new Event("visibilitychange"));
        },
        hidden ? "hidden" : "visible"
      ),
    foreign: () => foreign,
    picture: (name) =>
      evidence ? page.screenshot({ path: join(evidence, name), fullPage: true }) : null,
  };
}

const never = { question: false, privateBuyer: false };
const silent = {
  loading: true,
  failed: false,
  buyer: null,
  incomplete: false,
  question: false,
  offer: false,
  ever: never,
};
const loaded = { loading: false, failed: false, incomplete: false, question: false, offer: true };
const loadingNotice = (page) =>
  page.locator("main [role=status]", { hasText: de.Moderation.Loading });
const userType = (page) => page.locator("main h3", { hasText: de.Headings.UserType });
const done = async (name, f, more = {}) => {
  results.push({
    name,
    profileRequests: f.profileRequests(),
    offers: f.offers(),
    saved: f.saved(),
    foreignRequests: f.foreign(),
    ...more,
  });
  await f.context.close();
};

try {
  {
    // The profile request of the app start fails; the page's own request is answered late.
    const late = gate();
    const f = await fixture([business()], (n) => (n < 2 ? { status: 500 } : late.passed));
    await f.page.goto(app + order);
    await loadingNotice(f.page).waitFor();
    assert.deepEqual(await f.shown(), silent);
    // Two attempts of the app start (the client repeats a failed read once) and one of the page.
    await f.page.waitForTimeout(3000);
    assert.equal(f.profileRequests(), 3, "the page asks once and does not repeat it");
    assert.deepEqual(await f.shown(), silent);
    assert.deepEqual(f.saved(), []);
    assert.equal(f.offers(), 0);
    await f.picture("coin-order-loading-390.png");
    late.open();
    await userType(f.page).waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), { ...loaded, buyer: "business", ever: never });
    assert.equal(f.profileRequests(), 3);
    assert.equal(f.offers(), 1);
    assert.deepEqual(f.saved(), []);
    await done("unloaded-then-business", f);
  }
  {
    // A slow API: the app start gives up waiting, both requests are answered afterwards.
    const first = gate(),
      second = gate();
    const f = await fixture([business()], (n) => (n === 0 ? first.passed : second.passed));
    await f.page.goto(app + order);
    await loadingNotice(f.page).waitFor();
    assert.deepEqual(await f.shown(), silent);
    assert.equal(f.profileRequests(), 2, "one request of the app start, one of the page");
    first.open();
    await userType(f.page).waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), { ...loaded, buyer: "business", ever: never });
    second.open();
    await f.settled();
    assert.deepEqual(await f.shown(), { ...loaded, buyer: "business", ever: never });
    assert.equal(f.profileRequests(), 2);
    assert.equal(f.offers(), 1, "the second answer changes nothing");
    assert.deepEqual(f.saved(), []);
    await done("late-business-profile", f);
  }
  {
    // Every profile request fails until the buyer tries again.
    let failing = true;
    const f = await fixture([privateWithoutCountry()], () => (failing ? { status: 500 } : null));
    await f.page.goto(app + order);
    const alert = f.page.locator("main [role=alert]", { hasText: de.Error.TryAgainLater });
    await alert.waitFor();
    const notice = await f.page.locator("article[role=alert]").innerText();
    await f.settled();
    assert.deepEqual(await f.shown(), { ...silent, loading: false, failed: true });
    assert.equal(f.profileRequests(), 4, "app start and page, each repeated once by the client");
    await f.page.waitForTimeout(2000);
    assert.equal(f.profileRequests(), 4, "no retry on its own");
    await f.picture("coin-order-failed-390.png");
    failing = false;
    await alert.getByRole("button", { name: de.Buttons.TryAgain }).click();
    await f.page.locator("#order-country").waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), {
      ...loaded,
      buyer: "private",
      question: true,
      offer: false,
      ever: { question: true, privateBuyer: true },
    });
    assert.equal(f.profileRequests(), 5);
    assert.deepEqual(f.saved(), []);
    await done("failed-then-retry", f, { notice });
  }
  {
    const f = await fixture([privateWithoutCountry()]);
    await f.page.goto(app + order);
    await f.page.locator("#order-country").waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), {
      ...loaded,
      buyer: "private",
      question: true,
      offer: false,
      ever: { question: true, privateBuyer: true },
    });
    assert.equal(await f.page.locator("#order-country").inputValue(), "Deutschland");
    assert.equal(f.offers(), 0);
    await f.picture("coin-order-country-390.png");
    await f.page.getByRole("button", { name: de.Buttons.Continue, exact: true }).click();
    await f.page.locator("[data-purchase-contract]").waitFor();
    await f.settled();
    assert.deepEqual(f.saved(), [{ country: "Deutschland", business: false }]);
    const after = await f.shown();
    assert.deepEqual(
      { ...after, ever: null },
      { ...loaded, buyer: "private", question: false, ever: null }
    );
    assert.equal(f.profileRequests(), 1, "a loaded profile is not requested again");
    assert.equal(f.offers(), 1);
    await done("loaded-private-without-country", f);
  }
  for (const [name, user, expected, offers] of [
    ["loaded-private-with-country", privateWithCountry(), { buyer: "private" }, 1],
    ["loaded-business-complete", business(), { buyer: "business" }, 1],
    [
      "loaded-business-incomplete",
      businessIncomplete(),
      { buyer: "business", incomplete: true, offer: false },
      0,
    ],
  ]) {
    const f = await fixture([user]);
    await f.page.goto(app + order);
    await userType(f.page).waitFor();
    await f.settled();
    const ever = { question: false, privateBuyer: expected.buyer === "private" };
    assert.deepEqual(await f.shown(), { ...loaded, ...expected, ever }, name);
    assert.equal(f.profileRequests(), 1, name);
    assert.equal(f.offers(), offers, name);
    assert.deepEqual(f.saved(), [], name);
    await done(name, f);
  }
  {
    // Another tab signs in a business account while the question is open.
    const first = privateWithoutCountry(),
      second = business();
    const f = await fixture([first, second]);
    await f.page.goto(app + order);
    await f.page.locator("#order-country").waitFor();
    await f.settled();
    await f.context.addCookies(cookies(second));
    await f.page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await f.page.locator("main p", { hasText: de.Headings.Business }).waitFor({ state: "visible" });
    await f.settled();
    const after = await f.shown();
    assert.deepEqual(
      { ...after, ever: null },
      { ...loaded, buyer: "business", question: false, ever: null }
    );
    assert.deepEqual(
      f.calls.filter((c) => c.path === "/auth/users/me").map((c) => c.owner),
      [first.name, second.name]
    );
    assert.deepEqual(f.saved(), []);
    await done("account-changed-in-another-tab", f);
  }
  {
    // The coin shop does not hold back a buyer whose profile has not arrived.
    const f = await fixture([privateWithCountry()], (n) => (n < 2 ? { status: 500 } : null));
    await f.page.goto(app + "/morphcoins/buy");
    await f.page.locator("#TermsAndConditions").check({ force: true });
    await f.page.getByRole("button", { name: de.Buttons.ContinueToOrderSummary }).click();
    await f.page.waitForURL(app + order, { timeout: 5000 });
    await userType(f.page).waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), {
      ...loaded,
      buyer: "private",
      ever: { question: false, privateBuyer: true },
    });
    assert.equal(f.profileRequests(), 3);
    assert.equal(f.offers(), 1, "one offer, although the profile arrives while the page opens");
    assert.deepEqual(f.saved(), []);
    await done("coin-shop-without-profile", f);
  }
  {
    // This tab is in the background while another tab signs out and signs the same account in again.
    const user = business();
    const f = await fixture([user], (n) => (n < 2 ? { status: 500 } : null));
    await f.page.goto(app + order);
    await userType(f.page).waitFor();
    await f.settled();
    assert.equal(f.profileRequests(), 3, "the page has asked for this account itself");
    await f.background(true);
    await f.otherTab(signedOut);
    await loadingNotice(f.page).waitFor();
    await f.otherTab(signedIn(user));
    await userType(f.page).waitFor({ timeout: 5000 });
    await f.background(false);
    await f.settled();
    const after = await f.shown();
    assert.deepEqual({ ...after, ever: null }, { ...loaded, buyer: "business", ever: null });
    assert.equal(new URL(f.page.url()).pathname + new URL(f.page.url()).search, order);
    assert.equal(f.profileRequests(), 4, "the returning account is asked for again");
    assert.deepEqual(f.saved(), []);
    await done("same-account-signed-in-again", f);
  }
  {
    // The session ends in another tab: a page behind the login leaves for it.
    const f = await fixture([business()]);
    await f.page.goto(app + order);
    await userType(f.page).waitFor();
    await f.settled();
    await f.otherTab(signedOut);
    await f.page.waitForURL(
      (url) => url.pathname === "/auth/login" && url.searchParams.get("redirect") === order,
      { timeout: 5000 }
    );
    await f.settled();
    assert.equal(f.profileRequests(), 1);
    assert.equal(f.offers(), 1, "no offer is requested for nobody");
    assert.deepEqual(f.saved(), []);
    await done("session-ended-in-another-tab", f);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, app, syntheticAPI: api, results }));
} finally {
  await browser.close();
}
