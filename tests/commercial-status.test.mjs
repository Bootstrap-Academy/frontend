import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "typescript";
import {
  computed,
  createRenderer,
  effectScope,
  h,
  nextTick,
  onScopeDispose,
  reactive,
  ref,
} from "vue";
import { createI18n } from "vue-i18n";
import {
  commercialSnapshot,
  commercialStatementPath,
  commercialUnits,
  createCommercialReader,
} from "../composables/commercialStatus.ts";

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((ok, fail) => ((resolve = ok), (reject = fail)));
  return { promise, resolve, reject };
};

test("record view distinguishes receipt-only, missing evidence and unsupported data", () => {
  assert.equal(commercialSnapshot({}).case, null);
  const value = commercialSnapshot({ erasure_intake: { id: "receipt", received_at: null } });
  assert.equal(value.erasure_intake.id, "receipt");
  assert.deepEqual(value.obligations, []);
  assert.throws(() => commercialSnapshot({ obligations: "unavailable" }));
  assert.throws(() => commercialSnapshot(null));
  assert.equal(commercialUnits(null), null);
  assert.equal(commercialUnits(0), "0");
  assert.equal(commercialUnits(Number.MAX_SAFE_INTEGER + 1), null);
});

test("statement identifiers preserve the u64 numeric contract without number rounding", () => {
  assert.equal(commercialStatementPath("S123"), "/documents/final-statement/123/original");
  assert.equal(
    commercialStatementPath("S18446744073709551615"),
    "/documents/final-statement/18446744073709551615/original"
  );
  for (const value of ["123", "S", "S01", "S-1", "R123", "S18446744073709551616", "S123/0"])
    assert.equal(commercialStatementPath(value), null, value);
});

test("the actual recipient helper sends only the numeric original endpoint", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bootstrap-l3-ui-transport-"));
  const names = [
    "useState",
    "onScopeDispose",
    "computed",
    "getAccessToken",
    "useRuntimeConfig",
    "$fetch",
  ];
  const originals = new Map(
    names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
  );
  const scope = effectScope();
  try {
    const source = await readFile(new URL("../composables/moderation.ts", import.meta.url), "utf8");
    const code = ts
      .transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      })
      .outputText.replace(
        'from "./commercialStatus"',
        `from ${JSON.stringify(new URL("../composables/commercialStatus.ts", import.meta.url).href)}`
      );
    const path = join(dir, "moderation.mjs");
    await writeFile(path, code);
    const { useModeration } = await import(pathToFileURL(path));
    const states = new Map(),
      calls = [],
      bytes = "%PDF-1.4 exact synthetic archived bytes";
    Object.assign(globalThis, {
      useState: (name, initialize) => {
        if (!states.has(name)) states.set(name, ref(initialize()));
        return states.get(name);
      },
      onScopeDispose,
      computed,
      getAccessToken: () => "synthetic-ordinary-read-proof",
      useRuntimeConfig: () => ({ public: { BASE_API_URL: "https://synthetic-ui.invalid" } }),
      $fetch: async (path, options) => {
        calls.push({ path, options });
        return new Blob([bytes], { type: "application/pdf" });
      },
    });
    const reader = scope.run(() => useModeration());
    const blob = await reader.commercialStatement("S123");
    assert.equal(calls[0].path, "/shop/claims/documents/final-statement/123/original");
    assert.equal(calls[0].options.credentials, "omit");
    assert.equal(calls[0].options.retry, 0);
    assert.equal(await blob.text(), bytes);
    await reader.commercialStatement("S18446744073709551615");
    assert.equal(
      calls[1].path,
      "/shop/claims/documents/final-statement/18446744073709551615/original"
    );
    assert.throws(() => reader.commercialStatement("R123"));
    assert.equal(calls.length, 2, "invalid document kinds never call the reader");
    await reader.commercialSnapshot();
    assert.equal(calls[2].path, "/shop/claims/recipient/export");
    assert.equal(calls[2].options.method, "POST");
    assert.deepEqual(calls[2].options.body, {});
  } finally {
    scope.stop();
    for (const [name, descriptor] of originals)
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    await rm(dir, { recursive: true, force: true });
  }
});

test("owner changes and late refreshes cannot repopulate a cleared view", async () => {
  let owner = "a";
  const first = deferred(),
    second = deferred();
  const replies = [first, second];
  const reader = createCommercialReader(
    () => replies.shift().promise,
    () => owner
  );
  const oldLoad = reader.load();
  owner = "b";
  reader.clear();
  const currentLoad = reader.load();
  second.resolve({ case: { id: "b" }, obligations: [] });
  await currentLoad;
  first.resolve({ case: { id: "a" }, obligations: [] });
  await oldLoad;
  assert.equal(reader.data.value.case.id, "b");
  reader.clear();
  assert.equal(reader.data.value, null);
  assert.equal(reader.state.value, "idle");
});

test("actual Vue component renders recorded states, errors and original downloads", async () => {
  // In-memory Vue host: no web server, browser network or application runtime.
  const dir = await mkdtemp(join(tmpdir(), "bootstrap-l3-ui-render-"));
  let app;
  const previousDocument = globalThis.document;
  const previousDocumentClass = globalThis.Document,
    previousShadowRoot = globalThis.ShadowRoot;
  const previousCreate = URL.createObjectURL,
    previousRevoke = URL.revokeObjectURL;
  const downloaded = [];
  try {
    const source = await readFile(
      new URL("../components/CommercialStatus.vue", import.meta.url),
      "utf8"
    );
    const { descriptor } = parse(source);
    const compiled = compileScript(descriptor, {
      id: "commercial-status-test",
      inlineTemplate: true,
    });
    let code = ts.transpileModule(compiled.content, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText;
    for (const dependency of ["vue", "vue-i18n"])
      code = code.replace(
        new RegExp(`from ["']${dependency}["']`, "g"),
        `from ${JSON.stringify(import.meta.resolve(dependency))}`
      );
    code = code.replaceAll(
      'from "../composables/commercialStatus"',
      `from ${JSON.stringify(new URL("../composables/commercialStatus.ts", import.meta.url).href)}`
    );
    const filename = join(dir, "component.mjs");
    await writeFile(filename, code);
    const Component = (await import(pathToFileURL(filename))).default;
    const node = (type, text = "") => ({
      type,
      text,
      props: {},
      children: [],
      parent: null,
      addEventListener() {},
      getRootNode: () => globalThis.document,
    });
    const detach = (item) => {
      if (item.parent) item.parent.children.splice(item.parent.children.indexOf(item), 1);
    };
    const renderer = createRenderer({
      createElement: node,
      createText: (text) => node("text", text),
      createComment: (text) => node("comment", text),
      setText: (item, text) => (item.text = text),
      setElementText: (item, text) => {
        item.text = text;
        item.children = [];
      },
      patchProp: (item, key, _old, value) => (item.props[key] = value),
      insert: (item, parent, anchor = null) => {
        detach(item);
        item.parent = parent;
        parent.children.splice(
          anchor ? parent.children.indexOf(anchor) : parent.children.length,
          0,
          item
        );
      },
      remove: detach,
      parentNode: (item) => item.parent,
      nextSibling: (item) => item.parent?.children[item.parent.children.indexOf(item) + 1],
    });
    const root = node("root");
    const all = (item = root) => [item, ...item.children.flatMap((child) => all(child))];
    const text = (item = root) =>
      [item.type === "comment" ? "" : item.text, ...item.children.map((child) => text(child))].join(
        " "
      );
    const flush = async () => {
      await Promise.resolve();
      await nextTick();
    };
    let response = {},
      fail = false,
      held;
    const requests = [],
      originals = [];
    const props = reactive({
      identity: "owner-a",
      read: async () => {
        requests.push(props.identity);
        if (fail) throw Error("Unavailable");
        return held ? held.promise : response;
      },
      original: async (number) => {
        originals.push(number);
        return new Blob(["%PDF-1.4 synthetic original"], { type: "application/pdf" });
      },
    });
    const messages = JSON.parse(
      await readFile(new URL("../locales/en-US.json", import.meta.url), "utf8")
    );
    const german = JSON.parse(
      await readFile(new URL("../locales/de.json", import.meta.url), "utf8")
    );
    globalThis.Document = class {};
    globalThis.ShadowRoot = class {};
    globalThis.document = {
      activeElement: null,
      createElement: () => ({
        click() {
          downloaded.push(this.download);
        },
      }),
    };
    app = renderer.createApp({ render: () => h(Component, { ...props }) });
    const i18n = createI18n({
      legacy: false,
      locale: "en-US",
      messages: { "en-US": messages, de: german },
    });
    app.use(i18n);
    app.mount(root);
    const load = async () => {
      all()
        .find((item) => item.type === "button" && text(item).includes("Load recorded"))
        .props.onClick();
      await flush();
    };
    assert.equal(
      requests.length,
      0,
      "opening the component does not call a transaction or even load automatically"
    );
    await load();
    assert.match(text(), /No accounting case/);
    response = {
      case: { id: "case-a", closed_at: "2026-09-01" },
      erasure_intake: { id: "receipt-a", received_at: "2026-09-01T10:00:00Z" },
      obligations: [{ id: "item-a", units: null, status: "pending_evidence" }],
      reservations: [
        { id: "reserve-a", obligation_id: "item-a", units: 700, state: "uncertain", mode: "cash" },
        {
          id: "reserve-b",
          obligation_id: "item-a",
          units: 300,
          state: "completed",
          mode: "wallet",
        },
      ],
    };
    await load();
    assert.match(text(), /receipt-a/);
    assert.match(text(), /Evidence or assessment still pending/);
    assert.match(text(), /Settlement outcome uncertain/);
    assert.match(text(), /payment evidence is separate/);
    assert.match(text(), /reserve-a/);
    assert.match(text(), /Cash refund/);
    assert.match(text(), /Wallet credit/);
    assert.match(text(), /Not established/);
    assert.doesNotMatch(text(), /Paid in full|No claims exist/);
    response.reservations = [
      { id: "parent-700", obligation_id: "item-a", units: 700, state: "split", mode: "cash" },
      {
        id: "child-200",
        parent_id: "parent-700",
        obligation_id: "item-a",
        units: 200,
        state: "completed",
        mode: "cash",
      },
      {
        id: "child-500",
        parent_id: "parent-700",
        obligation_id: "item-a",
        units: 500,
        state: "uncertain",
        mode: "cash",
      },
    ];
    response.cash_payments = [
      { id: "payment-200", external_reference: "provider-reference-200", units: 200 },
    ];
    response.cash_allocations = [
      { reservation_id: "child-200", payment_id: "payment-200", units: 200 },
    ];
    await load();
    assert.match(text(), /parent is history, not an additional amount held or paid/);
    assert.match(text(), /Original partitioned reservation: parent-700/);
    assert.match(text(), /Recorded payment in euro cents: 200/);
    assert.match(text(), /provider-reference-200/);
    assert.match(text(), /other parts can remain open/);
    assert.doesNotMatch(text(), /Paid in full|No claims exist/);
    fail = true;
    await load();
    assert.match(text(), /could not be loaded/);
    assert.doesNotMatch(text(), /receipt-a/);
    fail = false;
    held = deferred();
    await load();
    assert.match(text(), /Loading/);
    props.identity = "owner-b";
    await flush();
    held.resolve(response);
    await flush();
    assert.doesNotMatch(text(), /receipt-a/);

    globalThis.document = {
      createElement: () => ({
        click() {
          downloaded.push(this.download);
        },
      }),
    };
    URL.createObjectURL = () => "blob:synthetic-original";
    URL.revokeObjectURL = () => {};
    const input = all().find((item) => item.type === "input");
    input.props["onUpdate:modelValue"]("S123");
    await flush();
    const form = all().find((item) => item.type === "form");
    form.props.onSubmit({ preventDefault() {} });
    await flush();
    assert.deepEqual(originals, ["S123"]);
    assert.deepEqual(downloaded, ["final-statement-S123.pdf"]);
    props.original = async () => {
      throw Error("Original unavailable");
    };
    await flush();
    form.props.onSubmit({ preventDefault() {} });
    await flush();
    assert.match(text(), /No replacement file was generated/);
    assert.equal(downloaded.length, 1);
    for (const blob of [
      new Blob(["Unavailable"], { type: "text/plain" }),
      new Blob([], { type: "application/pdf" }),
    ]) {
      props.original = async () => blob;
      await flush();
      form.props.onSubmit({ preventDefault() {} });
      await flush();
      assert.match(text(), /No replacement file was generated/);
      assert.equal(downloaded.length, 1);
    }
    const pendingOriginal = deferred();
    props.original = () => pendingOriginal.promise;
    await flush();
    form.props.onSubmit({ preventDefault() {} });
    await flush();
    props.identity = "owner-c";
    await flush();
    pendingOriginal.resolve(new Blob(["%PDF-1.4"], { type: "application/pdf" }));
    await flush();
    assert.equal(downloaded.length, 1, "a late previous-owner original does not download");
    assert.equal(all().find((item) => item.type === "input").value, "");
    held = null;
    await load();
    i18n.global.locale.value = "de";
    await flush();
    assert.match(text(), /Abrechnung und offene Ansprüche/);
    assert.match(text(), /Ergebnis der Abwicklung ungewiss/);
    assert.match(text(), /zum Beispiel S123/);
    const afterUnmount = deferred();
    props.original = () => afterUnmount.promise;
    input.props["onUpdate:modelValue"]("S234");
    await flush();
    form.props.onSubmit({ preventDefault() {} });
    await flush();
    app.unmount();
    app = null;
    afterUnmount.resolve(new Blob(["%PDF-1.4"], { type: "application/pdf" }));
    await flush();
    assert.equal(downloaded.length, 1, "closed views cannot download a later response");
  } finally {
    app?.unmount();
    globalThis.document = previousDocument;
    globalThis.Document = previousDocumentClass;
    globalThis.ShadowRoot = previousShadowRoot;
    URL.createObjectURL = previousCreate;
    URL.revokeObjectURL = previousRevoke;
    await rm(dir, { recursive: true, force: true });
  }
});
