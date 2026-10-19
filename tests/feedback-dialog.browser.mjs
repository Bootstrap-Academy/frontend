/**
 * Mounted Nuxt UI with a synthetic API; every other origin is blocked. Nothing is sent.
 *
 * The feedback dialog on a page, at 390 × 844 and 1280 × 800. Its backdrop dims the page over the
 * whole window. A dialog opened again starts at the top of its form, where the focus lands: after
 * scrolling to the end of the form and closing, the next opening shows the title field, focused
 * and inside the visible part of the dialog.
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
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === app) return route.continue();
    if (url.origin === api)
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": app },
        body: "{}",
      });
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

    // Both findings are measured before either is judged.
    const found = { backdrop: backdrop.color, ...view };
    try {
      assert.equal(backdrop.covers, true, `${label}: the backdrop covers the window`);
      assert.ok(alpha(backdrop.color) >= 0.3, `${label}: the backdrop dims the page`);
      assert.equal(view.focusedInView, true, `${label}: the focused title field is in view`);
      assert.equal(view.scrollTop, 0, `${label}: the form starts at the top`);
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
    failures.push(`${size.join("x")}: ${error.message}`);
    results.push({ case: size.join("x"), passed: false, error: error.message });
  }
await browser.close();
console.log(JSON.stringify({ results }, null, 2));
assert.deepEqual(failures, []);
