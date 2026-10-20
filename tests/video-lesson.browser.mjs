/**
 * Mounted Nuxt UI with a synthetic API; every other origin is blocked. Nothing reaches YouTube.
 *
 * A video of a course with an explicit curriculum, in the course lesson view, at 390 × 844 and
 * 1280 × 800. Once it is watched, the lesson still shows the video, its description and its
 * exercises, with "Abgeschlossen" as a short note and "Weiter", which leads on. A video not yet
 * watched shows "Fertig"; that marks it watched (one PUT …/lectures/<id>/complete), and opened
 * again the lesson shows the video with the note.
 *
 * Build this checkout (`nuxt build`) and serve it on VIDEO_TEST_APP with
 * NUXT_PUBLIC_BASE_API_URL=VIDEO_TEST_API, then run
 *   PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/video-lesson.browser.mjs
 * VIDEO_EVIDENCE_DIR keeps a picture of every state.
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.VIDEO_TEST_APP || "http://127.0.0.1:58895";
const api = process.env.VIDEO_TEST_API || "http://127.0.0.1:58896";
const evidence = process.env.VIDEO_EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });

const COURSE = "netzwerktechnik";
const LESSON = "netz-1";
const LECTURE = "lecture-a";
const SECTION = "section-a";
const user = {
  id: "98000000-0000-4000-8000-0000000000f1",
  name: "SyntheticVideo",
  display_name: "Synthetic Video",
  email: "synthetic-video@example.invalid",
  email_verified: true,
  description: "",
  tags: [],
  admin: false,
  terms_version: "2026-09-r4",
  age_confirmed: true,
  leaderboard_opt_out: true,
  business: false,
  country: "Deutschland",
};
const token = `e30.${Buffer.from(JSON.stringify({ sub: user.id, exp: 4102444800 })).toString("base64url")}.synthetic`;
const session = {
  user: { id: user.id, name: user.name, display_name: user.display_name },
  session: { id: "video-lesson-session" },
  accessToken: token,
  refreshToken: "synthetic-refresh-video",
  authGeneration: "generation-video",
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/run/current-system/sw/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-background-networking"],
});

/** A browser context with the session and a synthetic API that holds the lecture's progress. */
async function fixture([width, height], watched) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: "de-DE",
    reducedMotion: "reduce",
  });
  await context.addCookies(
    Object.entries({ locale: "de", ...session }).map(([name, value]) => ({
      name,
      value: encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value)),
      url: app,
    }))
  );
  const state = { watched, completions: 0 };
  const errors = [];
  const foreign = [];
  const lecture = () => ({
    id: LECTURE,
    title: "Was ist ein Netzwerk?",
    description: "Wie Rechner miteinander sprechen.",
    type: "youtube",
    video_id: "abcdefghijk",
    duration: 300,
    completed: state.watched,
  });
  const cors = {
    "access-control-allow-origin": app,
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "cache-control": "private, no-store",
  };
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === app) return route.continue();
    if (url.origin !== api) {
      foreign.push(url.origin);
      return route.abort();
    }
    const answer = (data, status = 200) =>
      route
        .fulfill({
          status,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify(data),
        })
        .catch(() => {});
    const method = request.method();
    const path = url.pathname;
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (path === "/auth/oauth/providers") return answer([]);
    if ((request.headers()["authorization"] || "") !== `Bearer ${token}`)
      return answer({ detail: "x" }, 401);
    if (path === "/auth/users/me") return answer(user);
    if (path.includes("notifications") || path.includes("unrated")) return answer([]);
    const base = `/skills/courses/${COURSE}`;
    if (path === base)
      return answer({
        id: COURSE,
        title: "Netzwerktechnik",
        description: "",
        learning_path_id: null,
        has_explicit_curriculum: true,
        sections: [{ id: SECTION, title: "Grundlagen", lectures: [lecture()] }],
      });
    if (path === `${base}/lessons/${LESSON}`)
      return answer({
        id: LESSON,
        course_id: COURSE,
        explicit: true,
        title: { de: "Was ist ein Netzwerk?", en: "What is a network?" },
        activities: [
          {
            id: LECTURE,
            kind: "video",
            roles: ["explanation"],
            title: { de: "Was ist ein Netzwerk?", en: "What is a network?" },
            source: {
              kind: "lecture",
              course_id: COURSE,
              section_id: SECTION,
              lecture_id: LECTURE,
            },
            content: lecture(),
            completed: state.watched,
          },
        ],
      });
    if (path === `${base}/curriculum`)
      return answer({
        course_id: COURSE,
        explicit: true,
        chapters: [],
        lessons: [
          {
            id: LESSON,
            title: { de: "Was ist ein Netzwerk?", en: "What is a network?" },
            activity_ids: [LECTURE],
            completed: state.watched,
          },
        ],
      });
    if (path === `${base}/lectures/${LECTURE}/complete` && method === "PUT") {
      state.completions++;
      state.watched = true;
      return answer({});
    }
    if (path === `/challenges/courses/${COURSE}/tasks`)
      return answer([{ id: "task-a", section_id: SECTION, lecture_id: LECTURE }]);
    if (path === "/challenges/tasks/task-a/multiple_choice")
      return answer([{ id: "q-1", task_id: "task-a", question: "Was verbindet ein Switch?" }]);
    if (path.startsWith("/challenges/tasks/")) return answer([]);
    return answer({});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  return { context, page, state, errors, foreign };
}

async function picture(page, name) {
  if (evidence) await page.screenshot({ path: join(evidence, `${name}.png`), fullPage: true });
}
const lessonUrl = `${app}/courses/${COURSE}/lessons/${LESSON}`;
const button = (page, name) => page.getByRole("button", { name, exact: true });

/** The watched video lesson: video, description, exercises, the note and "Weiter". */
async function watchedLesson(page, label) {
  await page.getByRole("heading", { level: 1, name: "Was ist ein Netzwerk?" }).waitFor();
  await button(page, "Weiter").waitFor();
  // The video's player is loaded on demand and can come a moment after the page's controls.
  const video = await button(page, "Video laden")
    .waitFor({ timeout: 5000 })
    .then(
      () => true,
      () => false
    );
  assert.equal(video, true, `${label}: the video`);
  assert.equal(
    await page.getByText("Wie Rechner miteinander sprechen.").count(),
    1,
    `${label}: its description`
  );
  await page.getByRole("link", { name: /Was verbindet ein Switch\?/ }).waitFor();
  assert.equal(await page.getByText("Abgeschlossen", { exact: true }).count(), 1, label);
  assert.equal(await button(page, "Fertig").count(), 0, `${label}: no second completion`);
}

async function run(size) {
  const label = size.join("x");
  // Watched before: the lesson stays a video with its exercises; "Weiter" leads on.
  let f = await fixture(size, true);
  try {
    await f.page.goto(lessonUrl);
    await watchedLesson(f.page, `${label} watched`);
    await picture(f.page, `${label}-1-abgeschlossen`);
    await button(f.page, "Weiter").click();
    await f.page.waitForURL((url) => url.pathname.replace(/\/$/, "") === `/courses/${COURSE}`);
    assert.equal(f.state.completions, 0, `${label}: nothing completed again`);
    assert.deepEqual(f.errors, [], `${label}: page errors`);
    assert.deepEqual(f.foreign, [], `${label}: foreign requests`);
  } finally {
    await f.context.close();
  }
  // Not yet watched: "Fertig" completes once; opened again, the lesson keeps the video.
  f = await fixture(size, false);
  try {
    await f.page.goto(lessonUrl);
    await button(f.page, "Fertig").waitFor();
    assert.equal(await f.page.getByText("Abgeschlossen", { exact: true }).count(), 0, label);
    await picture(f.page, `${label}-2-offen`);
    await button(f.page, "Fertig").click();
    await f.page.waitForURL((url) => url.pathname.replace(/\/$/, "") === `/courses/${COURSE}`);
    assert.equal(f.state.completions, 1, `${label}: one completion`);
    await f.page.goto(lessonUrl);
    await watchedLesson(f.page, `${label} after Fertig`);
    await picture(f.page, `${label}-3-nach-fertig`);
    assert.equal(f.state.completions, 1, `${label}: still one completion`);
    assert.deepEqual(f.errors, [], `${label}: page errors`);
    assert.deepEqual(f.foreign, [], `${label}: foreign requests`);
  } finally {
    await f.context.close();
  }
  return { case: label, passed: true };
}

const results = [];
const failures = [];
for (const size of [
  [390, 844],
  [1280, 800],
])
  try {
    results.push(await run(size));
  } catch (error) {
    failures.push(error.message);
    results.push({ case: size.join("x"), passed: false, error: error.message });
  }
await browser.close();
console.log(JSON.stringify({ results }, null, 2));
assert.deepEqual(failures, []);
