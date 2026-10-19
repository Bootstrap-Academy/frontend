/**
 * Every class of a colour-taking utility (`bg-`, `text-`, `border-`, `ring-` and the others
 * below) in the templates of the app's components, pages and layouts reaches the built CSS.
 * Tailwind runs here as the build runs it, with the repo's config and its content globs. The
 * theme's colours are CSS variables, and Tailwind generates nothing for an opacity modifier on
 * them (`bg-black/40`), nor for a colour the theme does not have (`text-gray-400`); a class like
 * that silently leaves a backdrop clear or a rim in the fallback colour. Translucent theme
 * colours are written as `color-mix(in srgb, var(--color-…) N%, transparent)` instead.
 */
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "@vue/compiler-sfc";
import postcss from "postcss";
import tailwind from "tailwindcss";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
/** Utilities that take a colour, after any variants (`md:`, `hover:`) and `!`. */
const COLOUR_UTILITY =
  /^(?:[\w-]+:)*!?(?:bg|text|border(?:-[xytrbl])?|ring(?:-offset)?|outline|divide|from|via|to|fill|stroke|accent|caret|decoration|placeholder|shadow)-/;
/**
 * Known and left on purpose, each to be fixed with its file's own work; the test fails as soon
 * as one of them is gone, so the list cannot outlive its reason. `pages/subscription/index.vue`
 * belongs to the purchase work in frontend #849.
 */
const PENDING = [
  "pages/subscription/index.vue <div> ring-gray",
  "pages/subscription/index.vue <div> ring-gray",
  "pages/subscription/index.vue <p> text-gray",
];
const read = (path) => readFile(new URL(path, root), "utf8");

async function vueFiles(directory) {
  const entries = await readdir(new URL(directory, root), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await vueFiles(path)));
    else if (entry.name.endsWith(".vue")) files.push(path);
  }
  return files;
}

/** Static classes and the quoted strings of `:class` bindings, with the element they sit on. */
function templateClasses(node, found = []) {
  for (const prop of node.props ?? []) {
    const values =
      prop.type === 6 && prop.name === "class"
        ? [prop.value?.content ?? ""]
        : prop.type === 7 && prop.name === "bind" && prop.arg?.content === "class"
          ? [...prop.exp.content.matchAll(/'([^']*)'|"([^"]*)"|`([^`$]*)`/g)].map(
              ([, a, b, c]) => a ?? b ?? c
            )
          : [];
    for (const value of values)
      for (const name of value.split(/\s+/).filter(Boolean)) found.push({ name, tag: node.tag });
  }
  for (const child of node.children ?? []) templateClasses(child, found);
  return found;
}

/** Class names in CSS selectors, unescaped (`.sm\:max-w-\[560px\]` is `sm:max-w-[560px]`). */
function selectorClasses(css) {
  const names = new Set();
  postcss.parse(css).walkRules((rule) => {
    for (const [, name] of rule.selector.matchAll(/\.((?:\\[0-9a-fA-F]{1,6} ?|\\.|[\w-])+)/g))
      names.add(
        name.replace(/\\([0-9a-fA-F]{1,6}) ?|\\(.)/g, (_, hex, char) =>
          hex ? String.fromCodePoint(parseInt(hex, 16)) : char
        )
      );
  });
  return names;
}

test("every colour-utility class in the app's templates reaches the CSS", async () => {
  const files = [
    "app.vue",
    "error.vue",
    ...(await vueFiles("components")),
    ...(await vueFiles("layouts")),
    ...(await vueFiles("pages")),
  ];
  const used = [];
  const defined = new Set();
  for (const sheet of await readdir(new URL("assets/css", root)))
    if (sheet.endsWith(".css"))
      for (const name of selectorClasses(await read(`assets/css/${sheet}`))) defined.add(name);
  for (const path of files) {
    const { descriptor } = parse(await read(path));
    for (const style of descriptor.styles)
      for (const name of selectorClasses(style.content)) defined.add(name);
    if (descriptor.template)
      for (const entry of templateClasses(descriptor.template.ast)) used.push({ ...entry, path });
  }
  const config = require("../tailwind.config.js");
  const { css } = await postcss([
    tailwind({
      ...config,
      // The build's own content globs, from the repository root.
      content: config.content.map((glob) => fileURLToPath(new URL(glob, root))),
      corePlugins: { preflight: false },
    }),
  ]).process("@tailwind components; @tailwind utilities;", { from: undefined });
  const generated = selectorClasses(css);
  const missing = used
    .filter(({ name }) => COLOUR_UTILITY.test(name) && !defined.has(name) && !generated.has(name))
    .map(({ path, tag, name }) => `${path} <${tag}> ${name}`);
  assert.deepEqual(missing, PENDING);
});
