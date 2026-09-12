import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { compileScript, compileTemplate, parse } from "@vue/compiler-sfc";
import ts from "typescript";
import { computed, createRenderer, h, nextTick, reactive, ref, watch, onMounted } from "vue";
import { createI18n } from "vue-i18n";
import { createEventCancellation } from "../composables/eventCancellation.ts";

const target = (role = "participant", scope = "booking") => ({
  id: "target-original",
  event_id: "event",
  kind: "webinar",
  scope,
  role,
  title: "Original scheduled session",
  start: "2026-10-12T12:00:00Z",
  end: "2026-10-12T13:00:00Z",
  affected_orders: scope === "session" ? 3 : 1,
  recorded_paid_coins: 42,
  payment_evidence_complete: true,
});
const receipt = (attempt, state = "received", financial = "not_assessed") => ({
  command_id: attempt.command,
  target: attempt.target,
  declaration: attempt.statement,
  origin: "ordinary_authenticated",
  received_at: "2026-09-09T12:34:56.123456+00:00",
  state,
  financial_state: financial,
  financial_satisfaction: false,
  booking_changed: state === "applied",
  notice_state: "pending",
});
function fixture(kind = "webinar", scope = "auto") {
  let owner = "owner-a",
    fail = false,
    outcome = "received",
    prepared = target();
  const saved = new Map(),
    calls = [];
  const options = {
    owner: () => owner,
    event: "event",
    kind,
    scope,
    uuid: () => "stable-command",
    read: (key) => saved.get(key) ?? null,
    save: (key, value) => saved.set(key, structuredClone(JSON.parse(JSON.stringify(value)))),
    post: async (path, body) => {
      calls.push({ path, body: JSON.parse(JSON.stringify(body)) });
      if (path.endsWith("cancellation-target")) return prepared;
      assert.equal(saved.size, 1, "original attempt saved before declaration POST");
      if (fail) throw Error("response lost");
      return receipt([...saved.values()][0], outcome);
    },
    get: async (path) => {
      calls.push({ path });
      return receipt([...saved.values()][0], outcome);
    },
  };
  return {
    options,
    saved,
    calls,
    setOwner: (v) => (owner = v),
    setFail: (v) => (fail = v),
    setOutcome: (v) => (outcome = v),
    setTarget: (v) => (prepared = v),
  };
}
for (const kind of ["webinar", "coaching"])
  test(`${kind}: preparation alone makes no declaration; retry keeps exact original command/body across remount`, async () => {
    const f = fixture(kind),
      flow = createEventCancellation(f.options);
    await flow.open();
    assert.deepEqual(f.calls[0].body, { kind, scope: "auto" });
    assert.equal(f.saved.size, 0);
    f.setFail(true);
    await flow.submit(" Exact confirmed statement. ");
    const first = f.calls.at(-1);
    assert.equal(flow.failed.value, true);
    f.setTarget({ ...target(), id: "replacement" });
    const reopened = createEventCancellation(f.options);
    await reopened.open(true);
    assert.equal(reopened.target.value.id, "target-original");
    assert.equal(f.calls.length, 2, "unanswered command cannot select new booking");
    f.setFail(false);
    f.setOutcome("applied");
    await reopened.submit("must not replace original text");
    assert.deepEqual(f.calls.at(-1), first);
    assert.equal(reopened.attempt.value.receipt.received_at, "2026-09-09T12:34:56.123456+00:00");
    await reopened.refresh();
    assert.equal(f.calls.at(-1).path, "/events/calendar/cancellations/stable-command");
    await reopened.open(true);
    assert.equal(
      reopened.target.value.id,
      "replacement",
      "new scope requires separate explicit preparation"
    );
  });
test("account changes reject stale submission and ignore an old owner's late preparation", async () => {
  const f = fixture(),
    flow = createEventCancellation(f.options);
  await flow.open();
  f.setOwner("owner-b");
  await flow.submit("stale");
  assert.equal(f.calls.length, 1);
  let resolve;
  f.options.post = () => new Promise((ok) => (resolve = ok));
  const next = createEventCancellation(f.options),
    pending = next.open();
  f.setOwner("owner-c");
  next.reset();
  resolve(target());
  await pending;
  assert.equal(next.target.value, null);
  assert.equal(next.attempt.value, null);
});
test("administrator scope requires a reason and preserves it with the original declaration", async () => {
  const f = fixture("webinar", "session");
  f.setTarget(target("administrator", "session"));
  const flow = createEventCancellation(f.options);
  await flow.open();
  await flow.submit("intervene", " ");
  assert.equal(f.calls.length, 1);
  await flow.submit("intervene", " exact reason ");
  assert.equal(f.calls.at(-1).body.administration_reason, " exact reason ");
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
  const detach = (item) => {
    if (item.parent) item.parent.children.splice(item.parent.children.indexOf(item), 1);
  };
  const renderer = createRenderer({
    createElement: node,
    createText: (text) => node("text", text),
    createComment: (text) => node("comment", text),
    setText: (n, text) => (n.text = text),
    setElementText: (n, text) => {
      n.text = text;
      n.children = [];
    },
    patchProp: (n, key, old, v) => (n.props[key] = v),
    insert: (n, p, a = null) => {
      detach(n);
      n.parent = p;
      p.children.splice(a ? p.children.indexOf(a) : p.children.length, 0, n);
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
async function compileComponent(relative, dir, replacements = {}) {
  const source = await readFile(new URL(relative, import.meta.url), "utf8"),
    { descriptor } = parse(source);
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
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const dependency of ["vue", "vue-i18n"])
    code = code.replace(
      new RegExp(`from ["']${dependency}["']`, "g"),
      `from ${JSON.stringify(import.meta.resolve(dependency))}`
    );
  for (const [find, replacement] of Object.entries(replacements))
    code = code.replaceAll(find, replacement);
  const path = join(dir, relative.replaceAll(/[^a-zA-Z0-9]/g, "_") + ".mjs");
  await writeFile(path, code);
  return (await import(pathToFileURL(path))).default;
}
test("actual confirmation component renders exact scope and pending/applied/unknown outcomes in both languages", async () => {
  const dir = await mkdtemp(join(tmpdir(), "l3-ordinary-component-"));
  const names = ["useUser", "Document", "ShadowRoot", "document", "__ordinaryFlow"],
    originals = new Map(names.map((n) => [n, Object.getOwnPropertyDescriptor(globalThis, n)]));
  let app;
  try {
    const f = fixture(),
      flow = createEventCancellation(f.options),
      user = ref({ id: "owner-a" });
    Object.assign(globalThis, {
      useUser: () => user,
      Document: class {},
      ShadowRoot: class {},
      document: { activeElement: null },
      __ordinaryFlow: flow,
    });
    const Component = await compileComponent(
      "../components/EventCancellationConfirmation.vue",
      dir,
      {
        'import { useEventCancellation } from "../composables/eventCancellation";':
          "const useEventCancellation = () => globalThis.__ordinaryFlow;",
      }
    );
    const ui = host(),
      messages = {};
    for (const locale of ["en-US", "de"])
      messages[locale] = JSON.parse(
        await readFile(new URL(`../locales/${locale}.json`, import.meta.url), "utf8")
      );
    const i18n = createI18n({ legacy: false, locale: "en-US", messages });
    app = ui.renderer.createApp(Component, { eventId: "event", kind: "webinar", scope: "auto" });
    app.use(i18n);
    app.mount(ui.root);
    const flush = async () => {
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
        await nextTick();
      }
    };
    await flush();
    assert.match(ui.text(), /Original scheduled session/);
    assert.match(ui.text(), /42 Morphcoins/);
    assert.match(ui.text(), /seven days/);
    assert.doesNotMatch(ui.text(), /50%|last 24 hours/);
    const checkbox = ui.all().find((n) => n.type === "input");
    checkbox.props["onUpdate:modelValue"](true);
    await flush();
    const confirm = ui
      .all()
      .find(
        (n) =>
          n.type === "button" && ui.text(n).trim() === messages["en-US"].EventCancellation.Confirm
      );
    await confirm.props.onClick();
    await flush();
    assert.match(ui.text(), /stable-command/);
    assert(ui.text().includes(messages["en-US"].EventCancellation.State.received));
    assert(ui.text().includes(messages["en-US"].EventCancellation.Financial.not_assessed));
    assert.equal(
      f.calls.filter((r) => r.path.includes("/cancellations/")).length,
      1,
      "one original cancellation was submitted"
    );
    f.setOutcome("applied");
    await flow.refresh();
    await flush();
    assert(ui.text().includes(messages["en-US"].EventCancellation.State.applied));
    flow.attempt.value.receipt.financial_state = "amount_unknown";
    await flush();
    assert(ui.text().includes(messages["en-US"].EventCancellation.Financial.amount_unknown));
    i18n.global.locale.value = "de";
    await flush();
    assert(ui.text().includes(messages.de.EventCancellation.Financial.amount_unknown));
    user.value = { id: "owner-b" };
    await flush();
    assert.doesNotMatch(ui.text(), /stable-command|Original scheduled session/);
  } finally {
    if (app) app.unmount();
    for (const [n, d] of originals)
      if (d) Object.defineProperty(globalThis, n, d);
      else delete globalThis[n];
    await rm(dir, { recursive: true, force: true });
  }
});

test("both actual parent dialogs mount the exact-target component with their intended scope", async () => {
  const dir = await mkdtemp(join(tmpdir(), "l3-ordinary-parents-"));
  const names = [
      "useUser",
      "computed",
      "ref",
      "reactive",
      "watch",
      "onMounted",
      "useRouter",
      "useSkill",
      "useRoute",
      "getCurrentDate",
      "getCurrentTime",
      "formatDate",
      "useRuntimeConfig",
      "abbreviateNumber",
      "convertDateToTimestamp",
    ],
    originals = new Map(names.map((n) => [n, Object.getOwnPropertyDescriptor(globalThis, n)]));
  let app;
  try {
    Object.assign(globalThis, {
      useUser: () => ref({ id: "owner-a", admin: false }),
      computed,
      ref,
      reactive,
      watch,
      onMounted,
      useRouter: () => ({ push() {} }),
      useSkill: () => ref({}),
      useRoute: () => ({ query: {} }),
      getCurrentDate: () => "2026-09-09",
      getCurrentTime: () => "12:00",
      formatDate: (v) => v,
      useRuntimeConfig: () => ({ public: {} }),
      abbreviateNumber: (v) => v,
      convertDateToTimestamp: (v) => v.getTime() / 1000,
    });
    const messages = JSON.parse(
      await readFile(new URL("../locales/en-US.json", import.meta.url), "utf8")
    );
    for (const [file, props, button, scope] of [
      [
        "../components/calendar/EventBooking.vue",
        {
          event: { type: "webinar", booked: true },
          booked: true,
          id: "event-original",
          type: "webinar",
          theme: {},
          stats: [],
          isMine: false,
          bookable: false,
          description: "",
          subSkillID: "",
          start: 1791806400,
        },
        "More",
        "auto",
      ],
      [
        "../components/form/Webinar.vue",
        {
          data: {
            id: "event-original",
            name: "Session",
            start: 1791806400,
            end: 1791810000,
            participants: 3,
          },
          skillID: "skill",
        },
        "Cancel",
        "session",
      ],
    ]) {
      const Component = await compileComponent(file, dir),
        ui = host(),
        mounted = [];
      app = ui.renderer.createApp(Component, props);
      app.use(createI18n({ legacy: false, locale: "en-US", messages: { "en-US": messages } }));
      for (const name of [
        "Btn",
        "InputBtn",
        "Modal",
        "CalendarEventSummary",
        "Input",
        "InputTextarea",
        "InputSelect",
        "InputDate",
        "InputTime",
        "NuxtLink",
        "Chip",
        "IconCheck",
        "IconMorphcoin",
        "OrderContract",
        "OrderSummary",
        "Rating",
      ])
        app.component(name, {
          inheritAttrs: false,
          setup:
            (p, { attrs, slots }) =>
            () =>
              h(name === "Btn" || name === "InputBtn" ? "button" : "div", attrs, slots.default?.()),
        });
      app.component("EventCancellationConfirmation", {
        props: ["eventId", "kind", "scope"],
        setup: (p) => {
          mounted.push({ ...p });
          return () => h("div", "exact cancellation");
        },
      });
      app.mount(ui.root);
      await nextTick();
      const clickable = ui.all().filter((n) => n.type === "button");
      const chosen = file.includes("EventBooking")
        ? clickable.find((n) => ui.text(n).includes("More"))
        : clickable.find((n) => ui.text(n).includes("Delete") || ui.text(n).includes("Cancel"));
      assert(chosen, `${file}: cancellation entry remains reachable; rendered ${ui.text()}`);
      chosen.props.onClick();
      await nextTick();
      assert.deepEqual(mounted, [{ eventId: "event-original", kind: "webinar", scope }]);
      app.unmount();
      app = null;
    }
  } finally {
    if (app) app.unmount();
    for (const [n, d] of originals)
      if (d) Object.defineProperty(globalThis, n, d);
      else delete globalThis[n];
    await rm(dir, { recursive: true, force: true });
  }
});
