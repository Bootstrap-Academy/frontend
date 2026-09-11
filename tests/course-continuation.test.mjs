import { fixtureFetch } from "./helpers/commercial-fetch.mjs";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import ts from "typescript";
import { compileScript, parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { createI18n } from "vue-i18n";

const scratch = await mkdtemp(join(tmpdir(), "course-continuation-test-"));
after(() => rm(scratch, { recursive: true, force: true }));
async function load(relative, component = false) {
  let source = await readFile(new URL(relative, import.meta.url), "utf8");
  if (component)
    source = compileScript(parse(source).descriptor, {
      id: relative,
      inlineTemplate: true,
    }).content;
  let code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const dependency of ["vue", "vue-i18n"])
    code = code.replace(
      new RegExp(`from ["']${dependency}["']`, "g"),
      `from ${JSON.stringify(import.meta.resolve(dependency))}`
    );
  for (const dependency of [
    "courseContinuation",
    "commercialStatus",
    "learningAccess",
    "shop",
    "commercialFetch",
  ])
    for (const prefix of ["./", "../composables/"])
      code = code.replaceAll(
        `from "${prefix}${dependency}"`,
        `from ${JSON.stringify(pathToFileURL(join(scratch, `${dependency}.mjs`)).href)}`
      );
  const path = join(
    scratch,
    relative
      .split("/")
      .at(-1)
      .replace(/\.(ts|vue)$/, ".mjs")
  );
  await writeFile(path, code);
  return import(pathToFileURL(path));
}
await load("../composables/commercialStatus.ts");
await load("../composables/shop.ts");
await load("../composables/commercialFetch.ts");
await load("../composables/learningAccess.ts");
const { createCommercialAccess } = await load("../composables/commercialAccess.ts");
const { createCourseContinuation } = await load("../composables/courseContinuation.ts");
const CourseComponent = (await load("../components/CourseContinuation.vue", true)).default;
const LearningComponent = (await load("../components/LearningAccess.vue", true)).default;
const clone = (v) => JSON.parse(JSON.stringify(v));
const ownerId = "11000000-0000-4000-8000-000000000001",
  caseId = "22000000-0000-4000-8000-000000000001",
  target = "33000000-0000-4000-8000-000000000001",
  otherTarget = "33000000-0000-4000-8000-000000000002",
  otherSource = "44000000-0000-4000-8000-000000000001",
  rightId = "55000000-0000-4000-8000-000000000001";
const claim = "a".repeat(43),
  key = "commercial-course-continuation-v1";
const http = (status) => Object.assign(Error(`Synthetic ${status}`), { response: { status } });
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { resolve, promise };
};
const original = (source = ownerId, id = rightId, started = true) => ({
  id,
  source_user_id: source,
  course_id: "arithmetic",
  observed_at: "2026-09-10T08:00:00Z",
  original: {
    source_user_id: source,
    course_id: "arithmetic",
    observed_course_access: !started,
    observed_started_course_access: started,
    purchase_ids: [],
    viewing_history_retained: false,
    scope: "Existing admission; no payment, performance or duration inferred",
  },
});
const delivery = (g) => ({
  grant_id: g.id,
  right_id: g.original_contract,
  subject: g.successor,
  state: "granted",
  new_purchase: false,
  original_result: {
    course_id: "arithmetic",
    access_granted: true,
    new_purchase: false,
    new_terms_accepted: false,
    original_performance_inferred: false,
    original_scope: clone(g.original_scope),
  },
});
async function fixture() {
  const stored = new Map(),
    calls = [],
    grants = [],
    receipts = [];
  const subjects = [
    { case_id: caseId, subject: target, erased_at: null },
    { case_id: caseId, subject: otherSource, erased_at: "2026-09-10T08:00:00Z" },
  ];
  const rights = new Map([
    [ownerId, [{ ...original(), current_subject: null, generation: 0 }]],
    [otherSource, [{ ...original(otherSource), current_subject: null, generation: 0 }]],
  ]);
  let fault = "",
    failStorage = false,
    identity = "same-personal-view",
    snapshotOverride = null,
    heldSource = null,
    heldMutation = null;
  const storage = {
    getItem: (k) => stored.get(k) ?? null,
    setItem(k, v) {
      if (failStorage) throw Error("Storage unavailable");
      stored.set(k, v);
    },
  };
  function exportValue() {
    const result = {
      case: { id: caseId, subject: ownerId, access_epoch: 3 },
      subject_erasures: [
        {
          subject: ownerId,
          case_id: caseId,
          request_id: ownerId,
          erased_at: "2026-09-10T08:00:00Z",
          scope: "ordinary_account",
        },
        {
          subject: otherSource,
          case_id: caseId,
          request_id: otherSource,
          erased_at: "2026-09-10T08:00:00Z",
          scope: "learning_data",
        },
      ],
      course_successor_grants: clone(grants),
      course_successor_receipts: clone(receipts),
    };
    snapshotOverride?.(result);
    return result;
  }
  function observation(g, value) {
    const receipt = {
      id: crypto.randomUUID(),
      grant_id: g.id,
      received_at: "2026-09-10T09:00:00Z",
      receipt_hash: createHash("sha256").update(JSON.stringify(value)).digest("hex"),
      receipt: clone(value),
    };
    if (!receipts.some((r) => JSON.stringify(r.receipt) === JSON.stringify(value)))
      receipts.push(receipt);
  }
  function seed(body, state = "granted") {
    const { current_subject, generation, ...o } = clone(
      rights.get(body.source_subject).find((r) => r.id === body.right_id)
    );
    const g = {
      id: body.command_id,
      command_id: body.command_id,
      case_id: caseId,
      source: "skills",
      original_contract: body.right_id,
      successor: body.successor,
      original_scope: o,
      claimant_authorization: { ...clone(body), original_scope: o },
      created_at: "2026-09-10T08:30:00Z",
      state,
      result: null,
    };
    if (state !== "reserved") {
      g.result =
        state === "uncertain"
          ? {
              grant_id: g.id,
              right_id: g.original_contract,
              subject: g.successor,
              state: "uncertain",
              reason: "Synthetic lost delivery",
              new_purchase: false,
            }
          : delivery(g);
      observation(g, g.result);
    }
    grants.push(g);
    return g;
  }
  const fetch = async (path, options) => {
    calls.push({ path, options: clone(options) });
    assert.equal(options.credentials, "omit");
    assert.equal(options.retry, 0);
    assert.deepEqual(options.headers, { "x-commercial-claim-key": claim });
    if (fault === "401") throw http(401);
    if (path.endsWith("/export")) {
      if (fault === "export-unavailable") throw http(503);
      return exportValue();
    }
    if (path.endsWith("/learning_summary")) return { subjects: clone(subjects) };
    if (path.endsWith("/course_rights")) {
      const source = options.body.source_subject,
        value = clone(rights.get(source));
      if (heldSource?.source === source) await heldSource.wait.promise;
      if (fault === "rights-unavailable") throw http(503);
      return value;
    }
    assert.equal(path, "/shop/claims/recipient/course_successor");
    const body = options.body;
    assert.deepEqual(Object.keys(body).sort(), [
      "command_id",
      "continue_existing_right",
      "right_id",
      "source_subject",
      "successor",
    ]);
    assert(
      JSON.parse(stored.get(key)).some(
        (r) => JSON.stringify(r.record.body) === JSON.stringify(body)
      ),
      "Exact original command saved before dispatch"
    );
    if (heldMutation) await heldMutation.promise;
    if (fault === "before") throw Error("Synthetic lost before commitment");
    let g = grants.find((g) => g.id === body.command_id);
    if (!g && !subjects.some((s) => s.subject === body.successor && s.erased_at === null))
      throw http(409);
    if (!g)
      g = seed(
        body,
        fault === "reserved409" ? "reserved" : fault === "uncertain" ? "uncertain" : "granted"
      );
    assert.deepEqual(
      { ...g.claimant_authorization, original_scope: undefined },
      { ...body, original_scope: undefined }
    );
    if (fault === "reserved409") throw http(409);
    if (g.state === "withdrawn") observation(g, { ...delivery(g), state: "withdrawn" });
    else if (fault !== "uncertain") {
      g.state = "granted";
      g.result = delivery(g);
      observation(g, g.result);
    }
    rights.get(body.source_subject)[0].current_subject =
      g.state === "withdrawn" ? null : g.successor;
    if (fault === "after") throw Error("Synthetic lost after commitment");
    if (fault === "after-export-unavailable") fault = "export-unavailable";
    return clone(g);
  };
  const commercial = createCommercialAccess({
    storage,
    fetch,
    identity: () => identity,
    ambient: () => identity,
    personalProof: () => null,
  });
  await commercial.connectKey(claim);
  const options = {
    storage,
    owner: () => commercial.owner.value,
    identity: () => identity,
    ambient: () => identity,
    snapshot: commercial.snapshot,
    summary: commercial.learningSummary,
    rights: commercial.courseRights,
    continueCourse: commercial.continueCourse,
  };
  const client = createCourseContinuation(options);
  return {
    client,
    commercial,
    options,
    stored,
    calls,
    grants,
    receipts,
    rights,
    subjects,
    seed,
    fault: (v) => (fault = v),
    storageFailure: (v) => (failStorage = v),
    snapshotOverride: (v) => (snapshotOverride = v),
    ownerChange() {
      identity = "another-owner";
      commercial.clear();
    },
    holdSource(source) {
      const wait = deferred();
      heldSource = { source, wait };
      return wait;
    },
    holdMutation() {
      heldMutation = deferred();
      return heldMutation;
    },
    erase() {
      subjects.find((s) => s.subject === target).erased_at = "2026-09-10T10:00:00Z";
      grants.forEach((g) => (g.state = "withdrawn"));
      rights.get(ownerId)[0].current_subject = null;
      rights.get(ownerId)[0].generation++;
    },
    dispose() {
      client.dispose();
      commercial.dispose();
    },
  };
}
async function prepare(f) {
  await f.client.loadRights(ownerId);
  await f.client.prepare(rightId, target);
  return JSON.parse(f.client.recoveryText());
}
const mutations = (f) => f.calls.filter((c) => c.path.endsWith("/course_successor"));

test("LastWatch-only course continuation keeps exact personal command separate from learning material", async () => {
  const f = await fixture();
  try {
    f.stored.set("commercial-learning-refresh-v1", "original-learning-bytes");
    const saved = await prepare(f);
    assert.equal(mutations(f).length, 0);
    assert.equal(saved.original.original.observed_course_access, false);
    assert.equal(saved.original.original.observed_started_course_access, true);
    assert.deepEqual(saved.original.original.purchase_ids, []);
    await f.client.submit();
    assert.equal(f.client.current.value.state, "granted");
    assert.equal(f.grants.length, 1);
    assert.equal(f.stored.get("commercial-learning-refresh-v1"), "original-learning-bytes");
    assert(
      f.calls.every(
        (c) => !/purchase|offer|terms|renewal|learning_start|learning_access/.test(c.path)
      )
    );
  } finally {
    f.dispose();
  }
});
test("Historical purchase identifiers preserve the actual String(36) contract without payment inference", async () => {
  const f = await fixture();
  try {
    const right = f.rights.get(ownerId)[0];
    right.original.observed_course_access = true;
    right.original.purchase_ids = ["paid-order", "x".repeat(36)];
    const saved = await prepare(f);
    assert.deepEqual(saved.original.original.purchase_ids, ["paid-order", "x".repeat(36)]);
    assert.equal(saved.original.original.observed_started_course_access, true);
    assert.equal(mutations(f).length, 0);
    const recovered = createCourseContinuation(f.options);
    await recovered.importRecovery(JSON.stringify(saved));
    assert.deepEqual(JSON.parse(recovered.recoveryText()).original, saved.original);
    await recovered.submit();
    assert.equal(recovered.current.value.state, "granted");
    assert.deepEqual(recovered.current.value.original_scope, saved.original);
    recovered.dispose();
    const malformed = clone(saved);
    malformed.original.original.purchase_ids = ["x".repeat(37)];
    assert.throws(() => f.client.importRecovery(JSON.stringify(malformed)), /invalid_response/);
  } finally {
    f.dispose();
  }
});
for (const fault of ["before", "after"])
  test(`Unknown ${fault} commitment uses original course command after restore; empty export is not refusal`, async () => {
    const f = await fixture();
    let restored;
    try {
      const saved = await prepare(f);
      f.fault(fault);
      await assert.rejects(f.client.submit());
      if (fault === "before") {
        await f.client.load();
        assert.equal(f.client.pending.value.state, "unconfirmed");
        assert(f.client.blocked.value);
        await assert.rejects(f.client.prepare(rightId, target), /pending_request/);
      }
      restored = createCourseContinuation(f.options);
      restored.restore();
      assert.equal(restored.current.value, null);
      assert.deepEqual(JSON.parse(restored.recoveryText()).body, saved.body);
      f.fault("");
      await restored.submit();
      assert.equal(restored.current.value.state, "granted");
      assert.equal(f.grants.length, 1);
      assert(
        mutations(f).every((c) => JSON.stringify(c.options.body) === JSON.stringify(saved.body))
      );
    } finally {
      restored?.dispose();
      f.dispose();
    }
  });
test("409 after reservation retains pending command and recovers it rather than creating another", async () => {
  const f = await fixture();
  try {
    const saved = await prepare(f);
    f.fault("reserved409");
    await assert.rejects(f.client.submit());
    assert.equal(f.client.current.value.state, "reserved");
    assert(f.client.blocked.value);
    assert.deepEqual(JSON.parse(f.client.recoveryText()).body, saved.body);
    await assert.rejects(f.client.prepare(rightId, otherTarget), /pending_request/);
    f.fault("");
    await f.client.submit();
    assert.equal(f.grants.length, 1);
  } finally {
    f.dispose();
  }
});
test("Earlier unknown attempt survives an older prepared-file import and later409 with empty export", async () => {
  const f = await fixture();
  let restored;
  try {
    const saved = await prepare(f);
    f.fault("before");
    await assert.rejects(f.client.submit());
    assert.equal(f.client.pending.value.uncertain_attempt, true);
    restored = createCourseContinuation(f.options);
    restored.restore();
    restored.importRecovery(JSON.stringify(saved));
    assert.equal(restored.pending.value.uncertain_attempt, true);
    f.erase();
    f.subjects.push({ case_id: caseId, subject: otherTarget, erased_at: null });
    f.fault("");
    await assert.rejects(restored.submit());
    assert.equal(f.grants.length, 0);
    assert.equal(restored.pending.value.state, "unconfirmed");
    assert.equal(restored.pending.value.uncertain_attempt, true);
    await restored.loadRights(ownerId);
    await assert.rejects(restored.prepare(rightId, otherTarget), /pending_request/);
    assert.deepEqual(JSON.parse(restored.recoveryText()).body, saved.body);
  } finally {
    restored?.dispose();
    f.dispose();
  }
});
for (const flag of ["false", "omitted"])
  test(`Fresh storage imported prepared file (${flag} uncertainty) stays pending after409 and empty export`, async () => {
    const f = await fixture();
    let restored;
    try {
      const saved = await prepare(f);
      assert.equal(saved.uncertain_attempt, false);
      if (flag === "omitted") delete saved.uncertain_attempt;
      const file = JSON.stringify(saved);
      f.fault("before");
      await assert.rejects(f.client.submit());
      assert.equal(f.client.pending.value.uncertain_attempt, true);
      f.commercial.clear();
      f.stored.clear();
      f.fault("");
      await f.commercial.connectKey(claim);
      restored = createCourseContinuation(f.options);
      restored.restore();
      assert.equal(f.stored.has(key), false);
      assert.equal(restored.pending.value, null);
      restored.importRecovery(file);
      assert.equal(restored.current.value, null);
      f.erase();
      f.subjects.push({ case_id: caseId, subject: otherTarget, erased_at: null });
      await assert.rejects(restored.submit());
      assert.equal(f.grants.length, 0);
      assert.equal(f.receipts.length, 0);
      assert.equal(restored.pending.value.state, "unconfirmed");
      assert.equal(restored.pending.value.uncertain_attempt, true);
      await restored.load();
      await restored.loadRights(ownerId);
      await assert.rejects(restored.prepare(rightId, otherTarget), /pending_request/);
      assert(restored.blocked.value);
      const recovered = JSON.parse(restored.recoveryText());
      assert.deepEqual(recovered.body, saved.body);
      assert.deepEqual(recovered.original, saved.original);
      assert.deepEqual(recovered.owner, saved.owner);
      assert.deepEqual(
        mutations(f).map((c) => c.options.body),
        [saved.body, saved.body]
      );
      assert.equal(JSON.parse(f.stored.get(key)).length, 1);
    } finally {
      restored?.dispose();
      f.dispose();
    }
  });
for (const state of ["reserved", "granted", "withdrawn"])
  test(`Fresh storage imported file reconciles only its original ${state} server grant`, async () => {
    const f = await fixture();
    let restored;
    try {
      const saved = await prepare(f);
      f.commercial.clear();
      f.stored.clear();
      await f.commercial.connectKey(claim);
      restored = createCourseContinuation(f.options);
      restored.importRecovery(JSON.stringify(saved));
      assert.equal(restored.current.value, null);
      assert.equal(restored.pending.value.uncertain_attempt, true);
      if (state === "withdrawn") f.erase();
      const grant = f.seed(saved.body, state);
      await restored.load();
      assert.equal(restored.pending.value.state, "observed");
      assert.equal(restored.pending.value.uncertain_attempt, false);
      assert.deepEqual(restored.current.value, grant);
      assert.deepEqual(restored.pending.value.body, saved.body);
      assert.deepEqual(restored.pending.value.original, saved.original);
      assert.equal(restored.pending.value.receipts.length, state === "reserved" ? 0 : 1);
      assert.equal(mutations(f).length, 0);
      assert.equal(f.grants.length, 1);
      assert.equal(JSON.parse(f.stored.get(key)).length, 1);
    } finally {
      restored?.dispose();
      f.dispose();
    }
  });
test("Fresh S1 erasure refusal permits deliberate S2 preparation without rewriting saved S1", async () => {
  const f = await fixture();
  try {
    const saved = await prepare(f);
    f.erase();
    f.subjects.push({ case_id: caseId, subject: otherTarget, erased_at: null });
    await assert.rejects(f.client.submit());
    assert.equal(f.client.pending.value.state, "refused");
    await f.client.load();
    assert(!f.client.blocked.value);
    await f.client.loadRights(ownerId);
    await f.client.prepare(rightId, otherTarget);
    const next = JSON.parse(f.client.recoveryText());
    assert.notEqual(next.body.command_id, saved.body.command_id);
    assert.equal(next.body.successor, otherTarget);
    assert(
      JSON.parse(f.stored.get(key)).some(
        (r) => JSON.stringify(r.record.body) === JSON.stringify(saved.body)
      )
    );
  } finally {
    f.dispose();
  }
});
test("Withdrawn grant keeps uncertain result and a separate late successful receipt; old target replay stays exact", async () => {
  const f = await fixture();
  try {
    const saved = await prepare(f);
    f.fault("uncertain");
    await f.client.submit();
    assert(f.client.blocked.value);
    f.erase();
    f.subjects.push({ case_id: caseId, subject: otherTarget, erased_at: null });
    f.fault("");
    await f.client.submit();
    assert.equal(f.client.current.value.state, "withdrawn");
    assert.equal(f.client.current.value.result.state, "uncertain");
    assert(
      f.client.pending.value.receipts.some(
        (r) => r.receipt.state === "withdrawn" && r.receipt.original_result.access_granted
      )
    );
    assert.deepEqual(JSON.parse(f.client.recoveryText()).body, saved.body);
    assert.equal(f.grants.length, 1);
    assert.equal(f.rights.get(ownerId)[0].current_subject, null);
  } finally {
    f.dispose();
  }
});
test("Existing right-target command requires explicit recovery and never replaces a prepared different command", async () => {
  const f = await fixture();
  try {
    const body = {
      command_id: crypto.randomUUID(),
      source_subject: ownerId,
      right_id: rightId,
      successor: target,
      continue_existing_right: true,
    };
    const g = f.seed(body);
    await f.client.loadRights(ownerId);
    await assert.rejects(f.client.prepare(rightId, target), /existing_request/);
    assert.equal(f.client.pending.value, null);
    await f.client.recoverGrant(g.id);
    assert.deepEqual(JSON.parse(f.client.recoveryText()).body, body);
    assert.equal(mutations(f).length, 0);
    f.client.clear();
    f.grants.length = f.receipts.length = 0;
    const prepared = await prepare(f);
    const later = f.seed({ ...body, command_id: crypto.randomUUID() });
    await assert.rejects(f.client.recoverGrant(later.id), /pending_request/);
    assert.deepEqual(JSON.parse(f.client.recoveryText()).body, prepared.body);
  } finally {
    f.dispose();
  }
});
test("Rights held by another target or changed original observations cannot prepare a fresh command", async () => {
  const f = await fixture();
  try {
    await f.client.loadRights(ownerId);
    f.rights.get(ownerId)[0].current_subject = otherTarget;
    await assert.rejects(f.client.prepare(rightId, target), /right_changed/);
    f.rights.get(ownerId)[0].current_subject = null;
    f.rights.get(ownerId)[0].original.scope = "Changed observation";
    await assert.rejects(f.client.prepare(rightId, target), /right_changed/);
    assert.equal(mutations(f).length, 0);
  } finally {
    f.dispose();
  }
});
test("Storage refusal prevents both preparation and mutation dispatch", async () => {
  const f = await fixture();
  try {
    await f.client.loadRights(ownerId);
    f.storageFailure(true);
    await assert.rejects(f.client.prepare(rightId, target));
    assert.equal(f.client.pending.value, null);
    f.storageFailure(false);
    await f.client.prepare(rightId, target);
    f.storageFailure(true);
    await assert.rejects(f.client.submit());
    assert.equal(mutations(f).length, 0);
  } finally {
    f.dispose();
  }
});
test("Delivery reply followed by unavailable export preserves recoverable original evidence", async () => {
  const f = await fixture();
  try {
    const saved = await prepare(f);
    f.fault("after-export-unavailable");
    await assert.rejects(f.client.submit());
    assert.equal(f.client.current.value, null);
    assert(f.client.blocked.value);
    assert.deepEqual(JSON.parse(f.client.recoveryText()).body, saved.body);
    f.fault("");
    await f.client.load();
    assert.equal(f.client.current.value.state, "granted");
    assert.equal(f.grants.length, 1);
  } finally {
    f.dispose();
  }
});
for (const kind of ["missing", "foreign-erasure", "authorization", "receipt-target"])
  test(`Malformed ${kind} export cannot confirm course evidence`, async () => {
    const f = await fixture();
    try {
      const saved = await prepare(f);
      await f.client.submit();
      f.snapshotOverride((v) => {
        if (kind === "missing") delete v.course_successor_receipts;
        if (kind === "foreign-erasure") v.subject_erasures[0].subject = otherTarget;
        if (kind === "authorization")
          v.course_successor_grants[0].claimant_authorization.case_id = caseId;
        if (kind === "receipt-target") v.course_successor_receipts[0].receipt.subject = otherTarget;
      });
      await assert.rejects(f.client.load());
      assert.equal(f.client.current.value, null);
      assert.deepEqual(JSON.parse(f.client.recoveryText()).body, saved.body);
    } finally {
      f.dispose();
    }
  });
test("Empty observed inventory is distinct from a failed course-rights service", async () => {
  const f = await fixture();
  try {
    f.rights.set(ownerId, []);
    await f.client.loadRights(ownerId);
    assert.deepEqual(f.client.rights.value, []);
    assert(f.client.rightsLoaded.value);
    f.fault("rights-unavailable");
    await assert.rejects(f.client.loadRights(ownerId));
    assert.equal(f.client.rightsLoaded.value, false);
    assert.equal(mutations(f).length, 0);
  } finally {
    f.dispose();
  }
});
test("Importing an older prepared course file preserves acquired receipt history and rejects conflicting evidence", async () => {
  const f = await fixture();
  try {
    const prepared = await prepare(f);
    await f.client.submit();
    const current = JSON.parse(f.client.recoveryText());
    assert(current.receipts.length);
    f.client.importRecovery(JSON.stringify(prepared));
    assert.equal(f.client.current.value, null);
    assert.deepEqual(JSON.parse(f.client.recoveryText()).receipts, current.receipts);
    const altered = clone(current);
    altered.receipts[0].received_at = "2026-09-11T09:00:00Z";
    await assert.rejects(
      async () => f.client.importRecovery(JSON.stringify(altered)),
      /conflicting_record/
    );
    for (const change of [
      (v) => (v.body.case_id = caseId),
      (v) => (v.operation = "learning_start"),
      (v) => (v.owner.subject = otherTarget),
    ]) {
      const bad = clone(prepared);
      change(bad);
      await assert.rejects(async () => f.client.importRecovery(JSON.stringify(bad)));
    }
    assert.equal(mutations(f).length, 1);
  } finally {
    f.dispose();
  }
});
test("A late previous-source result cannot replace the newly selected owned source", async () => {
  const f = await fixture();
  try {
    const held = f.holdSource(ownerId);
    const first = f.client.loadRights(ownerId);
    await new Promise((r) => setTimeout(r, 0));
    await f.client.loadRights(otherSource);
    held.resolve();
    await assert.rejects(first, /stale_view/);
    assert.equal(f.client.source.value, otherSource);
    assert.equal(f.client.rights.value[0].source_user_id, otherSource);
  } finally {
    f.dispose();
  }
});
test("Personal401 and held old-owner mutation preserve saved course bytes without authenticating a new view", async () => {
  for (const mode of ["401", "held"]) {
    const f = await fixture();
    try {
      const saved = await prepare(f);
      if (mode === "401") {
        f.fault("401");
        await assert.rejects(f.client.submit());
      } else {
        const held = f.holdMutation();
        const attempt = f.client.submit();
        await new Promise((r) => setTimeout(r, 0));
        f.ownerChange();
        held.resolve();
        await assert.rejects(attempt);
      }
      assert.equal(f.commercial.owner.value, null);
      assert.equal(f.client.current.value, null);
      assert(
        JSON.parse(f.stored.get(key)).some(
          (r) => JSON.stringify(r.record.body) === JSON.stringify(saved.body)
        )
      );
    } finally {
      f.dispose();
    }
  }
});

function host() {
  const node = (type, text = "") => ({
    type,
    text,
    props: {},
    children: [],
    parent: null,
    addEventListener() {},
    getRootNode: () => globalThis.document,
  });
  const detach = (n) => {
    if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1);
  };
  const renderer = Vue.createRenderer({
    createElement: node,
    createText: (s) => node("text", s),
    createComment: (s) => node("comment", s),
    setText: (n, s) => (n.text = s),
    setElementText: (n, s) => {
      n.text = s;
      n.children = [];
    },
    patchProp: (n, k, _v, v) => (n.props[k] = v),
    insert(n, p, a = null) {
      detach(n);
      n.parent = p;
      p.children.splice(a ? p.children.indexOf(a) : p.children.length, 0, n);
    },
    remove: detach,
    parentNode: (n) => n.parent,
    nextSibling: (n) => n.parent?.children[n.parent.children.indexOf(n) + 1],
  });
  const root = node("root"),
    all = (n = root) => [n, ...n.children.flatMap(all)],
    text = (n = root) => [n.type === "comment" ? "" : n.text, ...n.children.map(text)].join(" ");
  return { renderer, root, all, text };
}
const flush = async () => {
  for (let i = 0; i < 24; i++) {
    await Promise.resolve();
    await Vue.nextTick();
  }
};
async function globals(values, fn) {
  const prior = Object.fromEntries(
    Object.keys(values).map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)])
  );
  if (values.$fetch) values = { ...values, $fetch: fixtureFetch(values.$fetch) };
  Object.assign(globalThis, values);
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(prior))
      if (v) Object.defineProperty(globalThis, k, v);
      else delete globalThis[k];
  }
}
for (const language of ["en-US", "de"])
  test(`Mounted ${language} continuation shows historical success separately and keeps recovery after learning access disappears`, async () => {
    const f = await fixture(),
      ui = host();
    const messages = JSON.parse(
      await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")
    );
    await globals(
      {
        sessionStorage: f.options.storage,
        moderationAmbientIdentity: () => "same-personal-view",
        document: { activeElement: null },
      },
      async () => {
        const props = Vue.reactive({
          identity: "same-personal-view",
          owner: { case_id: caseId, subject: ownerId },
          snapshot: f.commercial.snapshot,
          summary: f.commercial.learningSummary,
          rights: f.commercial.courseRights,
          continueCourse: f.commercial.continueCourse,
          learningSubject: target,
        });
        const app = ui.renderer.createApp({ render: () => Vue.h(CourseComponent, props) });
        app.use(
          createI18n({ legacy: false, locale: language, messages: { [language]: messages } })
        );
        const button = (label) =>
          ui.all().find((n) => n.type === "button" && ui.text(n).trim() === label);
        try {
          app.mount(ui.root);
          await flush();
          const t = messages.CourseContinuation;
          await button(t.Load).props.onClick();
          await flush();
          await button(t.LoadRights).props.onClick();
          await flush();
          assert(ui.text().includes(t.StartedAccess));
          await button(t.Prepare).props.onClick();
          await flush();
          assert(button(t.Continue).props.disabled);
          ui.all()
            .find((n) => n.type === "input" && n.props.type === "checkbox")
            .props["onUpdate:modelValue"](true);
          await flush();
          f.fault("uncertain");
          await button(t.Continue).props.onClick();
          await flush();
          assert(ui.text().includes(t.State.uncertain));
          f.erase();
          props.learningSubject = null;
          f.fault("");
          await button(t.Retry).props.onClick();
          await flush();
          assert(ui.text().includes(t.State.withdrawn));
          assert(ui.text().includes(t.HistoricalSuccess));
          assert(button(t.Retry));
          assert(!button(t.RefreshCourses));
          assert(!ui.all().some((n) => n.type === "video" || n.type === "iframe"));
        } finally {
          app.unmount();
          f.dispose();
        }
      }
    );
  });
for (const language of ["en-US", "de"])
  test(`Mounted ${language} retained hearts use existing whole-heart formatter for zero, even and odd raw units`, async () => {
    const messages = JSON.parse(
      await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")
    );
    for (const [hearts, max, expected] of [
      [0, 0, "0 / 0"],
      [2, 6, "1 / 3"],
      [3, 5, language === "de" ? "1,5 / 2,5" : "1.5 / 2.5"],
    ]) {
      const ui = host(),
        stored = new Map();
      let requests = 0;
      await globals(
        {
          sessionStorage: {
            getItem: (k) => stored.get(k) ?? null,
            setItem: (k, v) => stored.set(k, v),
          },
          moderationAmbientIdentity: () => "heart-view",
          document: { activeElement: null },
          useRuntimeConfig: () => ({ public: { BASE_API_URL: "http://127.0.0.1:3198" } }),
          $fetch: async (path, options) => {
            assert.equal(path, "/shop/learning/resources");
            assert.deepEqual(options.body, {});
            assert.equal(options.credentials, "omit");
            assert.deepEqual(Object.keys(options.headers), ["x-learning-key"]);
            requests++;
            return {
              subject: target,
              purpose: "retained_learning",
              ordinary_authority: false,
              coins: 0,
              withheld_coins: 0,
              hearts,
              hearts_max: max,
              premium: null,
              renewal_activated: false,
              purchase_performed: false,
            };
          },
        },
        async () => {
          const app = ui.renderer.createApp({
            render: () =>
              Vue.h(LearningComponent, {
                identity: "heart-view",
                owner: { case_id: caseId, subject: ownerId },
                summary: async () => ({
                  subjects: [{ subject: target, case_id: caseId, erased_at: null }],
                }),
                start: async () => {
                  throw Error("Unexpected creation");
                },
                refresh: async () => ({
                  subject: target,
                  expires_at: new Date(Date.now() + 600000).toISOString(),
                  purpose: "retained_learning",
                  ordinary_authority: false,
                  financial_authority: false,
                  claims_satisfied: false,
                }),
              }),
          });
          app.use(
            createI18n({ legacy: false, locale: language, messages: { [language]: messages } })
          );
          app.component("RetainedCourses", { render: () => Vue.h("div") });
          app.component("CourseContinuation", { render: () => Vue.h("div") });
          const button = (label) =>
            ui.all().find((n) => n.type === "button" && ui.text(n).trim() === label);
          try {
            app.mount(ui.root);
            await flush();
            const t = messages.LearningAccess;
            await button(t.Find).props.onClick();
            await flush();
            await button(t.Prepare).props.onClick();
            await flush();
            ui.all()
              .find((n) => n.type === "input" && n.props.type === "checkbox")
              .props["onUpdate:modelValue"](true);
            await flush();
            await button(t.Issue).props.onClick();
            await flush();
            assert(ui.text().replace(/\s+/g, " ").includes(`${t.Hearts}: ${expected}`), ui.text());
            assert.equal(requests, 1);
          } finally {
            app.unmount();
          }
        }
      );
    }
  });
