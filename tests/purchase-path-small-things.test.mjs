// Small corrections on the way to a purchase and on the legal pages; synthetic stand-ins only.
process.env.TZ = "Europe/Berlin";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { compileScript, parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { renderToString } from "vue/server-renderer";
import { createI18n } from "vue-i18n";
import { pieces } from "./helpers/component-pieces.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const template = async (path) => parse(await read(path)).descriptor.template;
const messages = {
  de: JSON.parse(await read("locales/de.json")),
  "en-US": JSON.parse(await read("locales/en-US.json")),
};

/** Every element of a template, each with the elements it stands in. */
function elements(root) {
  const found = [];
  (function visit(node, parents) {
    if (node.type === 1) found.push({ node, parents });
    for (const child of node.children ?? [])
      visit(child, node.type === 1 ? [...parents, node] : parents);
    for (const branch of node.branches ?? []) visit(branch, parents);
  })(root, []);
  return found;
}
const attribute = (node, name) => node.props.find((p) => p.name === name)?.value?.content;
const bound = (node, name) => node.props.find((p) => p.arg?.content === name)?.exp?.content;
const inside = (all, element) => all.filter((entry) => entry.parents.includes(element));

test("the link at the heart limit lands on the Premium card and its buy button", async () => {
  const block = elements((await template("components/user/HeartsEmpty.vue")).ast);
  const link = block.find(
    ({ node }) =>
      node.tag === "NuxtLink" && node.loc.source.includes("Links.UnlimitedHeartsWithPremium")
  ).node;
  const [path, anchor] = attribute(link, "to").split("#");
  assert.equal(path, "/subscription");
  assert.equal(anchor, "premium");

  const card = elements((await template("components/subscription/card.vue")).ast);
  const targets = card.filter(({ node }) => attribute(node, "id") === anchor);
  assert.equal(targets.length, 1, "one element answers to the anchor");
  const target = targets[0].node;
  // The accent card is the Premium offer; both of its ways to buy stand in it.
  assert.match(attribute(target, "class"), /\bbg-accent\b/);
  const content = inside(card, target).map(({ node }) => node);
  assert(
    content.some((n) => n.tag === "button" && n.loc.source.includes('@click="onclickSubscribe"'))
  );
  assert(content.some((n) => n.tag === "NuxtLink" && bound(n, "to") === "coinOrder"));
  // The card keeps a little room above it, and on wider screens the plan switch as well.
  assert.match(attribute(target, "class"), /(^|\s)scroll-mt-4(\s|$)/);
  assert.match(attribute(target, "class"), /(^|\s)md:scroll-mt-32(\s|$)/);
  // The free plan next to it is no landing place.
  assert.equal(card.filter(({ node }) => attribute(node, "id")).length, 1);
});

async function evaluate(file, exported) {
  const code = ts
    .transpileModule(await read(file), {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    })
    .outputText.replace(/^import .*?;\n/gm, "")
    .replace(/^export /gm, "");
  return new Function(`${code}\nreturn {${exported}};`)();
}
const shop = await evaluate("composables/shop.ts", "heartRefillTime");
const temporary = await mkdtemp(join(tmpdir(), "academy-small-things-"));
after(() => rm(temporary, { recursive: true, force: true }));
async function component(path, name) {
  const { descriptor } = parse(await read(path));
  let code = ts.transpileModule(
    compileScript(descriptor, { id: name, inlineTemplate: true }).content,
    { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }
  ).outputText;
  for (const dependency of ["vue", "vue-i18n", "@floating-ui/dom"])
    code = code.replace(
      new RegExp(`from ["']${dependency}["']`, "g"),
      `from ${JSON.stringify(import.meta.resolve(dependency))}`
    );
  const file = join(temporary, name + ".mjs");
  await writeFile(file, code);
  return (await import(pathToFileURL(file).href)).default;
}

test("the free refill is named as the same time of day at the limit, on the Premium page and in its tooltip", async () => {
  const summer = new Date("2026-10-10T12:00:00Z");
  const winter = new Date("2026-12-01T12:00:00Z");
  const Tooltip = await component("components/Tooltip.vue", "Tooltip");
  for (const [language, now, time, sentences] of [
    [
      "de",
      summer,
      "02:00",
      {
        HeartsEmpty: "Deine Herzen sind leer. Um 02:00 Uhr sind sie kostenlos wieder voll.",
        AutomaticRefillAt: "Deine Herzen werden täglich um 02:00 Uhr kostenlos aufgefüllt.",
        UnlimitedHeartsTooltip: /Deine Herzen werden täglich um 02:00 Uhr kostenlos aufgefüllt\.$/,
      },
    ],
    [
      "de",
      winter,
      "01:00",
      { AutomaticRefillAt: "Deine Herzen werden täglich um 01:00 Uhr kostenlos aufgefüllt." },
    ],
    [
      "en-US",
      summer,
      "02:00",
      {
        HeartsEmpty: "You’re out of hearts. They refill for free at 02:00.",
        AutomaticRefillAt: "Your hearts are refilled for free every day at 02:00.",
        UnlimitedHeartsTooltip: /Your hearts refill for free every day at 02:00\.$/,
      },
    ],
  ]) {
    assert.equal(shop.heartRefillTime(language, now), time);
    const i18n = createI18n({ legacy: false, locale: language, messages });
    for (const [key, expected] of Object.entries(sentences)) {
      const said = i18n.global.t("Body." + key, { time });
      if (expected instanceof RegExp) assert.match(said, expected, key);
      else assert.equal(said, expected, key);
    }
    // The tooltip itself has to hand the time on to its sentence.
    const app = Vue.createSSRApp({
      render: () =>
        Vue.h(Tooltip, { heading: "Body.UnlimitedHeartsTooltip", params: { time } }, () => "i"),
    });
    app.use(i18n);
    const html = await renderToString(app);
    assert(html.includes(language === "de" ? `täglich um ${time} Uhr` : `every day at ${time}.`));
    assert(!html.includes("{time}"));
  }
  // No sentence of the app names the refill in UTC any more; the legal texts keep their wording.
  for (const language of ["de", "en-US"]) {
    assert(!JSON.stringify(messages[language]).includes("00:00 UTC"), language);
    assert.equal(messages[language].Body.AutomaticRefillAtUtc, undefined);
  }

  // Both places on the Premium page take the time from the same function as the block.
  for (const path of [
    "components/user/HeartsEmpty.vue",
    "pages/subscription/index.vue",
    "components/subscription/card.vue",
  ]) {
    const { refillTime } = await pieces(path, ["refillTime"], {
      computed: Vue.computed,
      locale: Vue.ref("de"),
      heartRefillTime: (locale) => "the refill time for " + locale,
    });
    assert.equal(refillTime.value, "the refill time for de", path);
  }
  const page = await read("pages/subscription/index.vue");
  assert(page.includes('t("Body.AutomaticRefillAt", { time: refillTime })'));
  const card = elements((await template("components/subscription/card.vue")).ast);
  const tooltip = card.find(
    ({ node }) =>
      node.tag === "Tooltip" && bound(node, "heading").includes("'Body.UnlimitedHeartsTooltip'")
  ).node;
  assert.equal(bound(tooltip, "params"), "{ time: refillTime }");
});

/** Contrast of two colours after WCAG 2. */
function contrast(a, b) {
  const luminance = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test("the coin order page is dark, and only what PayPal draws stands on a light ground", async () => {
  const css = await read("assets/css/tailwind.css");
  const colour = (name) => css.match(new RegExp(`--color-${name}: (#[0-9a-f]{6});`))[1];
  const page = await template("pages/morphcoins/paypal.vue");
  const all = elements(page.ast);
  // The page takes the ground of every other page: nothing of its own is light.
  const light = (node) => /(^|\s)bg-white(\s|$)/.test(attribute(node, "class") ?? "");
  const main = all.find(({ node }) => node.tag === "main").node;
  assert(!light(main));
  // The page scrolls inside `main`. Firefox is told the colours of that scrollbar, or it
  // draws a light one; no other browser is, so the thin bar of the stylesheet stays.
  assert(
    attribute(main, "class")
      .split(/\s+/)
      .includes(
        "supports-[-moz-appearance:none]:[scrollbar-color:var(--color-tertiary)_var(--color-primary)]"
      )
  );
  assert(!page.content.includes("text-black"), "no text written for a light ground");
  assert(
    !all.some(({ node }) => node.tag === "Input" && node.props.some((p) => p.name === "light"))
  );
  // The one light surface is the container PayPal draws into, and only once it has drawn.
  const surfaces = all.filter(({ node }) => light(node)).map(({ node }) => node);
  assert.deepEqual(
    surfaces.map((node) => attribute(node, "id")),
    ["paypal-button-container"]
  );
  assert.match(attribute(surfaces[0], "class"), /(^|\s)empty:bg-transparent(\s|$)/);
  // The same holds where a payment is taken up again.
  const resumed = elements((await template("components/PaypalCheckoutStatus.vue")).ast)
    .map(({ node }) => node)
    .filter(light);
  assert.equal(resumed.length, 1);
  assert.equal(attribute(resumed[0], "ref"), "paypal");
  assert.match(attribute(resumed[0], "class"), /(^|\s)empty:bg-transparent(\s|$)/);
  // Headings and values are written in the heading colour, labels in the body colour.
  const headings = all.filter(({ node }) => /^h[12]$/.test(node.tag)).map(({ node }) => node);
  assert(headings.length >= 3);
  for (const node of headings)
    assert.match(
      attribute(node, "class"),
      /(^|\s)text-heading(\s|$)/,
      node.loc.source.split("\n")[0]
    );
  assert(contrast(colour("heading"), colour("primary")) >= 7);
  assert(contrast(colour("body"), colour("primary")) >= 4.5);
  assert(contrast(colour("body"), colour("secondary")) >= 4.5);
});

test("every line of a payment taken up again has a colour for the dark ground", async () => {
  // The stylesheet colours paragraphs and headings. Anything else would be written in the
  // black of the browser, which the dark ground swallows.
  const all = elements((await template("components/PaypalCheckoutStatus.vue")).ast);
  // A `NuxtLink` renders a link, which the stylesheet colours as well.
  const coloured = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ol", "a", "NuxtLink"]);
  const writes = (node) =>
    node.children.some((child) => child.type === 5 || (child.type === 2 && child.content.trim()));
  const bare = all
    .map(({ node }) => node)
    .filter((node) => writes(node) && !coloured.has(node.tag) && node.tag !== "Btn")
    .filter(
      (node) =>
        !/(^|\s)text-(body|heading|subheading|accent)(\s|$)/.test(attribute(node, "class") ?? "")
    );
  assert.deepEqual(
    bare.map((node) => node.loc.source.split("\n")[0]),
    []
  );
});

test("a long e-mail address wraps in the profile block of the coin order page", async () => {
  const all = elements((await template("pages/morphcoins/paypal.vue")).ast);
  const address = all.filter(
    ({ node }) => node.tag === "p" && node.loc.source.includes("user.email }}")
  );
  assert.equal(address.length, 1);
  const classes = attribute(address[0].node, "class").split(/\s+/);
  // In a row of two the address may shrink. It breaks where it has a place to break at,
  // and anywhere only when a part of it is longer than the line.
  assert(
    classes.includes("min-w-0") && classes.includes("[overflow-wrap:anywhere]"),
    classes.join(" ")
  );
  assert(!classes.includes("break-all"), "no break in the middle of a word without need");
});

test("links of the legal pages are underlined along their text, on every line they run over", async () => {
  for (const path of [
    "pages/docs/privacy.vue",
    "pages/docs/terms-and-conditions.vue",
    "pages/docs/right-of-withdrawal.vue",
  ]) {
    const style = parse(await read(path))
      .descriptor.styles.map((s) => s.content)
      .join("\n");
    const rule = style.match(/(?:^|\n)a \{([^}]*)\}/);
    assert(rule, path);
    for (const utility of ["underline", "decoration-accent", "decoration-1", "underline-offset-4"])
      assert(rule[1].split(/[\s;]+/).includes(utility), `${path}: ${utility}`);
    // No drawn line of its own any more: it had half the width of the link and stood at
    // the end of the last line when a link ran over two.
    assert(!/a::after\s*\{[^}]*width/.test(style), path);
    assert(!/(?:^|\n)a \{[^}]*\b(relative|pb-2)\b/.test(style), path);
  }
  // The table of contents of the privacy page had no line and keeps none.
  const privacy = parse(await read("pages/docs/privacy.vue")).descriptor.styles[0].content;
  assert.match(privacy, /\.table-content li a \{[^}]*\bno-underline\b/);
});
