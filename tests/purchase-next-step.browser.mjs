/**
 * Mounted Nuxt UI, synthetic API only. Every unrelated network origin is blocked.
 *
 * Serve this checkout on PURCHASE_TEST_APP with NUXT_PUBLIC_BASE_API_URL set to
 * PURCHASE_TEST_API, as a generated build or with `nuxt dev`, then run
 *   PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/purchase-next-step.browser.mjs
 * Every case runs; the result lists the ones that failed, and the run then ends with an error.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.PURCHASE_TEST_APP || "http://127.0.0.1:58731";
const api = process.env.PURCHASE_TEST_API || "http://127.0.0.1:58733";
const locales = {
  de: JSON.parse(await readFile(new URL("../locales/de.json", import.meta.url), "utf8")),
  "en-US": JSON.parse(await readFile(new URL("../locales/en-US.json", import.meta.url), "utf8")),
};
const de = locales.de;

// Figures the synthetic API publishes; none of them is the built-in fallback.
const REFILL_PRICE = 80;
const COINS_PER_EURO = 200;
const SMALLEST_PURCHASE = 500;

const account = (tail, patch) => ({
  id: `99000000-0000-4000-8000-0000000000${tail}`,
  name: `Synthetic${tail}`,
  display_name: `Synthetic ${tail}`,
  email: `synthetic-${tail}@example.invalid`,
  email_verified: true,
  description: "",
  tags: [],
  admin: false,
  terms_version: "2026-09-r4",
  age_confirmed: true,
  leaderboard_opt_out: true,
  business: false,
  first_name: "",
  last_name: "",
  street: "",
  zip_code: "",
  city: "",
  country: "Deutschland",
  vat_id: "",
  ...patch,
});
const token = (user) =>
  `e30.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800 })).toString("base64url")}.synthetic`;
const signedIn = (user) => ({
  user: { id: user.id, name: user.name, display_name: user.display_name },
  session: { id: `purchase-session-${user.name}` },
  accessToken: token(user),
  refreshToken: `synthetic-refresh-${user.name}`,
  authGeneration: `generation-${user.name}`,
});

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/run/current-system/sw/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-background-networking"],
});
const results = [],
  errors = [];

/** A browser at phone width for one account, signed in unless `session` is false. */
async function fixture(user, { session = true, language = "de" } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: language === "de" ? "de-DE" : "en-US",
    reducedMotion: "reduce",
  });
  await context.addCookies(
    Object.entries({ locale: language, ...(session ? signedIn(user) : {}) }).map(
      ([name, value]) => ({
        name,
        value: encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value)),
        url: app,
      })
    )
  );
  const calls = [];
  let foreign = 0,
    refused = "";
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
    calls.push({ path, method, at: Date.now() });
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
    const fresh = () => ({
      user,
      session: signedIn(user).session,
      access_token: token(user),
      refresh_token: signedIn(user).refreshToken,
    });
    // The synthetic login accepts the account by its name; no password is checked.
    if (path === "/auth/sessions" && method === "POST") {
      if (req.postDataJSON()?.name_or_email !== user.name)
        return answer({ detail: "Invalid credentials" }, 401);
      refused = "";
      return answer(fresh());
    }
    // Until the next login the server renews the session and still refuses one request.
    if (refused && path === "/auth/session" && method === "PUT") return answer(fresh());
    if (refused && path.endsWith(refused)) return answer({ detail: "Invalid token" }, 401);
    if ((req.headers()["authorization"] || "") !== `Bearer ${token(user)}`)
      return answer({ detail: "x" }, 401);
    if (path === "/auth/users/me") return answer(user);
    if (path === "/auth/users/me/publication")
      return answer({ profile_visibility: "private", visibility_revision: 0 });
    if (path === "/shop/coins/config")
      return answer({ coins_per_euro: COINS_PER_EURO, vat_percent: 19 });
    if (path === "/shop/hearts/config")
      return answer({ hearts_max: 6, hearts_refill_price: REFILL_PRICE });
    if (path === "/shop/learning/policy")
      return answer({ mode: "legacy", heart_sales: true, single_course_sales: true });
    if (path === `/shop/coins/${user.id}`) return answer({ coins: 0 });
    if (path === `/shop/hearts/${user.id}`) return answer({ hearts: 0 });
    if (path === `/shop/premium/${user.id}`) return answer({ premium: false, autopay: null });
    if (path.startsWith("/shop/coins/paypal/offers/") && method === "POST")
      return answer({ detail: "Service Unavailable" }, 503);
    return answer({});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  return {
    context,
    page,
    calls,
    foreign: () => foreign,
    here: () =>
      new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash,
    /** From now on the server refuses the requests whose path ends like this. */
    refuse: (ending) => (refused = ending),
    /** Signs in through the form of the login page. */
    async login() {
      await page.locator('input[autocomplete="username"]').fill(user.name);
      await page.locator('input[autocomplete="current-password"]').fill("synthetic-not-checked");
      await page.locator('input[autocomplete="current-password"]').press("Enter");
    },
  };
}

const euros = (amount, language) =>
  new Intl.NumberFormat(language === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
const refillNote = (language) =>
  locales[language].Body.NeedCoinsForRefill.replace("{coins}", REFILL_PRICE)
    .replace("{min}", SMALLEST_PURCHASE)
    .replace("{price}", euros(SMALLEST_PURCHASE / COINS_PER_EURO, language));
const back = (page) => page.locator("section.container-fluid button", { hasText: de.Links.GoBack });
const loginPage = (target) => (url) =>
  url.pathname === "/auth/login" && url.searchParams.get("redirect") === target;

const cases = {
  // "Back" in the header of a coin order that began on the Premium page.
  "back-to-premium": async () => {
    const f = await fixture(account("0a"));
    await f.page.goto(app + "/morphcoins/paypal?coins=1000&next=subscription");
    await back(f.page).click();
    await f.page.waitForURL(app + "/subscription", { timeout: 5000 });
    return f;
  },
  "back-to-coin-shop": async () => {
    const f = await fixture(account("0a"));
    await f.page.goto(app + "/morphcoins/paypal?coins=500");
    await back(f.page).click();
    await f.page.waitForURL(app + "/morphcoins/buy", { timeout: 5000 });
    return f;
  },
  // Sent to the coin shop for a heart refill: what the refill takes and what the shop sells.
  "refill-note-in-coin-shop": async () => {
    for (const language of ["de", "en-US"]) {
      const f = await fixture(account("0a"), { language });
      await f.page.goto(app + "/morphcoins/buy?for=hearts");
      const note = f.page.locator("form p[role=status]");
      await note.waitFor();
      await assert.doesNotReject(
        f.page.waitForFunction(
          ([selector, text]) => document.querySelector(selector)?.textContent.trim() === text,
          ["form p[role=status]", refillNote(language)],
          { timeout: 5000 }
        ),
        language
      );
      if (language === "de") await f.context.close();
      else return f;
    }
  },
  // The box on the Premium page says the same and leads into the coin shop.
  "refill-box-on-premium-page": async () => {
    const f = await fixture(account("0a"));
    await f.page.goto(app + "/subscription");
    const box = f.page.locator("div.rounded-xl", { hasText: de.Headings.RefillHeartsNow });
    await box.locator("p", { hasText: refillNote("de") }).waitFor({ timeout: 5000 });
    await box.getByRole("link", { name: de.Headings.BuyMorphcoins }).click();
    await f.page.waitForURL(app + "/morphcoins/buy?for=hearts", { timeout: 5000 });
    await f.page.locator("form p[role=status]", { hasText: refillNote("de") }).waitFor();
    return f;
  },
  // The profile form in English.
  "save-button-in-english": async () => {
    const f = await fixture(account("0a"), { language: "en-US" });
    await f.page.goto(app + "/profile/edit");
    const form = f.page.locator("section.container-form form");
    await form.waitFor();
    assert.equal(
      (await form.locator("button[type=submit]").innerText()).trim().toLowerCase(),
      "save"
    );
    return f;
  },
  // Without a session a protected page leads to the login, and the login leads back.
  "login-returns-to-profile-form": async () => {
    const f = await fixture(account("0a"), { session: false });
    await f.page.goto(app + "/profile/edit");
    await f.page.waitForURL(loginPage("/profile/edit"), { timeout: 5000 });
    await f.login();
    await f.page.waitForURL(app + "/profile/edit", { timeout: 5000 });
    await f.page.locator("section.container-form form").waitFor();
    return f;
  },
  "login-returns-to-coin-order": async () => {
    const target = "/morphcoins/paypal?coins=500&next=subscription";
    const f = await fixture(account("0a"), { session: false });
    await f.page.goto(app + target);
    await f.page.waitForURL(loginPage(target), { timeout: 5000 });
    await f.login();
    await f.page.waitForURL(app + target, { timeout: 5000 });
    await f.page.locator("main h3", { hasText: de.Headings.UserType }).waitFor();
    return f;
  },
  // A request stays refused although the session was renewed, so the page ends the session:
  // the login gets the whole address as the way back, with everything after the first "&"
  // and the anchor.
  "refused-request-keeps-way-back": async () => {
    const target = "/account?from=menu&view=data#account-documents-heading";
    const f = await fixture(account("0a"));
    await f.page.goto(app + target);
    const download = f.page.getByRole("button", { name: de.Buttons.DownloadMyData });
    await download.waitFor();
    f.refuse("/export");
    await download.click();
    await f.page.waitForURL(loginPage(target), { timeout: 5000 });
    await f.login();
    await f.page.waitForURL(app + target, { timeout: 5000 });
    await f.page.getByRole("button", { name: de.Buttons.DownloadMyData }).waitFor();
    return f;
  },
  // A way back that names another site is not followed.
  "login-ignores-foreign-target": async () => {
    let last;
    for (const target of [
      "//example.invalid/x",
      "https://example.invalid/x",
      "/\\example.invalid",
      // Harmless in the address, another host once the router has decoded the path.
      "/%2F%2Fexample.invalid",
      "/%5Cexample.invalid",
      "/..//example.invalid",
    ]) {
      const f = await fixture(account("0a"), { session: false });
      await f.page.goto(app + "/auth/login?redirect=" + encodeURIComponent(target));
      await f.login();
      await f.page.waitForURL(app + "/dashboard", { timeout: 5000 });
      assert.equal(f.foreign(), 0, target);
      if (last) await last.context.close();
      last = f;
    }
    return last;
  },
};

try {
  for (const [name, run] of Object.entries(cases)) {
    let f;
    try {
      f = await run();
      assert.equal(f.foreign(), 0, "no request to another origin");
      results.push({ name, passed: true, at: f.here() });
    } catch (error) {
      results.push({ name, passed: false, error: String(error?.message || error).split("\n")[0] });
    }
    await f?.context.close().catch(() => {});
  }
  const failed = results.filter((result) => !result.passed).map((result) => result.name);
  const passed = failed.length === 0 && errors.length === 0;
  console.log(
    JSON.stringify({ passed, app, syntheticAPI: api, failed, pageErrors: errors, results })
  );
} finally {
  await browser.close();
}
// A failed case ends the run with an error, also when another script imports this file.
assert.deepEqual(
  results.filter((result) => !result.passed).map((result) => result.name),
  [],
  "failed cases"
);
assert.deepEqual(errors, [], "page errors");
