/**
 * Mounted Nuxt UI with a synthetic API; every other origin is blocked. Nothing reaches GitHub.
 *
 * The feedback dialog on a page, at 390 × 844 and 1280 × 800. Its backdrop darkens the page with
 * the site's navy over the whole window. A dialog opened again starts at the top of its form,
 * where the focus lands: after scrolling to the end of the form and closing, the next opening
 * shows the title field, focused and inside the visible part of the dialog. A send whose outcome
 * stays open (the API answers 503) locks the form; opened again, the dialog shows its alert and
 * "Status prüfen" instead of the top.
 *
 * Build this checkout (`nuxt build`) and serve it on FEEDBACK_DIALOG_APP with
 * NUXT_PUBLIC_BASE_API_URL=FEEDBACK_DIALOG_API, then run
 *   PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/feedback-dialog.browser.mjs
 * FEEDBACK_DIALOG_EVIDENCE_DIR keeps a picture of every state.
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.FEEDBACK_DIALOG_APP || "http://127.0.0.1:58895";
const api = process.env.FEEDBACK_DIALOG_API || "http://127.0.0.1:58896";
const evidence = process.env.FEEDBACK_DIALOG_EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/run/current-system/sw/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-background-networking"],
});

/** The alpha of a computed colour: `rgba(…)`, `rgb(… / a)` or `color(srgb … / a)`. */
function alpha(color) {
  if (color === "transparent") return 0;
  const slash = color.match(/\/\s*([\d.]+)(%?)\s*\)$/);
  if (slash) return Number(slash[1]) / (slash[2] ? 100 : 1);
  const rgba = color.match(/^rgba\(([^)]+)\)$/);
  return rgba ? Number(rgba[1].split(",")[3]) : 1;
}

/** The red, green and blue of a computed colour or a hex value, 0 to 255. */
function channels(color) {
  const hex = color.trim().match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (hex) return hex.slice(1).map((part) => parseInt(part, 16));
  const srgb = color.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);
  if (srgb) return srgb.slice(1).map((part) => Math.round(Number(part) * 255));
  return color
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number);
}

async function dialogAt([width, height]) {
  const label = `${width}x${height}`;
  const context = await browser.newContext({
    viewport: { width, height },
    locale: "de-DE",
    reducedMotion: "reduce",
  });
  await context.addCookies([{ name: "locale", value: "de", url: app }]);
  const errors = [];
  const foreign = [];
  let sends = 0;
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === app) return route.continue();
    if (url.origin === api) {
      const sent = url.pathname === "/feedback" && route.request().method() === "POST";
      if (sent) sends++;
      // A send whose outcome stays open: the form keeps the draft and locks.
      return route.fulfill({
        status: sent ? 503 : 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": app,
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
        body: "{}",
      });
    }
    foreign.push(url.origin);
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  const picture = async (name) => {
    if (evidence) await page.screenshot({ path: join(evidence, `${label}-${name}.png`) });
  };
  try {
    await page.goto(`${app}/docs/imprint`);
    const open = page.locator(".feedback-open");
    const dialog = page.getByRole("dialog", { name: "Feedback zur Bootstrap Academy" });
    await open.click();
    await dialog.waitFor();

    // The backdrop has a colour of its own and covers the whole window.
    const backdrop = await page
      .locator('.feedback-dialog div.fixed.inset-0[aria-hidden="true"]')
      .evaluate((element) => {
        const box = element.getBoundingClientRect();
        return {
          color: getComputedStyle(element).backgroundColor,
          // The site's navy, the page's own background.
          navy: getComputedStyle(document.documentElement).getPropertyValue("--color-primary"),
          covers:
            box.left <= 0 && box.top <= 0 && box.right >= innerWidth && box.bottom >= innerHeight,
        };
      });
    await picture("1-open");

    // To the end of the form, close there, open again.
    const body = page.locator(".feedback-panel > .overflow-y-auto");
    await body.evaluate((element) =>
      element.scrollTo({ top: element.scrollHeight, behavior: "instant" })
    );
    assert.ok(
      await body.evaluate((element) => element.scrollTop > 0),
      `${label}: the form scrolls`
    );
    await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await open.click();
    await dialog.waitFor();
    await page.waitForFunction(() =>
      document.activeElement?.matches(".feedback-dialog input[type=text]")
    );
    const view = await body.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const field = document.activeElement.getBoundingClientRect();
      return {
        scrollTop: element.scrollTop,
        focusedInView: field.top >= box.top && field.bottom <= box.bottom,
      };
    });
    await picture("2-opened-again");

    // A send whose outcome stays open locks the form with an alert and "Status prüfen" at its
    // end. Scrolled to the top, closed and opened again, both are in view.
    await dialog.getByLabel("Titel", { exact: true }).fill("Ein Knopf fehlt");
    await dialog.getByLabel("Was ist passiert?").fill("Synthetisch, ohne echte Daten.");
    await dialog.getByRole("button", { name: "Öffentlich melden" }).click();
    const check = dialog.getByRole("button", { name: "Status prüfen" });
    await check.waitFor();
    await body.evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
    await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await open.click();
    await dialog.waitFor();
    const locked = await body.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const inView = (node) => {
        const rect = node.getBoundingClientRect();
        return rect.top >= box.top && rect.bottom <= box.bottom;
      };
      const action = [...element.querySelectorAll("button")].find(
        (button) => button.textContent.trim() === "Status prüfen"
      );
      return {
        disabled: element.querySelector("fieldset").disabled,
        alertInView: inView(element.querySelector('[role="alert"]')),
        actionInView: inView(action),
      };
    });
    await picture("3-locked-opened-again");

    // Every finding is measured before any is judged.
    const found = { backdrop: backdrop.color, ...view, locked, sends };
    try {
      assert.equal(backdrop.covers, true, `${label}: the backdrop covers the window`);
      assert.ok(alpha(backdrop.color) >= 0.5, `${label}: the page clearly recedes`);
      assert.ok(
        channels(backdrop.color).every((value, index) => value <= channels(backdrop.navy)[index]),
        `${label}: the backdrop darkens with the site's navy`
      );
      assert.equal(view.focusedInView, true, `${label}: the focused title field is in view`);
      assert.equal(view.scrollTop, 0, `${label}: the form starts at the top`);
      assert.equal(locked.disabled, true, `${label}: the open send locks the form`);
      assert.equal(locked.alertInView, true, `${label}: the alert is in view`);
      assert.equal(locked.actionInView, true, `${label}: "Status prüfen" is in view`);
      assert.equal(sends, 1, `${label}: one send, no retry by itself`);
      assert.deepEqual(errors, [], `${label}: page errors`);
      assert.deepEqual(foreign, [], `${label}: foreign requests`);
    } catch (error) {
      error.message += ` (found: ${JSON.stringify(found)})`;
      throw error;
    }
    return { case: label, passed: true, ...found };
  } finally {
    await context.close();
  }
}

const results = [];
const failures = [];
for (const size of [
  [390, 844],
  [1280, 800],
])
  try {
    results.push(await dialogAt(size));
  } catch (error) {
    failures.push(error.message);
    results.push({ case: size.join("x"), passed: false, error: error.message });
  }
await browser.close();
console.log(JSON.stringify({ results }, null, 2));
assert.deepEqual(failures, []);
