import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function tabTo(page, target) {
  for (let i = 0; i < 80; i++) {
    if (await target.evaluate((e) => e === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("Control was not reachable with Tab");
}

export async function verifyNavigation(page, width, language) {
  const html = page.locator("html");
  await page.waitForFunction((lang) => document.documentElement.lang === lang, language);
  const other = language === "de" ? "en" : "de";
  const languageButton = page.getByRole("button", {
    name: other === "de" ? "Deutsch" : "English",
    exact: true,
  });
  await tabTo(page, languageButton);
  await page.keyboard.press("Enter");
  await page.waitForFunction((lang) => document.documentElement.lang === lang, other);
  assert.equal(await languageButton.getAttribute("aria-pressed"), "true");
  const originalLanguage = page.getByRole("button", {
    name: language === "de" ? "Deutsch" : "English",
    exact: true,
  });
  await tabTo(page, originalLanguage);
  await page.keyboard.press("Space");
  await page.waitForFunction((lang) => document.documentElement.lang === lang, language);
  assert.equal(await originalLanguage.getAttribute("aria-pressed"), "true");
  assert.equal(await html.getAttribute("lang"), language);

  const opener = page.getByRole("button", {
    name: language === "de" ? "Menü öffnen" : "Open menu",
    exact: true,
    includeHidden: true,
  });
  if (width >= 1024) {
    assert.equal(await opener.isVisible(), false, "Mobile control is hidden on desktop");
    return { languageSwitch: true, desktopNavigation: true };
  }
  const closeName = language === "de" ? "Menü schließen" : "Close menu";
  const dialog = page.getByRole("dialog", {
    name: language === "de" ? "Hauptmenü" : "Main menu",
    exact: true,
  });
  for (const activation of ["Enter", "Space"]) {
    await tabTo(page, opener);
    assert.equal(await opener.getAttribute("aria-expanded"), "false");
    await page.keyboard.press(activation);
    await dialog.waitFor({ state: "visible" });
    assert.equal(await opener.getAttribute("aria-expanded"), "true");
    assert.equal(await opener.getAttribute("aria-controls"), await dialog.getAttribute("id"));
    await page.waitForFunction(
      (name) => document.activeElement?.getAttribute("aria-label") === name,
      closeName
    );
    assert.equal(await page.locator("#__nuxt").evaluate((e) => e.inert), true);
    for (const key of ["Tab", "Shift+Tab"]) {
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press(key);
        assert.equal(
          await dialog.evaluate((e) => e.contains(document.activeElement)),
          true,
          "Focus stays inside the menu"
        );
        assert.equal(
          await page.evaluate(() => {
            const e = document.activeElement;
            const r = e.getBoundingClientRect();
            const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return e === top || e.contains(top);
          }),
          true,
          "Focused control is visible and unobscured"
        );
      }
    }
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(() => !document.querySelector("#__nuxt").inert);
    assert.equal(
      await opener.evaluate((e) => e === document.activeElement),
      true,
      "Escape restores focus to the opener"
    );
  }
  await page.keyboard.press("Enter");
  await dialog.waitFor({ state: "visible" });
  await page.keyboard.press("Enter");
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    await opener.evaluate((e) => e === document.activeElement),
    true,
    "Close button restores focus"
  );
  await page.keyboard.press("Enter");
  await dialog.waitFor({ state: "visible" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    await page.locator("#__nuxt").evaluate((e) => e.inert),
    false,
    "Resize releases the background"
  );
  await page.setViewportSize({ width, height: 844 });
  return {
    languageSwitch: true,
    enterAndSpace: true,
    focusTrap: true,
    escapeAndClose: true,
    resize: true,
  };
}

async function main() {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
  const app = process.env.A11Y_APP || "http://127.0.0.1:58891";
  assert(
    ["localhost", "127.0.0.1"].includes(new URL(app).hostname),
    "Local fixtures never run against live sites"
  );
  const out = resolve(process.env.A11Y_OUTPUT || "/tmp/academy-a11y-navigation");
  const axe = await readFile(process.env.AXE_SOURCE, "utf8");
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || "/run/current-system/sw/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const result = { cases: [], errors: [] };
  const user = {
    id: "a11y-fixture",
    name: "LocalFixture",
    display_name: "Local fixture",
    email: "fixture@example.invalid",
    email_verified: true,
    terms_version: "2026-09-r4",
    age_confirmed: true,
    tags: [],
    admin: false,
  };
  const token = `header.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 7200 })).toString("base64url")}.synthetic`;
  try {
    for (const width of [390, 1280]) {
      for (const language of ["de", "en"]) {
        const context = await browser.newContext({
          viewport: { width, height: 844 },
          reducedMotion: "reduce",
          serviceWorkers: "block",
        });
        const values = {
          locale: language === "de" ? "de" : "en-US",
          user,
          session: { id: "a11y-session" },
          accessToken: token,
          refreshToken: "synthetic-refresh",
        };
        await context.addCookies(
          Object.entries(values).map(([name, value]) => ({
            name,
            value: encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value)),
            url: app,
          }))
        );
        await context.route("**/*", async (route) => {
          const url = new URL(route.request().url());
          if (url.origin === app) return route.continue();
          if (!["GET", "HEAD", "OPTIONS"].includes(route.request().method())) return route.abort();
          if (!url.hostname.endsWith("bootstrap.academy")) return route.abort();
          let json = {};
          if (url.pathname === "/auth/users/me") json = user;
          else if (url.pathname === "/shop/learning/policy")
            json = { mode: "legacy", premium: true, heart_sales: true, single_course_sales: true };
          else if (url.pathname === "/shop/premium/a11y-fixture")
            json = { premium: true, since: 1700000000, until: 2000000000, autopay: null };
          else if (url.pathname === "/shop/hearts/a11y-fixture") json = { hearts: 6 };
          else if (url.pathname === "/shop/coins/a11y-fixture") json = { coins: 1000 };
          else if (url.pathname === "/skills/courses/a11y-course")
            json = {
              id: "a11y-course",
              title: "Local course",
              description: "Local course fixture",
              price: 0,
              sections: [],
              requirements: [],
              learning_goals: [],
            };
          else if (url.pathname.includes("unrated")) json = [];
          return route.fulfill({ json });
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => result.errors.push(error.message));
        await page.goto(`${app}/courses/a11y-course`, { waitUntil: "networkidle" });
        assert.equal(await page.locator("main h1").textContent(), "Local course");
        const navigation = await verifyNavigation(page, width, language);
        await page.evaluate(axe);
        const audit = await page.evaluate(async () => {
          const r = await window.axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
          });
          return {
            violations: r.violations.map((v) => ({
              id: v.id,
              targets: v.nodes.map((n) => n.target),
            })),
          };
        });
        assert.equal(
          audit.violations.some((v) => v.id === "html-has-lang"),
          false
        );
        await page.goto(`${app}/docs/privacy`, { waitUntil: "networkidle" });
        assert.equal(await page.locator("html").getAttribute("lang"), language);
        assert.equal(await page.locator("main").getAttribute("lang"), "de");
        await page.screenshot({ path: resolve(out, `privacy-${width}-${language}.png`) });
        result.cases.push({ width, language, navigation, legalLanguage: true, axe: audit });
        await context.close();
      }
    }
    assert.deepEqual(result.errors, []);
  } finally {
    await browser.close();
    await writeFile(resolve(out, "result.json"), JSON.stringify(result, null, 2) + "\n");
  }
  console.log(JSON.stringify({ cases: result.cases.length, pageErrors: result.errors.length }));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
