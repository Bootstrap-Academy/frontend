/**
 * Browser check for host.llm and host.project with fake skills-ms and llm-ms endpoints.
 * No real gateway, model provider or account. Usage:
 *   node tests/learning-llm.browser.mjs [screenshot-dir]
 * Ports: LLM_BROWSER_PORT (58250) for page and fakes, LLM_BROWSER_CDP (58251) for Chromium.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const port = Number(process.env.LLM_BROWSER_PORT || 58250);
const cdpPort = Number(process.env.LLM_BROWSER_CDP || 58251);
for (const value of [port, cdpPort])
  if (value < 58250 || value > 58259) throw new Error(`Port ${value} is outside 58250–58259`);
const chromium = process.env.CHROMIUM || "chromium";
const out = process.argv[2] || (await mkdtemp(join(tmpdir(), "llm-browser-shots-")));
await mkdir(out, { recursive: true });
const origin = `http://127.0.0.1:${port}`;
const ACCESS = "harness-access-token";
const GRANT = "harness-grant";
const RECEIPT = "harness.signed.verdict";

const root = new URL("../", import.meta.url);
const transpile = async (file) =>
  ts.transpileModule(await readFile(new URL(file, root), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
const files = {
  "/sdk/learningModule.js": await transpile("utils/learningModule.ts"),
  "/sdk/learningLlm.js": await transpile("utils/learningLlm.ts"),
  "/sdk/learningProject.js": await transpile("utils/learningProject.ts"),
  "/module/index.js": await readFile(
    new URL("tests/fixtures/learning-llm-module/index.js", root),
    "utf8"
  ),
};

// The page is the player's wiring in miniature: the same session, llm and project code as
// CustomActivity, with a fixed test session instead of cookies.
const page = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>host.llm check</title>
<style>
  body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #111827; color: #f3f4f6; }
  main { width: min(1056px, calc(100% - 32px)); margin: 32px auto 80px; }
  h1 { font-size: clamp(1.6rem, 4vw, 2.2rem); margin: 1.5rem 0; }
</style></head>
<body><main><h1>Klingel: Tresen-Bot</h1><div id="surface"></div><p id="player"></p></main>
<script type="module">
import { createLearningModuleSession } from "/sdk/learningModule.js";
import { createLearningLlm } from "/sdk/learningLlm.js";
import { createLearningProject } from "/sdk/learningProject.js";
const locale = new URLSearchParams(location.search).get("locale") || "de";
const request = async (path, method = "GET", body) => {
  const response = await fetch(path, {
    method,
    headers: { Authorization: "Bearer ${ACCESS}", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw { statusCode: response.status, data };
  return data;
};
const send = (path, init) =>
  fetch(path, { ...init, headers: { ...init.headers, Authorization: "Bearer ${ACCESS}" } });
const lifetime = new AbortController();
const llm = createLearningLlm({
  unitId: "klingel-unit", courseId: "llm-course", locale: () => locale,
  request, send, signal: lifetime.signal, document,
});
const project = createLearningProject({ courseId: "llm-course", request });
const surface = document.getElementById("surface");
const session = createLearningModuleSession({
  descriptor: { id: "llm-host-check", api_version: 1, entry_url: location.origin + "/module/index.js" },
  element: surface,
  origin: location.origin,
  context: { activityId: "klingel-unit", locale, content: {}, state: {}, disabled: false },
  change: () => {},
  save: async () => true,
  complete: async (answer) => {
    const proof = llm.takeProof();
    const body = proof
      ? { action: "complete", answer: { text: proof.text }, verdict: proof.verdict }
      : { action: "complete", answer };
    await request("/skills/rooms/klingel-unit/complete?course=llm-course", "POST", body);
    document.getElementById("player").textContent = "completed";
  },
  busy: () => {},
  status: (status) => (document.body.dataset.status = status),
  llm, project,
});
window.__host = () => {
  // What a module can reach, for the leak check below.
  let seen;
  const probe = createLearningModuleSession({
    descriptor: { id: "probe", api_version: 1, entry_url: location.origin + "/module/index.js" },
    element: document.createElement("div"), origin: location.origin,
    context: { activityId: "probe", locale, content: {}, state: {}, disabled: false },
    change() {}, save: async () => true, complete() {}, busy() {}, status() {}, llm, project,
    load: async () => ({ apiVersion: 1, mount: (_e, host) => ((seen = host), { update() {}, dispose() {} }) }),
  });
  return probe.start().then(() => seen);
};
session.start();
</script></body></html>`;

const state = {
  project: { revision: 0, state: {} },
  completions: [],
  requests: [],
  dropNext: false,
};
const runs = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const events = (id, text) => [
  ["start", { request_id: id, model: { alias: "fast", id: "fake-luna" }, samples: 1 }],
  ...text.match(/\S+\s*/g).map((piece) => ["delta", { sample: 0, text: piece }]),
  [
    "done",
    {
      request_id: id,
      status: "completed",
      replayed: false,
      model: { alias: "fast", id: "fake-luna" },
      outputs: [{ sample: 0, status: "completed", type: "text", text }],
      usage: { input_tokens: 21, cached_input_tokens: 0, output_tokens: 14, reasoning_tokens: 0 },
      redacted: false,
      allowance: { state: "ok", used_ratio: 0.02, resets_at: null, plan: "free" },
    },
  ],
];
const reply = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};
async function stream(res, list, dropAfter = Infinity) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store" });
  let sent = 0;
  for (const [name, data] of list) {
    if (sent++ === dropAfter) return res.destroy();
    res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
    if (name === "delta") await sleep(90);
  }
  res.end();
}
const body = (req) =>
  new Promise((resolve) => {
    let text = "";
    req.on("data", (chunk) => (text += chunk));
    req.on("end", () => resolve(text ? JSON.parse(text) : undefined));
  });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, origin);
  const path = url.pathname;
  if (req.method === "GET" && path === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(page);
  }
  if (files[path]) {
    res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
    return res.end(files[path]);
  }
  if (req.headers.authorization !== `Bearer ${ACCESS}`)
    return reply(res, 401, { code: "unauthenticated" });
  const data = await body(req);
  state.requests.push({ method: req.method, path, query: url.search, body: data });
  if (
    path === "/skills/rooms/klingel-unit/llm-grant" &&
    url.searchParams.get("course") === "llm-course"
  )
    return reply(res, 200, {
      grant: GRANT,
      profiles: ["klingel-chat", "klingel-grade"],
      expires_at: new Date(Date.now() + 7200e3).toISOString(),
    });
  if (path === "/skills/courses/llm-course/project") {
    if (req.method === "GET")
      return reply(res, 200, { course_id: "llm-course", ...state.project, updated_at: null });
    if (data.expected_revision !== state.project.revision)
      return reply(res, 409, { detail: "conflict" });
    state.project = { revision: state.project.revision + 1, state: data.state };
    return reply(res, 200, {
      course_id: "llm-course",
      ...state.project,
      updated_at: new Date().toISOString(),
    });
  }
  if (path === "/skills/rooms/klingel-unit/complete") {
    state.completions.push(data);
    return reply(res, 200, { ok: true });
  }
  if (path.startsWith("/llm/v1/profiles/")) {
    if (req.headers["x-llm-grant"] !== GRANT) return reply(res, 403, { code: "grant_invalid" });
    const grading = path.endsWith("klingel-grade");
    return reply(res, 200, {
      id: path.split("/").pop(),
      output: { type: grading ? "grading" : "text" },
    });
  }
  if (path === "/llm/v1/respond") {
    if (data.grant !== GRANT) return reply(res, 403, { code: "grant_invalid", retryable: true });
    if (data.profile === "klingel-grade") {
      const answer = data.input[0].content;
      const pass = /lieferzeit|abholen/i.test(answer);
      const greeting = answer.split(",")[0];
      return reply(res, 200, {
        request_id: data.request_id,
        status: "completed",
        model: { alias: "grader", id: "fake-sol" },
        outputs: [
          {
            sample: 0,
            status: "completed",
            type: "grading",
            grading: {
              verdict: pass ? "pass" : "fail",
              score: pass ? 4 : 2,
              max_score: 4,
              pass_score: 3,
              reason: pass
                ? `Freundlich, mit Namen, und du sagst, wann Frau Berg ihr Rad abholen kann.`
                : `„${greeting}“ ist ein guter Anfang, aber Frau Berg erfährt nicht, wann sie ihr Rad abholen kann.`,
              criteria: [
                { id: "greeting", met: true, claimed: true, points: 2, evidence: greeting },
                {
                  id: "pickup",
                  met: pass,
                  claimed: pass,
                  points: pass ? 2 : 0,
                  evidence: pass ? answer.match(/[^.]*(Lieferzeit|abholen)[^.]*/i)[0].trim() : "",
                },
              ],
              receipt: pass ? RECEIPT : null,
            },
          },
        ],
        usage: { input_tokens: 80, cached_input_tokens: 0, output_tokens: 40, reasoning_tokens: 0 },
        redacted: false,
        allowance: null,
      });
    }
    const text =
      "Samstags haben wir von 9 bis 14 Uhr offen. Komm gern vorbei, die Werkstatt ist dann auch da!";
    runs.set(data.request_id, events(data.request_id, text));
    // The first stream of every page load drops after three events to exercise the rejoin.
    const drop = state.dropNext;
    state.dropNext = false;
    return stream(res, runs.get(data.request_id), drop ? 3 : Infinity);
  }
  if (path.startsWith("/llm/v1/requests/")) {
    const run = runs.get(decodeURIComponent(path.split("/").pop()));
    if (!run) return reply(res, 404, { code: "request_unknown" });
    return stream(res, run);
  }
  reply(res, 404, { code: "not_found" });
});
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

const profile = await mkdtemp(join(tmpdir(), "llm-browser-profile-"));
const browser = spawn(
  chromium,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${cdpPort}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore" }
);
let socket;
try {
  let targets;
  for (let attempt = 0; attempt < 50 && !targets; attempt++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
    } catch {
      await sleep(200);
    }
  }
  socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve) => (socket.onopen = resolve));
  let sequence = 0;
  const waiting = new Map();
  const exceptions = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const pending = waiting.get(message.id);
      waiting.delete(message.id);
      if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
      else pending.resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown")
      exceptions.push(message.params.exceptionDetails.exception?.description || "exception");
  };
  const command = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      waiting.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await command("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || expression);
    return result.value;
  };
  const until = async (expression, label, timeout = 8000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evaluate(expression)) return;
      await sleep(40);
    }
    throw new Error(`Timed out waiting for ${label}`);
  };
  await command("Runtime.enable");
  await command("Page.enable");

  for (const [width, height] of [
    [390, 844],
    [1280, 900],
  ]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    state.completions.length = 0;
    state.requests.length = 0;
    state.dropNext = true;
    await command("Page.navigate", { url: `${origin}/?locale=de` });
    await until(`document.querySelector(".llm-check")?.dataset.ready === "llm,project"`, "module");

    // 1. The answer streams in visibly, survives a dropped connection and is labelled.
    await evaluate(`document.getElementById("ask").click()`);
    const lengths = new Set();
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const text = await evaluate(`document.getElementById("answer")?.textContent || ""`);
      lengths.add(text.length);
      if (text.endsWith("auch da!")) break;
      await sleep(30);
    }
    const answer = await evaluate(`document.getElementById("answer").textContent`);
    assert.equal(
      answer,
      "Samstags haben wir von 9 bis 14 Uhr offen. Komm gern vorbei, die Werkstatt ist dann auch da!"
    );
    assert.ok(lengths.size >= 4, `streamed in steps (${[...lengths].join(", ")})`);
    assert.equal(
      await evaluate(`document.querySelector("#answer-box [data-academy-ai-label]").textContent`),
      "KI-Antwort"
    );
    await until(
      `document.getElementById("answer-note").textContent.includes("fake-luna")`,
      "usage note"
    );
    const rejoins = state.requests.filter((r) => r.path.startsWith("/llm/v1/requests/"));
    assert.equal(rejoins.length, 1, "the dropped stream was rejoined through its request id");
    const posts = state.requests.filter((r) => r.path === "/llm/v1/respond");
    assert.equal(rejoins[0].path, `/llm/v1/requests/${posts[0].body.request_id}`);

    // 2. Project state saves with the revision the server returns.
    const before = state.project.revision;
    await evaluate(`document.getElementById("bot-name").value = "Klingel ${width}"`);
    await evaluate(`document.getElementById("save").click()`);
    await until(
      `document.getElementById("project").textContent.includes("Stand ${before + 1}")`,
      "project"
    );
    assert.deepEqual(state.project, {
      revision: before + 1,
      state: { bot: { name: `Klingel ${width}` } },
    });

    // 3. A failed grade shows the reason with the quote marked in the learner's text.
    await evaluate(`document.getElementById("grade").click()`);
    await until(`!!document.getElementById("reason")`, "grading reason");
    assert.match(
      await evaluate(`document.getElementById("reason").textContent`),
      /wann sie ihr Rad abholen/
    );
    assert.equal(
      await evaluate(`document.querySelector("#marked-answer mark").textContent`),
      "Hallo Frau Berg"
    );
    assert.equal(
      await evaluate(`document.querySelector("#grade-box [data-academy-ai-label]").textContent`),
      "KI-Bewertung, kann irren"
    );
    assert.equal(await evaluate(`document.getElementById("continue").hidden`), true);
    await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).then(
      ({ data }) =>
        writeFile(join(out, `llm-host-${width}-feedback.png`), Buffer.from(data, "base64"))
    );

    // 4. A passing grade counts; continuing completes with the exact text and the verdict.
    const passing =
      "Hallo Frau Berg, danke für Ihre Nachricht. Sie können Ihr Rad morgen ab 10 Uhr abholen.";
    await evaluate(`document.getElementById("reply").value = ${JSON.stringify(passing)}`);
    await evaluate(`document.getElementById("grade").click()`);
    await until(`document.getElementById("continue").hidden === false`, "counting grade");
    await evaluate(`document.getElementById("continue").click()`);
    await until(`document.getElementById("player").textContent === "completed"`, "completion");
    assert.deepEqual(state.completions, [
      { action: "complete", answer: { text: passing }, verdict: RECEIPT },
    ]);

    // Nothing sensitive is reachable from the module's host object.
    const reachable = await evaluate(`window.__host().then((host) => JSON.stringify({
      keys: Object.keys(host), llm: Object.keys(host.llm), project: Object.keys(host.project),
      context: host.context, capabilities: host.capabilities,
      fns: [host.llm.respond, host.llm.grade, host.llm.info, host.project.save].map(String).join("")
    }))`);
    for (const secret of [ACCESS, GRANT, RECEIPT, "/llm/v1", "/skills/"])
      assert.equal(reachable.includes(secret), false, `module can see ${secret}`);

    const overflow = await evaluate(`document.documentElement.scrollWidth - window.innerWidth`);
    assert.ok(overflow <= 0, `no horizontal scrolling at ${width}px (${overflow})`);
    const small = await evaluate(`[...document.querySelectorAll(".llm-check button:not([hidden])")]
      .filter((b) => b.getBoundingClientRect().height < 44).length`);
    assert.equal(small, 0, "touch targets at least 44px");
    await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).then(
      ({ data }) => writeFile(join(out, `llm-host-${width}-done.png`), Buffer.from(data, "base64"))
    );
    console.log(
      `ok ${width}px: streamed (${lengths.size} steps, ${rejoins.length} rejoin), project r${state.project.revision}, graded and completed`
    );
  }
  assert.deepEqual(exceptions, []);
  const grants = state.requests.filter((r) => r.path.endsWith("/llm-grant"));
  assert.ok(grants.every((r) => r.method === "POST" && r.query === "?course=llm-course"));
  console.log(`screenshots: ${out}`);
} finally {
  socket?.close();
  browser.kill();
  await new Promise((resolve) => browser.once("exit", resolve));
  server.close();
  // Chromium helpers may still write into the profile for a moment after exit.
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
