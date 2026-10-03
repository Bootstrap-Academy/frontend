import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { loadLessonProtocol } from "./helpers/lesson-protocol-loader.mjs";

const compiled = await loadLessonProtocol();
after(compiled.cleanup);
const { canonicalHash, playReplay, readPointer, ReplayError } =
  await compiled.importModule("replay");
const { canonicalJson, validateReplay } = await compiled.importModule("validation");
const { VirtualClock } = await compiled.importModule("testing");
const [manifest, messages, formatFixture] = await Promise.all(
  ["manifest", "messages", "replay"].map(async (name) =>
    JSON.parse(
      await readFile(new URL(`../lesson-protocol/fixtures/${name}.json`, import.meta.url), "utf8")
    )
  )
);
const ownDraft = "Mein eigener Entwurf";
const finalState = { draftPreserved: true, openedFiles: { "note.txt": ownDraft } };
const manifestHash = await canonicalHash(manifest);
const stateHash = await canonicalHash(finalState);

function playableReplay() {
  const replay = structuredClone(formatFixture);
  replay.manifestHash = manifestHash;
  replay.expectFinal.stateHash = stateHash;
  return replay;
}

// This driver has its own action/state rules. It receives no assertions, final
// expectations, message templates, screenshot expectations, or expected hashes.
// Recorded image names only exercise the driver's callback; no image is created.
function recoveryDriver(options = {}) {
  const clock = new VirtualClock();
  const audit = {
    initialized: [],
    actions: [],
    times: [],
    screenshots: [],
    messages: [],
    disposed: 0,
  };
  const bindings = {
    manifest: structuredClone(manifest),
    packageHash: formatFixture.packageHash,
    hostBuild: formatFixture.hostBuild,
    capabilities: structuredClone(messages[0].payload.capabilities),
  };
  let state = {};
  let project = null;
  let revision = 0;
  let generation = 1;
  let sequences = { host: 0, lesson: 0 };
  let wire = [];
  let initialized;
  let injected = false;
  const hostState = { outcome: "not_passed", xp: 0, providerCalls: 0, persisted: false };
  const emit = (sender, type, kind, payload, extra = {}) => {
    const seq = ++sequences[sender];
    const message = {
      protocol: { major: 2, minor: 0 },
      sessionId: `replay-session-${generation}`,
      seq,
      id: `${sender}-${generation}-${seq}`,
      type,
      kind,
      payload: structuredClone(payload),
      ...extra,
    };
    wire.push({ sender, message });
    return message;
  };
  const handshake = async () => {
    const hash = await canonicalHash(bindings.manifest);
    emit("host", "host.connect", "event", { transport: "message-port", manifestHash: hash });
    emit("lesson", "lesson.hello", "event", {
      lessonId: bindings.manifest.id,
      manifestHash: hash,
      sdk: { major: 1, minor: 0 },
    });
    const init = structuredClone(messages[0].payload);
    Object.assign(init, {
      manifestHash: hash,
      locale: initialized.locale,
      state: { revision, schemaVersion: 1, value: state },
      capabilities: bindings.capabilities,
    });
    emit("host", "host.init", "event", init);
    emit("lesson", "lesson.ready", "event", { stateRevision: revision, sceneId: "recover" });
    const running = emit("host", "host.lifecycle", "request", {
      phase: "running",
      reason: "synthetic-replay",
    });
    emit(
      "lesson",
      "rpc.result",
      "response",
      { ok: true, data: { phase: "running", dirty: false } },
      { replyTo: running.id }
    );
    if (options.cancelRequest) {
      const request = emit("host", "request.cancel", "request", { requestId: "old-local-work" });
      emit(
        "lesson",
        "rpc.result",
        "response",
        { ok: true, data: { cancelled: false } },
        { replyTo: request.id }
      );
    }
  };
  const save = () => {
    const request = emit(
      "lesson",
      "state.save",
      "request",
      { expectedRevision: revision, schemaVersion: 1, state },
      { id: `save-${generation}-${revision + 1}` }
    );
    revision++;
    emit(
      "host",
      "rpc.result",
      "response",
      { ok: true, data: { revision, persisted: true } },
      { replyTo: request.id }
    );
  };
  const driver = {
    audit,
    bindings,
    async initialize(input) {
      audit.initialized.push(structuredClone(input));
      if (options.failInit) throw new Error("Synthetic initialization failure");
      initialized = structuredClone(input);
      state = structuredClone(input.initial.state);
      project = structuredClone(input.initial.project);
      revision = input.initial.stateRevision;
      await handshake();
    },
    advanceTo(atMs) {
      clock.advanceTo(atMs);
      audit.times.push(atMs);
    },
    async perform(action) {
      audit.actions.push(structuredClone(action));
      if (options.failAction) throw new Error("Synthetic action failure");
      if (action.kind === "reload") {
        generation++;
        sequences = { host: 0, lesson: 0 };
        await handshake();
        return;
      }
      if (action.kind === "tap" && action.target === "draft-save-separately") {
        state.draftPreserved = true;
      } else if (action.kind === "drag" && action.target === "backup-a-note") {
        if (!state.draftPreserved) throw new Error("Preserve the original draft first");
        const destination = action.points.at(-1);
        if (destination.x >= 200 && destination.y >= 400)
          state.openedFiles = { "note.txt": ownDraft };
      } else if (action.kind === "tap" && action.target === "recover-complete") {
        if (state.openedFiles?.["note.txt"] !== ownDraft)
          throw new Error("Recovered note is not openable");
        Object.assign(hostState, { outcome: "introduced", persisted: true });
      } else throw new Error("Unsupported synthetic action");
      save();
    },
    snapshot() {
      return structuredClone({
        state,
        project,
        host: { ...hostState, ...options.hostPatch },
        navigation: { changed: false },
        scene: { id: "recover" },
      });
    },
    takeMessages() {
      const entries = wire;
      wire = [];
      if (!injected && audit.actions.length === 1 && options.messageFault) {
        options.messageFault(entries);
        injected = true;
      }
      audit.messages.push(...structuredClone(entries));
      const plain =
        options.format === "plain" || (options.format === "mixed" && audit.actions.length === 0);
      return plain ? entries.map((entry) => entry.message) : entries;
    },
    dispose() {
      audit.disposed++;
      wire = [];
      assert.equal(clock.pending, 0);
    },
  };
  if (options.screenshots !== false) driver.screenshot = (path) => audit.screenshots.push(path);
  return driver;
}

test("the independent model runs the synthetic fixture with real canonical hashes", async () => {
  const replay = playableReplay();
  const driver = recoveryDriver();
  const result = await playReplay(replay, driver);
  assert.equal(result.steps, 3);
  assert.equal(result.stateHash, stateHash);
  assert.deepEqual(result.snapshot.state, finalState);
  assert.deepEqual(result.snapshot.host, {
    outcome: "introduced",
    xp: 0,
    providerCalls: 0,
    persisted: true,
  });
  assert.deepEqual(driver.audit.times, [0, 2000, 4000]);
  assert.deepEqual(
    driver.audit.actions,
    replay.steps.map((step) => step.action)
  );
  assert.deepEqual(driver.audit.screenshots, [
    "screens/01.png",
    "screens/02.png",
    "screens/03.png",
  ]);
  assert.deepEqual(Object.keys(driver.audit.initialized[0]).sort(), [
    "clock",
    "fixtures",
    "initial",
    "lessonId",
    "locale",
    "seed",
    "viewport",
  ]);
  assert.equal(driver.audit.initialized[0].seed, replay.seed);
  assert.equal(driver.audit.initialized[0].fixtures.providerMode, "off");
  assert.equal(driver.audit.disposed, 1);
  assert.equal(
    manifestHash,
    createHash("sha256").update(canonicalJson(manifest), "utf8").digest("hex")
  );
  assert.notEqual(replay.expectFinal.stateHash, formatFixture.expectFinal.stateHash);
  assert.equal(formatFixture.expectFinal.stateHash, "e".repeat(64));
});

test("JSON Pointer escaping and canonical UTF-8 hashing are deterministic", async () => {
  const value = { state: { "a/b~c": ["ä", 2] } };
  assert.equal(readPointer(value, "/state/a~1b~0c/0"), "ä");
  assert.throws(() => readPointer(value, "/state/a~2b"), /Invalid JSON Pointer/);
  assert.throws(() => readPointer(value, "/state/missing"), /Missing snapshot path/);
  const canonical = '{"a":"ä","b":[2,1],"":3,"𐀀":4}';
  const unordered = { "𐀀": 4, b: [2, 1], "": 3, a: "ä" };
  assert.equal(canonicalJson(unordered), canonical);
  assert.equal(
    await canonicalHash(unordered),
    createHash("sha256").update(canonical, "utf8").digest("hex")
  );
  await assert.rejects(canonicalHash({ value: Number.NaN }), { code: "invalid_message" });
});

test("a changed action produces a changed model result rather than copying expectations", async () => {
  const replay = playableReplay();
  replay.steps[1].action.points.at(-1).x = 120;
  const driver = recoveryDriver();
  await assert.rejects(
    playReplay(replay, driver),
    (error) => error instanceof ReplayError && error.step === 1
  );
  assert.equal(driver.audit.actions.length, 2);
  assert.equal(driver.snapshot().state.openedFiles, undefined);
  assert.equal(driver.audit.disposed, 1);
});

test("failed assertions and missing screenshot drivers stop the run and dispose once", async (t) => {
  await t.test("assertion", async () => {
    const replay = playableReplay();
    replay.steps[0].expect.assertions[0].equals = false;
    const driver = recoveryDriver();
    await assert.rejects(playReplay(replay, driver), {
      name: "ReplayError",
      step: 0,
      message: "Replay mismatch at /state/draftPreserved.",
    });
    assert.equal(driver.audit.actions.length, 1);
    assert.equal(driver.audit.screenshots.length, 0);
    assert.equal(driver.audit.disposed, 1);
  });
  await t.test("screenshot", async () => {
    const driver = recoveryDriver({ screenshots: false });
    await assert.rejects(playReplay(playableReplay(), driver), {
      name: "ReplayError",
      step: 0,
      message: "Screenshot driver is missing.",
    });
    assert.equal(driver.audit.disposed, 1);
  });
});

test("final semantic fields and the actual state hash must match the recorded result", async (t) => {
  for (const [field, value] of [
    ["outcome", "completed"],
    ["xp", 1],
    ["providerCalls", 1],
    ["persisted", false],
  ]) {
    await t.test(field, async () => {
      const replay = playableReplay();
      replay.steps.at(-1).expect.assertions = [
        { path: "/state/openedFiles/note.txt", equals: ownDraft },
      ];
      const driver = recoveryDriver({ hostPatch: { [field]: value } });
      await assert.rejects(playReplay(replay, driver), {
        name: "ReplayError",
        step: 3,
        message: `Replay mismatch at /host/${field}.`,
      });
      assert.equal(driver.audit.disposed, 1);
    });
  }
  await t.test("stateHash", async () => {
    const replay = playableReplay();
    replay.expectFinal.stateHash = "f".repeat(64);
    const driver = recoveryDriver();
    await assert.rejects(playReplay(replay, driver), {
      name: "ReplayError",
      step: 3,
      message: "Replay mismatch at /stateHash.",
    });
    assert.equal(driver.audit.disposed, 1);
  });
});

test("manifest, package, host, locale and engine bindings are checked before any action", async (t) => {
  for (const [name, change] of [
    ["manifest", (replay) => (replay.manifestHash = "f".repeat(64))],
    ["package", (replay) => (replay.packageHash = "f".repeat(64))],
    ["host", (replay) => (replay.hostBuild = "other-host")],
    ["lesson", (replay) => (replay.lessonId = "other-lesson")],
    ["locale", (replay) => (replay.locale = "fr")],
    ["engine", (replay) => (replay.engines[0].sha256 = "f".repeat(64))],
  ]) {
    await t.test(name, async () => {
      const replay = playableReplay();
      change(replay);
      const driver = recoveryDriver();
      await assert.rejects(playReplay(replay, driver));
      assert.equal(driver.audit.initialized.length, 0);
      assert.equal(driver.audit.actions.length, 0);
      assert.equal(driver.audit.disposed, 1);
    });
  }
});

test("recorded messages compare actual requests and replies, including sender metadata", async () => {
  const replay = playableReplay();
  replay.steps[0].expect.messages = [
    {
      protocol: { major: 2, minor: 0 },
      sessionId: "replay-session-1",
      seq: 4,
      id: "save-1-1",
      type: "state.save",
      kind: "request",
      payload: { expectedRevision: 0, schemaVersion: 1, state: { draftPreserved: true } },
    },
    {
      protocol: { major: 2, minor: 0 },
      sessionId: "replay-session-1",
      seq: 4,
      id: "host-1-4",
      type: "rpc.result",
      kind: "response",
      payload: { ok: true, data: { revision: 1, persisted: true } },
      replyTo: "save-1-1",
    },
  ];
  replay.steps[0].expect.senders = ["lesson", "host"];
  for (let index = 1; index < replay.steps.length; index++) {
    const expected = structuredClone(replay.steps[0].expect.messages);
    expected[0].seq = expected[1].seq = 4 + index;
    expected[0].id = expected[1].replyTo = `save-1-${index + 1}`;
    expected[0].payload.expectedRevision = index;
    expected[0].payload.state = structuredClone(finalState);
    expected[1].id = `host-1-${index + 4}`;
    expected[1].payload.data.revision = index + 1;
    replay.steps[index].expect.messages = expected;
    replay.steps[index].expect.senders = ["lesson", "host"];
  }
  assert.equal((await playReplay(replay, recoveryDriver())).steps, 3);
  replay.steps[0].expect.messages[0].payload.state.draftPreserved = false;
  const driver = recoveryDriver();
  await assert.rejects(playReplay(replay, driver), {
    name: "ReplayError",
    step: 0,
    message: "Replay mismatch at messages.",
  });
  assert.equal(driver.audit.disposed, 1);
});

test("actual message references, sequences, sessions, directions and payloads are validated", async (t) => {
  for (const [name, fault] of [
    ["sequence", (entries) => (entries[0].message.seq = 3)],
    ["reference", (entries) => (entries[1].message.replyTo = "unknown-request")],
    ["session", (entries) => (entries[1].message.sessionId = "foreign-session")],
    ["direction", (entries) => (entries[0].sender = "host")],
    ["payload", (entries) => (entries[1].message.payload.data.persisted = false)],
  ]) {
    await t.test(name, async () => {
      const driver = recoveryDriver({ messageFault: fault });
      await assert.rejects(
        playReplay(playableReplay(), driver),
        (error) => error instanceof ReplayError && error.step === 0
      );
      assert.equal(driver.audit.actions.length, 1);
      assert.equal(driver.audit.disposed, 1);
    });
  }
});

test("an explicit reload starts a new transcript while preserving confirmed model state", async () => {
  const replay = playableReplay();
  replay.steps.splice(1, 0, {
    atMs: 1000,
    action: { kind: "reload" },
    expect: { assertions: [{ path: "/state/draftPreserved", equals: true }] },
  });
  const driver = recoveryDriver();
  const result = await playReplay(replay, driver);
  assert.equal(result.steps, 4);
  assert.equal(result.stateHash, stateHash);
  const connections = driver.audit.messages.filter(
    (entry) => entry.message.type === "host.connect"
  );
  assert.deepEqual(
    connections.map((entry) => entry.message.sessionId),
    ["replay-session-1", "replay-session-2"]
  );
  assert.ok(connections.every((entry) => entry.message.seq === 1));
  assert.equal(driver.audit.disposed, 1);
});

test("ordinary envelopes and explicit directions are supported but partial direction metadata is rejected", async () => {
  assert.equal((await playReplay(playableReplay(), recoveryDriver({ format: "plain" }))).steps, 3);
  assert.equal(
    (await playReplay(playableReplay(), recoveryDriver({ cancelRequest: true }))).steps,
    3
  );
  const driver = recoveryDriver({ format: "mixed" });
  await assert.rejects(playReplay(playableReplay(), driver), {
    name: "ReplayError",
    step: 0,
    message: "Driver direction metadata must cover the segment.",
  });
  assert.equal(driver.audit.disposed, 1);
});

test("expected RPC messages remain correlated across steps and a reload clears old references", () => {
  const replay = playableReplay();
  replay.steps[0].expect.messages = [structuredClone(messages[2])];
  replay.steps[1].expect.messages = [structuredClone(messages[3])];
  assert.doesNotThrow(() => validateReplay(replay, { manifest }));
  replay.steps[1].expect.messages[0].replyTo = "missing-request";
  assert.throws(() => validateReplay(replay, { manifest }), { code: "invalid_message" });
  replay.steps[1].expect.messages[0].replyTo = messages[2].id;
  replay.steps[1].action = { kind: "reload" };
  assert.throws(() => validateReplay(replay, { manifest }), { code: "invalid_message" });
});

test("initialization and action failures both dispose the driver and retain the failing step", async (t) => {
  for (const [name, options, step] of [
    ["initialize", { failInit: true }, -1],
    ["action", { failAction: true }, 0],
  ]) {
    await t.test(name, async () => {
      const driver = recoveryDriver(options);
      await assert.rejects(
        playReplay(playableReplay(), driver),
        (error) => error instanceof ReplayError && error.step === step
      );
      assert.equal(driver.audit.disposed, 1);
    });
  }
});
