// A visitor without an account in the skill tree: what a chosen skill offers, where the ways
// on lead, and how the trees are named. Everything the code reaches is a stand-in.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { internalPath } from "../composables/loginRedirect.ts";
import { isPublicLegalRoute } from "../composables/publicLegalRoutes.ts";
import { pieces } from "./helpers/component-pieces.mjs";
import { component, evaluate, host, settle, tag } from "./helpers/mounted-page.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const skill = (id, name, courses = [], row = 0, column = 0) => ({
  id,
  parent_id: "start",
  name,
  icon: id,
  row,
  column,
  courses,
  dependencies: [],
  dependents: [],
  is_bookmarked: null,
});
const START = {
  rows: 3,
  columns: 3,
  skills: [
    skill("it_security_awareness", "IT Security Awareness", [], 1, 1),
    skill("llms", "Mit Large Language Models arbeiten", ["llms"], 2, 0),
  ],
};
const TREES = {
  rows: 20,
  columns: 20,
  skills: [
    { ...skill("start", "Start"), parent_id: undefined },
    {
      ...skill(
        "grundlagen_der_programmierung_und_datenhaltung",
        "Grundlagen der Programmierung und Datenhaltung"
      ),
      parent_id: undefined,
    },
  ],
};

/** The invitation as a visitor sees it. `said` is what the sentence was asked for. */
async function invitation(t, chosen, tree = "start") {
  const closed = [];
  const said = [];
  const ui = host();
  const app = ui.renderer.createApp(
    await component(
      "components/skill-tree/GuestInvitation.vue",
      {},
      {
        "@heroicons/vue/24/solid": { XMarkIcon: tag("svg") },
        "vue-i18n": {
          useI18n: () => ({
            t: (key, count) => {
              said.push(count === undefined ? [key] : [key, count]);
              return key;
            },
          }),
        },
      }
    ),
    { tree, skill: chosen, onClose: () => closed.push(true) }
  );
  app.component("NuxtLink", tag("a"));
  app.mount(ui.root);
  t.after(() => app.unmount());
  await settle();
  const one = (type) => ui.all().find((n) => n.type === type);
  return {
    ui,
    said,
    closed,
    heading: () => ui.text(one("h2")).trim(),
    links: () =>
      ui
        .all()
        .filter((n) => n.type === "a")
        .map((n) => ({ to: n.props.to, label: ui.text(n).trim() })),
    close: () => one("button"),
  };
}

test("a chosen skill invites: its name, what lies behind it, the registration first, the login second, the courses", async (t) => {
  const page = await invitation(t, START.skills[1]);
  // The name stands as the data spell it.
  assert.equal(page.heading(), "Mit Large Language Models arbeiten");
  const redirect = "/skill-tree/start/llms";
  assert.deepEqual(page.links(), [
    { to: { path: "/auth/signup", query: { redirect } }, label: "SkillInvitation.Signup" },
    { to: { path: "/auth/login", query: { redirect } }, label: "SkillInvitation.Login" },
    { to: "/courses", label: "SkillInvitation.Courses" },
  ]);
  // The sentence follows the number of courses behind the skill.
  assert.deepEqual(
    page.said.filter(([key]) => key === "SkillInvitation.Body"),
    [["SkillInvitation.Body", 1]]
  );
  // The invitation carries no colour of a warning or an error.
  for (const node of page.ui.all())
    assert.doesNotMatch(String(node.props.class ?? ""), /warning|error/);
  assert.ok(!page.ui.ever("NotLoggedIn"));

  // The cross leads back to the tree.
  assert.equal(page.close().props["aria-label"], "Buttons.Close");
  assert.deepEqual(page.closed, []);
  page.close().props.onClick();
  assert.deepEqual(page.closed, [true]);
});

test("the sentence of the invitation has a form for no course, for one and for several", async (t) => {
  for (const [courses, count] of [
    [[], 0],
    [undefined, 0],
    [["a"], 1],
    [["a", "b", "c"], 3],
  ]) {
    const page = await invitation(t, { ...START.skills[0], courses });
    assert.deepEqual(
      page.said.filter(([key]) => key === "SkillInvitation.Body"),
      [["SkillInvitation.Body", count]]
    );
  }
  for (const language of ["de", "en-US"]) {
    const { default: locale } = await import(`../locales/${language}.json`, {
      with: { type: "json" },
    });
    const forms = locale.SkillInvitation.Body.split(" | ");
    assert.equal(forms.length, 3, language);
    // Without a course the sentence promises none behind this skill.
    assert.match(forms[0], /keinen Kurs|no course/, language);
    assert.match(forms[1], /ein Kurs|a course/, language);
    assert.match(forms[2], /mehrere Kurse|several courses/, language);
    // The button says that the account is free; the sentence does not say it a second time.
    assert.match(locale.SkillInvitation.Signup, /kostenlos|free/i, language);
    for (const form of forms) assert.doesNotMatch(form, /kostenlos|gratis|free/i, language);
    for (const key of ["Signup", "Login", "Courses"])
      assert.ok(locale.SkillInvitation[key].length > 0, `${language} ${key}`);
  }
});

test("the target of the invitation is a path the login and the confirmation follow", async (t) => {
  const rules = await evaluate("composables/emailVerification.ts", {
    isPublicLegalRoute,
    internalPath,
  });
  for (const [tree, id, target] of [
    ["start", "llms", "/skill-tree/start/llms"],
    ["web_developer", "html_und_css", "/skill-tree/web_developer/html_und_css"],
    // Ids are written into the path as one segment each.
    ["a b", "x/y?z#1", "/skill-tree/a%20b/x%2Fy%3Fz%231"],
  ]) {
    const page = await invitation(t, skill(id, "Skill"), tree);
    const [signup, login] = page.links();
    assert.equal(signup.to.query.redirect, target);
    assert.equal(login.to.query.redirect, target);
    assert.equal(internalPath(target), target);
    assert.equal(rules.verifiedDestination(target), target);
  }
});

/**
 * The page of one tree with its real script and template. `token` is the session of the
 * visitor, `listed` says whether the list of all trees is already here.
 */
async function subTree(t, { token = "", id = "start", listed = true } = {}) {
  const calls = { api: [], pushed: [], dialogs: 0 };
  const states = new Map(listed ? [["rootSkillTree", Vue.ref(TREES)]] : []);
  let composable;
  const scope = {
    require: (name) =>
      ({
        vue: Vue,
        "vue-i18n": { useI18n: () => ({ t: (key) => key }) },
        // The map moves and zooms with this library; here it only has to be there.
        "@panzoom/panzoom": {
          __esModule: true,
          default: () => ({ destroy() {}, pan() {}, getScale: () => 1, zoomWithWheel() {} }),
        },
        "~/types/skillTreeTypes": {
          SkillTree: class {
            rows = 0;
            columns = 0;
            skills = [];
          },
        },
        "~/composables/skilltree": composable,
      })[name],
    computed: Vue.computed,
    ref: Vue.ref,
    reactive: Vue.reactive,
    watch: Vue.watch,
    nextTick: Vue.nextTick,
    onMounted: Vue.onMounted,
    onUnmounted: Vue.onUnmounted,
    console: { log() {} },
    useState: (key, initial) => {
      if (!states.has(key)) states.set(key, Vue.ref(initial()));
      return states.get(key);
    },
    GET: async (path) => {
      calls.api.push(path);
      if (path === "/skills/skilltree") return TREES;
      if (path === `/skills/skilltree/${id}`) return START;
      throw { data: { detail: "Not found" } };
    },
    useAppCookie: () => Vue.ref(null),
    useXP: () => Vue.ref(null),
    getXP: async () => {},
    useRouter: () => ({ push: (to) => calls.pushed.push(to) }),
    useRoute: () => ({ params: { id }, path: `/skill-tree/${id}` }),
    getAccessToken: () => token,
    openDialog: () => calls.dialogs++,
    pageTitle: (subject) => `${subject} · Bootstrap Academy`,
  };
  composable = await evaluate("composables/skilltree.ts", scope);
  Object.assign(scope, composable);

  const ui = host();
  const app = ui.renderer.createApp(await evaluate("pages/skill-tree/[id]/index.vue", scope));
  for (const [name, element] of [
    ["Head", "head"],
    ["Title", "title"],
    ["SkillTreeHeader", "nav"],
    ["LoadingDots", "p"],
    ["SkillTreeNode", "g"],
    ["SkillTreePathway", "path"],
    ["SvgSkillTree", "svg"],
    ["SectionTitle", "header"],
    ["Modal", "dialog"],
    ["SkillTreeGuestInvitation", "article"],
  ])
    app.component(name, tag(element));
  app.mount(ui.root);
  t.after(() => app.unmount());
  await settle();
  // What the map reaches for on a real element once it is set up.
  const map = ui.all().find((n) => n.type === "section");
  if (map) Object.assign(map, { style: {}, removeEventListener() {} });

  const one = (type) => ui.all().find((n) => n.type === type);
  const cells = () => ui.all().filter((n) => n.type === "g" && n.props.node);
  return {
    ui,
    calls,
    cells,
    breadcrumbs: () => one("nav").props.breadcrumbs,
    title: () => ui.text(one("title")).trim(),
    dialog: () => one("dialog"),
    invitation: () => one("article"),
    // What a node sends when it is chosen.
    async choose(skillId) {
      const {
        id: chosen,
        name,
        row,
        column,
        icon,
      } = cells()
        .map((n) => n.props.node)
        .find((node) => node.id === skillId);
      cells()
        .find((n) => n.props.node.id === skillId)
        .props.onMove({ id: chosen, name, dependencies: [], row, column, icon });
      await settle();
    },
  };
}

test("a visitor without an account who chooses a skill is invited and can go back to the tree", async (t) => {
  for (const leave of [
    (page) => page.invitation().props.onClose(),
    (page) => page.dialog().props.onBackdrop(),
  ]) {
    const page = await subTree(t);
    assert.equal(page.cells().length, 2);
    assert.ok(!page.dialog());

    await page.choose("llms");
    assert.ok(page.dialog(), "the invitation is on the page");
    assert.equal(page.dialog().props["aria-label"], "Mit Large Language Models arbeiten");
    assert.equal(page.invitation().props.tree, "start");
    assert.deepEqual(page.invitation().props.skill, {
      id: "llms",
      name: "Mit Large Language Models arbeiten",
      courses: ["llms"],
    });
    // Nothing leads away by itself, and the warning of earlier builds is gone.
    assert.deepEqual(page.calls.pushed, []);
    assert.equal(page.calls.dialogs, 0);
    assert.ok(!page.ui.ever("NotLoggedIn"));
    // The chosen skill stays in view behind the invitation.
    assert.deepEqual(
      page.cells().map((n) => n.props.node.id),
      ["llms"]
    );

    leave(page);
    await settle();
    assert.ok(!page.dialog());
    assert.equal(page.cells().length, 2, "the whole tree is back");
    assert.deepEqual(page.calls.pushed, []);
  }
});

test("an account that chooses a skill goes to its page as before", async (t) => {
  const page = await subTree(t, { token: "token" });
  await page.choose("it_security_awareness");
  assert.deepEqual(page.calls.pushed, ["/skill-tree/start/it_security_awareness"]);
  assert.ok(!page.dialog());
  assert.equal(page.calls.dialogs, 0);
});

test("a tree is named as the data spell it, in the heading and in the tab", async (t) => {
  for (const [id, name] of [
    ["start", "Start"],
    [
      "grundlagen_der_programmierung_und_datenhaltung",
      "Grundlagen der Programmierung und Datenhaltung",
    ],
    // A tree the list does not know keeps its id, with spaces for the underscores.
    ["not_in_the_list", "not in the list"],
  ]) {
    const page = await subTree(t, { id });
    assert.deepEqual(page.breadcrumbs(), [
      { label: "Links.SkillTree", to: "/skill-tree" },
      { name },
    ]);
    assert.equal(page.title(), `${name} · Links.SkillTree · Bootstrap Academy`);
    assert.ok(!page.calls.api.includes("/skills/skilltree"), "the list is here already");
  }

  // Opened directly: the list of the trees is asked for once, and the name follows it.
  const direct = await subTree(t, { listed: false });
  assert.deepEqual(
    direct.calls.api.filter((path) => path === "/skills/skilltree"),
    ["/skills/skilltree"]
  );
  assert.deepEqual(direct.breadcrumbs().at(-1), { name: "Start" });
  assert.equal(direct.title(), "Start · Links.SkillTree · Bootstrap Academy");
});

test("the sign of the tree translates its texts and shows names as they are spelled", async (t) => {
  const ui = host();
  const app = ui.renderer.createApp(
    await evaluate("components/skill-tree/Header.vue", {
      require: (name) =>
        ({ vue: Vue, "vue-i18n": { useI18n: () => ({ t: (key) => `t(${key})` }) } })[name],
      computed: Vue.computed,
      useAppCookie: () => Vue.ref(null),
      useQuizzesInCourse: () => Vue.ref([]),
      useMatchingsInCourse: () => Vue.ref([]),
    }),
    {
      breadcrumbs: [
        { label: "Links.SkillTree", to: "/skill-tree" },
        { name: "Mathematik für Informatiker", to: "/skill-tree/mathematik_fuer_informatiker" },
        { name: "theoretische Konzepte der Programmierung" },
      ],
    }
  );
  app.component("NuxtLink", tag("a"));
  app.component("Btn", tag("button"));
  app.mount(ui.root);
  t.after(() => app.unmount());
  await settle();
  const texts = (type) =>
    ui
      .all()
      .filter((n) => n.type === type)
      .map((n) => ui.text(n).trim());
  assert.deepEqual(texts("a"), ["t(Links.SkillTree)", "Mathematik für Informatiker"]);
  assert.deepEqual(texts("h1"), ["theoretische Konzepte der Programmierung"]);
  // No style rewrites the first letters of a name.
  for (const node of ui.all()) assert.doesNotMatch(String(node.props.class ?? ""), /capitalize/);
  const label = parse(await read("components/skill-tree/Node.vue")).descriptor.template.content;
  assert.match(label, /\{\{ node\?\.name \?\? "" \}\}/);
  assert.doesNotMatch(label, /capitalize/);

  // The sign of the tree is called what the navigation calls it.
  for (const page of ["index.vue", "[id]/index.vue", "[id]/[skill].vue"])
    assert.match(await read(`pages/skill-tree/${page}`), /label: "Links\.SkillTree"/, page);
  for (const language of ["de", "en-US"]) {
    const { default: locale } = await import(`../locales/${language}.json`, {
      with: { type: "json" },
    });
    assert.doesNotMatch(locale.Links.SkillTree, /root/i);
    assert.doesNotMatch(locale.Body.RootSkillTreeLoading, /root/i);
    assert.ok(!("RootSkillTree" in locale.Headings));
  }
});

test("the registration carries the chosen skill on to the confirmation of the address", async () => {
  const rules = await evaluate("composables/emailVerification.ts", {
    isPublicLegalRoute,
    internalPath,
  });
  const confirmation = "/auth/verify-account";
  const skillPage = "/skill-tree/start/llms";
  // What the address carries, a begun guest exercise, what the form hands to the login,
  // and where the account goes after the registration.
  for (const [query, guestReturn, carried, pushed] of [
    [
      { redirect: skillPage },
      null,
      skillPage,
      [{ path: confirmation, query: { redirect: skillPage } }],
    ],
    [{}, null, "", [{ path: confirmation }]],
    // Only a path of this site is carried on, and the confirmation follows no login page.
    [{ redirect: "https://example.invalid/skill-tree" }, null, "", [{ path: confirmation }]],
    [{ redirect: "//example.invalid" }, null, "", [{ path: confirmation }]],
    [{ redirect: ["/skill-tree/a", "/skill-tree/b"] }, null, "", [{ path: confirmation }]],
    [
      { redirect: "/auth/login?redirect=/skill-tree" },
      null,
      "/auth/login?redirect=/skill-tree",
      [{ path: confirmation }],
    ],
    // A guest who began an exercise goes back to it first, as before.
    [{ redirect: skillPage }, "/start", skillPage, ["/start"]],
  ]) {
    const went = [];
    const dialogs = [];
    const { redirect, successHandler } = await pieces(
      "components/form/Signup.vue",
      ["redirect", "successHandler"],
      {
        computed: Vue.computed,
        internalPath,
        emailVerificationRoute: rules.emailVerificationRoute,
        route: { query },
        router: { push: (to) => went.push(to) },
        authorizeGuestHandoff() {},
        guestReturnPath: () => guestReturn,
        openDialog: (...args) => dialogs.push(args),
        t: (key) => key,
      }
    );
    assert.equal(redirect.value, carried, JSON.stringify(query));
    successHandler({ user: { id: "learner" } });
    // The dialog after the registration names the next step as the page does.
    for (const [, , , , button] of dialogs) {
      assert.equal(button.label, "Buttons.VerifyAccount");
      button.onclick();
    }
    assert.equal(dialogs.length, guestReturn ? 0 : 1);
    assert.deepEqual(went, pushed, JSON.stringify(query));
  }
});

test("the login and the registration hand the target to each other", async () => {
  for (const [form, other] of [
    ["components/form/Login.vue", "/auth/signup"],
    ["components/form/Signup.vue", "/auth/login"],
  ]) {
    const links = [];
    (function visit(node) {
      const to = node.props?.find((p) => p.name === "bind" && p.arg?.content === "to");
      if (node.tag === "NuxtLink" && to?.exp.content.includes(other)) links.push(to.exp.content);
      for (const child of node.children ?? []) visit(child);
      for (const branch of node.branches ?? []) visit(branch);
    })(parse(await read(form)).descriptor.template.ast);
    assert.equal(links.length, 1, form);
    const to = new Function("redirect", `return (${links[0]});`);
    assert.deepEqual(to("/skill-tree/start/llms"), {
      path: other,
      query: { redirect: "/skill-tree/start/llms" },
    });
    assert.deepEqual(to(""), { path: other, query: {} });
  }
});
