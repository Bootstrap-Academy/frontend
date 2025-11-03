import { test, expect } from "@playwright/test";

test.describe("Cookie-Dialog", () => {
  test("erscheint, lässt sich bestätigen und bleibt weg; auf /docs/privacy nie sichtbar", async ({
    page,
  }) => {
    // Start ohne Cookie -> Dialog sichtbar
    await page.goto("/"); // baseURL aus config

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Fokus-Trap prüfen (Tab wechselt zwischen Link und Button)
    const link = dialog.getByRole("link", { name: /datenschutzerklärung/i });
    const btn = dialog.getByRole("button", { name: /okay ich verstehe/i });

    await expect(link).toBeVisible();
    await expect(btn).toBeVisible();

    await link.focus();
    await expect(link).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(btn).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();

    // Bestätigungs-Button klicken, Dialog verschwindet
    await expect(btn).toBeEnabled();
    await btn.click();
    // Modal wird via v-if entfernt > Count=0
    await expect(dialog).toHaveCount(0);

    // prüfen, dass das Cookie gesetzt wurde
    await expect
      .poll(() => page.evaluate(() => document.cookie.includes("agreedToCookiePolicy=true")))
      .toBe(true);

    // Refresh: Dialog bleibt weg
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // auf /docs/privacy: Dialog nie sichtbar
    await page.goto("/docs/privacy");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
