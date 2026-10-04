// Keyboard, label and contrast regression for the toggles, the sort select, chips and the navbar
// heart counter on the leaderboard, premium page, course catalogue, profile editing and dev
// palette, at 390 and 1280 px in DE and EN. Serve a local build (`bash build.sh`, SPA fallback to 200.html), then:
//   A11Y_APP=http://127.0.0.1:58893 AXE_SOURCE=axe.min.js PLAYWRIGHT_MODULE=… node tests/a11y-controls.browser.mjs
// All API calls are answered by synthetic fixtures; writes and other hosts are blocked.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tabTo } from "./a11y-navigation.browser.mjs";

// Rules this regression owns; other axe findings are recorded, not asserted.
const RULES = ["button-name", "color-contrast", "label", "nested-interactive", "select-name"];

const user = {
  id: "a11y-fixture",
  name: "LocalFixture",
  display_name: "Local fixture",
  email: "fixture@example.invalid",
  email_verified: true,
  terms_version: "2026-09-r4",
  age_confirmed: true,
  tags: ["python", "vue", "rust", "sql", "docker", "linux"],
  admin: false,
  description: "",
  leaderboard_opt_out: false,
};
const board = {
  total: 3,
  leaderboard: [1, 2, 3].map((rank) => ({
    user: { id: `learner-${rank}`, display_name: `Learner ${rank}` },
    rank,
    score: 100 - rank,
  })),
};
const course = (id, title, extra) => ({
  id,
  title,
  description: `${title} fixture`,
  sections: [{ lectures: [{ id: `${id}-lecture` }] }],
  ...extra,
});
const courses = [
  course("free-1", "Free course", { price: 0, completed: false }),
  course("free-2", "Second free course", { price: 0, completed: false }),
  course("done", "Completed course", { price: 0, completed: true }),
  course("paid", "Paid course", { price: 500, completed: false }),
];

function fixture(url) {
  const path = url.pathname;
  if (path === "/auth/users/me") return user;
  if (path === "/shop/learning/policy")
    return { mode: "legacy", premium: true, heart_sales: true, single_course_sales: true };
  if (path === "/shop/coins/config") return { coins_per_euro: 100, vat_percent: 19 };
  if (path === "/shop/hearts/config") return { hearts_max: 6, hearts_refill_price: 50 };
  if (path === "/shop/premium_plans")
    return { MONTHLY: { price: 1000, months: 1 }, YEARLY: { price: 10000, months: 12 } };
  if (path === `/shop/coins/${user.id}`) return { coins: 50000 };
  if (path === `/shop/hearts/${user.id}`) return { hearts: 6 };
  if (path === `/shop/premium/${user.id}`)
    return { premium: false, since: null, until: null, autopay: null };
  if (path === "/challenges/executor/environments") return { python: {}, rust: {} };
  if (path.startsWith("/challenges/leaderboard")) return board;
  if (path === "/challenges/categories") return [{ id: "category-1" }];
  if (path === "/challenges/categories/category-1/challenges")
    return [{ id: "challenge-1", description: "Local challenge" }];
  if (path === "/skills/courses") return courses;
  return null;
}

// Toggle colors and the focus outline fade for 300 ms; measure the settled state.
const settled = (page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => !(a instanceof CSSTransition) || a.playState !== "running")
  );

async function audit(page, axe, scope) {
  await settled(page);
  await page.evaluate(axe);
  return page.evaluate(async (scope) => {
    // Pages without a main landmark (profile editing) are audited as a whole.
    const context = scope && document.querySelector(scope) ? { include: [scope] } : document;
    const r = await window.axe.run(context, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => n.target.join(" ")),
      nodes: v.nodes.map((n) => ({ html: n.html.slice(0, 200), summary: n.failureSummary })),
    }));
  }, scope);
}

/** Contrast of every chip's own text and background as the browser renders them. */
function chipContrast(page, selector) {
  return page.$$eval(selector, (chips) => {
    const channel = (c) => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (rgb) => {
      const [r, g, b] = rgb.match(/[\d.]+/g).map(Number);
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    return chips.map((chip) => {
      const style = getComputedStyle(chip);
      const [a, b] = [luminance(style.color), luminance(style.backgroundColor)].sort(
        (x, y) => y - x
      );
      return {
        text: chip.innerText.trim(),
        className: chip.className,
        color: style.color,
        background: style.backgroundColor,
        ratio: Math.floor(((a + 0.05) / (b + 0.05)) * 100) / 100,
      };
    });
  });
}

async function focusRing(page) {
  await settled(page);
  return page.evaluate(() => {
    const e = document.activeElement;
    const style = getComputedStyle(e);
    return {
      tag: e.tagName,
      focusVisible: e.matches(":focus-visible"),
      outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
    };
  });
}

function visibleRing(ring, tag = "BUTTON") {
  assert.equal(ring.tag, tag);
  assert.equal(ring.focusVisible, true);
  assert.equal(
    ring.outline,
    "solid 2px rgb(12, 201, 171)",
    "Keyboard focus shows the accent outline"
  );
}

async function pressed(locator) {
  return locator.getAttribute("aria-pressed");
}

export async function leaderboard(page, t) {
  await page.goto("/challenges/leader-board", { waitUntil: "networkidle" });
  const group = page.getByRole("group", { name: t("Headings.LeaderBoard"), exact: true });
  const option = (key) => group.getByRole("button", { name: t(key), exact: true });
  const [language, challenge, overall] = [
    "Buttons.LanguageBased",
    "Buttons.ChallengeBased",
    "Buttons.Overall",
  ].map(option);
  await tabTo(page, overall);
  const ring = await focusRing(page);
  visibleRing(ring);
  assert.equal(await pressed(overall), "false");
  const overallRequest = page.waitForRequest(
    (r) => new URL(r.url()).pathname === "/challenges/leaderboard"
  );
  await page.keyboard.press("Enter");
  await overallRequest;
  assert.equal(await pressed(overall), "true");
  assert.equal(await pressed(language), "false");
  await page.getByText("Learner 1").first().waitFor();
  await page.keyboard.press("Shift+Tab");
  assert.equal(await challenge.evaluate((e) => e === document.activeElement), true);
  await page.keyboard.press("Space");
  assert.equal(await pressed(challenge), "true");
  await page.getByText("Local challenge").waitFor();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  assert.equal(await pressed(language), "true");
  const select = page.getByRole("combobox", { name: t("LearningRooms.Language"), exact: true });
  await select.waitFor();
  return { ring, enter: true, shiftTab: true, space: true, languageSelectNamed: true };
}

// The navbar heart counter is one named link to the hearts page; the drawn hearts are decorative.
export async function hearts(page, t, axe) {
  await page.goto("/challenges/leader-board", { waitUntil: "networkidle" });
  const name = t("Navigation.Hearts").replace("{hearts}", "3").replace("{max}", "3");
  const link = page.getByRole("link", { name, exact: true });
  await tabTo(page, link);
  const ring = await focusRing(page);
  visibleRing(ring, "A");
  const inner = await link.evaluate((e) => e.querySelectorAll("a, button, [tabindex]").length);
  assert.equal(inner, 0, "no focusable element inside the counter");
  const navbar = (await audit(page, axe, "section.container-fluid")).filter((v) =>
    [...RULES, "link-name", "target-size"].includes(v.id)
  );
  assert.deepEqual(navbar, [], JSON.stringify(navbar));
  await page.keyboard.press("Enter");
  await page.waitForURL("**/subscription");
  return { ring, name, enter: true, navbar };
}

export async function subscription(page, t) {
  await page.goto("/subscription", { waitUntil: "networkidle" });
  const monthly = page.getByRole("button", { name: t("Buttons.Monthly"), exact: true });
  const yearly = page.getByRole("button", { name: t("Buttons.Yearly"), exact: true });
  assert.equal(await pressed(monthly), "true");
  await tabTo(page, yearly);
  const ring = await focusRing(page);
  visibleRing(ring);
  await page.keyboard.press("Space");
  assert.equal(await pressed(yearly), "true");
  assert.equal(await pressed(monthly), "false");
  await page.keyboard.press("Shift+Tab");
  assert.equal(await monthly.evaluate((e) => e === document.activeElement), true);
  await page.keyboard.press("Enter");
  assert.equal(await pressed(monthly), "true");
  return { ring, space: true, shiftTab: true, enter: true };
}

export async function catalogue(page, t) {
  await page.goto("/profile/courses", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Completed course", exact: true }).waitFor();
  const caption = page.getByText(t("Headings.SortBy"), { exact: true });
  const select = page.getByRole("combobox", { name: t("Headings.SortBy"), exact: true });
  const layout = await caption.evaluate((e) => {
    const s = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const box = e.nextElementSibling.querySelector("select").getBoundingClientRect();
    return {
      tag: e.tagName,
      font: `${s.fontWeight} ${s.fontSize}/${s.lineHeight} ${s.fontFamily}`,
      color: s.color,
      caption: [r.x, r.y, r.width, r.height].map(Math.round),
      select: [box.x, box.y, box.width, box.height].map(Math.round),
    };
  });
  const chips = await chipContrast(page, "main .card-sm > div.xs");
  const free = t("Headings.Free").toUpperCase();
  const done = t("Headings.Completed").toUpperCase();
  assert.deepEqual(
    [...new Set(chips.map((c) => c.text.toUpperCase()))].sort(),
    [done, free].sort()
  );
  await caption.click();
  assert.equal(
    await select.evaluate((e) => e === document.activeElement),
    true,
    "The caption focuses the select"
  );
  await page.keyboard.press("Shift+Tab");
  await tabTo(page, select);
  assert.equal(await select.inputValue(), "lastSeen");
  const sorted = page.waitForRequest((r) => {
    const url = new URL(r.url());
    return url.pathname === "/skills/courses" && !url.search;
  });
  await page.keyboard.press("ArrowUp");
  await sorted;
  assert.equal(await select.inputValue(), "free");
  await page.getByRole("heading", { name: "Free course", exact: true }).waitFor();
  return { layout, keyboardSort: true, chips };
}

export async function profileEdit(page) {
  await page.goto("/profile/edit", { waitUntil: "networkidle" });
  await page.getByText("python", { exact: true }).waitFor();
  const chips = await chipContrast(page, "[class*='chip-color-']");
  assert.ok(chips.length >= user.tags.length);
  return { chips };
}

export async function palette(page) {
  await page.goto("/dev/elements", { waitUntil: "networkidle" });
  const chips = await chipContrast(page, "[class*='chip-color-']");
  assert.ok(chips.length >= 12);
  return { chips };
}

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const app = process.env.A11Y_APP || "http://127.0.0.1:58893";
  assert(
    ["localhost", "127.0.0.1"].includes(new URL(app).hostname),
    "Local fixtures never run against live sites"
  );
  const out = resolve(process.env.A11Y_OUTPUT || "/tmp/academy-a11y-controls");
  const axe = await readFile(process.env.AXE_SOURCE, "utf8");
  const messages = {
    de: JSON.parse(await readFile(new URL("../locales/de.json", import.meta.url), "utf8")),
    en: JSON.parse(await readFile(new URL("../locales/en-US.json", import.meta.url), "utf8")),
  };
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || "/run/current-system/sw/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const token = `header.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 7200 })).toString("base64url")}.synthetic`;
  const pages = { leaderboard, hearts, subscription, catalogue, profileEdit, palette };
  const result = { app, chromium: browser.version(), cases: [], failures: [], unknownApi: [] };
  try {
    for (const width of [390, 1280]) {
      for (const language of ["de", "en"]) {
        const t = (key) => key.split(".").reduce((o, k) => o?.[k], messages[language]) ?? key;
        for (const [name, run] of Object.entries(pages)) {
          const context = await browser.newContext({
            baseURL: app,
            viewport: { width, height: 844 },
            reducedMotion: "reduce",
            serviceWorkers: "block",
          });
          const values = {
            locale: language === "de" ? "de" : "en-US",
            user: { id: user.id, name: user.name, display_name: user.display_name },
            session: { id: "a11y-session" },
            accessToken: token,
            refreshToken: "synthetic-refresh",
          };
          await context.addCookies(
            Object.entries(values).map(([key, value]) => ({
              name: key,
              value: encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value)),
              url: app,
            }))
          );
          const writes = [];
          await context.route("**/*", async (route) => {
            const request = route.request();
            const url = new URL(request.url());
            if (url.origin === app) return route.continue();
            if (!url.hostname.endsWith("bootstrap.academy")) return route.abort();
            if (request.method() === "OPTIONS") return route.fulfill({ status: 204 });
            if (!["GET", "HEAD"].includes(request.method())) {
              writes.push(`${request.method()} ${url.pathname}`);
              return route.abort();
            }
            const json = fixture(url);
            if (json === null) result.unknownApi.push(url.pathname);
            return route.fulfill({ json: json ?? {} });
          });
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          const entry = { page: name, width, language };
          try {
            entry.checks = await run(page, t, axe);
            // The whole page is recorded; the owned rules are asserted for the page content.
            entry.axe = await audit(page, axe);
            entry.mainAxe = await audit(page, axe, "main");
            const owned = entry.mainAxe.filter((v) => RULES.includes(v.id));
            assert.deepEqual(owned, [], `${name}: ${JSON.stringify(owned)}`);
            for (const chip of entry.checks.chips ?? [])
              assert.ok(chip.ratio >= 4.5, `${name}: ${JSON.stringify(chip)}`);
            assert.deepEqual(errors, []);
            assert.deepEqual(writes, []);
          } catch (error) {
            entry.axe ??= await audit(page, axe).catch(() => null);
            result.failures.push({ page: name, width, language, error: error.message });
          }
          entry.errors = errors;
          entry.writes = writes;
          await page.screenshot({
            path: resolve(out, `${name}-${width}-${language}.png`),
            fullPage: false,
          });
          result.cases.push(entry);
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
    result.unknownApi = [...new Set(result.unknownApi)].sort();
    await writeFile(resolve(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
  }
  console.log(JSON.stringify({ cases: result.cases.length, failures: result.failures.length }));
  assert.deepEqual(result.failures, []);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
