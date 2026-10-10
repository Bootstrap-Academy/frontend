/**
 * Mounted Nuxt UI, synthetic API only. Every unrelated network origin is blocked.
 *
 * Serve this checkout on PROFILE_FORM_TEST_APP with NUXT_PUBLIC_BASE_API_URL set to
 * PROFILE_FORM_TEST_API, as a generated build or with `nuxt dev`, then run
 *   PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/profile-form-profile.browser.mjs
 * PROFILE_FORM_EVIDENCE_DIR keeps pictures of the loading state, the failed load and the form.
 */
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.PROFILE_FORM_TEST_APP || "http://127.0.0.1:58731";
const api = process.env.PROFILE_FORM_TEST_API || "http://127.0.0.1:58733";
const evidence = process.env.PROFILE_FORM_EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });
const de = JSON.parse(await readFile(new URL("../locales/de.json", import.meta.url), "utf8"));

const edit = "/profile/edit";
// The snackbar is an article with a heading as well; it announces itself as an alert.
const dialogHeadings = "article:not([role]) h6";
const account = (tail, patch) => ({
  id: `77000000-0000-4000-8000-0000000000${tail}`,
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
const privateBuyer = () => account("0a");
const business = () =>
  account("0b", {
    business: true,
    first_name: "Ada",
    last_name: "Synthetic",
    street: "Example Street 1",
    zip_code: "12345",
    city: "Example",
    country: "Österreich",
    vat_id: "ATU00000000",
  });
const withoutEmail = () => account("0c", { email: null, email_verified: false });
/** The fields the form shows as text inputs, by the key a save sends them under. */
const inputs = [
  ["email", de.Inputs.EmailAddress],
  ["name", de.Inputs.Nickname],
  ["display_name", de.Inputs.Name],
  ["first_name", de.Inputs.FirstName],
  ["last_name", de.Inputs.LastName],
  ["street", de.Inputs.Street],
  ["zip_code", de.Inputs.ZipCode],
  ["city", de.Inputs.City],
  ["country", de.Inputs.Country],
];
const fieldsOf = (user) => Object.fromEntries(inputs.map(([key]) => [key, user[key] ?? ""]));
/** What a save of the form sends for a profile. */
const body = (user) => ({
  ...fieldsOf(user),
  description: user.description,
  tags: user.tags,
  vat_id: user.vat_id,
  business: user.business,
  leaderboard_opt_out: user.leaderboard_opt_out,
});

const token = (user) =>
  `e30.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800 })).toString("base64url")}.synthetic`;
const session = (user) => ({ id: `profile-form-session-${user.name}` });
const refreshToken = (user) => `synthetic-refresh-${user.name}`;
const cookies = (user) =>
  Object.entries({
    locale: "de",
    user: { id: user.id, name: user.name, display_name: user.display_name },
    session: session(user),
    accessToken: token(user),
    refreshToken: refreshToken(user),
    authGeneration: `generation-${user.name}`,
  }).map(([name, value]) => ({
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
async function fixture(accounts, profile = () => {}, { userCookie = true } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "de-DE",
    reducedMotion: "reduce",
  });
  await context.addCookies(cookies(accounts[0]).filter((c) => userCookie || c.name !== "user"));
  // Whether the page ever offered the form or the notice about a missing address, however briefly.
  await context.addInitScript(
    ([missingEmail, dialogHeadings]) => {
      const seen = (window.__seen = { form: false, missingEmail: false });
      new MutationObserver(() => {
        seen.form ||= !!document.querySelector("section.container-form form");
        seen.missingEmail ||= [...document.querySelectorAll(dialogHeadings)].some(
          (heading) => heading.textContent.trim() === missingEmail
        );
      }).observe(document, { childList: true, subtree: true, characterData: true });
    },
    [de.Headings.MissingEmail, dialogHeadings]
  );
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
    const sent = method === "GET" ? null : req.postDataJSON();
    const owner =
      owners.get((req.headers()["authorization"] || "").replace(/^Bearer /, "")) ??
      accounts.find((user) => sent?.refresh_token === refreshToken(user));
    const call = { path, method, at: Date.now(), owner: owner?.name };
    if (method === "PATCH") call.body = sent;
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
    if (!owner) return answer({ detail: "x" }, 401);
    if (path === "/auth/users/me" && method === "GET") {
      const status = (await profile(profileRequests++))?.status ?? 200;
      return status === 200 ? answer(owner) : answer({ detail: "Internal Server Error" }, status);
    }
    if (path === `/auth/users/${owner.id}` && method === "PATCH") {
      if (sent.email !== owner.email) owner.email_verified = false;
      return answer(Object.assign(owner, sent));
    }
    if (path === "/auth/session" && method === "PUT")
      return answer({
        user: owner,
        session: session(owner),
        access_token: token(owner),
        refresh_token: refreshToken(owner),
      });
    if (path === `/auth/users/${owner.id}/email` && method === "POST") return answer(true);
    if (path.startsWith("/shop/coins/paypal/offers/") && method === "POST")
      return answer({ detail: "x" }, 503);
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
  /** What the edit page shows right now, and what it ever offered. */
  async function shown() {
    const { text, ...rest } = await page.evaluate(
      ([labels, dialogHeadings]) => {
        const box = document.querySelector("section.container-form");
        const value = (label) => {
          const found = [...(box?.querySelectorAll("label") ?? [])].find(
            (candidate) => candidate.textContent.trim() === label
          );
          return found ? (document.getElementById(found.getAttribute("for"))?.value ?? null) : null;
        };
        const form = box?.querySelector("form");
        return {
          text: box?.innerText ?? "",
          fields: form
            ? Object.fromEntries(labels.map(([key, label]) => [key, value(label)]))
            : null,
          buyer: form?.querySelector("button.scale-105")?.textContent.trim() ?? null,
          dialogs: [...document.querySelectorAll(dialogHeadings)].map((h) => h.textContent.trim()),
          ever: window.__seen,
        };
      },
      [inputs, dialogHeadings]
    );
    return {
      loading: text.includes(de.Moderation.Loading),
      failed: text.includes(de.Error.TryAgainLater),
      ...rest,
    };
  }
  return {
    context,
    page,
    calls,
    settled,
    shown,
    field: (label) => page.getByLabel(label, { exact: true }),
    profileRequests: () => count("GET", "/auth/users/me"),
    saved: () => calls.filter((c) => c.method === "PATCH").map((c) => c.body),
    foreign: () => foreign,
    picture: (name) =>
      evidence ? page.screenshot({ path: join(evidence, name), fullPage: true }) : null,
  };
}

const never = { form: false, missingEmail: false };
const waiting = {
  loading: true,
  failed: false,
  fields: null,
  buyer: null,
  dialogs: [],
  ever: never,
};
const editing = (user, dialogs = []) => ({
  loading: false,
  failed: false,
  fields: fieldsOf(user),
  buyer: user.business ? de.Headings.Business : de.Headings.Person,
  dialogs,
  ever: { form: true, missingEmail: dialogs.includes(de.Headings.MissingEmail) },
});
const box = (page) => page.locator("section.container-form");
const loadingNotice = (page) =>
  box(page).locator("[role=status]", { hasText: de.Moderation.Loading });
const form = (page) => box(page).locator("form");
const save = (page) => page.getByRole("button", { name: de.Buttons.Safe });
const done = async (name, f, more = {}) => {
  results.push({
    name,
    profileRequests: f.profileRequests(),
    saved: f.saved().length,
    foreignRequests: f.foreign(),
    ...more,
  });
  await f.context.close();
};

try {
  {
    // The profile request of the app start fails; the page's own request is answered late.
    const late = gate();
    const user = business();
    const f = await fixture([user], (n) => (n < 2 ? { status: 500 } : late.passed));
    await f.page.goto(app + edit);
    await loadingNotice(f.page).waitFor();
    assert.deepEqual(await f.shown(), waiting);
    // Two attempts of the app start (the client repeats a failed read once) and one of the page.
    await f.page.waitForTimeout(3000);
    assert.equal(f.profileRequests(), 3, "the page asks once and does not repeat it");
    assert.deepEqual(await f.shown(), waiting);
    await f.picture("profile-form-loading-390.png");
    late.open();
    await form(f.page).waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), editing(user));
    assert.equal(await f.field(de.Inputs.VAT_ID).inputValue(), user.vat_id);
    assert.equal(f.profileRequests(), 3);
    assert.deepEqual(f.saved(), []);
    await done("unloaded-then-business", f);
  }
  {
    // A slow API: the app start gives up waiting, and both requests are answered afterwards.
    const first = gate(),
      second = gate();
    const user = business();
    const f = await fixture([user], (n) => (n === 0 ? first.passed : second.passed));
    await f.page.goto(app + edit);
    await loadingNotice(f.page).waitFor();
    assert.deepEqual(await f.shown(), waiting);
    assert.equal(f.profileRequests(), 2, "one request of the app start, one of the page");
    first.open();
    await form(f.page).waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), editing(user));
    // The second answer carries the same profile and must not undo what is typed meanwhile.
    await f.field(de.Inputs.City).fill("Typed City");
    second.open();
    await f.settled();
    assert.deepEqual(await f.shown(), {
      ...editing(user),
      fields: { ...fieldsOf(user), city: "Typed City" },
    });
    assert.equal(f.profileRequests(), 2);
    assert.deepEqual(f.saved(), []);
    await done("late-profile-keeps-typing", f);
  }
  {
    // Session cookies without the `user` cookie: the state of the app start names nobody.
    const user = business();
    const f = await fixture([user], () => {}, { userCookie: false });
    await f.page.goto(app + edit);
    await form(f.page).waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), editing(user));
    assert.equal(f.profileRequests(), 2, "one request of the app start, one of the page");
    assert.deepEqual(f.saved(), []);
    await done("session-without-user-cookie", f);
  }
  {
    // Every profile request fails until the member tries again.
    let failing = true;
    const user = withoutEmail();
    const f = await fixture([user], () => (failing ? { status: 500 } : null));
    await f.page.goto(app + edit);
    const alert = box(f.page).locator("[role=alert]", { hasText: de.Error.TryAgainLater });
    await alert.waitFor();
    const notice = await f.page.locator("article[role=alert]").innerText();
    await f.settled();
    assert.deepEqual(await f.shown(), { ...waiting, loading: false, failed: true });
    assert.equal(f.profileRequests(), 4, "app start and page, each repeated once by the client");
    await f.page.waitForTimeout(2000);
    assert.equal(f.profileRequests(), 4, "no retry on its own");
    await f.picture("profile-form-failed-390.png");
    failing = false;
    await alert.getByRole("button", { name: de.Buttons.TryAgain }).click();
    await form(f.page).waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), editing(user, [de.Headings.MissingEmail]));
    assert.equal(f.profileRequests(), 5);
    assert.deepEqual(f.saved(), []);
    await done("failed-then-retry", f, { notice });
  }
  {
    // Loaded, opened from the coin order: saving sends every field and returns there.
    const user = privateBuyer();
    const f = await fixture([user]);
    await f.page.goto(app + edit + "?coins=500");
    await form(f.page).waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), editing(user));
    assert.equal(f.profileRequests(), 1, "a loaded profile is not requested again");
    await f.picture("profile-form-loaded-390.png");
    const expected = body({ ...user, city: "Vienna" });
    await f.field(de.Inputs.City).fill("Vienna");
    await save(f.page).click();
    await f.page.waitForURL(app + "/morphcoins/paypal?coins=500");
    assert.deepEqual(f.saved(), [expected]);
    assert.equal(f.profileRequests(), 1);
    await done("loaded-private-saves-and-returns", f);
  }
  {
    const user = business();
    const f = await fixture([user]);
    await f.page.goto(app + edit);
    await form(f.page).waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), editing(user));
    assert.equal(await f.field(de.Inputs.VAT_ID).inputValue(), user.vat_id);
    assert.equal(f.profileRequests(), 1);
    assert.deepEqual(f.saved(), []);
    await done("loaded-business", f);
  }
  {
    // Loaded without an address: the notice, then the new address with its verification request.
    const user = withoutEmail();
    const f = await fixture([user]);
    await f.page.goto(app + edit);
    await form(f.page).waitFor();
    await f.settled();
    assert.deepEqual(await f.shown(), editing(user, [de.Headings.MissingEmail]));
    assert.equal(f.profileRequests(), 1);
    await f.page.getByRole("button", { name: de.Buttons.Okay, exact: true }).click();
    const expected = body({ ...user, email: "new@example.invalid" });
    await f.field(de.Inputs.EmailAddress).fill("new@example.invalid");
    await save(f.page).click();
    await f.page.locator(dialogHeadings, { hasText: de.Headings.AddedEmail }).waitFor();
    await f.settled();
    assert.deepEqual(f.saved(), [expected]);
    assert.deepEqual(
      f.calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.path}`),
      [`PATCH /auth/users/${user.id}`, "PUT /auth/session", `POST /auth/users/${user.id}/email`]
    );
    await done("loaded-without-email-adds-address", f);
  }
  {
    // Another tab signs in a business account while the form is open with unsaved input.
    const first = privateBuyer(),
      second = business();
    const f = await fixture([first, second]);
    await f.page.goto(app + edit);
    await form(f.page).waitFor();
    await f.settled();
    await f.field(de.Inputs.Street).fill("Typed Street 3");
    await f.context.addCookies(cookies(second));
    await f.page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await f.page.waitForFunction(
      ([label, value]) =>
        [...document.querySelectorAll("section.container-form label")].some(
          (candidate) =>
            candidate.textContent.trim() === label &&
            document.getElementById(candidate.getAttribute("for"))?.value === value
        ),
      [de.Inputs.Nickname, second.name]
    );
    await f.settled();
    assert.deepEqual(await f.shown(), editing(second));
    assert.deepEqual(
      f.calls.filter((c) => c.path === "/auth/users/me").map((c) => c.owner),
      [first.name, second.name]
    );
    assert.deepEqual(f.saved(), []);
    await done("account-changed-in-another-tab", f);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, app, syntheticAPI: api, results }));
} finally {
  await browser.close();
}
