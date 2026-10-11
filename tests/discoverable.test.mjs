// What a search engine and a link preview get to read: the head of the built pages, the
// address of each page, and the files a crawler asks for.
import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";
import * as Vue from "vue";
import * as vueI18n from "vue-i18n";
import { component, evaluate } from "./helpers/mounted-page.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const head = await evaluate("utils/siteHead.ts", {});
const courseIds = JSON.parse(await read("assets/public-course-ids.json"));
const built = await evaluate("modules/discoverable.ts", {
  require: (name) =>
    ({
      "node:fs/promises": fs,
      "node:path": path,
      "nuxt/kit": { defineNuxtModule: (definition) => definition },
      "../assets/public-course-ids.json": courseIds,
      "../utils/siteHead": head,
    })[name],
});

// The head of a built page as the framework writes it, shortened to what matters here.
const shell = (config) =>
  `<!DOCTYPE html><html${config.lang ? ` lang="${config.lang}"` : ""}><head><meta charset="utf-8">` +
  `<title>${config.title}</title>` +
  config.meta
    .map((tag) =>
      tag.property
        ? `<meta property="${tag.property}" content="${tag.content}">`
        : `<meta name="${tag.name}" content="${tag.content}">`
    )
    .join("") +
  `</head><body><div id="__nuxt"></div></body></html>`;

/** The module set up for a site at `web`, with what it registers and adds to the head. */
function site(web, module = built) {
  const hooks = {};
  const prerender = {};
  const nuxt = {
    options: { runtimeConfig: { public: { BASE_WEB_URL: web } }, app: { head: { meta: [] } } },
    hook: (name, run) => (hooks[name] = run),
  };
  module.default.setup({}, nuxt);
  hooks["nitro:init"]({ hooks: { hook: (name, run) => (prerender[name] = run) } });
  const config = nuxt.options.app.head;
  return {
    config: { ...config, lang: config.htmlAttrs?.lang },
    hooks,
    /** The HTML that is built for one address. */
    page(route) {
      const entry = { route, contents: shell({ ...config, lang: config.htmlAttrs?.lang }) };
      prerender["prerender:generate"](entry);
      return entry.contents;
    },
  };
}
const tag = (html, pattern) => html.match(pattern)?.[1];

const locales = {
  "../locales/de.json": JSON.parse(await read("locales/de.json")),
  "../locales/en-US.json": JSON.parse(await read("locales/en-US.json")),
};
/** What the app itself puts into the head of every page, for one address. */
async function appHead({ path: address, web = "https://academy.example", locale, error = null }) {
  let entry;
  const plugin = await evaluate("plugins/i18n.ts", {
    require: (name) => ({ "vue-i18n": vueI18n, "~/utils/siteHead": head, ...locales })[name],
    defineNuxtPlugin: (setup) => setup,
    useAppCookie: () => ({ value: locale }),
    useRoute: () => ({ path: address }),
    useError: () => Vue.ref(error),
    useRuntimeConfig: () => ({ public: { BASE_WEB_URL: web } }),
    useHead: (given) => (entry = given),
  });
  plugin.default({ vueApp: { use() {} } });
  return entry();
}

test("the texts of the start page and of the guest exercise are the approved ones", () => {
  assert.deepEqual(head.siteHead.de.home, {
    title: "Bootstrap Academy: Programmieren und IT online lernen",
    description:
      "Deutschsprachige Kurse zu Programmierung, Linux, IT-Sicherheit und Informatik. Die erste Übung startest du ohne Konto direkt im Browser.",
  });
  assert.deepEqual(head.siteHead.de.start, {
    title: "Python-Schleifen ausprobieren, ohne Konto · Bootstrap Academy",
    description:
      "Bewege eine Figur mit Anweisungen und Wiederholungen ans Ziel und sieh, wie daraus eine Python-Schleife wird.",
  });
  // The English interface has its own, and none is left empty.
  for (const page of ["home", "start"])
    for (const part of ["title", "description"]) {
      assert(head.siteHead.en[page][part].length > 20, `${page} ${part}`);
      assert.notEqual(head.siteHead.en[page][part], head.siteHead.de[page][part]);
    }
});

test("the built HTML is German, describes the site and carries the preview of a shared link", () => {
  const { config } = site("https://academy.example");
  const html = shell(config);
  assert.match(html, /^<!DOCTYPE html><html lang="de">/);
  assert.equal(tag(html, /<title>([^<]*)<\/title>/), head.siteHead.de.home.title);
  // One description, by name. The earlier head lost it to a second tag with the same key.
  assert.deepEqual(html.match(/<meta name="description" content="[^"]*">/g), [
    `<meta name="description" content="${head.siteHead.de.home.description}">`,
  ]);
  assert(!html.includes('property="description"'));
  const og = Object.fromEntries(
    [...html.matchAll(/<meta property="(og:[a-z:_]+)" content="([^"]*)">/g)].map((m) => [
      m[1],
      m[2],
    ])
  );
  assert.deepEqual(og, {
    "og:type": "website",
    "og:site_name": "Bootstrap Academy",
    "og:locale": "de_DE",
    "og:title": head.siteHead.de.home.title,
    "og:description": head.siteHead.de.home.description,
    "og:image": "https://academy.example/images/preview.png",
    "og:image:width": "1200",
    "og:image:height": "630",
  });
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  // The HTML of the start page answers every address that has no file of its own, so it
  // names no address: neither a canonical one nor one for the preview.
  assert(!html.includes('rel="canonical"') && !("og:url" in og));
});

test("no address of the site is written into the code: it comes from the runtime config", async () => {
  for (const web of ["https://academy.example", "https://test.academy.example/"]) {
    const origin = web.replace(/\/$/, "");
    const { config, page } = site(web);
    assert.equal(
      config.meta.find((entry) => entry.property === "og:image").content,
      `${origin}/images/preview.png`
    );
    assert.match(page("/start"), new RegExp(`<link rel="canonical" href="${origin}/start/">`));
  }
  // Without a usable address the build stops.
  for (const web of ["", "http://academy.example", "https://academy.example/path"])
    assert.throws(() => site(web), /BASE_WEB_URL/, web);
  for (const file of [
    "nuxt.config.ts",
    "modules/discoverable.ts",
    "utils/siteHead.ts",
    "plugins/i18n.ts",
    "pages/index.vue",
    "pages/start.vue",
    "pages/courses/index.vue",
    "pages/courses/[id]/index.vue",
    "scripts/build-course-list.mjs",
  ]) {
    const source = (await read(file)).replace(/BASE_(API|WEB)_URL: "[^"]*"/g, "");
    assert(!/https?:\/\/(test\.|api\.|www\.)?bootstrap\.academy/.test(source), file);
  }
});

test("the guest exercise has its own title, description and address in its built HTML", () => {
  const { page, config } = site("https://academy.example");
  const start = page("/start");
  const { title, description } = head.siteHead.de.start;
  assert.equal(tag(start, /<title>([^<]*)<\/title>/), title);
  assert.equal(tag(start, /<meta name="description" content="([^"]*)">/), description);
  assert.equal(tag(start, /<meta property="og:title" content="([^"]*)">/), title);
  assert.equal(tag(start, /<meta property="og:description" content="([^"]*)">/), description);
  assert.equal(
    tag(start, /<link rel="canonical" href="([^"]*)">/),
    "https://academy.example/start/"
  );
  assert.equal(
    tag(start, /<meta property="og:url" content="([^"]*)">/),
    "https://academy.example/start/"
  );
  // The image and the language stay those of the site.
  assert.match(start, /<html lang="de">/);
  assert.match(start, /og:image" content="https:\/\/academy\.example\/images\/preview\.png"/);
  // The course list has its own as well.
  const courses = page("/courses/");
  assert.equal(tag(courses, /<title>([^<]*)<\/title>/), "Kurse · Bootstrap Academy");
  assert.equal(
    tag(courses, /<meta name="description" content="([^"]*)">/),
    head.siteHead.de.courses.description
  );
  assert.equal(
    tag(courses, /<link rel="canonical" href="([^"]*)">/),
    "https://academy.example/courses/"
  );
  // Every other address keeps the HTML of the start page, untouched.
  for (const route of ["/", "/auth/login", "/docs/imprint", "/courses/python", "/200.html"])
    assert.equal(page(route), shell(config), route);
});

test("a head that lost its expected shape stops the build", () => {
  const own = { title: 'A "quoted" <title> & more', description: "d" };
  const ok = shell({ title: "t", meta: site("https://academy.example").config.meta });
  const html = built.withHead(ok, own, "https://academy.example/x/");
  assert.match(html, /<title>A &quot;quoted&quot; &lt;title> &amp; more<\/title>/);
  assert.equal((html.match(/<title>/g) ?? []).length, 1);
  for (const broken of [
    ok.replace(/<title>[^<]*<\/title>/, ""),
    ok.replace(/<meta name="description"[^>]*>/, ""),
    ok.replace(/(<meta property="og:title"[^>]*>)/, "$1$1"),
  ])
    assert.throws(() => built.withHead(broken, own, "https://academy.example/x/"), /Built HTML/);
});

test("crawlers are let in by a robots.txt that the build writes", async (t) => {
  const { hooks } = site("https://academy.example");
  const directory = await mkdtemp(path.join(tmpdir(), "academy-discoverable-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await hooks["nitro:build:public-assets"]({ options: { output: { publicDir: directory } } });
  const robots = await readFile(path.join(directory, "robots.txt"), "utf8");
  assert.deepEqual(robots.split("\n").slice(0, 2), ["User-agent: *", "Allow: /"]);
  assert(!/Disallow/i.test(robots));
  // It names the sitemap, with the address of the site it was built for.
  assert.deepEqual(
    robots.split("\n").filter((line) => line.startsWith("Sitemap:")),
    ["Sitemap: https://academy.example/sitemap.xml"]
  );
});

test("the build writes a sitemap with the public pages and every course", async (t) => {
  const { hooks } = site("https://academy.example");
  const directory = await mkdtemp(path.join(tmpdir(), "academy-discoverable-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await hooks["nitro:build:public-assets"]({ options: { output: { publicDir: directory } } });
  const sitemap = await readFile(path.join(directory, "sitemap.xml"), "utf8");
  assert(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns='));
  assert(sitemap.endsWith("</urlset>\n"));
  const addresses = [...sitemap.matchAll(/<url><loc>([^<]*)<\/loc><\/url>/g)].map((m) => m[1]);
  assert.equal(addresses.length, sitemap.split("<url>").length - 1);
  // Exactly these: the start page, the guest exercise, the course list, every course of the
  // list in the repository, and the legal texts. Each in the form the page names as its own.
  const fixed = [
    "/",
    "/start/",
    "/courses/",
    "/docs/privacy/",
    "/docs/terms-and-conditions/",
    "/docs/right-of-withdrawal/",
    "/docs/imprint/",
  ];
  assert.deepEqual(
    [...addresses].sort(),
    [...fixed, ...courseIds.map((id) => `/courses/${id}/`)]
      .map((address) => "https://academy.example" + address)
      .sort()
  );
  assert.equal(new Set(addresses).size, addresses.length);
  for (const address of addresses)
    assert.equal(head.canonicalUrl("https://academy.example", new URL(address).pathname), address);
  // Each of the fixed addresses is a page of the app.
  for (const address of fixed.slice(1)) {
    const page = address.slice(0, -1);
    const file = await read(`pages${page}.vue`).catch(() => read(`pages${page}/index.vue`));
    assert(file.includes("<template>"), address);
  }
  // Pages that need a login or that are steps of a purchase are not named.
  assert(!/dashboard|profile|auth|orders|morphcoins|subscription/.test(sitemap));

  // The list of courses is plain: ids in order, each once, each usable as part of an address.
  assert(courseIds.length > 0);
  assert.deepEqual(courseIds, [...new Set(courseIds)].sort());
  for (const id of courseIds) assert.match(id, /^[a-z0-9_-]+$/i);
  assert.throws(
    () => built.sitemapXml("https://academy.example", ["python", "a/b"]),
    /unexpected course ids \["a\/b"\]/
  );
  // The build reads the list from the repository and asks no one for it.
  const module = await read("modules/discoverable.ts");
  assert(!/fetch\(|\$fetch|BASE_API_URL/.test(module));
});

test("a build without a usable list of courses stops", async () => {
  const message = /public-course-ids\.json must be a list of course ids and must not be empty/;
  for (const list of [[], {}, null, "python", [1], ["python", null]]) {
    const label = JSON.stringify(list);
    assert.throws(() => built.sitemapXml("https://academy.example", list), message, label);
    // The module stops while it is set up, before anything is built or written.
    const broken = await evaluate("modules/discoverable.ts", {
      require: (name) =>
        ({
          "node:fs/promises": fs,
          "node:path": path,
          "nuxt/kit": { defineNuxtModule: (definition) => definition },
          "../assets/public-course-ids.json": list,
          "../utils/siteHead": head,
        })[name],
    });
    assert.throws(() => site("https://academy.example", broken), message, label);
  }
  // The list in the repository passes.
  assert.doesNotThrow(() => site("https://academy.example"));
});

test("each page names one address for itself, and pages are called by what they are", async () => {
  assert.equal(head.canonicalUrl("https://academy.example", "/"), "https://academy.example/");
  assert.equal(
    head.canonicalUrl("https://academy.example/", "/courses/python"),
    "https://academy.example/courses/python/"
  );
  assert.equal(
    head.canonicalUrl("https://academy.example", "/start/?from=mail#top"),
    "https://academy.example/start/"
  );
  assert.equal(head.pageTitle("Kurse"), "Kurse · Bootstrap Academy");
  // The address comes from the route, at runtime, for every page.
  const python = await appHead({ path: "/courses/python" });
  assert.deepEqual(python.link, [
    { rel: "canonical", href: "https://academy.example/courses/python/" },
  ]);
  assert.deepEqual(python.meta, [
    { property: "og:url", content: "https://academy.example/courses/python/" },
  ]);
  assert.equal(python.title, "Bootstrap Academy");
  assert.equal(python.htmlAttrs.lang, "de");
  assert.deepEqual((await appHead({ path: "/start/", web: "" })).link, []);
  // The legal pages take their names from the footer. Their own files are not touched.
  const names = (locale) => locales[`../locales/${locale}.json`].Links;
  for (const [address, key] of [
    ["/docs/privacy", "Privacy"],
    ["/docs/imprint/", "Imprint"],
    ["/docs/terms-and-conditions", "TermsAndConditions"],
    ["/docs/terms-and-conditions-2026-09-r2", "TermsAndConditions"],
    ["/docs/right-of-withdrawal", "RightOfWithdrawal"],
  ]) {
    assert.equal(
      (await appHead({ path: address })).title,
      `${names("de")[key]} · Bootstrap Academy`,
      address
    );
    const inEnglish = await appHead({ path: address, locale: "en-US" });
    assert.equal(inEnglish.title, `${names("en-US")[key]} · Bootstrap Academy`, address);
    assert.equal(inEnglish.htmlAttrs.lang, "en");
    assert.notEqual(names("de")[key], names("en-US")[key], key);
  }
  assert.equal(names("de").Imprint, "Impressum");
  // The start page and the guest exercise set title and description in the chosen language.
  for (const [file, page] of [
    ["pages/index.vue", "home"],
    ["pages/start.vue", "start"],
  ]) {
    const source = await read(file);
    assert(source.includes(`siteHead[locale.value.startsWith("en") ? "en" : "de"].${page}`), file);
    for (const part of ["title", "ogTitle", "description", "ogDescription"])
      assert(new RegExp(`${part}: \\(\\) => head\\.value\\.`).test(source), `${file} ${part}`);
  }
  // The skill tree is called by its name. The option `head` of a component has no effect here.
  const tree = await read("pages/skill-tree/index.vue");
  assert.match(tree, /useHead\(\(\) => \(\{ title: pageTitle\(t\("Links\.SkillTree"\)\) \}\)\);/);
  assert(!/^\s+head: \{/m.test(tree));
});

test("an address without a page asks not to be indexed and names no address for itself", async () => {
  // The error page: its own title, the request to stay out of the index, in both languages.
  for (const [statusCode, key] of [
    [404, "Body.PageNotFound"],
    [500, "Body.UnexpectedError"],
  ]) {
    let entry;
    const page = await component(
      "error.vue",
      { useHead: (given) => (entry = given) },
      {
        "vue-i18n": { useI18n: () => ({ t: (name) => `<${name}>` }) },
        "~/utils/siteHead": head,
      }
    );
    page.setup({ error: { statusCode } }, { expose() {} });
    assert.deepEqual(entry(), {
      title: `<${key}> · Bootstrap Academy`,
      meta: [{ name: "robots", content: "noindex" }],
    });
  }
  // While the error page is shown, the app names no address: the one in the address bar has
  // no page. Before and after, every page names its own.
  const failed = await appHead({ path: "/gibt-es-nicht", error: { statusCode: 404 } });
  assert.deepEqual([failed.link, failed.meta], [[], []]);
  assert.equal((await appHead({ path: "/gibt-es-nicht" })).link.length, 1);
  // Only the error page asks for it. The pages that exist say nothing about indexing.
  for (const file of ["pages/index.vue", "pages/start.vue", "pages/courses/index.vue"])
    assert(!/noindex/.test(await read(file)), file);
});

test("a description for a search result is the beginning of the text, cut at a word", () => {
  assert.equal(head.shortDescription("Kurz und gut."), "Kurz und gut.");
  assert.equal(head.shortDescription("  Mit\nZeilen   und  Lücken. "), "Mit Zeilen und Lücken.");
  assert.equal(head.shortDescription(""), "");
  assert.equal(head.shortDescription(null), "");
  const long = "Dieser Kurs ist ein Must-Have für alle Informatiker. ".repeat(6);
  const short = head.shortDescription(long);
  assert(short.length <= 155 && short.endsWith("…"), short);
  assert(long.startsWith(short.slice(0, -1)), "nothing but the beginning of the text");
  assert(!/\s…$/.test(short) && /[A-Za-zäöüß.]…$/.test(short), "cut at the end of a word");
});

test("every copy of the site asks not to be indexed, the production host does not", async () => {
  const blocks = (await read("public/_headers"))
    .split(/\n(?=https:)/)
    .filter((block) => block.startsWith("https:"));
  const rules = Object.fromEntries(
    blocks.map((block) => [block.split("\n")[0], block.split("\n").slice(1).join("\n")])
  );
  // The test host, and the pages.dev addresses of the project and of each of its deployments.
  const copies = [
    "https://test.bootstrap.academy/*",
    "https://:project.pages.dev/*",
    "https://:version.:project.pages.dev/*",
  ];
  assert.deepEqual(Object.keys(rules), [...copies, "https://bootstrap.academy/*"]);
  for (const host of copies) assert.match(rules[host], /^ {2}X-Robots-Tag: noindex$/m, host);
  assert(!/X-Robots-Tag/.test(rules["https://bootstrap.academy/*"]));
  // The other rule of this file stays where it was: on the two hosts of the Academy.
  assert.deepEqual(
    Object.keys(rules).filter((host) => /Strict-Transport-Security/.test(rules[host])),
    ["https://test.bootstrap.academy/*", "https://bootstrap.academy/*"]
  );
});

test("the preview image is a landscape picture of the usual size", async () => {
  const png = await readFile(new URL("../public/images/preview.png", import.meta.url));
  assert.equal(png.toString("latin1", 1, 4), "PNG");
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
});
