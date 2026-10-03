/** Real Nuxt pages and existing renderer; every API response below is synthetic. */
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.GUEST_TEST_APP || "http://127.0.0.1:56981";
const api = process.env.GUEST_TEST_API || "http://127.0.0.1:56983";
const out = process.env.GUEST_TEST_OUTPUT || "/tmp/academy-guest-browser";
await mkdir(out, { recursive: true });
const exercise = JSON.parse(
  await readFile(new URL("../utils/guest/loops-intro.json", import.meta.url))
);
const { completion, retired, ...unit } = exercise;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/run/current-system/sw/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const results = [],
  errors = [];
const payload = { exp: Math.floor(Date.now() / 1000) + 7200, sub: "guest-test-A" };
const token = `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.synthetic`;
const sourceState = {
  stage: 4,
  singleDone: true,
  prediction: "6",
  predictionChecked: true,
  practiceRepetitions: 4,
};

async function fixture(width = 390) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  const calls = [],
    receipts = new Map();
  let user = {
    id: "guest-test-A",
    name: "GuestTest",
    display_name: "Local test account",
    email: "local@example.invalid",
    email_verified: false,
    terms_version: "2026-09-r4",
    tags: [],
    admin: false,
  };
  let progress = { revision: 0, state: {}, status: "new", result: null, review_id: null };
  let mode = "normal";
  const auth = () => ({
    user,
    session: { id: "guest-test-session" },
    access_token: token,
    refresh_token: "synthetic-refresh",
  });
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.origin === app) return route.continue();
    if (url.origin !== api) return route.abort();
    const method = req.method();
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    calls.push({ path: url.pathname + url.search, method, body });
    let response = {},
      status = 200;
    if (method === "OPTIONS") response = {};
    else if (url.pathname === "/auth/users" && method === "POST") response = auth();
    else if (url.pathname === "/auth/users/me/email" && method === "PUT") {
      user.email_verified = true;
      response = true;
    } else if (url.pathname.endsWith("/email") && method === "POST") response = true;
    else if (url.pathname === "/auth/session") response = auth();
    else if (url.pathname === "/auth/users/me") response = user;
    else if (url.pathname === "/auth/sessions") {
      user.email_verified = true;
      response = auth();
    } else if (url.pathname === "/auth/oauth/providers")
      response = [{ id: "github", name: "GitHub" }];
    else if (url.pathname === "/auth/oauth/authorize")
      response = {
        state: "synthetic-state",
        authorize_url: `${app}/oauth/callback?state=synthetic-state&code=synthetic-code`,
      };
    else if (url.pathname === "/auth/sessions/oauth") {
      user.email_verified = true;
      response = { login: auth() };
    } else if (url.pathname === "/skills/rooms/capabilities") response = { enabled: true };
    else if (url.pathname === "/skills/rooms/loops-intro/state" && method === "PUT") {
      if (mode === "limit") {
        status = 429;
        response = { code: "daily_limit_reached" };
      } else if (receipts.has(body.request_id)) response = receipts.get(body.request_id);
      else if (body.expected_revision !== progress.revision) {
        status = 409;
        response = { detail: "conflict" };
      } else {
        progress = {
          ...progress,
          revision: progress.revision + 1,
          state: body.state,
          status: "in_progress",
        };
        response = { unit, progress: structuredClone(progress) };
        receipts.set(body.request_id, response);
        if (mode === "uncertain") {
          mode = "normal";
          status = 503;
          response = {};
        }
      }
    } else if (url.pathname === "/skills/rooms/loops-intro/complete") {
      assert.deepEqual(body.answer, completion.answer);
      progress = {
        ...progress,
        revision: progress.revision + 1,
        status: "completed",
        result: { kind: "introduced" },
      };
      response = { unit, progress };
    } else if (url.pathname === "/skills/rooms/loops-intro")
      response = { unit: mode === "changed" ? { ...unit, content: {} } : unit, progress };
    else if (url.pathname === "/skills/rooms") {
      const path = { id: "python-loops", title: { de: "Python", en: "Python" }, chapters: [] };
      response = { paths: [path], path, next: { unit, progress } };
    } else if (url.pathname.endsWith("/premium")) response = { premium: false };
    else if (url.pathname.endsWith("/learning-resources")) response = { hearts: 5, premium: false };
    else if (url.pathname.includes("notifications")) response = [];
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(response),
      headers: {
        "Access-Control-Allow-Origin": app,
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  });
  return {
    context,
    page,
    calls,
    mode: (value) => (mode = value),
    conflict: () =>
      (progress = { ...progress, revision: 4, status: "in_progress", state: { stage: 2 } }),
    auth: async () => {
      user.email_verified = true;
      await context.addCookies(
        Object.entries({
          user: JSON.stringify(user),
          session: JSON.stringify({ id: "guest-test-session" }),
          accessToken: token,
          refreshToken: "synthetic-refresh",
        }).map(([name, value]) => ({
          name,
          value: encodeURIComponent(value),
          url: app,
          secure: true,
          sameSite: "Lax",
        }))
      );
    },
    close: () => context.close(),
  };
}
async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
}
async function seedFinished(f) {
  await f.page.goto(app + "/start");
  await f.page.getByRole("button", { name: "Einen Schritt gehen" }).waitFor();
  await f.page.evaluate(
    (state) =>
      localStorage.setItem(
        "academy-guest-learning:1",
        JSON.stringify({
          version: 1,
          guest: { version: 1, id: crypto.randomUUID(), owner: null, state, finished: true },
          accounts: {},
        })
      ),
    sourceState
  );
  await f.page.reload();
}
async function play(f, english) {
  const { page } = f;
  await page.goto(app);
  await page.getByRole("link", { name: "Jetzt lernen", exact: false }).waitFor();
  if (english) {
    await page.getByRole("button", { name: "English", exact: true }).focus();
    await page.keyboard.press("Enter");
  }
  const start = page.getByRole("link", {
    name: english ? "Start learning" : "Jetzt lernen",
    exact: false,
  });
  assert.equal(await start.count(), 1);
  await start.focus();
  await page.keyboard.press("Enter");
  const move = page.getByRole("button", {
    name: english ? "Move one step" : "Einen Schritt gehen",
  });
  await move.focus();
  await page.keyboard.press("Enter");
  const next = () =>
    page.getByRole("button", { name: english ? "Continue" : "Weiter", exact: false });
  await next().click();
  const slider = page.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await next().click();
  await page.getByRole("spinbutton").fill("5");
  await page
    .getByRole("button", { name: english ? "Check prediction" : "Vorhersage prüfen" })
    .click();
  assert.equal(await next().isDisabled(), true);
  assert.equal(
    f.calls.some((c) => c.path.startsWith("/skills/rooms")),
    false
  );
  await page.reload();
  assert.equal(await page.getByRole("spinbutton").inputValue(), "5");
  // Switch language in the middle without dropping the draft, then back.
  await page.getByRole("button", { name: english ? "Deutsch" : "English", exact: true }).click();
  assert.equal(await page.getByRole("spinbutton").inputValue(), "5");
  await page.getByRole("button", { name: english ? "English" : "Deutsch", exact: true }).click();
  await page.getByRole("spinbutton").fill("6");
  await page
    .getByRole("button", { name: english ? "Check prediction" : "Vorhersage prüfen" })
    .click();
  await next().click();
  await slider.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  assert.equal(await slider.inputValue(), "4");
  await noOverflow(page);
  await page.screenshot({
    path: resolve(out, `target-${english ? "en-desktop" : "de-mobile"}.png`),
    fullPage: true,
  });
  // The already-loaded exercise remains usable without a network.
  await f.context.setOffline(true);
  await next().click();
  await page
    .getByRole("button", { name: english ? "Finish introduction" : "Einführung abschließen" })
    .click();
  await page
    .getByRole("heading", {
      name: english ? "You reached the target!" : "Du hast das Ziel erreicht!",
    })
    .waitFor();
  assert.equal(
    f.calls.some((c) => c.path.startsWith("/skills/rooms")),
    false
  );
  await noOverflow(page);
  await f.context.setOffline(false);
  await page.reload();
  await page
    .getByRole("heading", {
      name: english ? "You reached the target!" : "Du hast das Ziel erreicht!",
    })
    .waitFor();
  await page.screenshot({
    path: resolve(out, `result-${english ? "en-desktop" : "de-mobile"}.png`),
    fullPage: true,
  });
}
try {
  const mobile = await fixture(390);
  await play(mobile, false);
  results.push(
    "390px German: keyboard, incorrect answer, reload, language changes, offline completion, local result"
  );
  await mobile.close();
  const f = await fixture(1280);
  await play(f, true);
  await f.page.getByRole("link", { name: "Create a free account", exact: true }).click();
  await f.page.getByLabel("Nickname", { exact: true }).fill("GuestTest");
  await f.page.getByLabel("Your display name", { exact: true }).fill("Local test account");
  await f.page.getByLabel("E-mail Address", { exact: true }).fill("local@example.invalid");
  await f.page.getByLabel("Password", { exact: true }).fill("Synthetic12345");
  await f.page.locator('input[type="checkbox"]').nth(0).check();
  await f.page.locator('input[type="checkbox"]').nth(1).check();
  await f.page
    .locator("form")
    .getByRole("button", { name: "Create Account", exact: false })
    .click();
  await f.page.getByRole("link", { name: "Verify your email", exact: true }).waitFor();
  assert.equal(f.calls.filter((c) => c.path.endsWith("/email") && c.method === "POST").length, 1);
  assert.equal(
    f.calls.some((c) => c.path.endsWith("/state?course=python-foundations")),
    false
  );
  await f.page.getByRole("link", { name: "Verify your email", exact: true }).click();
  await f.page.getByLabel("Verification Code", { exact: true }).fill("1234-1234-1234-1234");
  await f.page
    .locator("form")
    .getByRole("button", { name: /Verify Account/i })
    .click();
  f.mode("uncertain");
  await f.page.getByRole("link", { name: "Continue in the course", exact: true }).click();
  await f.page.getByRole("button", { name: "Try saving again", exact: true }).waitFor();
  await f.page.reload();
  await f.page.getByRole("button", { name: "Save progress and continue", exact: true }).click();
  await f.page.waitForURL("**/learn?**");
  await f.page.getByRole("button", { name: "Finish introduction", exact: false }).waitFor();
  const puts = f.calls.filter(
    (c) => c.path === "/skills/rooms/loops-intro/state?course=python-foundations"
  );
  assert.equal(puts.length, 2);
  assert.deepEqual(puts[0].body, puts[1].body);
  assert.equal(
    f.calls.some((c) => c.path.includes("/complete")),
    false
  );
  assert.equal(new URL(f.page.url()).searchParams.get("unit"), "loops-intro");
  const completedResponse = f.page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith("/complete")
  );
  await f.page.getByRole("button", { name: "Finish introduction", exact: false }).click();
  await completedResponse;
  assert.equal(f.calls.filter((c) => c.path.includes("/complete")).length, 1);
  results.push(
    "1280px English: actual signup and email verification UI, account-bound automatic draft import, uncertain response/reload/idempotent retry, exact real player resume and deliberate server completion (synthetic API)"
  );
  await f.close();

  for (const mode of ["conflict", "changed", "limit"]) {
    const f = await fixture();
    await seedFinished(f);
    await f.auth();
    if (mode === "conflict") f.conflict();
    else f.mode(mode);
    await f.page.reload();
    await f.page
      .getByRole("button", { name: "Fortschritt speichern und weiterlernen", exact: true })
      .click();
    await f.page.locator('main [role="alert"]').waitFor();
    assert.equal(
      f.calls.some((c) => c.path.includes("/complete")),
      false
    );
    if (mode !== "limit")
      assert.equal(
        f.calls.some((c) => c.method === "PUT"),
        false
      );
    await noOverflow(f.page);
    await f.page.reload();
    assert.equal(
      await f.page.evaluate(
        () =>
          Object.keys(JSON.parse(localStorage.getItem("academy-guest-learning:1")).accounts).length
      ),
      1
    );
    results.push(`${mode}: draft retained, no completion, no overwrite`);
    await f.close();
  }
  const oauth = await fixture();
  await seedFinished(oauth);
  await oauth.page.getByRole("link", { name: "Einloggen", exact: true }).click();
  await oauth.page.getByRole("button", { name: /GitHub/ }).click();
  await oauth.page.waitForURL("**/learn?**");
  assert.equal(
    oauth.calls.filter(
      (c) => c.path === "/skills/rooms/loops-intro/state?course=python-foundations"
    ).length,
    1
  );
  assert.equal(
    oauth.calls.some((c) => c.path.includes("/complete")),
    false
  );
  results.push(
    "Explicit OAuth login binds the destination account and saves once without a redundant confirmation"
  );
  await oauth.close();
  const password = await fixture(390);
  await password.page.goto(app + "/start");
  await password.page.getByRole("button", { name: "English", exact: true }).click();
  await password.page.getByRole("button", { name: "Move one step" }).click();
  await password.page.getByRole("link", { name: "Log in", exact: true }).click();
  await password.page.getByLabel("E-mail Address or Nickname", { exact: true }).fill("GuestTest");
  await password.page.getByLabel("Password", { exact: true }).fill("Synthetic12345");
  await password.page.locator("form").getByRole("button", { name: "Login", exact: true }).click();
  await password.page.waitForURL("**/learn?**");
  await password.page.getByRole("button", { name: "Back to the start", exact: false }).waitFor();
  assert.equal(
    password.calls.filter(
      (c) => c.path === "/skills/rooms/loops-intro/state?course=python-foundations"
    ).length,
    1
  );
  assert.equal(
    password.calls.some((c) => c.path.includes("/complete")),
    false
  );
  await noOverflow(password.page);
  await password.page.screenshot({ path: resolve(out, "resumed-mobile.png"), fullPage: true });
  results.push(
    "Password login automatically saves a partial exercise and opens its exact state in the existing player"
  );
  await password.close();

  const blocked = await fixture(390);
  await blocked.page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Disabled", "SecurityError");
      },
    })
  );
  await blocked.page.goto(app + "/start");
  await blocked.page.getByRole("button", { name: "Einen Schritt gehen" }).click();
  await blocked.page.getByRole("link", { name: "Einloggen", exact: true }).click();
  assert.equal(
    new URL(blocked.page.url()).pathname.replace(/\/$/, ""),
    "/start",
    "do not navigate away with an unpreserved draft"
  );
  await blocked.page.getByRole("button", { name: "Weiter", exact: false }).click();
  await blocked.page.getByRole("button", { name: "Weiter", exact: false }).click();
  await blocked.page.getByRole("spinbutton").fill("6");
  await blocked.page.getByRole("button", { name: "Vorhersage prüfen" }).click();
  await blocked.page.getByRole("button", { name: "Weiter", exact: false }).click();
  await blocked.page.getByRole("slider").focus();
  await blocked.page.keyboard.press("Home");
  for (let i = 0; i < 3; i++) await blocked.page.keyboard.press("ArrowRight");
  await blocked.page.getByRole("button", { name: "Weiter", exact: false }).click();
  await blocked.page.getByRole("button", { name: "Einführung abschließen" }).click();
  await blocked.page.getByRole("heading", { name: "Du hast das Ziel erreicht!" }).waitFor();
  assert.equal(
    blocked.calls.some((c) => c.path.startsWith("/skills/rooms")),
    false
  );
  await noOverflow(blocked.page);
  results.push(
    "Blocked browser storage: exercise completes in memory, warning is honest, auth navigation preserves unsaved work"
  );
  await blocked.close();
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(
      {
        results,
        pageErrors: errors,
        scope:
          "Real Nuxt frontend; intercepted synthetic API; no real account, mail or production writes.",
      },
      null,
      2
    )
  );
  console.log(JSON.stringify({ passed: results.length, results, pageErrors: errors }, null, 2));
} finally {
  await browser.close();
}
