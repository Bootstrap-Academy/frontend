// What a visitor without an account gets to see of the courses: the list, the page of one
// course, and the way to an account. With an account both behave as they did before.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import * as Vue from "vue";
import { component, evaluate, host, settle, tag } from "./helpers/mounted-page.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const siteHead = await evaluate("utils/siteHead.ts", {});
const guestCopy = await evaluate("utils/guest/copy.ts", {});
const journey = await evaluate("utils/courseJourney.ts", {});

/** The real texts of the course pages in one language. */
async function courseCopy(locale) {
  const i18n = { useI18n: () => ({ locale: Vue.ref(locale), t: (key) => key }) };
  const { useCourseExperienceCopy } = await evaluate("composables/courseExperience.ts", {
    require: (name) => ({ vue: Vue, "vue-i18n": i18n })[name],
  });
  return { i18n, useCourseExperienceCopy };
}

const paid = {
  id: "nmap",
  title: "NMap: Netzscans in der Praxis",
  description:
    "NMap ist das am meisten genutzte Tool, um Netzwerke zu scannen - welche Geräte gibt es, wo sind diese erreichbar. Damit ist es das wohl am meisten genutzte Tool für IT-Security überhaupt.",
  price: 500,
  learning_goals: [],
  requirements: [],
  learning_path_id: null,
  has_explicit_curriculum: false,
  sections: [
    {
      title: "NMap",
      lectures: [
        { title: "Was ist Nmap?", duration: 300, completed: false },
        { title: "Der erste Scan", duration: 420, completed: false },
      ],
    },
  ],
};

/** The page of one course, opened by a visitor with or without an account. */
async function coursePage({ token, answer, locale = "de" }) {
  const { i18n, useCourseExperienceCopy } = await courseCopy(locale);
  const calls = [];
  const head = {};
  const metas = [];
  const route = Vue.reactive({
    params: { id: paid.id },
    query: {},
    fullPath: `/courses/${paid.id}`,
  });
  const shared = { useCourseExperienceCopy, useRoute: () => route };
  const page = await component(
    "pages/courses/[id]/index.vue",
    {
      ...shared,
      useRouter: () => ({ push() {} }),
      useAccessToken: () => Vue.ref(token),
      useUser: () => Vue.ref(token ? { id: "user-a" } : null),
      useSession: () => Vue.ref(token ? { id: "session-a" } : null),
      useSeoMeta: (entries) => Object.assign(head, entries),
      definePageMeta: (given) => metas.push(given),
      GET: async (path) => {
        calls.push(path);
        return answer(path);
      },
    },
    {
      "vue-i18n": i18n,
      "~/utils/courseJourney": journey,
      "~/utils/guest/copy": guestCopy,
      "~/utils/siteHead": siteHead,
    }
  );
  const lessons = await component("components/course/Curriculum.vue", shared, {
    "@heroicons/vue/24/outline": { ChevronDownIcon: tag("svg") },
  });
  const h = host();
  const app = h.renderer.createApp(page);
  app.config.warnHandler = () => {};
  app.component("NuxtLink", tag("a"));
  app.component("CourseCurriculum", lessons);
  for (const name of ["CourseOverview", "CoursePractice", "CourseCurriculumLessons"])
    app.component(name, tag(name));
  app.mount(h.root);
  await settle();
  const links = h.all().filter((node) => node.type === "a");
  return {
    h,
    calls,
    // What the page asks of the router before it is opened.
    middleware: metas.flatMap((meta) => meta.middleware ?? []),
    head: Object.fromEntries(Object.entries(head).map(([key, value]) => [key, value()])),
    links: links.map((node) => ({ to: node.props.to, says: h.text(node).trim() })),
    overview: h.all().find((node) => node.type === "CourseOverview"),
    lessons: h.all().filter((node) => node.type === "button" && node.parent?.type === "li"),
  };
}

test("without an account the course page shows the course and the way to an account, and no price", async () => {
  for (const [locale, sentence, signup, login] of [
    ["de", "Zum Lernen brauchst du ein Konto.", "Kostenloses Konto anlegen", "Einloggen"],
    ["en-US", "You need an account to learn.", "Create a free account", "Log in"],
  ]) {
    const page = await coursePage({ token: "", answer: () => paid, locale });
    // The address opens without a login.
    assert(!page.middleware.includes("auth"), locale);
    // Only what is public is asked for: no request that needs a login leaves the browser.
    assert.deepEqual(page.calls, ["/skills/courses/nmap/summary"], locale);
    const text = page.h.text();
    assert(text.includes(paid.title) && text.includes(paid.description), locale);
    // The lessons are listed and none of them opens.
    assert.equal(page.lessons.length, 2, locale);
    assert(text.includes("Was ist Nmap?") && text.includes("Der erste Scan"), locale);
    assert(
      page.lessons.every((button) => button.props.disabled === true),
      locale
    );
    // The way to an account, said once, and the login leads back to this course.
    assert.equal(text.split(sentence).length - 1, 1, locale);
    assert.deepEqual(
      page.links.map((link) => [link.says, link.to]),
      [
        [locale === "de" ? "← Zur Übersicht" : "← Back to overview", "/courses"],
        [signup, "/auth/signup"],
        [login, { path: "/auth/login", query: { redirect: "/courses/nmap" } }],
      ],
      locale
    );
    // No price and no way to buy: the box that holds both is not there at all.
    assert(!page.overview, locale);
    assert(!page.h.ever("<CourseOverview>"), locale);
    assert(!/500|MorphCoins|freischalten|Unlock/i.test(text), locale);
  }
});

test("with an account the course page asks and shows what it did before", async () => {
  // A course the account may open: the full course, then the box with progress and start.
  const owned = await coursePage({ token: "token-a", answer: () => paid });
  assert.deepEqual(owned.calls, ["/skills/courses/nmap"]);
  assert.equal(owned.overview.props["is-course-accessible"], true);
  assert.equal(owned.overview.props.data.title, paid.title);
  assert.deepEqual(
    owned.links.map((link) => link.to),
    ["/profile/courses"]
  );
  assert(!owned.h.text().includes("Zum Lernen brauchst du ein Konto."));

  // A course the account has not got: the summary, then the same box with price and purchase.
  const locked = await coursePage({
    token: "token-a",
    answer: (path) => {
      if (path.endsWith("/summary")) return paid;
      throw { statusCode: 403 };
    },
  });
  assert.deepEqual(locked.calls, ["/skills/courses/nmap", "/skills/courses/nmap/summary"]);
  assert.equal(locked.overview.props["is-course-accessible"], false);
  assert.equal(locked.overview.props.data.price, 500);
  assert(!locked.h.text().includes("Zum Lernen brauchst du ein Konto."));
});

test("a course page is titled and described by its course", async () => {
  const page = await coursePage({ token: "", answer: () => paid });
  assert.equal(page.head.title, "NMap: Netzscans in der Praxis · Bootstrap Academy");
  assert.equal(page.head.ogTitle, page.head.title);
  assert.equal(
    page.head.description,
    "NMap ist das am meisten genutzte Tool, um Netzwerke zu scannen - welche Geräte gibt es, wo sind diese erreichbar. Damit ist es das wohl am meisten…"
  );
  assert.equal(page.head.ogDescription, page.head.description);
  assert(page.head.description.length <= 155);

  // A course without a description keeps the description of the site, and a course that
  // could not be loaded keeps its title as well: nothing empty is written into the head.
  const bare = await coursePage({ token: "", answer: () => ({ ...paid, description: "" }) });
  assert.equal(bare.head.title, "NMap: Netzscans in der Praxis · Bootstrap Academy");
  assert.equal(bare.head.description, undefined);
  const missing = await coursePage({
    token: "",
    answer: () => {
      throw { statusCode: 404 };
    },
  });
  assert.deepEqual(missing.head, {
    title: undefined,
    ogTitle: undefined,
    description: undefined,
    ogDescription: undefined,
  });
});

const catalogue = [
  { id: "bash", title: "Bash", description: "Die Shell von Linux.", price: 0, sections: [] },
  { ...paid },
  {
    id: "python-foundations",
    title: "Deine ersten Python-Programme",
    description: "Rechne mit Werten.",
    price: 0,
    learning_path_id: "python-loops",
    sections: [],
    translations: { en: { title: "Your first Python programs", description: "Calculate." } },
  },
];

/** The course list as a visitor without an account opens it. */
async function courseList({ locale = "de", answer = async () => [catalogue, null] } = {}) {
  const { i18n, useCourseExperienceCopy } = await courseCopy(locale);
  const head = {};
  let meta;
  const page = await component(
    "pages/courses/index.vue",
    {
      useCourseExperienceCopy,
      useSeoMeta: (entries) => Object.assign(head, entries),
      definePageMeta: (given) => (meta = given),
    },
    {
      "vue-i18n": i18n,
      "~/composables/courses": { getCourseCatalogue: answer },
      "~/utils/siteHead": siteHead,
    }
  );
  const h = host();
  const app = h.renderer.createApp(page);
  app.config.warnHandler = () => {};
  app.component("NuxtLink", tag("a"));
  for (const name of ["CourseCard", "CourseCardEmptyState", "Btn"]) app.component(name, tag(name));
  app.mount(h.root);
  await settle();
  const cards = () =>
    h
      .all()
      .filter((node) => node.type === "a")
      .map((node) => ({ to: node.props.to, card: node.children[0]?.props }));
  return { h, head, meta, cards, search: h.all().find((node) => node.type === "input") };
}

test("the course list links every course, the step-by-step courses first, without prices", async () => {
  const list = await courseList();
  assert.deepEqual(
    list.cards().map((entry) => entry.to),
    ["/courses/python-foundations", "/courses/bash", "/courses/nmap"]
  );
  // Every card is the plain one (the attribute is given without a value).
  for (const { card } of list.cards()) assert.equal(card.plain, "");
  assert.equal(list.head.title(), "Kurse · Bootstrap Academy");
  assert.equal(
    list.head.description(),
    "Deutschsprachige Kurse zu Programmierung, Linux, IT-Sicherheit und Informatik."
  );
  // The description is the sentence the page itself shows under its heading, once.
  assert.equal(list.h.text().split(list.head.description()).length - 1, 1);
  // The built page carries the same head, so it is there before the app has loaded.
  assert.deepEqual(siteHead.builtHeads["/courses"], {
    title: list.head.title(),
    description: list.head.description(),
  });

  const english = await courseList({ locale: "en-US" });
  assert.equal(english.head.title(), "Courses · Bootstrap Academy");
  assert.equal(
    english.head.description(),
    "German-language courses on programming, Linux, IT security and computer science."
  );
});

test("the course list is searched in the browser, in the language the visitor reads", async () => {
  const type = async (list, term) => {
    list.search.props.onInput({ target: { value: term } });
    await settle();
    return list.cards().map((entry) => entry.to);
  };
  const list = await courseList();
  assert.deepEqual(await type(list, "linux"), ["/courses/bash"]);
  assert.deepEqual(await type(list, "  NETZSCANS "), ["/courses/nmap"]);
  assert.deepEqual(await type(list, "gibt es nicht"), []);
  assert(list.h.all().some((node) => node.type === "CourseCardEmptyState"));
  assert.equal((await type(list, "")).length, 3);

  const english = await courseList({ locale: "en-US" });
  assert.deepEqual(await type(english, "first python"), ["/courses/python-foundations"]);
  assert.deepEqual(await type(english, "ersten"), []);
});

test("a course list that cannot be loaded says so and can be asked for again", async () => {
  let fails = true;
  const list = await courseList({
    answer: async () => (fails ? [null, { detail: "down" }] : [catalogue, null]),
  });
  assert.equal(list.cards().length, 0);
  const alert = list.h.all().find((node) => node.props.role === "alert");
  assert(list.h.text(alert).includes("Error.TryAgainLater"));
  fails = false;
  alert.children.find((node) => node.type === "Btn").props.onClick();
  await settle();
  assert.equal(list.cards().length, 3);
});

test("with an account the course list is the catalogue", async () => {
  const { meta } = await courseList();
  const visit = (cookie) => {
    const went = [];
    const middleware = new Function(
      "useAppCookie",
      "navigateTo",
      `return (${meta.middleware.toString()})()`
    );
    const result = middleware(
      (name) => ({ value: name === "accessToken" ? cookie : undefined }),
      (...to) => (went.push(to), "redirected")
    );
    return { went, result };
  };
  assert.deepEqual(visit("token-a"), {
    went: [["/profile/courses", { replace: true }]],
    result: "redirected",
  });
  assert.deepEqual(visit(undefined), { went: [], result: undefined });
});

/** The card of one course, as the catalogue shows it or as the public list does. */
async function card(data, plain) {
  const { useCourseExperienceCopy } = await courseCopy("de");
  const icon = tag("svg");
  const Card = await evaluate("components/course/Card.vue", {
    require: (name) =>
      ({
        vue: Vue,
        "vue-i18n": { useI18n: () => ({ t: (key) => key }) },
        "@heroicons/vue/24/outline": { PlayIcon: icon },
        "~/components/icon/Morphcoin.vue": { default: icon },
        "~/utils/courseImages": { courseImage: (src) => ({ src, srcset: "" }) },
      })[name],
    defineComponent: Vue.defineComponent,
    computed: Vue.computed,
    ref: Vue.ref,
    watch: Vue.watch,
    useCourseExperienceCopy,
  });
  const h = host();
  const app = h.renderer.createApp({ render: () => Vue.h(Card, { data, plain }) });
  app.config.warnHandler = () => {};
  for (const name of ["IconText", "Price", "Chip"]) app.component(name, tag(name));
  app.mount(h.root);
  await settle();
  const types = h.all().map((node) => node.type);
  return { h, types };
}

test("the card of the public list says what a course is and leaves out price and progress", async () => {
  // In the catalogue a course with a price shows it, a free one says so, a finished one too.
  assert((await card(paid, false)).types.includes("Price"));
  assert((await card(catalogue[0], false)).h.text().includes("Headings.Free"));
  assert((await card({ ...catalogue[0], completed: true }, false)).h.text().includes("Completed"));

  for (const course of [paid, catalogue[0], { ...catalogue[0], completed: true }]) {
    const plain = await card(course, true);
    assert(!plain.types.includes("Price") && !plain.types.includes("Chip"), course.id);
    assert(plain.h.text().includes(course.title), course.id);
    assert(!/Headings\.(Free|Completed)/.test(plain.h.text()), course.id);
  }
  // What is left below the line: the number of lessons, or that the course leads step by step.
  assert((await card(paid, true)).h.text().includes("2 Lerneinheiten"));
  assert((await card(catalogue[2], true)).h.text().includes("Dein Lernweg"));
  // Nothing left to say there: no empty row under a line.
  assert(!(await card(catalogue[0], true)).types.includes("hr"));
  assert((await card(catalogue[0], false)).types.includes("hr"));
});

test("the course list is where the links to the courses lead", async () => {
  // „Kurse entdecken“ after the guest exercise.
  const start = await read("pages/start.vue");
  assert.match(
    start,
    /<NuxtLink v-if="!authenticated" to="\/courses" class="secondary">\{\{ copy\.browse \}\}<\/NuxtLink>/
  );
  assert.equal(guestCopy.guestCopy("de").browse, "Kurse entdecken");

  // The footer of every page, and the navigation of a visitor without an account.
  const courses = { label: "Headings.Courses", pathname: "/courses" };
  const footer = await evaluate("components/Footer.vue", {
    require: (name) => ({ vue: Vue, "vue-i18n": { useI18n: () => ({ t: (key) => key }) } })[name],
    defineComponent: (options) => options,
  });
  assert.deepEqual(footer.setup().webLinks[1], courses);
  const layout = async (token) => {
    const options = await evaluate("layouts/default.vue", {
      computed: Vue.computed,
      useAccessToken: () => Vue.ref(token),
    });
    return options.setup().links.value;
  };
  assert.deepEqual((await layout(""))[1], courses);
  // With an account the navigation is unchanged: the catalogue is reached from the dashboard.
  assert(!(await layout("token-a")).some((link) => link.pathname === "/courses"));
  for (const locale of ["de", "en-US"])
    assert.equal(
      JSON.parse(await read(`locales/${locale}.json`)).Headings.Courses,
      locale === "de" ? "Kurse" : "Courses"
    );
});
