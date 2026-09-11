import { fixtureFetch } from "./helpers/commercial-fetch.mjs";
// Synthetic adapter/mounted controls; no backend, database or real proof is used.
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import * as Vue from "vue";
import { createI18n } from "vue-i18n";
import { parse, compileScript } from "@vue/compiler-sfc";
const stage = await mkdtemp(join(tmpdir(), "commercial-case-open-test-"));
after(() => rm(stage, { recursive: true, force: true }));
const adapterPath = join(stage, "adapter.mjs");
const raw = await readFile(new URL("../composables/commercialAccess.ts", import.meta.url), "utf8");
let code = ts.transpileModule(raw, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
code = code
  .replace('from "vue"', `from ${JSON.stringify(import.meta.resolve("vue"))}`)
  .replace(
    'from "./commercialStatus"',
    `from ${JSON.stringify(new URL("../composables/commercialStatus.ts", import.meta.url).href)}`
  );
await writeFile(adapterPath, code);
const { createCommercialAccess } = await import(pathToFileURL(adapterPath));
const subject = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  caseId = "20000000-0000-4000-8000-000000000001",
  command = "30000000-0000-4000-8000-000000000001";
const storageKey = "commercial-case-opening-v1";
const families = [
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
];
function absent(intake = false) {
  return {
    ...Object.fromEntries(families.map((k) => [k, []])),
    retention_reviews: {
      statement_reviews: [{ id: "original observation" }],
      archive_work: [],
      history: [],
      owner_associations: [{ original_owner: subject }],
      scope:
        "Existing number-linked records with established owner authority; unknown historical ownership is not inferred",
    },
    ...(intake
      ? {
          case: null,
          financial_inventory: "pending",
          erasure_intake: {
            id: other,
            subject,
            received_at: "2026-09-10T08:00:00Z",
            recorded_at: "2026-09-10T08:00:01Z",
            source: "authenticated_service_receipt",
            declaration: {},
          },
        }
      : {}),
  };
}
function present(journal = []) {
  return {
    ...absent(),
    case: { id: caseId, subject, access_epoch: 1 },
    ...Object.fromEntries(
      [
        "requests",
        "obligations",
        "evidence",
        "journal",
        "reservations",
        "document_holds",
        "contract_holds",
        "renewal_holds",
        "legacy_renewal_holds",
        "disposals",
      ].map((k) => [k, k === "journal" ? journal : []])
    ),
  };
}
const receipt = { case_id: caseId, status: "inventory_pending" };
const recovery = () => ({
  version: 1,
  operation: "open",
  subject,
  body: { command_id: command },
  state: "unconfirmed",
});
const http = (n) => Object.assign(Error(`Synthetic ${n}`), { response: { status: n } });
const defer = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
function fixture() {
  const data = new Map(),
    calls = [],
    journal = [];
  let current = absent(),
    personal = { kind: "moderation", subject, secret: "synthetic-rights-proof" },
    identity = "view",
    ambient = "ambient",
    fault = "",
    failStorage = false,
    hook = null;
  const storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem(k, v) {
      if (failStorage) throw Error("Synthetic storage unavailable");
      data.set(k, v);
    },
    removeItem: (k) => data.delete(k),
  };
  const options = {
    storage,
    personalProof: () => personal,
    identity: () => identity,
    ambient: () => ambient,
    fetch: async (path, opts) => {
      calls.push({ path, options: structuredClone(opts) });
      assert.equal(opts.credentials, "omit");
      assert.equal(opts.retry, 0);
      assert.deepEqual(opts.headers, { "x-moderation-capability": "synthetic-rights-proof" });
      if (hook) await hook(path, opts);
      if (fault === "401" || fault === "403") throw http(Number(fault));
      if (path.endsWith("/export")) {
        assert.deepEqual(opts.body, {});
        if (fault === "export503") throw http(503);
        return structuredClone(current);
      }
      assert.equal(path, "/shop/claims/recipient/open");
      assert.deepEqual(Object.keys(opts.body), ["command_id"]);
      const saved = JSON.parse(data.get(storageKey));
      assert(
        saved.some((r) => JSON.stringify(r.record.body) === JSON.stringify(opts.body)),
        "request persisted before dispatch"
      );
      assert(
        !JSON.stringify(saved).includes(personal?.secret),
        "opening record has no proof secret"
      );
      if (fault === "before") throw Error("Synthetic unknown transport outcome");
      const row = journal.find((r) => r.command_id === opts.body.command_id);
      if (!row)
        journal.push({
          command_id: opts.body.command_id,
          actor: subject,
          kind: "open",
          request: structuredClone(opts.body),
          case_id: caseId,
          result: { ...receipt },
        });
      current = present(fault === "after-hidden" ? [] : journal);
      if (fault === "after" || fault === "after-hidden")
        throw Error("Synthetic committed reply lost");
      if (fault === "post503") fault = "export503";
      if (fault === "post-other") current.case.id = other;
      return { ...receipt };
    },
  };
  return {
    data,
    calls,
    journal,
    options,
    flow: () => createCommercialAccess(options),
    set(v) {
      current = v;
    },
    fault(v) {
      fault = v;
    },
    proof(v) {
      personal = v;
    },
    identity() {
      identity += "x";
    },
    ambient() {
      ambient += "x";
    },
    hook(v) {
      hook = v;
    },
    storageFail(v) {
      failStorage = v;
    },
  };
}
const opens = (f) => f.calls.filter((c) => c.path.endsWith("/open"));
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

const componentSource = await readFile(
  new URL("../components/CommercialAccess.vue", import.meta.url),
  "utf8"
);
const { descriptor } = parse(componentSource);
let componentCode = ts.transpileModule(
  compileScript(descriptor, { id: "case-open-mounted", inlineTemplate: true }).content,
  { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }
).outputText;
for (const dependency of ["vue", "vue-i18n"])
  componentCode = componentCode.replace(
    new RegExp(`from ["']${dependency}["']`, "g"),
    `from ${JSON.stringify(import.meta.resolve(dependency))}`
  );
componentCode = componentCode.replace(
  'from "../composables/commercialAccess"',
  `from ${JSON.stringify(pathToFileURL(adapterPath).href)}`
);
componentCode = componentCode.replace(
  'from "../composables/commercialFetch"',
  `from ${JSON.stringify(new URL("../composables/commercialFetch.ts", import.meta.url).href)}`
);
await writeFile(join(stage, "panel.mjs"), componentCode);
const panel = (await import(pathToFileURL(join(stage, "panel.mjs")))).default;

for (const intake of [false, true])
  test(`actual ${intake ? "intake-only null-case" : "omitted-case/no-intake"} envelope permits explicit opening with nonempty retention observations`, async () => {
    const f = fixture(),
      c = f.flow();
    f.set(absent(intake));
    await c.connectPersonal();
    assert.equal(c.owner.value, null);
    assert.equal(c.canOpenCase.value, true);
    assert.equal(opens(f).length, 0);
    await c.openCase();
    assert.equal(c.owner.value.case_id, caseId);
    assert.equal(c.caseOpening.value.state, "recorded");
    assert.equal(c.caseOpening.value.receipt.status, "inventory_pending");
    assert.equal(opens(f).length, 1);
    assert.equal(f.calls.at(-1).path, "/shop/claims/recipient/export");
    assert(!f.calls.some((r) => /learning|access$|purchase/.test(r.path)));
  });
test("malformed, unavailable and contradictory absence is never permission to open", async () => {
  const bad = [
    null,
    [],
    {},
    { case: null },
    { ...absent(), case: null },
    { ...absent(), cash_payments: null },
    { ...absent(), event_successor_grants: [{}] },
    { ...absent(true), erasure_intake: { ...absent(true).erasure_intake, subject: other } },
    { ...absent(true), erasure_intake: { ...absent(true).erasure_intake, received_at: "invalid" } },
    { ...absent(), retention_reviews: { scope: "pending" } },
  ];
  const missing = absent();
  delete missing.resource_continuations;
  bad.push(missing);
  for (const value of bad) {
    const f = fixture(),
      c = f.flow();
    f.set(value);
    await assert.rejects(c.connectPersonal());
    await assert.rejects(c.openCase());
    assert.equal(c.canOpenCase.value, false);
    assert.equal(c.owner.value, null);
    assert.equal(opens(f).length, 0);
  }
});
test("ordinary, missing subject and claim-only proof cannot dispatch this explicit operation", async () => {
  for (const p of [
    null,
    { kind: "claim", secret: "a".repeat(43), subject },
    { kind: "moderation", secret: "x" },
    { kind: "moderation", secret: "x", subject: "not-a-uuid" },
  ]) {
    const f = fixture(),
      c = f.flow();
    f.proof(p);
    await assert.rejects(c.connectPersonal(), /proof_required/);
    await assert.rejects(c.openCase(), /proof_required/);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture(),
    c = f.flow();
  f.fault("403");
  await assert.rejects(c.connectPersonal());
  assert.equal(c.owner.value, null);
  assert.equal(opens(f).length, 0);
});
test("existing owned case bypasses opening without generating a command", async () => {
  const f = fixture(),
    c = f.flow();
  f.set(present());
  await c.openCase();
  assert.equal(c.owner.value.subject, subject);
  assert.equal(c.caseOpening.value, null);
  assert.equal(opens(f).length, 0);
});
test("unknown request remains exact after independently observed same-subject case, then explicit replay reconciles", async () => {
  const f = fixture(),
    c = f.flow();
  f.fault("after-hidden");
  await assert.rejects(c.openCase());
  const original = c.caseOpeningText();
  assert.equal(c.owner.value.case_id, caseId);
  assert.equal(c.caseOpening.value.state, "unconfirmed");
  await c.connectPersonal();
  assert.equal(c.caseOpeningText(), original);
  await c.openCase();
  assert.equal(opens(f).length, 1);
  assert.equal(c.caseOpening.value.state, "unconfirmed");
  f.fault("");
  await c.openCase(true);
  assert.equal(c.caseOpening.value.state, "recorded");
  assert.equal(f.journal.length, 1);
  assert.deepEqual(opens(f)[0].options.body, opens(f)[1].options.body);
});
test("lost committed response is reconciled only by matching owned journal", async () => {
  const f = fixture(),
    c = f.flow();
  f.fault("after");
  await c.openCase();
  assert.equal(c.caseOpening.value.state, "recorded");
  assert.equal(f.journal.length, 1);
  assert.equal(opens(f).length, 1);
});
test("unknown absent outcome blocks a different command and exact recovery survives fresh storage", async () => {
  const f = fixture(),
    c = f.flow();
  f.fault("before");
  await assert.rejects(c.openCase());
  const saved = c.caseOpeningText();
  await assert.rejects(c.openCase(), /pending_request/);
  assert.equal(opens(f).length, 1);
  const fresh = fixture(),
    d = fresh.flow();
  await d.importCaseOpening(saved);
  assert.equal(opens(fresh).length, 0);
  assert.equal(d.caseOpening.value.state, "unconfirmed");
  await d.openCase(true);
  assert.deepEqual(opens(fresh)[0].options.body, JSON.parse(saved).body);
  assert.equal(d.caseOpening.value.state, "recorded");
});
test("successful reply plus unavailable post-read retains original receipt without binding or claiming confirmation", async () => {
  const f = fixture(),
    c = f.flow();
  f.fault("post503");
  await assert.rejects(c.openCase());
  assert.equal(c.owner.value, null);
  assert.equal(c.caseOpening.value.state, "unconfirmed");
  assert.deepEqual(c.caseOpening.value.receipt, receipt);
  f.fault("");
  await c.connectPersonal();
  assert.equal(c.caseOpening.value.state, "recorded");
  assert.equal(opens(f).length, 1);
});
test("reply/current-case mismatch is unavailable and does not bind", async () => {
  const f = fixture(),
    c = f.flow();
  f.fault("post-other");
  await assert.rejects(c.openCase(), /owner_changed|invalid_response/);
  assert.equal(c.owner.value, null);
  assert.equal(c.caseOpening.value.state, "unconfirmed");
  assert.deepEqual(c.caseOpening.value.receipt, receipt);
});
test("exact journal requires command, actor, kind, request, case and immutable result", async () => {
  for (const change of [
    (r) => (r.actor = other),
    (r) => (r.kind = "access"),
    (r) => (r.request = { command_id: command, case_id: caseId }),
    (r) => (r.case_id = other),
    (r) => (r.result = { ...receipt, case_id: other }),
    (r) => (r.result = { ...receipt, status: "complete" }),
  ]) {
    const f = fixture(),
      c = f.flow(),
      record = recovery(),
      row = {
        command_id: command,
        actor: subject,
        kind: "open",
        request: { ...record.body },
        case_id: caseId,
        result: { ...receipt },
      };
    change(row);
    f.set(present([row]));
    await assert.rejects(c.importCaseOpening(JSON.stringify(record)));
    assert.equal(c.owner.value, null);
    assert.equal(c.caseOpening.value.state, "unconfirmed");
    assert.equal(opens(f).length, 0);
  }
  const f = fixture(),
    c = f.flow();
  f.set(
    present([
      {
        command_id: other,
        actor: subject,
        kind: "open",
        request: { command_id: other },
        case_id: caseId,
        result: receipt,
      },
    ])
  );
  await c.importCaseOpening(JSON.stringify(recovery()));
  assert.equal(c.owner.value.subject, subject);
  assert.equal(c.caseOpening.value.state, "unconfirmed");
});
test("imported recorded status is not evidence; older file preserves original receipt and rejects altered history", async () => {
  const f = fixture(),
    c = f.flow(),
    r = { ...recovery(), state: "recorded", receipt };
  f.set(present());
  await c.importCaseOpening(JSON.stringify(r));
  assert.equal(c.caseOpening.value.state, "unconfirmed");
  await c.importCaseOpening(JSON.stringify(recovery()));
  assert.deepEqual(c.caseOpening.value.receipt, receipt);
  for (const bad of [
    { ...r, subject: other },
    { ...r, receipt: { ...receipt, case_id: other } },
    { ...r, body: { command_id: other } },
    { ...r, body: { command_id: command, case_id: caseId } },
    { ...r, operation: "access" },
  ])
    await assert.rejects(c.importCaseOpening(JSON.stringify(bad)));
  assert.equal(opens(f).length, 0);
});
test("storage failure before creation or import cannot dispatch or publish unsaved evidence", async () => {
  for (const importing of [false, true]) {
    const f = fixture(),
      c = f.flow();
    f.storageFail(true);
    await assert.rejects(
      importing ? c.importCaseOpening(JSON.stringify(recovery())) : c.openCase()
    );
    assert.equal(opens(f).length, 0);
    assert.equal(c.caseOpening.value, null);
    assert.equal(f.data.size, 0);
  }
});
test("pre-binding 401 preserves the original request while invalidating local authority; 503 does not mean refusal", async () => {
  for (const status of ["401", "export503"]) {
    const f = fixture(),
      c = f.flow();
    f.fault("before");
    await assert.rejects(c.openCase());
    const original = c.caseOpeningText();
    f.fault(status);
    await assert.rejects(c.connectPersonal());
    assert.equal(c.owner.value, null);
    assert.equal(c.caseOpeningText(), original);
    assert.equal(c.openingProofUnavailable.value, status === "401");
    assert.equal(c.caseOpening.value.state, "unconfirmed");
    assert.equal(opens(f).length, 1);
  }
});
for (const edge of [
  "identity",
  "ambient",
  "proof-secret",
  "proof-subject",
  "dispose",
  "newer-read",
])
  test(`held export cannot publish after ${edge} changes`, async () => {
    const f = fixture(),
      c = f.flow(),
      held = defer();
    let once = true;
    f.hook(async () => {
      if (once) {
        once = false;
        await held.promise;
      }
    });
    const p = c.connectPersonal();
    if (edge === "identity") f.identity();
    if (edge === "ambient") f.ambient();
    if (edge === "proof-secret") f.proof({ kind: "moderation", subject, secret: "new-proof" });
    if (edge === "proof-subject")
      f.proof({ kind: "moderation", subject: other, secret: "synthetic-rights-proof" });
    if (edge === "dispose") c.dispose();
    if (edge === "newer-read") {
      f.set(present());
      await c.connectPersonal();
    }
    const data = [...f.data];
    held.resolve();
    await assert.rejects(p, /stale_view/);
    assert.equal(c.canOpenCase.value, false);
    assert.equal(c.owner.value?.subject, edge === "newer-read" ? subject : undefined);
    assert.deepEqual([...f.data], data);
    assert.equal(opens(f).length, 0);
  });
test("held mutation reply after proof change leaves original pending bytes and no binding", async () => {
  const f = fixture(),
    c = f.flow(),
    held = defer(),
    entered = defer();
  f.hook(async (path) => {
    if (path.endsWith("/open")) {
      entered.resolve();
      await held.promise;
    }
  });
  const p = c.openCase();
  await entered.promise;
  const before = f.data.get(storageKey);
  f.proof({ kind: "moderation", subject, secret: "new-proof" });
  held.resolve();
  await assert.rejects(p, /stale_view/);
  assert.equal(c.owner.value, null);
  assert.equal(f.data.get(storageKey), before);
  assert.equal(c.caseOpening.value.state, "unconfirmed");
});

for (const language of ["en-US", "de"])
  test(`mounted ${language} personal check requires an explicit opening, exposes optional recovery and preserves separate key choice`, async () => {
    const f = fixture(),
      messages = JSON.parse(
        await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")
      );
    const values = {
      ...Vue,
      sessionStorage: f.options.storage,
      moderationAmbientIdentity: f.options.ambient,
      $fetch: f.options.fetch,
      useRuntimeConfig: () => ({ public: { BASE_API_URL: "https://synthetic.invalid" } }),
      Document: class {},
      ShadowRoot: class {},
      document: { activeElement: null, createElement: () => ({ click() {} }) },
    };
    await globals(values, async () => {
      const ui = host(),
        props = reactive({ identity: "view", personalProof: f.options.personalProof });
      const app = ui.renderer.createApp({ render: () => h(panel, props) });
      app.use(createI18n({ legacy: false, locale: language, messages: { [language]: messages } }));
      app.component("NuxtLink", {
        setup:
          (_p, { slots }) =>
          () =>
            h("a", slots.default?.()),
      });
      for (const child of ["CommercialStatus", "LearningAccess"])
        app.component(child, { render: () => null });
      app.mount(ui.root);
      const button = (label) =>
        ui.all().find((n) => n.type === "button" && ui.text(n).trim() === label);
      try {
        await flush();
        assert(!button(messages.CaseOpen.Open));
        assert.equal(opens(f).length, 0);
        await button(messages.ClaimAccess.UseProof).props.onClick();
        await flush();
        assert(button(messages.CaseOpen.Open));
        assert.equal(button(messages.CaseOpen.Open).props.disabled, false);
        assert.equal(
          ui.all().filter((n) => n.props.type === "checkbox").length,
          0,
          "no secret-backup acknowledgment is required for opening"
        );
        f.fault("after-hidden");
        await button(messages.CaseOpen.Open).props.onClick();
        await flush();
        assert.match(
          ui.text(),
          new RegExp(messages.CaseOpen.State.unconfirmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        );
        assert(
          button(messages.ClaimAccess.Prepare),
          "current independently owned case stays usable"
        );
        assert(button(messages.CaseOpen.Retry));
        assert(button(messages.CaseOpen.Save));
        assert.equal(opens(f).length, 1);
        const exact = JSON.parse(f.data.get(storageKey))[0].record.body;
        f.fault("");
        await button(messages.CaseOpen.Retry).props.onClick();
        await flush();
        assert(ui.text().includes(messages.CaseOpen.State.recorded));
        assert.equal(f.journal.length, 1);
        assert.deepEqual(opens(f)[1].options.body, exact);
        const input = ui.all().find((n) => n.props.id === "commercial-case-opening-recovery");
        assert(input);
        input.props["onUpdate:modelValue"](JSON.stringify(recovery()));
        f.identity();
        props.identity = "other-view";
        await flush();
        assert(!ui.text().includes(exact.command_id));
        assert.equal(input.props.value ?? "", "");
        assert(f.data.has(storageKey));
      } finally {
        app.unmount();
      }
    });
  });
