import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { compileScript, compileTemplate, parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { createI18n } from "vue-i18n";

const temporary = await mkdtemp(join(tmpdir(), "academy-notice-test-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = (name) => pathToFileURL(join(temporary, name + ".mjs")).href;
const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
for (const name of ["updateNotice", "publicLegalRoutes"]) {
  const source = await readFile(new URL(`../composables/${name}.ts`, import.meta.url), "utf8");
  await writeFile(new URL(output(name)), transpile(source));
}
const { createUpdateNotice, updateNoticeKey, updateNoticeSubject, UPDATE_NOTICE_VERSION } =
  await import(output("updateNotice"));
const { isPublicLegalRoute } = await import(output("publicLegalRoutes"));
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";

function fixture(data = new Map(), unavailable = false) {
  const writes = [],
    reads = [];
  const storage = {
    getItem(key) {
      reads.push(key);
      if (unavailable) throw new Error("blocked read");
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      writes.push([key, value]);
      if (unavailable) throw new Error("blocked write");
      data.set(key, value);
    },
  };
  let view;
  const controller = createUpdateNotice({
    dismissed: new Set(),
    storage: () => storage,
    changed: (next) => (view = next),
  });
  return {
    data,
    writes,
    reads,
    storage,
    controller,
    get view() {
      return view;
    },
  };
}

async function compile(relative, name) {
  const source = await readFile(new URL(relative, import.meta.url), "utf8");
  const { descriptor } = parse(source);
  const script = compileScript(descriptor, { id: name, inlineTemplate: true });
  let code = script.content;
  if (!descriptor.scriptSetup) {
    const template = compileTemplate({
      source: descriptor.template.content,
      filename: relative,
      id: name,
      compilerOptions: { bindingMetadata: script.bindings },
    });
    assert.deepEqual(template.errors, []);
    code =
      code.replace("export default", "const component =") +
      "\n" +
      template.code.replace("export function render", "function render") +
      "\ncomponent.render = render; export default component;";
  }
  if (name === "Btn") code = 'import { defineComponent, computed } from "vue";\n' + code;
  code = transpile(code).replace('import "highlight.js/styles/github-dark.css";', "");
  for (const dep of ["vue", "vue-i18n"])
    code = code.replace(
      new RegExp(`from ["']${dep}["']`, "g"),
      `from ${JSON.stringify(import.meta.resolve(dep))}`
    );
  for (const dep of ["updateNotice", "publicLegalRoutes"])
    code = code.replace(
      new RegExp(`from ["']../composables/${dep}["']`, "g"),
      `from ${JSON.stringify(output(dep))}`
    );
  await writeFile(new URL(output(name)), code);
  return (await import(output(name))).default;
}
const Notice = await compile("../components/UpdateNotice.vue", "Notice");
const App = await compile("../app.vue", "App");
// Actual existing button: its emitted event and native type=button are exercised.
const Btn = await compile("../components/Btn.vue", "Btn");
const messages = Object.fromEntries(
  await Promise.all(
    ["de", "en-US"].map(async (language) => [
      language,
      JSON.parse(await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")),
    ])
  )
);
function host() {
  const node = (type, text = "") => ({ type, text, props: {}, children: [], parent: null });
  const detach = (n) => {
    if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1);
    n.parent = null;
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
    patchProp: (n, k, _old, value) => (n.props[k] = value),
    insert: (n, p, anchor = null) => {
      detach(n);
      n.parent = p;
      p.children.splice(anchor ? p.children.indexOf(anchor) : p.children.length, 0, n);
    },
    remove: detach,
    parentNode: (n) => n.parent,
    nextSibling: (n) => n.parent?.children[n.parent.children.indexOf(n) + 1],
  });
  const root = node("root");
  const all = (n = root) => [n, ...n.children.flatMap(all)];
  const text = (n = root) =>
    [n.type === "comment" ? "" : n.text, ...n.children.map(text)].join(" ");
  return { root, renderer, all, text };
}
async function mounted(language, fn, { blocked = false, data = new Map() } = {}) {
  const f = fixture(data, blocked),
    ui = host(),
    listeners = new Map(),
    layoutLifetimes = [];
  const route = Vue.reactive({ path: "/dashboard" });
  const user = Vue.ref({ id: A, terms_version: "old" }),
    token = Vue.ref("current"),
    loaded = Vue.ref(true);
  const hooks = {},
    requests = [],
    window = {
      localStorage: f.storage,
      addEventListener: (kind, handler) => {
        assert.equal(kind, "storage");
        listeners.set(kind, handler);
      },
      removeEventListener: (kind, handler) => {
        assert.equal(listeners.get(kind), handler);
        listeners.delete(kind);
      },
    };
  const globals = {
    ...Vue,
    window,
    isPublicLegalRoute,
    useUser: () => user,
    useAccessToken: () => token,
    useProfileLoaded: () => loaded,
    useRoute: () => route,
    useDialog: () => Vue.ref(null),
    useShowConfetti: () => Vue.ref(false),
    useUnratedWebinars: () => Vue.ref([]),
    useNuxtApp: () => ({ hook: (name, handler) => (hooks[name] = handler) }),
    $fetch: (...args) => {
      requests.push(args);
      throw new Error("notice must not request");
    },
    POST: (...args) => {
      requests.push(args);
      throw new Error("notice must not accept terms");
    },
  };
  const descriptors = new Map(
    Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  );
  Object.assign(globalThis, globals);
  const app = ui.renderer.createApp(App);
  const slot = {
    setup:
      (_p, { slots }) =>
      () =>
        Vue.h("div", slots.default?.()),
  };
  app.component("LazyClientOnly", slot);
  app.component("Footer", { render: () => null });
  // Nuxt keys the layout provider by layout name. Its slot subtree is recreated
  // on default ↔ inner, while the actual App instance above it survives.
  const provider = {
    props: ["layout"],
    setup: (props, { slots }) => {
      Vue.onMounted(() => layoutLifetimes.push("mount:" + props.layout));
      Vue.onBeforeUnmount(() => layoutLifetimes.push("unmount:" + props.layout));
      return () => Vue.h("div", { "data-layout": props.layout }, slots.default?.());
    },
  };
  app.component("NuxtLayout", {
    setup:
      (_props, { slots }) =>
      () => {
        const layout = ["/profile/courses", "/auth/login"].includes(route.path)
          ? "inner"
          : "default";
        return Vue.h(provider, { key: layout, layout }, slots);
      },
  });
  for (const name of [
    "NuxtLoadingIndicator",
    "Confetti",
    "Loading",
    "ContractTermination",
    "Modal",
    "Dialog",
    "Snackbar",
    "FormWebinarRating",
  ])
    app.component(name, { setup: () => () => Vue.h("span", { "data-component": name }) });
  app.component("NuxtPage", { setup: () => () => Vue.h("main", "Page remains usable") });
  app.component("NuxtLink", {
    props: ["to"],
    setup:
      (p, { slots }) =>
      () =>
        Vue.h("a", { href: p.to }, slots.default?.()),
  });
  app.component("UpdateNotice", Notice);
  app.component("Btn", Btn);
  app.use(createI18n({ legacy: false, locale: language, messages }));
  const tick = () => Vue.nextTick();
  const notice = () => ui.all().find((n) => n.type === "aside");
  const button = () => ui.all().find((n) => n.type === "button");
  try {
    app.mount(ui.root);
    await tick();
    await fn({
      ...f,
      ui,
      app,
      user,
      token,
      loaded,
      route,
      listeners,
      layoutLifetimes,
      requests,
      tick,
      notice,
      button,
    });
  } finally {
    app.unmount();
    assert.equal(listeners.size, 0);
    for (const [key, descriptor] of descriptors)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
  }
}
test("only a loaded authenticated UUID profile qualifies; notice version is separate", () => {
  assert.equal(updateNoticeSubject(A, "current", true), A);
  for (const args of [
    [A, "", true],
    [A, null, true],
    [A, "current", false],
    [null, "current", true],
    ["", "current", true],
    ["not-a-user", "current", true],
  ])
    assert.equal(updateNoticeSubject(...args), null);
  assert.notEqual(UPDATE_NOTICE_VERSION, "2026-09-r2");
});
test("display/auth changes never write; explicit dismissal persists one user/version marker", () => {
  const f = fixture();
  for (const subject of [null, A, A, B, null, A]) f.controller.select(subject);
  assert.equal(f.view.visible, true);
  assert.deepEqual(f.writes, []);
  const close = f.view.dismiss;
  close();
  close();
  assert.deepEqual(f.writes, [[updateNoticeKey(A), "1"]]);
  assert.equal(f.view.visible, false);
  const reloaded = fixture(f.data);
  reloaded.controller.select(A);
  assert.equal(reloaded.view.visible, false);
  reloaded.controller.select(B);
  assert.equal(reloaded.view.visible, true);
  assert.deepEqual(reloaded.writes, []);
});
test("unknown markers and previous versions do not suppress the current notice", () => {
  for (const value of ["0", "true", "", '{"accepted":true}']) {
    const f = fixture(
      new Map([
        [updateNoticeKey(A), value],
        [updateNoticeKey(A).replace(UPDATE_NOTICE_VERSION, "previous"), "1"],
      ])
    );
    f.controller.select(A);
    assert.equal(f.view.visible, true);
    assert.deepEqual(f.writes, []);
  }
});
test("blocked storage keeps dismissal in memory across route/logout/account transitions", () => {
  const f = fixture(new Map(), true);
  f.controller.select(A);
  f.view.dismiss();
  f.controller.select(null);
  f.controller.select(B);
  assert.equal(f.view.visible, true);
  f.controller.select(A);
  assert.equal(f.view.visible, false);
  assert.deepEqual(f.writes, [[updateNoticeKey(A), "1"]]);
  const reloaded = fixture(new Map(), true);
  reloaded.controller.select(A);
  assert.equal(reloaded.view.visible, true);
});
test("a throwing storage getter also supports memory-only explicit dismissal", () => {
  let view;
  const c = createUpdateNotice({
    dismissed: new Set(),
    storage: () => {
      throw new Error("SecurityError");
    },
    changed: (v) => (view = v),
  });
  c.select(A);
  assert.equal(view.visible, true);
  view.dismiss();
  c.select(null);
  c.select(A);
  assert.equal(view.visible, false);
});
test("stale close actions cannot affect another owner, owner ABA, logout or a disposed child", () => {
  for (const transition of [[B], [B, A], [null], [null, A]]) {
    const f = fixture();
    f.controller.select(A);
    const old = f.view.dismiss;
    for (const subject of transition) f.controller.select(subject);
    old();
    assert.deepEqual(f.writes, []);
    assert.equal(f.view.visible, transition.at(-1) !== null);
  }
  const f = fixture();
  f.controller.select(A);
  const old = f.view.dismiss;
  f.controller.dispose();
  old();
  f.controller.select(B);
  assert.deepEqual(f.writes, []);
});
test("matching cross-tab markers hide without writing; other owners/version/deletions do not", () => {
  const f = fixture();
  f.controller.select(A);
  for (const [key, value] of [
    [updateNoticeKey(B), "1"],
    [updateNoticeKey(A).replace(UPDATE_NOTICE_VERSION, "old"), "1"],
    [null, null],
    [updateNoticeKey(A), null],
  ]) {
    f.controller.storageChanged(key, value);
    assert.equal(f.view.visible, true);
  }
  f.controller.storageChanged(updateNoticeKey(A), "1");
  assert.equal(f.view.visible, false);
  assert.deepEqual(f.writes, []);
});

for (const language of ["de", "en-US"]) {
  test(`actual app/notice/button ${language}: inline information, legal links, explicit marker, no consent/request`, async () => {
    await mounted(language, async (f) => {
      assert(f.notice());
      assert.match(f.ui.text(), new RegExp(messages[language].UpdateNotice.Title));
      assert.equal(f.notice().props["aria-labelledby"], "update-notice-title");
      assert(f.ui.all().some((n) => n.props.id === "update-notice-title"));
      assert(f.ui.all().some((n) => n.type === "main"));
      assert(
        !f.ui
          .all()
          .some((n) => n.props["aria-modal"] || n.props.role === "dialog" || n.props.autofocus)
      );
      assert.deepEqual(
        f.ui
          .all()
          .filter((n) => n.type === "a")
          .map((n) => n.props.href),
        ["/docs/terms-and-conditions", "/docs/privacy"]
      );
      assert.equal(f.button().props.type, "button");
      assert.deepEqual(f.writes, []);
      f.button().props.onClick();
      await f.tick();
      assert.equal(Boolean(f.notice()), false);
      assert.deepEqual(f.writes, [[updateNoticeKey(A), "1"]]);
      assert.equal(f.user.value.terms_version, "old");
      assert.deepEqual(f.requests, []);
    });
  });
}
test("actual app suppresses the notice on public/legal routes and before a loaded session without writing", async () => {
  await mounted("de", async (f) => {
    for (const path of [
      "/docs/privacy",
      "/DOCS/terms-and-conditions/",
      "/docs/terms-and-conditions-2026-09-r1",
      "/vertrag-kuendigen",
      "/vertrag-widerrufen",
      "/moderation/access",
      "/moderation",
      "/oauth/callback",
    ]) {
      f.route.path = path;
      await f.tick();
      assert.equal(Boolean(f.notice()), false);
      assert(f.ui.all().some((n) => n.type === "main"));
    }
    f.route.path = "/dashboard";
    f.loaded.value = false;
    await f.tick();
    assert.equal(Boolean(f.notice()), false);
    f.loaded.value = true;
    f.token.value = "";
    await f.tick();
    assert.equal(Boolean(f.notice()), false);
    f.token.value = "fresh";
    await f.tick();
    assert(f.notice());
    assert.deepEqual(f.writes, []);
    assert.deepEqual(f.requests, []);
  });
});
test("actual app account switch/ABA invalidates held close; each user's dismissal remains separate", async () => {
  await mounted("en-US", async (f) => {
    const old = f.button().props.onClick;
    f.user.value = { id: B, terms_version: "old" };
    await f.tick();
    old();
    assert.deepEqual(f.writes, []);
    assert(f.notice());
    f.user.value = { id: A, terms_version: "old" };
    await f.tick();
    old();
    assert.deepEqual(f.writes, []);
    assert(f.notice());
    f.button().props.onClick();
    await f.tick();
    assert.equal(Boolean(f.notice()), false);
    f.token.value = "";
    await f.tick();
    f.user.value = { id: B };
    f.token.value = "new";
    await f.tick();
    assert(f.notice());
    f.user.value = { id: A };
    await f.tick();
    assert.equal(Boolean(f.notice()), false);
    assert.deepEqual(f.writes, [[updateNoticeKey(A), "1"]]);
  });
});
test("actual app blocked storage dismissal survives navigation through public documents", async () => {
  await mounted(
    "de",
    async (f) => {
      f.button().props.onClick();
      await f.tick();
      assert.equal(Boolean(f.notice()), false);
      f.route.path = "/docs/privacy";
      await f.tick();
      f.route.path = "/dashboard";
      await f.tick();
      assert.equal(Boolean(f.notice()), false);
      assert.deepEqual(f.writes, [[updateNoticeKey(A), "1"]]);
    },
    { blocked: true }
  );
});
test("actual storage listener qualifies storage area/owner/version and disposes only its listener", async () => {
  await mounted("en-US", async (f) => {
    const handler = f.listeners.get("storage");
    assert.equal(typeof handler, "function");
    handler({ storageArea: {}, key: updateNoticeKey(A), newValue: "1" });
    await f.tick();
    assert(f.notice());
    handler({ storageArea: f.storage, key: updateNoticeKey(B), newValue: "1" });
    await f.tick();
    assert(f.notice());
    handler({ storageArea: f.storage, key: updateNoticeKey(A), newValue: "1" });
    await f.tick();
    assert.equal(Boolean(f.notice()), false);
    assert.deepEqual(f.writes, []);
  });
});

test("blocked storage dismissal survives keyed default/inner layout remounts within the actual App", async () => {
  await mounted(
    "de",
    async (f) => {
      f.button().props.onClick();
      await f.tick();
      assert.equal(Boolean(f.notice()), false);
      f.route.path = "/profile/courses";
      await f.tick();
      assert.deepEqual(f.layoutLifetimes, ["mount:default", "unmount:default", "mount:inner"]);
      assert.equal(
        Boolean(f.notice()),
        false,
        "App-lifetime fallback must survive the layout provider remount"
      );
      f.route.path = "/dashboard";
      await f.tick();
      assert.equal(Boolean(f.notice()), false);
      assert.deepEqual(f.layoutLifetimes.slice(-2), ["unmount:inner", "mount:default"]);
      f.token.value = "";
      f.route.path = "/auth/login";
      await f.tick();
      assert.equal(Boolean(f.notice()), false);
      f.user.value = { id: B };
      f.token.value = "new";
      f.route.path = "/dashboard";
      await f.tick();
      assert(f.notice(), "another account has its own dismissal");
      f.user.value = { id: A };
      await f.tick();
      assert.equal(Boolean(f.notice()), false);
      assert.deepEqual(f.writes, [[updateNoticeKey(A), "1"]]);
    },
    { blocked: true }
  );
});
