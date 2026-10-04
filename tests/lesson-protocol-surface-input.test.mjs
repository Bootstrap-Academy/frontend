import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { loadLessonProtocol } from "./helpers/lesson-protocol-loader.mjs";

const compiled = await loadLessonProtocol();
after(compiled.cleanup);
const { calculateSurface, stagePoint, minimumHitSize } = await compiled.importModule("surface");
const { LessonPointers } = await compiled.importModule("input");
const { LessonSDK } = await compiled.importModule("sdk");
const { LessonHost } = await compiled.importModule("host");
const { LessonDisplay } = await compiled.importModule("display");
const { createTestTransportPair } = await compiled.importModule("testing");
const manifest = JSON.parse(
  await readFile(new URL("../lesson-protocol/fixtures/manifest.json", import.meta.url))
);
manifest.requires = [];
manifest.optional = [];
const flush = async () => {
  for (let i = 0; i < 4; i++) await new Promise((resolve) => setImmediate(resolve));
};
async function bridge(t, options = {}) {
  const pair = createTestTransportPair();
  const navigations = [],
    writes = [];
  let state = { revision: 0, schemaVersion: 1, value: {} };
  const host = new LessonHost({
    manifest,
    manifestHash: "a".repeat(64),
    transport: pair.host,
    context: {
      locale: "de",
      content: {},
      disabled: false,
      surface: calculateSurface({ width: 390, height: 700, orientation: "portrait" }),
    },
    validateState: () => {},
    status: () => {},
    actions: {
      current: () => true,
      read: async () => state,
      save: async (value) => {
        writes.push(value);
        state = { ...state, revision: state.revision + 1, value };
        return state;
      },
      reset: async () => null,
      complete: async () => ({ outcome: "introduced", persisted: true }),
      navigate: async (direction) => {
        navigations.push(direction);
        return options.accepted ?? false;
      },
      progress: () => {},
      busy: () => {},
    },
  });
  const sdk = new LessonSDK({
    manifest,
    manifestHash: "a".repeat(64),
    transport: pair.lesson,
    onLifecycle: options.onLifecycle,
  });
  t.after(() => {
    sdk.dispose();
    host.dispose();
  });
  const start = sdk.start();
  host.start();
  await start;
  sdk.ready("stage");
  await flush();
  return { sdk, host, pair, navigations, writes, pointers: new LessonPointers(sdk) };
}

test("portrait and landscape fit the complete stage and invert frame coordinates", () => {
  for (const orientation of ["portrait", "landscape"]) {
    const s = calculateSurface({ width: 390, height: 700, orientation });
    const [width, height] = orientation === "portrait" ? [360, 640] : [640, 360];
    assert(s.offset.x >= 0 && s.offset.y >= 0);
    assert(s.offset.x + width * s.scale <= 390);
    assert(s.offset.y + height * s.scale <= 700);
    const point = stagePoint(
      s,
      { x: 10 + s.offset.x + 180 * s.scale, y: 20 + s.offset.y + 320 * s.scale },
      { left: 10, top: 20 }
    );
    assert(Math.abs(point.x - 180) < 1e-9 && Math.abs(point.y - 320) < 1e-9);
    assert.equal(minimumHitSize(s) * s.scale, 44);
  }
});
test("safe rectangle incorporates edges and keyboard occlusion without double subtraction", () => {
  const s = calculateSurface({
    width: 360,
    height: 640,
    orientation: "portrait",
    occlusions: [{ x: 0, y: 400, width: 360, height: 240 }],
  });
  assert.deepEqual(s.safeRect, { x: 24, y: 24, width: 312, height: 376 });
  const tiny = calculateSurface({
    width: 90,
    height: 90,
    orientation: "portrait",
    edges: { left: 100, right: 100, top: 100, bottom: 100 },
  });
  assert(tiny.safeRect.width >= 0 && tiny.safeRect.height >= 0);
});
test("a released single swipe flushes scene work before requesting the next target", async (t) => {
  let sdk;
  const f = await bridge(t, {
    onLifecycle: async (phase, reason) => {
      if (phase === "paused" && reason === "navigation")
        await sdk.saveState({ last: "local edit" });
      return false;
    },
  });
  sdk = f.sdk;
  await sdk.navigation({ forward: true, back: true });
  f.pointers.begin({ id: 1, x: 100, y: 300 }, { scene: false, blocked: false, edge: false });
  await f.pointers.end({ id: 1, x: 105, y: 220 });
  assert.deepEqual(f.writes, [{ last: "local edit" }]);
  assert.deepEqual(f.navigations, ["next"]);
  assert.equal(f.sdk.phase, "running");
});
test("policy release cannot take a scene drag or an earlier navigation epoch", async (t) => {
  const f = await bridge(t);
  f.pointers.begin({ id: 1, x: 100, y: 300 }, { scene: true, blocked: false, edge: false });
  await f.sdk.navigation({ forward: true, back: true });
  await f.pointers.end({ id: 1, x: 100, y: 200 });
  f.pointers.begin({ id: 2, x: 100, y: 300 }, { scene: false, blocked: false, edge: false });
  await f.sdk.navigation({ forward: true, back: true });
  await f.pointers.end({ id: 2, x: 100, y: 200 });
  assert.deepEqual(f.navigations, []);
});
test("cancel, multi-touch, system edges, selection, open input and zoom do not navigate", async (t) => {
  const f = await bridge(t);
  await f.sdk.navigation({ forward: true, back: true });
  for (const options of [
    { edge: true },
    { blocked: true },
    { cancelled: true },
    { selectionOrZoom: true },
    { multi: true },
  ]) {
    f.pointers.begin(
      { id: 1, x: 100, y: 300 },
      { scene: false, blocked: !!options.blocked, edge: !!options.edge }
    );
    if (options.multi)
      f.pointers.begin({ id: 2, x: 120, y: 300 }, { scene: false, blocked: false, edge: false });
    if (options.selectionOrZoom) f.pointers.invalidate();
    await f.pointers.end({ id: 1, x: 100, y: 200 }, !!options.cancelled);
    f.pointers.cancel();
  }
  assert.deepEqual(f.navigations, []);
});
test("short/horizontal swipes are ignored and downward swipe uses previous", async (t) => {
  const f = await bridge(t);
  await f.sdk.navigation({ forward: true, back: true });
  for (const [x, y] of [
    [100, 250],
    [180, 230],
  ]) {
    f.pointers.begin({ id: 1, x: 100, y: 300 }, { scene: false, blocked: false, edge: false });
    await f.pointers.end({ id: 1, x, y });
  }
  assert.deepEqual(f.navigations, []);
  f.pointers.begin({ id: 2, x: 100, y: 100 }, { scene: false, blocked: false, edge: false });
  await f.pointers.end({ id: 2, x: 100, y: 200 });
  assert.deepEqual(f.navigations, ["previous"]);
});
test("host refuses gestures without a completed pointer, including forged threshold candidates", async (t) => {
  const f = await bridge(t);
  const { epoch } = await f.sdk.navigation({ forward: true, back: true });
  assert.deepEqual(
    await f.sdk.gesture({
      owner: "navigation",
      completed: true,
      epoch,
      direction: "next",
      distanceCss: -100,
      crossDistanceCss: 0,
    }),
    { accepted: false }
  );
  assert.deepEqual(f.navigations, []);
});
test("denied or dirty navigation preserves and resumes the scene", async (t) => {
  const f = await bridge(t, { onLifecycle: () => true });
  assert.deepEqual(await f.sdk.navigate("skip"), { accepted: false });
  assert.deepEqual(f.navigations, []);
  assert.equal(f.sdk.phase, "running");
});
test("surface changes are monotonic snapshots and DOM resources dispose once", async (t) => {
  const f = await bridge(t);
  f.host.surface(
    calculateSurface({
      width: 640,
      height: 360,
      orientation: "landscape",
      revision: 2,
      displayMode: "standalone",
      reducedMotion: true,
    })
  );
  f.host.surface(calculateSurface({ width: 1, height: 1, orientation: "portrait", revision: 1 }));
  await flush();
  assert.equal(f.sdk.context.surface.revision, 2);
  assert.equal(f.sdk.context.surface.displayMode, "standalone");
  let disposed = 0;
  f.sdk.onDispose(() => disposed++);
  f.sdk.dispose();
  f.sdk.dispose();
  assert.equal(disposed, 1);
});
test("fullscreen RPC offers a host activation; denial preserves page; standalone stays distinct", async () => {
  const doc = new EventTarget(),
    mql = new EventTarget();
  mql.matches = false;
  doc.defaultView = { navigator: {}, matchMedia: () => mql };
  doc.fullscreenEnabled = true;
  let calls = 0;
  const element = {
    ownerDocument: doc,
    requestFullscreen: () => {
      calls++;
      return Promise.reject(new Error("Denied"));
    },
  };
  const display = new LessonDisplay(element, () => {});
  assert.deepEqual(await display.request(true), { mode: "page", needsHostGesture: true });
  assert.equal(calls, 0);
  const denied = display.enter();
  assert.equal(calls, 1);
  assert.equal(await denied, false);
  mql.matches = true;
  assert.deepEqual(await display.request(true), { mode: "standalone", needsHostGesture: false });
  doc.fullscreenEnabled = false;
  mql.matches = false;
  assert.deepEqual(await display.request(true), { mode: "page", needsHostGesture: false });
  display.dispose();
});

test("pause during a pointer clears ownership and permits a fresh swipe after resume", async (t) => {
  const f = await bridge(t);
  await f.sdk.navigation({ forward: true, back: true });
  f.pointers.begin({ id: 1, x: 100, y: 300 }, { scene: false, blocked: false, edge: false });
  await flush();
  await f.host.visibility(true);
  f.pointers.cancel();
  await f.host.visibility(false);
  f.pointers.begin({ id: 2, x: 100, y: 300 }, { scene: false, blocked: false, edge: false });
  await f.pointers.end({ id: 2, x: 100, y: 200 });
  assert.deepEqual(f.navigations, ["next"]);
});
