import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { after, test } from "node:test";
import { loadLessonProtocol } from "./helpers/lesson-protocol-loader.mjs";

const protocol = await loadLessonProtocol();
after(protocol.cleanup);
const {
  assertSchema,
  validateManifest,
  validateMessage,
  validateReplay,
  validateInit,
  validateTranscript,
} = await protocol.importModule("validation");
const readJson = async (path) =>
  JSON.parse(await readFile(new URL(`../lesson-protocol/${path}`, import.meta.url), "utf8"));
const [manifestSchema, messageSchema, replaySchema, manifest, messages, replay, rubric] =
  await Promise.all([
    readJson("schemas/manifest.schema.json"),
    readJson("schemas/message.schema.json"),
    readJson("schemas/replay.schema.json"),
    readJson("fixtures/manifest.json"),
    readJson("fixtures/messages.json"),
    readJson("fixtures/replay.json"),
    readJson("fixtures/rubric.json"),
  ]);

function mutated(base, change) {
  const value = structuredClone(base);
  change(value);
  return value;
}

const senders = ["host", "lesson", "lesson", "host", "lesson", "host", "lesson", "host"];
const requestTypes = {
  "save-1": "state.save",
  "swipe-policy-1": "navigation.policy",
  "project-1": "project.read",
};
const messageContext = (index) => ({
  sender: senders[index],
  ...(messages[index].kind === "response"
    ? { requestType: requestTypes[messages[index].replyTo] }
    : {}),
});
const replayContext = {
  manifest,
  capabilities: messages[0].payload.capabilities,
  manifestHash: replay.manifestHash,
  packageHash: replay.packageHash,
};

// These are the 53 named checks from the original specification validator.
// The schemas and examples are canonical repository files; contract validation
// uses the same public TypeScript API available to future hosts and authors.
for (const [name, schema] of [
  ["manifest", manifestSchema],
  ["envelope", messageSchema],
  ["replay", replaySchema],
])
  test(`metaschema:${name}`, () => assert.doesNotThrow(() => assertSchema(schema)));

test("manifest:portrait", () => assert.deepEqual(validateManifest(manifest), manifest));

test("manifest:landscape", () => {
  const landscape = mutated(manifest, (value) => {
    Object.assign(value.stage, {
      orientation: "landscape",
      logical: { width: 640, height: 360 },
      reason: { de: "Breiter Ablauf", en: "Wide flow" },
    });
  });
  assert.deepEqual(validateManifest(landscape), landscape);
});

test("manifest:unknown-extension", () => {
  const extended = mutated(manifest, (value) => {
    value.futureFeature = { enabled: true };
  });
  assert.doesNotThrow(() => validateManifest(extended));
});

for (let index = 0; index < 8; index++)
  test(`envelope:example-${index + 1}`, () => {
    assert.equal(messages.length, 8);
    assert.deepEqual(validateMessage(messages[index], messageContext(index)), messages[index]);
  });

test("replay:example", () => assert.deepEqual(validateReplay(replay, replayContext), replay));

test("replay:unknown-extension", () => {
  const extended = mutated(replay, (value) => {
    value.futureNote = "ignored";
  });
  assert.doesNotThrow(() => validateReplay(extended, replayContext));
});

const manifestNegative = [
  ["major", (value) => (value.protocol.major = 1)],
  ["external-entry", (value) => (value.entry = "https://example.invalid/index.html")],
  ["traversal", (value) => (value.entry = "../index.html")],
  ["query", (value) => (value.entry = "index.html?grant=fixture")],
  ["wrong-stage", (value) => (value.stage.logical.width = 390)],
  [
    "landscape-reason",
    (value) =>
      Object.assign(value.stage, {
        orientation: "landscape",
        logical: { width: 640, height: 360 },
      }),
  ],
  ["introduced-xp", (value) => (value.goals[0].xp = 1)],
  ["llm-fallback", (value) => (value.goals[0].assessment.kind = "llm")],
  ["required-llm", (value) => value.requires.push({ id: "host.llm", major: 1, minMinor: 0 })],
  ["duplicate-goal", (value) => value.goals.push(structuredClone(value.goals[0]))],
  ["duplicate-asset", (value) => value.assets.push(structuredClone(value.assets[0]))],
  ["duplicate-capability", (value) => value.optional.push(structuredClone(value.requires[0]))],
  ["entry-asset", (value) => value.assets.shift()],
  ["entry-mime", (value) => (value.assets[0].mediaType = "text/javascript")],
  ["state-schema", (value) => (value.state.schema = "absent.json")],
  ["state-bound", (value) => (value.state.maxBytes = 65537)],
  ["translation", (value) => delete value.goals[0].label.en],
  ["hash", (value) => (value.assets[0].sha256 = "not-a-hash")],
];
for (const [name, change] of manifestNegative)
  test(`reject-manifest:${name}`, () =>
    assert.throws(() => validateManifest(mutated(manifest, change))));

const envelopeNegative = [
  ["major", 2, (value) => (value.protocol.major = 1)],
  ["response-reference", 3, (value) => delete value.replyTo],
  ["response-shape", 3, (value) => delete value.payload.data],
  [
    "response-contradiction",
    3,
    (value) => (value.payload.error = { code: "offline", message: "Retry", retryable: true }),
  ],
  ["response-as-event", 3, (value) => (value.kind = "event")],
  ["save-revision", 2, (value) => (value.payload.expectedRevision = -1)],
  ["save-state", 2, (value) => (value.payload.state = [])],
  ["size", 2, (value) => (value.payload.padding = "x".repeat(262144))],
  ["seq-boolean", 2, (value) => (value.seq = true)],
];
for (const [name, index, change] of envelopeNegative)
  test(`reject-envelope:${name}`, () =>
    assert.throws(() => validateMessage(mutated(messages[index], change), messageContext(index))));

const replayNegative = [
  ["live-provider", (value) => (value.fixtures.providerMode = "live")],
  ["introduced-xp", (value) => (value.expectFinal.xp = 1)],
  ["provider-calls", (value) => (value.expectFinal.providerCalls = 1)],
  ["time-order", (value) => (value.steps[0].atMs = 3000)],
  ["drag", (value) => (value.steps[1].action.points = [])],
  ["target", (value) => delete value.steps[0].action.target],
];
for (const [name, change] of replayNegative)
  test(`reject-replay:${name}`, () =>
    assert.throws(() => validateReplay(mutated(replay, change), replayContext)));

test("fixture-bindings-and-negotiation", () => {
  const init = messages[0].payload;
  assert.deepEqual(validateInit(manifest, init), init);
  assert.deepEqual(validateReplay(replay, replayContext), replay);
  assert.equal(init.lessonId, manifest.id);
  const granted = new Map(init.capabilities.map((capability) => [capability.id, capability]));
  for (const required of manifest.requires) {
    const capability = granted.get(required.id);
    assert.ok(capability, `Required capability ${required.id}`);
    assert.equal(capability.major, required.major);
    assert.ok(capability.minor >= required.minMinor);
  }
  assert.ok(init.limits.stateBytes <= manifest.state.maxBytes);
  for (const engine of replay.engines) {
    assert.equal(engine.implementation, granted.get(engine.id).implementation);
    assert.equal(engine.sha256, granted.get(engine.id).sha256);
  }
  assert.equal(granted.has("host.project"), false);
  assert.equal(messages.at(-1).payload.error.code, "missing_capability");
});

test("example-directions-responses-sequences", () => {
  assert.doesNotThrow(() => validateTranscript(messages));
  const requests = new Map();
  const previous = { host: 0, lesson: 0 };
  messages.forEach((message, index) => {
    const sender = senders[index];
    validateMessage(message, messageContext(index));
    if (message.kind === "request") requests.set(message.id, sender);
    if (message.kind === "response") {
      assert.ok(requests.has(message.replyTo));
      assert.notEqual(sender, requests.get(message.replyTo));
    }
    assert.ok(message.seq > previous[sender]);
    previous[sender] = message.seq;
  });
});

test("local-document-links", async () => {
  const readme = new URL("../lesson-protocol/README.md", import.meta.url);
  const source = await readFile(readme, "utf8");
  const localLinks = [...source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1].replace(/^<|>$/g, ""))
    .filter((target) => !/^[a-z][a-z0-9+.-]*:/i.test(target));
  assert.ok(localLinks.length, "README links to its schemas and examples");
  for (const target of localLinks) {
    const path = target.split("#", 1)[0];
    assert.ok(await stat(path ? new URL(path, readme) : readme), `Local path exists: ${target}`);
  }
});

test("rubric-total-and-mechanics", () => {
  assert.equal(rubric.weights.length, 12);
  assert.equal(
    rubric.weights.reduce((sum, weight) => sum + weight, 0),
    rubric.total
  );
  assert.equal(rubric.total, 100);
  assert.deepEqual(rubric.mechanicsIndexes, [1, 2, 4, 5]);
  assert.equal(
    rubric.mechanicsIndexes.reduce((sum, index) => sum + rubric.weights[index], 0),
    rubric.mechanicsTotal
  );
  assert.equal(rubric.mechanicsTotal, 40);
});
