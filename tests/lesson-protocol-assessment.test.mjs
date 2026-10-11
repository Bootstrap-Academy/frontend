/**
 * Protocol 2.1: the capability host.assessment 1.0 and the request task.start.
 * Real SDK and real host over the test transport; the server is a stand-in
 * that answers with the shapes of the message schema.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { loadLessonProtocol } from "./helpers/lesson-protocol-loader.mjs";

const compiled = await loadLessonProtocol();
after(compiled.cleanup);
const { LessonHost } = await compiled.importModule("host");
const { LessonSDK } = await compiled.importModule("sdk");
const { createTestTransportPair, VirtualClock } = await compiled.importModule("testing");
const { validateManifest, validateMessage, operations, PROTOCOL_MINOR, HOST_ASSESSMENT } =
  await compiled.importModule("validation");
const { verifyLessonPackage, sha256 } = await compiled.importModule("browser");
const { canonicalJson } = await compiled.importModule("schema");

const base = JSON.parse(
  await readFile(new URL("../lesson-protocol/fixtures/manifest.json", import.meta.url))
);
const surface = JSON.parse(
  await readFile(new URL("../lesson-protocol/fixtures/messages.json", import.meta.url))
)[0].payload.surface;

const REVISION = "0b9d6f3e-5a51-4f0c-9d55-3c1f4a1c0001";
const PACKAGE = "c".repeat(64);
const HASH = "a".repeat(64);
const SEED = "000000000000000000000000000000a1";

/** A package of protocol 2.minor with one server-assessed goal and one introduction. */
function manifestFor(minor, requires = true) {
  const manifest = structuredClone(base);
  manifest.protocol = { major: 2, minor };
  const capability = { id: "host.assessment", major: 1, minMinor: 0 };
  manifest.requires = requires ? [capability] : [];
  manifest.optional = [];
  manifest.goals = [
    {
      id: "reach",
      label: { de: "Erreiche das Ziel", en: "Reach the target" },
      subskill_id: "fixture-subskill",
      xp: 1,
      assessment: { kind: "deterministic", ref: "reach" },
    },
    { ...structuredClone(base.goals[0]), id: "look" },
  ];
  return manifest;
}

const publicStart = (startId = "start-1", goalId = "reach") => ({
  startId,
  revisionId: REVISION,
  goalId,
  caseId: "open-1",
  config: { width: 4 },
  initial: { robot: { x: 0 } },
  seed: SEED,
});
const pending = (assessmentId, goalId = "reach") => ({ assessmentId, goalId, status: "pending" });
const final = (assessmentId, outcome, more = {}) => ({
  assessmentId,
  goalId: "reach",
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
const award = { awardId: "award-reach", xp: 1, persisted: true };

const flush = async () => {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
};

/** The stand-in for the server. Its answers are whatever a test puts into `server`. */
function standIn(server) {
  return {
    revisionId: REVISION,
    packageHash: PACKAGE,
    start: async (goalId, key) => {
      server.calls.push(["start", goalId, key]);
      return structuredClone(await server.start(goalId));
    },
    submit: async (goalId, stateRevision, answer, key) => {
      server.calls.push(["submit", goalId, stateRevision, answer, key]);
      return structuredClone(await server.submit(goalId, answer));
    },
    status: async (assessmentId) => {
      server.calls.push(["status", assessmentId]);
      return structuredClone(await server.status(assessmentId));
    },
    complete: async (goalIds, stateRevision, key) => {
      server.calls.push(["complete", goalIds, stateRevision, key]);
      return structuredClone(await server.complete(goalIds));
    },
  };
}

async function fixture(t, options = {}) {
  const manifest = options.manifest ?? manifestFor(1);
  const pair = createTestTransportPair();
  const clock = new VirtualClock();
  let state = { revision: 0, schemaVersion: 1, value: {} };
  const server = {
    calls: [],
    start: () => ({ start: publicStart(), assessments: [] }),
    submit: () => pending("submission-1"),
    status: (id) => pending(id),
    complete: () => ({ outcome: "completed", persisted: true }),
    ...options.server,
  };
  const phases = [];
  const host = new LessonHost({
    manifest,
    manifestHash: HASH,
    transport: pair.host,
    actions: {
      current: () => true,
      read: async () => structuredClone(state),
      save: async (value, revision) => {
        state = { revision: revision + 1, schemaVersion: 1, value };
        return structuredClone(state);
      },
      reset: async () => null,
      complete: async () => ({ outcome: "introduced", persisted: true }),
      navigate: async () => false,
      progress: () => {},
      busy: () => {},
      ...(options.adapters === false ? {} : { assessment: standIn(server) }),
    },
    clock,
    context: { locale: "de", content: {}, disabled: !!options.disabled, surface },
    validateState: () => {},
    status: (phase) => phases.push(phase),
  });
  const sdk = new LessonSDK({ manifest, manifestHash: HASH, transport: pair.lesson, clock });
  const events = [];
  for (const type of ["assessment.result", "reward.committed"])
    sdk.on(type, (payload) => events.push([type, payload]));
  t.after(() => {
    sdk.dispose();
    host.dispose();
  });
  const started = sdk.start();
  host.start();
  if (options.expectStart === false) {
    // Disposal ends a start that never completes; tests that expect the refusal await it themselves.
    started.catch(() => {});
    return { host, sdk, pair, clock, server, phases, started };
  }
  const init = await started;
  sdk.ready("main");
  await flush();
  assert.equal(host.phase, "running");
  return { host, sdk, pair, clock, server, phases, init, events };
}
const failure = async (promise) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  assert.fail("Expected a refusal.");
};

test("the schema names task.start and binds it to host.assessment 1.0", () => {
  assert.equal(PROTOCOL_MINOR, 1);
  assert.deepEqual(operations["task.start"].capability, {
    id: HOST_ASSESSMENT.id,
    major: 1,
    minMinor: 0,
  });
  assert.deepEqual(operations["task.start"].senders, ["lesson"]);
  // The assessment messages of 2.0 stay as they were: no capability on the operation itself.
  for (const type of ["assessment.submit", "assessment.status", "assessment.result"])
    assert.equal(operations[type].capability, undefined, type);
  const envelope = (payload) => ({
    protocol: { major: 2, minor: 1 },
    sessionId: "s",
    seq: 1,
    id: "start-1",
    kind: "request",
    type: "task.start",
    payload,
  });
  validateMessage(envelope({ goalId: "reach", revisionId: REVISION }), { sender: "lesson" });
  assert.throws(() => validateMessage(envelope({ goalId: "reach" }), { sender: "lesson" }));
  assert.throws(() =>
    validateMessage(envelope({ goalId: "reach", revisionId: REVISION }), { sender: "host" })
  );
  const response = (data) => ({
    ...envelope({ ok: true, data }),
    id: "host-9",
    kind: "response",
    type: "rpc.result",
    replyTo: "start-1",
  });
  const answer = (data) =>
    validateMessage(response(data), { sender: "host", requestType: "task.start" });
  answer({ start: publicStart(), assessments: [pending("a"), final("b", "not_passed")] });
  assert.throws(() => answer({ start: { ...publicStart(), seed: "A1" }, assessments: [] }));
  assert.throws(() => answer({ start: publicStart() }));
  // A view of the server names its goal; a verdict names server feedback with public reasons.
  assert.throws(() =>
    answer({ start: publicStart(), assessments: [{ assessmentId: "a", status: "pending" }] })
  );
  const silent = final("b", "not_passed");
  delete silent.feedback.public_reasons;
  assert.throws(() => answer({ start: publicStart(), assessments: [silent] }));
  assert.throws(() => answer({ start: publicStart(), assessments: [final("b", "introduced")] }));
});

test("a 2.0 package keeps protocol 2.0 and gets no assessment, whatever the player has bound", async (t) => {
  const f = await fixture(t, { manifest: manifestFor(0, false) });
  assert.deepEqual(f.init.capabilities, []);
  assert.deepEqual([...new Set(f.pair.messages.map((row) => row.message.protocol.minor))], [0]);
  assert.deepEqual(
    f.pair.messages.find((row) => row.message.type === "lesson.hello").message.payload.sdk,
    {
      major: 1,
      minor: 0,
    }
  );
  assert.equal((await failure(f.sdk.startTask("reach"))).code, "missing_capability");
  // As before 2.1: the operation exists in the schema, the host offers nothing behind it.
  const refused = await failure(
    f.sdk.submitAssessment("reach", { startId: "start-1", input: { kind: "program", source: "" } })
  );
  assert.equal(refused.code, "unsupported");
  assert.deepEqual(f.server.calls, []);
});

test("a 2.0 package that names host.assessment still does not start", async (t) => {
  const f = await fixture(t, { manifest: manifestFor(0), expectStart: false });
  await flush();
  assert.equal(f.host.phase, "recoverable-error");
});

test("a 2.1 package that requires host.assessment does not start while no adapter is bound", async (t) => {
  const f = await fixture(t, { adapters: false, expectStart: false });
  await flush();
  assert.equal(f.host.phase, "recoverable-error");
  f.clock.advanceTo(10000);
  assert.equal((await failure(f.started)).code, "timeout");
});

test("a package of a newer minor version is refused before any message", () => {
  const manifest = manifestFor(2);
  assert.throws(
    () =>
      new LessonHost({
        manifest,
        manifestHash: HASH,
        transport: createTestTransportPair().host,
        actions: {},
        context: { locale: "de", content: {}, disabled: false, surface },
        validateState: () => {},
        status: () => {},
      }),
    { code: "unsupported" }
  );
  assert.throws(
    () =>
      new LessonSDK({ manifest, manifestHash: HASH, transport: createTestTransportPair().lesson }),
    { code: "unsupported" }
  );
  validateManifest(manifest);
});

test("the grant binds the revision of the loaded bytes; both sides speak 2.1", async (t) => {
  const f = await fixture(t);
  assert.deepEqual(f.init.capabilities, [
    {
      id: "host.assessment",
      major: 1,
      minor: 0,
      implementation: "academy-server",
      sha256: PACKAGE,
      revisionId: REVISION,
    },
  ]);
  assert.equal(f.sdk.capability("host.assessment").revisionId, REVISION);
  assert.deepEqual([...new Set(f.pair.messages.map((row) => row.message.protocol.minor))], [1]);
  assert.equal(
    f.pair.messages.find((row) => row.message.type === "lesson.hello").message.payload.sdk.minor,
    1
  );
});

test("an optional host.assessment is granted with adapters and left out without", async (t) => {
  const manifest = manifestFor(1, false);
  manifest.optional = [{ id: "host.assessment", major: 1, minMinor: 0 }];
  const granted = await fixture(t, { manifest });
  assert.equal(granted.init.capabilities.length, 1);
  const without = await fixture(t, { manifest, adapters: false });
  assert.deepEqual(without.init.capabilities, []);
  assert.equal((await failure(without.sdk.startTask("reach"))).code, "missing_capability");
});

test("task.start hands on the public start for the revision of the loaded bytes", async (t) => {
  const f = await fixture(t);
  const result = await f.sdk.startTask("reach", "start-op");
  assert.deepEqual(result, { start: publicStart(), assessments: [] });
  assert.equal(f.server.calls.length, 1);
  assert.deepEqual(f.server.calls[0].slice(0, 2), ["start", "reach"]);
  // The request on the wire carries the goal and the revision, and nothing about a band.
  const sent = f.pair.messages.find((row) => row.message.type === "task.start").message;
  assert.deepEqual(sent.payload, { goalId: "reach", revisionId: REVISION });
  // The same operation is answered once.
  await f.sdk.retry("start-op");
  assert.equal(f.server.calls.length, 1);
});

test("a start for another revision, another goal kind or a foreign start is refused", async (t) => {
  const f = await fixture(t, {
    server: { start: () => ({ start: publicStart("start-1", "look"), assessments: [] }) },
  });
  const stale = await failure(
    f.sdk.request("task.start", { goalId: "reach", revisionId: "older-revision" })
  );
  assert.equal(stale.code, "conflict");
  const introduced = await failure(
    f.sdk.request("task.start", { goalId: "look", revisionId: REVISION })
  );
  assert.equal(introduced.code, "invalid_message");
  assert.deepEqual(f.server.calls, []);
  // The stand-in answers with the start of another goal: the host does not pass it on.
  assert.equal((await failure(f.sdk.startTask("reach"))).code, "invalid_receipt");
});

test("submissions listed by a start are read again at once; a pass that arrives now announces its XP", async (t) => {
  let ready = false;
  const f = await fixture(t, {
    server: {
      start: () => ({
        start: publicStart(),
        assessments: [pending("waiting"), final("earlier", "passed", { xp: award })],
      }),
      status: (id) =>
        ready
          ? final(id, "passed", { xp: { ...award, awardId: "award-waiting" }, completed: true })
          : pending(id),
    },
  });
  const result = await f.sdk.startTask("reach");
  const [waiting, earlier] = result.assessments;
  assert.deepEqual(waiting, pending("waiting"));
  // A counted pass gets a handle of this session. The verdict was shown before, so nothing is announced.
  assert.match(earlier.receiptHandle, /^[a-f0-9-]{36}$/);
  await flush();
  assert.deepEqual(f.events, []);

  f.clock.advanceTo(0);
  await flush();
  assert.deepEqual(
    f.server.calls.filter(([name]) => name === "status"),
    [["status", "waiting"]]
  );
  assert.deepEqual(f.events, []);
  ready = true;
  f.clock.advanceTo(1000);
  await flush();
  assert.deepEqual(
    f.events.map(([type]) => type),
    ["assessment.result", "reward.committed"]
  );
  const [, verdict] = f.events[0];
  assert.equal(verdict.assessmentId, "waiting");
  assert.equal(verdict.completed, true);
  assert.match(verdict.receiptHandle, /^[a-f0-9-]{36}$/);
  assert.notEqual(verdict.receiptHandle, earlier.receiptHandle);
  assert.deepEqual(f.events[1][1], {
    awardId: "award-waiting",
    goalId: "reach",
    xp: 1,
    result: "passed",
    persisted: true,
  });
  // Final means final: nothing reads it again.
  f.clock.advanceTo(60000);
  await flush();
  assert.equal(f.server.calls.filter(([name]) => name === "status").length, 2);
});

test("a submission needs the confirmed state revision and returns the view of the server", async (t) => {
  const f = await fixture(t);
  const answer = { startId: "start-1", input: { kind: "program", source: "move();" } };
  const stale = await failure(f.sdk.submitAssessment("reach", answer, { stateRevision: 7 }));
  assert.deepEqual([stale.code, stale.details.revision], ["conflict", 0]);
  assert.deepEqual(f.server.calls, []);

  await f.sdk.saveState({
    formatVersion: 1,
    activeGoalId: "reach",
    plans: { reach: answer.input },
  });
  const view = await f.sdk.submitAssessment("reach", answer, { id: "submit-op" });
  assert.deepEqual(view, pending("submission-1"));
  const [name, goalId, stateRevision, sent] = f.server.calls[0];
  assert.deepEqual([name, goalId, stateRevision, sent], ["submit", "reach", 1, answer]);
  // A second click with the same operation asks the server once.
  await f.sdk.retry("submit-op");
  assert.equal(f.server.calls.length, 1);
});

test("a pending submission is read again after a second and turns into a result and its reward", async (t) => {
  let verdict;
  const f = await fixture(t, { server: { status: (id) => verdict ?? pending(id) } });
  await f.sdk.submitAssessment("reach", {
    startId: "start-1",
    input: { kind: "program", source: "" },
  });
  f.clock.advanceTo(999);
  await flush();
  assert.equal(f.server.calls.filter(([name]) => name === "status").length, 0);
  f.clock.advanceTo(1000);
  await flush();
  assert.equal(f.server.calls.filter(([name]) => name === "status").length, 1);
  verdict = final("submission-1", "not_passed");
  f.clock.advanceTo(3000);
  await flush();
  assert.deepEqual(
    f.events.map(([type]) => type),
    ["assessment.result"]
  );
  assert.deepEqual(f.events[0][1], final("submission-1", "not_passed"));
  assert.equal(f.events[0][1].receiptHandle, undefined);
});

test("a technical failure leaves the submission pending and is asked again", async (t) => {
  let step = 0;
  const f = await fixture(t, {
    server: {
      status: (id) => {
        step += 1;
        if (step === 1) throw new Error("service unavailable");
        if (step === 2) return { assessmentId: id, status: "final" };
        return final(id, "passed", { xp: award });
      },
    },
  });
  await f.sdk.submitAssessment("reach", {
    startId: "start-1",
    input: { kind: "program", source: "" },
  });
  f.clock.advanceTo(1000);
  await flush();
  f.clock.advanceTo(3000);
  await flush();
  // Neither the failure nor the malformed answer is a verdict.
  assert.deepEqual(f.events, []);
  f.clock.advanceTo(6000);
  await flush();
  assert.deepEqual(
    f.events.map(([type]) => type),
    ["assessment.result", "reward.committed"]
  );
});

test("the lesson may read the status itself; one award is announced once", async (t) => {
  const f = await fixture(t, {
    server: { status: (id) => final(id, "passed", { xp: award }) },
  });
  await f.sdk.submitAssessment("reach", {
    startId: "start-1",
    input: { kind: "program", source: "" },
  });
  const first = await f.sdk.assessmentStatus("submission-1");
  const second = await f.sdk.assessmentStatus("submission-1");
  assert.equal(first.outcome, "passed");
  assert.equal(first.receiptHandle, second.receiptHandle);
  await flush();
  assert.deepEqual(
    f.events.map(([type]) => type),
    ["reward.committed"]
  );
  // The pending reading that was scheduled finds the verdict already known.
  f.clock.advanceTo(10000);
  await flush();
  assert.deepEqual(
    f.events.map(([type]) => type),
    ["reward.committed"]
  );
});

test("an answer that breaks the schema or names another submission never reaches the lesson", async (t) => {
  const answers = [
    { ...final("submission-1", "passed"), feedback: { summary: "ok" } },
    { ...final("submission-1", "passed"), goalId: "look" },
    { ...final("submission-1", "passed"), outcome: "unavailable", counts: false },
    { ...final("submission-1", "not_passed"), counts: true },
  ];
  const f = await fixture(t, { server: { submit: () => answers.shift() } });
  const submit = (id) =>
    f.sdk.submitAssessment("reach", { startId: "start-1", input: { kind: "program", source: id } });
  assert.equal((await failure(submit("a"))).code, "invalid_message");
  assert.equal((await failure(submit("b"))).code, "invalid_receipt");
  assert.equal((await failure(submit("c"))).code, "invalid_message");
  assert.equal((await failure(submit("d"))).code, "invalid_message");
  await flush();
  assert.deepEqual(f.events, []);
});

test("completion takes handles of counted passes from this session, and the server decides", async (t) => {
  const outcomes = [
    { outcome: "pending", persisted: false },
    { outcome: "completed", persisted: true },
  ];
  const verdicts = {
    "submission-1": final("submission-1", "not_passed"),
    "submission-2": final("submission-2", "passed", { xp: award }),
  };
  let count = 0;
  const f = await fixture(t, {
    server: {
      submit: () => verdicts[`submission-${++count}`],
      complete: () => outcomes.shift(),
    },
  });
  const submit = (source) =>
    f.sdk.submitAssessment("reach", { startId: "start-1", input: { kind: "program", source } });
  const request = (receiptHandles, goalIds = ["reach"]) =>
    f.sdk.request("completion.request", { goalIds, stateRevision: 0, receiptHandles });

  const failed = await submit("move();");
  assert.equal(failed.receiptHandle, undefined);
  // No receipt, an invented one, or one of another session: no call to the server.
  for (const handles of [[], ["made-up"], ["0b9d6f3e-5a51-4f0c-9d55-3c1f4a1c9999"]])
    assert.equal((await failure(request(handles))).code, "invalid_receipt");
  assert.equal(f.server.calls.filter(([name]) => name === "complete").length, 0);

  const passed = await submit("while (frontIsClear()) move();");
  assert.equal(
    (await failure(request([passed.receiptHandle, passed.receiptHandle]))).code,
    "invalid_receipt"
  );
  assert.equal(
    (await failure(request([passed.receiptHandle], ["reach", "look"]))).code,
    "invalid_message"
  );
  // The pass of one task is no pass of the unit: the host reports what the server says.
  assert.deepEqual(await request([passed.receiptHandle]), { outcome: "pending", persisted: false });
  assert.deepEqual(
    await f.sdk.request(
      "completion.request",
      { goalIds: ["reach"], stateRevision: 0, receiptHandles: [passed.receiptHandle] },
      { id: "again" }
    ),
    { outcome: "completed", persisted: true }
  );
  assert.equal(f.server.calls.filter(([name]) => name === "complete").length, 2);
});

test("starts and submissions are refused while the activity is locked", async (t) => {
  const f = await fixture(t, { disabled: true });
  assert.equal((await failure(f.sdk.startTask("reach"))).code, "locked");
  assert.deepEqual(f.server.calls, []);
});

test("the loader accepts a 2.1 package and refuses a newer minor version", async () => {
  const strictCsp =
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors https://test.bootstrap.academy http://localhost:58761";
  const verify = async (minor) => {
    const manifest = manifestFor(minor);
    const content = new Map([
      ["index.html", new TextEncoder().encode("<!doctype html><title>2.1</title>")],
      ["main.js", new TextEncoder().encode("export const inert = true;")],
      [
        "state.schema.json",
        new TextEncoder().encode('{"type":"object","additionalProperties":false}'),
      ],
    ]);
    manifest.assets = await Promise.all(
      manifest.assets.map(async (asset) => ({
        ...asset,
        bytes: content.get(asset.path).length,
        sha256: await sha256(content.get(asset.path)),
      }))
    );
    const package_hash = await sha256(new TextEncoder().encode(canonicalJson(manifest.assets)));
    const root = `https://content.pages.dev/packages/${package_hash}/`;
    const bytes = new TextEncoder().encode(JSON.stringify(manifest));
    const descriptor = {
      id: manifest.id,
      api_version: 2,
      entry_url: root,
      manifest_url: root + "manifest.json",
      manifest_hash: await sha256(bytes),
      package_hash,
      revision_id: REVISION,
    };
    const load = async (url) => {
      const name = url === root ? "index.html" : url.slice(root.length);
      const response = new Response(name === "manifest.json" ? bytes : content.get(name), {
        headers: {
          "content-type":
            name === "manifest.json"
              ? "application/json"
              : manifest.assets.find((asset) => asset.path === name).mediaType,
          "content-security-policy": strictCsp,
        },
      });
      Object.defineProperty(response, "url", { value: url });
      return response;
    };
    return verifyLessonPackage(
      descriptor,
      "https://content.pages.dev",
      "https://test.bootstrap.academy",
      new AbortController().signal,
      load
    );
  };
  const verified = await verify(1);
  assert.equal(verified.manifest.protocol.minor, 1);
  assert.equal(verified.descriptor.revision_id, REVISION);
  assert.equal((await verify(0)).manifest.protocol.minor, 0);
  await assert.rejects(verify(2), { code: "unsupported" });
});
