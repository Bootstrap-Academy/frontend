/**
 * Mounted Nuxt UI, synthetic API only. Every unrelated network origin is blocked.
 *
 * Serve this checkout on SKILLTREE_TEST_APP with NUXT_PUBLIC_BASE_API_URL set to
 * SKILLTREE_TEST_API, as a generated build or with `nuxt dev`, then run
 *   PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/skilltree-profile-requests.browser.mjs
 */
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.SKILLTREE_TEST_APP || "http://127.0.0.1:58731";
const api = process.env.SKILLTREE_TEST_API || "http://127.0.0.1:58733";

// The session plugin loads the profile once while the app starts, because the
// `user` cookie only carries the id and the two names. The skill tree needs no
// further copy, however many nodes it renders and however often it is opened.
const PROFILE_REQUESTS_PER_APP_START = 1;

const ROWS = 20,
  COLUMNS = 20,
  SKILLS = 32;
const uid = "11000000-0000-4000-8000-000000000001";
const user = {
  id: uid,
  name: "SyntheticA",
  display_name: "Synthetic A",
  email: "synthetic-a@example.invalid",
  email_verified: true,
  tags: [],
  admin: false,
  terms_version: "2026-09-r4",
  age_confirmed: true,
};
const token = `e30.${Buffer.from(JSON.stringify({ sub: uid, exp: 4102444800 })).toString("base64url")}.synthetic`;
/** One skill on every twelfth cell, the second one bookmarked. */
const tree = (parent) => ({
  rows: ROWS,
  columns: COLUMNS,
  skills: Array.from({ length: SKILLS }, (_, n) => ({
    id: parent ? `sub_skill_${n}` : `root_skill_${n}`,
    ...(parent ? { parent_id: parent, courses: [] } : { skills: [] }),
    name: parent ? `Synthetic sub skill ${n}` : `Synthetic skill ${n}`,
    dependencies: [],
    dependents: [],
    row: Math.floor((n * 12 + 6) / COLUMNS),
    column: (n * 12 + 6) % COLUMNS,
    icon: "analysis",
    is_bookmarked: n === 1,
  })),
});

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/run/current-system/sw/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-background-networking"],
});
const results = [],
  errors = [];

async function fixture(member) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const values = { locale: "de" };
  if (member)
    Object.assign(values, {
      user: { id: uid, name: user.name, display_name: user.display_name },
      session: { id: "skilltree-session-A" },
      accessToken: token,
      refreshToken: "synthetic-refresh-A",
      authGeneration: "generation-A",
    });
  await context.addCookies(
    Object.entries(values).map(([name, value]) => ({
      name,
      value: encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value)),
      url: app,
    }))
  );
  const calls = [];
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.origin === app || url.protocol === "data:") return route.continue();
    if (url.origin !== api) return route.abort();
    const path = url.pathname;
    calls.push({ path, method: req.method(), at: Date.now() });
    const answer = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
        headers: { "cache-control": "private, no-store" },
      });
    if (path === "/auth/users/me") return member ? answer(user) : answer({ detail: "x" }, 401);
    if (path === "/skills/skilltree") return answer(tree(null));
    if (path.startsWith("/skills/skilltree/")) return answer(tree(path.split("/").pop()));
    if (path === `/skills/xp/${uid}`) return answer({ skills: [] });
    return answer({});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  const cells = page.locator("section.map > svg > svg");
  /** The whole grid is mounted and the API has been quiet for a second. */
  async function shown(label) {
    await page.locator("section.map h6", { hasText: label }).first().waitFor({ state: "attached" });
    await page.waitForFunction(
      (count) => document.querySelectorAll("section.map > svg > svg").length === count,
      ROWS * COLUMNS
    );
    for (let last = -1; last !== calls.length || Date.now() - (calls.at(-1)?.at ?? 0) < 1000; ) {
      last = calls.length;
      await page.waitForTimeout(250);
    }
    return {
      labels: await page.locator("section.map h6").count(),
      memberStars: await page.locator("section.map .bookmarker .fill-secondary").count(),
      bookmarked: await page.locator("section.map .bookmarker .fill-star").count(),
      guestStars: await page.locator("section.map .bookmarker .text-body").count(),
    };
  }
  const profileRequests = () =>
    calls.filter((c) => c.path === "/auth/users/me" && c.method === "GET").length;
  return { context, page, cells, shown, profileRequests };
}

try {
  {
    const f = await fixture(true),
      { page } = f;
    const full = { labels: SKILLS, memberStars: SKILLS, bookmarked: 1, guestStars: 0 };
    await page.goto(app + "/skill-tree");
    assert.deepEqual(await f.shown("Synthetic skill 31"), full);
    assert.equal(f.profileRequests(), PROFILE_REQUESTS_PER_APP_START);
    // Opening a sub tree and returning mounts both grids again without a reload.
    await f.cells.filter({ hasText: "Synthetic skill 0" }).first().dispatchEvent("click");
    await page.waitForURL(app + "/skill-tree/root_skill_0");
    assert.deepEqual(await f.shown("Synthetic sub skill 31"), full);
    await page.locator('header a[href="/skill-tree"]').click();
    await page.waitForURL(app + "/skill-tree");
    assert.deepEqual(await f.shown("Synthetic skill 31"), full);
    assert.equal(f.profileRequests(), PROFILE_REQUESTS_PER_APP_START);
    results.push({ name: "member-root-sub-root", profileRequests: f.profileRequests() });
    await f.context.close();
  }
  {
    const f = await fixture(false);
    await f.page.goto(app + "/skill-tree");
    assert.deepEqual(await f.shown("Synthetic skill 31"), {
      labels: SKILLS,
      memberStars: 0,
      bookmarked: 0,
      guestStars: SKILLS,
    });
    assert.equal(f.profileRequests(), 0);
    results.push({ name: "guest-root", profileRequests: 0 });
    await f.context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, app, syntheticAPI: api, results }));
} finally {
  await browser.close();
}
