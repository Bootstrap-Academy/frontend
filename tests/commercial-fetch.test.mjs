// Actual pinned ofetch/native boundary plus current production adapters. All
// responses and storage are synthetic; no application server or network is used.
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { createFetch } from "ofetch";
const stage = await mkdtemp(join(tmpdir(), "cfb1-contracts-"));
after(() => rm(stage, { recursive: true, force: true }));
async function load(name) {
  let source = await readFile(new URL(`../composables/${name}.ts`, import.meta.url), "utf8");
  let code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  code = code.replaceAll('from "vue"', `from ${JSON.stringify(import.meta.resolve("vue"))}`);
  code = code.replaceAll(
    'from "./commercialStatus"',
    `from ${JSON.stringify(new URL("../composables/commercialStatus.ts", import.meta.url).href)}`
  );
  const file = join(stage, name + ".mjs");
  await writeFile(file, code);
  return import(pathToFileURL(file));
}
const factory =
  process.env.CFB1_BASELINE === "original"
    ? (parent) => parent // Exact original injection: directly call the parent $fetch.
    : (await load("commercialFetch")).createCommercialFetch;
const { createOriginalDocuments, originalVariants } = await load("originalDocuments");
const { createCommercialAccess } = await load("commercialAccess");
const { createLearningAccess } = await load("learningAccess");
const { createRetainedCourses } = await load("retainedCourses");
const A = "11000000-0000-4000-8000-000000000001";
const S = "11000000-0000-4000-8000-000000000002";
const C = "22000000-0000-4000-8000-000000000001";
const O = "33000000-0000-4000-8000-000000000001";
const key = "a".repeat(43);
const delay = (ms = 25) => new Promise((r) => setTimeout(r, ms));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((r, j) => {
    resolve = r;
    reject = j;
  });
  return { promise, resolve, reject };
};
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", "x-fixture": "retained" },
  });
function bodyResponse(
  status = 401,
  kind = "held",
  cancellation = "resolve",
  mime = "application/json"
) {
  let controller,
    cancelled = 0;
  const stream = new ReadableStream({
    start(c) {
      controller = c;
      if (kind === "failed") c.error(Error("body failed after headers"));
    },
    cancel() {
      cancelled++;
      if (cancellation === "pending") return new Promise(() => {});
      if (cancellation === "reject") return Promise.reject(Error("cleanup unavailable"));
    },
  });
  const response = new Response(stream, {
    status,
    statusText: "Fixture response",
    headers: { "content-type": mime, "x-fixture": "retained" },
  });
  if (cancellation === "throw")
    Object.defineProperty(response, "body", {
      get() {
        throw Error("cleanup accessor unavailable");
      },
    });
  return {
    response,
    get cancelled() {
      return cancelled;
    },
    release() {
      try {
        controller.close();
      } catch {}
    },
  };
}
function transport(handler) {
  const calls = [];
  const parent = createFetch({
    fetch: async (request, options) => {
      calls.push({ request, options });
      return handler(request, options);
    },
  });
  const scoped = factory(parent);
  return {
    parent,
    scoped,
    calls,
    fetch: (path, options) =>
      scoped(path, { ...options, baseURL: "https://synthetic.invalid/prefix" }),
  };
}
const liveLearning = new Set();
after(() => {
  for (const client of liveLearning) client.dispose();
});
const storage = () => {
  const data = new Map();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
};
const options = {
  method: "POST",
  body: { exact: "unchanged" },
  credentials: "omit",
  retry: 0,
  timeout: 20000,
  headers: { "x-commercial-claim-key": key },
};
for (const type of ["json", "blob"])
  for (const mode of ["held", "failed"])
    test(`CFB1 ${type} ${mode} received401 reaches actual FetchError before original body`, async () => {
      const body = bodyResponse(
        401,
        mode,
        "pending",
        type === "blob" ? "application/pdf" : "application/json"
      );
      const t = transport(() => body.response);
      let error;
      const pending = t
        .fetch("/shop/claims/documents", { ...options, responseType: type })
        .catch((e) => {
          error = e;
        });
      try {
        await delay();
        assert.equal(error?.response?.status, 401);
        assert.equal(error.response.headers.get("x-fixture"), "retained");
        assert.equal(error.response.statusText, "Fixture response");
        assert.equal(t.calls.length, 1);
      } finally {
        body.release();
        await pending;
      }
    });
for (const mode of ["reject", "throw"])
  test(`CFB1 ${mode} cancellation cannot replace received401`, async () => {
    const b = bodyResponse(401, "held", mode);
    const t = transport(() => b.response);
    let error;
    const pending = t.fetch("/read", options).catch((e) => {
      error = e;
    });
    try {
      await delay();
      assert.equal(error?.response?.status, 401);
    } finally {
      b.release();
      await pending;
    }
  });
test("CFB1 prefix, original native capture, JSON body and one selected proof retain exact options", async () => {
  const t = transport(() => json({ recorded: true }));
  const originalNative = t.parent.native;
  t.parent.native = () => {
    throw Error("later parent replacement must not be used");
  };
  // The old direct parent also closes over its original native implementation.
  assert.deepEqual(await t.fetch("/shop/claims/recipient/export", options), { recorded: true });
  const call = t.calls[0];
  assert.equal(call.request, "https://synthetic.invalid/prefix/shop/claims/recipient/export");
  assert.equal(call.options.body, JSON.stringify(options.body));
  assert.equal(call.options.credentials, "omit");
  assert.equal(call.options.retry, 0);
  assert.equal(call.options.timeout, 20000);
  assert.equal(call.options.headers.get("x-commercial-claim-key"), key);
  assert.equal(call.options.headers.get("authorization"), null);
  assert.equal(call.options.headers.get("x-learning-key"), null);
  assert.equal(call.options.headers.get("x-moderation-capability"), null);
  assert.equal(t.calls.length, 1);
  assert.equal(typeof originalNative, "function");
});
test("CFB1 non401 errors retain JSON payload; exact PDF/text Blob bytes pass through", async () => {
  for (const status of [403, 409, 503]) {
    const t = transport(() => json({ original: "conflict", status }, status));
    await assert.rejects(
      t.fetch("/read", options),
      (e) => e.response.status === status && e.data.original === "conflict"
    );
    assert.equal(t.calls.length, 1);
  }
  for (const mime of ["application/pdf", "text/plain; charset=utf-8"]) {
    const bytes = new Uint8Array([0, 255, 60, 13, 10, 42]);
    const t = transport(() => new Response(bytes, { headers: { "content-type": mime } }));
    const blob = await t.fetch("/document", { ...options, responseType: "blob" });
    assert.equal(blob.type, mime.replace("; ", ";"));
    assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), bytes);
  }
});
function inventory() {
  return {
    protocol: 1,
    claimant_subject: A,
    observed_at: "2026-09-10T10:00:00Z",
    scope: {
      finance: "claimant_only",
      purchases: "claimant_and_same_case_learning_subjects",
      archives_scanned: false,
      remote_sources_queried: false,
      catalog_complete: false,
      historical_owner_inventory_complete: true,
      known_local_enumeration_complete: true,
    },
    records: [
      {
        family: "purchase",
        kind: "purchase",
        source_service: "backend",
        source_subject: S,
        owner_relation: "same_case_learning_subject",
        purchase_source: "skills",
        offer_id: O,
        printed_number: null,
        record_basis: "original_offer",
        reader_state: "candidate",
        reason: null,
        selector: null,
        artifacts: originalVariants.map((variant) => ({
          variant,
          selection_source: "stored",
          observation: "nonempty",
          reader_state: "candidate",
          reason: null,
          selector: { kind: "purchase", id: O, variant },
        })),
      },
    ],
  };
}
async function originals() {
  let proof = key,
    identity = "same",
    ambient = "same",
    alive = true,
    rejectCount = 0,
    handler;
  const t = transport((...args) => (handler ? handler(...args) : json(inventory())));
  const capture = () => {
    const p = proof,
      i = identity,
      a = ambient;
    const current = () => alive && p === proof && i === identity && a === ambient;
    return {
      kind: "claim",
      secret: p,
      subject: A,
      current,
      invalidate() {
        if (current()) {
          rejectCount++;
          proof = null;
        }
      },
    };
  };
  const deliveries = [];
  const c = createOriginalDocuments({
    capture,
    identity: () => identity,
    fetch: t.fetch,
    deliver: (...a) => deliveries.push(a),
    revoke() {},
  });
  await c.load();
  assert(c.inventory.value);
  c.choose(c.inventory.value.records[0]);
  c.chooseArtifact(c.selected.value.artifacts[0]);
  return {
    c,
    t,
    deliveries,
    capture,
    get rejected() {
      return rejectCount;
    },
    set handler(v) {
      handler = v;
    },
    replace() {
      proof = "b".repeat(43);
    },
    ambient() {
      ambient += "x";
    },
    owner() {
      identity += "x";
    },
    dispose() {
      alive = false;
      c.dispose();
    },
  };
}
for (const operation of ["download", "status"])
  test(`CFB1 original ${operation} held401 invalidates current parent across selection change`, async () => {
    const f = await originals(),
      b = bodyResponse();
    f.handler = () => b.response;
    const work = operation === "download" ? f.c.download() : f.c.loadStatus();
    f.c.choose(null);
    try {
      await delay();
      assert.equal(f.rejected, 1);
      assert.equal(f.c.inventory.value, null);
      assert.equal(f.deliveries.length, 0);
    } finally {
      b.release();
      await work;
      f.dispose();
    }
  });
for (const change of ["replace", "ambient", "owner", "dispose"])
  test(`CFB1 original held401 cannot invalidate ${change} context`, async () => {
    const f = await originals(),
      head = deferred(),
      b = bodyResponse();
    f.handler = () => head.promise;
    const work = f.c.download();
    await delay(1);
    f[change]();
    head.resolve(b.response);
    try {
      await delay();
      assert.equal(f.rejected, 0);
      assert.equal(f.deliveries.length, 0);
    } finally {
      b.release();
      await work;
      f.dispose();
    }
  });
test("CFB1 original earlier held200 cannot republish after current denied inventory", async () => {
  const f = await originals(),
    held = deferred(),
    b = bodyResponse();
  f.handler = (path) => (path.endsWith("/terms") ? held.promise : b.response);
  const download = f.c.download();
  await delay(1);
  const denied = f.c.load();
  try {
    await delay();
    assert.equal(f.rejected, 1);
    held.resolve(
      new Response("%PDF synthetic", { headers: { "content-type": "application/pdf" } })
    );
    await download;
    assert.equal(f.deliveries.length, 0);
    assert.equal(f.c.inventory.value, null);
  } finally {
    b.release();
    held.resolve(json({}));
    await Promise.all([download, denied]);
    f.dispose();
  }
});
for (const kind of ["network", "failed200"])
  test(`CFB1 original ${kind} leaves matching proof and cached inventory available`, async () => {
    const f = await originals(),
      b = bodyResponse(200, "failed");
    f.handler = () => {
      if (kind === "network") throw Error("network unavailable");
      return b.response;
    };
    await f.c.download();
    assert.equal(f.rejected, 0);
    assert(f.c.inventory.value);
    assert.equal(f.deliveries.length, 0);
    f.dispose();
  });
async function commercial(noCase = false) {
  const data = storage();
  let handler,
    personal = { kind: "moderation", secret: "rights-proof", subject: A };
  const absent = {
    retention_reviews: {
      statement_reviews: [],
      archive_work: [],
      history: [],
      owner_associations: [],
      scope:
        "Existing number-linked records with established owner authority; unknown historical ownership is not inferred",
    },
    ...Object.fromEntries(
      [
        "reservation_splits",
        "cash_payments",
        "cash_allocations",
        "subject_erasures",
        "service_erasure_intakes",
        "course_successor_grants",
        "course_successor_receipts",
        "resource_continuations",
        "event_successor_grants",
        "event_successor_receipts",
        "event_cancellation_declarations",
        "event_cancellation_observations",
      ].map((k) => [k, []])
    ),
  };
  const t = transport((request, opts) =>
    handler
      ? handler(request, opts)
      : json(noCase ? absent : { case: { id: C, subject: A, access_epoch: 2 } })
  );
  const c = createCommercialAccess({
    storage: data,
    fetch: t.fetch,
    ambient: () => "ambient",
    identity: () => "identity",
    personalProof: () => personal,
  });
  if (noCase) await c.connectPersonal();
  else await c.connectKey(key);
  return {
    c,
    data,
    t,
    get personal() {
      return personal;
    },
    set handler(v) {
      handler = v;
    },
    absent,
  };
}
test("CFB1 commercial denied read clears parent while exact prepared rotation bytes stay saved", async () => {
  const f = await commercial(),
    b = bodyResponse();
  await f.c.prepare();
  const saved = f.data.getItem("commercial-access-rotations-v1");
  f.handler = () => b.response;
  const work = f.c.snapshot().catch(() => {});
  try {
    await delay();
    assert.equal(f.c.owner.value, null);
    assert.equal(f.c.error.value, "proof_required");
    assert.equal(f.data.getItem("commercial-access-rotations-v1"), saved);
  } finally {
    b.release();
    await work;
    f.c.dispose();
  }
});
test("CFB1 explicit opening persists exact unknown command before denied headers and makes no new command", async () => {
  const f = await commercial(true),
    b = bodyResponse();
  const sent = [];
  f.handler = (url, opts) => {
    if (url.endsWith("/export")) return json(f.absent);
    assert(url.endsWith("/open"));
    const body = JSON.parse(opts.body);
    const rows = [...f.data.data.values()].join(" ");
    assert(rows.includes(body.command_id));
    sent.push(body);
    return b.response;
  };
  const work = f.c.openCase().catch(() => {});
  try {
    await delay();
    assert.equal(sent.length, 1);
    assert.equal(f.c.error.value, "proof_required");
    const saved = [...f.data.data.values()].join(" ");
    assert(saved.includes(sent[0].command_id));
    assert(saved.includes("unconfirmed"));
    assert.equal(f.c.owner.value, null);
  } finally {
    b.release();
    await work;
    f.c.dispose();
  }
});
test("CFB1 received401 during rotation preserves the exact uncertain command without another dispatch", async () => {
  const f = await commercial(),
    b = bodyResponse();
  await f.c.prepare();
  const prepared = JSON.parse(f.data.getItem("commercial-access-rotations-v1"))[0].rotation;
  const sent = [];
  f.handler = (url, opts) => {
    assert(url.endsWith("/access"));
    const body = JSON.parse(opts.body);
    assert.deepEqual(body, prepared.body);
    const saved = JSON.parse(f.data.getItem("commercial-access-rotations-v1"))[0].rotation;
    assert.equal(saved.state, "unconfirmed");
    assert.deepEqual(saved.body, body);
    sent.push(body);
    return b.response;
  };
  const work = f.c.submit().catch(() => {});
  try {
    await delay();
    assert.equal(f.c.owner.value, null);
    assert.equal(sent.length, 1);
    const saved = JSON.parse(f.data.getItem("commercial-access-rotations-v1"))[0].rotation;
    assert.deepEqual(saved, { ...prepared, state: "unconfirmed" });
  } finally {
    b.release();
    await work;
    f.c.dispose();
  }
});
test("CFB1 normal held200 and held403 body behavior remains unchanged without a new body timeout", async () => {
  for (const status of [200, 403]) {
    const b = bodyResponse(status),
      t = transport(() => b.response);
    let finished = false;
    const work = t.fetch("/read", { ...options, timeout: 5 }).then(
      () => {
        finished = true;
      },
      () => {
        finished = true;
      }
    );
    try {
      await delay();
      assert.equal(finished, false);
      assert.equal(b.cancelled, 0);
    } finally {
      b.release();
      await work;
    }
  }
});
async function learning(start = false) {
  const data = storage();
  let handler,
    identity = "same",
    ambient = "same",
    owner = { case_id: C, subject: A },
    personalCalls = 0;
  const receipt = {
    subject: S,
    expires_at: new Date(Date.now() + 300000).toISOString(),
    purpose: "retained_learning",
    ordinary_authority: false,
    financial_authority: false,
    claims_satisfied: false,
  };
  const resource = {
    subject: S,
    purpose: "retained_learning",
    ordinary_authority: false,
    renewal_activated: false,
    purchase_performed: false,
    coins: 3,
    withheld_coins: 0,
    hearts: 3,
    hearts_max: 5,
    premium: null,
  };
  const t = transport((...args) => (handler ? handler(...args) : json(resource)));
  const summary = async () => ({ subjects: [{ subject: S, case_id: C, erased_at: null }] });
  const issue = async () => {
    personalCalls++;
    return receipt;
  };
  const c = createLearningAccess({
    owner: () => owner,
    identity: () => identity,
    ambient: () => ambient,
    storage: data,
    fetch: t.fetch,
    summary,
    refresh: issue,
    start: issue,
  });
  liveLearning.add(c);
  await c.loadSubjects();
  if (start) {
    c.importRecovery(
      JSON.stringify({
        version: 2,
        operation: "learning_start",
        owner,
        state: "unconfirmed",
        body: {
          case_id: C,
          command_id: crypto.randomUUID(),
          key,
          expected_no_active_subject: true,
          use_retained_value: true,
        },
      })
    );
  } else await c.prepare(S);
  await c.submit();
  assert(c.resources.value);
  return {
    c,
    t,
    data,
    receipt,
    resource,
    get personalCalls() {
      return personalCalls;
    },
    set handler(v) {
      handler = v;
    },
    replace() {
      c.importRecovery(c.recoveryText());
    },
    owner() {
      owner = { case_id: C, subject: O };
    },
    ambient() {
      ambient += "x";
    },
    dispose() {
      c.dispose();
    },
  };
}
for (const version of [1, 2])
  test(`CFB1 learning course held401 clears cached authority and preserves v${version} command and personal refresh`, async () => {
    const f = await learning(version === 2),
      b = bodyResponse(),
      saved = [...f.data.data];
    f.handler = () => b.response;
    const work = f.c.courseRequest({ kind: "list" }).catch(() => {});
    try {
      await delay();
      assert.equal(f.c.resources.value, null);
      assert.equal(f.c.error.value, "learning_inactive");
      assert.deepEqual([...f.data.data], saved);
      f.handler = () => json(f.resource);
      await f.c.submit();
      assert(f.c.resources.value);
      assert.equal(f.personalCalls, 2);
      for (const [name, value] of saved)
        assert.deepEqual(
          JSON.parse(f.data.getItem(name)).map((r) => r.record),
          JSON.parse(value).map((r) => r.record)
        );
    } finally {
      b.release();
      await work;
      f.dispose();
    }
  });
test("CFB1 learning resources failed401 reports inactivity; verify already clears resources before request", async () => {
  const f = await learning(),
    b = bodyResponse(401, "failed");
  f.handler = () => b.response;
  await f.c.verify().catch(() => {});
  assert.equal(f.c.error.value, "learning_inactive");
  assert.equal(f.c.resources.value, null);
  f.dispose();
});
for (const change of ["replace", "owner", "ambient", "dispose"])
  test(`CFB1 learning held401 cannot invalidate ${change} generation`, async () => {
    const f = await learning(),
      head = deferred(),
      b = bodyResponse();
    f.handler = () => head.promise;
    const work = f.c.courseRequest({ kind: "list" }).catch(() => {});
    await delay(1);
    f[change]();
    const generation = f.c.generation.value;
    head.resolve(b.response);
    try {
      await delay();
      assert.equal(f.c.generation.value, generation);
      assert.notEqual(f.c.error.value, "learning_inactive");
    } finally {
      b.release();
      await work;
      f.dispose();
    }
  });
for (const kind of ["network", "failed200"])
  test(`CFB1 learning course ${kind} preserves existing resources without inferred denial`, async () => {
    const f = await learning(),
      b = bodyResponse(200, "failed"),
      generation = f.c.generation.value;
    f.handler = () => {
      if (kind === "network") throw Error("network unavailable");
      return b.response;
    };
    await f.c.courseRequest({ kind: "list" }).catch(() => {});
    assert(f.c.resources.value);
    assert.equal(f.c.generation.value, generation);
    assert.equal(f.c.error.value, "");
    f.dispose();
  });
test("CFB1 completion received401 preserves uncertainty, sends one exact PUT and cannot grant progress", async () => {
  const f = await learning(),
    b = bodyResponse(),
    calls = [];
  const details = {
    id: "course",
    title: "Course",
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
  f.handler = (url, opts) => {
    calls.push({ url, method: opts.method });
    if (url.endsWith("/complete")) return b.response;
    if (url.endsWith("/course_access")) return json([{ id: "course", title: "Course" }]);
    if (url.endsWith("/watch")) return json(true);
    if (url.endsWith("/lectures/lecture"))
      return json("https://synthetic.invalid/prefix/skills/learning/lectures/proof/lecture.mp4");
    return json(details);
  };
  const courses = createRetainedCourses({
    request: f.c.courseRequest,
    identity: () => "same",
    apiBase: "https://synthetic.invalid/prefix",
  });
  await courses.load();
  await courses.openCourse("course");
  await courses.openLecture("section", "lecture");
  const saved = [...f.data.data];
  const work = courses.complete().catch(() => {});
  try {
    await delay();
    assert.equal(f.c.resources.value, null);
    assert.equal(courses.progressUncertain.value, true);
    assert.equal(courses.course.value, null);
    assert.equal(calls.filter((c) => c.method === "PUT").length, 1);
    assert(
      calls
        .find((c) => c.method === "PUT")
        .url.endsWith("/courses/course/lectures/lecture/complete")
    );
    assert.deepEqual([...f.data.data], saved);
  } finally {
    b.release();
    await work;
    courses.dispose();
    f.dispose();
  }
});
