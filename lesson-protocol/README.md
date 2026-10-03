# Lesson protocol v2

This directory is the canonical platform/lesson contract. It is outside Nuxt's
automatic imports, component discovery, Tailwind content scanning and `public/`.
The WebHost is loaded only for a server-selected v2 descriptor when
`lessonProtocolV2` is enabled. The default is `false`; v1 keeps its existing
`mount(element, host)` runtime with either flag value.

The JSON Schemas use Draft 2020-12:

- [Manifest](schemas/manifest.schema.json): package metadata and requirements.
- [Messages](schemas/message.schema.json): envelope, all 36 payloads and RPC
  result shapes. `x-operations` supplies direction, kind and capability metadata;
  `$defs` and `allOf` enforce the payloads with ordinary JSON Schema validators.
- [Replay](schemas/replay.schema.json): private recorded test format, version 1.

Schema identifiers are contract identifiers, not published HTTP endpoints.
Additional fields are accepted; the SDK only acts on defined fields. Known
operations reject unknown enum values and invalid payloads. Unknown events are
ignored and unknown requests return `unsupported`. `validateMessage` checks
both directions; a response needs `requestType` to check its operation-specific
data. `validateTranscript` also checks request references and sender sequences.
The dependency-free validator implements the keywords actually used in these
schemas; `assertSchema` checks that supported dialect. It is not a general
Draft 2020-12 engine or a replacement for a full metaschema validator.

## Lesson API

```ts
import { LessonSDK } from "./lesson-protocol";

const sdk = new LessonSDK({ manifest, manifestHash, transport });
const init = await sdk.start(); // connect → hello → init
applySnapshot(init.state); // one atomic application, owned by the lesson
sdk.ready("recover");
sdk.progress("restore-openable", 0.5); // no completion or XP
await sdk.saveState(state, { id: "save-action-1" });
await sdk.navigation({ forward: true, back: false });
await sdk.navigate("next");
sdk.dispose();
```

`context`, `snapshot`, `phase`, `capability(id, major, minMinor)` and
`navigationPolicy` return the negotiated state. `readState`, `saveState`,
`resetState`, `progress`, `busy`, `error`, `navigation`, `navigate`, `gesture`,
`on(type, listener)`, `retry(id)` and the general `request(type, payload, {id})` cover the
contract. State setters update the confirmed snapshot after a valid host
response. An optional `validateState` callback validates the lesson's own
state schema. A schema-version mismatch requires an explicitly tested migration;
the SDK never resets or invents one. `onLifecycle` pauses/stops local resources
and returns whether the lesson has unsaved work. The host controls lifecycle.

RPCs time out after 10 seconds with a retryable `ProtocolError`. A timeout does
not say whether a server write committed. Retry with the same ID, type and
payload; a changed operation returns `operation_conflict`. `retry(id)` retains
the original payload, including its expected revision. The state convenience
methods retain that revision when the same ID is used again. Await a completed
save before starting the next save with a newly derived revision. The SDK serializes
state, project and assessment mutations by resource. Revisions remain explicit;
it never silently merges conflicting states. Repeated replies and award IDs do
not repeat notification. Status polling and actual server idempotence belong to
the host. A valid response is a host acknowledgement, not an SDK-generated
server receipt. Completion and reward still require the trusted server.

`Transport` has only `send`, `subscribe` and `close`. `browser.ts` implements the trusted
MessagePort bootstrap with fixed Origin/Source and a document-bound session.
A later native adapter can implement the same interface with JSON strings.
Only one transport is connected per SDK. No DOM, cookies, authentication, HTTP,
provider or native-channel implementation is included. `testing.ts` provides
isolated endpoints and a virtual clock for tests. These are separate from the
public SDK entry point.

`host.ts` uses all three schemas, `operations`, both direction validators and the
SDK's handshake. It verifies package bytes, registry/owner bindings, server
limits and idempotent writes; JSON validity creates no trust.
J4 can use state, progress, navigation and lifecycle without choosing a renderer.
J3 supplies pointer ownership and the gesture recognizer; `gesture` checks an
eligible completed navigation candidate, epoch and the 64px/1.5 thresholds.
The SDK does not handle DOM pointers or evaluate model text. Text rendering
and the output/action boundary remain separate C5 obligations. `safe-output.ts`
appends streaming chunks as text nodes and parses schema-checked JSON as data.

## WebHost and synthetic example

`ProtocolActivity.vue` requires an authenticated room binding, a configured
`lessonContentOrigin` on another registrable domain and a server-selected
`api_version: 2` descriptor containing the immutable entry, manifest and package
hashes. Tokens, owner IDs and HTTP clients stay in the parent. Public assets are
fetched without credentials, redirects or referrers; MIME types, every byte
hash, the complete resource inventory and a restrictive CSP are checked before
the document starts. The transferred MessagePort is tied to that iframe and
session. Navigation, error, unmount and owner/session changes close the port.

`rooms.ts` adapts state/read/save/reset and completion to the existing Skills
room routes and their CAS/idempotency/recovery controller. A retry retains the
server operation and body. Planned navigation asks the lesson to pause and
flush local edits; a dirty acknowledgement keeps the page and resumes the
scene. Authors must implement `onLifecycle` to pause local resources and save
their last local edit for reason `navigation` before returning `false`. An
unconfirmed save must return `true` and remain retryable. Tab loss can still
lose a change that was never sent; it must never be labelled saved.

Core completion currently supports only server-approved introductions using
`unit.content.protocolIntroduction = {ref, match, answer}`. The host checks the
manifest's assessment reference, matches the saved state and sends the fixed
answer to the real introduction validator. This is not assessment or an XP
authority. Optional services, including live LLM and project/assessment
capabilities, receive no grants and fail honestly. Stage scaling, gestures and
actual fullscreen are separate work; navigation swipes remain disabled.

Build the small fixture-derived example with the existing build dependencies:

```sh
node tools/build-lesson-example.mjs /tmp/lesson-example https://YOUR-CONTENT.pages.dev
```

Upload only `/tmp/lesson-example/site` to a static Pages project without
Functions or a paid domain. `descriptor.json` is private registration metadata,
not a public course catalogue. The example is approved for the Test host and
`http://localhost:58761` only; its CSP/parent allowlist must match any new host.
Local acceptance uses `http://127.0.0.2:58762`, allowed only with a loopback app.
The current Skills importer still emits v1 descriptors; the synthetic local
acceptance adapter replaces only this example's descriptor while native access,
state, revisions and completion responses remain authoritative. Publishing a
real v2 catalogue needs its own approved importer/registry integration.

## Replay tests

[Manifest](fixtures/manifest.json), [messages](fixtures/messages.json) and
[replay](fixtures/replay.json) are the original synthetic specification examples.
Their hashes, screen names and sizes are placeholders, not release evidence.
[Rubric](fixtures/rubric.json) retains the original proposed weighting only for
the migrated sum check; it does not approve the proposal.

`playReplay(replay, driver)` injects a private test driver. The driver reports its
actual package/build/engine bindings, receives seed, clock, starting snapshots
and fault fixtures, applies semantic actions and supplies read-only snapshots
and messages. A driver may report `{sender, message}` records so bidirectional
requests and unknown future operations have explicit direction. Optional
`expect.senders` records those directions for a complete session segment.
Only an explicit reload starts a new segment. Expectations are never passed into the action driver. Assertions
use JSON Pointer, including `~0`/`~1`, against
`{state, project, host, navigation, scene}`. Final outcome, XP, persistence,
zero provider calls and the canonical state hash must match. A missing screenshot
driver fails any recorded screenshot step. A driver owns private screenshot
baselines and video capture; this runner provides no browser/video evidence.
Resources are disposed even when a step fails.

Canonical JSON uses UTF-8, Unicode code-point-sorted object keys,
`JSON.stringify` number encoding, no whitespace and unchanged array order.
`canonicalHash` uses SHA-256 via Web Crypto. The runner derives the manifest
hash from the supplied canonical manifest; the caller derives package/engine
hashes from the actual bytes. Replay artifacts stay outside runtime assets.

Run the contract, SDK and replay checks with the existing Node test runner:

```sh
node --test tests/lesson-protocol-*.test.mjs
```

Tests compile TypeScript with the existing development dependency into a
temporary directory and clean it up. They do not add a runtime dependency.
