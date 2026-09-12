import { fixtureFetch } from "./helpers/commercial-fetch.mjs";
// Local synthetic contracts and actual mounted components; no backend/services.
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import * as Vue from "vue";
import { createI18n } from "vue-i18n";
import { parse, compileScript } from "@vue/compiler-sfc";
import {
  createOriginalDocuments,
  originalInventory,
  originalDocumentPath,
  originalPurchaseStatus,
  originalVariants,
} from "../composables/originalDocuments.ts";
const stage = await mkdtemp(join(tmpdir(), "original-documents-tests-"));
after(() => rm(stage, { recursive: true, force: true }));
async function compile(relative, replacements = {}) {
  let source = await readFile(
    relative === "../components/CommercialStatus.vue" && process.env.ORIGINAL_STATEMENT_SOURCE
      ? process.env.ORIGINAL_STATEMENT_SOURCE
      : new URL(relative, import.meta.url),
    "utf8"
  );
  if (relative.endsWith(".vue"))
    source = compileScript(parse(source).descriptor, {
      id: relative,
      inlineTemplate: true,
    }).content;
  for (const [a, b] of Object.entries(replacements)) source = source.replaceAll(a, b);
  let code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const dep of ["vue", "vue-i18n"])
    code = code.replace(
      new RegExp(`from ["']${dep}["']`, "g"),
      `from ${JSON.stringify(import.meta.resolve(dep))}`
    );
  code = code.replace(
    /from "(\.\.?\/composables\/[^"\n]+|\.\/commercialStatus)"/g,
    (_s, p) =>
      `from ${JSON.stringify(new URL(p.startsWith("./") ? "../composables/commercialStatus.ts" : p + ".ts", import.meta.url).href)}`
  );
  const path = join(stage, relative.replaceAll(/[^a-z0-9]/gi, "_") + ".mjs");
  await writeFile(path, code);
  return import(pathToFileURL(path));
}
const { createCommercialAccess } = await compile("../composables/commercialAccess.ts");
const { useModeration } = await compile("../composables/moderation.ts", {
  "import.meta.client": "true",
});
const Panel = (await compile("../components/OriginalDocuments.vue")).default;
const Statement = (await compile("../components/CommercialStatus.vue")).default;
const adapter = pathToFileURL(join(stage, "___composables_commercialAccess_ts.mjs")).href;
const Parent = (
  await compile("../components/CommercialAccess.vue", {
    'from "../composables/commercialAccess"': `from ${JSON.stringify(adapter)}`,
  })
).default;

const A = "11000000-0000-4000-8000-000000000001",
  S = "11000000-0000-4000-8000-000000000002",
  B = "11000000-0000-4000-8000-000000000003",
  O = "22000000-0000-4000-8000-000000000001",
  C = "33000000-0000-4000-8000-000000000001";
const when = "2026-09-10T10:00:00Z";
const http = (n) => Object.assign(Error("synthetic"), { response: { status: n } });
const defer = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const clone = (v) => structuredClone(v);
function inventory() {
  return {
    protocol: 1,
    claimant_subject: A,
    observed_at: when,
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
      {
        family: "finance",
        kind: "invoice",
        source_service: "backend",
        source_subject: A,
        owner_relation: "claimant",
        purchase_source: null,
        offer_id: null,
        printed_number: "R10000000",
        record_basis: "own_invoice_reference",
        reader_state: "candidate",
        reason: null,
        selector: { kind: "invoice", id: "10000000", variant: "original" },
        artifacts: [
          {
            variant: "original",
            selection_source: "database_original",
            observation: "nonempty",
            reader_state: "candidate",
            reason: null,
            selector: { kind: "invoice", id: "10000000", variant: "original" },
          },
        ],
      },
    ],
  };
}
function status() {
  return {
    offer: {
      id: O,
      user_id: S,
      source: "skills",
      created_at: when,
      expires_at: when,
      recipient: "original synthetic recipient",
      product: {
        kind: "course",
        reference: "original-course",
        title: "Original course",
        description: "Original description",
        coins: 3,
        facts: { access: "original" },
        revision: "original",
        service_starts_at: null,
      },
      document_hash: "stored-documents",
      hash: "stored-offer",
      text: "<img src=x onerror=bad()> original offer",
      declaration: "Original declaration",
    },
    state: "fulfilled",
    accepted_at: when,
    confirmation_smtp_accepted_at: null,
    fulfillment: { kind: "course_access_provided" },
    financial_evidence: null,
    review_reason: null,
    provision_deadline: null,
    provision_timing: null,
    document_corrections: [],
  };
}
function fixture() {
  let proof = "a".repeat(43),
    identity = "one",
    invalidations = 0,
    answer = inventory(),
    handler = null;
  const calls = [],
    deliveries = [],
    revokes = [];
  const capture = () => {
    const secret = proof,
      owner = identity;
    return {
      kind: "claim",
      secret,
      subject: A,
      current: () => secret === proof && owner === identity,
      invalidate() {
        if (secret === proof && owner === identity) {
          invalidations++;
          proof = null;
        }
      },
    };
  };
  const client = createOriginalDocuments({
    capture,
    identity: () => identity,
    fetch: async (path, options) => {
      calls.push({ path, options: clone(options) });
      return handler ? handler(path, options) : clone(path.endsWith("/status") ? status() : answer);
    },
    deliver: (blob, pick) => deliveries.push({ blob, pick }),
    revoke: () => revokes.push(true),
  });
  return {
    client,
    capture,
    calls,
    deliveries,
    revokes,
    set handler(v) {
      handler = v;
    },
    set answer(v) {
      answer = v;
    },
    set proof(v) {
      proof = v;
    },
    set identity(v) {
      identity = v;
    },
    get invalidations() {
      return invalidations;
    },
  };
}
async function selected(f) {
  await f.client.load();
  f.client.choose(f.client.inventory.value.records[0]);
  f.client.chooseArtifact(f.client.selected.value.artifacts[0]);
}

test("fixed inventory schema keeps exact long identifiers, seven independent artifacts and variable historical completeness", () => {
  const v = inventory();
  v.scope.historical_owner_inventory_complete = false;
  const i = originalInventory(v, A);
  assert.equal(i.records[0].selector, null);
  assert.equal(i.records[0].artifacts.length, 7);
  assert.equal(i.records[1].selector.id, "10000000");
  for (const [pick, path] of [
    [
      { kind: "final-statement", id: "18446744073709551615", variant: "original" },
      "final-statement/18446744073709551615/original",
    ],
    [{ kind: "credit-note", id: "10000", variant: "1" }, "credit-note/10000/1"],
  ])
    assert(originalDocumentPath(pick).endsWith(path));
});
for (const [name, change] of [
  ["wrong claimant", (v) => (v.claimant_subject = B)],
  ["missing records", (v) => delete v.records],
  ["remote scope", (v) => (v.scope.remote_sources_queried = true)],
  ["fictional scope", (v) => (v.scope.finance = "all")],
  ["incomplete successful enumeration", (v) => (v.scope.known_local_enumeration_complete = false)],
  ["malformed historical flag", (v) => (v.scope.historical_owner_inventory_complete = null)],
  [
    "purchase default selector",
    (v) => (v.records[0].selector = v.records[0].artifacts[0].selector),
  ],
  ["wrong S relation", (v) => (v.records[0].owner_relation = "claimant")],
  ["artifact retarget", (v) => (v.records[0].artifacts[0].selector.id = B)],
  ["missing artifact", (v) => v.records[0].artifacts.pop()],
  ["duplicate artifact", (v) => (v.records[0].artifacts[0] = v.records[0].artifacts[1])],
  ["rounded selector", (v) => (v.records[1].selector.id = 10000000)],
  ["wrong printed original", (v) => (v.records[1].printed_number = "R1000000")],
  ["noninvoice family", (v) => (v.records[1].kind = "other")],
])
  test(`rejects ${name} without converting it to empty or download authority`, () => {
    const v = inventory();
    change(v);
    assert.throws(() => originalInventory(v, A));
  });
test("known unavailable and archive-unchecked records retain their precise null selectors and limits", () => {
  const v = inventory(),
    p = v.records[0],
    f = v.records[1];
  p.reader_state = "unavailable";
  p.reason = "missing_progress";
  p.artifacts.forEach((a) => {
    a.reader_state = "unavailable";
    a.reason = "missing_progress";
    a.selector = null;
  });
  f.reader_state = f.artifacts[0].reader_state = "archive_unchecked";
  f.artifacts[0].observation = "unchecked";
  f.artifacts[0].selection_source = "archive_unchecked";
  assert.equal(originalInventory(v, A).records[0].artifacts[0].selector, null);
  f.reader_state = f.artifacts[0].reader_state = "unavailable";
  f.reason = f.artifacts[0].reason = "identity_pending_review";
  f.selector = f.artifacts[0].selector = null;
  assert.equal(originalInventory(v, A).records[1].reason, "identity_pending_review");
});
test("fixed GET transport never posts or sends a second credential; original S status matches all selected facts", async () => {
  const f = fixture();
  await selected(f);
  await f.client.loadStatus();
  assert.equal(f.client.status.value.offer.user_id, S);
  f.handler = () => new Blob(["%PDF exact"], { type: "application/pdf" });
  await f.client.download();
  assert.equal(await f.deliveries[0].blob.text(), "%PDF exact");
  assert.deepEqual(
    f.calls.map((c) => c.path),
    [
      "/shop/claims/documents",
      `/shop/claims/purchases/${O}/status`,
      `/shop/claims/documents/purchase/${O}/terms`,
    ]
  );
  for (const { options: o } of f.calls) {
    assert.equal(o.method, "GET");
    assert.equal(o.body, undefined);
    assert.equal(o.credentials, "omit");
    assert.equal(o.retry, 0);
    assert.equal(o.timeout, 20000);
    assert.deepEqual(Object.keys(o.headers), ["x-commercial-claim-key"]);
  }
});
test("status parser preserves nullable observations and old absent window without deriving new terms", () => {
  const s = status(),
    selection = { offer_id: O, source_subject: S, purchase_source: "skills" };
  const p = originalPurchaseStatus(s, selection);
  assert.equal(p.offer.provision_window_seconds, null);
  assert.equal(p.financial_evidence, null);
  s.offer.product.coins = 9007199254740992;
  assert.equal(originalPurchaseStatus(s, selection).offer.product.coins, null);
  for (const mutate of [
    (v) => (v.offer.user_id = A),
    (v) => (v.offer.source = "events"),
    (v) => (v.offer.id = B),
    (v) => delete v.provision_deadline,
    (v) => (v.document_corrections = null),
    (v) => (v.state = "active"),
  ]) {
    const v = status();
    mutate(v);
    assert.throws(() => originalPurchaseStatus(v, selection));
  }
});
test("known UUID status recovery works after inventory503; failure does not fabricate status or invalidate proof", async () => {
  const f = fixture();
  f.handler = (path) => {
    if (!path.endsWith("/status")) throw http(503);
    return status();
  };
  await f.client.load();
  assert.equal(f.client.state.value, "error");
  f.client.chooseOrder(O);
  await f.client.loadStatus();
  assert.equal(f.client.status.value.offer.id, O);
  assert.equal(f.invalidations, 0);
});
test("manual selection of an inventoried UUID still binds original source and S", async () => {
  const f = fixture();
  await f.client.load();
  f.client.chooseOrder(O);
  f.handler = () => ({ ...status(), offer: { ...status().offer, user_id: A } });
  await f.client.loadStatus();
  assert.equal(f.client.status.value, null);
  assert.equal(f.client.statusState.value, "error");
});
for (const error of [404, 503])
  test(`document ${error} preserves personal proof and does not select fallback`, async () => {
    const f = fixture();
    await selected(f);
    f.handler = () => {
      throw http(error);
    };
    await f.client.download();
    assert.equal(f.client.downloadState.value, "error");
    assert.equal(f.invalidations, 0);
    assert.equal(f.deliveries.length, 0);
    assert.equal(f.calls.length, 2);
  });
for (const [label, blob] of [
  ["empty", new Blob([], { type: "application/pdf" })],
  ["wrong MIME", new Blob(["%PDF"], { type: "text/html" })],
])
  test(`${label} document is not downloaded`, async () => {
    const f = fixture();
    await selected(f);
    f.handler = () => blob;
    await f.client.download();
    assert.equal(f.deliveries.length, 0);
    assert.equal(f.client.downloadState.value, "error");
  });
test("plain-text confirmation preserves exact bytes and selected name", async () => {
  const f = fixture();
  await selected(f);
  f.client.chooseArtifact(f.client.selected.value.artifacts[2]);
  f.handler = () => new Blob(["original\r\nconfirmation"], { type: "text/plain;charset=utf-8" });
  await f.client.download();
  assert.equal(await f.deliveries[0].blob.text(), "original\r\nconfirmation");
  assert.equal(f.deliveries[0].pick.variant, "confirmation");
});
test("away-and-back artifact selection and direct tuple mutation suppress late bytes", async () => {
  for (const direct of [false, true]) {
    const f = fixture();
    await selected(f);
    const d = defer();
    f.handler = () => d.promise;
    const pending = f.client.download();
    if (direct) f.client.selected.value.source_subject = B;
    else {
      const a = f.client.artifact.value;
      f.client.chooseArtifact(null);
      f.client.chooseArtifact(a);
    }
    d.resolve(new Blob(["%PDF"], { type: "application/pdf" }));
    await pending;
    assert.equal(f.deliveries.length, 0);
  }
});
test("away-and-back order, proof replacement, disposal and late inventory cannot populate current results", async () => {
  const f = fixture();
  await selected(f);
  const d = defer();
  f.handler = () => d.promise;
  const pending = f.client.loadStatus();
  f.client.chooseOrder(B);
  f.client.chooseOrder(O);
  d.resolve(status());
  await pending;
  assert.equal(f.client.status.value, null);
  const old = defer();
  f.handler = () => old.promise;
  const load = f.client.load();
  f.proof = "b".repeat(43);
  old.resolve(inventory());
  await load;
  assert.equal(f.client.inventory.value, null);
  f.handler = () => inventory();
  await f.client.load();
  f.client.choose(f.client.inventory.value.records[0]);
  const late = defer();
  f.handler = () => late.promise;
  const lateStatus = f.client.loadStatus();
  f.client.dispose();
  late.resolve(status());
  await lateStatus;
  assert.equal(f.client.status.value, null);
});
test("same-proof held401 invalidates parent even after selection changes, but replaced-proof401 cannot", async () => {
  for (const replacement of [false, true]) {
    const f = fixture();
    await selected(f);
    const d = defer();
    f.handler = () => d.promise;
    const pending = f.client.download();
    f.client.chooseArtifact(null);
    if (replacement) f.proof = "b".repeat(43);
    d.reject(http(401));
    await pending;
    assert.equal(f.invalidations, replacement ? 0 : 1);
    if (!replacement) assert.equal(f.client.inventory.value, null);
  }
});

test("actual commercial read hook supports no-case capability without POST/storage/binding and current401 preserves opening bytes", async () => {
  const rows = new Map([["commercial-case-opening-v1", "saved exact unresolved opening"]]);
  const before = clone([...rows]);
  let cap = "capability",
    invalidated = 0;
  const options = {
    storage: { getItem: (k) => rows.get(k) ?? null, setItem: (k, v) => rows.set(k, v) },
    identity: () => "one",
    ambient: () => "ambient",
    personalProof: () => ({ kind: "moderation", subject: A, secret: cap }),
    personalReadContext: () => {
      const secret = cap;
      return {
        kind: "moderation",
        subject: A,
        secret,
        current: () => secret === cap,
        invalidate() {
          invalidated++;
          cap = null;
        },
      };
    },
    fetch: () => {
      throw Error("unexpected mutation transport");
    },
  };
  const parent = createCommercialAccess(options);
  let fail = false;
  const child = createOriginalDocuments({
    capture: parent.originalReadContext,
    identity: () => String(parent.generation.value),
    fetch: async () => {
      if (fail) throw http(401);
      return inventory();
    },
    deliver() {},
    revoke() {},
  });
  await child.load();
  assert.equal(child.inventory.value.claimant_subject, A);
  assert.equal(parent.owner.value, null);
  assert.deepEqual([...rows], before);
  fail = true;
  await child.load();
  assert.equal(invalidated, 1);
  assert.equal(parent.originalReadContext(), null);
  assert.deepEqual([...rows], before);
});
test("actual bound claim invalidation clears owner and pending view while exact stored rotation survives; stale proof cannot clear replacement", async () => {
  const rows = new Map();
  const options = {
    storage: { getItem: (k) => rows.get(k) ?? null, setItem: (k, v) => rows.set(k, v) },
    identity: () => "one",
    ambient: () => "ambient",
    personalProof: () => null,
    fetch: async () => ({ case: { id: C, subject: A, access_epoch: 1 } }),
  };
  const parent = createCommercialAccess(options);
  await parent.connectKey("a".repeat(43));
  await parent.prepare();
  const before = rows.get("commercial-access-rotations-v1");
  const old = parent.originalReadContext();
  await parent.connectKey("b".repeat(43));
  old.invalidate();
  assert(parent.owner.value);
  parent.originalReadContext().invalidate();
  assert.equal(parent.owner.value, null);
  assert.equal(rows.get("commercial-access-rotations-v1"), before);
});

function globals(values) {
  const previous = new Map(
    Object.keys(values).map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)])
  );
  if (values.$fetch) values = { ...values, $fetch: fixtureFetch(values.$fetch) };
  Object.assign(globalThis, values);
  return () => {
    for (const [k, v] of previous)
      if (v) Object.defineProperty(globalThis, k, v);
      else delete globalThis[k];
  };
}
test("actual moderation capture distinguishes rights capability and explicit ordinary token; same token current401 clears, stale token cannot", () => {
  const states = new Map(),
    rows = new Map();
  let token = "token1";
  const scope = Vue.effectScope();
  const restore = globals({
    useState: (k, f) => {
      if (!states.has(k)) states.set(k, Vue.ref(f()));
      return states.get(k);
    },
    computed: Vue.computed,
    onScopeDispose: Vue.onScopeDispose,
    sessionStorage: {
      getItem: (k) => rows.get(k) ?? null,
      setItem: (k, v) => rows.set(k, v),
      removeItem: (k) => rows.delete(k),
    },
    useUser: () => Vue.ref({ id: A }),
    getAccessToken: () => token,
  });
  try {
    const m = scope.run(() => useModeration());
    m.commercialPersonalProof();
    m.scope.value = "rights";
    m.recipient.value = A;
    assert.equal(m.commercialOriginalRead(), null);
    const old = m.commercialOrdinaryRead();
    assert(old.current());
    token = "token2";
    old.invalidate();
    assert.equal(m.recipient.value, A);
    const current = m.commercialOrdinaryRead();
    current.invalidate();
    assert.equal(m.recipient.value, "");
    assert.equal(token, "token2");
    m.install("c".repeat(43));
    m.scope.value = "rights";
    m.recipient.value = A;
    assert.equal(m.commercialOrdinaryRead(), null);
    const cap = m.commercialOriginalRead();
    assert.equal(cap.kind, "moderation");
    cap.invalidate();
    assert.equal(m.scope.value, "");
    assert.equal(rows.has("moderation-recipient-access"), false);
  } finally {
    scope.stop();
    restore();
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
    createText: (t) => node("text", t),
    createComment: (t) => node("comment", t),
    setText: (n, t) => (n.text = t),
    setElementText: (n, t) => {
      n.text = t;
      n.children = [];
    },
    patchProp: (n, k, _o, v) => (n.props[k] = v),
    insert: (n, p, a = null) => {
      detach(n);
      n.parent = p;
      p.children.splice(a ? p.children.indexOf(a) : p.children.length, 0, n);
    },
    remove: detach,
    parentNode: (n) => n.parent,
    nextSibling: (n) => n.parent?.children[n.parent.children.indexOf(n) + 1],
  });
  const root = node("root");
  const all = (n = root) => [n, ...n.children.flatMap(all)];
  const text = (n = root) =>
    [n.type === "comment" ? "" : n.text, ...n.children.map(text)].join(" ");
  return { renderer, root, all, text };
}
const messages = Object.fromEntries(
  await Promise.all(
    ["en-US", "de"].map(async (l) => [
      l,
      JSON.parse(await readFile(new URL(`../locales/${l}.json`, import.meta.url), "utf8")),
    ])
  )
);
const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
    await Vue.nextTick();
  }
};
for (const lang of ["en-US", "de"])
  test(`mounted originals ${lang}: no auto read, unavailable selector, order reference, escaped text and URL disposal`, async () => {
    const f = fixture(),
      h = host(),
      downloaded = [],
      created = [],
      revoked = [];
    let reply = inventory();
    reply.records[0].artifacts[1] = {
      ...reply.records[0].artifacts[1],
      reader_state: "unavailable",
      reason: "empty_selected_artifact",
      selector: null,
      observation: "empty",
    };
    const create = URL.createObjectURL,
      revoke = URL.revokeObjectURL;
    URL.createObjectURL = (blob) => {
      created.push(blob);
      return "blob:synthetic";
    };
    URL.revokeObjectURL = (url) => revoked.push(url);
    const restore = globals({
      Document: class {},
      ShadowRoot: class {},
      document: {
        activeElement: null,
        createElement: () => ({
          click() {
            downloaded.push(this.download);
          },
        }),
      },
      $fetch: async (path) =>
        path.endsWith("/status")
          ? status()
          : path === "/shop/claims/documents"
            ? reply
            : new Blob(["%PDF exact"], { type: "application/pdf" }),
      useRuntimeConfig: () => ({ public: { BASE_API_URL: "http://synthetic.invalid" } }),
    });
    const props = Vue.reactive({ identity: "one", capture: f.capture, ordinaryAvailable: false });
    const app = h.renderer.createApp({ render: () => Vue.h(Panel, { ...props }) });
    app.use(createI18n({ legacy: false, locale: lang, messages }));
    app.mount(h.root);
    try {
      assert.equal(f.calls.length, 0);
      const button = (k) =>
        h
          .all()
          .find((n) => n.type === "button" && h.text(n).trim() === messages[lang].Originals[k]);
      await button("Load").props.onClick();
      await flush();
      h.all()
        .find((n) => n.props.id === "original-document-record")
        .props.onChange({ target: { value: "0" } });
      await flush();
      const select = () => h.all().find((n) => n.props.id === "original-document-artifact");
      select().props.onChange({ target: { value: "withdrawal" } });
      await flush();
      assert.equal(button("Download").props.disabled, true);
      select().props.onChange({ target: { value: "terms" } });
      await flush();
      await button("Download").props.onClick();
      await flush();
      assert.equal(await created[0].text(), "%PDF exact");
      assert(downloaded[0].includes(O + "-terms.pdf"));
      await h
        .all()
        .find((n) => n.type === "form")
        .props.onSubmit({ preventDefault() {} });
      await flush();
      assert(!h.text().includes(S));
      assert(h.text().includes(O));
      assert(h.text().includes("<img src=x onerror=bad()> original offer"));
      assert.equal(h.all().filter((n) => n.type === "img").length, 0);
      props.identity = "two";
      await flush();
      assert(revoked.includes("blob:synthetic"));
      assert(!h.text().includes("Original course"));
    } finally {
      app.unmount();
      restore();
      URL.createObjectURL = create;
      URL.revokeObjectURL = revoke;
    }
  });
test("actual statement number away-and-back suppresses held original Blob", async () => {
  const h = host(),
    held = defer(),
    downloaded = [];
  const restore = globals({
    Document: class {},
    ShadowRoot: class {},
    document: {
      activeElement: null,
      createElement: () => ({
        click() {
          downloaded.push(this.download);
        },
      }),
    },
  });
  const app = h.renderer.createApp({
    render: () =>
      Vue.h(Statement, { identity: "one", read: async () => ({}), original: () => held.promise }),
  });
  app.use(createI18n({ legacy: false, locale: "en-US", messages }));
  app.mount(h.root);
  try {
    const input = () => h.all().find((n) => n.type === "input");
    input().props["onUpdate:modelValue"]("S1");
    await flush();
    const btn = h
      .all()
      .find((n) => n.type === "button" && h.text(n).includes(messages["en-US"].Claims.Download));
    assert(btn);
    const pending = h
      .all()
      .find((n) => n.type === "form")
      .props.onSubmit({ preventDefault() {} });
    input().props["onUpdate:modelValue"]("S2");
    input().props["onUpdate:modelValue"]("S1");
    held.resolve(new Blob(["%PDF late"], { type: "application/pdf" }));
    await pending;
    await flush();
    assert.equal(downloaded.length, 0);
  } finally {
    app.unmount();
    restore();
  }
});

test("mounted proof-only reactive token replacement clears original views without changing parent identity", async () => {
  const h = host(),
    token = Vue.ref("first");
  const restore = globals({
    Document: class {},
    ShadowRoot: class {},
    document: { activeElement: null },
    useRuntimeConfig: () => ({ public: { BASE_API_URL: "http://synthetic.invalid" } }),
    $fetch: async () => inventory(),
  });
  const capture = () => {
    const secret = token.value;
    return {
      kind: "ordinary",
      secret,
      subject: A,
      current: () => token.value === secret,
      invalidate() {},
    };
  };
  const app = h.renderer.createApp({
    render: () => Vue.h(Panel, { identity: "same-owner", capture }),
  });
  app.use(createI18n({ legacy: false, locale: "en-US", messages }));
  app.mount(h.root);
  try {
    await h
      .all()
      .find((n) => n.type === "button" && h.text(n).trim() === messages["en-US"].Originals.Load)
      .props.onClick();
    await flush();
    assert(h.all().some((n) => n.props.id === "original-document-record"));
    token.value = "replacement";
    await flush();
    assert(!h.all().some((n) => n.props.id === "original-document-record"));
  } finally {
    app.unmount();
    restore();
  }
});

test("mounted commercial parent propagates same-proof held401 after selection change and preserves saved rotation", async () => {
  const h = host(),
    rows = new Map(),
    held = defer();
  let wait = false;
  const restore = globals({
    Document: class {},
    ShadowRoot: class {},
    document: { activeElement: null },
    moderationAmbientIdentity: () => "ambient",
    sessionStorage: { getItem: (k) => rows.get(k) ?? null, setItem: (k, v) => rows.set(k, v) },
    useRuntimeConfig: () => ({ public: { BASE_API_URL: "http://synthetic.invalid" } }),
    $fetch: async (path) =>
      path.endsWith("/export")
        ? { case: { id: C, subject: A, access_epoch: 1 } }
        : wait
          ? held.promise
          : inventory(),
  });
  const app = h.renderer.createApp({
    render: () => Vue.h(Parent, { identity: "one", personalProof: () => null, showRecords: false }),
  });
  app.component("OriginalDocuments", Panel);
  app.component("LearningAccess", {
    render: () => Vue.h("aside", { "data-learning-mounted": "yes" }, "existing learning view"),
  });
  app.component("CommercialStatus", { render: () => null });
  app.use(createI18n({ legacy: false, locale: "en-US", messages }));
  app.mount(h.root);
  try {
    await flush();
    h.all()
      .find((n) => n.props.id === "commercial-current-key")
      .props["onUpdate:modelValue"]("a".repeat(43));
    await flush();
    await h
      .all()
      .find(
        (n) => n.type === "form" && n.children.some((c) => c.props?.id === "commercial-current-key")
      )
      .props.onSubmit({ preventDefault() {} });
    await flush();
    assert(h.all().some((n) => n.props["data-learning-mounted"]));
    const click = async (key) => {
      await h
        .all()
        .find((n) => n.type === "button" && h.text(n).trim() === key)
        .props.onClick();
      await flush();
    };
    await click(messages["en-US"].Originals.Load);
    await click(messages["en-US"].ClaimAccess.Prepare);
    const saved = rows.get("commercial-access-rotations-v1");
    assert(saved);
    h.all()
      .find((n) => n.props.id === "original-document-record")
      .props.onChange({ target: { value: "0" } });
    await flush();
    h.all()
      .find((n) => n.props.id === "original-document-artifact")
      .props.onChange({ target: { value: "terms" } });
    await flush();
    wait = true;
    const request = h
      .all()
      .find((n) => n.type === "button" && h.text(n).trim() === messages["en-US"].Originals.Download)
      .props.onClick();
    h.all()
      .find((n) => n.props.id === "original-document-artifact")
      .props.onChange({ target: { value: "confirmation" } });
    held.reject(http(401));
    await request;
    await flush();
    assert(!h.all().some((n) => n.props["data-learning-mounted"]));
    assert.equal(rows.get("commercial-access-rotations-v1"), saved);
    assert(!h.all().some((n) => n.props.id === "original-document-record"));
  } finally {
    app.unmount();
    restore();
  }
});
