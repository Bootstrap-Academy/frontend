/** Mounted Nuxt UI, synthetic API only. Every unrelated network origin is blocked. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.PUBLICATION_TEST_APP || "http://127.0.0.1:58611";
const api = process.env.PUBLICATION_TEST_API || "http://127.0.0.1:58613";
const out = process.env.PUBLICATION_TEST_OUTPUT || "/tmp/academy-publication-browser";
const disabled = process.env.PUBLICATION_TEST_DISABLED === "true";
await mkdir(out, { recursive: true });
const locales = {};
for (const locale of ["de", "en-US"])
  locales[locale] = JSON.parse(
    await readFile(new URL(`../locales/${locale}.json`, import.meta.url))
  );
const scope = "academy-verified-v1";
const notice =
  locales.de.ProfilePublication.Notice + "\n" + locales["en-US"].ProfilePublication.Notice;
const hash = "07434654b73f77ea6d552365142d459125f6d13e734c6a84bfa141cc9090a0a5";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/run/current-system/sw/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-background-networking"],
});
const results = [],
  errors = [];
const uid = (owner) => `11000000-0000-4000-8000-00000000000${owner === "A" ? 1 : 2}`;
const user = (owner) => ({
  id: uid(owner),
  name: `Synthetic${owner}`,
  display_name: `Synthetic ${owner}`,
  email: `synthetic-${owner.toLowerCase()}@example.invalid`,
  email_verified: true,
  description: "PRIVATE_BIO_MARKER",
  tags: ["PRIVATE_TAG_MARKER"],
  admin: false,
  business: false,
  enabled: true,
  leaderboard_opt_out: false,
  first_name: "",
  last_name: "",
  street: "",
  country: "",
  city: "",
  zip_code: "",
  terms_version: "2026-09-r4",
  age_confirmed: true,
});
const token = (owner) =>
  `e30.${Buffer.from(JSON.stringify({ owner, sub: uid(owner), exp: 4102444800 })).toString("base64url")}.synthetic`;
const choice = (visibility = "private", revision = 0) => ({
  profile_visibility: visibility,
  visibility_revision: revision,
});

async function fixture(width, locale) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: "reduce",
  });
  const settings = { A: choice(), B: choice() },
    receipts = new Map(),
    writes = [],
    paths = [];
  let mode = "normal",
    rankMode = "legacy",
    epoch = 1;
  async function cookies(owner) {
    const values = {
      locale,
      user: { id: uid(owner), name: user(owner).name, display_name: user(owner).display_name },
      session: { id: `publication-session-${owner}` },
      accessToken: token(owner),
      refreshToken: `synthetic-refresh-${owner}`,
      authGeneration: `generation-${owner}-${Date.now()}`,
    };
    await context.addCookies(
      Object.entries(values).map(([name, value]) => ({
        name,
        value: encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value)),
        url: app,
      }))
    );
  }
  await cookies("A");
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.origin === app) {
      // Exercise the same compiled assets with only the public feature flag
      // enabled in this isolated synthetic fixture. Published files stay off.
      if (process.env.PUBLICATION_TEST_ENABLE_FROM_BUILD === "true" && req.isNavigationRequest()) {
        const response = await route.fetch();
        const html = await response.text();
        assert.ok(html.includes("profilePublicationEnabled:false"));
        return route.fulfill({
          response,
          body: html.replace("profilePublicationEnabled:false", "profilePublicationEnabled:true"),
        });
      }
      return route.continue();
    }
    if (url.protocol === "data:") return route.continue();
    if (url.origin !== api) return route.abort();
    const path = url.pathname,
      method = req.method();
    paths.push({ path, method });
    const owner = req.headers().authorization?.includes(token("B")) ? "B" : "A";
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    const answer = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
        headers: { "cache-control": "private, no-store" },
      });
    if (path === "/auth/users/me") return answer(user(owner));
    if (path === `/auth/users/${uid(owner)}` && method === "PATCH") {
      writes.push({ kind: "profile", body });
      return answer({ ...user(owner), ...body });
    }
    if (path === "/auth/users/me/publication") {
      if (method === "GET") {
        if (mode === "read503") return answer({ detail: "publication_unavailable" }, 503);
        return answer(settings[owner]);
      }
      writes.push({ kind: "publication", body });
      if (["401", "409", "503"].includes(mode)) {
        if (mode === "409")
          settings[owner] = choice("private", settings[owner].visibility_revision + 2);
        return answer({ detail: "publication_conflict" }, Number(mode));
      }
      if (receipts.has(body.request_id))
        return answer({
          current: settings[owner],
          receipt: receipts.get(body.request_id),
          replayed: true,
        });
      if (body.expected_revision !== settings[owner].visibility_revision)
        return answer({ detail: "publication_conflict" }, 409);
      settings[owner] = choice(body.profile_visibility, body.expected_revision + 1);
      epoch++;
      receipts.set(body.request_id, { ...settings[owner], request_id: body.request_id });
      if (mode === "lost") return route.abort("connectionreset");
      return answer({
        current: settings[owner],
        receipt: receipts.get(body.request_id),
        replayed: false,
      });
    }
    if (path === "/auth/users/me/publication-preview")
      return answer({
        profile: { user_id: uid(owner), display_name: user(owner).display_name, avatar_url: null },
        publication: settings[owner],
        scope_version: scope,
        notice_hash: hash,
        notice,
        preview_token: `synthetic-preview-${owner}-${settings[owner].visibility_revision}`,
      });
    if (path === "/skills/xp/me")
      return answer({ total_xp: 120, skills: [{ name: "PRIVATE_SKILL_MARKER", xp: 999 }] });
    if (path === "/challenges/environments") return answer({ python: {} });
    if (path.startsWith("/challenges/leaderboard")) {
      if (rankMode === "503") return answer({ error: "leaderboard_unavailable" }, 503);
      const revision = epoch;
      if (
        url.searchParams.has("publication_epoch") &&
        url.searchParams.get("publication_epoch") !==
          `22000000-0000-4000-8000-${String(epoch).padStart(12, "0")}`
      )
        return answer({ error: "publication_changed" }, 409);
      const offset = Number(url.searchParams.get("offset"));
      const data = {
        total: 12,
        leaderboard: Array.from({ length: offset === 0 ? 10 : 2 }, (_, i) => ({
          user: {
            id: `ranking-${offset + i}`,
            display_name: `Rank user ${offset + i}`,
            avatar_url: null,
            admin: true,
            bio: "PRIVATE_RANK_MARKER",
          },
          score: 100 - offset - i,
          rank: offset + i + 1,
        })),
      };
      if (rankMode === "active")
        Object.assign(data, {
          scope_version: scope,
          publication_epoch: `22000000-0000-4000-8000-${String(revision).padStart(12, "0")}`,
          epoch_revision: revision,
        });
      return answer(data);
    }
    if (path === "/challenges/categories") return answer([]);
    return answer({});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (error) => errors.push(error.message));
  return {
    context,
    page,
    writes,
    paths,
    settings,
    cookies,
    mode: (value) => (mode = value),
    rankMode: (value) => (rankMode = value),
    epoch: () => epoch++,
    text: locales[locale].ProfilePublication,
    locale,
    section: page.locator('[aria-labelledby="publication-heading"]'),
    async preview(target = page) {
      await target
        .getByRole("button", { name: locales[locale].ProfilePublication.ShowPreview, exact: true })
        .click();
      await target.locator("[data-publication-preview]").waitFor();
    },
  };
}

try {
  for (const width of [390, 1280])
    for (const locale of ["de", "en-US"]) {
      const f = await fixture(width, locale),
        { page, text, section } = f;
      await page.goto(app + "/profile/edit");
      if (disabled) {
        await page.locator("#ProfileShowOnLeaderboard").waitFor();
        assert.equal(await section.count(), 0);
        assert.equal(await page.locator("#ProfileShowOnLeaderboard").isChecked(), true);
        assert.equal(f.paths.filter((p) => p.path.includes("publication")).length, 0);
        await page.screenshot({ path: `${out}/disabled-${width}-${locale}.png` });
        await page.getByRole("button", { name: locales[locale].Buttons.Safe, exact: true }).click();
        await page.waitForFunction(() => !document.querySelector(".form-submitting"));
        assert.equal(f.writes.find((w) => w.kind === "profile").body.leaderboard_opt_out, false);
        await page.goto(app + "/challenges/leader-board");
        await page.getByText("Rank user 0", { exact: true }).first().waitFor();
        await page
          .getByRole("button", { name: locales[locale].Headings.More, exact: true })
          .click();
        await page.getByText("Rank user 10", { exact: true }).waitFor();
        assert.equal(f.paths.filter((p) => p.path.includes("publication")).length, 0);
        results.push({ name: "disabled-legacy-profile", width, locale, publicationRequests: 0 });
        await f.context.close();
        continue;
      }
      await section.getByRole("status").filter({ hasText: text.Private }).waitFor();
      assert.equal(await page.locator("#ProfileShowOnLeaderboard").count(), 0);
      assert.equal(f.writes.length, 0);
      const previewButton = section.getByRole("button", { name: text.ShowPreview, exact: true });
      await previewButton.focus();
      await page.keyboard.press("Enter");
      await page.locator("[data-publication-preview]").waitFor();
      const previewText = await page.locator("[data-publication-preview]").innerText();
      assert.ok(previewText.includes("Synthetic A"));
      assert.ok(previewText.includes("120"));
      assert.ok(!previewText.includes("PRIVATE_"));
      assert.ok(previewText.includes(text.Notice));
      const share = section.getByRole("button", { name: text.Share, exact: true });
      const bounds = await share.boundingBox();
      assert.ok(bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= width);
      await page.screenshot({ path: `${out}/preview-${width}-${locale}.png`, fullPage: true });
      await share.focus();
      await page.keyboard.press("Enter");
      await section.getByText(text.Shared, { exact: true }).waitFor();
      await section.getByRole("button", { name: text.Withdraw, exact: true }).click();
      await section.getByText(text.PrivateAgain, { exact: true }).waitFor();
      assert.equal(f.writes.filter((w) => w.kind === "publication").length, 2);
      await page.getByRole("button", { name: locales[locale].Buttons.Safe, exact: true }).click();
      await page.waitForFunction(() => !document.querySelector(".form-submitting"));
      assert.equal(f.writes.filter((w) => w.kind === "publication").length, 2);
      const profileWrite = f.writes.find((w) => w.kind === "profile");
      assert.ok(profileWrite);
      assert.ok(!("leaderboard_opt_out" in profileWrite.body));
      assert.ok(!("profile_visibility" in profileWrite.body));
      results.push({ name: "preview-keyboard-share-withdraw-profile-save", width, locale });
      // Old and new leaderboard DTOs, epoch restart and truthful unavailable state.
      await page.goto(app + "/challenges/leader-board");
      await page.getByText("Rank user 0", { exact: true }).first().waitFor();
      assert.ok(!(await page.locator("main").innerText()).includes("PRIVATE_RANK_MARKER"));
      f.rankMode("active");
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await page.getByText("Rank user 0", { exact: true }).first().waitFor();
      f.epoch();
      await page.getByRole("button", { name: locales[locale].Headings.More, exact: true }).click();
      await page.getByText("Rank user 0", { exact: true }).first().waitFor();
      assert.equal(await page.getByText("Rank user 10", { exact: true }).count(), 0);
      await page.getByRole("button", { name: locales[locale].Headings.More, exact: true }).click();
      await page.getByText("Rank user 10", { exact: true }).waitFor();
      f.rankMode("503");
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await page.getByText(text.RankingUnavailable, { exact: true }).waitFor();
      assert.equal(await page.getByText("Rank user 0", { exact: true }).count(), 0);
      results.push({ name: "both-ranking-shapes-epoch-restart-503", width, locale });
      await f.context.close();
    }
  if (!disabled) {
    for (const mode of ["401", "409", "503", "lost", "read503"]) {
      const f = await fixture(390, "de"),
        { page, section, text } = f;
      await page.goto(app + "/profile/edit");
      await section.getByText(text.Private, { exact: true }).waitFor();
      if (mode === "read503") {
        f.mode(mode);
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await section.getByText(text.Unknown, { exact: true }).waitFor();
        assert.equal(
          await section.getByRole("button", { name: text.Share, exact: true }).count(),
          0
        );
      } else {
        await f.preview();
        f.mode(mode);
        await section.getByRole("button", { name: text.Share, exact: true }).click();
        const message =
          mode === "401" ? text.SignIn : mode === "409" ? text.Changed : text.Unavailable;
        await section.getByText(message, { exact: true }).waitFor();
        assert.equal(await section.getByText(text.Shared, { exact: true }).count(), 0);
        assert.equal(f.writes.length, 1);
        if (mode === "503") {
          const original = structuredClone(f.writes[0].body);
          f.mode("normal");
          await section.getByRole("button", { name: text.CheckAgain, exact: true }).click();
          await section.getByText(text.Shared, { exact: true }).waitFor();
          assert.deepEqual(f.writes[1].body, original);
        }
        if (mode === "lost") assert.equal(f.settings.A.profile_visibility, "shared");
      }
      results.push({ name: "publication-failure", mode, width: 390, locale: "de" });
      await f.context.close();
    }
    const f = await fixture(390, "de"),
      { page, section, text } = f;
    await page.goto(app + "/profile/edit");
    await f.preview();
    const second = await f.context.newPage();
    second.on("pageerror", (error) => errors.push(error.message));
    await second.goto(app + "/profile/edit");
    await f.preview(second);
    await section.getByRole("button", { name: text.Share, exact: true }).click();
    await second.getByText(text.SharedStatus, { exact: true }).waitFor();
    assert.equal(await second.locator("[data-publication-preview]").count(), 0);
    await section.getByRole("button", { name: text.Withdraw, exact: true }).click();
    await second.getByText(text.Private, { exact: true }).waitFor();
    assert.equal(f.writes.length, 2);
    await f.cookies("B");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await f.preview();
    assert.ok(
      (await page.locator("[data-publication-preview]").innerText()).includes("Synthetic B")
    );
    assert.ok(
      !(await page.locator("[data-publication-preview]").innerText()).includes("Synthetic A")
    );
    results.push({
      name: "two-tabs-invalidation-and-account-replacement",
      width: 390,
      locale: "de",
    });
    await f.context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      { passed: true, disabled, app, syntheticAPI: api, results, pageErrors: errors },
      null,
      2
    )
  );
  console.log(JSON.stringify({ passed: true, scenarios: results.length, disabled }));
} finally {
  await browser.close();
}
