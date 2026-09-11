import { fixtureFetch } from "./helpers/commercial-fetch.mjs";
// Local synthetic adapters and Vue mounting only; no SQL, services or real purchases.
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import { compileScript, parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { createI18n } from "vue-i18n";
const scratch = await mkdtemp(join(tmpdir(), "premium-continuation-test-"));
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
    "premiumContinuation",
    "commercialFetch",
    "commercialStatus",
    "learningAccess",
    "shop",
    "retainedCourses",
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
const { createLearningAccess } = await load("../composables/learningAccess.ts");
const { createPremiumContinuation, premiumPeriodState } = await load(
  "../composables/premiumContinuation.ts"
);
const { createCommercialAccess } = await load("../composables/commercialAccess.ts");
const Premium = (await load("../components/PremiumContinuation.vue", true)).default;
const Learning = (await load("../components/LearningAccess.vue", true)).default;
await load("../composables/retainedCourses.ts");
const Courses = (await load("../components/RetainedCourses.vue", true)).default;
const Player = (await load("../components/RetainedCoursePlayer.vue", true)).default;
const clone = (v) => JSON.parse(JSON.stringify(v));
const oid = "10000000-0000-4000-8000-000000000001",
  cid = "20000000-0000-4000-8000-000000000001",
  target = "30000000-0000-4000-8000-000000000001",
  target2 = "30000000-0000-4000-8000-000000000002",
  eid = "40000000-0000-4000-8000-000000000001",
  period = "50000000-0000-4000-8000-000000000001",
  request = "60000000-0000-4000-8000-000000000001",
  claim = "c".repeat(43),
  storageKey = "commercial-premium-continuation-v1";
const http = (n) => Object.assign(Error(`Synthetic ${n}`), { response: { status: n } });
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { resolve, promise };
};
function fixture() {
  let now = Date.now(),
    identity = "owner-view",
    ambient = "ambient",
    currentTarget = target,
    fault = "",
    hidden = false,
    storageFailure = false,
    hook = null;
  const at = (offset) => new Date(now + offset).toISOString();
  const observations = [
    {
      id: eid,
      case_id: cid,
      category: "premium_right",
      source_key: period,
      recorded_at: at(-5000),
      evidence: {
        id: period,
        user_id: oid,
        subject: oid,
        since: at(-3600000),
        until: at(3600000),
        observed_at: at(-5000),
        request_id: request,
        scope: "Existing original period; dates unchanged",
      },
    },
  ];
  const subjects = [
    {
      subject: target,
      case_id: cid,
      created_at: at(-3000),
      erased_at: null,
      authority_epoch: 1,
      election_id: randomUUID(),
      election: { command_id: randomUUID() },
      contract_permissions: { capacity: "not_inferred" },
    },
  ];
  const erased = [
    {
      subject: oid,
      case_id: cid,
      request_id: request,
      erased_at: at(-5000),
      scope: "ordinary_account",
    },
  ];
  const rows = [],
    journal = [],
    calls = [],
    stores = [];
  let editExport = (v) => v,
    editRights = (v) => v,
    editSummary = (v) => v,
    editResult = (v) => v;
  const evidence = () => [
    ...clone(observations),
    {
      id: randomUUID(),
      case_id: cid,
      category: "heart_balance_at_erasure",
      source_key: oid,
      evidence: { hearts: 3 },
      recorded_at: at(-5000),
    },
  ];
  const snapshot = () =>
    editExport({
      case: { id: cid, subject: oid, access_epoch: 1 },
      evidence: clone(observations),
      subject_erasures: clone(erased),
      resource_continuations: hidden ? [] : clone(rows),
      journal: hidden ? [] : clone(journal),
    });
  const summary = () =>
    editSummary({
      subjects: clone(subjects),
      scope: "Limited learning identity; no financial authority",
    });
  function storage() {
    const data = new Map();
    stores.push(data);
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem(k, v) {
        if (storageFailure) throw Error("Synthetic storage unavailable");
        data.set(k, v);
      },
      removeItem: (k) => data.delete(k),
    };
  }
  const fetch = async (path, options, data) => {
    calls.push({ path, options: clone(options) });
    assert.equal(options.credentials, "omit");
    assert.equal(options.retry, 0);
    assert.equal(options.timeout, 20000);
    assert.deepEqual(Object.keys(options.headers), ["x-commercial-claim-key"]);
    assert.equal(options.headers["x-commercial-claim-key"], claim);
    if (hook) await hook(path, options);
    if (fault === "401") throw http(401);
    if (fault === "503") throw http(503);
    if (path.endsWith("/export")) return snapshot();
    if (path.endsWith("/learning_summary")) {
      assert.deepEqual(options.body, {});
      return summary();
    }
    if (path.endsWith("/resource_rights")) {
      assert.deepEqual(options.body, {});
      return editRights({
        observations: evidence(),
        continuations: hidden ? [] : clone(rows),
        paid_allocation_inferred: false,
      });
    }
    assert.equal(path, "/shop/claims/recipient/premium_continue");
    const body = options.body;
    assert.deepEqual(Object.keys(body).sort(), [
      "command_id",
      "continue_existing_right",
      "evidence_id",
      "successor",
    ]);
    const saved = JSON.parse(data.get(storageKey));
    assert(
      saved.some(
        (r) =>
          JSON.stringify(r.record.body) === JSON.stringify(body) &&
          r.record.uncertain_attempt === true
      ),
      "exact uncertain request stored before dispatch"
    );
    if (fault === "before") throw Error("Synthetic unknown network result");
    if (fault === "409") throw http(409);
    const prior = rows.find((r) => r.command_id === body.command_id);
    if (prior) {
      assert.deepEqual(prior.election, body);
      return clone(prior);
    }
    const original = observations.find((o) => o.id === body.evidence_id);
    if (
      !original ||
      body.successor !== currentTarget ||
      premiumPeriodState(original.evidence, now) !== "current" ||
      rows.some((r) => r.source_evidence === body.evidence_id && r.subject === body.successor)
    )
      throw http(409);
    const row = {
      id: randomUUID(),
      case_id: cid,
      kind: "premium",
      source_evidence: original.id,
      source_subject: original.evidence.subject,
      subject: body.successor,
      command_id: body.command_id,
      original: clone(original.evidence),
      election: clone(body),
      created_at: at(0),
      state: "active",
      result: {
        period_id: randomUUID(),
        since: original.evidence.since,
        until: original.evidence.until,
        new_purchase: false,
        renewal_activated: false,
        original_period_id: original.evidence.id,
        current_access_granted: true,
      },
    };
    editResult(row);
    rows.push(row);
    journal.push({
      id: "9007199254740999",
      command_id: body.command_id,
      case_id: cid,
      actor: oid,
      kind: "premium_continue",
      request: clone(body),
      result: clone(row),
    });
    if (fault === "after" || fault === "after-hidden") {
      hidden = fault === "after-hidden";
      fault = "";
      throw Error("Synthetic committed response lost");
    }
    if (fault === "post503") fault = "503";
    return clone(row);
  };
  async function flow(saved = storage()) {
    const commercial = createCommercialAccess({
      storage: saved,
      fetch: (p, o) => fetch(p, o, saved.data),
      ambient: () => ambient,
      identity: () => identity,
      personalProof: () => null,
    });
    await commercial.connectKey(claim);
    const options = {
      owner: () => commercial.owner.value,
      identity: () => identity + ":" + commercial.generation.value,
      ambient: () => ambient,
      storage: saved,
      snapshot: commercial.snapshot,
      summary: commercial.learningSummary,
      rights: commercial.resourceRights,
      continuePremium: commercial.continuePremium,
      now: () => now,
    };
    const client = createPremiumContinuation(options);
    client.restore();
    return { client, commercial, options, storage: saved };
  }
  return {
    flow,
    storage,
    observations,
    subjects,
    erased,
    rows,
    journal,
    calls,
    summary,
    snapshot,
    at,
    now: () => now,
    time: (n) => (now = n),
    fault: (v) => (fault = v),
    hide: (v) => (hidden = v),
    storageFailure: (v) => (storageFailure = v),
    hook: (v) => (hook = v),
    editExport: (v) => (editExport = v),
    editRights: (v) => (editRights = v),
    editSummary: (v) => (editSummary = v),
    editResult: (v) => (editResult = v),
    identity: () => (identity += "x"),
    ambient: () => (ambient += "x"),
    withdraw() {
      const s = subjects.find((s) => s.subject === target);
      s.erased_at = at(0);
      erased.push({
        subject: target,
        case_id: cid,
        request_id: randomUUID(),
        erased_at: at(0),
        scope: "learning_data",
      });
      rows.filter((r) => r.subject === target).forEach((r) => (r.state = "withdrawn"));
      currentTarget = target2;
      subjects.push({ ...clone(s), subject: target2, erased_at: null, election_id: randomUUID() });
    },
  };
}
const posts = (f) => f.calls.filter((c) => c.path.endsWith("/premium_continue"));
async function prepared(f = fixture()) {
  const flow = await f.flow();
  await flow.client.load();
  await flow.client.prepare(eid, target);
  return { f, ...flow };
}

test("exact personal Premium operations preserve three independent IDs, original dates and mixed-heart exclusion", async () => {
  const { f, client, commercial } = await prepared();
  assert.equal(client.observations.value.length, 1);
  assert.equal(posts(f).length, 0);
  const file = client.recoveryText();
  await client.submit();
  assert.equal(client.pending.value.state, "observed");
  assert.equal(client.current.value.state, "active");
  assert.equal(f.rows.length, 1);
  assert.equal(new Set([f.rows[0].id, f.rows[0].command_id, f.rows[0].result.period_id]).size, 3);
  assert.deepEqual(client.pending.value.body, JSON.parse(file).body);
  assert.deepEqual(client.pending.value.observation, f.observations[0]);
  assert.equal(f.rows[0].result.since, f.observations[0].evidence.since);
  assert.equal(f.rows[0].result.until, f.observations[0].evidence.until);
  for (const bad of [
    { ...JSON.parse(file).body, case_id: cid },
    { ...JSON.parse(file).body, continue_existing_right: false },
  ])
    await assert.rejects(commercial.continuePremium(bad), /invalid_request/);
  assert(
    !f.calls.some((r) =>
      /learning_start|learning_access|purchase|\/accept|\/offer|\/resources/.test(r.path)
    )
  );
  assert(!file.includes(claim));
});
test("precise timestamp instants accept offsets and retain microseconds without rewriting original strings", async () => {
  const { f, client } = await prepared();
  const original = f.observations[0].evidence;
  original.since = "2026-09-10T09:00:00.123456+02:00";
  original.until = "2026-09-10T11:00:00.123456+02:00";
  f.time(Date.parse("2026-09-10T08:00:00Z"));
  client.clear();
  await client.load();
  await client.prepare(eid, target);
  f.editResult((row) => {
    row.result.since = "2026-09-10T07:00:00.123456Z";
  });
  await client.submit();
  await client.load();
  assert.equal(client.pending.value.observation.evidence.since, original.since);
  f.rows[0].result.since = "2026-09-10T07:00:00.123457Z";
  await assert.rejects(client.load(), /invalid_response/);
});
test("missing arrays, foreign ownership, source-erasure mismatch and altered immutable period data never become eligible", async () => {
  for (const edit of [
    (v) => {
      delete v.evidence;
    },
    (v) => {
      v.case.subject = target2;
    },
    (v) => {
      v.subject_erasures[0].request_id = target2;
    },
    (v) => {
      v.evidence[0].evidence.until = "2026-02-30T00:00:00Z";
    },
    (v) => {
      v.evidence[0].evidence.scope = "";
    },
  ]) {
    const f = fixture(),
      { client } = await f.flow();
    f.editExport((v) => {
      edit(v);
      return v;
    });
    await assert.rejects(client.load());
    assert.equal(client.loaded.value, false);
    assert.equal(posts(f).length, 0);
  }
  for (const edit of [
    (v) => {
      delete v.continuations;
    },
    (v) => {
      v.paid_allocation_inferred = true;
    },
    (v) => {
      v.observations[0].source_key = target2;
    },
  ]) {
    const f = fixture(),
      { client } = await f.flow();
    f.editRights((v) => {
      edit(v);
      return v;
    });
    await assert.rejects(client.load());
    assert.equal(client.observations.value.length, 0);
  }
});
test("selected target disappearing never turns the original command into a new S2 command", async () => {
  const { f, client } = await prepared(),
    body = clone(client.pending.value.body);
  f.withdraw();
  await assert.rejects(client.submit());
  assert.deepEqual(client.pending.value.body, body);
  assert.equal(client.pending.value.state, "refused");
  assert.equal(f.rows.length, 0);
  await client.prepare(eid, target2);
  assert.equal(client.pending.value.body.successor, target2);
  assert.notEqual(client.pending.value.body.command_id, body.command_id);
  assert.equal(posts(f).length, 1);
});
test("existing tuple recovery selects its original election and never manufactures a new command", async () => {
  const { f, client } = await prepared();
  await client.submit();
  const body = clone(client.pending.value.body),
    fresh = await f.flow();
  await fresh.client.load();
  await assert.rejects(fresh.client.prepare(eid, target), /existing_request/);
  assert.equal(fresh.client.pending.value, null);
  await fresh.client.recoverContinuation(f.rows[0].id);
  assert.deepEqual(fresh.client.pending.value.body, body);
  assert.equal(posts(f).length, 1);
});
test("lost committed response reconciles exact owned row and original journal without duplicate mutation", async () => {
  const { f, client } = await prepared();
  f.fault("after");
  await assert.rejects(client.submit());
  assert.equal(client.pending.value.state, "observed");
  assert.equal(client.current.value.id, f.rows[0].id);
  assert.equal(f.rows.length, 1);
  assert.equal(f.journal.length, 1);
  await client.submit();
  assert.equal(f.rows.length, 1);
  assert.deepEqual(posts(f)[0].options.body, posts(f)[1].options.body);
});
for (const flag of [false, undefined])
  test(`fresh-storage pre-dispatch import ${String(flag)} remains uncertain after409 and hidden original commit`, async () => {
    const { f, client } = await prepared(),
      saved = JSON.parse(client.recoveryText());
    if (flag === undefined) delete saved.uncertain_attempt;
    else saved.uncertain_attempt = flag;
    f.fault("after-hidden");
    await assert.rejects(client.submit());
    const fresh = await f.flow();
    fresh.client.importRecovery(JSON.stringify(saved));
    assert.equal(fresh.client.pending.value.uncertain_attempt, true);
    f.fault("409");
    await assert.rejects(fresh.client.submit());
    assert.equal(fresh.client.pending.value.state, "unconfirmed");
    assert.equal(fresh.client.blocked.value, true);
    await assert.rejects(fresh.client.prepare(eid, target2), /pending_request/);
    f.fault("");
    f.hide(false);
    await fresh.client.submit();
    assert.equal(fresh.client.pending.value.state, "observed");
    assert.equal(f.rows.length, 1);
    assert(posts(f).every((r) => JSON.stringify(r.options.body) === JSON.stringify(saved.body)));
  });
test("firsthand definite refusal allows a deliberate new selection; storage failure prevents all dispatch", async () => {
  const { f, client } = await prepared(),
    original = clone(client.pending.value.body);
  f.fault("409");
  await assert.rejects(client.submit());
  assert.equal(client.pending.value.state, "refused");
  assert.equal(client.blocked.value, false);
  f.fault("");
  await client.prepare(eid, target);
  assert.notEqual(client.pending.value.body.command_id, original.command_id);
  f.storageFailure(true);
  await assert.rejects(client.submit());
  assert.equal(posts(f).length, 1);
});
test("original expired/future periods cannot be freshly prepared but exact expired historical replay remains available", async () => {
  const { f, client } = await prepared();
  await client.submit();
  const exact = clone(client.pending.value.body);
  f.time(Date.parse(f.observations[0].evidence.until) + 1);
  await client.submit();
  assert.deepEqual(client.pending.value.body, exact);
  assert.equal(f.rows.length, 1);
  for (const change of [
    (o) => {
      o.until = f.at(-1);
      o.since = f.at(-5000);
    },
    (o) => {
      o.since = f.at(5000);
      o.until = f.at(10000);
    },
  ]) {
    const fresh = fixture();
    change(fresh.observations[0].evidence);
    fresh.time(f.now());
    const { client: c } = await fresh.flow();
    await c.load();
    await assert.rejects(c.prepare(eid, target), /period_unavailable/);
    assert.equal(posts(fresh).length, 0);
  }
});
test("withdrawn current row differs from immutable journal only in state and never resurrects a target", async () => {
  const { f, client } = await prepared();
  await client.submit();
  const receipt = clone(client.pending.value.receipt);
  f.withdraw();
  await client.load();
  assert.equal(client.current.value.state, "withdrawn");
  assert.deepEqual(client.pending.value.receipt, receipt);
  assert.equal(client.pending.value.receipt.result.current_access_granted, true);
  assert.equal(client.pending.value.last.state, "withdrawn");
  await client.submit();
  assert.equal(f.rows[0].state, "withdrawn");
  assert.equal(client.current.value.state, "withdrawn");
  assert.equal(f.rows.length, 1);
});
test("later active snapshots or imported older history cannot overwrite an observed withdrawal", async () => {
  const { f, client } = await prepared();
  await client.submit();
  const old = client.recoveryText(),
    oldExport = f.snapshot(),
    oldSummary = f.summary(),
    oldRows = clone(f.rows);
  f.withdraw();
  await client.load();
  f.editExport(() => clone(oldExport));
  f.editSummary(() => clone(oldSummary));
  f.editRights((v) => ({ ...v, continuations: clone(oldRows) }));
  await client.load();
  assert.equal(client.current.value.state, "withdrawn");
  client.importRecovery(old);
  assert.equal(client.pending.value.last.state, "withdrawn");
  await client.load();
  assert.equal(client.current.value.state, "withdrawn");
  assert.equal(client.pending.value.receipt.state, "active");
});
test("exact journal requires actor, command body, case, kind, separate row identity and unchanged result", async () => {
  for (const change of [
    (j) => {
      j.actor = target2;
    },
    (j) => {
      j.kind = "course_successor";
    },
    (j) => {
      j.request.successor = target2;
    },
    (j) => {
      j.case_id = target2;
    },
    (j) => {
      j.result.id = j.command_id;
    },
    (j) => {
      j.result.result.new_purchase = true;
    },
  ]) {
    const { f, client } = await prepared();
    await client.submit();
    change(f.journal[0]);
    await assert.rejects(client.load());
    assert.equal(client.current.value, null);
    assert.equal(client.blocked.value, true);
  }
});
test("unknown and unavailable post-read retain exact receipt/body without allowing a new preparation", async () => {
  const { f, client } = await prepared();
  f.fault("post503");
  await assert.rejects(client.submit());
  assert(client.pending.value.receipt);
  assert.equal(client.pending.value.state, "unconfirmed");
  assert.equal(client.blocked.value, true);
  f.fault("");
  await client.load();
  assert.equal(client.pending.value.state, "observed");
});
test("owner, original observation, body and prior immutable receipt conflicts reject file import", async () => {
  const { f, client } = await prepared();
  await client.submit();
  const original = JSON.parse(client.recoveryText());
  for (const change of [
    (r) => {
      r.owner.subject = target2;
    },
    (r) => {
      r.body.successor = target2;
    },
    (r) => {
      r.observation.evidence.until = f.at(999999);
    },
    (r) => {
      r.receipt.result.period_id = target2;
    },
    (r) => {
      r.operation = "learning_start";
    },
    (r) => {
      r.body.period_id = period;
    },
  ]) {
    const copy = clone(original);
    change(copy);
    await assert.rejects(async () => client.importRecovery(JSON.stringify(copy)));
  }
  assert.equal(f.rows.length, 1);
});
for (const edge of ["owner", "ambient", "generation", "dispose"])
  test(`held original rights response is discarded after ${edge} invalidation`, async () => {
    const f = fixture(),
      { client, commercial } = await f.flow(),
      held = deferred(),
      entered = deferred();
    f.hook(async (path) => {
      if (path.endsWith("/resource_rights")) {
        entered.resolve();
        await held.promise;
      }
    });
    const p = client.load();
    await entered.promise;
    if (edge === "owner") f.identity();
    if (edge === "ambient") f.ambient();
    if (edge === "generation") commercial.clear();
    if (edge === "dispose") client.dispose();
    held.resolve();
    await assert.rejects(p);
    assert.equal(client.loaded.value, false);
    assert.equal(client.observations.value.length, 0);
    assert.equal(posts(f).length, 0);
  });
test("held mutation result cannot publish after parent proof generation changes", async () => {
  const { f, client, commercial, storage } = await prepared(),
    held = deferred(),
    entered = deferred();
  f.hook(async (path) => {
    if (path.endsWith("/premium_continue")) {
      entered.resolve();
      await held.promise;
    }
  });
  const p = client.submit();
  await entered.promise;
  const saved = storage.data.get(storageKey);
  commercial.clear();
  held.resolve();
  await assert.rejects(p);
  assert.equal(storage.data.get(storageKey), saved);
  assert.equal(client.current.value, null);
});
test("prebinding/current personal401 disposes authority while an unavailable503 is not refusal", async () => {
  for (const status of ["401", "503"]) {
    const { f, client, commercial, storage } = await prepared();
    f.fault(status);
    await assert.rejects(client.submit());
    assert.equal(client.pending.value.state, "unconfirmed");
    assert(storage.data.has(storageKey));
    assert.equal(commercial.owner.value === null, status === "401");
  }
});

const { createRenderer, h, nextTick, reactive } = Vue;
function host() {
  const node = (type, text = "") => ({
    type,
    text,
    props: {},
    children: [],
    parent: null,
    get options() {
      return this.children.filter((n) => n.type === "option");
    },
    get value() {
      return this.props.value;
    },
    set value(v) {
      this.props.value = v;
    },
    addEventListener() {},
    pause() {
      this.paused = true;
    },
    removeAttribute(name) {
      delete this.props[name];
    },
    load() {
      this.reloaded = true;
    },
    getRootNode: () => globalThis.document,
  });
  const detach = (n) => {
    if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1);
  };
  const renderer = createRenderer({
    createElement: node,
    createText: (s) => node("text", s),
    createComment: (s) => node("comment", s),
    setText: (n, s) => (n.text = s),
    setElementText: (n, s) => {
      n.text = s;
      n.children = [];
    },
    patchProp: (n, k, _old, v) => (n.props[k] = v),
    insert: (n, p, anchor = null) => {
      detach(n);
      n.parent = p;
      p.children.splice(anchor ? p.children.indexOf(anchor) : p.children.length, 0, n);
    },
    remove: detach,
    parentNode: (n) => n.parent,
    nextSibling: (n) => n.parent?.children[n.parent.children.indexOf(n) + 1],
  });
  const root = node("root"),
    all = (n = root) => [n, ...n.children.flatMap((c) => all(c))],
    text = (n = root) =>
      [n.type === "comment" ? "" : n.text, ...n.children.map((c) => text(c))].join(" ");
  return { renderer, root, all, text };
}
const flush = async () => {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve();
    await nextTick();
  }
};
async function globals(values, fn) {
  const old = new Map(
    Object.keys(values).map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)])
  );
  if (values.$fetch) values = { ...values, $fetch: fixtureFetch(values.$fetch) };
  Object.assign(globalThis, values);
  try {
    return await fn();
  } finally {
    for (const [k, descriptor] of old)
      if (descriptor) Object.defineProperty(globalThis, k, descriptor);
      else delete globalThis[k];
  }
}

const browserGlobals = (storage) => ({
  ...Vue,
  sessionStorage: storage,
  moderationAmbientIdentity: () => "ambient",
  useRuntimeConfig: () => ({ public: { BASE_API_URL: "https://synthetic.invalid" } }),
  Document: class {},
  ShadowRoot: class {},
  document: { activeElement: null, createElement: () => ({ click() {} }) },
});
for (const language of ["en-US", "de"])
  test(`mounted ${language} original period review is explicit, optional file has no acknowledgment and longer current period remains separate`, async () => {
    const f = fixture(),
      flow = await f.flow(),
      messages = JSON.parse(
        await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")
      );
    const resources = {
        subject: target,
        premium: { period_id: target2, since: f.at(-7200000), until: f.at(7200000), active: true },
      },
      props = reactive({
        identity: "view",
        owner: { case_id: cid, subject: oid },
        snapshot: flow.commercial.snapshot,
        summary: flow.commercial.learningSummary,
        rights: flow.commercial.resourceRights,
        continuePremium: flow.commercial.continuePremium,
        resources,
        premiumActive: true,
      });
    await globals(browserGlobals(flow.storage), async () => {
      const ui = host(),
        app = ui.renderer.createApp({ render: () => h(Premium, props) });
      app.use(createI18n({ legacy: false, locale: language, messages: { [language]: messages } }));
      app.mount(ui.root);
      const button = (label) =>
        ui.all().find((n) => n.type === "button" && ui.text(n).trim() === label);
      try {
        await flush();
        await button(messages.PremiumContinuation.Load).props.onClick();
        await flush();
        assert.equal(posts(f).length, 0);
        await button(messages.PremiumContinuation.Review).props.onClick();
        await flush();
        assert.equal(posts(f).length, 0);
        assert.equal(ui.all().filter((n) => n.props.type === "checkbox").length, 0);
        assert(ui.text().includes(f.observations[0].evidence.until));
        assert(ui.text().includes(resources.premium.until));
        assert(button(messages.PremiumContinuation.Save));
        assert.equal(button(messages.PremiumContinuation.Continue).props.disabled, false);
        await button(messages.PremiumContinuation.Continue).props.onClick();
        await flush();
        assert.equal(f.rows.length, 1);
        assert(ui.text().includes(messages.PremiumContinuation.State.active));
        assert.equal(f.rows[0].result.until, f.observations[0].evidence.until);
        f.withdraw();
        await button(messages.PremiumContinuation.Load).props.onClick();
        await flush();
        assert(ui.text().includes(messages.PremiumContinuation.State.withdrawn));
        props.resources = null;
        props.premiumActive = false;
        await flush();
        assert(ui.text().includes(messages.PremiumContinuation.NoResources));
        assert(button(messages.PremiumContinuation.Retry));
        const body = JSON.parse(flow.storage.data.get(storageKey))[0].record.body;
        props.identity = "changed";
        await flush();
        assert(!ui.text().includes(body.command_id));
        assert(flow.storage.data.has(storageKey));
      } finally {
        app.unmount();
      }
    });
  });
function learningFixture() {
  const data = new Map(),
    key = "commercial-learning-refresh-v1";
  let hold = null,
    reads = 0;
  const storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
  const options = {
    owner: () => ({ case_id: cid, subject: oid }),
    identity: () => "view",
    ambient: () => "ambient",
    storage,
    summary: async () => ({ subjects: [{ case_id: cid, subject: target, erased_at: null }] }),
    refresh: async () => ({
      subject: target,
      expires_at: new Date(Date.now() + 600000).toISOString(),
      purpose: "retained_learning",
      ordinary_authority: false,
      financial_authority: false,
      claims_satisfied: false,
    }),
    fetch: async (_path, opts) => {
      reads++;
      assert(opts.headers["x-learning-key"]);
      if (hold) await hold.promise;
      return {
        subject: target,
        purpose: "retained_learning",
        ordinary_authority: false,
        renewal_activated: false,
        purchase_performed: false,
        coins: 10,
        withheld_coins: 0,
        hearts: 3,
        hearts_max: 5,
        premium: null,
      };
    },
  };
  return { options, data, key, hold: (v) => (hold = v), reads: () => reads };
}
test("authoritative exact-subject erasure invalidates an in-flight resource reply and saved key use, preserving the original file", async () => {
  const f = learningFixture(),
    c = createLearningAccess(f.options);
  await c.prepare(target);
  await c.submit();
  const original = f.data.get(f.key),
    generation = c.generation.value;
  c.observeErasedSubject(target2);
  assert(c.resources.value);
  assert.equal(c.generation.value, generation);
  const held = deferred();
  f.hold(held);
  const p = c.verify();
  c.observeErasedSubject(target);
  held.resolve();
  await assert.rejects(p, /stale_view/);
  assert.equal(c.resources.value, null);
  assert.equal(c.error.value, "learning_inactive");
  assert.equal(f.data.get(f.key), original);
  const reads = f.reads();
  await assert.rejects(c.verify(), /learning_inactive/);
  assert.equal(f.reads(), reads);
  c.dispose();
});
test("mounted Premium expiry stops only its active display; existing independent course panel and saved learning request remain", async () => {
  const f = learningFixture(),
    messages = JSON.parse(
      await readFile(new URL("../locales/en-US.json", import.meta.url), "utf8")
    );
  const value = {
    subject: target,
    purpose: "retained_learning",
    ordinary_authority: false,
    renewal_activated: false,
    purchase_performed: false,
    coins: 10,
    withheld_coins: 0,
    hearts: 3,
    hearts_max: 5,
    premium: {
      period_id: period,
      since: new Date(Date.now() - 10000).toISOString(),
      until: "",
      active: true,
    },
  };
  await globals(
    {
      ...browserGlobals(f.options.storage),
      $fetch: async (path) => {
        assert.equal(path, "/shop/learning/resources");
        value.premium.until = new Date(Date.now() + 150).toISOString();
        return clone(value);
      },
    },
    async () => {
      const ui = host(),
        app = ui.renderer.createApp({
          render: () =>
            h(Learning, {
              identity: "view",
              owner: { case_id: cid, subject: oid },
              summary: f.options.summary,
              refresh: f.options.refresh,
              start: async () => {
                throw Error("No start expected");
              },
            }),
        });
      app.use(createI18n({ legacy: false, locale: "en-US", messages: { "en-US": messages } }));
      app.component("PremiumContinuation", Premium);
      app.component("CourseContinuation", { render: () => null });
      app.component("RetainedCourses", {
        render: () =>
          h(
            "section",
            { "aria-label": "independent-course" },
            "Independent course remains available"
          ),
      });
      app.mount(ui.root);
      const button = (label) =>
        ui.all().find((n) => n.type === "button" && ui.text(n).trim() === label);
      try {
        await flush();
        await button(messages.LearningAccess.Find).props.onClick();
        await flush();
        await button(messages.LearningAccess.Prepare).props.onClick();
        await flush();
        ui.all()
          .find((n) => n.props.type === "checkbox")
          .props["onUpdate:modelValue"](true);
        await flush();
        await button(messages.LearningAccess.Issue).props.onClick();
        await flush();
        assert(ui.text().includes(messages.LearningAccess.Premium + ": Yes"));
        const saved = f.data.get(f.key);
        assert(ui.text().includes("Independent course remains available"));
        await new Promise((r) => setTimeout(r, 200));
        await flush();
        assert(ui.text().includes(messages.LearningAccess.Premium + ": No"));
        assert(ui.text().includes("Independent course remains available"));
        assert.equal(f.data.get(f.key), saved);
      } finally {
        app.unmount();
      }
    }
  );
});

test("an original Premium journal without its current row is unavailable, never evidence of refusal", async () => {
  const { f, client } = await prepared();
  await client.submit();
  const file = client.recoveryText();
  f.rows.length = 0;
  await assert.rejects(client.load(), /unavailable_records/);
  assert.equal(client.current.value, null);
  assert.equal(client.blocked.value, true);
  assert.equal(client.recoveryText(), file);
});
test("held older active reads cannot replace a newer observed withdrawal in the same view", async () => {
  const { f, client, options } = await prepared();
  await client.submit();
  const old = f.snapshot(),
    held = deferred();
  let first = true;
  options.snapshot = async () => {
    if (first) {
      first = false;
      await held.promise;
      return old;
    }
    return f.snapshot();
  };
  const pending = client.load();
  await new Promise((r) => setImmediate(r));
  f.withdraw();
  await client.load();
  assert.equal(client.current.value.state, "withdrawn");
  held.resolve();
  await assert.rejects(pending, /stale_view/);
  assert.equal(client.current.value.state, "withdrawn");
  assert.equal(client.pending.value.last.state, "withdrawn");
});

test("PC1 fresh owned summary erasure propagates before an unrelated held aggregate", async () => {
  const { f, client, options } = await prepared();
  await client.submit();
  const live = [],
    held = deferred();
  options.onErasedSubject = (subject) => live.push(subject);
  const old = f.snapshot();
  options.snapshot = () => held.promise;
  f.withdraw();
  const pending = client.load().catch((error) => error);
  try {
    await flush();
    assert(
      live.includes(target),
      "qualified same-case summary must invalidate S1 before held export"
    );
    assert(!live.includes(target2), "new current S2 remains untouched");
  } finally {
    held.resolve(old);
    await pending;
    client.dispose();
  }
});

for (const mode of [
  "summary",
  "rights-new-observation",
  "post-unavailable",
  "file-only",
  "export-erasure-held-summary",
  "export-erasure-failed-rights",
  "export-erasure-older-peers",
  "export-withdrawn-held-rights",
  "export-withdrawn-failed-summary",
  "export-withdrawn-older-peers",
])
  test(`PC1 connected actual Premium/Learning/course/player ${mode} preserves only current authority`, async () => {
    const { f, client, options, storage } = await prepared();
    await client.submit();
    const oldExport = f.snapshot(),
      oldSummary = f.summary();
    const oldRights = await options.rights();
    const learning = learningFixture(),
      held = deferred(),
      aggregate = deferred();
    const aggregateValue =
      mode === "export-erasure-held-summary"
        ? oldSummary
        : mode === "export-withdrawn-held-rights"
          ? oldRights
          : oldExport;
    let holdMedia = false,
      courseRequest,
      pendingAction;
    const messages = JSON.parse(
      await readFile(new URL("../locales/en-US.json", import.meta.url), "utf8")
    );
    const details = {
      id: "course",
      title: "Independent course",
      description: null,
      sections: [
        {
          id: "section",
          title: "Section",
          lectures: [
            { id: "lecture", title: "Lecture", description: null, type: "mp4", completed: false },
          ],
        },
      ],
    };
    await globals(
      {
        ...browserGlobals(storage),
        $fetch: async (path) => {
          if (path === "/shop/learning/resources")
            return learning.options.fetch(path, { headers: { "x-learning-key": "synthetic" } });
          if (holdMedia) await held.promise;
          if (path === "/skills/learning/course_access")
            return [{ id: "course", title: "Independent course" }];
          if (path.endsWith("/watch")) return true;
          if (path.endsWith("/lectures/lecture"))
            return "https://synthetic.invalid/skills/learning/lectures/synthetic/lecture.mp4";
          assert.equal(path, "/skills/learning/courses/course");
          return clone(details);
        },
      },
      async () => {
        const ui = host(),
          app = ui.renderer.createApp({
            render: () =>
              h(Learning, {
                identity: "view",
                owner: { case_id: cid, subject: oid },
                summary: () => options.summary(),
                refresh: learning.options.refresh,
                start: async () => {
                  throw Error("No new subject");
                },
                courseSnapshot: () => options.snapshot(),
                resourceRights: () => options.rights(),
                premiumContinue: (body) => options.continuePremium(body),
              }),
          });
        app.use(createI18n({ legacy: false, locale: "en-US", messages: { "en-US": messages } }));
        app.component("PremiumContinuation", Premium);
        app.component("RetainedCoursePlayer", Player);
        app.component("NuxtLink", { render: () => null });
        app.component("CourseContinuation", { render: () => null });
        app.component("RetainedCourses", {
          props: ["identity", "request"],
          setup(props) {
            courseRequest = (operation) => props.request(operation);
            return () => h(Courses, { identity: props.identity, request: props.request });
          },
        });
        app.mount(ui.root);
        const button = (label) =>
          ui.all().find((n) => n.type === "button" && ui.text(n).trim() === label);
        try {
          await flush();
          await button(messages.LearningAccess.Find).props.onClick();
          await flush();
          await button(messages.LearningAccess.Prepare).props.onClick();
          await flush();
          ui.all()
            .find((n) => n.props.type === "checkbox")
            .props["onUpdate:modelValue"](true);
          await flush();
          await button(messages.LearningAccess.Issue).props.onClick();
          await flush();
          const originalLearning = storage.data.get(learning.key);
          await button(messages.RetainedCourses.List).props.onClick();
          await flush();
          await button("Independent course").props.onClick();
          await flush();
          await button("Lecture").props.onClick();
          await flush();
          const video = ui.all().find((n) => n.type === "video");
          assert(video?.props.src, "actual retained player has current media before erasure");
          holdMedia = true;
          const late = courseRequest({ kind: "details", course: "course" }).catch((error) => error);
          f.withdraw();
          if (mode === "summary") {
            options.snapshot = () => aggregate.promise;
            options.rights = async () => oldRights;
          } else if (mode === "rights-new-observation") {
            options.snapshot = async () => oldExport;
            options.summary = async () => oldSummary;
            const extra = clone(f.observations[0]);
            extra.id = randomUUID();
            extra.source_key = randomUUID();
            extra.evidence = {
              ...extra.evidence,
              id: extra.source_key,
              user_id: target,
              subject: target,
              request_id: f.erased.at(-1).request_id,
            };
            f.observations.push(extra);
          } else if (mode.startsWith("export-")) {
            const fresh = f.snapshot();
            options.summary = async () => oldSummary;
            options.rights = async () => oldRights;
            if (mode.startsWith("export-erasure")) {
              // The only fresh positive is canonical erasure. The Premium row
              // remains active, and a new observation defeats aggregate equality.
              fresh.resource_continuations = oldExport.resource_continuations;
              const extra = clone(f.observations[0]);
              extra.id = randomUUID();
              extra.source_key = randomUUID();
              extra.evidence = {
                ...extra.evidence,
                id: extra.source_key,
                user_id: target,
                subject: target,
                request_id: f.erased.at(-1).request_id,
              };
              fresh.evidence.push(extra);
            } else {
              // Exported original + withdrawn row qualify independently of the
              // older erasure subsection, summary and separate rights response.
              fresh.subject_erasures = oldExport.subject_erasures;
            }
            options.snapshot = async () => fresh;
            if (mode.endsWith("held-summary")) options.summary = () => aggregate.promise;
            if (mode.endsWith("held-rights")) options.rights = () => aggregate.promise;
            if (mode.endsWith("failed-rights"))
              options.rights = async () => {
                throw http(503);
              };
            if (mode.endsWith("failed-summary"))
              options.summary = async () => {
                throw http(503);
              };
          } else if (mode === "post-unavailable") {
            options.snapshot = async () => {
              throw http(503);
            };
            options.summary = async () => oldSummary;
            options.rights = async () => oldRights;
          } else {
            const file = JSON.parse(client.recoveryText());
            file.last.state = "withdrawn";
            ui.all()
              .find((n) => n.props.id === "premium-continuation-recovery")
              .props["onUpdate:modelValue"](JSON.stringify(file));
            await flush();
            await ui
              .all()
              .find(
                (n) =>
                  n.type === "form" &&
                  ui.all(n).some((x) => x.props.id === "premium-continuation-recovery")
              )
              .props.onSubmit({ preventDefault() {} });
          }
          if (mode !== "file-only")
            pendingAction = button(
              mode === "post-unavailable"
                ? messages.PremiumContinuation.Retry
                : messages.PremiumContinuation.Load
            ).props.onClick();
          await flush();
          if (mode === "file-only") {
            assert(
              ui.all().includes(video),
              "imported withdrawn history is not live erasure authority"
            );
            assert(video.props.src);
          } else {
            assert(
              !ui.all().some((n) => n.type === "video"),
              "qualified feed clears actual connected player before aggregate completion"
            );
            assert(video.paused && video.reloaded && !video.props.src, "actual player cleanup ran");
            assert(!ui.text().includes(messages.LearningAccess.Available));
          }
          held.resolve();
          await flush();
          const lateResult = await late;
          assert.equal(lateResult instanceof Error, mode !== "file-only");
          if (mode !== "file-only") assert.match(lateResult.message, /stale_view/);
          aggregate.resolve(aggregateValue);
          if (pendingAction) await pendingAction;
          await flush();
          assert.equal(storage.data.get(learning.key), originalLearning);
          if (mode !== "file-only") assert(!ui.all().some((n) => n.type === "video"));
        } finally {
          held.resolve();
          aggregate.resolve(aggregateValue);
          if (pendingAction) await pendingAction;
          app.unmount();
          client.dispose();
        }
      }
    );
  });

test("PC1 raw, mismatched and stale live observations never emit; imported history remains nonauthoritative", async () => {
  for (const mode of [
    "foreign-summary",
    "malformed-summary",
    "foreign-right",
    "wrong-original",
    "stale-proof",
    "stale-owner",
    "stale-ambient",
    "disposed",
  ]) {
    const { f, client, options } = await prepared();
    await client.submit();
    const oldSummary = f.summary(),
      oldExport = f.snapshot(),
      live = [],
      held = deferred();
    options.onErasedSubject = (subject) => live.push(subject);
    f.withdraw();
    options.snapshot = async () => oldExport;
    if (mode.endsWith("summary")) {
      options.rights = async () => ({
        observations: [],
        continuations: [],
        paid_allocation_inferred: false,
      });
      f.editSummary((v) => {
        if (mode === "foreign-summary") v.subjects[0].case_id = target2;
        else v.subjects[0].erased_at = "not-a-date";
        return v;
      });
    } else if (["foreign-right", "wrong-original"].includes(mode)) {
      options.summary = async () => oldSummary;
      f.editRights((v) => {
        if (mode === "foreign-right") v.continuations[0].case_id = target2;
        else v.continuations[0].original.scope = "altered";
        return v;
      });
    } else {
      options.rights = async () => ({
        observations: [],
        continuations: [],
        paid_allocation_inferred: false,
      });
      options.summary = () => held.promise;
    }
    const pending = client.load().catch((e) => e);
    if (mode === "stale-proof") f.identity();
    if (mode === "stale-owner") options.owner = () => ({ case_id: target2, subject: oid });
    if (mode === "stale-ambient") f.ambient();
    if (mode === "disposed") client.dispose();
    held.resolve(f.summary());
    await pending;
    await flush();
    assert.deepEqual(live, [], mode);
    client.dispose();
  }
});

test("PC1 exact withdrawn response invalidates before failed local storage and never follows S2", async () => {
  const { f, client, options } = await prepared();
  await client.submit();
  const live = [];
  options.onErasedSubject = (subject) => live.push(subject);
  f.withdraw();
  const original = options.continuePremium;
  options.continuePremium = async (body) => {
    const result = await original(body);
    f.storageFailure(true);
    return result;
  };
  options.snapshot = async () => {
    throw http(503);
  };
  options.summary = async () => {
    throw http(503);
  };
  options.rights = async () => {
    throw http(503);
  };
  await assert.rejects(client.submit());
  assert.deepEqual(live, [target]);
  f.storageFailure(false);
  client.dispose();
});

test("PC1 live withdrawal is monotone within its proof and preserves an independently current S2", async () => {
  const { f, client, options } = await prepared();
  await client.submit();
  const oldSummary = f.summary(),
    oldExport = f.snapshot(),
    oldRights = await options.rights();
  const learning = learningFixture();
  learning.options.summary = async () => ({
    subjects: [{ case_id: cid, subject: target2, erased_at: null }],
  });
  const refresh = learning.options.refresh,
    fetch = learning.options.fetch;
  learning.options.refresh = async () => ({ ...(await refresh()), subject: target2 });
  learning.options.fetch = async (...args) => ({ ...(await fetch(...args)), subject: target2 });
  const access = createLearningAccess(learning.options);
  await access.prepare(target2);
  await access.submit();
  const current = clone(access.resources.value),
    saved = learning.data.get(learning.key),
    live = [];
  options.onErasedSubject = (subject) => {
    live.push(subject);
    access.observeErasedSubject(subject);
  };
  f.withdraw();
  await client.load();
  assert.deepEqual(access.resources.value, current);
  assert.equal(learning.data.get(learning.key), saved);
  options.summary = async () => oldSummary;
  options.snapshot = async () => oldExport;
  options.rights = async () => oldRights;
  await client.load();
  assert(client.withdrawnSubjects.value.includes(target));
  assert(
    !client.targets.value.includes(target),
    "older same-proof active target cannot undo live erasure"
  );
  assert.equal(live.filter((s) => s === target).length, 1);
  client.importRecovery(client.recoveryText());
  assert.equal(
    live.filter((s) => s === target).length,
    1,
    "file import supplies no new live observation"
  );
  client.dispose();
  access.dispose();
});

test("PC1 a withdrawn POST with mismatched original fields cannot emit erasure", async () => {
  const { client, options } = await prepared();
  await client.submit();
  const live = [],
    original = options.continuePremium;
  options.onErasedSubject = (subject) => live.push(subject);
  options.continuePremium = async (body) => {
    const row = await original(body);
    row.state = "withdrawn";
    row.original.scope = "foreign original";
    return row;
  };
  await assert.rejects(client.submit(), /conflicting_record/);
  assert.deepEqual(live, []);
  client.dispose();
});

test("PC1 export qualification rejects foreign, malformed, conflicting and obsolete live evidence", async () => {
  for (const mode of [
    "foreign-case",
    "foreign-owner",
    "erasure-case",
    "erasure-request",
    "erasure-time",
    "erasure-scope",
    "erasure-duplicate",
    "erasure-array",
    "row-original-missing",
    "row-original-mismatch",
    "row-case",
    "row-election",
    "row-result",
    "row-duplicate",
    "row-prior-immutable",
    "row-array",
    "stale-proof",
    "stale-owner",
    "stale-ambient",
    "disposed",
    "newer-generation",
  ]) {
    const { f, client, options } = await prepared();
    await client.submit();
    const oldExport = f.snapshot(),
      oldSummary = f.summary(),
      oldRights = await options.rights(),
      live = [],
      held = deferred();
    options.onErasedSubject = (subject) => live.push(subject);
    f.withdraw();
    const fresh = f.snapshot();
    options.summary = async () => oldSummary;
    options.rights = async () => oldRights;
    if (mode.startsWith("row-")) fresh.subject_erasures = oldExport.subject_erasures;
    else fresh.resource_continuations = oldExport.resource_continuations;
    if (mode === "foreign-case") fresh.case.id = target2;
    if (mode === "foreign-owner") fresh.case.subject = target2;
    if (mode === "erasure-case") fresh.subject_erasures.at(-1).case_id = target2;
    if (mode === "erasure-request") fresh.subject_erasures.at(-1).request_id = "invalid";
    if (mode === "erasure-time") fresh.subject_erasures.at(-1).erased_at = "not-a-date";
    if (mode === "erasure-scope") fresh.subject_erasures.at(-1).scope = "ordinary_account";
    if (mode === "erasure-duplicate")
      fresh.subject_erasures.push(clone(fresh.subject_erasures.at(-1)));
    if (mode === "erasure-array") fresh.subject_erasures = null;
    if (mode === "row-original-missing") fresh.evidence = [];
    if (mode === "row-original-mismatch") fresh.evidence[0].evidence.scope = "different";
    if (mode === "row-case") fresh.resource_continuations[0].case_id = target2;
    if (mode === "row-election") fresh.resource_continuations[0].election.successor = target2;
    if (mode === "row-result") fresh.resource_continuations[0].result.renewal_activated = true;
    if (mode === "row-duplicate")
      fresh.resource_continuations.push(clone(fresh.resource_continuations[0]));
    if (mode === "row-prior-immutable") fresh.resource_continuations[0].created_at = f.at(-100);
    if (mode === "row-array") fresh.resource_continuations = null;
    const stale = mode.startsWith("stale-") || ["disposed", "newer-generation"].includes(mode);
    options.snapshot = stale ? () => held.promise : async () => fresh;
    const pending = client.load().catch((error) => error);
    if (mode === "stale-proof") f.identity();
    if (mode === "stale-owner") options.owner = () => ({ case_id: target2, subject: oid });
    if (mode === "stale-ambient") f.ambient();
    if (mode === "disposed") client.dispose();
    if (mode === "newer-generation") {
      options.snapshot = async () => oldExport;
      await client.load();
    }
    held.resolve(fresh);
    await pending;
    await flush();
    assert.deepEqual(live, [], mode);
    client.dispose();
  }
});

for (const feed of ["erasure", "withdrawn"])
  test(`PC1 independently qualified exported ${feed} preserves S2 and exact recovery history`, async () => {
    const { f, client, options, storage } = await prepared();
    await client.submit();
    const oldExport = f.snapshot(),
      oldSummary = f.summary(),
      oldRights = await options.rights(),
      originalSaved = storage.data.get(storageKey),
      learning = learningFixture();
    learning.options.summary = async () => ({
      subjects: [{ case_id: cid, subject: target2, erased_at: null }],
    });
    const refresh = learning.options.refresh,
      fetch = learning.options.fetch;
    learning.options.refresh = async () => ({ ...(await refresh()), subject: target2 });
    learning.options.fetch = async (...args) => ({ ...(await fetch(...args)), subject: target2 });
    const access = createLearningAccess(learning.options);
    await access.prepare(target2);
    await access.submit();
    const current = clone(access.resources.value),
      saved = learning.data.get(learning.key),
      live = [];
    options.onErasedSubject = (subject) => {
      live.push(subject);
      access.observeErasedSubject(subject);
    };
    f.withdraw();
    const fresh = f.snapshot();
    if (feed === "erasure") fresh.resource_continuations = oldExport.resource_continuations;
    else fresh.subject_erasures = oldExport.subject_erasures;
    // History remains unavailable even though this independently qualified
    // live observation must immediately invalidate only the exact erased S1.
    fresh.journal = [];
    options.snapshot = async () => fresh;
    options.summary = async () => oldSummary;
    options.rights = async () => oldRights;
    await assert.rejects(client.load());
    assert.deepEqual(live, [target]);
    assert.deepEqual(access.resources.value, current);
    assert.equal(learning.data.get(learning.key), saved);
    assert.equal(storage.data.get(storageKey), originalSaved);
    assert.equal(client.current.value, null);
    assert(!client.targets.value.includes(target));
    // A later older export cannot undo the live observation.
    options.snapshot = async () => oldExport;
    await client.load();
    assert(client.withdrawnSubjects.value.includes(target));
    assert(!client.targets.value.includes(target));
    assert.deepEqual(access.resources.value, current);
    client.dispose();
    access.dispose();
  });
