import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { loadLessonProtocol } from "./helpers/lesson-protocol-loader.mjs";

const compiled = await loadLessonProtocol();
after(compiled.cleanup);
const { LessonSDK } = await compiled.importModule("sdk");
const { createTestTransportPair, VirtualClock } = await compiled.importModule("testing");
const { validateMessage, validateSchema, validateTranscript } =
  await compiled.importModule("validation");
const [manifestFixture, messageFixtures] = await Promise.all(
  ["manifest", "messages"].map(async (name) =>
    JSON.parse(
      await readFile(new URL(`../lesson-protocol/fixtures/${name}.json`, import.meta.url), "utf8")
    )
  )
);
const hash = messageFixtures[0].payload.manifestHash;
const flush = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => (resolve = done));
  return { promise, resolve };
};

function fixture(t, options = {}) {
  const manifest = structuredClone(manifestFixture);
  const init = structuredClone(messageFixtures[0].payload);
  options.configure?.(manifest, init);
  const pair = createTestTransportPair();
  const clock = new VirtualClock();
  const errors = [];
  let receive;
  let hostSeq = 0;
  const sdk = new LessonSDK({
    manifest,
    manifestHash: hash,
    transport: {
      ...pair.lesson,
      subscribe(listener) {
        receive = listener;
        return pair.lesson.subscribe(listener);
      },
    },
    clock,
    onError: (error) => errors.push(error),
    ...options.sdk,
  });
  t.after(() => {
    sdk.dispose();
    pair.host.close();
    pair.lesson.close();
  });
  const host = (type, payload, kind = "event", overrides = {}) => {
    const message = {
      protocol: { major: 2, minor: 0 },
      sessionId: "sdk-test-session",
      seq: ++hostSeq,
      id: `host-${hostSeq}`,
      kind,
      type,
      payload: structuredClone(payload),
      ...overrides,
    };
    pair.host.send(message);
    return message;
  };
  const reply = (request, data, overrides = {}) =>
    host("rpc.result", { ok: true, data }, "response", { replyTo: request.id, ...overrides });
  return {
    sdk,
    pair,
    clock,
    errors,
    init,
    manifest,
    host,
    reply,
    lessonMessages: () =>
      pair.messages.filter((entry) => entry.sender === "lesson").map((entry) => entry.message),
    requests: () =>
      pair.messages
        .filter((entry) => entry.sender === "lesson" && entry.message.kind === "request")
        .map((entry) => entry.message),
    late: (message) => receive(structuredClone(message)),
    async connect() {
      const started = sdk.start();
      host("host.connect", { transport: "message-port", manifestHash: hash });
      host("host.init", init);
      return started;
    },
    async lifecycle(phase, id) {
      const request = host(
        "host.lifecycle",
        { phase, reason: "test" },
        "request",
        id ? { id } : {}
      );
      await flush();
      return request;
    },
  };
}

async function running(t, options) {
  const f = fixture(t, options);
  await f.connect();
  f.sdk.ready("recover");
  await f.lifecycle("running");
  return f;
}

test("the real handshake sends hello and ready before running and returns copied snapshots", async (t) => {
  const f = fixture(t);
  assert.equal(f.sdk.phase, "loading");
  assert.throws(() => f.sdk.ready("recover"), { code: "invalid_message" });
  assert.throws(() => f.sdk.progress("restore-openable", 0.2), { code: "cancelled" });
  const started = f.sdk.start();
  assert.equal(f.sdk.start(), started);
  assert.equal(f.clock.pending, 1);
  f.host("host.connect", { transport: "message-port", manifestHash: hash });
  assert.equal(f.sdk.phase, "negotiating");
  assert.deepEqual(f.lessonMessages()[0].payload, {
    lessonId: f.manifest.id,
    manifestHash: hash,
    sdk: { major: 1, minor: 0 },
  });
  f.host("host.init", f.init);
  const init = await started;
  init.state.value.scene = "changed returned copy";
  assert.equal(f.sdk.snapshot.value.scene, "recover");
  const snapshot = f.sdk.snapshot;
  snapshot.value.scene = "changed getter copy";
  assert.equal(f.sdk.snapshot.value.scene, "recover");
  assert.equal(f.clock.pending, 0);
  f.sdk.ready("recover");
  assert.equal(f.sdk.phase, "ready");
  const request = await f.lifecycle("running");
  assert.equal(f.sdk.phase, "running");
  const response = f.lessonMessages().at(-1);
  assert.equal(response.replyTo, request.id);
  assert.deepEqual(response.payload, { ok: true, data: { phase: "running", dirty: false } });
  assert.doesNotThrow(() => validateTranscript(f.pair.messages.map((entry) => entry.message)));
  f.clock.advanceTo(10000);
  assert.deepEqual(f.errors, []);
});

test("invalid init bindings and missing required capabilities fail without ready or state loss", async (t) => {
  for (const [name, change, code] of [
    ["lesson", (init) => (init.lessonId = "other-lesson"), "invalid_message"],
    ["hash", (init) => (init.manifestHash = "f".repeat(64)), "invalid_message"],
    ["capability", (init) => init.capabilities.shift(), "missing_capability"],
    ["schema", (init) => (init.state.schemaVersion = 2), "unsupported"],
    ["payload", (init) => (init.disabled = "yes"), "invalid_message"],
  ]) {
    await t.test(name, async (child) => {
      const f = fixture(child);
      const failure = assert.rejects(f.sdk.start(), { code });
      f.host("host.connect", { transport: "message-port", manifestHash: hash });
      change(f.init);
      f.host("host.init", f.init);
      await failure;
      assert.equal(f.sdk.phase, "recoverable-error");
      assert.equal(f.sdk.context, undefined);
      assert.equal(f.clock.pending, 0);
      assert.equal(
        f.lessonMessages().some((message) => message.type === "lesson.ready"),
        false
      );
    });
  }
});

test("a synchronous transport can replay connect and init during subscribe without a stray timer", async (t) => {
  const clock = new VirtualClock();
  const sent = [];
  const errors = [];
  let listeners = 0;
  const sdk = new LessonSDK({
    manifest: manifestFixture,
    manifestHash: hash,
    clock,
    onError: (error) => errors.push(error),
    transport: {
      send: (message) => sent.push(message),
      subscribe(receive) {
        listeners++;
        receive({
          protocol: { major: 2, minor: 0 },
          sessionId: "buffered",
          seq: 1,
          id: "buffered-connect",
          kind: "event",
          type: "host.connect",
          payload: { transport: "message-port", manifestHash: hash },
        });
        receive({ ...structuredClone(messageFixtures[0]), sessionId: "buffered", seq: 2 });
        return () => listeners--;
      },
      close() {},
    },
  });
  t.after(() => sdk.dispose());
  await sdk.start();
  assert.equal(sent[0].type, "lesson.hello");
  assert.equal(clock.pending, 0);
  clock.advanceTo(10000);
  assert.deepEqual(errors, []);
  assert.equal(sdk.phase, "negotiating");
  sdk.dispose();
  assert.equal(listeners, 0);
});

test("ready supports a synchronous lifecycle response and rolls back a failed send", async (t) => {
  await t.test("synchronous lifecycle", async (child) => {
    const f = fixture(child);
    await f.connect();
    const unsubscribe = f.pair.host.subscribe((message) => {
      if (message.type === "lesson.ready")
        f.host("host.lifecycle", { phase: "running", reason: "ready received" }, "request");
    });
    child.after(unsubscribe);
    f.sdk.ready("recover");
    await flush();
    assert.equal(f.sdk.phase, "running");
    assert.deepEqual(f.errors, []);
    assert.equal(f.lessonMessages().at(-1).payload.data.phase, "running");
  });
  await t.test("send failure", async (child) => {
    const f = fixture(child);
    await f.connect();
    f.pair.host.close();
    assert.throws(() => f.sdk.ready("recover"), { code: "offline" });
    assert.equal(f.sdk.phase, "negotiating");
    assert.equal(f.sdk.snapshot.revision, 0);
  });
});

test("handshake schema failures reject immediately and retain the original input", async (t) => {
  const f = fixture(t);
  const failure = assert.rejects(f.sdk.start(), { code: "invalid_message" });
  f.host("host.connect", { transport: "wrong-transport", manifestHash: hash });
  await failure;
  assert.equal(f.sdk.phase, "recoverable-error");
  assert.equal(f.sdk.snapshot, undefined);
  assert.equal(f.clock.pending, 0);
});

test("both wire directions and operation payloads are guarded before changing context", async (t) => {
  const f = await running(t);
  const before = f.lessonMessages().length;
  assert.throws(() => f.sdk.event("host.context", { locale: "en", disabled: false }), {
    code: "unsupported",
  });
  await assert.rejects(f.sdk.request("host.lifecycle", { phase: "paused", reason: "test" }), {
    code: "unsupported",
  });
  assert.throws(() => f.sdk.progress("restore-openable", 1.1), { code: "invalid_message" });
  assert.throws(() => f.sdk.progress("unknown-goal", 0.5), { code: "invalid_message" });
  f.host("state.save", { expectedRevision: 0, schemaVersion: 1, state: {} }, "request");
  f.host("host.context", { locale: "en", disabled: "yes" });
  await flush();
  assert.equal(f.lessonMessages().length, before);
  assert.equal(f.errors.length, 2);
  assert.ok(f.errors.every((error) => error.code === "invalid_message"));
  assert.equal(f.sdk.context.locale, "de");
  f.host("host.context", { locale: "en", disabled: false, futureField: { enabled: true } });
  await flush();
  assert.equal(f.sdk.context.locale, "en");
});

test("capabilities are copied, versioned, optional, and a paused model cannot submit work", async (t) => {
  const f = await running(t, {
    configure(manifest, init) {
      manifest.optional.push({ id: "host.llm", major: 1, minMinor: 0 });
      init.capabilities.push({
        id: "host.llm",
        major: 1,
        minor: 0,
        implementation: "fixture-paused-model",
        sha256: "f".repeat(64),
        availability: "paused",
      });
    },
  });
  assert.equal(f.sdk.capability("host.project"), undefined);
  assert.equal(f.sdk.capability("kit.scene", 2), undefined);
  assert.equal(f.sdk.capability("kit.scene", 1, 1), undefined);
  const scene = f.sdk.capability("kit.scene");
  scene.implementation = "modified copy";
  assert.equal(f.sdk.capability("kit.scene").implementation, "academy-scene-1.0.0");
  await assert.rejects(f.sdk.request("project.read", {}), { code: "missing_capability" });
  await assert.rejects(f.sdk.request("llm.respond", { profile: "synthetic-profile", input: {} }), {
    code: "llm_paused",
  });
  assert.equal(f.requests().length, 0);
  const exported = f.sdk.request("artifact.export", {
    name: "work.json",
    mediaType: "application/json",
    content: "{}",
  });
  const request = f.requests().at(-1);
  assert.equal(request.type, "artifact.export");
  f.reply(request, { exported: true });
  assert.deepEqual(await exported, { exported: true });
});

test("save confirmation validates result payloads and applies only the copied request state", async (t) => {
  const f = await running(t);
  const state = { scene: "recovered", copied: ["note.txt"] };
  const saved = f.sdk.saveState(state, { id: "save-confirmed" });
  state.copied.push("later mutation");
  const request = f.requests().at(-1);
  assert.deepEqual(request.payload.state.copied, ["note.txt"]);
  assert.equal(f.sdk.snapshot.revision, 0);
  for (const data of [
    { revision: 1, persisted: false },
    { persisted: true },
    { revision: -1, persisted: true },
    { revision: true, persisted: true },
  ])
    f.reply(request, data);
  await flush();
  assert.equal(f.errors.length, 4);
  assert.equal(f.sdk.snapshot.revision, 0);
  assert.equal(f.clock.pending, 1);
  f.reply(request, { revision: 1, persisted: true });
  assert.deepEqual(await saved, { revision: 1, persisted: true });
  assert.deepEqual(f.sdk.snapshot, {
    revision: 1,
    schemaVersion: 1,
    value: { scene: "recovered", copied: ["note.txt"] },
  });
  assert.equal(f.clock.pending, 0);
});

test("unknown result extensions are ignored without removing the lesson's own open state fields", async (t) => {
  const f = await running(t);
  const state = { scene: "recovered", cancelled: true, schemaVersion: 999, own: { revision: 12 } };
  const saved = f.sdk.saveState(state, { id: "extended-save" });
  const request = f.requests().at(-1);
  f.reply(request, {
    revision: 1,
    persisted: true,
    cancelled: true,
    schemaVersion: 999,
    metadata: { future: "first" },
  });
  const result = await saved;
  assert.equal(result.revision, 1);
  assert.equal(result.persisted, true);
  assert.deepEqual(f.sdk.snapshot, { revision: 1, schemaVersion: 1, value: state });
  f.reply(request, {
    revision: 1,
    persisted: true,
    cancelled: false,
    schemaVersion: 222,
    metadata: { future: "changed" },
  });
  await flush();
  assert.deepEqual(f.errors, []);
  assert.equal(f.sdk.snapshot.revision, 1);
  assert.doesNotThrow(() => validateTranscript(f.pair.messages.map((entry) => entry.message)));
});

test("state schema and byte limits reject local saves while locked context keeps the confirmed state", async (t) => {
  const stateSchema = {
    type: "object",
    required: ["scene"],
    properties: { scene: { type: "string" } },
  };
  const f = await running(t, {
    sdk: { validateState: (state) => validateSchema(stateSchema, state) },
  });
  await assert.rejects(f.sdk.saveState({ scene: 12 }), { code: "invalid_message" });
  await assert.rejects(f.sdk.saveState({ scene: "recover", notes: "🧩".repeat(1500) }), {
    code: "too_large",
  });
  f.host("host.context", { locale: "de", disabled: true });
  await flush();
  await assert.rejects(f.sdk.saveState({ scene: "recover" }), { code: "locked" });
  assert.equal(f.requests().length, 0);
  assert.equal(f.sdk.snapshot.revision, 0);
});

test("the 10-second timeout preserves state and exact retries keep their operation ID", async (t) => {
  const f = await running(t);
  const state = { scene: "recover", copied: ["note.txt"] };
  const first = f.sdk.saveState(state, { id: "stable-save" });
  let settled = false;
  void first.then(
    () => (settled = true),
    () => (settled = true)
  );
  const failure = assert.rejects(first, { code: "timeout", retryable: true });
  const firstRequest = f.requests().at(-1);
  f.clock.advanceTo(9999);
  await flush();
  assert.equal(settled, false);
  f.clock.advanceTo(10000);
  await failure;
  await flush();
  assert.equal(f.sdk.snapshot.revision, 0);
  await assert.rejects(f.sdk.saveState({ scene: "different" }, { id: "stable-save" }), {
    code: "operation_conflict",
  });
  const retried = f.sdk.saveState(state, { id: "stable-save" });
  assert.equal(f.sdk.saveState(state, { id: "stable-save" }), retried);
  await flush();
  const retryRequest = f.requests().at(-1);
  assert.equal(retryRequest.id, firstRequest.id);
  assert.deepEqual(retryRequest.payload, firstRequest.payload);
  assert.ok(retryRequest.seq > firstRequest.seq);
  f.reply(retryRequest, { revision: 1, persisted: true });
  await retried;
  assert.equal(f.sdk.snapshot.revision, 1);
  assert.equal(f.clock.pending, 0);
});

test("a late acknowledgement before a queued retry avoids a second transmission and timer", async (t) => {
  const f = await running(t);
  const first = f.sdk.saveState({ scene: "first" }, { id: "late-save" });
  const firstRequest = f.requests().at(-1);
  const timeout = assert.rejects(first, { code: "timeout" });
  f.clock.advanceTo(10000);
  await timeout;
  await flush();
  const following = f.sdk.saveState(
    { scene: "following" },
    { id: "following-save", expectedRevision: 1 }
  );
  await flush();
  const retry = f.sdk.retry("late-save");
  assert.equal(f.requests().length, 2);
  f.reply(firstRequest, { revision: 1, persisted: true });
  await flush();
  assert.equal(f.clock.pending, 1);
  f.reply(f.requests()[1], { revision: 2, persisted: true });
  await following;
  assert.deepEqual(await retry, { revision: 1, persisted: true });
  assert.equal(f.requests().length, 2);
  assert.equal(f.clock.pending, 0);
  assert.deepEqual(f.sdk.snapshot.value, { scene: "following" });
  await assert.rejects(f.sdk.retry("unknown-operation"), { code: "invalid_message" });
});

test("reset helper retries preserve the original revision after a newer state is read", async (t) => {
  const f = await running(t);
  const reset = f.sdk.resetState("reset-original");
  const original = f.requests().at(-1);
  const timeout = assert.rejects(reset, { code: "timeout" });
  f.clock.advanceTo(10000);
  await timeout;
  await flush();
  const read = f.sdk.readState();
  f.reply(f.requests().at(-1), {
    revision: 2,
    schemaVersion: 1,
    state: { scene: "newer" },
    maxBytes: 4096,
  });
  await read;
  const retry = f.sdk.resetState("reset-original");
  await flush();
  const repeated = f.requests().at(-1);
  assert.equal(repeated.id, original.id);
  assert.deepEqual(repeated.payload, original.payload);
  assert.equal(repeated.payload.expectedRevision, 0);
  f.reply(repeated, { cancelled: true });
  assert.deepEqual(await retry, { cancelled: true });
  assert.equal(f.sdk.snapshot.revision, 2);
  assert.deepEqual(f.sdk.snapshot.value, { scene: "newer" });
});

test("duplicate responses and committed awards do not repeat effects", async (t) => {
  const f = await running(t);
  const state = { scene: "recover", copied: ["note.txt"] };
  const saved = f.sdk.saveState(state, { id: "one-save" });
  const request = f.requests().at(-1);
  f.reply(request, { revision: 1, persisted: true });
  await saved;
  f.reply(request, { revision: 1, persisted: true });
  f.reply(request, { revision: 2, persisted: true });
  const awards = [];
  f.sdk.on("reward.committed", (award) => awards.push(award));
  const award = {
    awardId: "one-award",
    goalId: "restore-openable",
    xp: 0,
    result: "introduced",
    persisted: true,
  };
  f.host("reward.committed", award);
  f.host("reward.committed", award);
  await flush();
  assert.equal(awards.length, 1);
  assert.equal(f.sdk.snapshot.revision, 1);
  assert.deepEqual(
    f.errors.map((error) => error.code),
    ["operation_conflict"]
  );
  const sent = f.requests().length;
  assert.deepEqual(await f.sdk.saveState(state, { id: "one-save" }), {
    revision: 1,
    persisted: true,
  });
  assert.equal(f.requests().length, sent);
});

test("mutations transmit in order and later revisions are explicit", async (t) => {
  const f = await running(t);
  const first = f.sdk.saveState({ scene: "first" }, { id: "ordered-first", expectedRevision: 0 });
  const second = f.sdk.saveState(
    { scene: "second" },
    { id: "ordered-second", expectedRevision: 1 }
  );
  assert.equal(f.requests().length, 1);
  f.reply(f.requests()[0], { revision: 1, persisted: true });
  await first;
  await flush();
  assert.equal(f.requests().length, 2);
  assert.equal(f.requests()[1].payload.expectedRevision, 1);
  f.reply(f.requests()[1], { revision: 2, persisted: true });
  await second;
  assert.deepEqual(f.sdk.snapshot, { revision: 2, schemaVersion: 1, value: { scene: "second" } });
});

test("explicit disposal cancels queued saves and ignores already queued late replies", async (t) => {
  const f = await running(t);
  const first = f.sdk.saveState({ scene: "first" }, { id: "pending-first" });
  const second = f.sdk.saveState(
    { scene: "second" },
    { id: "pending-second", expectedRevision: 1 }
  );
  const cancelled = Promise.all([
    assert.rejects(first, { code: "cancelled" }),
    assert.rejects(second, { code: "cancelled" }),
  ]);
  const request = f.requests()[0];
  f.sdk.dispose();
  await cancelled;
  f.late({ ...messageFixtures[3], sessionId: request.sessionId, seq: 100, replyTo: request.id });
  await flush();
  assert.equal(f.sdk.phase, "disposed");
  assert.equal(f.sdk.context, undefined);
  assert.equal(f.sdk.snapshot, undefined);
  assert.equal(f.clock.pending, 0);
  assert.equal(f.pair.listenerCount(), 0);
  assert.equal(f.requests().length, 1);
  await assert.rejects(f.sdk.readState(), { code: "cancelled" });
  assert.throws(() => f.pair.host.send(messageFixtures[0]), { code: "offline" });
});

test("host lifecycle disposal acknowledges then cancels pending saves and closes resources", async (t) => {
  const f = await running(t);
  const pending = f.sdk.saveState({ scene: "unsaved" });
  const failure = assert.rejects(pending, { code: "cancelled" });
  const request = await f.lifecycle("disposed", "host-dispose");
  await failure;
  const response = f.lessonMessages().find((message) => message.replyTo === request.id);
  assert.deepEqual(response.payload, { ok: true, data: { phase: "disposed", dirty: false } });
  assert.equal(f.sdk.phase, "disposed");
  assert.equal(f.sdk.context, undefined);
  assert.equal(f.clock.pending, 0);
  assert.equal(f.pair.listenerCount(), 0);
});

test("async lifecycle callbacks complete in host order and successful same-ID retries stay cached", async (t) => {
  const barrier = deferred();
  const calls = [];
  const f = fixture(t, {
    sdk: {
      onLifecycle: async (phase) => {
        calls.push(phase);
        if (phase === "running") return barrier.promise;
        return false;
      },
    },
  });
  await f.connect();
  f.sdk.ready("recover");
  const run = f.host("host.lifecycle", { phase: "running", reason: "test" }, "request", {
    id: "async-run",
  });
  const pause = f.host("host.lifecycle", { phase: "paused", reason: "test" }, "request", {
    id: "async-pause",
  });
  await flush();
  assert.deepEqual(calls, ["running"]);
  assert.equal(f.lessonMessages().filter((message) => message.kind === "response").length, 0);
  barrier.resolve(true);
  await flush();
  assert.deepEqual(calls, ["running", "paused"]);
  assert.equal(f.sdk.phase, "paused");
  const responses = f.lessonMessages().filter((message) => message.kind === "response");
  assert.deepEqual(
    responses.map((message) => message.replyTo),
    [run.id, pause.id]
  );
  assert.equal(responses[0].payload.data.dirty, true);
  f.host("host.lifecycle", { phase: "paused", reason: "test" }, "request", { id: pause.id });
  await flush();
  assert.deepEqual(calls, ["running", "paused"]);
  assert.deepEqual(f.lessonMessages().at(-1).payload, responses[1].payload);
});

test("a failed lifecycle callback can retry its exact host ID without committing an early phase", async (t) => {
  let calls = 0;
  const f = fixture(t, {
    sdk: {
      onLifecycle: () => {
        if (++calls === 1) throw new Error("Temporary local pause failure");
        return true;
      },
    },
  });
  await f.connect();
  f.sdk.ready("recover");
  await f.lifecycle("running", "retry-running");
  assert.equal(f.sdk.phase, "ready");
  assert.equal(f.lessonMessages().at(-1).payload.ok, false);
  assert.equal(f.lessonMessages().at(-1).payload.error.retryable, true);
  await f.lifecycle("running", "retry-running");
  assert.equal(f.sdk.phase, "running");
  assert.equal(calls, 2);
  assert.deepEqual(f.lessonMessages().at(-1).payload.data, { phase: "running", dirty: true });
});

test("disposing during an async lifecycle callback prevents its late acknowledgement", async (t) => {
  const barrier = deferred();
  const f = fixture(t, { sdk: { onLifecycle: () => barrier.promise } });
  await f.connect();
  f.sdk.ready("recover");
  f.host("host.lifecycle", { phase: "running", reason: "test" }, "request");
  await flush();
  f.sdk.dispose();
  barrier.resolve(false);
  await flush();
  assert.equal(f.sdk.phase, "disposed");
  assert.equal(f.sdk.context, undefined);
  assert.equal(f.lessonMessages().filter((message) => message.kind === "response").length, 0);
  assert.equal(f.clock.pending, 0);
});

test("unknown events are ignored and unknown requests receive unsupported", async (t) => {
  const f = await running(t);
  let called = 0;
  f.sdk.on("future.changed", () => called++);
  f.host("future.changed", { arbitrary: true });
  const request = f.host("future.ask", { arbitrary: true }, "request");
  await flush();
  assert.equal(called, 0);
  assert.deepEqual(f.errors, []);
  const response = f.lessonMessages().at(-1);
  assert.equal(response.replyTo, request.id);
  assert.equal(response.payload.ok, false);
  assert.equal(response.payload.error.code, "unsupported");
  assert.equal(response.payload.error.retryable, false);
  const transcript = f.pair.messages.map((entry) => structuredClone(entry.message));
  const senders = f.pair.messages.map((entry) => entry.sender);
  assert.doesNotThrow(() => validateTranscript(transcript, { senders }));
  transcript.at(-1).payload.error.code = "internal";
  assert.throws(() => validateTranscript(transcript, { senders }), { code: "invalid_message" });
  const before = f.requests().length;
  await assert.rejects(f.sdk.request("future.ask", {}), { code: "unsupported" });
  assert.equal(f.requests().length, before);
});

test("example or rejected assessments cannot count as passed events or RPC results", async (t) => {
  const f = await running(t);
  const observed = [];
  f.sdk.on("assessment.result", (result) => observed.push(result));
  const submission = f.sdk.request("assessment.submit", {
    goalId: "restore-openable",
    stateRevision: 0,
    answer: { selected: "synthetic-choice" },
  });
  const request = f.requests().at(-1);
  const verified = {
    assessmentId: "checked-1",
    status: "final",
    outcome: "passed",
    counts: true,
    feedback: { summary: "Synthetic server confirmation", source: "server", rejected: false },
  };
  for (const change of [{ source: "example" }, { rejected: true }]) {
    const invalid = { ...verified, feedback: { ...verified.feedback, ...change } };
    f.reply(request, invalid);
    f.host("assessment.result", { ...invalid, goalId: "restore-openable" });
  }
  await flush();
  assert.equal(f.errors.length, 4);
  assert.equal(observed.length, 0);
  assert.equal(f.clock.pending, 1);
  f.reply(request, verified);
  assert.deepEqual(await submission, verified);
  f.host("assessment.result", { ...verified, goalId: "restore-openable" });
  await flush();
  assert.equal(observed.length, 1);
  assert.equal(f.clock.pending, 0);
  assert.equal(
    f.lessonMessages().some((message) => message.type === "reward.committed"),
    false
  );
});

test("goal extensions act only on each operation's defined singular or plural goal field", async (t) => {
  const f = await running(t);
  assert.doesNotThrow(() =>
    f.sdk.event("goals.progress", {
      goalId: "restore-openable",
      fraction: 0.5,
      goalIds: ["unknown-extension"],
    })
  );
  const completed = f.sdk.request("completion.request", {
    goalIds: ["restore-openable"],
    stateRevision: 0,
    receiptHandles: [],
    goalId: "unknown-extension",
  });
  f.reply(f.requests().at(-1), { outcome: "introduced", persisted: true });
  assert.deepEqual(await completed, { outcome: "introduced", persisted: true });
  await assert.rejects(
    f.sdk.request("completion.request", {
      goalIds: ["unknown-goal"],
      stateRevision: 0,
      receiptHandles: [],
    }),
    { code: "invalid_message" }
  );
  assert.equal(f.requests().length, 1);
});

test("unknown goalId fields on unrelated operations are ignored while transcript sessions stay bound", async (t) => {
  const f = await running(t);
  const read = f.sdk.request("state.read", { goalId: "future-extension" });
  f.reply(f.requests().at(-1), {
    revision: 0,
    schemaVersion: 1,
    state: f.init.state.value,
    maxBytes: 4096,
  });
  await read;
  const surface = { ...f.init.surface, revision: 2, goalId: "future-extension" };
  f.host("host.surface", surface);
  await flush();
  assert.equal(f.sdk.context.surface.revision, 2);
  assert.deepEqual(f.errors, []);
  const transcript = f.pair.messages.map((entry) => structuredClone(entry.message));
  transcript.at(-1).sessionId = "different-session";
  assert.throws(() => validateTranscript(transcript), { code: "invalid_message" });
  const cancellation = [
    {
      protocol: { major: 2, minor: 0 },
      sessionId: "cancel-session",
      seq: 1,
      id: "cancel-1",
      kind: "request",
      type: "request.cancel",
      payload: { requestId: "old-request" },
    },
    {
      protocol: { major: 2, minor: 0 },
      sessionId: "cancel-session",
      seq: 1,
      id: "cancel-result",
      kind: "response",
      type: "rpc.result",
      replyTo: "cancel-1",
      payload: { ok: true, data: { cancelled: false } },
    },
  ];
  assert.doesNotThrow(() => validateTranscript(cancellation, { senders: ["host", "lesson"] }));
  assert.throws(() => validateTranscript(cancellation, { senders: ["host", "host"] }), {
    code: "invalid_message",
  });
});

test("gesture navigation requires acknowledged policy, ownership, completion, epoch and thresholds", async (t) => {
  const f = await running(t);
  const eligible = {
    direction: "next",
    epoch: 4,
    distanceCss: -96,
    crossDistanceCss: 20,
    owner: "navigation",
    completed: true,
  };
  await assert.rejects(f.sdk.gesture({ ...eligible, epoch: 0 }), { code: "locked" });
  const policy = f.sdk.navigation({ forward: true, back: false }, "release-swipe");
  assert.equal(f.sdk.navigationPolicy.swipe.forward, false);
  f.reply(f.requests().at(-1), { epoch: 4, swipe: { forward: true, back: false } });
  await policy;
  for (const change of [
    { owner: "scene" },
    { completed: false },
    { cancelled: true },
    { multiTouch: true },
    { zooming: true },
    { selectingText: true },
    { inputOpen: true },
    { epoch: 3 },
    { direction: "previous", distanceCss: 96 },
    { distanceCss: -63 },
    { crossDistanceCss: 65 },
    { distanceCss: 96 },
  ])
    await assert.rejects(f.sdk.gesture({ ...eligible, ...change }), { code: "locked" });
  assert.equal(f.requests().length, 1);
  await assert.rejects(
    f.sdk.request("navigation.gesture", {
      direction: "next",
      epoch: 4,
      distanceCss: -64,
      crossDistanceCss: 42,
    }),
    { code: "locked" }
  );
  const gesture = f.sdk.gesture({ ...eligible, distanceCss: -64, crossDistanceCss: 42 });
  const request = f.requests().at(-1);
  assert.equal(request.type, "navigation.gesture");
  assert.deepEqual(request.payload, {
    direction: "next",
    epoch: 4,
    distanceCss: -64,
    crossDistanceCss: 42,
  });
  f.reply(request, { accepted: true });
  assert.deepEqual(await gesture, { accepted: true });
  assert.equal(
    f
      .requests()
      .some(
        (message) => message.type.startsWith("assessment.") || message.type === "completion.request"
      ),
    false
  );
  assert.doesNotThrow(() => validateMessage(request, { sender: "lesson" }));
});
