// Terms and withdrawal instruction 2026-10: the pages carry the reviewed wording word for word,
// the configured start decides which version is in force, and signup and the gate for existing
// accounts follow it (composables/terms.ts, utils/legalEffectiveDate.ts).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import * as Vue from "vue";
import { createSSRApp, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import { component, evaluate } from "./helpers/mounted-page.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const dir = await mkdtemp(join(tmpdir(), "terms-2026-10-"));
after(() => rm(dir, { recursive: true, force: true }));

/** A TypeScript module of the app as an ES module, with the date rules imported for real. */
async function load(relative) {
  let code = ts.transpileModule(await read(relative), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  code = code.replaceAll(
    'from "~/utils/legalEffectiveDate"',
    `from ${JSON.stringify(new URL("../utils/legalEffectiveDate.ts", import.meta.url).href)}`
  );
  const path = join(dir, relative.replaceAll(/[^a-z0-9]/gi, "_") + ".mjs");
  await writeFile(path, code);
  return import(pathToFileURL(path));
}

const dates = await import(new URL("../utils/legalEffectiveDate.ts", import.meta.url));
const terms = await load("composables/terms.ts");

// The reviewed drafts the pages are built from, each without its comments: the working notes
// stay with the drafts of the company and are not published. Next to each fixture the SHA-256
// of the draft it was taken from, so that a changed draft is noticed and the fixture renewed.
// All of them come from draft v3 (19 October 2026).
const DRAFTS = {
  "seitenkaesten.md": {
    fixture: "88c13a5acf76ebc6618d988cfe23180d34abbd133ba06d973f5da22bf545785e",
    draft: "759b2b8395446526a22fc272b58ee160c1e4ef52468c21d5e8f0f1ddc2149945",
  },
  "agb-2026-10.md": {
    fixture: "68d1a1e5c029900a2d5c42589aea656ab095dec61952ef3af8e4ac435f46f1b3",
    draft: "fa619592b83fabd5913ffc247af9b30825180d085fb49f83d7c1f78ca1a1bd97",
  },
  "widerrufsbelehrung-2026-10.md": {
    fixture: "9ccfb224339e27818afe907391e1946cfa8934b580adcc63837c73d5a64b0c18",
    draft: "d659dbd256ad71be7be5a40f4d5c625a792cc56cd7ceeae12d671bb00bf010b2",
  },
  "widerrufsbelehrung-2026-10-en.md": {
    fixture: "0b3566e1b044f3b92608a83cf96a2697afd1084f13725b4c1a8cb4bb370ee4d7",
    draft: "c2a9d0128149c64e0e1e5168558a08b5370e0b94039f2a1126c1f5beb8c8d87c",
  },
};
const sha = (text) => createHash("sha256").update(text).digest("hex");
/** A fixture, refused when it is not the copy of the draft recorded above. */
async function draft(name) {
  const text = await read(`tests/fixtures/legal-2026-10/${name}`);
  assert.equal(sha(text), DRAFTS[name].fixture, `${name} is the recorded copy of its draft`);
  return text;
}

/** Runs `fn` with the names the app gets from Nuxt, for the given start of terms 2026-10. */
async function withConfig(from, fn, extra = {}) {
  const values = {
    useRuntimeConfig: () => ({ public: { TERMS_2026_10_FROM: from } }),
    ...extra,
  };
  const old = Object.keys(values).map((key) => [key, globalThis[key]]);
  Object.assign(globalThis, values);
  try {
    return await fn();
  } finally {
    for (const [key, value] of old)
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
  }
}

// One start that has passed and one that lies ahead, both at midnight in Berlin.
const PASSED = "2026-10-01T00:00:00+02:00";
const AHEAD = "2099-12-09T00:00:00+01:00";

test("the start is midnight in Berlin, and the date is written the same way everywhere", () => {
  assert.equal(dates.parseEffectiveStart(""), null);
  for (const [value, de, en] of [
    ["2026-12-09T00:00:00+01:00", "9. Dezember 2026", "9 December 2026"],
    ["2026-12-08T23:00:00Z", "9. Dezember 2026", "9 December 2026"],
    ["2026-12-09T00:00+01:00", "9. Dezember 2026", "9 December 2026"],
    ["2027-03-01T00:00:00.000+01:00", "1. März 2027", "1 March 2027"],
    ["2027-06-01T00:00:00+02:00", "1. Juni 2027", "1 June 2027"],
    ["2027-05-31T22:00:00Z", "1. Juni 2027", "1 June 2027"],
  ]) {
    const date = dates.parseEffectiveStart(value);
    assert.equal(dates.germanDate(date), de, value);
    assert.equal(dates.englishDate(date), en, value);
  }
  for (const value of [
    "2026-12-09",
    "2026-12-09T00:00:00",
    "2026-12-09T00:00:00Z",
    "2026-12-09T00:00:00+02:00",
    "2026-12-09T00:00:01+01:00",
    "2026-02-30T00:00:00+01:00",
    "2026-12-09T24:00:00+01:00",
    "9. Dezember 2026",
  ])
    assert.throws(() => dates.parseEffectiveStart(value), /Effective date/, value);
});

test("terms 2026-10 are unpublished without a start, announced before it and in force from it", async () => {
  await withConfig("", () => {
    assert.deepEqual(terms.terms202610(), {
      published: false,
      inForce: false,
      date: "",
      dateEn: "",
    });
  });
  const start = "2026-12-09T00:00:00+01:00";
  const moment = Date.parse(start);
  await withConfig(start, () => {
    assert.deepEqual(terms.terms202610(moment - 1), {
      published: true,
      inForce: false,
      date: "9. Dezember 2026",
      dateEn: "9 December 2026",
    });
    assert.equal(terms.terms202610(moment).inForce, true);
  });
  await withConfig("2026-12-09T01:00:00+01:00", () =>
    assert.throws(() => terms.terms202610(), /not 00:00 in Europe\/Berlin/)
  );
});

test("signup offers 2026-10 from its start, and nobody with an account is asked to accept it", async () => {
  const user = ref({ id: "synthetic-user", terms_version: "2026-09-r4" });
  const requests = [];
  const app = {
    useUser: () => user,
    isAuth: ref(true),
    useProfileLoaded: () => ref(true),
    useState: (_name, initial) => ref(initial()),
    isPublicLegalRoute: () => false,
    POST: async (url, body) => {
      requests.push({ url, body });
      return {};
    },
    getUser: async () => {},
  };
  for (const [from, signup, gateLink] of [
    ["", ["2026-09-r4", "/docs/terms-and-conditions"], "/docs/terms-and-conditions"],
    [AHEAD, ["2026-09-r4", "/docs/terms-and-conditions"], "/docs/terms-and-conditions"],
    [
      PASSED,
      ["2026-10", "/docs/terms-and-conditions-2026-10"],
      "/docs/terms-and-conditions-2026-09-r4",
    ],
  ])
    await withConfig(
      from,
      async () => {
        const offered = terms.registrationTerms();
        assert.deepEqual([offered.version, offered.url], signup, from);
        // The gate records r4, so it links the page that shows r4 at that moment.
        assert.equal(terms.termsDocumentUrl(terms.TERMS_VERSION), gateLink, from);
        user.value.terms_version = "2026-09-r4";
        assert.equal(terms.needsTermsAcceptance("/learn"), false, `r4 account, ${from}`);
        user.value.terms_version = "2026-10";
        assert.equal(terms.needsTermsAcceptance("/learn"), !from, `2026-10 account, ${from}`);
        // Until the start the gate asks accounts below r4 for r4; from the start it ends.
        for (const below of ["2026-09-r3", "2026-09-r1", null]) {
          user.value.terms_version = below;
          assert.equal(
            terms.needsTermsAcceptance("/learn"),
            from !== PASSED,
            `${below} account, ${from}`
          );
        }
        await terms.acceptTerms();
        assert.equal(requests.at(-1).body.terms_version, "2026-09-r4", from);
      },
      app
    );
});

/** A component of the app with its real script and template, in either style of script. */
const anyComponent = async (path) =>
  (await read(path)).includes("<script setup")
    ? component(path, {})
    : evaluate(path, { require: (name) => ({ vue: Vue })[name] });

/** The page of `file` rendered as the browser gets it, with `components` for its imports. */
async function rendered(file, from, components = {}) {
  const modules = {};
  for (const [name, path] of Object.entries(components)) modules[name] = await anyComponent(path);
  const page = await component(file, {}, modules);
  return withConfig(from, () => renderToString(createSSRApp(page)), {
    terms202610: terms.terms202610,
    createError: (options) => Object.assign(new Error(options.statusMessage), options),
  });
}

const TERMS = {
  "../../components/legal/TermsAndConditionsR4.vue": "components/legal/TermsAndConditionsR4.vue",
  "../../components/legal/TermsAndConditions202610.vue":
    "components/legal/TermsAndConditions202610.vue",
};
const WITHDRAWAL = {
  "../../components/legal/RightOfWithdrawal202609.vue":
    "components/legal/RightOfWithdrawal202609.vue",
  "../../components/legal/RightOfWithdrawal202610.vue":
    "components/legal/RightOfWithdrawal202610.vue",
};

test("the main pages show the version in force, and the 2026-10 pages exist once a start is set", async () => {
  for (const from of ["", AHEAD]) {
    const agb = await rendered("pages/docs/terms-and-conditions.vue", from, TERMS);
    assert(agb.includes("Fassung: 2026-09-r4") && !agb.includes("2026-10"), from);
    const withdrawal = await rendered("pages/docs/right-of-withdrawal.vue", from, WITHDRAWAL);
    assert(withdrawal.includes("Stand: September 2026") && !withdrawal.includes("2026-10"), from);
  }
  const agb = await rendered("pages/docs/terms-and-conditions.vue", PASSED, TERMS);
  assert(agb.includes("Fassung: 2026-10, gültig ab dem 1. Oktober 2026"));
  assert(!agb.includes("Fassung: 2026-09-r4"));
  const withdrawal = await rendered("pages/docs/right-of-withdrawal.vue", PASSED, WITHDRAWAL);
  assert(withdrawal.includes("Stand: Fassung 2026-10, gültig ab dem 1. Oktober 2026"));
  assert(withdrawal.includes("Version 2026-10, valid from 1 October 2026"));

  // The boxes until the start, word for word as in draft v3 (`seitenkaesten.md`) with the date
  // filled in. The notice on the platform links the box of the terms, so that box names the
  // changed clauses (clause 20.1); the start and who the version applies to stand in the header
  // of the terms right below it, and a page says each thing once. The withdrawal instructions
  // name their start only in their closing line, so their box names it, and a reader coming
  // from the notice sees it at once. The draft has one section per address, and the heading of
  // each box is its title.
  const [, ...sections] = (await draft("seitenkaesten.md"))
    .replaceAll("[Datum]", "9. Dezember 2099")
    .split(/^## \d+\. Kasten über (\S+)$/m);
  const boxes = {};
  for (let i = 0; i < sections.length; i += 2)
    boxes[sections[i]] = markdownBlocks(sections[i + 1], -2);
  for (const [file, imports, title, boxDated, dated] of [
    [
      "pages/docs/terms-and-conditions-2026-10.vue",
      TERMS,
      "AGB – Fassung 2026-10",
      false,
      // The header of the terms, the cut-off for earlier Premium (8.1) and the closing line.
      [
        "Diese Fassung gilt ab dem 9. Dezember 2099 für neue Verträge, wenn wir sie beim Abschluss vereinbaren.",
        "Premium-Zeiträume, die du vor dem 9. Dezember 2099 bestellt hast",
        "Fassung: 2026-10, gültig ab dem 9. Dezember 2099",
      ],
    ],
    [
      "pages/docs/right-of-withdrawal-2026-10.vue",
      WITHDRAWAL,
      "Widerrufsbelehrung – Fassung 2026-10",
      true,
      // The closing line of the German text; the translation has its own in English.
      ["Stand: Fassung 2026-10, gültig ab dem 9. Dezember 2099"],
    ],
  ]) {
    // Without a start the page does not exist.
    await assert.rejects(rendered(file, "", imports), { statusCode: 404, fatal: true });
    // Announced: it says that it does not apply yet and leads to the version in force.
    const announced = await rendered(file, AHEAD, imports);
    const end = announced.indexOf("</aside>");
    const box = htmlBlocks(announced.slice(0, end));
    const reviewed = boxes[file.replace(/^pages/, "").replace(/\.vue$/, "")];
    assert(reviewed, `${file} has its box in the draft`);
    assert.deepEqual(box.blocks[0], ["h1", title], file);
    assert.deepEqual(box.blocks, reviewed.blocks, file);
    assert.deepEqual(box.links, reviewed.links, file);
    // The box of the withdrawal instructions names the start, the box of the terms does not;
    // the documents name it at the places they had before.
    const count = (text) => text.split("9. Dezember 2099").length - 1;
    const boxText = plain(announced.slice(0, end));
    const documentText = plain(announced.slice(end));
    assert.equal(count(boxText), boxDated ? 1 : 0, `${file}: date in the box`);
    assert.equal(count(documentText), dated.length, `${file}: date in the document`);
    for (const line of dated) assert(documentText.includes(line), `${file}: ${line}`);
    // In force: the text alone.
    const current = await rendered(file, PASSED, imports);
    assert(!current.includes("angekündigt") && !current.includes(title), file);
    assert(current.includes("ab dem 1. Oktober 2026"), file);
  }

  // The versions that applied before stay under their own addresses, unchanged.
  for (const from of ["", AHEAD, PASSED]) {
    const r4 = await rendered("pages/docs/terms-and-conditions-2026-09-r4.vue", from, TERMS);
    assert(r4.includes("AGB – Fassung 2026-09-r4") && r4.includes("Fassung: 2026-09-r4"));
    const september = await rendered(
      "pages/docs/right-of-withdrawal-2026-09.vue",
      from,
      WITHDRAWAL
    );
    assert(september.includes("Stand: September 2026"));
  }
  assert.equal(
    sha(await read("components/legal/TermsAndConditionsR4.vue")),
    "5e0b38639216d6dd40e6c0ebce7f710543a6e11beeb1e3721fb55cd72d399a84",
    "r4 is the page that was in force, byte for byte"
  );
  assert.equal(
    sha(await read("components/legal/RightOfWithdrawal202609.vue")),
    "a329043133490426b8b3014f389d4e7aa8d0401704bfd603a3300c4d5dde946c",
    "the withdrawal instruction of September 2026 is the page that was in force, byte for byte"
  );
});

const entity = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };
const plain = (html) =>
  html
    // A scoped style marks every element, the line break too.
    .replace(/<br(?:\s[^>]*)?>/g, " / ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => entity[name])
    .replace(/\s+/g, " ")
    .trim();

/** The headings, paragraphs and list items of rendered HTML, and its links in order. */
function htmlBlocks(html) {
  const pattern = /<(h[1-6]|p|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
  const blocks = [...html.matchAll(pattern)].map(([, tag, inner]) => [tag, plain(inner)]);
  // Nothing of the text stands outside these blocks.
  assert.equal(plain(html.replace(pattern, "")), "");
  const links = [...html.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(
    ([, href, inner]) => [plain(inner), href]
  );
  return { blocks, links, html };
}

/** The same of a markdown draft: one block per paragraph, headings `shift` levels down. */
function markdownBlocks(source, shift = 0) {
  const blocks = [];
  const links = [];
  for (const block of source
    .replace(/<!--[\s\S]*?-->/g, "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)) {
    assert(!block.includes("\n"), block);
    const heading = block.match(/^(#+) (.*)$/);
    const [tag, text] = heading
      ? [`h${heading[1].length + shift}`, heading[2]]
      : block.startsWith("- ")
        ? ["li", block.slice(2)]
        : ["p", block];
    for (const [, label, href] of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g))
      links.push([label, href]);
    blocks.push([
      tag,
      text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
        .replace(/(?<![\w_])_(?=[A-Za-z])(.+?)(?<=[^\s_])_(?![\w_])/g, "$1"),
    ]);
  }
  return { blocks, links };
}

test("the 2026-10 texts carry the reviewed wording word for word, with only the date filled in", async () => {
  for (const [name, { fixture }] of Object.entries(DRAFTS))
    assert.equal(sha(await draft(name)), fixture, name);
  const props = { effectiveDate: "9. Dezember 2026", effectiveDateEn: "9 December 2026" };
  const render = async (path) => renderToString(createSSRApp(await component(path, {}), props));
  const german = async (name) =>
    markdownBlocks((await draft(name)).replaceAll("[Datum]", props.effectiveDate));

  const agb = htmlBlocks(await render("components/legal/TermsAndConditions202610.vue"));
  const agbDraft = await german("agb-2026-10.md");
  assert.deepEqual(agb.blocks, agbDraft.blocks);
  assert.deepEqual(agb.links, agbDraft.links);
  assert.equal(agb.blocks.filter(([tag]) => tag === "h2").length, 25);

  const withdrawal = htmlBlocks(await render("components/legal/RightOfWithdrawal202610.vue"));
  const withdrawalDraft = await german("widerrufsbelehrung-2026-10.md");
  // The German draft ends with the heading of the translation and the note where it goes.
  const [heading, placeholder] = withdrawalDraft.blocks.slice(-2);
  assert.deepEqual(heading, ["h2", "English translation"]);
  assert.match(placeholder[1], /^\[Vor der Veröffentlichung einzufügen: englische Übersetzung/);
  // There the page carries the translation, under the heading its review recommends, which
  // also carries the title of the translation: all of its other headings move one level down.
  const english = markdownBlocks(
    (await draft("widerrufsbelehrung-2026-10-en.md")).replaceAll("[date]", props.effectiveDateEn),
    1
  );
  assert.deepEqual(english.blocks[1], ["h2", "Instructions on withdrawal"]);
  assert.deepEqual(withdrawal.blocks, [
    ...withdrawalDraft.blocks.slice(0, -2),
    ["h2", "Instructions on withdrawal (English translation)"],
    english.blocks[0],
    ...english.blocks.slice(2),
  ]);
  // The German pointer leads to the translation, and the translation sits under it in English.
  assert.deepEqual(withdrawal.links, [["English translation", "#english"]]);
  assert.deepEqual(english.links, []);
  assert.match(withdrawal.html, /<article id="english" lang="en"/);
  for (const text of ["[Datum]", "[date]", "<!--"])
    assert(!withdrawal.html.includes(text) && !agb.html.includes(text), text);
});
