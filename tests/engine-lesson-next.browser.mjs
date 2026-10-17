/**
 * Mounted Nuxt UI with a synthetic API and a synthetic lesson package; every other origin is
 * blocked.
 *
 * A lesson of the engine (protocol 2.1) on the course lesson page. Before the unit is completed
 * the page's bar beside the frame shows "Schließen" and "Vollbild" and no "Weiter", also while
 * the frame offers its own "Weiter" to the next task, and the arrow keys on the bar do not leave.
 * The frame then passes its last task and asks for completion; skills reports the unit completed,
 * "Weiter" appears in the bar, once on the page, and leads to the course page. A room of API 1
 * keeps its page as before: its module, no such bar, and its completion leads to the course page.
 * At 390 × 640 and 1280 × 800.
 *
 * The frame is a small package built here from the real SDK. It speaks the protocol to the real
 * host and adapters: task start, submission and completion request go to skills, here synthetic.
 *
 * Build this checkout (`nuxt build`) and serve it on WEITER_TEST_APP with
 * NUXT_PUBLIC_BASE_API_URL=WEITER_TEST_API and NUXT_PUBLIC_LESSON_CONTENT_ORIGIN=WEITER_TEST_CONTENT
 * (plain http is accepted for a content origin on 127.0.0.2 only), then run
 *   PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/engine-lesson-next.browser.mjs
 * WEITER_EVIDENCE_DIR keeps a picture of every state.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const app = process.env.WEITER_TEST_APP || "http://127.0.0.1:58795";
const api = process.env.WEITER_TEST_API || "http://127.0.0.1:58796";
const content = process.env.WEITER_TEST_CONTENT || "http://127.0.0.2:58797";
const evidence = process.env.WEITER_EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });

// The synthetic package: two server-assessed tasks, both required, like the waves of a lesson.
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonical = (value) =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
          .join(",")}}`
      : JSON.stringify(value);
const GOALS = ["wave-1", "wave-2"];
const frameSource = `
import { LessonSDK } from "./sdk";
import { createLessonWindowTransport } from "./browser";
import { validateManifest } from "./validation";
declare const APP_ORIGIN: string;
const transport = createLessonWindowTransport(window, [APP_ORIGIN]);
const element = (id: string) => document.getElementById(id) as HTMLButtonElement;
const goals = ${JSON.stringify(GOALS)};
const handles: string[] = [];
let index = 0;
let checking = false;
let sdk: LessonSDK;
// A task starts only while the host runs the lesson, which it says after "ready".
function controls() {
  element("check").disabled = checking || sdk.phase !== "running";
}
function show() {
  element("task").textContent = "Welle " + (index + 1) + " von " + goals.length;
  element("verdict").textContent = "";
  element("next").hidden = true;
  checking = false;
  controls();
}
void transport.connection.then(async (connection) => {
  sdk = new LessonSDK({
    manifest: validateManifest(connection.payload.manifest),
    manifestHash: connection.payload.manifestHash as string,
    transport,
  });
  await sdk.start();
  sdk.on("host.lifecycle", controls);
  sdk.ready("main");
  show();
});
element("check").addEventListener("click", () => {
  checking = true;
  controls();
  void (async () => {
    const goal = goals[index]!;
    const started = await sdk.startTask(goal);
    const view = await sdk.submitAssessment(goal, {
      startId: (started.start as { startId: string }).startId,
      input: { kind: "synthetic" },
    });
    handles.push(view.receiptHandle as string);
    element("verdict").textContent = "Bestanden.";
    if (index < goals.length - 1) {
      element("next").hidden = false;
      element("next").focus();
      return;
    }
    const result = await sdk.request("completion.request", {
      goalIds: goals,
      stateRevision: sdk.snapshot!.revision,
      receiptHandles: handles,
    });
    if (result.outcome === "completed")
      element("verdict").textContent = "Bestanden. Diese Einheit ist abgeschlossen.";
  })().catch((error) => {
    element("verdict").textContent = "Fehler: " + String(error?.code ?? error);
  });
});
element("next").addEventListener("click", () => {
  index++;
  show();
});
`;
const bundle = await build({
  stdin: {
    contents: frameSource,
    resolveDir: fileURLToPath(new URL("../lesson-protocol/", import.meta.url)),
    sourcefile: "synthetic-engine-frame.ts",
    loader: "ts",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  target: "es2023",
  minify: true,
  define: { APP_ORIGIN: JSON.stringify(app) },
});
const files = new Map([
  [
    "index.html",
    Buffer.from(
      '<!doctype html><html lang="de"><head><meta charset="utf-8" />' +
        '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
        '<title>Synthetic engine lesson</title><script type="module" src="main.js"></script></head>' +
        '<body><h1 id="task">…</h1><button id="check" type="button" disabled>Prüfen</button>' +
        '<p id="verdict" role="status"></p><button id="next" type="button" hidden>Weiter</button>' +
        "</body></html>"
    ),
  ],
  ["main.js", Buffer.from(bundle.outputFiles[0].contents)],
  [
    "state.schema.json",
    Buffer.from(JSON.stringify({ type: "object", properties: {}, additionalProperties: false })),
  ],
]);
const mediaTypes = {
  "index.html": "text/html",
  "main.js": "text/javascript",
  "state.schema.json": "application/json",
};
const assets = [...files].map(([path, bytes]) => ({
  path,
  sha256: sha(bytes),
  mediaType: mediaTypes[path],
  bytes: bytes.length,
  loading: "initial",
}));
const manifest = JSON.parse(
  await readFile(new URL("../lesson-protocol/fixtures/manifest.json", import.meta.url), "utf8")
);
Object.assign(manifest, {
  id: "synthetic-engine-lesson",
  protocol: { major: 2, minor: 1 },
  requires: [{ id: "host.assessment", major: 1, minMinor: 0 }],
  optional: [],
  goals: GOALS.map((id, index) => ({
    id,
    label: { de: `Welle ${index + 1}`, en: `Wave ${index + 1}` },
    subskill_id: "fixture-subskill",
    xp: 1,
    assessment: { kind: "deterministic", ref: id },
  })),
  assets,
});
const manifestBytes = Buffer.from(JSON.stringify(manifest));
files.set("manifest.json", manifestBytes);
mediaTypes["manifest.json"] = "application/json";
const packageHash = sha(canonical(assets));
const packageBase = `${content}/packages/${packageHash}/`;
const REVISION = "5f0e1a2b-0000-4000-8000-00000000a001";
const descriptor = {
  id: manifest.id,
  api_version: 2,
  entry_url: packageBase,
  manifest_url: `${packageBase}manifest.json`,
  manifest_hash: sha(manifestBytes),
  package_hash: packageHash,
  revision_id: REVISION,
};
const lessonCsp =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; " +
  `object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${app}`;
const moduleV1 = await readFile(new URL("./fixtures/learning-module/index.js", import.meta.url));

const user = {
  id: "98000000-0000-4000-8000-0000000000e1",
  name: "SyntheticEngine",
  display_name: "Synthetic Engine",
  email: "synthetic-engine@example.invalid",
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
  session: { id: "engine-next-session" },
  accessToken: token,
  refreshToken: "synthetic-refresh-engine",
  authGeneration: "generation-engine",
};

/** One course with one lesson whose one activity is a room. */
function course(kind) {
  const engine = kind === "engine";
  const courseId = engine ? "engine-course" : "api1-course";
  const pathId = engine ? "engine-path" : "api1-path";
  const unitId = engine ? "load-balancer" : "number-room";
  const title = engine
    ? { de: "Load Balancer", en: "Load balancer" }
    : { de: "Zahlen", en: "Numbers" };
  return {
    courseId,
    pathId,
    unitId,
    lessonId: unitId,
    title,
    room: {
      course_id: courseId,
      unit: {
        id: unitId,
        path_id: pathId,
        title,
        room: "custom",
        content: {},
        teaches: [],
        practices: [],
        requires: [],
        module: engine
          ? descriptor
          : {
              id: "number-workbench",
              api_version: 1,
              entry_url: `${app}/__synthetic-modules/number-workbench/index.js`,
            },
        completion_kind: engine ? "engine" : "introduced",
      },
      progress: { revision: 0, state: {}, status: "new", result: null, review_id: null },
      review_available: false,
    },
  };
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/run/current-system/sw/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-background-networking"],
});
const results = [];

async function fixture(subject, [width, height]) {
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
  const calls = [];
  const errors = [];
  const consoleErrors = [];
  const foreign = [];
  const room = structuredClone(subject.room);
  const cors = {
    "access-control-allow-origin": app,
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "cache-control": "private, no-store",
  };
  await context.route("**/*", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.origin === app) {
      if (url.pathname === "/__synthetic-modules/number-workbench/index.js")
        return route.fulfill({ status: 200, contentType: "text/javascript", body: moduleV1 });
      return route.continue();
    }
    if (url.origin === content) {
      const name = url.pathname.startsWith(`/packages/${packageHash}/`)
        ? url.pathname.slice(`/packages/${packageHash}/`.length) || "index.html"
        : "";
      if (!files.has(name)) return route.fulfill({ status: 404, body: "Not found" });
      return route.fulfill({
        status: 200,
        body: files.get(name),
        headers: {
          "content-type": mediaTypes[name],
          "content-security-policy": lessonCsp,
          "access-control-allow-origin": "*",
          "access-control-expose-headers": "Content-Security-Policy",
          "x-content-type-options": "nosniff",
        },
      });
    }
    if (url.origin !== api) {
      foreign.push(url.origin);
      return route.abort();
    }
    const path = url.pathname,
      method = req.method();
    const answer = (data, status = 200) =>
      route
        .fulfill({
          status,
          headers: cors,
          contentType: "application/json",
          body: JSON.stringify(data),
        })
        .catch(() => {});
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    calls.push({ method, path: path + url.search, body: req.postDataJSON?.() ?? null });
    if (path === "/auth/oauth/providers") return answer([]);
    if ((req.headers()["authorization"] || "") !== `Bearer ${token}`)
      return answer({ detail: "x" }, 401);
    if (path === "/auth/users/me") return answer(user);
    if (path.includes("notifications") || path.includes("unrated")) return answer([]);
    if (path === "/shop/learning/policy")
      return answer({
        mode: "legacy",
        premium: true,
        heart_sales: true,
        single_course_sales: false,
      });
    if (path === `/shop/hearts/${user.id}`) return answer({ hearts: 5 });
    if (path === `/shop/coins/${user.id}`) return answer({ coins: 0 });
    if (path === `/shop/premium/${user.id}`)
      return answer({ premium: false, autopay: null, renewal: null, since: null, until: null });
    const base = `/skills/courses/${subject.courseId}`;
    if (path === base)
      return answer({
        id: subject.courseId,
        title: subject.title.de,
        description: "",
        learning_path_id: subject.pathId,
        has_explicit_curriculum: true,
        sections: [],
      });
    if (path === `${base}/lessons/${subject.lessonId}`)
      return answer({
        id: subject.lessonId,
        course_id: subject.courseId,
        explicit: true,
        title: subject.title,
        activities: [
          {
            id: subject.unitId,
            kind: "custom",
            roles: ["explanation"],
            title: subject.title,
            source: { kind: "room", unit_id: subject.unitId },
            completed: false,
          },
        ],
      });
    if (path === `${base}/curriculum`)
      return answer({
        course_id: subject.courseId,
        explicit: true,
        chapters: [],
        lessons: [
          {
            id: subject.lessonId,
            title: subject.title,
            activity_ids: [subject.unitId],
            completed: room.progress.status === "completed",
          },
        ],
      });
    if (path === "/skills/rooms/capabilities") return answer({ enabled: true });
    if (path === "/skills/rooms") {
      const learningPath = { id: subject.pathId, title: subject.title, chapters: [] };
      return answer({ paths: [learningPath], path: learningPath, next: room });
    }
    if (path === `/skills/rooms/${subject.unitId}` && method === "GET") return answer(room);
    if (path === `/skills/rooms/${subject.unitId}/state` && method === "PUT") {
      const body = req.postDataJSON();
      if (body.expected_revision !== room.progress.revision) return answer({ detail: "x" }, 409);
      room.progress = {
        ...room.progress,
        revision: room.progress.revision + 1,
        state: body.state,
        status: room.progress.status === "new" ? "in_progress" : room.progress.status,
      };
      return answer(room);
    }
    if (path === `/skills/rooms/${subject.unitId}/complete` && method === "POST") {
      // A lesson of the engine is completed by its booked passes only (skills #430).
      if (room.unit.completion_kind === "engine") return answer({ detail: "x" }, 409);
      room.progress = {
        ...room.progress,
        revision: room.progress.revision + 1,
        status: "completed",
        result: { kind: "introduced" },
      };
      return answer(room);
    }
    const task = path.match(
      new RegExp(`^/skills/engine/units/${subject.unitId}/tasks/([a-z0-9-]+)/(start|submissions)$`)
    );
    if (task && method === "POST") {
      const [, goalId, step] = task;
      if (step === "start")
        return answer({
          start: {
            startId: `${goalId}-start`,
            revisionId: REVISION,
            goalId,
            caseId: "case-1",
            config: {},
            initial: {},
            seed: "000000000000000000000000000000e1",
          },
          assessments: [],
        });
      // The service books the pass, and with the last required one the unit, in one step.
      const last = goalId === GOALS.at(-1);
      if (last)
        room.progress = { ...room.progress, status: "completed", result: { kind: "passed" } };
      return answer({
        assessmentId: randomUUID(),
        goalId,
        status: "final",
        outcome: "passed",
        counts: true,
        feedback: { source: "server", summary: "Bestanden.", public_reasons: [] },
        xp: { awardId: `award-${goalId}`, xp: 1, persisted: true },
        ...(last ? { completed: true } : {}),
      });
    }
    return answer({});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  // Vue reports an error in a render here, and a blocked request would too.
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return { context, page, calls, errors, consoleErrors, room, foreign };
}
const record = (label, f) => ({ case: label, passed: true, requests: f.calls.length });

async function picture(page, name) {
  if (evidence) await page.screenshot({ path: join(evidence, `${name}.png`) });
}
const bar = (page) => page.getByRole("navigation", { name: "Lektion steuern" });
const barLabels = async (page) =>
  (await bar(page).getByRole("button").allInnerTexts()).map((label) => label.trim());
const pageNext = (page) => page.getByRole("button", { name: "Weiter", exact: true });
const pathname = (page) => new URL(page.url()).pathname.replace(/\/$/, "");
/**
 * Buttons in the frame are pressed from the keyboard once they can act: a mouse click right after
 * the frame (another site, its own process) is laid out can miss its document in headless Chromium.
 */
async function press(frame, name) {
  const button = frame.getByRole("button", { name }).and(frame.locator(":enabled"));
  await button.waitFor();
  await button.press("Enter");
}
/** The course page has opened and shows its course. */
async function coursePage(page, subject) {
  await page.waitForURL(
    (url) => url.pathname.replace(/\/$/, "") === `/courses/${subject.courseId}`
  );
  await page.getByRole("heading", { level: 1, name: subject.title.de }).waitFor();
}
/** Nothing went wrong in the page, and nothing left for another origin. */
function clean(f, label) {
  assert.deepEqual(f.errors, [], `${label}: page errors`);
  assert.deepEqual(f.consoleErrors, [], `${label}: console errors`);
  assert.deepEqual(f.foreign, [], `${label}: foreign requests`);
}

async function engineLesson(size) {
  const label = `engine ${size.join("x")}`;
  const subject = course("engine");
  const f = await fixture(subject, size);
  const { page } = f;
  try {
    await page.goto(`${app}/courses/${subject.courseId}/lessons/${subject.lessonId}`);
    const frame = page.frameLocator(".protocol-surface iframe");
    await frame.getByText("Welle 1 von 2").waitFor();
    await bar(page).getByRole("button", { name: "Schließen" }).waitFor();
    assert.deepEqual(await barLabels(page), ["Schließen", "Vollbild"], `${label}: at the start`);
    await picture(page, `${size.join("x")}-engine-1-start`);

    // The first task passes: the frame offers its own "Weiter" to the next one, alone on the page.
    await press(frame, "Prüfen");
    await frame.getByRole("button", { name: "Weiter" }).waitFor();
    assert.equal(await frame.getByText("Bestanden.").count(), 1, label);
    assert.deepEqual(await barLabels(page), ["Schließen", "Vollbild"], `${label}: after a pass`);
    assert.equal(await pageNext(page).count(), 0, `${label}: no page Weiter after a pass`);
    assert.equal(f.room.progress.status, "new", label);
    await picture(page, `${size.join("x")}-engine-2-pass-frame-weiter`);

    // The arrow keys on the bar stand for the page's "Weiter" and stay on the page while it is not there.
    await bar(page).getByRole("button", { name: "Schließen" }).focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500);
    assert.equal(pathname(page), `/courses/${subject.courseId}/lessons/${subject.lessonId}`, label);
    assert.equal(await page.getByText("Du bleibst hier.", { exact: false }).count(), 0, label);

    // The frame's "Weiter" opens the next task; it passes, and the frame asks for completion.
    await press(frame, "Weiter");
    await frame.getByText("Welle 2 von 2").waitFor();
    await press(frame, "Prüfen");
    await frame.getByText("Diese Einheit ist abgeschlossen.", { exact: false }).waitFor();
    await pageNext(page).waitFor();
    assert.deepEqual(
      await barLabels(page),
      ["Weiter", "Schließen", "Vollbild"],
      `${label}: after completion`
    );
    assert.equal(await frame.getByRole("button", { name: "Weiter" }).isVisible(), false, label);
    assert.equal(await pageNext(page).count(), 1, `${label}: one Weiter on the page`);
    assert.equal(f.room.progress.status, "completed", label);
    // The client never completes a lesson of the engine; the frame stays after completion (F2).
    assert.equal(
      f.calls.some(({ path }) => path.includes("/complete")),
      false,
      label
    );
    assert.equal(await page.locator(".protocol-surface iframe").count(), 1, label);
    await picture(page, `${size.join("x")}-engine-3-completed`);

    // The page's "Weiter" leads to the course page, as before.
    await pageNext(page).click();
    await coursePage(page, subject);
    await picture(page, `${size.join("x")}-engine-4-course-page`);
    // The frame's operations reached skills on the service's paths, for this course and revision.
    const engine = f.calls.filter(({ path }) => path.startsWith("/skills/engine/"));
    assert.deepEqual(
      engine.map(({ path }) => path.replace(`/skills/engine/units/${subject.unitId}/tasks/`, "")),
      ["wave-1/start", "wave-1/submissions", "wave-2/start", "wave-2/submissions"],
      label
    );
    for (const { body } of engine) assert.equal(body.courseId, subject.courseId, label);
    for (const { body } of engine.filter(({ path }) => path.endsWith("/start")))
      assert.equal(body.revisionId, REVISION, label);
    clean(f, label);
    results.push(record(label, f));
  } catch (error) {
    // What the frame said last, for a failure inside it.
    const said = await page
      .frameLocator(".protocol-surface iframe")
      .locator("#verdict")
      .textContent({ timeout: 1000 })
      .catch(() => null);
    const shown = await page
      .locator(".protocol-activity")
      .innerText({ timeout: 1000 })
      .catch(() => null);
    error.message += ` (frame: ${JSON.stringify(said)}; player: ${JSON.stringify(shown)}; calls: ${JSON.stringify(f.calls.map(({ method, path }) => `${method} ${path}`))}; console: ${JSON.stringify(f.consoleErrors)})`;
    throw error;
  } finally {
    await f.context.close();
  }
}

async function api1Room(size) {
  const label = `api1 ${size.join("x")}`;
  const subject = course("api1");
  const f = await fixture(subject, size);
  const { page } = f;
  try {
    await page.goto(`${app}/courses/${subject.courseId}/lessons/${subject.lessonId}`);
    await page.getByText("Wähle eine Zahl").waitFor();
    // Its module in the page, without the bar of a lesson frame and without a "Weiter".
    assert.equal(await bar(page).count(), 0, label);
    assert.equal(await page.locator(".protocol-activity").count(), 0, label);
    assert.equal(await pageNext(page).count(), 0, label);
    await picture(page, `${size.join("x")}-api1-1-open`);
    // Its completion continues to the course page.
    await page.getByRole("button", { name: "Prüfen" }).click();
    await coursePage(page, subject);
    assert.equal(f.room.progress.status, "completed", label);
    assert.equal(
      f.calls.filter(({ path, method }) => method === "POST" && path.includes("/complete")).length,
      1,
      label
    );
    await picture(page, `${size.join("x")}-api1-2-course-page`);
    clean(f, label);
    results.push(record(label, f));
  } finally {
    await f.context.close();
  }
}

const failures = [];
for (const size of [
  [390, 640],
  [1280, 800],
])
  for (const run of [engineLesson, api1Room])
    try {
      await run(size);
    } catch (error) {
      failures.push(`${run.name} ${size.join("x")}: ${error.message}`);
      results.push({ case: `${run.name} ${size.join("x")}`, passed: false, error: error.message });
    }
await browser.close();
console.log(JSON.stringify({ results }, null, 2));
assert.deepEqual(failures, []);
