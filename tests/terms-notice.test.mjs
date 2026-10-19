/**
 * The notice of terms 2026-10 on the platform (part 2 of the announcement). It shows from the
 * configured announcement until the terms take effect, to accounts only, once per account until
 * it is closed, and never next to the update notice, on legal pages or on pages with an order
 * form. The actual App, both notices and the actual button are mounted.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, mock, test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { compileScript, compileTemplate, parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { createI18n } from "vue-i18n";

const temporary = await mkdtemp(join(tmpdir(), "academy-terms-notice-test-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = (name) => pathToFileURL(join(temporary, name + ".mjs")).href;
const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
const local = (code) =>
  code
    .replace(
      /from ["']\.\.\/utils\/(\w+)["']/g,
      (_, name) => `from ${JSON.stringify(output(name))}`
    )
    .replace(/from ["']\.\/(\w+)["']/g, (_, name) => `from ${JSON.stringify(output(name))}`)
    .replace(
      /from ["']\.\.\/composables\/(\w+)["']/g,
      (_, name) => `from ${JSON.stringify(output(name))}`
    );
for (const [folder, name] of [
  ["utils", "legalEffectiveDate"],
  ["utils", "termsAnnouncement"],
  ["composables", "updateNotice"],
  ["composables", "publicLegalRoutes"],
  ["composables", "termsNotice"],
]) {
  const source = await readFile(new URL(`../${folder}/${name}.ts`, import.meta.url), "utf8");
  await writeFile(new URL(output(name)), local(transpile(source)));
}
const { parseAnnouncement } = await import(output("termsAnnouncement"));
const { parseEffectiveStart } = await import(output("legalEffectiveDate"));
const { termsNotice, isGoalRoute, TERMS_NOTICE_VERSION } = await import(output("termsNotice"));
const { updateNoticeKey, UPDATE_NOTICE_WINDOW } = await import(output("updateNotice"));

const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const FROM = "2026-12-09T00:00:00+01:00";
const ANNOUNCED = "2026-10-21T09:00:00+02:00";
const config = { TERMS_2026_10_FROM: FROM, TERMS_2026_10_ANNOUNCED: ANNOUNCED };
const at = {
  beforeAnnouncement: Date.parse("2026-10-21T06:59:59.999Z"),
  announcement: Date.parse("2026-10-21T07:00:00Z"),
  // The update notice runs until 4 November.
  withUpdateNotice: Date.parse("2026-10-25T12:00:00Z"),
  during: Date.parse("2026-11-20T12:00:00Z"),
  lastMoment: Date.parse("2026-12-08T22:59:59.999Z"),
  start: Date.parse("2026-12-08T23:00:00Z"),
  after: Date.parse("2027-01-15T12:00:00Z"),
};
const termsKey = (subject) => updateNoticeKey(subject, TERMS_NOTICE_VERSION);
// The wording of the notice comes from part 2 of the reviewed announcement (draft v3,
// `ankuendigung.md`). The fixture is that part byte for byte; the mail and the working notes
// of the draft are not published. Next to it the SHA-256 of the draft it was taken from, so
// that a changed draft is noticed and the fixture renewed.
const NOTICE_DRAFT = {
  fixture: "ada74e65a502f7ef4f12438549a68c58fc0ac825d2c86f62b11ac87226ef8a0b",
  draft: "6224962efbf7da53b65cd3def74bbc03f237fa4262e0bb73f295c2b976346229",
};
const noticeDraft = await readFile(
  new URL("./fixtures/legal-2026-10/ankuendigung-hinweis.md", import.meta.url),
  "utf8"
);
assert.equal(
  createHash("sha256").update(noticeDraft).digest("hex"),
  NOTICE_DRAFT.fixture,
  "the notice fixture is the recorded copy of its draft"
);
// The heading, the German line and the line of the English interface.
const [, germanLine, englishLine] = noticeDraft.split(/\n\s*\n/).map((part) => part.trim());
const ENGLISH = "In der englischen Oberfläche: ";
assert(englishLine.startsWith(ENGLISH), englishLine);
const DRAFT_LINES = { de: germanLine, "en-US": englishLine.slice(ENGLISH.length) };
const LINK = /\[([^\]]+)\]\(Link\)/g;
const BODY = {
  de: DRAFT_LINES.de.replace("[Datum]", "9. Dezember 2026").replace(LINK, "$1"),
  "en-US": DRAFT_LINES["en-US"].replace("[date]", "9 December 2026").replace(LINK, "$1"),
};

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
  code = local(transpile(code).replace('import "highlight.js/styles/github-dark.css";', ""));
  for (const dep of ["vue", "vue-i18n"])
    code = code.replace(
      new RegExp(`from ["']${dep}["']`, "g"),
      `from ${JSON.stringify(import.meta.resolve(dep))}`
    );
  await writeFile(new URL(output(name)), code);
  return (await import(output(name))).default;
}
const UpdateNotice = await compile("../components/UpdateNotice.vue", "UpdateNotice");
const TermsNotice = await compile("../components/TermsNotice.vue", "TermsNotice");
const App = await compile("../app.vue", "App");
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
    [n.type === "comment" ? "" : n.text, ...n.children.map(text)]
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/ ([:.,])/g, "$1")
      .trim();
  return { root, renderer, all, text };
}

function storage(data) {
  const writes = [];
  return {
    writes,
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => data.delete(key),
    getItem: (key) => data.get(key) ?? null,
    setItem(key, value) {
      writes.push([key, value]);
      data.set(key, value);
    },
  };
}

/** Both accounts have closed the update notice, so only the terms notice is in question. */
const updateNoticeClosed = () =>
  new Map([
    [updateNoticeKey(A), "1"],
    [updateNoticeKey(B), "1"],
  ]);

async function mounted(
  fn,
  {
    language = "de",
    time = at.during,
    data = updateNoticeClosed(),
    settings = config,
    path = "/dashboard",
  } = {}
) {
  const actualNow = Date.now;
  let now = time;
  Date.now = () => now;
  const ui = host(),
    listeners = new Set(),
    store = storage(data);
  const route = Vue.reactive({ path });
  const user = Vue.ref({ id: A, terms_version: "2026-09-r4" }),
    token = Vue.ref("current"),
    loaded = Vue.ref(true);
  const requests = [];
  const globals = {
    ...Vue,
    window: {
      localStorage: store,
      addEventListener: (kind, handler) => {
        assert.equal(kind, "storage");
        listeners.add(handler);
      },
      removeEventListener: (kind, handler) => {
        assert.equal(kind, "storage");
        assert(listeners.delete(handler), "only a registered listener is removed");
      },
    },
    isPublicLegalRoute: (await import(output("publicLegalRoutes"))).isPublicLegalRoute,
    useUser: () => user,
    useAccessToken: () => token,
    useProfileLoaded: () => loaded,
    useRoute: () => route,
    useRuntimeConfig: () => ({ public: settings }),
    useDialog: () => Vue.ref(null),
    useShowConfetti: () => Vue.ref(false),
    $fetch: (...args) => {
      requests.push(args);
      throw new Error("the notice must not request anything");
    },
  };
  const descriptors = new Map(
    Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  );
  Object.assign(globalThis, globals);
  const slot = {
    setup:
      (_p, { slots }) =>
      () =>
        Vue.h("div", slots.default?.()),
  };
  const app = ui.renderer.createApp(App);
  app.component("LazyClientOnly", slot);
  app.component("NuxtLayout", slot);
  for (const name of ["Footer", "FeedbackLauncher"]) app.component(name, { render: () => null });
  for (const name of ["NuxtLoadingIndicator", "Confetti", "Loading", "Modal", "Dialog", "Snackbar"])
    app.component(name, { setup: () => () => Vue.h("span", { "data-component": name }) });
  app.component("NuxtPage", { setup: () => () => Vue.h("main", "Page remains usable") });
  app.component("NuxtLink", {
    props: ["to"],
    setup:
      (p, { slots }) =>
      () =>
        Vue.h("a", { href: p.to }, slots.default?.()),
  });
  app.component("UpdateNotice", UpdateNotice);
  app.component("TermsNotice", TermsNotice);
  app.component("Btn", Btn);
  app.use(createI18n({ legacy: false, locale: language, messages }));
  const tick = () => Vue.nextTick();
  const notices = () => ui.all().filter((n) => n.type === "aside");
  const terms = () => ui.all().find((n) => n.type === "aside" && "data-terms-notice" in n.props);
  const update = () => ui.all().find((n) => n.type === "aside" && "data-update-notice" in n.props);
  const close = async (notice) => {
    const button = ui.all(notice).find((n) => n.type === "button");
    button.props.onClick();
    await tick();
  };
  try {
    app.mount(ui.root);
    await tick();
    await fn({
      ui,
      data,
      store,
      user,
      token,
      route,
      requests,
      tick,
      notices,
      terms,
      update,
      close,
      setNow: (value) => (now = value),
    });
  } finally {
    app.unmount();
    Date.now = actualNow;
    assert.equal(listeners.size, 0, "every storage listener ends with its notice");
    for (const [key, descriptor] of descriptors)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
  }
}

test("the announcement is unset by default, needs the start and lies before it", () => {
  const start = parseEffectiveStart(FROM);
  assert.equal(parseAnnouncement("", start), null);
  assert.equal(parseAnnouncement("", null), null);
  assert.equal(parseAnnouncement(ANNOUNCED, start).getTime(), at.announcement);
  assert.throws(() => parseAnnouncement(ANNOUNCED, null), /needs the start/);
  assert.throws(() => parseAnnouncement(FROM, start), /before the start/);
  assert.throws(() => parseAnnouncement("2026-12-10T00:00:00Z", start), /before the start/);
  for (const value of [
    "2026-10-21",
    "2026-10-21T09:00:00",
    "21.10.2026 09:00",
    "2026-13-01T00:00Z",
  ])
    assert.throws(() => parseAnnouncement(value, start), /ISO timestamp/, value);
});

test("the window runs from the announcement to the start and names the date of the start", () => {
  assert.equal(termsNotice({}), null);
  assert.equal(termsNotice({ TERMS_2026_10_FROM: FROM }), null, "the start alone shows nothing");
  assert.deepEqual(termsNotice(config), {
    window: { version: TERMS_NOTICE_VERSION, startsAt: at.announcement, expiresAt: at.start },
    date: "9. Dezember 2026",
    dateEn: "9 December 2026",
  });
});

// Pages someone comes to with a goal, buying or learning, and pages that carry the notice.
const GOAL_PAGES = [
  "/morphcoins/buy",
  "/morphcoins/buy?for=hearts",
  "/morphcoins/paypal",
  "/morphcoins/paypal?coins=1500",
  "/subscription/",
  "/Subscription",
  "/quizzes/solve-quiz-task?quizzesFrom=quiz",
  "/quizzes/skill-python",
  "/matchings/solve-42",
  "/challenges/QuizCodingChallenge-7",
  "/challenges/python/loops",
  "/courses/python/lessons/intro",
  "/courses/python/watch",
  "/learn",
  "/start",
];
const NOTICE_PAGES = [
  "/dashboard",
  "/courses",
  "/courses/python",
  "/challenges",
  "/challenges/all",
  "/challenges/python/create",
  "/skill-tree",
  "/profile/courses",
  "/morphcoins",
  "/subscriptions",
];

test("the pages where someone buys or learns are known", () => {
  for (const path of GOAL_PAGES) assert.equal(isGoalRoute(path), true, path);
  for (const path of NOTICE_PAGES) assert.equal(isGoalRoute(path), false, path);
});

for (const [language, withdrawal] of [
  ["de", "/docs/right-of-withdrawal-2026-10"],
  ["en-US", "/docs/right-of-withdrawal-2026-10#english"],
])
  test(`${language}: in its window the notice says part 2 once, with the date once and both documents`, async () => {
    await mounted(
      async (f) => {
        const notice = f.terms();
        assert(notice, "the notice is shown");
        assert.equal(f.notices().length, 1);
        // Closed with a small "×" in the corner that says what it does.
        const button = f.ui.all(notice).find((n) => n.type === "button");
        assert.equal(f.ui.text(button), "×");
        assert.equal(button.props["aria-label"], messages[language].UpdateNotice.Dismiss);
        assert.equal(button.props.type, "button");
        assert.equal(f.ui.text(notice), `${BODY[language]} ×`);
        const date = language === "de" ? "9. Dezember 2026" : "9 December 2026";
        assert.equal(f.ui.text(notice).split(date).length, 2, "the date appears once");
        const links = f.ui.all(notice).filter((n) => n.type === "a");
        assert.deepEqual(
          links.map((n) => [n.props.href, f.ui.text(n)]),
          [
            [withdrawal, messages[language].TermsNotice.Withdrawal],
            ["/docs/terms-and-conditions-2026-10", messages[language].TermsNotice.Changes],
          ]
        );
        // The link to the terms carries the words the draft links.
        assert.deepEqual(
          [...DRAFT_LINES[language].matchAll(LINK)].map(([, label]) => label),
          [messages[language].TermsNotice.Changes]
        );
        assert.equal(notice.props["aria-label"], messages[language].TermsNotice.Label);
        assert(
          f.ui.all().some((n) => n.type === "main"),
          "the page stays usable"
        );
        assert.deepEqual(f.store.writes, []);
        assert.deepEqual(f.requests, []);
      },
      { language }
    );
  });

test("before the announcement, from the start and after it, there is no notice", async () => {
  for (const time of [at.beforeAnnouncement, at.start, at.after])
    await mounted(
      async (f) => {
        assert.equal(Boolean(f.terms()), false, new Date(time).toISOString());
      },
      { time }
    );
  for (const time of [at.announcement, at.lastMoment])
    await mounted(
      async (f) => {
        assert(f.terms(), new Date(time).toISOString());
      },
      { time }
    );
});

test("without an announcement nothing shows and nothing is stored", async () => {
  for (const settings of [{}, { TERMS_2026_10_FROM: FROM }])
    await mounted(
      async (f) => {
        assert.equal(Boolean(f.terms()), false);
        assert.deepEqual(f.store.writes, []);
      },
      { settings }
    );
});

test("in an open app the notice comes with the announcement and leaves at the start", async () => {
  mock.timers.enable({ apis: ["setInterval"] });
  try {
    await mounted(
      async (f) => {
        assert.equal(Boolean(f.terms()), false);
        f.setNow(at.announcement);
        mock.timers.tick(60_000);
        await f.tick();
        assert(f.terms(), "the minute check brings it");
        f.setNow(at.start);
        mock.timers.tick(60_000);
        await f.tick();
        assert.equal(Boolean(f.terms()), false, "the minute check takes it away at the start");
      },
      { time: at.beforeAnnouncement }
    );
  } finally {
    mock.timers.reset();
  }
});

test("closed, it stays closed for that account; another account still sees it", async () => {
  const data = new Map();
  await mounted(
    async (f) => {
      await f.close(f.terms());
      assert.equal(Boolean(f.terms()), false);
      assert.deepEqual(f.store.writes, [[termsKey(A), "1"]]);
    },
    { data }
  );
  await mounted(
    async (f) => {
      assert.equal(Boolean(f.terms()), false, "a new visit of the same account");
      f.user.value = { id: B, terms_version: "2026-09-r4" };
      await f.tick();
      assert(f.terms(), "another account");
      f.token.value = "";
      await f.tick();
      assert.equal(Boolean(f.terms()), false, "without a session there is no notice");
    },
    { data }
  );
});

test("one notice at a time: the terms notice follows the update notice once that is closed", async () => {
  // Nothing closed yet.
  const data = new Map();
  await mounted(
    async (f) => {
      assert(f.update());
      assert.equal(f.notices().length, 1);
      await f.close(f.update());
      assert(f.terms(), "the terms notice follows");
      assert.equal(f.notices().length, 1);
    },
    { data, time: at.withUpdateNotice }
  );
  assert(UPDATE_NOTICE_WINDOW.expiresAt < at.during);
  await mounted(
    async (f) => {
      assert(f.terms());
      assert.equal(Boolean(f.update()), false);
    },
    { data, time: at.withUpdateNotice }
  );
});

test("the notice stays off legal pages, the pages where a session starts and where someone buys or learns", async () => {
  await mounted(async (f) => {
    for (const path of [
      "/docs/terms-and-conditions-2026-10",
      "/docs/right-of-withdrawal-2026-10",
      "/docs/terms-and-conditions",
      "/auth/login",
      "/auth/signup",
      ...GOAL_PAGES,
    ]) {
      f.route.path = path;
      await f.tick();
      assert.equal(Boolean(f.terms()), false, path);
    }
    for (const path of NOTICE_PAGES) {
      f.route.path = path;
      await f.tick();
      assert(f.terms(), path);
    }
    assert.deepEqual(f.store.writes, []);
  });
});
