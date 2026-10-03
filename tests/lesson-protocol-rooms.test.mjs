import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";
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
    {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    }
  ).outputText
);
const { createLearningRooms } = await import(pathToFileURL(controllerFile));
const { createRoomProtocolBinding } = await compiled.importModule("rooms");
const { LessonHost } = await compiled.importModule("host");
const { LessonSDK } = await compiled.importModule("sdk");
const { createTestTransportPair, VirtualClock } = await compiled.importModule("testing");

const UNIT = "j2-example";
const COURSE = "j2-example";
const clone = (value) => structuredClone(value);
const signature = (value) =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([left], [right]) => left.localeCompare(right))
        )
      : item
  );
const deferred = () => {
  let resolve;
  const promise = new Promise((yes) => (resolve = yes));
  return { promise, resolve };
};
const flush = async () => {
  for (let i = 0; i < 4; i++) await new Promise((resolve) => setImmediate(resolve));
};
const path = { id: COURSE, title: { de: "J2", en: "J2" } };
const initialRoom = () => ({
  course_id: COURSE,
  unit: {
    id: UNIT,
    path_id: COURSE,
    title: path.title,
    room: "custom",
    content: {
      protocolIntroduction: {
        ref: "fixture-restore",
        match: { restored: true },
        answer: { restored: true },
      },
    },
    teaches: [],
    practices: [],
    requires: [],
  },
  progress: { revision: 0, state: {}, status: "new", result: null, review_id: null },
  review_available: false,
});

// This transport models the existing server's CAS/exact-receipt boundary and a
// reply lost after commit. Actual native-service/browser evidence is separate.
async function fixture(t) {
  let owner = "alpha";
  let view;
  let loseNextReply = false;
  let delayedReply;
  const rows = new Map(["alpha", "beta"].map((id) => [id, initialRoom()]));
  const receipts = new Map();
  const calls = [];
  let commits = 0;
  const controller = createLearningRooms({
    id: randomUUID,
    changed: (next) => (view = next),
    async request(requestPath, method = "GET", body) {
      const account = owner;
      calls.push({ path: requestPath, method, owner: account, body: body && clone(body) });
      const url = new URL(requestPath, "https://synthetic-api.invalid");
      if (url.pathname.endsWith("/capabilities")) return { enabled: true };
      if (method === "GET") {
        const room = clone(rows.get(account));
        return url.pathname === "/skills/rooms" ? { paths: [path], path, next: room } : room;
      }
      assert.equal(url.searchParams.get("course"), COURSE);
      const receiptId = `${account}:${body.request_id}`;
      const fingerprint = signature({ path: requestPath, method, body });
      const receipt = receipts.get(receiptId);
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) throw { statusCode: 409 };
        return clone(receipt.room);
      }
      const room = clone(rows.get(account));
      if (
        body.expected_revision !== room.progress.revision ||
        (body.review_id || null) !== room.progress.review_id
      )
        throw { statusCode: 409 };
      if (method === "PUT") {
        room.progress.state = clone(body.state);
        room.progress.status = "in_progress";
      } else {
        assert.equal(url.pathname, `/skills/rooms/${UNIT}/complete`);
        if (signature(body.answer) !== signature({ restored: true })) throw { statusCode: 422 };
        room.progress.status = "completed";
        room.progress.result = { kind: "introduced" };
      }
      room.progress.revision++;
      rows.set(account, clone(room));
      receipts.set(receiptId, { fingerprint, room: clone(room) });
      commits++;
      if (loseNextReply) {
        loseNextReply = false;
        throw new Error("Response lost after the server committed");
      }
      if (delayedReply) {
        const waiting = delayedReply;
        delayedReply = undefined;
        await waiting.promise;
      }
      return room;
    },
  });
  t.after(() => controller.dispose());
  await controller.start(true, COURSE, true, { courseId: COURSE, unitId: UNIT });
  const actions = createRoomProtocolBinding(controller, () => owner).bind({
    unitId: UNIT,
    schemaVersion: 1,
    initialState: {},
    introduction: initialRoom().unit.content.protocolIntroduction,
    resetConfirm: async () => true,
    navigate: async () => true,
    progress: () => {},
    busy: () => {},
  });
  return {
    controller,
    actions,
    rows,
    calls,
    loseReply: () => (loseNextReply = true),
    delayReply() {
      const waiting = deferred();
      delayedReply = waiting;
      return waiting.resolve;
    },
    async switchOwner() {
      owner = "beta";
      controller.reset();
      await controller.start(true, COURSE, true, { courseId: COURSE, unitId: UNIT });
    },
    async switchReview() {
      const next = clone(rows.get(owner));
      next.progress = {
        revision: 7,
        state: { note: "another confirmed practice round" },
        status: "in_progress",
        result: null,
        review_id: randomUUID(),
      };
      rows.set(owner, next);
      controller.reset();
      await controller.start(true, COURSE, true, { courseId: COURSE, unitId: UNIT });
    },
    get view() {
      return view;
    },
    get writes() {
      return calls.filter(({ method }) => method === "PUT");
    },
    get commits() {
      return commits;
    },
  };
}

test("room binding retries a lost committed save exactly once without a third PUT", async (t) => {
  const f = await fixture(t);
  const state = { restored: true, note: "keep my work" };
  const key = randomUUID();
  f.loseReply();
  await assert.rejects(f.actions.save(state, 0, key), { code: "offline" });
  assert.equal(f.rows.get("alpha").progress.revision, 1);
  assert.equal(f.view.room.progress.revision, 0);
  assert.deepEqual(f.view.draft, state);
  assert.equal(f.view.dirty, true);
  await assert.rejects(f.actions.save({ ...state, note: "changed under the same key" }, 0, key), {
    code: "operation_conflict",
  });
  assert.equal(f.writes.length, 1);

  const confirmed = await f.actions.save(state, 0, key);
  assert.deepEqual(confirmed, { revision: 1, schemaVersion: 1, value: state });
  assert.equal(f.writes.length, 2);
  assert.deepEqual(f.writes[0], f.writes[1]);
  assert.equal(f.writes[0].body.request_id, key);
  assert.equal(f.commits, 1);
  assert.equal(f.view.dirty, false);
  assert.deepEqual(await f.actions.read(), confirmed);
});

test("a genuine edit following an uncertain save gets a fresh CAS operation after exact retry", async (t) => {
  const f = await fixture(t);
  const original = { note: "first" };
  const latest = { note: "actually edited later" };
  const key = randomUUID();
  f.loseReply();
  await assert.rejects(f.actions.save(original, 0, key), { code: "offline" });
  f.controller.edit(latest);
  assert.equal(await f.controller.save(key), true);
  assert.equal(f.writes.length, 3);
  assert.deepEqual(f.writes[0].body, f.writes[1].body);
  assert.notEqual(f.writes[2].body.request_id, key);
  assert.equal(f.writes[2].body.expected_revision, 1);
  assert.deepEqual(f.writes[2].body.state, latest);
  assert.deepEqual(f.rows.get("alpha").progress.state, latest);
  assert.equal(f.rows.get("alpha").progress.revision, 2);
  assert.equal(f.view.dirty, false);
  assert.equal(f.commits, 2);
});

test("SDK and actual room binding refuse a changed state or new key while a save is uncertain", async (t) => {
  const f = await fixture(t);
  const pair = createTestTransportPair();
  const clock = new VirtualClock();
  const manifest = JSON.parse(
    await readFile(new URL("../lesson-protocol/fixtures/manifest.json", import.meta.url))
  );
  manifest.requires = [];
  manifest.optional = [];
  const surface = JSON.parse(
    await readFile(new URL("../lesson-protocol/fixtures/messages.json", import.meta.url))
  )[0].payload.surface;
  const host = new LessonHost({
    manifest,
    manifestHash: "a".repeat(64),
    transport: pair.host,
    actions: f.actions,
    clock,
    context: { locale: "de", content: {}, disabled: false, surface },
    validateState: () => {},
    status: () => {},
  });
  const sdk = new LessonSDK({
    manifest,
    manifestHash: "a".repeat(64),
    transport: pair.lesson,
    clock,
  });
  t.after(() => {
    sdk.dispose();
    host.dispose();
  });
  const starting = sdk.start();
  host.start();
  await starting;
  sdk.ready("restore");
  await flush();
  assert.equal(host.phase, "running");
  const state = { restored: true, note: "original" };
  const key = randomUUID();
  f.loseReply();
  await assert.rejects(sdk.saveState(state, { id: key }), { code: "offline" });
  await assert.rejects(sdk.saveState({ ...state, note: "rewritten" }, { id: key }), {
    code: "operation_conflict",
  });
  await assert.rejects(sdk.saveState(state, { id: randomUUID() }), { code: "locked" });
  assert.equal(f.writes.length, 1);
  assert.deepEqual(f.rows.get("alpha").progress.state, state);
  await sdk.retry(key);
  assert.equal(f.writes.length, 2);
  assert.deepEqual(f.writes[0].body, f.writes[1].body);
  assert.equal(sdk.snapshot.revision, 1);
});

for (const change of ["owner", "review"]) {
  test(`late room save is cancelled after the ${change} changes and cannot replace new work`, async (t) => {
    const f = await fixture(t);
    const release = f.delayReply();
    const pending = f.actions.save({ note: "old private work" }, 0, randomUUID());
    const cancelled = assert.rejects(pending, { code: "cancelled" });
    assert.equal(f.writes.length, 1);
    if (change === "owner") await f.switchOwner();
    else await f.switchReview();
    const selected = clone(f.view.room);
    release();
    await cancelled;
    assert.equal(f.actions.current(), false);
    assert.deepEqual(f.view.room, selected);
    assert.deepEqual(f.view.draft, selected.progress.state);
    assert.equal(f.view.dirty, false);
    assert.equal(f.writes.length, 1);
    if (change === "owner") assert.deepEqual(f.rows.get("beta").progress.state, {});
  });
}

test("introduced completion checks saved state and sends the approved answer while preserving the note", async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.actions.complete(["restore-openable"], 0, randomUUID()), {
    code: "invalid_receipt",
  });
  assert.equal(f.calls.filter(({ method }) => method === "POST").length, 0);
  const state = { restored: true, note: "my own saved note" };
  await f.actions.save(state, 0, randomUUID());
  assert.deepEqual(await f.actions.complete(["restore-openable"], 1, randomUUID()), {
    outcome: "introduced",
    persisted: true,
  });
  const completion = f.calls.find(({ method }) => method === "POST");
  assert.deepEqual(completion.body.answer, { restored: true });
  assert.equal(completion.body.expected_revision, 1);
  assert.deepEqual(f.rows.get("alpha").progress.state, state);
  assert.deepEqual(f.rows.get("alpha").progress.result, { kind: "introduced" });
});
