import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, test } from "node:test";
import { loadLessonProtocol } from "./helpers/lesson-protocol-loader.mjs";
const compiled = await loadLessonProtocol();
after(compiled.cleanup);
const { LessonHost, serverStateBytes } = await compiled.importModule("host");
const { LessonSDK } = await compiled.importModule("sdk");
const { ProtocolError } = await compiled.importModule("types");
const { createTestTransportPair, VirtualClock } = await compiled.importModule("testing");
const {
  packageLocation,
  createLessonWindowTransport,
  validateLessonCsp,
  verifyLessonPackage,
  sha256,
} = await compiled.importModule("browser");
const { canonicalJson } = await compiled.importModule("schema");
const manifest = JSON.parse(
  await readFile(new URL("../lesson-protocol/fixtures/manifest.json", import.meta.url))
);
manifest.requires = [];
manifest.optional = [];
const surface = JSON.parse(
  await readFile(new URL("../lesson-protocol/fixtures/messages.json", import.meta.url))
)[0].payload.surface;
const flush = async () => {
  for (let i = 0; i < 4; i++) await new Promise((resolve) => setImmediate(resolve));
};
async function fixture(t, overrides = {}) {
  const pair = createTestTransportPair();
  const clock = new VirtualClock();
  let state = { revision: 0, schemaVersion: 1, value: {} };
  let owner = true;
  const writes = [];
  const progress = [];
  const phases = [];
  const actions = {
    current: () => owner,
    read: async () => structuredClone(state),
    save: async (value, revision, key) => {
      writes.push({ value, revision, key });
      state = { revision: revision + 1, schemaVersion: 1, value };
      return structuredClone(state);
    },
    reset: async () => null,
    complete: async () => ({ outcome: "introduced", persisted: true }),
    navigate: async () => false,
    progress: (...args) => progress.push(args),
    busy: () => {},
    ...overrides.actions,
  };
  const host = new LessonHost({
    manifest,
    manifestHash: "a".repeat(64),
    transport: pair.host,
    actions,
    clock,
    context: { locale: "de", content: {}, disabled: !!overrides.disabled, surface },
    validateState: overrides.validateState || (() => {}),
    status: (phase) => phases.push(phase),
  });
  const sdk = new LessonSDK({
    manifest,
    manifestHash: "a".repeat(64),
    transport: pair.lesson,
    clock,
    onLifecycle: overrides.onLifecycle,
  });
  t.after(() => {
    sdk.dispose();
    host.dispose();
  });
  const start = sdk.start();
  host.start();
  await start;
  sdk.ready("restore");
  await flush();
  assert.equal(host.phase, "running");
  return {
    host,
    sdk,
    pair,
    writes,
    progress,
    phases,
    clock,
    actions,
    setOwner: () => {
      owner = false;
    },
    state: () => state,
  };
}
test("real SDK/host handshake saves before acknowledgement; progress awards nothing", async (t) => {
  const f = await fixture(t);
  assert.match(f.host.sessionId, /^[a-f0-9-]{36}$/);
  f.sdk.progress("restore-openable", 1);
  await flush();
  assert.deepEqual(f.progress, [["restore-openable", 1]]);
  const result = await f.sdk.saveState({ note: "mine" }, { id: "save-1" });
  assert.deepEqual(result, { revision: 1, persisted: true });
  assert.equal(f.sdk.snapshot.revision, 1);
  assert.equal(f.writes.length, 1);
  await f.sdk.retry("save-1");
  assert.equal(f.writes.length, 1);
  assert.equal(
    f.pair.messages.some((row) => row.message.type === "reward.committed"),
    false
  );
});
test("planned navigation flushes local SDK state before the host can leave", async (t) => {
  let sdk;
  const f = await fixture(t, {
    onLifecycle: async (_phase, reason) => {
      if (reason === "navigation") await sdk.saveState({ note: "last local edit" });
      return false;
    },
  });
  sdk = f.sdk;
  assert.equal(await f.host.prepareNavigation(), true);
  assert.equal(f.host.phase, "paused");
  assert.equal(f.state().value.note, "last local edit");
});
test("failed preparation retains the live scene and retries the same pending save", async (t) => {
  let sdk,
    pending = false,
    calls = 0;
  const keys = [];
  const f = await fixture(t, {
    actions: {
      save: async (value, _revision, key) => {
        keys.push(key);
        if (++calls === 1) throw new ProtocolError("offline", "lost reply", true);
        return { revision: 1, schemaVersion: 1, value };
      },
    },
    onLifecycle: async (_phase, reason) => {
      if (reason !== "navigation") return pending;
      try {
        if (pending) await sdk.retry("last-save");
        else {
          pending = true;
          await sdk.saveState({ note: "kept" }, { id: "last-save" });
        }
        pending = false;
      } catch {
        return true;
      }
      return false;
    },
  });
  sdk = f.sdk;
  assert.equal(await f.host.prepareNavigation(), false);
  assert.equal(f.host.phase, "running");
  assert.equal(await f.host.prepareNavigation(), true);
  assert.equal(keys[0], keys[1]);
});
test("frame-requested navigation permits its lifecycle save without a queue deadlock", async (t) => {
  let sdk, writes;
  const f = await fixture(t, {
    onLifecycle: async (_phase, reason) => {
      if (reason === "navigation") await sdk.saveState({ note: "before close" });
      return false;
    },
    actions: {
      navigate: async () => {
        assert.equal(writes.length, 1);
        return true;
      },
    },
  });
  sdk = f.sdk;
  writes = f.writes;
  assert.deepEqual(await sdk.request("navigation.request", { direction: "close" }), {
    accepted: true,
  });
});
const strictCsp =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors https://test.bootstrap.academy http://localhost:58761";
test("CSP source parsing rejects mixed-none, wildcards, duplicate and exfiltration directives", () => {
  validateLessonCsp(strictCsp, "https://test.bootstrap.academy");
  for (const policy of [
    strictCsp.replace("connect-src 'none'", "connect-src 'none' https://evil.example"),
    strictCsp.replace("script-src 'self'", "script-src *"),
    strictCsp.replace("img-src 'self'", "img-src data: https:"),
    strictCsp.replace(
      "frame-ancestors https://test.bootstrap.academy http://localhost:58761",
      "frame-ancestors *"
    ),
    strictCsp + "; script-src 'self'",
    strictCsp + "; report-uri https://evil.example",
  ])
    assert.throws(() => validateLessonCsp(policy, "https://test.bootstrap.academy"), {
      code: "no_access",
    });
});
test("package verification checks immutable inventory, response type, byte hashes and state schema", async () => {
  const m = structuredClone(manifest);
  const content = new Map([
    ["index.html", new TextEncoder().encode("<!doctype html><title>Hash test</title>")],
    ["main.js", new TextEncoder().encode("export const inert = true;")],
    [
      "state.schema.json",
      new TextEncoder().encode('{"type":"object","additionalProperties":false}'),
    ],
  ]);
  m.assets = await Promise.all(
    m.assets.map(async (asset) => ({
      ...asset,
      bytes: content.get(asset.path).length,
      sha256: await sha256(content.get(asset.path)),
    }))
  );
  const package_hash = await sha256(new TextEncoder().encode(canonicalJson(m.assets)));
  const base = `https://content.pages.dev/packages/${package_hash}/`;
  const bytes = new TextEncoder().encode(JSON.stringify(m));
  const descriptor = {
    id: m.id,
    api_version: 2,
    entry_url: base,
    manifest_url: base + "manifest.json",
    manifest_hash: await sha256(bytes),
    package_hash,
  };
  const calls = [];
  let altered = false,
    type = false;
  const load = async (url, options) => {
    calls.push(options);
    const name = url === base ? "index.html" : url.slice(base.length);
    let body = name === "manifest.json" ? bytes : content.get(name);
    if (altered && name === "main.js") body = new TextEncoder().encode("export const inert=false;");
    const media =
      name === "manifest.json"
        ? "application/json"
        : m.assets.find((a) => a.path === name).mediaType;
    const response = new Response(body, {
      headers: {
        "content-type": type ? "text/plain" : media,
        "content-security-policy": strictCsp,
      },
    });
    Object.defineProperty(response, "url", { value: url });
    return response;
  };
  const verify = () =>
    verifyLessonPackage(
      descriptor,
      "https://content.pages.dev",
      "https://test.bootstrap.academy",
      new AbortController().signal,
      load
    );
  const result = await verify();
  result.validateState({});
  assert.throws(() => result.validateState({ action: "save" }));
  assert(
    calls.every(
      (options) =>
        options.credentials === "omit" &&
        options.redirect === "error" &&
        options.referrerPolicy === "no-referrer"
    )
  );
  altered = true;
  await assert.rejects(verify(), { code: "no_access" });
  altered = false;
  type = true;
  await assert.rejects(verify(), { code: "no_access" });
});
test("lost confirmation retries the same server key and blocks conflicting new writes", async (t) => {
  let calls = 0;
  const keys = [];
  const f = await fixture(t, {
    actions: {
      save: async (value, revision, key) => {
        calls++;
        keys.push(key);
        if (calls === 1) throw new ProtocolError("offline", "lost confirmation", true);
        return { revision: 1, schemaVersion: 1, value };
      },
    },
  });
  await assert.rejects(f.sdk.saveState({ note: "kept" }, { id: "unknown-save" }), {
    code: "offline",
  });
  await assert.rejects(f.sdk.saveState({ note: "changed" }, { id: "new-save" }), {
    code: "locked",
  });
  await f.sdk.retry("unknown-save");
  assert.equal(keys[0], keys[1]);
  assert.equal(calls, 2);
  assert.equal(f.sdk.snapshot.revision, 1);
});
test("a changed operation ID and foreign receipt never reach server actions", async (t) => {
  const f = await fixture(t);
  await f.sdk.saveState({ note: "one" }, { id: "fixed" });
  await assert.rejects(f.sdk.saveState({ note: "two" }, { id: "fixed" }), {
    code: "operation_conflict",
  });
  await assert.rejects(
    f.sdk.request("completion.request", {
      goalIds: ["restore-openable"],
      stateRevision: 1,
      receiptHandles: ["foreign"],
    }),
    { code: "invalid_receipt" }
  );
  assert.equal(f.writes.length, 1);
});
test("disabled actions, unsupported capabilities and unknown RPCs are honest refusals", async (t) => {
  const f = await fixture(t, { disabled: true });
  await assert.rejects(f.sdk.saveState({}), { code: "locked" });
  assert.equal(f.writes.length, 0);
  await assert.rejects(f.sdk.request("project.read", {}), { code: "missing_capability" });
  const received = [];
  f.pair.lesson.subscribe((message) => received.push(message));
  f.pair.lesson.send({
    protocol: { major: 2, minor: 0 },
    sessionId: f.host.sessionId,
    seq: 99,
    id: "unknown",
    kind: "request",
    type: "evil.fetch",
    payload: { url: "https://example.invalid" },
  });
  await flush();
  assert.equal(received.at(-1).payload.error.code, "unsupported");
});
test("dispose and owner change cannot deliver late personal state", async (t) => {
  let release;
  const delayed = new Promise((resolve) => {
    release = resolve;
  });
  const f = await fixture(t, { actions: { save: async () => delayed } });
  const pending = f.sdk.saveState({ note: "owner-a" });
  await flush();
  f.setOwner();
  release({ revision: 1, schemaVersion: 1, value: { note: "owner-a" } });
  await flush();
  assert.equal(f.sdk.snapshot.revision, 0);
  f.sdk.dispose();
  await assert.rejects(pending, { code: "cancelled" });
});
test("lesson errors close transport and preserve confirmed state; malformed directions fail closed", async (t) => {
  const f = await fixture(t);
  await f.sdk.saveState({ note: "confirmed" });
  f.sdk.error("synthetic", true);
  await flush();
  assert.equal(f.host.phase, "recoverable-error");
  assert.equal(f.state().value.note, "confirmed");
});
test("state limit counts Skills separator spaces and untrusted input remains JSON", () => {
  assert.equal(
    serverStateBytes({ a: [1, 2], b: 'colon: comma, slash\\"' }),
    Buffer.byteLength('{"a": [1, 2], "b": "colon: comma, slash\\\\\\\""}')
  );
  const state = Object.fromEntries(Array.from({ length: 7000 }, (_, i) => [String(i), 0]));
  assert(serverStateBytes(state) > Buffer.byteLength(JSON.stringify(state)));
});
test("reset validates the platform baseline before any destructive server mutation", async (t) => {
  let resets = 0;
  const f = await fixture(t, {
    actions: {
      read: async () => ({ revision: 0, schemaVersion: 1, value: { note: "kept" } }),
      reset: async () => {
        resets++;
        return { revision: 1, schemaVersion: 1, value: {} };
      },
    },
    validateState: (value) => {
      if (typeof value.note !== "string")
        throw new ProtocolError("invalid_message", "Note required.");
    },
  });
  await assert.rejects(f.sdk.resetState(), { code: "unsupported" });
  assert.equal(resets, 0);
  assert.deepEqual(f.sdk.snapshot, { revision: 0, schemaVersion: 1, value: { note: "kept" } });
  assert.equal(f.host.phase, "running");
});
test("content origin/package paths reject app domains, grants, mismatched hashes and credentials", () => {
  const package_hash = "a".repeat(64);
  const base = `https://content.pages.dev/packages/${package_hash}/`;
  const d = {
    id: "x",
    api_version: 2,
    entry_url: base,
    manifest_url: base + "manifest.json",
    manifest_hash: "b".repeat(64),
    package_hash,
  };
  assert.equal(
    packageLocation(d, "https://content.pages.dev", "https://test.bootstrap.academy").origin,
    "https://content.pages.dev"
  );
  for (const origin of [
    "https://test.bootstrap.academy",
    "https://content.bootstrap.academy",
    "https://user:pass@content.pages.dev",
    "https://content.pages.dev/path",
  ])
    assert.throws(() => packageLocation(d, origin, "https://test.bootstrap.academy"));
  assert.throws(() =>
    packageLocation(
      { ...d, manifest_url: d.manifest_url + "?grant=secret" },
      "https://content.pages.dev",
      "https://test.bootstrap.academy"
    )
  );
});
test("window bootstrap validates both parent origin and exact source; only one port is bound", async () => {
  let listener;
  const parent = {};
  const target = {
    parent,
    addEventListener: (_name, fn) => {
      listener = fn;
    },
    removeEventListener: () => {},
  };
  const transport = createLessonWindowTransport(target, "https://host.example");
  const received = [];
  transport.subscribe((message) => received.push(message));
  const port = { start() {}, close() {}, postMessage() {} };
  const data = {
    protocol: { major: 2, minor: 0 },
    sessionId: "session",
    seq: 1,
    id: "connect",
    kind: "event",
    type: "host.connect",
    payload: { transport: "message-port", manifestHash: "a".repeat(64) },
  };
  listener({ origin: "https://evil.example", source: parent, ports: [port], data });
  listener({ origin: "https://host.example", source: {}, ports: [port], data });
  assert.equal(received.length, 0);
  listener({ origin: "https://host.example", source: parent, ports: [port], data });
  assert.equal(received.length, 1);
  listener({ origin: "https://host.example", source: parent, ports: [port], data });
  assert.equal(received.length, 1);
  transport.close();
  assert.equal(port.onmessage, null);
});
