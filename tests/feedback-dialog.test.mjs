/**
 * The feedback dialog. Every Tailwind class in its templates reaches the CSS: the theme's colours are CSS
 * variables, and Tailwind generates nothing for an opacity modifier on them (`bg-black/40`), so a
 * class like that leaves the backdrop clear and the rims in the fallback colour. And a dialog
 * opened again starts at the top of its form, where the focus lands; the dialog stays mounted
 * while closed, and the browser keeps the scroll position of a hidden element.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";
import { parse } from "@vue/compiler-sfc";
import postcss from "postcss";
import tailwind from "tailwindcss";
import * as Vue from "vue";
import { component, host, settle, tag } from "./helpers/mounted-page.mjs";

const require = createRequire(import.meta.url);
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const DIALOG = ["components/FeedbackLauncher.vue", "components/FeedbackScreenshot.vue"];

/** Static classes and the quoted strings of `:class` bindings, with the element they sit on. */
function templateClasses(node, found = []) {
  for (const prop of node.props ?? []) {
    const values =
      prop.type === 6 && prop.name === "class"
        ? [prop.value?.content ?? ""]
        : prop.type === 7 && prop.name === "bind" && prop.arg?.content === "class"
          ? [...prop.exp.content.matchAll(/'([^']*)'|"([^"]*)"/g)].map(([, a, b]) => a ?? b)
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

test("every Tailwind class in the feedback dialog reaches the CSS", async () => {
  const used = [];
  // Classes the components and the global stylesheet define themselves. The dialog's own
  // `feedback-…` names are styled in its stylesheet or are hooks for scripts and tests.
  const defined = selectorClasses(await read("assets/css/tailwind.css"));
  const own = (name) => name.startsWith("feedback-");
  for (const path of DIALOG) {
    const { descriptor } = parse(await read(path));
    for (const style of descriptor.styles)
      for (const name of selectorClasses(style.content)) defined.add(name);
    for (const entry of templateClasses(descriptor.template.ast))
      used.push({ ...entry, path: path.replace("components/", "") });
  }
  const config = require("../tailwind.config.js");
  const { css } = await postcss([
    tailwind({
      ...config,
      content: [{ raw: used.map(({ name }) => name).join(" "), extension: "html" }],
      corePlugins: { preflight: false },
    }),
  ]).process("@tailwind components; @tailwind utilities;", { from: undefined });
  const generated = selectorClasses(css);
  const missing = used
    .filter(({ name }) => !own(name) && !defined.has(name) && !generated.has(name))
    .map(({ path, tag, name }) => `${path} <${tag}> ${name}`);
  assert.deepEqual(missing, []);
});

async function launcher() {
  const Launcher = await component(
    "components/FeedbackLauncher.vue",
    {
      useRuntimeConfig: () => ({ public: {} }),
      useUser: () => Vue.ref(null),
      useAccessToken: () => Vue.ref(null),
      useDialogStack: () => Vue.ref([]),
      // The shared dialog state, should the launcher read it (frontend #847).
      useFeedbackOpen: () => Vue.ref(false),
      useFeedbackCovered: () => Vue.ref(0),
    },
    {
      "@headlessui/vue": { DialogPanel: tag("section"), DialogTitle: tag("h2") },
      "vue-i18n": { useI18n: () => ({ locale: Vue.ref("de") }) },
      "../utils/feedback": {},
    }
  );
  const ui = host();
  const app = ui.renderer.createApp(() => Vue.h(Launcher));
  app.component("StackedDialog", tag("dialog"));
  app.component("LazyFeedbackScreenshot", tag("div"));
  app.component("NuxtLink", tag("a"));
  app.mount(ui.root);
  await settle();
  const button = ui
    .all()
    .find((node) => node.type === "button" && /\bfeedback-open\b/.test(node.props.class));
  const dialog = () => ui.all().find((node) => node.type === "dialog");
  const open = async () => {
    button.props.onClick();
    await settle();
  };
  const close = async () => {
    dialog().props.onClose();
    await settle();
  };
  // The part of the panel that scrolls: the form below the title.
  const form = () =>
    ui.all(dialog()).find((node) => /\boverflow-y-auto\b/.test(node.props.class ?? ""));
  return { app, open, close, dialog, form };
}

test("a dialog opened again starts at the top of its form", async () => {
  const l = await launcher();
  await l.open();
  assert.equal(l.dialog().props.open, true);
  // Scrolled to the end, where "Schließen" is, and closed there.
  l.form().scrollTop = 588;
  await l.close();
  assert.equal(l.dialog().props.open, false);
  await l.open();
  assert.equal(l.dialog().props.open, true);
  assert.equal(l.form().scrollTop, 0);
  l.app.unmount();
});
