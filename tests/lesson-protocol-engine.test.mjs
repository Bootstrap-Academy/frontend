/**
 * Protocol 2.1 adapters to the lesson engine in skills (stage 1, step 4).
 * Real SDK, real host, real room binding and real room controller; skills is a
 * stand-in that answers on the paths and in the shapes of the service plan
 * (bau/schritt-4/PLAN.md §4.2). Native services and a browser run come later.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "typescript";
import * as Vue from "vue";
import { renderToString } from "vue/server-renderer";
import { loadLessonProtocol } from "./helpers/lesson-protocol-loader.mjs";

const compiled = await loadLessonProtocol();
after(compiled.cleanup);
const source = await readFile(new URL("../utils/learningRooms.ts", import.meta.url), "utf8");
const controllerFile = join(compiled.directory, "learning-rooms-controller.mjs");
await writeFile(
  controllerFile,
  ts.transpileModule(
    source.replaceAll(
      '"./apiError"',
      JSON.stringify(new URL("../utils/apiError.ts", import.meta.url).href)
    ),
    { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }
  ).outputText
);
const { createLearningRooms } = await import(pathToFileURL(controllerFile));
const { bindEngineAssessment, engineRefusal } = await compiled.importModule("engine");
const { createRoomProtocolBinding } = await compiled.importModule("rooms");
const { LessonHost } = await compiled.importModule("host");
const { LessonSDK } = await compiled.importModule("sdk");
const { createTestTransportPair, VirtualClock } = await compiled.importModule("testing");
const { packageLocation } = await compiled.importModule("browser");

const base = JSON.parse(
  await readFile(new URL("../lesson-protocol/fixtures/manifest.json", import.meta.url))
);
const surface = JSON.parse(
  await readFile(new URL("../lesson-protocol/fixtures/messages.json", import.meta.url))
)[0].payload.surface;

const UNIT = "e1-arena";
const COURSE = "e1-course";
const REVISION = "0b9d6f3e-5a51-4f0c-9d55-3c1f4a1c0001";
const NEWER = "0b9d6f3e-5a51-4f0c-9d55-3c1f4a1c0002";
const PACKAGE = "c".repeat(64);
const HASH = "a".repeat(64);
const SEED = "000000000000000000000000000000a1";
// Submission ids as skills issues them (the pattern of its route).
const FIRST = "5b0c1d2e-0000-4000-8000-000000000001";
const SECOND = "5b0c1d2e-0000-4000-8000-000000000002";
const clone = (value) => structuredClone(value);
const flush = async () => {
  for (let i = 0; i < 8; i++) await new Promise((resolve) => setImmediate(resolve));
};
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => (resolve = yes));
  return { promise, resolve };
};
const failure = async (promise) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  assert.fail("Expected a refusal.");
};

/** A package of the engine: two server-assessed tasks, both required. */
function manifest() {
  const value = structuredClone(base);
  value.protocol = { major: 2, minor: 1 };
  value.requires = [{ id: "host.assessment", major: 1, minMinor: 0 }];
  value.optional = [];
  value.goals = ["reach", "turn"].map((id) => ({
    id,
    label: { de: id, en: id },
    subskill_id: "fixture-subskill",
    xp: 1,
    assessment: { kind: "deterministic", ref: id },
  }));
  return value;
}
const descriptor = (revision = REVISION) => ({
  id: "fixture-lesson",
  api_version: 2,
  entry_url: `https://content.pages.dev/packages/${PACKAGE}/`,
  manifest_url: `https://content.pages.dev/packages/${PACKAGE}/manifest.json`,
  manifest_hash: HASH,
  package_hash: PACKAGE,
  revision_id: revision,
});
const path = { id: "e1-path", title: { de: "E1", en: "E1" } };
const engineRoom = () => ({
  course_id: COURSE,
  unit: {
    id: UNIT,
    path_id: path.id,
    title: path.title,
    room: "custom",
    content: {},
    teaches: [],
    practices: [],
    requires: [],
    module: descriptor(),
    completion_kind: "engine",
  },
  progress: { revision: 0, state: {}, status: "new", result: null, review_id: null },
  review_available: false,
});
const publicStart = (goalId = "reach", startId = `${goalId}-start`) => ({
  startId,
  revisionId: REVISION,
  goalId,
  caseId: "open-1",
  config: { width: 4 },
  initial: { robot: { x: 0 } },
  seed: SEED,
});
const pending = (assessmentId, goalId = "reach") => ({ assessmentId, goalId, status: "pending" });
const final = (assessmentId, goalId, outcome, more = {}) => ({
  assessmentId,
  goalId,
  status: "final",
  outcome,
  counts: outcome === "passed",
  feedback: {
    source: "server",
    summary: outcome === "passed" ? "Geschafft." : "Noch nicht.",
    public_reasons: outcome === "passed" ? [] : ["Prüf auch andere Weglängen."],
  },
  ...more,
});
const refusal = (statusCode, data) => ({ statusCode, ...(data ? { data } : {}) });

/**
 * skills as a stand-in: rooms with CAS, the three learner routes of the engine,
 * and the client completion that #430 refuses for a lesson of the engine.
 */
function skills(engine = {}, row = engineRoom()) {
  const calls = [];
  const state = { row, owner: "alpha", gone: false };
  const routes = {
    start: (goalId) => ({ start: publicStart(goalId), assessments: [] }),
    submit: () => pending(FIRST),
    status: (id) => pending(id),
    save: () => {},
    ...engine,
  };
  async function request(requestPath, method = "GET", body) {
    calls.push({ path: requestPath, method, body: body && clone(body), owner: state.owner });
    const url = new URL(requestPath, "https://synthetic-api.invalid");
    const route = url.pathname;
    let match;
    if (route === "/skills/rooms/capabilities") return { enabled: true };
    if ((match = route.match(/^\/skills\/engine\/units\/([^/]+)\/tasks\/([^/]+)\/start$/)))
      return clone(await routes.start(match[2], body));
    if ((match = route.match(/^\/skills\/engine\/units\/([^/]+)\/tasks\/([^/]+)\/submissions$/)))
      return clone(await routes.submit(match[2], body));
    if ((match = route.match(/^\/skills\/engine\/submissions\/([^/]+)$/)))
      return clone(await routes.status(decodeURIComponent(match[1])));
    // The unit was withdrawn: skills no longer finds it (engine switched off, no active revision).
    if (method === "GET" && state.gone && route !== "/skills/rooms")
      throw refusal(404, { detail: "Learning unit not found" });
    if (method === "GET")
      return route === "/skills/rooms"
        ? { paths: [path], path, next: clone(state.row) }
        : clone(state.row);
    if (method === "PUT") {
      await routes.save(body);
      if (body.expected_revision !== state.row.progress.revision) throw refusal(409);
      state.row.progress.state = clone(body.state);
      // Like skills: a save starts a new room and keeps a completed one completed.
      if (state.row.progress.status === "new") state.row.progress.status = "in_progress";
      state.row.progress.revision++;
      return clone(state.row);
    }
    // skills #430: a client cannot complete or skip a lesson of the engine.
    throw refusal(route.endsWith("/complete") && body?.action === "skip" ? 403 : 409, {
      detail: "A lesson of the engine is completed by its booked passes",
    });
  }
  return { calls, state, routes, request };
}

async function opened(t, service) {
  let view;
  const controller = createLearningRooms({
    id: randomUUID,
    changed: (next) => (view = next),
    request: service.request,
  });
  t.after(() => controller.dispose());
  await controller.start(true, path.id, true, { courseId: COURSE, unitId: UNIT });
  return { controller, view: () => view };
}

/** The whole host side of one opened lesson, and a frame that speaks to it through the SDK. */
async function fixture(t, engine = {}, row = engineRoom()) {
  const service = skills(engine, row);
  const { controller, view } = await opened(t, service);
  const owner = () => service.state.owner;
  const stale = [];
  const time = { now: 0 };
  const actions = createRoomProtocolBinding(controller, owner, () => time.now).bind({
    unitId: UNIT,
    schemaVersion: 1,
    initialState: {},
    resetConfirm: async () => true,
    navigate: async () => true,
    progress: () => {},
    busy: () => {},
  });
  actions.assessment = bindEngineAssessment({
    request: service.request,
    room: controller,
    owner,
    binding: {
      unitId: UNIT,
      revisionId: REVISION,
      packageHash: PACKAGE,
      stale: () => stale.push(true),
    },
    now: () => time.now,
  });
  assert.equal(actions.assessment !== undefined, true);
  const pair = createTestTransportPair();
  const clock = new VirtualClock();
  const host = new LessonHost({
    manifest: manifest(),
    manifestHash: HASH,
    transport: pair.host,
    actions,
    clock,
    context: { locale: "de", content: {}, disabled: false, surface },
    validateState: () => {},
    status: () => {},
  });
  const sdk = new LessonSDK({
    manifest: manifest(),
    manifestHash: HASH,
    transport: pair.lesson,
    clock,
  });
  const events = [];
  for (const type of ["assessment.result", "reward.committed"])
    sdk.on(type, (payload) => events.push([type, payload]));
  t.after(() => {
    sdk.dispose();
    host.dispose();
  });
  const started = sdk.start();
  host.start();
  await started;
  sdk.ready("main");
  await flush();
  assert.equal(host.phase, "running");
  const engineCalls = () => service.calls.filter(({ path }) => path.startsWith("/skills/engine/"));
  const completions = () => service.calls.filter(({ path }) => path.includes("/complete"));
  const writes = () => service.calls.filter(({ method }) => method === "PUT");
  return {
    service,
    controller,
    view,
    host,
    sdk,
    clock,
    time,
    events,
    stale,
    engineCalls,
    completions,
    writes,
  };
}

test("only a lesson of the engine whose room names the loaded revision gets adapters", async (t) => {
  const service = skills();
  const { controller } = await opened(t, service);
  const binding = { unitId: UNIT, revisionId: REVISION, packageHash: PACKAGE, stale: () => {} };
  const bound = (changes = {}, owner = "alpha") =>
    bindEngineAssessment({
      request: service.request,
      room: controller,
      owner: () => owner,
      binding: { ...binding, ...changes },
    }) !== undefined;
  assert.equal(bound(), true);
  assert.equal(bound({ revisionId: NEWER }), false);
  assert.equal(bound({ packageHash: "d".repeat(64) }), false);
  assert.equal(bound({ unitId: "another-unit" }), false);
  assert.equal(bound({}, null), false);

  // The same package in a room that is no lesson of the engine gets nothing.
  service.state.row.unit.completion_kind = "introduced";
  await controller.protocolRead();
  assert.equal(bound(), false);
  assert.equal(
    service.calls.some(({ path }) => path.startsWith("/skills/engine/")),
    false
  );
});

test("start, submission and status take the service's paths; the frame's operation reaches it as requestId", async (t) => {
  let ready = false;
  let outage = 1;
  const f = await fixture(t, {
    start: (goalId) => {
      if (outage-- > 0) throw refusal(503, { code: "unavailable", retryable: true });
      return { start: publicStart(goalId), assessments: [] };
    },
    status: (id) => (ready ? final(id, "reach", "not_passed") : pending(id)),
  });
  // Ä32a: the same operation reaches the service with the same id after an answer that did not come.
  const lost = await failure(f.sdk.startTask("reach", "op-start"));
  assert.deepEqual([lost.code, lost.retryable], ["unavailable", true]);
  assert.deepEqual(await f.sdk.retry("op-start"), { start: publicStart(), assessments: [] });
  const [first, second] = f.engineCalls();
  assert.equal(first.path, `/skills/engine/units/${UNIT}/tasks/reach/start`);
  assert.equal(first.method, "POST");
  assert.deepEqual(Object.keys(first.body).sort(), ["courseId", "requestId", "revisionId"]);
  assert.deepEqual([first.body.revisionId, first.body.courseId], [REVISION, COURSE]);
  assert.match(first.body.requestId, /^[A-Za-z0-9_-]{1,100}$/);
  assert.deepEqual(second.body, first.body);
  // A confirmed operation is answered by the host and does not reach the service again.
  await f.sdk.retry("op-start");
  assert.equal(f.engineCalls().length, 2);

  const answer = { startId: "reach-start", input: { kind: "program", source: "move();" } };
  await f.sdk.saveState({
    formatVersion: 1,
    activeGoalId: "reach",
    plans: { reach: answer.input },
  });
  assert.deepEqual(await f.sdk.submitAssessment("reach", answer), pending(FIRST));
  const submitted = f.engineCalls()[2];
  assert.equal(submitted.path, `/skills/engine/units/${UNIT}/tasks/reach/submissions`);
  assert.deepEqual(
    { ...submitted.body, requestId: "" },
    { requestId: "", stateRevision: 1, answer, courseId: COURSE }
  );
  assert.notEqual(submitted.body.requestId, first.body.requestId);

  ready = true;
  f.clock.advanceTo(1000);
  await flush();
  const read = f.engineCalls()[3];
  assert.deepEqual([read.path, read.method], [`/skills/engine/submissions/${FIRST}`, "GET"]);
  assert.deepEqual(f.events, [["assessment.result", final(FIRST, "reach", "not_passed")]]);
});

test("host task 1: a 409 is a final refusal with the service's code; no answer, 408, 5xx and 429 may be retried", () => {
  const cases = [
    [refusal(409, { code: "conflict", message: "x", retryable: true }), "conflict", false],
    [refusal(409, { code: "start_required", retryable: false }), "start_required", false],
    [refusal(409, { code: "revision_changed" }), "revision_changed", false],
    [
      refusal(409, { detail: "A lesson of the engine has no practice round yet" }),
      "conflict",
      false,
    ],
    [refusal(409, { code: "Not A Code" }), "conflict", false],
    [refusal(404, { detail: "The lesson engine is unavailable" }), "not_found", false],
    [refusal(422, { detail: [{ msg: "invalid" }] }), "invalid_message", false],
    [refusal(422, { code: "plan_invalid" }), "plan_invalid", false],
    [refusal(413), "too_large", false],
    [refusal(401, { error: "learning_session_required" }), "no_access", false],
    [refusal(403, { detail: { code: "daily_limit_reached" } }), "daily_limit_reached", false],
    [refusal(429), "rate_limited", true],
    [refusal(503, { code: "unavailable", retryable: false }), "unavailable", true],
    [refusal(502), "offline", true],
    [refusal(500, { detail: "Internal Server Error" }), "offline", true],
    [refusal(408), "offline", true],
    [new Error("fetch failed"), "offline", true],
    [{ name: "FetchError", response: { status: 504 } }, "offline", true],
  ];
  for (const [error, code, retryable] of cases) {
    const mapped = engineRefusal(error);
    assert.deepEqual([mapped.code, mapped.retryable], [code, retryable], JSON.stringify(error));
    // The service's prose stays out of the frame.
    assert.equal(/practice round|Internal Server|invalid$/.test(mapped.message), false);
  }
});

test("refusals of the shared helpers of skills carry no retryable and are read by their status", () => {
  // The bodies as skills sends them from the account guard, path access, daily limit and validation.
  const cases = [
    [refusal(401, { detail: "This account is no longer available" }), "no_access", false],
    [
      refusal(403, { detail: "Open the course to get access to these lessons" }),
      "no_access",
      false,
    ],
    [refusal(404, { detail: "This lesson is not part of that course" }), "not_found", false],
    [
      refusal(409, { detail: "Diese Anfrage gehört …", code: "request_id_conflict", daily: null }),
      "request_id_conflict",
      false,
    ],
    [
      refusal(422, { detail: [{ type: "string_pattern_mismatch", loc: ["body"], msg: "x" }] }),
      "invalid_message",
      false,
    ],
    [
      refusal(429, { detail: "Für heute …", code: "daily_limit_reached", daily: {} }),
      "daily_limit_reached",
      true,
    ],
    [
      refusal(429, { detail: "Too many saves; the next one is taken in a moment" }),
      "rate_limited",
      true,
    ],
    [
      refusal(503, { detail: "…", code: "learning_access_unavailable", daily: null }),
      "learning_access_unavailable",
      true,
    ],
  ];
  for (const [error, code, retryable] of cases) {
    const mapped = engineRefusal(error);
    assert.deepEqual([mapped.code, mapped.retryable], [code, retryable], JSON.stringify(error));
  }
  // A 429 names its wait: Retry-After where the browser may read it, `retry_after`, else 30 s.
  const headers = (value) => ({ response: { status: 429, headers: new Headers(value) } });
  const waits = [
    [{ statusCode: 429, ...headers({ "retry-after": "7" }) }, 7],
    [refusal(429, { retry_after: 12 }), 12],
    [refusal(429), 30],
    [{ statusCode: 429, ...headers({ "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" }) }, 30],
    [{ statusCode: 429, ...headers({ "retry-after": "0" }) }, 30],
  ];
  for (const [error, seconds] of waits)
    assert.equal(engineRefusal(error).details.retryAfterSeconds, seconds, JSON.stringify(error));
  assert.equal("retryAfterSeconds" in engineRefusal(refusal(503)).details, false);
});

test("a refused submission reaches the frame as a final refusal; an outage as a retry of the same operation", async (t) => {
  const answers = [
    refusal(409, { code: "conflict", retryable: true }),
    refusal(503),
    pending(SECOND),
  ];
  const f = await fixture(t, {
    submit: () => {
      const next = answers.shift();
      if (next.statusCode) throw next;
      return next;
    },
  });
  const answer = { startId: "reach-start", input: { kind: "program", source: "" } };
  const refused = await failure(f.sdk.submitAssessment("reach", answer, { id: "first" }));
  assert.deepEqual([refused.code, refused.retryable], ["conflict", false]);
  // A refusal does not hold the host: the learner's next submission goes out.
  const lost = await failure(f.sdk.submitAssessment("reach", answer, { id: "second" }));
  assert.deepEqual([lost.code, lost.retryable], ["offline", true]);
  // After an answer that did not come, only the same operation may go again.
  assert.equal(
    (await failure(f.sdk.submitAssessment("reach", answer, { id: "third" }))).code,
    "locked"
  );
  assert.deepEqual(await f.sdk.retry("second"), pending(SECOND));
  const [, second, third] = f.engineCalls();
  assert.equal(third.body.requestId, second.body.requestId);
  assert.equal(f.completions().length, 0);
});

test("host task 2: a start answer with another task's pass reaches the frame unchanged and its handle completes the unit", async (t) => {
  const earlier = final("earlier", "reach", "passed", {
    xp: { awardId: "a-reach", xp: 1, persisted: true },
  });
  let f;
  f = await fixture(t, {
    start: (goalId) => ({ start: publicStart(goalId), assessments: [earlier] }),
    submit: (goalId) => {
      // The service books the last required pass and the unit in one transaction.
      f.service.state.row.progress.status = "completed";
      f.service.state.row.progress.result = { kind: "passed" };
      return final("now", goalId, "passed", {
        xp: { awardId: "a-turn", xp: 1, persisted: true },
        completed: true,
      });
    },
  });
  const started = await f.sdk.startTask("turn");
  const [shown] = started.assessments;
  const { receiptHandle, ...passed } = shown;
  assert.deepEqual(passed, earlier);
  assert.match(receiptHandle, /^[a-f0-9-]{36}$/);
  assert.deepEqual(started.start, publicStart("turn"));

  // The pass of one task is no pass of the unit: the room is read, nothing is completed by the client.
  const request = (goalIds, receiptHandles, id) =>
    f.sdk.request("completion.request", { goalIds, stateRevision: 0, receiptHandles }, { id });
  assert.deepEqual(await request(["reach"], [receiptHandle], "early"), {
    outcome: "pending",
    persisted: false,
  });

  const now = await f.sdk.submitAssessment("turn", {
    startId: "turn-start",
    input: { kind: "program", source: "turnLeft();" },
  });
  assert.equal(now.completed, true);
  assert.deepEqual(await request(["reach", "turn"], [receiptHandle, now.receiptHandle], "done"), {
    outcome: "completed",
    persisted: true,
  });
  assert.equal(f.view().room.progress.status, "completed");
  assert.equal(f.completions().length, 0);
});

test("host task 3: a start that reports the unit completed elsewhere brings the page up to date", async (t) => {
  let f;
  f = await fixture(t, {
    start: (goalId) => {
      f.service.state.row.progress.status = "completed";
      f.service.state.row.progress.result = { kind: "passed" };
      return {
        start: publicStart(goalId),
        assessments: [
          final("a", "reach", "passed", { completed: true }),
          final("b", "turn", "passed", { completed: true }),
        ],
      };
    },
  });
  assert.equal(f.view().room.progress.status, "new");
  await f.sdk.startTask("reach");
  await flush();
  assert.equal(f.view().room.progress.status, "completed");
  assert.equal(f.completions().length, 0);
});

test("Ä43: a reopened completed lesson of the engine saves and books a task played again", async (t) => {
  const completed = engineRoom();
  completed.progress = {
    revision: 4,
    state: { formatVersion: 1, activeGoalId: "reach", plans: {} },
    status: "completed",
    result: { kind: "passed" },
    review_id: null,
  };
  const earlier = final(FIRST, "reach", "passed", { completed: true });
  const f = await fixture(
    t,
    {
      start: (goalId) => ({ start: publicStart(goalId, "reach-again"), assessments: [earlier] }),
      submit: (goalId) => final(SECOND, goalId, "passed", { completed: true }),
    },
    completed
  );
  // skills offers no practice round for it (F1 of the browser run), and the page asks for none.
  assert.equal(
    f.service.calls.some(({ path }) => path.includes("/review")),
    false
  );
  assert.equal((await f.sdk.startTask("reach")).start.startId, "reach-again");
  const work = {
    formatVersion: 1,
    activeGoalId: "reach",
    plans: { reach: { kind: "program", source: "move();" } },
  };
  assert.equal((await f.sdk.saveState(work, { id: "replay-save" })).revision, 5);
  const again = await f.sdk.submitAssessment("reach", {
    startId: "reach-again",
    input: work.plans.reach,
  });
  assert.deepEqual([again.outcome, again.counts, "xp" in again], ["passed", true, false]);
  assert.deepEqual(f.service.state.row.progress.state, work);
  assert.equal(f.view().room.progress.status, "completed");
  assert.equal(f.completions().length, 0);
});

test("Ä32b: a start refused for another revision loads the newer package, or ends the session", async (t) => {
  const changed = { code: "revision_changed", retryable: false };
  const newer = await fixture(t, {
    start: () => {
      newer.service.state.row.unit.module = descriptor(NEWER);
      throw refusal(409, changed);
    },
  });
  const refused = await failure(newer.sdk.startTask("reach"));
  assert.deepEqual([refused.code, refused.retryable], ["revision_changed", false]);
  // The page now holds the newer descriptor; its player reloads with it.
  assert.equal(newer.view().room.unit.module.revision_id, NEWER);
  assert.equal(newer.stale.length, 0);

  const same = await fixture(t, {
    start: () => {
      throw refusal(409, changed);
    },
  });
  assert.equal((await failure(same.sdk.startTask("reach"))).code, "revision_changed");
  assert.equal(same.view().room.unit.module.revision_id, REVISION);
  assert.equal(same.stale.length, 1);
  // Another refusal of a start is no reason to end the session.
  const busy = await fixture(t, {
    start: () => {
      throw refusal(409, { code: "pending", retryable: true });
    },
  });
  assert.equal((await failure(busy.sdk.startTask("reach"))).code, "pending");
  assert.equal(busy.stale.length, 0);
});

test("Ä40 a: a start refused because the unit or its task is gone ends the session", async (t) => {
  // The engine was switched off: the route answers 404 without a code, the room is gone as well.
  const withdrawn = await fixture(t, {
    start: () => {
      withdrawn.service.state.gone = true;
      throw refusal(404, { detail: "The lesson engine is unavailable" });
    },
  });
  const refused = await failure(withdrawn.sdk.startTask("reach"));
  assert.deepEqual([refused.code, refused.retryable], ["not_found", false]);
  assert.equal(withdrawn.stale.length, 1);
  assert.equal(
    withdrawn.service.calls.some(({ path }) => path.startsWith(`/skills/rooms/${UNIT}?`)),
    true
  );

  // The task is missing in the active revision, the room still names the loaded one.
  const missing = await fixture(t, {
    start: () => {
      throw refusal(404, { code: "not_found", retryable: false });
    },
  });
  assert.equal((await failure(missing.sdk.startTask("reach"))).code, "not_found");
  assert.equal(missing.stale.length, 1);
});

test("Ä40 b: the status read takes the submission ids of the route only", async (t) => {
  const f = await fixture(t, { status: (id) => final(id, "reach", "not_passed") });
  for (const id of ["..", "../units", "submission-1", "A".repeat(36), "%2e%2e"])
    assert.equal((await failure(f.sdk.assessmentStatus(id))).code, "invalid_message", id);
  assert.equal(f.engineCalls().length, 0);
  const id = SECOND;
  assert.equal((await f.sdk.assessmentStatus(id)).assessmentId, id);
  assert.deepEqual(
    f.engineCalls().map(({ path }) => path),
    [`/skills/engine/submissions/${id}`]
  );
});

test("Ä41 b: after a 429 a start goes out again only once its Retry-After has passed", async (t) => {
  let limited = true;
  const f = await fixture(t, {
    start: (goalId) => {
      if (limited) {
        limited = false;
        throw {
          statusCode: 429,
          data: { detail: "Too many requests" },
          response: { status: 429, headers: new Headers({ "retry-after": "7" }) },
        };
      }
      return { start: publicStart(goalId), assessments: [] };
    },
  });
  const first = await failure(f.sdk.startTask("reach", "op"));
  assert.deepEqual(
    [first.code, first.retryable, first.details.retryAfterSeconds],
    ["rate_limited", true, 7]
  );
  f.time.now = 6000;
  const early = await failure(f.sdk.retry("op"));
  assert.deepEqual(
    [early.code, early.retryable, early.details.retryAfterSeconds],
    ["rate_limited", true, 1]
  );
  assert.equal(f.engineCalls().length, 1);
  f.time.now = 7000;
  assert.deepEqual(await f.sdk.retry("op"), { start: publicStart(), assessments: [] });
  const [sent, again] = f.engineCalls();
  assert.equal(again.body.requestId, sent.body.requestId);
});

test("Ä41 b: a save refused with 429 waits its Retry-After, 30 s when the browser cannot read it", async (t) => {
  let limited = true;
  const f = await fixture(t, {
    save: () => {
      if (limited) {
        limited = false;
        throw refusal(429, { detail: "Too many saves; the next one is taken in a moment" });
      }
    },
  });
  const work = { formatVersion: 1, activeGoalId: "reach", plans: {} };
  const first = await failure(f.sdk.saveState(work, { id: "save-op" }));
  assert.deepEqual(
    [first.code, first.retryable, first.details.retryAfterSeconds],
    ["rate_limited", true, 30]
  );
  f.time.now = 29_999;
  assert.equal((await failure(f.sdk.retry("save-op"))).code, "rate_limited");
  // Only the same operation may go again, and it waits as well.
  assert.equal((await failure(f.sdk.saveState(work, { id: "other" }))).code, "locked");
  assert.equal(f.writes().length, 1);
  f.time.now = 30_000;
  assert.equal((await f.sdk.retry("save-op")).revision, 1);
  const [sent, again] = f.writes();
  assert.deepEqual(again.body, sent.body);
  assert.deepEqual(f.service.state.row.progress.state, work);
});

test("Ä40 c: the course overview names a passed lesson of the engine like a solved one", async () => {
  const file = "components/course/LearningUnit.vue";
  const { descriptor } = parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
  let code = ts.transpileModule(
    compileScript(descriptor, { id: "unit", inlineTemplate: true }).content,
    {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    }
  ).outputText;
  const stub = (source) => `data:text/javascript,${encodeURIComponent(source)}`;
  code = code
    .replace(/from ["']vue["']/g, `from ${JSON.stringify(import.meta.resolve("vue"))}`)
    .replace(
      /from ["']#components["']/,
      `from ${JSON.stringify(stub("export const NuxtLink = 'a';"))}`
    )
    .replace(
      /from ["']~\/utils\/courseJourney["']/,
      `from ${JSON.stringify(stub("export const courseRoomLocation = () => '/learn';"))}`
    );
  const target = join(compiled.directory, "learning-unit.mjs");
  await writeFile(target, code);
  globalThis.useCourseExperienceCopy = () => ({
    copy: Vue.ref({ solved: "Solved by you", introduction: "Introduced", inProgress: "Begun" }),
    localized: (value) => value.en,
  });
  const LearningUnit = (await import(pathToFileURL(target))).default;
  const label = async (kind) => {
    const unit = {
      id: UNIT,
      title: { de: "E1", en: "E1" },
      room: "custom",
      status: "completed",
      result: { kind },
      available: true,
    };
    const html = await renderToString(
      Vue.createSSRApp({
        render: () => Vue.h(LearningUnit, { unit, courseId: COURSE, pathId: path.id }),
      })
    );
    return html.match(/<small>([^<]*)<\/small>/)[1];
  };
  assert.equal(await label("passed"), "Solved by you");
  assert.equal(await label("solved"), "Solved by you");
  assert.equal(await label("introduced"), "Introduced");
  delete globalThis.useCourseExperienceCopy;
});

test("an answer that arrives after the account changed is cancelled", async (t) => {
  const service = skills();
  const { controller } = await opened(t, service);
  const gate = deferred();
  service.routes.start = async (goalId) => {
    await gate.promise;
    return { start: publicStart(goalId), assessments: [] };
  };
  const adapters = bindEngineAssessment({
    request: service.request,
    room: controller,
    owner: () => service.state.owner,
    binding: { unitId: UNIT, revisionId: REVISION, packageHash: PACKAGE, stale: () => {} },
  });
  const late = adapters.start("reach", "op");
  service.state.owner = "beta";
  gate.resolve();
  assert.equal((await failure(late)).code, "cancelled");
  // Nothing goes out for the new account under the old binding.
  assert.equal((await failure(adapters.status(FIRST))).code, "cancelled");
  assert.equal(service.calls.filter(({ owner }) => owner === "beta").length, 0);
});

test("the room binding never skips or completes a lesson of the engine itself", async (t) => {
  const service = skills();
  const { controller } = await opened(t, service);
  const actions = createRoomProtocolBinding(controller, () => "alpha").bind({
    unitId: UNIT,
    schemaVersion: 1,
    initialState: {},
    introduction: { match: {}, answer: { viewed: true } },
    resetConfirm: async () => true,
    navigate: async () => true,
    progress: () => {},
    busy: () => {},
  });
  assert.equal(await actions.navigate("skip"), false);
  assert.equal(
    (await failure(actions.complete(["reach"], 0, randomUUID()))).code,
    "invalid_receipt"
  );
  assert.equal(
    service.calls.some(({ method }) => method !== "GET"),
    false
  );
});

test("a package's revision must be an operation id of the protocol", () => {
  const location = (revision) =>
    packageLocation(
      { ...descriptor(), revision_id: revision },
      "https://content.pages.dev",
      "https://test.bootstrap.academy"
    );
  assert.equal(location(REVISION).base, `https://content.pages.dev/packages/${PACKAGE}/`);
  const withoutRevision = descriptor();
  delete withoutRevision.revision_id;
  packageLocation(withoutRevision, "https://content.pages.dev", "https://test.bootstrap.academy");
  for (const revision of ["", "x".repeat(101), "../up", null, 7])
    assert.throws(() => location(revision), { code: "invalid_message" }, String(revision));
});
