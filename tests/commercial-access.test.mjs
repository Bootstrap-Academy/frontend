import { fixtureFetch } from "./helpers/commercial-fetch.mjs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const dir = await mkdtemp(join(tmpdir(), "l3-commercial-access-"));
after(() => rm(dir, { recursive: true, force: true }));
async function moduleFrom(relative, replacements = {}) {
  let source = await readFile(new URL(relative, import.meta.url), "utf8");
  for (const [old, value] of Object.entries(replacements)) source = source.replaceAll(old, value);
  let code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  code = code.replaceAll('from "vue"', `from ${JSON.stringify(import.meta.resolve("vue"))}`);
  const path = join(dir, relative.replaceAll(/[^a-z0-9]/gi, "_") + ".mjs");
  await writeFile(path, code);
  return import(pathToFileURL(path));
}
const { createCommercialAccess } = await moduleFrom("../composables/commercialAccess.ts", {
  'from "./commercialStatus"': `from ${JSON.stringify(new URL("../composables/commercialStatus.ts", import.meta.url).href)}`,
});
const { createLearningAccess } = await moduleFrom("../composables/learningAccess.ts");
await moduleFrom("../composables/retainedCourses.ts");
await moduleFrom("../composables/shop.ts");
await moduleFrom("../composables/commercialFetch.ts");
await moduleFrom("../composables/courseContinuation.ts");
const subject = "11000000-0000-4000-8000-000000000001",
  other = "11000000-0000-4000-8000-000000000002";
const caseId = "22000000-0000-4000-8000-000000000001";
const originalKey = "a".repeat(43),
  laterKey = "b".repeat(43);
const httpError = (status) =>
  Object.assign(new Error(`Synthetic ${status}`), { response: { status } });
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
function fixture() {
  const data = new Map(),
    calls = [],
    journal = new Map();
  let currentKey = originalKey,
    epoch = 3,
    ambient = "ambient-a",
    identity = "view-a",
    personal = null,
    fault = null,
    storageFailed = false,
    wait = null;
  const storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem(k, v) {
      if (storageFailed) throw Error("Synthetic unavailable storage");
      data.set(k, v);
    },
    removeItem: (k) => data.delete(k),
  };
  // Synthetic response contract only: this does not execute backend SQL/authority.
  const fetch = async (path, options) => {
    calls.push({ path, options: structuredClone(options) });
    assert.equal(options.credentials, "omit");
    assert.equal(options.retry, 0);
    assert.equal(Object.keys(options.headers).length, 1);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.headers["x-learning-key"], undefined);
    const claim = options.headers["x-commercial-claim-key"],
      cap = options.headers["x-moderation-capability"];
    if (!(claim === currentKey || cap === "rights-capability"))
      throw httpError(cap === "case-capability" ? 403 : 401);
    if (wait) await wait.promise;
    if (path === "/shop/claims/recipient/export") {
      if (fault === "no-case") return { case: null };
      return {
        case: { id: caseId, subject, access_epoch: epoch },
        obligations: [
          { id: "original-claim", units: null },
          { id: "second-claim", units: 9876 },
        ],
      };
    }
    if (path.includes("/documents/"))
      return new Blob(["%PDF-1.4 original synthetic bytes"], { type: "application/pdf" });
    assert.equal(path, "/shop/claims/recipient/access");
    const saved = JSON.parse(storage.getItem("commercial-access-rotations-v1"));
    assert(
      saved.some((r) => JSON.stringify(r.rotation.body) === JSON.stringify(options.body)),
      "exact request and replacement key persisted before HTTP dispatch"
    );
    if (fault === "before") {
      fault = null;
      throw Error("Synthetic lost response before commit");
    }
    const before = journal.get(options.body.command_id);
    if (before) assert.deepEqual(options.body, before.body);
    else {
      currentKey = options.body.key;
      epoch++;
      journal.set(options.body.command_id, { body: structuredClone(options.body) });
    }
    if (fault === "after") {
      fault = null;
      throw Error("Synthetic lost committed response");
    }
    return { case_id: caseId, claim_value_expires: false };
  };
  const options = {
    fetch,
    storage,
    ambient: () => ambient,
    identity: () => identity,
    personalProof: () => personal,
  };
  return {
    options,
    calls,
    data,
    journal,
    flow: () => createCommercialAccess(options),
    fault: (v) => (fault = v),
    personal: (v) => (personal = v),
    changeOwner: () => {
      ambient = "ambient-b";
      identity = "view-b";
    },
    changeView: () => (identity += "x"),
    wait: (v) => (wait = v),
    storageFailure: () => (storageFailed = true),
    displace: () => {
      currentKey = laterKey;
      epoch++;
    },
    epoch: () => epoch,
  };
}

test("current claim proof prepares before dispatch and confirms replacement only by owned export", async () => {
  const f = fixture(),
    c = f.flow();
  await c.connectKey(originalKey);
  await c.prepare();
  const initial = JSON.parse(c.recoveryText());
  assert.equal(f.calls.filter((r) => r.path.endsWith("/access")).length, 0);
  assert.equal(initial.owner.subject, subject);
  assert.equal(initial.owner.access_epoch, 3);
  await c.submit();
  assert.equal(c.pending.value.state, "active");
  assert.equal(c.owner.value.access_epoch, 4);
  assert.deepEqual(c.pending.value.body, initial.body);
  assert.equal(f.journal.size, 1);
  assert.equal(f.calls.at(-1).options.headers["x-commercial-claim-key"], initial.body.key);
  assert(!Object.hasOwn(initial.body, "subject"));
  assert(!Object.hasOwn(initial.body, "terms_version"));
  assert(!f.calls.some((r) => r.path.includes("learning") || r.path.includes("/auth/")));
});

test("lost committed reply survives old-key 401 and reload with exact current replacement replay", async () => {
  const f = fixture(),
    c = f.flow();
  await c.connectKey(originalKey);
  await c.prepare();
  const saved = JSON.parse(c.recoveryText());
  f.fault("after");
  await assert.rejects(c.submit());
  const lost = f.data.get("commercial-access-rotations-v1");
  assert.equal(c.pending.value.state, "unconfirmed");
  const reload = f.flow();
  await reload.restore();
  assert(
    f.calls.some(
      (r) =>
        r.path.endsWith("/export") && r.options.headers["x-commercial-claim-key"] === originalKey
    )
  );
  assert.equal(reload.owner.value.subject, subject);
  assert.equal(f.data.get("commercial-access-rotations-v1"), lost);
  await reload.submit();
  assert.equal(reload.pending.value.state, "active");
  assert.deepEqual(reload.pending.value.body, saved.body);
  assert.equal(f.epoch(), 4);
  assert.equal(f.journal.size, 1);
  const mutations = f.calls.filter((r) => r.path.endsWith("/access"));
  assert.deepEqual(mutations[1].options.body, mutations[0].options.body);
  assert.equal(mutations[1].options.headers["x-commercial-claim-key"], saved.body.key);
});

test("never-committed recovery material needs legitimate current proof and retains original command", async () => {
  const f = fixture(),
    c = f.flow();
  await c.connectKey(originalKey);
  await c.prepare();
  const backup = c.recoveryText();
  f.fault("before");
  await assert.rejects(c.submit());
  const empty = fixture(),
    restored = empty.flow();
  await assert.rejects(restored.importRecovery(backup));
  assert.equal(restored.owner.value, null);
  assert.equal(empty.journal.size, 0);
  assert(empty.data.has("commercial-access-rotations-v1"));
  await restored.connectKey(originalKey);
  await restored.submit();
  assert.deepEqual(restored.pending.value.body, JSON.parse(backup).body);
  assert.equal(empty.journal.size, 1);
});

test("personal rights proof can rotate; ordinary absence and case-only proof cannot", async () => {
  const f = fixture(),
    c = f.flow();
  await assert.rejects(c.connectPersonal());
  assert.equal(f.calls.length, 0);
  f.personal({ kind: "moderation", secret: "case-capability", subject });
  await assert.rejects(c.connectPersonal());
  assert.equal(c.owner.value, null);
  f.personal({ kind: "moderation", secret: "rights-capability", subject });
  await c.connectPersonal();
  await c.prepare();
  await c.submit();
  const mutation = f.calls.find((r) => r.path.endsWith("/access"));
  assert.deepEqual(mutation.options.headers, { "x-moderation-capability": "rights-capability" });
  assert.equal(c.pending.value.state, "active");
});

test("historical replay with later current proof cannot activate a displaced replacement", async () => {
  const f = fixture(),
    c = f.flow();
  await c.connectKey(originalKey);
  await c.prepare();
  f.fault("after");
  await assert.rejects(c.submit());
  const body = JSON.parse(JSON.stringify(c.pending.value.body));
  f.displace();
  await c.connectKey(laterKey);
  await assert.rejects(c.submit(), /replacement_inactive/);
  assert.equal(c.pending.value.state, "inactive");
  assert.deepEqual(c.pending.value.body, body);
  assert.equal(f.journal.size, 1);
  assert.equal(f.epoch(), 5);
  assert.equal(JSON.parse(f.data.get("commercial-current-proof-v1")).key, laterKey);
});

test("storage failure prevents mutation and readonly original documents retain claim proof", async () => {
  const f = fixture(),
    c = f.flow();
  await c.connectKey(originalKey);
  const snapshot = await c.snapshot();
  assert.equal(snapshot.obligations[0].units, null);
  const doc = await c.statement("S18446744073709551615");
  assert.match(await doc.text(), /original synthetic bytes/);
  assert.equal(
    f.calls.at(-1).path,
    "/shop/claims/documents/final-statement/18446744073709551615/original"
  );
  await assert.rejects(c.statement("R123"));
  f.storageFailure();
  await assert.rejects(c.prepare());
  assert.equal(f.journal.size, 0);
  assert.equal(c.pending.value, null);
});

test("owner change clears secret download and stale results without deleting original recovery", async () => {
  const f = fixture(),
    c = f.flow();
  await c.connectKey(originalKey);
  await c.prepare();
  const saved = f.data.get("commercial-access-rotations-v1");
  const barrier = deferred();
  f.wait(barrier);
  const read = c.snapshot();
  f.changeOwner();
  c.clear();
  barrier.resolve();
  await assert.rejects(read, /stale_view/);
  assert.equal(c.owner.value, null);
  assert.throws(() => c.recoveryText());
  assert.equal(f.data.get("commercial-access-rotations-v1"), saved);
  const reload = f.flow();
  const count = f.calls.length;
  await reload.restore();
  assert.equal(f.calls.length, count);
  assert.equal(reload.pending.value, null);
});

test("late mutation response after owner change preserves unconfirmed original record without binding", async () => {
  const f = fixture(),
    c = f.flow();
  await c.connectKey(originalKey);
  await c.prepare();
  const barrier = deferred();
  f.wait(barrier);
  const run = c.submit();
  f.changeOwner();
  c.clear();
  barrier.resolve();
  await assert.rejects(run);
  assert.equal(c.owner.value, null);
  assert.equal(c.pending.value, null);
  assert.equal(
    JSON.parse(f.data.get("commercial-access-rotations-v1"))[0].rotation.state,
    "unconfirmed"
  );
  assert.equal(f.journal.size, 1, "synthetic server may have committed despite hidden response");
});

test("owned case prerequisite and malformed recovery preserve prior records without inferred authority", async () => {
  const f = fixture(),
    c = f.flow();
  f.fault("no-case");
  await assert.rejects(c.connectKey(originalKey), /no_case/);
  assert.equal(f.journal.size, 0);
  f.fault(null);
  await c.connectKey(originalKey);
  await c.prepare();
  const saved = f.data.get("commercial-access-rotations-v1"),
    backup = JSON.parse(c.recoveryText());
  backup.owner.subject = other;
  await assert.rejects(c.importRecovery(JSON.stringify(backup)), /invalid_recovery/);
  assert.equal(f.data.get("commercial-access-rotations-v1"), saved);
  assert.equal(f.journal.size, 0);
});

import { compileScript, compileTemplate, parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { createI18n } from "vue-i18n";
const { createRenderer, h, nextTick, reactive, ref } = Vue;
async function compileComponent(relative) {
  const baseline =
    process.env.CFB1_BASELINE === "original" &&
    ["CommercialAccess.vue", "LearningAccess.vue", "OriginalDocuments.vue"].some((name) =>
      relative.endsWith("/" + name)
    );
  const sourcePath = baseline
    ? join(process.env.CFB1_STAGE, "before/frontend/components", relative.split("/").at(-1))
    : new URL(relative, import.meta.url);
  let source = await readFile(sourcePath, "utf8");
  if (baseline)
    console.log(
      "CFB1 original component",
      String(sourcePath),
      createHash("sha256").update(source).digest("hex")
    );
  // The in-memory host checks the real gate condition; visual dialog internals
  // need browser focus/portal APIs and are represented by a rendering shell.
  source = source.replace(
    'import { DialogPanel } from "@headlessui/vue";',
    'const DialogPanel = { setup: (_p, { slots }) => () => globalThis.h("article", slots.default?.()) };'
  );
  const { descriptor } = parse(source);
  const script = compileScript(descriptor, { id: relative, inlineTemplate: true });
  let content = script.content;
  if (!descriptor.scriptSetup) {
    const rendered = compileTemplate({
      source: descriptor.template.content,
      filename: relative,
      id: relative,
      compilerOptions: { bindingMetadata: script.bindings },
    });
    content =
      content.replace("export default", "const component =") +
      "\n" +
      rendered.code.replace("export function render", "function render") +
      "\ncomponent.render=render;export default component;";
  }
  let code = ts.transpileModule(content, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const dep of ["vue", "vue-i18n", "@headlessui/vue"])
    code = code.replace(
      new RegExp(`from ["']${dep}["']`, "g"),
      `from ${JSON.stringify(import.meta.resolve(dep))}`
    );
  code = code.replaceAll(
    'from "../composables/commercialAccess"',
    `from ${JSON.stringify(pathToFileURL(join(dir, "___composables_commercialAccess_ts.mjs")).href)}`
  );
  code = code.replaceAll(
    'from "../composables/learningAccess"',
    `from ${JSON.stringify(pathToFileURL(join(dir, "___composables_learningAccess_ts.mjs")).href)}`
  );
  code = code.replaceAll(
    'from "../composables/retainedCourses"',
    `from ${JSON.stringify(pathToFileURL(join(dir, "___composables_retainedCourses_ts.mjs")).href)}`
  );
  code = code.replaceAll(
    'from "../composables/commercialStatus"',
    `from ${JSON.stringify(new URL("../composables/commercialStatus.ts", import.meta.url).href)}`
  );
  for (const dependency of ["shop", "courseContinuation", "commercialFetch"])
    code = code.replaceAll(
      `from "../composables/${dependency}"`,
      `from ${JSON.stringify(pathToFileURL(join(dir, `___composables_${dependency}_ts.mjs`)).href)}`
    );
  code = code.replace('import "highlight.js/styles/github-dark.css";', "");
  const path = join(dir, relative.replaceAll(/[^a-z0-9]/gi, "_") + ".mjs");
  await writeFile(path, code);
  return (await import(pathToFileURL(path))).default;
}
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
    pause() {
      this.paused = true;
    },
    load() {
      this.loaded = true;
    },
    removeAttribute(name) {
      delete this.props[name];
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
const messages = {};
let panel, records, learning, retainedCourses, retainedPlayer, courseContinuation;
async function components() {
  if (panel) return;
  for (const language of ["en-US", "de"])
    messages[language] = JSON.parse(
      await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")
    );
  panel = await compileComponent("../components/CommercialAccess.vue");
  records = await compileComponent("../components/CommercialStatus.vue");
  learning = await compileComponent("../components/LearningAccess.vue");
  courseContinuation = await compileComponent("../components/CourseContinuation.vue");
  retainedCourses = await compileComponent("../components/RetainedCourses.vue");
  retainedPlayer = await compileComponent("../components/RetainedCoursePlayer.vue");
}
const link = {
  props: ["to"],
  setup:
    (p, { slots }) =>
    () =>
      h("a", { href: p.to }, slots.default?.()),
};
const browserGlobals = (f) => ({
  ...Vue,
  sessionStorage: f.options.storage,
  moderationAmbientIdentity: f.options.ambient,
  $fetch: f.options.fetch,
  useRuntimeConfig: () => ({ public: { BASE_API_URL: "https://synthetic.invalid" } }),
  Document: class {},
  ShadowRoot: class {},
  document: { activeElement: null, createElement: () => ({ click() {} }) },
});

for (const language of ["de", "en-US"])
  test(`CFB1 mounted ${language} received learning401 removes still-mounted media, blocks held200 and preserves personal exact refresh`, async () => {
    await components();
    const f = learningFixture(),
      held = deferred();
    const details = {
      id: "course",
      title: "CFB1 course",
      description: null,
      sections: [
        {
          id: "section",
          title: "Section",
          lectures: [
            {
              id: "lecture",
              title: "CFB1 lecture",
              description: null,
              type: "mp4",
              completed: false,
            },
          ],
        },
      ],
    };
    let mode = "normal",
      controller,
      cancelled = false,
      courseRequest,
      late,
      denied;
    const response = new Response(
      new ReadableStream({
        start(value) {
          controller = value;
        },
        cancel() {
          cancelled = true;
          return new Promise(() => {});
        },
      }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
    const globalsForLearning = {
      ...browserGlobals({ options: f.options }),
      $fetch: async (path, options) => {
        if (!path.startsWith("/skills/learning/")) return f.options.fetch(path, options);
        if (mode === "held200") return held.promise;
        if (mode === "deny") return response;
        if (path.endsWith("/course_access")) return [{ id: "course", title: "CFB1 course" }];
        if (path.endsWith("/watch")) return true;
        if (path.endsWith("/lectures/lecture"))
          return "https://synthetic.invalid/skills/learning/lectures/proof/lecture.mp4";
        return structuredClone(details);
      },
    };
    await globals(globalsForLearning, async () => {
      const ui = host(),
        app = ui.renderer.createApp({
          render: () => h(panel, { identity: "view-a", personalProof: () => null }),
        });
      app.use(createI18n({ legacy: false, locale: language, messages }));
      app.component("NuxtLink", link);
      app.component("CommercialStatus", records);
      app.component("LearningAccess", learning);
      app.component("CourseContinuation", { render: () => null });
      app.component("PremiumContinuation", { render: () => null });
      app.component("OriginalDocuments", { render: () => null });
      app.component("RetainedCoursePlayer", retainedPlayer);
      app.component("RetainedCourses", {
        props: ["identity", "request"],
        setup(props) {
          courseRequest = (operation) => props.request(operation);
          return () => h(retainedCourses, { identity: props.identity, request: props.request });
        },
      });
      const texts = messages[language];
      app.mount(ui.root);
      const button = (label) =>
        ui.all().find((n) => n.type === "button" && ui.text(n).trim() === label);
      try {
        await flush();
        const input = ui.all().find((n) => n.props.id === "commercial-current-key");
        input.props["onUpdate:modelValue"](originalKey);
        await input.parent.props.onSubmit({ preventDefault() {} });
        await flush();
        await button(texts.LearningAccess.Find).props.onClick();
        await flush();
        await button(texts.LearningAccess.Prepare).props.onClick();
        await flush();
        ui.all()
          .find((n) => n.props.type === "checkbox")
          .props["onUpdate:modelValue"](true);
        await flush();
        await button(texts.LearningAccess.Issue).props.onClick();
        await flush();
        const saved = f.data.get("commercial-learning-refresh-v1");
        await button(texts.RetainedCourses.List).props.onClick();
        await flush();
        await button("CFB1 course").props.onClick();
        await flush();
        await button("CFB1 lecture").props.onClick();
        await flush();
        const video = ui.all().find((n) => n.type === "video");
        assert(video?.props.src, "actual retained media is mounted before the background request");
        mode = "held200";
        late = courseRequest({ kind: "details", course: "course" }).catch((e) => e);
        await flush();
        assert(
          ui.all().includes(video),
          "background request has not invoked a public course action's media clearing"
        );
        mode = "deny";
        denied = courseRequest({ kind: "list" }).catch((e) => e);
        await new Promise((r) => setTimeout(r, 25));
        await flush();
        assert(!ui.all().some((n) => n.type === "video"));
        assert(
          video.paused && video.loaded && !video.props.src,
          "actual player disposal called pause/remove/load on its synthetic element"
        );
        assert(!ui.all().some((n) => n.props["aria-labelledby"] === "retained-courses-title"));
        assert(ui.text().includes(texts.LearningAccess.Expired));
        assert(ui.text().includes(texts.ClaimAccess.Prepare), "personal access remains usable");
        assert(!ui.text().includes(subject), "raw owner ID is not a user-facing label");
        assert.equal(f.data.get("commercial-learning-refresh-v1"), saved);
        assert(cancelled, "nonawaited original-body cancellation was requested");
        held.resolve(structuredClone(details));
        await late;
        await flush();
        assert(!ui.all().some((n) => n.type === "video"));
        mode = "normal";
        await button(texts.LearningAccess.Find).props.onClick();
        await flush();
        await button(texts.LearningAccess.Retry).props.onClick();
        await flush();
        assert(ui.text().includes(texts.LearningAccess.Available));
        const oldRecord = JSON.parse(saved)[0].record;
        assert.deepEqual(
          JSON.parse(f.data.get("commercial-learning-refresh-v1"))[0].record,
          oldRecord
        );
        assert.equal(f.journal.size, 1, "explicit replay retains its original command and receipt");
      } finally {
        try {
          controller.close();
        } catch {}
        held.resolve(structuredClone(details));
        await Promise.all([late, denied]);
        app.unmount();
        f.dispose();
      }
    });
  });

test("mounted commercial panel saves/retries exact replacement in both languages and clears owner material", async () => {
  await components();
  const f = fixture(),
    downloaded = [];
  const oldURL = URL.createObjectURL,
    oldRevoke = URL.revokeObjectURL;
  URL.createObjectURL = (blob) => {
    downloaded.push(blob);
    return "blob:synthetic";
  };
  URL.revokeObjectURL = () => {};
  try {
    await globals(browserGlobals(f), async () => {
      const ui = host(),
        props = reactive({ identity: "view-a", personalProof: () => null });
      const app = ui.renderer.createApp({ render: () => h(panel, props) });
      const i18n = createI18n({ legacy: false, locale: "en-US", messages });
      app.use(i18n);
      app.component("NuxtLink", link);
      app.component("CommercialStatus", records);
      app.component("LearningAccess", learning);
      app.component("CourseContinuation", courseContinuation);
      app.component("RetainedCourses", retainedCourses);
      app.component("RetainedCoursePlayer", retainedPlayer);
      app.mount(ui.root);
      try {
        await flush();
        assert(ui.text().includes(messages["en-US"].ClaimAccess.Explanation));
        const input = ui.all().find((n) => n.props.id === "commercial-current-key");
        input.props["onUpdate:modelValue"](originalKey);
        await input.parent.props.onSubmit({ preventDefault() {} });
        await flush();
        assert(ui.text().includes(messages["en-US"].ClaimAccess.Prepare));
        assert(!ui.text().includes(subject));
        const button = (label) =>
          ui.all().find((n) => n.type === "button" && ui.text(n).trim() === label);
        await button(messages["en-US"].ClaimAccess.Prepare).props.onClick();
        await flush();
        assert(button("Replace key now").props.disabled);
        button(messages["en-US"].ClaimAccess.Save).props.onClick();
        const backup = JSON.parse(await downloaded[0].text());
        assert.equal(f.journal.size, 0);
        assert.equal(backup.owner.subject, subject);
        const check = ui.all().find((n) => n.type === "input" && n.props.type === "checkbox");
        check.props["onUpdate:modelValue"](true);
        await flush();
        f.fault("after");
        await button("Replace key now").props.onClick();
        await flush();
        assert(ui.text().includes(messages["en-US"].ClaimAccess.State.unconfirmed));
        await button("Check this replacement again").props.onClick();
        await flush();
        assert(ui.text().includes(messages["en-US"].ClaimAccess.State.active));
        assert.equal(f.journal.size, 1);
        i18n.global.locale.value = "de";
        await flush();
        assert(ui.text().includes(messages.de.ClaimAccess.State.active));
        assert(ui.text().includes(messages.de.ClaimAccess.Explanation));
        const staleDownload = button(messages.de.ClaimAccess.Save).props.onClick;
        f.changeOwner();
        props.identity = "view-b";
        await flush();
        staleDownload();
        await flush();
        assert.equal(downloaded.length, 1);
        assert.doesNotMatch(ui.text(), new RegExp(subject));
        assert(f.data.has("commercial-access-rotations-v1"));
      } finally {
        app.unmount();
      }
    });
  } finally {
    URL.createObjectURL = oldURL;
    URL.revokeObjectURL = oldRevoke;
  }
});

test("both existing public parent pages mount the actual commercial panel without sending claim proof to inbox", async () => {
  await components();
  for (const page of ["../pages/moderation/access.vue", "../pages/moderation/index.vue"]) {
    const f = fixture(),
      meta = [],
      navigations = [];
    const m = {
      epoch: ref(0),
      recipient: ref(subject),
      scope: ref("rights"),
      rows: ref([]),
      available: ref(true),
      active: ref(true),
      commercialPersonalProof: () => ({ kind: "moderation", secret: "rights-capability", subject }),
      commercialSnapshot: async () => ({ case: { id: caseId } }),
      commercialStatement: async () => new Blob(),
      importFragment: () => false,
      load: async () => {},
      guard: () => () => true,
    };
    const values = {
      ...browserGlobals(f),
      definePageMeta: (v) => meta.push(v),
      useModeration: () => m,
      navigateTo: (v) => navigations.push(v),
      $fetch: (path, options) =>
        path === "/auth/oauth/providers" ? Promise.resolve([]) : f.options.fetch(path, options),
    };
    await globals(values, async () => {
      const Page = await compileComponent(page),
        ui = host(),
        app = ui.renderer.createApp(Page);
      app.use(createI18n({ legacy: false, locale: "en-US", messages }));
      app.component("NuxtLink", link);
      app.component("CommercialAccess", panel);
      app.component("CommercialStatus", records);
      app.component("LearningAccess", learning);
      app.component("CourseContinuation", courseContinuation);
      app.component("RetainedCourses", retainedCourses);
      app.component("RetainedCoursePlayer", retainedPlayer);
      app.mount(ui.root);
      try {
        await flush();
        assert(ui.text().includes(messages["en-US"].ClaimAccess.Title));
        assert.deepEqual(meta, [{ layout: "inner" }]);
        const input = ui.all().find((n) => n.props.id === "commercial-current-key");
        input.props["onUpdate:modelValue"](originalKey);
        await input.parent.props.onSubmit({ preventDefault() {} });
        await flush();
        assert(ui.text().includes(messages["en-US"].ClaimAccess.Prepare));
        assert(!ui.text().includes(caseId), "case ID is not exposed as the panel title");
        assert.deepEqual(navigations, []);
        assert(f.calls.every((r) => r.path.startsWith("/shop/claims/")));
      } finally {
        app.unmount();
      }
    });
  }
});

test("actual app keeps public rights access and ordinary authentication without automatically migrating old terms", async () => {
  await components();
  const state = new Map(),
    cookies = new Map(),
    navigations = [],
    hooks = {};
  const route = reactive({ path: "/moderation/access", matched: [{}] });
  const router = { currentRoute: ref(route), push: (path) => navigations.push(path) };
  const stored = (map, name, init) => {
    if (!map.has(name)) map.set(name, ref(init()));
    return map.get(name);
  };
  let mode = "absent",
    profileCalls = 0,
    reviewCalls = 0,
    termsMutations = 0,
    gateMounts = 0;
  const values = {
    ...Vue,
    useState: (name, init) => stored(state, name, init),
    useAppCookie: (name) => stored(cookies, name, () => null),
    useRouter: () => router,
    useRoute: () => route,
    useNuxtApp: () => ({ hook: (name, fn) => (hooks[name] = fn) }),
    moderationAmbientChanged: () => {},
    defineNuxtPlugin: (fn) => fn,
    defineNuxtRouteMiddleware: (fn) => fn,
    navigateTo: (path) => navigations.push(path),
    GET: async (path) => {
      assert.equal(path, "/auth/users/me");
      profileCalls++;
      if (mode === "failed") throw httpError(401);
      return { id: other, terms_version: "old-version" };
    },
    POST: async () => {
      termsMutations++;
      throw new Error("No automatic terms mutation");
    },
    useDialog: () => ref({ show: true }),
    useUnratedWebinars: () => ref([{ id: "stale-rating" }]),
    getUnratedWebinars: async () => reviewCalls++,
    Document: class {},
    ShadowRoot: class {},
    document: { activeElement: null },
  };
  await globals(values, async () => {
    const publicRoutes = await moduleFrom("../composables/publicLegalRoutes.ts");
    const user = await moduleFrom("../composables/user.ts", {
      'import { useState } from "#app";': "",
      'import { User } from "~/types/userTypes";': "class User {}",
    });
    const terms = await moduleFrom("../composables/terms.ts");
    const session = (await moduleFrom("../plugins/session.client.ts")).default;
    const middleware = (await moduleFrom("../middleware/route.global.ts")).default;
    const protectedMiddleware = (await moduleFrom("../middleware/auth.ts")).default;
    await globals({ ...publicRoutes, ...user, ...terms }, async () => {
      const App = await compileComponent("../app.vue"),
        Terms = await compileComponent("../components/TermsGate.vue");
      const ui = host(),
        app = ui.renderer.createApp(App);
      const slot = {
        setup:
          (_p, { slots }) =>
          () =>
            h("div", slots.default?.()),
      };
      app.use(createI18n({ legacy: false, locale: "en-US", messages }));
      for (const name of ["NuxtLayout", "LazyClientOnly", "StackedDialog"])
        app.component(name, slot);
      for (const name of [
        "NuxtLoadingIndicator",
        "UpdateNotice",
        "Confetti",
        "ContractTermination",
        "Snackbar",
        "FormWebinarRating",
        "InputCheckbox",
        "InputBtn",
        "Modal",
        "Dialog",
      ])
        app.component(name, { setup: () => () => h("span", { "data-component": name }) });
      app.component("Loading", {
        setup: () => () => h("span", { "data-blocker": "ordinary-loading" }),
      });
      app.component("NuxtPage", { setup: () => () => h("main", "Synthetic route content") });
      app.component("NuxtLink", link);
      app.component("TermsGate", {
        ...Terms,
        setup(...args) {
          gateMounts++;
          return Terms.setup(...args);
        },
      });
      app.mount(ui.root);
      try {
        for (const path of ["/moderation/access", "/moderation"])
          for (mode of ["absent", "failed", "stale"]) {
            route.path = path;
            cookies.set("user", ref(mode === "absent" ? null : { id: other }));
            cookies.set(
              "accessToken",
              ref(mode === "absent" ? null : "synthetic-expired-or-current-ordinary")
            );
            await session();
            middleware(route, route);
            await hooks["page:finish"]();
            await flush();
            assert.equal(terms.needsTermsAcceptance(path), false, `${path}/${mode}`);
            assert.equal(ui.all().filter((n) => n.props["data-blocker"]).length, 0);
            assert.doesNotMatch(ui.text(), /new version of our|Neue Allgemeine/);
            assert.deepEqual(navigations, []);
            // Actual failed-session setter also keeps both public routes in place.
            user.setStates(null);
            assert.deepEqual(navigations, []);
          }
        assert(profileCalls > 0);
        assert.equal(reviewCalls, 0);
        route.path = "/dashboard";
        user.setStates({
          user: { id: other, terms_version: "old-version" },
          access_token: "synthetic-session",
        });
        await flush();
        assert.equal(terms.needsTermsAcceptance(route.path), true);
        assert.equal(gateMounts, 0, "released app does not mount the legacy terms component");
        assert.equal(termsMutations, 0);
        assert.doesNotMatch(ui.text(), /new version of our|Neue Allgemeine/);
        assert(ui.all().some((n) => n.props["data-blocker"] === "ordinary-loading"));
        user.setStates(null);
        assert.equal(navigations.at(-1), "/auth/login");
        protectedMiddleware({ path: "/dashboard" }, { path: "/" });
        assert.equal(navigations.at(-1), "/auth/login");
      } finally {
        app.unmount();
      }
    });
  });
});

test("actual moderation accessor exposes only proved personal capability and keeps ordinary readonly transport", async () => {
  const f = fixture(),
    state = new Map(),
    ordinary = ref({ id: other }),
    calls = [];
  let token = "synthetic-ordinary",
    mode = "rights";
  const capability = "c".repeat(43);
  await globals(
    {
      ...browserGlobals(f),
      useState: (name, init) => {
        if (!state.has(name)) state.set(name, ref(init()));
        return state.get(name);
      },
      useUser: () => ordinary,
      getAccessToken: () => token,
      $fetch: async (path, options) => {
        calls.push({ path, options });
        if (path === "/auth/moderation/inbox")
          return {
            scope: mode,
            recipient_id: subject,
            backend: [],
            challenges: [],
            challenges_available: true,
          };
        assert.equal(path, "/shop/claims/recipient/export");
        return { case: { id: caseId, subject, access_epoch: 3 } };
      },
    },
    async () => {
      const { useModeration } = await moduleFrom("../composables/moderation.ts", {
        "import.meta.client": "true",
        'from "./commercialStatus"': `from ${JSON.stringify(new URL("../composables/commercialStatus.ts", import.meta.url).href)}`,
      });
      const scope = Vue.effectScope(),
        m = scope.run(() => useModeration());
      try {
        await m.load();
        assert.equal(
          m.commercialPersonalProof(),
          null,
          "ordinary rights view is not personal rotation proof"
        );
        await m.commercialSnapshot();
        assert.deepEqual(calls.at(-1).options.headers, {
          Authorization: "Bearer synthetic-ordinary",
        });
        m.install(capability);
        await m.load();
        assert.deepEqual(m.commercialPersonalProof(), {
          kind: "moderation",
          secret: capability,
          subject,
        });
        await m.commercialSnapshot();
        assert.deepEqual(calls.at(-1).options.headers, { "x-moderation-capability": capability });
        mode = "case";
        await m.load();
        assert.equal(m.commercialPersonalProof(), null);
        mode = "rights";
        await m.load();
        ordinary.value = { id: "another-ordinary-owner" };
        token = "another-ordinary-token";
        assert.equal(
          m.commercialPersonalProof(),
          null,
          "ambient owner change invalidates old capability synchronously"
        );
      } finally {
        scope.stop();
      }
    }
  );
});

test("later 401 stops presenting a saved replacement as active while preserving recovery bytes", async () => {
  const f = fixture(),
    c = f.flow();
  await c.connectKey(originalKey);
  await c.prepare();
  await c.submit();
  const body = JSON.parse(c.recoveryText()).body;
  f.displace();
  await assert.rejects(c.snapshot());
  assert.equal(c.owner.value, null);
  assert.equal(c.pending.value, null);
  assert.equal(c.error.value, "proof_required");
  assert.throws(() => c.recoveryText(), /proof_required/);
  assert.deepEqual(JSON.parse(f.data.get("commercial-access-rotations-v1"))[0].rotation.body, body);
  await assert.rejects(c.statement("S123"));
  await c.connectKey(laterKey);
  assert.deepEqual(JSON.parse(c.recoveryText()).body, body);
  assert.equal(c.pending.value.state, "unconfirmed");
  assert.equal(f.journal.size, 1);
});

for (const reconnect of ["current-key", "rights-proof"]) {
  test(`CA1 completed replacement displaced then ${reconnect} reconnect does not restore stale active status`, async () => {
    const f = fixture(),
      c = f.flow();
    await c.connectKey(originalKey);
    await c.prepare();
    await c.submit();
    const original = JSON.parse(c.recoveryText());
    assert.equal(original.state, "active");
    f.displace();
    if (reconnect === "current-key") await c.connectKey(laterKey);
    else {
      f.personal({ kind: "moderation", secret: "rights-capability", subject });
      await c.connectPersonal();
    }
    assert.equal(c.owner.value.access_epoch, 5);
    assert.equal(
      c.pending.value.state,
      "unconfirmed",
      "different current proof cannot verify the recorded replacement key"
    );
    assert.deepEqual(c.pending.value.body, original.body);
    assert.deepEqual(c.pending.value.owner, original.owner);
    assert.equal(
      (await c.snapshot()).case.subject,
      subject,
      "legitimate current proof still works"
    );
    await assert.rejects(c.submit(), /replacement_inactive/);
    assert.equal(c.pending.value.state, "inactive");
    assert.deepEqual(c.pending.value.body, original.body);
    assert.equal((await c.snapshot()).case.access_epoch, 5);
    assert.equal(f.journal.size, 1);
  });
}

test("CA1 reconnecting personal proof keeps a never-committed prepared key and command pending", async () => {
  const f = fixture(),
    c = f.flow();
  await c.connectKey(originalKey);
  await c.prepare();
  const original = JSON.parse(c.recoveryText());
  f.personal({ kind: "moderation", secret: "rights-capability", subject });
  await c.connectPersonal();
  assert.equal(c.pending.value.state, "prepared");
  assert.deepEqual(c.pending.value.body, original.body);
  assert.equal(f.journal.size, 0);
  assert.equal(c.owner.value.access_epoch, 3);
  await c.submit();
  assert.equal(c.pending.value.state, "active");
  assert.equal(f.journal.size, 1);
});

test("CA2 matching401 invalidates both held read and document before their late200 replies", async () => {
  const f = fixture(),
    c = f.flow();
  await c.connectKey(originalKey);
  await c.prepare();
  await c.submit();
  const stored = f.data.get("commercial-access-rotations-v1"),
    generation = c.generation.value;
  const barrier = deferred();
  f.wait(barrier);
  const read = c.snapshot(),
    document = c.statement("S123");
  f.displace();
  await assert.rejects(c.snapshot());
  barrier.resolve();
  f.wait(null);
  const settled = await Promise.allSettled([read, document]);
  assert.deepEqual(
    settled.map((r) => r.status),
    ["rejected", "rejected"]
  );
  assert(settled.every((r) => /stale_view/.test(r.reason?.message)));
  assert(c.generation.value > generation);
  assert.equal(c.owner.value, null);
  assert.equal(c.pending.value, null);
  assert.throws(() => c.recoveryText());
  assert.equal(
    f.data.get("commercial-access-rotations-v1"),
    stored,
    "credential loss preserves exact original recovery bytes"
  );
  await c.connectKey(laterKey);
  assert.equal(c.owner.value.subject, subject);
  assert.deepEqual(c.pending.value.body, JSON.parse(stored)[0].rotation.body);
});

test("CA2 stale foreign401 cannot invalidate a newer authenticated owner and proof", async () => {
  const f = fixture(),
    barrier = deferred();
  let held = false;
  const originalFetch = f.options.fetch;
  f.options.fetch = async (path, options) => {
    if (held && options.headers["x-commercial-claim-key"] === originalKey) {
      await barrier.promise;
      throw httpError(401);
    }
    if (options.headers["x-commercial-claim-key"] === laterKey)
      return {
        case: { id: "22000000-0000-4000-8000-000000000002", subject: other, access_epoch: 9 },
      };
    return originalFetch(path, options);
  };
  const c = f.flow();
  await c.connectKey(originalKey);
  held = true;
  const oldRead = c.snapshot();
  f.changeOwner();
  await c.connectKey(laterKey);
  const generation = c.generation.value;
  barrier.resolve();
  await assert.rejects(oldRead);
  assert.equal(c.owner.value.subject, other);
  assert.equal(c.generation.value, generation);
  assert.equal(c.state.value, "ready");
  assert.equal((await c.snapshot()).case.subject, other);
});

test("CA2 actual panel removes cached records and blocks held document download after matching401", async () => {
  await components();
  const f = fixture(),
    downloaded = [];
  const oldURL = URL.createObjectURL,
    oldRevoke = URL.revokeObjectURL;
  URL.createObjectURL = (blob) => {
    downloaded.push(blob);
    return "blob:synthetic";
  };
  URL.revokeObjectURL = () => {};
  try {
    await globals(browserGlobals(f), async () => {
      const ui = host(),
        app = ui.renderer.createApp(panel, {
          identity: "view-a",
          personalProof: () => null,
          showRecords: true,
        });
      app.use(createI18n({ legacy: false, locale: "en-US", messages }));
      app.component("NuxtLink", link);
      app.component("CommercialStatus", records);
      app.component("LearningAccess", learning);
      app.component("CourseContinuation", courseContinuation);
      app.component("RetainedCourses", retainedCourses);
      app.component("RetainedCoursePlayer", retainedPlayer);
      app.mount(ui.root);
      const button = (label) =>
        ui.all().find((n) => n.type === "button" && ui.text(n).trim() === label);
      try {
        await flush();
        const input = ui.all().find((n) => n.props.id === "commercial-current-key");
        input.props["onUpdate:modelValue"](originalKey);
        await input.parent.props.onSubmit({ preventDefault() {} });
        await flush();
        await button(messages["en-US"].ClaimAccess.Prepare).props.onClick();
        await flush();
        ui.all()
          .find((n) => n.type === "input" && n.props.type === "checkbox")
          .props["onUpdate:modelValue"](true);
        await flush();
        await button("Replace key now").props.onClick();
        await flush();
        await button(messages["en-US"].Claims.Load).props.onClick();
        await flush();
        assert.match(ui.text(), /9876/);
        const stored = f.data.get("commercial-access-rotations-v1"),
          barrier = deferred();
        const number = ui.all().find((n) => n.props.id === "commercial-statement-number");
        number.props["onUpdate:modelValue"]("S123");
        await flush();
        f.wait(barrier);
        const loadingDocument = number.parent.props.onSubmit({ preventDefault() {} });
        await flush();
        f.displace();
        await button(messages["en-US"].ClaimAccess.Prepare).props.onClick();
        await flush();
        const cachedVisibleAfter401 = /9876/.test(ui.text());
        barrier.resolve();
        f.wait(null);
        await loadingDocument;
        await flush();
        assert.deepEqual(
          {
            cachedVisibleAfter401,
            staleVisibleAfter200: /9876/.test(ui.text()),
            downloads: downloaded.length,
          },
          { cachedVisibleAfter401: false, staleVisibleAfter200: false, downloads: 0 }
        );
        assert.equal(f.data.get("commercial-access-rotations-v1"), stored);
      } finally {
        app.unmount();
      }
    });
  } finally {
    URL.createObjectURL = oldURL;
    URL.revokeObjectURL = oldRevoke;
  }
});

for (const page of ["../pages/moderation/access.vue", "../pages/moderation/index.vue"]) {
  test(`CA3 actual ${page} preserves its intended default or explicit-false record reader`, async () => {
    await components();
    const f = fixture();
    let ordinaryReads = 0;
    const m = {
      epoch: ref(0),
      recipient: ref(subject),
      scope: ref("rights"),
      rows: ref([]),
      available: ref(true),
      active: ref(true),
      commercialPersonalProof: () => ({ kind: "moderation", secret: "rights-capability", subject }),
      commercialSnapshot: async () => {
        ordinaryReads++;
        return { case: { id: caseId }, obligations: [] };
      },
      commercialStatement: async () => new Blob(),
      importFragment: () => false,
      load: async () => {},
      guard: () => () => true,
    };
    await globals(
      {
        ...browserGlobals(f),
        definePageMeta: () => {},
        useModeration: () => m,
        navigateTo: () => {
          throw Error("Unexpected login prerequisite");
        },
        $fetch: (path, options) =>
          path === "/auth/oauth/providers" ? Promise.resolve([]) : f.options.fetch(path, options),
      },
      async () => {
        const Page = await compileComponent(page),
          ui = host(),
          app = ui.renderer.createApp(Page);
        app.use(createI18n({ legacy: false, locale: "en-US", messages }));
        app.component("NuxtLink", link);
        app.component("CommercialAccess", panel);
        app.component("CommercialStatus", records);
        app.component("LearningAccess", learning);
        app.component("CourseContinuation", courseContinuation);
        app.component("RetainedCourses", retainedCourses);
        app.component("RetainedCoursePlayer", retainedPlayer);
        try {
          app.mount(ui.root);
          await flush();
          const input = ui.all().find((n) => n.props.id === "commercial-current-key");
          input.props["onUpdate:modelValue"](originalKey);
          await input.parent.props.onSubmit({ preventDefault() {} });
          await flush();
          const readers = ui
            .all()
            .filter(
              (n) => n.type === "button" && ui.text(n).trim() === messages["en-US"].Claims.Load
            );
          assert.equal(
            readers.length,
            1,
            "access default shows the claim reader; explicit false leaves only the existing rights-page reader"
          );
          const claimReads = f.calls.filter((r) => r.path.endsWith("/export")).length;
          await readers[0].props.onClick();
          await flush();
          if (page.endsWith("access.vue")) {
            assert.equal(ordinaryReads, 0);
            assert.equal(f.calls.filter((r) => r.path.endsWith("/export")).length, claimReads + 1);
            assert.match(ui.text(), /9876/);
          } else {
            assert.equal(ordinaryReads, 1);
            assert.equal(f.calls.filter((r) => r.path.endsWith("/export")).length, claimReads);
          }
        } finally {
          app.unmount();
        }
      }
    );
  });
}

const learningSubject = "33000000-0000-4000-8000-000000000001";
function learningFixture(empty = false) {
  const data = new Map(),
    calls = [],
    journal = new Map(),
    keys = new Map(),
    historicalSubjects = new Set(empty ? [] : [learningSubject]);
  let ambient = "learning-a",
    identity = "learning-view-a",
    current = originalKey,
    activeSubject = empty ? null : learningSubject,
    fault = null,
    hold = null,
    holdStart = null,
    ttl = 900000;
  const storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
  const fetch = async (path, options) => {
    calls.push({ path, options: structuredClone(options) });
    assert.equal(options.credentials, "omit");
    assert.equal(options.retry, 0);
    assert.equal(Object.keys(options.headers).length, 1);
    if (path === "/shop/learning/resources") {
      assert.equal(options.headers["x-commercial-claim-key"], undefined);
      assert.equal(options.headers["x-moderation-capability"], undefined);
      assert.equal(options.headers.Authorization, undefined);
      const issued = keys.get(options.headers["x-learning-key"]);
      if (
        !issued ||
        issued.revoked ||
        issued.receipt.subject !== activeSubject ||
        Date.parse(issued.receipt.expires_at) <= Date.now()
      )
        throw httpError(401);
      const result = {
        subject: issued.receipt.subject,
        purpose: "retained_learning",
        ordinary_authority: false,
        coins: 123,
        withheld_coins: 4,
        hearts: 6,
        hearts_max: 6,
        last_free_refill: new Date().toISOString(),
        premium: null,
        renewal_activated: false,
        purchase_performed: false,
      };
      if (hold) await hold.promise;
      if (fault === "resources-subject") result.subject = other;
      if (fault === "resources-authority") result.ordinary_authority = true;
      if (fault === "resources-purchase") result.purchase_performed = true;
      if (fault === "resources-unsafe-value") result.coins = Number.MAX_SAFE_INTEGER + 1;
      if (fault === "resources-503") throw httpError(503);
      return result;
    }
    assert.equal(options.headers["x-learning-key"], undefined);
    if (
      !(
        options.headers["x-commercial-claim-key"] === current ||
        options.headers["x-moderation-capability"] === "rights-capability"
      )
    )
      throw httpError(401);
    if (path.endsWith("/export"))
      return { case: { id: caseId, subject, access_epoch: 3 }, obligations: [] };
    if (path.endsWith("/learning_summary"))
      return {
        subjects: [...historicalSubjects].map((subject) => ({
          subject,
          case_id: caseId,
          erased_at: subject === activeSubject ? null : "2026-09-09T00:00:00Z",
          authority_epoch: 2,
        })),
      };
    const start = path === "/shop/claims/recipient/learning_start";
    if (!start) assert.equal(path, "/shop/claims/recipient/learning_access");
    const rows = JSON.parse(
      storage.getItem(start ? "commercial-learning-start-v1" : "commercial-learning-refresh-v1")
    );
    assert(
      rows.some((r) => JSON.stringify(r.record.body) === JSON.stringify(options.body)),
      "original request and key must survive before dispatch"
    );
    if (fault === "before") {
      fault = null;
      throw Error("Synthetic missing reply before acceptance");
    }
    let result = journal.get(options.body.command_id);
    if (result) {
      assert.deepEqual(options.body, result.body);
      assert.equal(result.operation, path);
    } else {
      if (start) {
        assert.equal(options.body.expected_no_active_subject, true);
        assert.equal(options.body.use_retained_value, true);
        assert.equal(options.body.expected_subject, undefined);
        if (activeSubject) throw httpError(409);
        activeSubject = crypto.randomUUID();
        historicalSubjects.add(activeSubject);
      } else if (options.body.expected_subject !== activeSubject) throw httpError(409);
      const receipt = {
        subject: activeSubject,
        expires_at: new Date(Date.now() + ttl).toISOString(),
        purpose: "retained_learning",
        ordinary_authority: false,
        financial_authority: false,
        claims_satisfied: false,
      };
      result = { body: structuredClone(options.body), receipt, operation: path };
      journal.set(options.body.command_id, result);
      keys.set(options.body.key, { receipt, revoked: false });
    }
    if (fault === "after") {
      fault = null;
      throw Error("Synthetic lost committed reply");
    }
    if (start && holdStart) await holdStart.promise;
    const receipt = structuredClone(result.receipt);
    if (fault === "receipt-subject") receipt.subject = other;
    if (fault === "receipt-authority") receipt.financial_authority = true;
    if (fault === "receipt-expiry") receipt.expires_at = "unknown";
    return receipt;
  };
  const commercial = createCommercialAccess({
    fetch,
    storage,
    ambient: () => ambient,
    identity: () => identity,
    personalProof: () => null,
  });
  const options = {
    fetch,
    storage,
    ambient: () => ambient,
    identity: () => `${identity}:${commercial.generation.value}`,
    owner: () => commercial.owner.value,
    summary: commercial.learningSummary,
    refresh: commercial.refreshLearning,
    start: commercial.startLearning,
  };
  const flows = [];
  return {
    data,
    calls,
    journal,
    keys,
    commercial,
    options,
    flow() {
      const flow = createLearningAccess(options);
      flows.push(flow);
      return flow;
    },
    async connect() {
      await commercial.connectKey(current);
    },
    changeSubject(v) {
      activeSubject = v;
      if (v) historicalSubjects.add(v);
    },
    fault(v) {
      fault = v;
    },
    hold(v) {
      hold = v;
    },
    holdStart(v) {
      holdStart = v;
    },
    ttl(v) {
      ttl = v;
    },
    invalidatePersonal() {
      current = laterKey;
    },
    changeOwner() {
      ambient = "learning-b";
      identity = "learning-view-b";
      commercial.clear();
    },
    dispose() {
      flows.forEach((f) => f.dispose());
      commercial.dispose();
    },
  };
}

test("learning refresh saves the exact selected subject before dispatch and verifies actual resources with learning proof only", async () => {
  const f = learningFixture();
  try {
    await f.connect();
    const c = f.flow();
    c.restore();
    await c.loadSubjects();
    assert.deepEqual(c.subjects.value, [learningSubject]);
    await c.prepare(learningSubject);
    const before = JSON.parse(c.recoveryText());
    assert.equal(f.journal.size, 0);
    assert.equal(before.owner.subject, subject);
    assert.equal(before.body.expected_subject, learningSubject);
    assert.equal(before.body.case_id, caseId);
    await c.submit();
    assert.equal(c.resources.value.coins, 123);
    assert.deepEqual(c.pending.value.body, before.body);
    assert.equal(f.journal.size, 1);
    const issuance = f.calls.find((x) => x.path.endsWith("/learning_access"));
    assert.equal(issuance.options.headers["x-commercial-claim-key"], originalKey);
    assert.equal(f.calls.at(-1).options.headers["x-learning-key"], before.body.key);
    assert.equal(c.pending.value.receipt.access_epoch, undefined);
    assert(
      !f.calls.some((x) =>
        /learning_start|learning_revoke|purchase|refill|renewal|\/auth\//.test(x.path)
      )
    );
  } finally {
    f.dispose();
  }
});

for (const stage of ["before", "after"])
  test(`learning lost response ${stage} acceptance preserves exact request through reload and requires personal proof`, async () => {
    const f = learningFixture();
    try {
      await f.connect();
      let c = f.flow();
      await c.prepare(learningSubject);
      const original = JSON.parse(c.recoveryText());
      f.fault(stage);
      await assert.rejects(c.submit());
      const saved = f.data.get("commercial-learning-refresh-v1");
      c.dispose();
      f.commercial.clear();
      c = f.flow();
      assert.throws(() => c.restore(), /proof_required/);
      assert.equal(f.data.get("commercial-learning-refresh-v1"), saved);
      await assert.rejects(f.commercial.connectKey(original.body.key));
      await f.connect();
      c.restore();
      assert.equal(c.resources.value, null);
      await c.submit();
      assert.equal(c.resources.value.subject, learningSubject);
      assert.deepEqual(c.pending.value.body, original.body);
      assert.equal(f.journal.size, 1);
      const bodies = f.calls
        .filter((x) => x.path.endsWith("/learning_access"))
        .map((x) => x.options.body);
      bodies.forEach((b) => assert.deepEqual(b, original.body));
    } finally {
      f.dispose();
    }
  });

test("learning summary changes and server target refusal preserve S1 without selecting or revoking S2", async () => {
  const f = learningFixture();
  try {
    await f.connect();
    const c = f.flow();
    await c.loadSubjects();
    f.changeSubject(other);
    await assert.rejects(c.prepare(learningSubject), /subject_changed/);
    assert.equal(c.pending.value, null);
    assert.equal(f.journal.size, 0);
    f.changeSubject(learningSubject);
    await c.prepare(learningSubject);
    const original = JSON.parse(c.recoveryText());
    f.changeSubject(other);
    await assert.rejects(c.submit(), (e) => e.response.status === 409);
    assert.deepEqual(c.pending.value.body, original.body);
    assert.equal(f.journal.size, 0);
    assert.equal(c.resources.value, null);
  } finally {
    f.dispose();
  }
});

test("learning receipts alone and invalid response scope cannot show resources as usable", async () => {
  for (const fault of [
    "receipt-subject",
    "receipt-authority",
    "receipt-expiry",
    "resources-subject",
    "resources-authority",
    "resources-purchase",
    "resources-unsafe-value",
    "resources-503",
  ]) {
    const f = learningFixture();
    try {
      await f.connect();
      const c = f.flow();
      await c.prepare(learningSubject);
      const original = JSON.parse(c.recoveryText());
      f.fault(fault);
      await assert.rejects(c.submit());
      assert.equal(c.resources.value, null, fault);
      assert.deepEqual(c.pending.value.body, original.body);
      if (fault.startsWith("receipt")) assert(!f.calls.some((x) => x.path.endsWith("/resources")));
    } finally {
      f.dispose();
    }
  }
});

test("learning expiry clears resources and replay keeps original expiry before a deliberate fresh refresh", async () => {
  const f = learningFixture();
  try {
    f.ttl(40);
    await f.connect();
    const c = f.flow();
    await c.prepare(learningSubject);
    await c.submit();
    const original = JSON.parse(c.recoveryText());
    assert(c.resources.value);
    await new Promise((r) => setTimeout(r, 70));
    assert.equal(c.resources.value, null);
    assert.equal(c.error.value, "learning_inactive");
    await assert.rejects(c.submit(), /learning_inactive/);
    assert.equal(f.journal.size, 1);
    assert.deepEqual(c.pending.value.receipt, original.receipt);
    assert(f.commercial.owner.value);
    f.ttl(900000);
    await c.prepare(learningSubject);
    await c.submit();
    assert.equal(f.journal.size, 2);
    assert.notEqual(c.pending.value.body.command_id, original.body.command_id);
    const history = JSON.parse(f.data.get("commercial-learning-refresh-v1"));
    assert.deepEqual(history[0].record.body, original.body);
    assert.equal(c.resources.value.subject, learningSubject);
  } finally {
    f.dispose();
  }
});

test("learning 401 discards its held read but preserves current personal proof and exact refresh history", async () => {
  const f = learningFixture();
  try {
    await f.connect();
    const c = f.flow();
    await c.prepare(learningSubject);
    await c.submit();
    const original = c.recoveryText(),
      wait = deferred();
    f.hold(wait);
    const held = c.verify();
    await flush();
    f.keys.get(c.pending.value.body.key).revoked = true;
    f.hold(null);
    await assert.rejects(c.verify(), (e) => e.response.status === 401);
    wait.resolve();
    await assert.rejects(held, /stale_view/);
    assert.equal(c.resources.value, null);
    assert(f.commercial.owner.value);
    assert.equal(c.recoveryText(), original);
    await c.prepare(learningSubject);
    await c.submit();
    assert(c.resources.value);
  } finally {
    f.dispose();
  }
});

test("personal 401 and owner change invalidate older learning reads without exposing another owner's saved key", async () => {
  for (const change of ["personal401", "owner"]) {
    const f = learningFixture();
    try {
      await f.connect();
      const c = f.flow();
      await c.prepare(learningSubject);
      await c.submit();
      const saved = f.data.get("commercial-learning-refresh-v1"),
        wait = deferred();
      f.hold(wait);
      const held = c.verify();
      await flush();
      if (change === "personal401") {
        f.invalidatePersonal();
        await assert.rejects(f.commercial.snapshot());
      } else f.changeOwner();
      wait.resolve();
      await assert.rejects(held, /stale_view/);
      assert.throws(() => c.recoveryText(), /proof_required/);
      assert.equal(c.resources.value, null);
      assert.equal(f.data.get("commercial-learning-refresh-v1"), saved);
    } finally {
      f.dispose();
    }
  }
});

test("imported learning material needs an owned current proof and server receipt before use", async () => {
  const f = learningFixture();
  try {
    await f.connect();
    let c = f.flow();
    await c.prepare(learningSubject);
    await c.submit();
    const saved = c.recoveryText();
    c.dispose();
    c = f.flow();
    c.importRecovery(saved);
    assert.equal(c.resources.value, null);
    await assert.rejects(c.verify(), /receipt_unconfirmed/);
    await c.submit();
    assert(c.resources.value);
    const foreign = JSON.parse(saved);
    foreign.owner.subject = other;
    assert.throws(() => c.importRecovery(JSON.stringify(foreign)), /owner_changed/);
    assert.equal(c.recoveryText(), saved);
  } finally {
    f.dispose();
  }
});

test("mounted commercial panel exposes actual learning refresh, resource recheck and personal-proof invalidation in both languages", async () => {
  await components();
  for (const language of ["en-US", "de"]) {
    const f = learningFixture(),
      downloads = [];
    class LearningURL extends URL {
      static createObjectURL(blob) {
        downloads.push(blob);
        return "blob:synthetic-learning";
      }
      static revokeObjectURL() {}
    }
    const globalsForLearning = {
      URL: LearningURL,
      ...browserGlobals({ options: { ...f.options, ambient: f.options.ambient } }),
      $fetch: f.options.fetch,
    };
    await globals(globalsForLearning, async () => {
      const ui = host(),
        app = ui.renderer.createApp({
          render: () => h(panel, { identity: "view-a", personalProof: () => null }),
        });
      app.use(createI18n({ legacy: false, locale: language, messages }));
      app.component("NuxtLink", link);
      app.component("CommercialStatus", records);
      app.component("LearningAccess", learning);
      app.component("CourseContinuation", courseContinuation);
      app.component("RetainedCourses", retainedCourses);
      app.component("RetainedCoursePlayer", retainedPlayer);
      const texts = messages[language];
      app.mount(ui.root);
      try {
        await flush();
        const input = ui.all().find((n) => n.props.id === "commercial-current-key");
        input.props["onUpdate:modelValue"](originalKey);
        await input.parent.props.onSubmit({ preventDefault() {} });
        await flush();
        const button = (label) =>
          ui.all().find((n) => n.type === "button" && ui.text(n).trim() === label);
        assert.match(ui.text(), new RegExp(texts.LearningAccess.Title));
        await button(texts.LearningAccess.Find).props.onClick();
        await flush();
        await button(texts.LearningAccess.Prepare).props.onClick();
        await flush();
        assert.equal(button(texts.LearningAccess.Issue).props.disabled, true);
        await button(texts.LearningAccess.Save).props.onClick();
        assert.equal(downloads.length, 1);
        const downloaded = JSON.parse(await downloads[0].text());
        assert.equal(downloaded.body.expected_subject, learningSubject);
        assert.equal(f.journal.size, 0);
        const section = ui
          .all()
          .find((n) => n.props["aria-labelledby"] === "learning-access-title");
        const checkbox = ui
          .all(section)
          .find((n) => n.type === "input" && n.props.type === "checkbox");
        checkbox.props["onUpdate:modelValue"](true);
        await flush();
        await button(texts.LearningAccess.Issue).props.onClick();
        await flush();
        assert.match(ui.text(), new RegExp(texts.LearningAccess.Available));
        assert.match(ui.text(), /123/);
        assert(
          ui.all().some((n) => n.props["aria-labelledby"] === "retained-courses-title"),
          "current courses remain reachable without a technical disclaimer"
        );
        const key = [...f.keys.keys()][0];
        f.keys.get(key).revoked = true;
        await button(texts.LearningAccess.Check).props.onClick();
        await flush();
        assert(!ui.text().includes(texts.LearningAccess.Available));
        assert(ui.text().includes(texts.LearningAccess.Expired));
        assert(
          ui.text().includes(texts.ClaimAccess.Prepare),
          "learning loss keeps personal access usable"
        );
        f.invalidatePersonal();
        await button(texts.LearningAccess.Find).props.onClick();
        await flush();
        assert(!ui.all().some((n) => n.props["aria-labelledby"] === "learning-access-title"));
        assert(ui.text().includes(texts.ClaimAccess.Error.proof_required));
        assert(f.data.get("commercial-learning-refresh-v1"));
      } finally {
        app.unmount();
        f.dispose();
      }
    });
  }
});

test("late foreign learning 401 cannot clear a deliberately reconnected current view", async () => {
  const f = learningFixture();
  try {
    await f.connect();
    const c = f.flow();
    await c.prepare(learningSubject);
    await c.submit();
    let reject;
    const promise = new Promise((_resolve, r) => {
      reject = r;
    });
    f.hold({ promise });
    const held = c.verify();
    await flush();
    c.clear();
    await f.connect();
    c.restore();
    f.hold(null);
    await c.submit();
    const current = c.resources.value;
    reject(httpError(401));
    await assert.rejects(held, (e) => e.response.status === 401);
    assert.equal(c.resources.value, current);
    assert(f.commercial.owner.value);
  } finally {
    f.dispose();
  }
});

test("learning preparation cannot dispatch when recovery storage fails", async () => {
  const f = learningFixture();
  try {
    await f.connect();
    const c = f.flow();
    f.options.storage.setItem = () => {
      throw Error("Synthetic storage unavailable");
    };
    await assert.rejects(c.prepare(learningSubject), /storage unavailable/);
    assert.equal(c.pending.value, null);
    assert.equal(f.journal.size, 0);
    assert(!f.calls.some((x) => x.path.endsWith("/learning_access")));
  } finally {
    f.dispose();
  }
});

test("start requires explicit empty-summary preparation and saves its guarded operation before dispatch", async () => {
  const f = learningFixture(true);
  try {
    await f.connect();
    const c = f.flow();
    c.restore();
    assert.equal(c.summaryLoaded.value, false);
    assert.equal(f.journal.size, 0);
    await c.loadSubjects();
    assert.deepEqual(c.subjects.value, []);
    assert.equal(f.journal.size, 0);
    await c.prepareStart();
    const saved = JSON.parse(c.recoveryText());
    assert.equal(saved.version, 2);
    assert.equal(saved.operation, "learning_start");
    assert.equal(saved.body.expected_no_active_subject, true);
    assert.equal(saved.body.use_retained_value, true);
    assert.equal(saved.body.expected_subject, undefined);
    assert.equal(saved.owner.case_id, caseId);
    assert.equal(f.journal.size, 0);
    await c.submit();
    const start = f.calls.find((call) => call.path.endsWith("/learning_start"));
    assert.deepEqual(start.options.body, saved.body);
    assert.equal(start.options.headers["x-commercial-claim-key"], originalKey);
    assert.equal(c.resources.value.subject, c.pending.value.receipt.subject);
    assert(f.calls.filter((call) => call.path.endsWith("/learning_summary")).length >= 3);
    assert(
      !f.calls.some((call) => /purchase|\/elect$|renewal|\/auth\/|learning_revoke/.test(call.path))
    );
    const startBody = structuredClone(saved.body);
    await c.prepare(c.resources.value.subject);
    assert.equal(c.pending.value.version, 1);
    const refresh = JSON.parse(c.recoveryText());
    const reloaded = f.flow();
    reloaded.restore();
    assert.deepEqual(JSON.parse(reloaded.recoveryText()), refresh);
    assert.deepEqual(
      JSON.parse(f.data.get("commercial-learning-start-v1"))[0].record.body,
      startBody
    );
  } finally {
    f.dispose();
  }
});

for (const stage of ["before", "after"]) {
  test(`start lost response ${stage} simulated commitment restores and replays the original operation`, async () => {
    const f = learningFixture(true);
    try {
      await f.connect();
      const c = f.flow();
      await c.prepareStart();
      const download = c.recoveryText();
      f.fault(stage);
      await assert.rejects(c.submit(), /reply/);
      const body = JSON.parse(c.recoveryText()).body;
      const reloaded = f.flow();
      reloaded.restore();
      reloaded.importRecovery(download);
      assert.equal(reloaded.resources.value, null);
      await assert.rejects(reloaded.verify(), /receipt_unconfirmed/);
      await reloaded.submit();
      assert.equal(reloaded.pending.value.operation, "learning_start");
      assert.equal(f.journal.size, 1);
      assert.deepEqual(
        f.calls
          .filter((call) => call.path.endsWith("/learning_start"))
          .map((call) => call.options.body),
        [body, body]
      );
      assert.equal(reloaded.resources.value.subject, reloaded.pending.value.receipt.subject);
    } finally {
      f.dispose();
    }
  });
}

for (const change of ["active", "erased-and-replaced"]) {
  test(`start refuses ${change} intervening access and requires explicit separate refresh selection`, async () => {
    const f = learningFixture(true);
    try {
      await f.connect();
      const c = f.flow();
      await c.prepareStart();
      const original = JSON.parse(c.recoveryText()).body;
      if (change === "erased-and-replaced") {
        f.changeSubject(learningSubject);
        f.changeSubject(null);
      }
      f.changeSubject(other);
      await assert.rejects(c.submit(), (error) => error.response.status === 409);
      assert.equal(c.pending.value.state, "refused");
      assert.equal(c.resources.value, null);
      assert.deepEqual(c.pending.value.body, original);
      assert.equal(f.journal.size, 0);
      assert(!f.calls.some((call) => call.path.endsWith("/learning_access")));
      await c.loadSubjects();
      await c.prepare(other);
      assert.equal(c.pending.value.version, 1);
      assert.equal(c.pending.value.body.expected_subject, other);
      assert.notEqual(c.pending.value.body.command_id, original.command_id);
      await c.submit();
      assert.equal(c.resources.value.subject, other);
      assert.deepEqual(
        JSON.parse(f.data.get("commercial-learning-start-v1"))[0].record.body,
        original
      );
    } finally {
      f.dispose();
    }
  });
}

test("start tests current absence after intervening erasure and preserves historical replay after replacement", async () => {
  const f = learningFixture(true);
  try {
    await f.connect();
    const c = f.flow();
    await c.prepareStart();
    f.changeSubject(other);
    f.changeSubject(null);
    await c.submit();
    const original = JSON.parse(c.recoveryText());
    assert.notEqual(original.receipt.subject, other);
    f.changeSubject(null);
    f.changeSubject(learningSubject);
    const generation = c.generation.value;
    await c.loadSubjects();
    assert.equal(c.resources.value, null, "A current owned summary removes the old learning view");
    assert(c.generation.value > generation);
    const reloaded = f.flow();
    reloaded.restore();
    await assert.rejects(reloaded.submit(), /learning_inactive/);
    assert.deepEqual(reloaded.pending.value.receipt, original.receipt);
    assert.equal(reloaded.resources.value, null);
    assert.equal(f.journal.size, 1);
    assert.equal(f.keys.size, 1);
    assert(
      f.calls
        .filter((call) => call.path.endsWith("/learning_start"))
        .every((call) => JSON.stringify(call.options.body) === JSON.stringify(original.body))
    );
  } finally {
    f.dispose();
  }
});

test("start expired receipt replay cannot renew its original expiry or expose resources", async () => {
  const f = learningFixture(true);
  try {
    await f.connect();
    const c = f.flow();
    await c.prepareStart();
    f.ttl(-1);
    await assert.rejects(c.submit(), /learning_inactive/);
    const receipt = JSON.parse(c.recoveryText()).receipt;
    await assert.rejects(c.submit(), /learning_inactive/);
    assert.deepEqual(c.pending.value.receipt, receipt);
    assert.equal(f.keys.size, 1);
    assert.equal(c.resources.value, null);
    assert(!f.calls.some((call) => call.path === "/shop/learning/resources"));
  } finally {
    f.dispose();
  }
});

test("start rejects malformed or foreign receipts before recording usable access", async () => {
  for (const fault of ["receipt-subject", "receipt-authority", "receipt-expiry"]) {
    const f = learningFixture(true);
    try {
      await f.connect();
      const c = f.flow();
      await c.prepareStart();
      f.fault(fault);
      await assert.rejects(c.submit(), /invalid_response/);
      assert.equal(c.resources.value, null);
      assert.equal(c.pending.value.receipt, undefined);
      f.fault(null);
      await c.submit();
      assert.equal(f.journal.size, 1);
      assert(c.resources.value);
    } finally {
      f.dispose();
    }
  }
});

test("start storage failures prevent dispatch at both preparation and final submission", async () => {
  for (const phase of ["prepare", "submit"]) {
    const f = learningFixture(true);
    try {
      await f.connect();
      const c = f.flow();
      if (phase === "submit") await c.prepareStart();
      f.options.storage.setItem = () => {
        throw Error("Synthetic storage unavailable");
      };
      await assert.rejects(
        phase === "prepare" ? c.prepareStart() : c.submit(),
        /storage unavailable/
      );
      assert(!f.calls.some((call) => call.path.endsWith("/learning_start")));
      assert.equal(f.journal.size, 0);
    } finally {
      f.dispose();
    }
  }
});

test("start matching personal401 and a held prior-owner receipt cannot authenticate a new view", async () => {
  for (const phase of ["personal401", "held"]) {
    const f = learningFixture(true);
    try {
      await f.connect();
      const c = f.flow();
      await c.prepareStart();
      const original = JSON.parse(c.recoveryText()).body;
      if (phase === "personal401") {
        f.invalidatePersonal();
        await assert.rejects(c.submit(), (error) => error.response.status === 401);
      } else {
        const hold = deferred();
        f.holdStart(hold);
        const pending = c.submit();
        await new Promise((resolve) => setImmediate(resolve));
        f.changeOwner();
        hold.resolve();
        await assert.rejects(pending, /stale_view/);
      }
      assert.equal(c.resources.value, null);
      assert.equal(f.commercial.owner.value, null);
      assert.deepEqual(
        JSON.parse(f.data.get("commercial-learning-start-v1"))[0].record.body,
        original
      );
      assert(!f.calls.some((call) => call.path === "/shop/learning/resources"));
    } finally {
      f.dispose();
    }
  }
});

test("v1 refresh refusal after target erasure permits explicit creation while unknown outcomes remain blocked", async () => {
  for (const response of ["409", "unknown"]) {
    const f = learningFixture();
    try {
      await f.connect();
      const c = f.flow();
      await c.prepare(learningSubject);
      const oldFile = c.recoveryText(),
        old = JSON.parse(oldFile);
      f.changeSubject(null);
      if (response === "unknown") f.fault("before");
      await assert.rejects(c.submit());
      assert.deepEqual(c.pending.value.body, old.body);
      const reloaded = f.flow();
      reloaded.restore();
      if (response === "unknown") {
        assert.equal(reloaded.pending.value.state, "unconfirmed");
        await assert.rejects(reloaded.prepareStart(), /pending_request/);
      } else {
        assert.equal(reloaded.pending.value.state, "refused");
        assert.equal(f.journal.size, 0);
        await reloaded.loadSubjects();
        await reloaded.prepareStart();
        assert.equal(reloaded.pending.value.version, 2);
        assert.notEqual(reloaded.pending.value.body.command_id, old.body.command_id);
        assert(!f.calls.some((call) => call.path.endsWith("/learning_start")));
        await reloaded.submit();
        assert.equal(f.journal.size, 1);
        assert(reloaded.resources.value);
        assert.deepEqual(
          JSON.parse(f.data.get("commercial-learning-refresh-v1"))[0].record.body,
          old.body
        );
        assert.equal(oldFile, JSON.stringify(old, null, 2));
      }
    } finally {
      f.dispose();
    }
  }
});

test("mounted explicit creation in both languages requires saved-file acknowledgment before the guarded request", async () => {
  await components();
  for (const language of ["en-US", "de"]) {
    const f = learningFixture(true),
      downloads = [];
    class StartURL extends URL {
      static createObjectURL(blob) {
        downloads.push(blob);
        return "blob:synthetic-start";
      }
      static revokeObjectURL() {}
    }
    await globals(
      {
        URL: StartURL,
        ...browserGlobals({ options: { ...f.options, ambient: f.options.ambient } }),
        $fetch: f.options.fetch,
      },
      async () => {
        const ui = host(),
          app = ui.renderer.createApp({
            render: () => h(panel, { identity: "view-a", personalProof: () => null }),
          });
        app.use(createI18n({ legacy: false, locale: language, messages }));
        for (const [name, component] of Object.entries({
          NuxtLink: link,
          CommercialStatus: records,
          LearningAccess: learning,
          RetainedCourses: retainedCourses,
          RetainedCoursePlayer: retainedPlayer,
        }))
          app.component(name, component);
        app.mount(ui.root);
        const texts = messages[language].LearningAccess;
        const button = (label) =>
          ui.all().find((node) => node.type === "button" && ui.text(node).trim() === label);
        try {
          await flush();
          const input = ui.all().find((node) => node.props.id === "commercial-current-key");
          input.props["onUpdate:modelValue"](originalKey);
          await input.parent.props.onSubmit({ preventDefault() {} });
          await flush();
          assert.equal(button(texts.PrepareStart), undefined);
          assert.equal(f.journal.size, 0);
          await button(texts.Find).props.onClick();
          await flush();
          assert.equal(f.journal.size, 0);
          await button(texts.PrepareStart).props.onClick();
          await flush();
          assert.equal(button(texts.Create).props.disabled, true);
          assert.equal(f.journal.size, 0);
          await button(texts.Save).props.onClick();
          const saved = JSON.parse(await downloads[0].text());
          assert.equal(saved.operation, "learning_start");
          assert.equal(saved.body.expected_no_active_subject, true);
          const section = ui
            .all()
            .find((node) => node.props["aria-labelledby"] === "learning-access-title");
          ui.all(section)
            .find((node) => node.type === "input" && node.props.type === "checkbox")
            .props["onUpdate:modelValue"](true);
          await flush();
          await button(texts.Create).props.onClick();
          await flush();
          assert(ui.text().includes(texts.Available));
          assert.equal(f.journal.size, 1);
          assert(
            ui.all().some((node) => node.props["aria-labelledby"] === "retained-courses-title")
          );
          assert.deepEqual(
            f.calls.find((call) => call.path.endsWith("/learning_start")).options.body,
            saved.body
          );
        } finally {
          app.unmount();
          f.dispose();
        }
      }
    );
  }
});

test("new signup requires explicit form confirmation and sends the current r2 version", async () => {
  await components();
  const terms = await moduleFrom("../composables/terms.ts"),
    Signup = await compileComponent("../components/form/Signup.vue"),
    requests = [],
    notices = [];
  await globals(
    {
      ...Vue,
      TERMS_VERSION: terms.TERMS_VERSION,
      getRegisterToken: () => null,
      useRouter: () => ({ push: () => assert.fail("no successful signup navigation") }),
      openSnackbar: (...args) => notices.push(args),
      signup: async (body) => {
        requests.push(structuredClone(body));
        return [null, { detail: "synthetic refusal" }];
      },
    },
    async () => {
      const ui = host(),
        app = ui.renderer.createApp(Signup);
      app.use(createI18n({ legacy: false, locale: "en-US", messages }));
      for (const name of ["Input", "InputCheckbox", "InputBtn", "NuxtLink"])
        app.component(name, {
          setup:
            (_props, { slots }) =>
            () =>
              h("span", slots.default?.()),
        });
      const vm = app.mount(ui.root);
      try {
        ui.all().find((node) => node.type === "form").reportValidity = () => true;
        for (const [name, value] of Object.entries({
          name: "synthetic",
          display_name: "Synthetic",
          email: "synthetic@example.invalid",
          password: "Synthetic123",
        })) {
          vm.form[name].value = value;
          vm.form[name].valid = true;
        }
        await vm.onclickSubmitForm();
        assert.equal(requests.length, 0, "unchecked terms and age do not dispatch");
        for (const name of ["termsAndConditions", "ageConfirmed"]) {
          vm.form[name].value = true;
          vm.form[name].valid = true;
        }
        await vm.onclickSubmitForm();
        assert.equal(requests.length, 1);
        assert.equal(requests[0].terms_version, "2026-09-r3");
        assert.equal(requests[0].age_confirmed, true);
        assert.equal(requests[0].email, "synthetic@example.invalid");
        assert(!Object.hasOwn(requests[0], "termsAndConditions"));
        assert.equal(vm.form.submitting, false);
      } finally {
        app.unmount();
      }
    }
  );
});
