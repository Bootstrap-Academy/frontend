import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { compileScript, compileTemplate, parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import { renderToString } from "vue/server-renderer";
import { createI18n } from "vue-i18n";

// Nuxt auto-imports used by the compiled components.
Object.assign(globalThis, { ref: Vue.ref, computed: Vue.computed, watch: Vue.watch });

const temporary = await mkdtemp(join(tmpdir(), "academy-a11y-controls-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = (name) => pathToFileURL(join(temporary, name + ".mjs")).href;
const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");

await writeFile(new URL(output("inputSelect")), transpile(await read("../utils/inputSelect.ts")));

async function compile(relative, name) {
  const { descriptor } = parse(await read(relative));
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
  code = transpile(code).replace(
    /from ["']~\/utils\/inputSelect["']/g,
    `from "${output("inputSelect")}"`
  );
  for (const dep of ["vue", "vue-i18n", "@heroicons/vue/24/solid"])
    code = code.replace(
      new RegExp(`from ["']${dep}["']`, "g"),
      `from ${JSON.stringify(import.meta.resolve(dep))}`
    );
  await writeFile(new URL(output(name)), code);
  return (await import(output(name))).default;
}

const ButtonToggle = await compile("../components/input/ButtonToggle.vue", "ButtonToggle");
const Select = await compile("../components/input/Select.vue", "Select");
const Sort = await compile("../components/Sort.vue", "Sort");
const messages = {
  de: JSON.parse(await read("../locales/de.json")),
  "en-US": JSON.parse(await read("../locales/en-US.json")),
};
const i18n = (locale) => createI18n({ legacy: false, locale, messages });

/** Minimal element tree so tests can read attributes and call the real click handlers. */
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
    patchProp: (n, key, _old, value) => (n.props[key] = value),
    insert: (n, parent, anchor = null) => {
      detach(n);
      n.parent = parent;
      parent.children.splice(
        anchor ? parent.children.indexOf(anchor) : parent.children.length,
        0,
        n
      );
    },
    remove: detach,
    parentNode: (n) => n.parent,
    nextSibling: (n) => n.parent?.children[n.parent.children.indexOf(n) + 1],
  });
  const root = node("root");
  const all = (n = root) => [n, ...n.children.flatMap(all)];
  const text = (n) => [n.text, ...n.children.map(text)].join("").trim();
  return { root, renderer, all, text };
}

test("the toggle renders native, named toggle buttons that report the selected option", async () => {
  const ui = host();
  const selected = Vue.ref(0);
  const options = [
    { name: "Buttons.LanguageBased" },
    { name: "Buttons.ChallengeBased" },
    { name: "Buttons.Overall" },
  ];
  const app = ui.renderer.createApp({
    render: () =>
      Vue.h(ButtonToggle, {
        buttonOptions: options,
        label: "Headings.LeaderBoard",
        modelValue: selected.value,
        "onUpdate:modelValue": (value) => (selected.value = value),
      }),
  });
  app.use(i18n("de"));
  app.mount(ui.root);
  const group = ui.all().find((n) => n.props.role === "group");
  assert.equal(group.props["aria-label"], "Bestenliste");
  const buttons = () => ui.all().filter((n) => n.type === "button");
  assert.deepEqual(
    buttons().map((b) => [ui.text(b), b.props.type, b.props["aria-pressed"], b.props.disabled]),
    [
      ["Nach Sprache", "button", true, false],
      ["Nach Challenges", "button", false, false],
      ["Gesamt", "button", false, false],
    ]
  );
  // Enter and Space activate a native button through its click handler.
  buttons()[2].props.onClick();
  await Vue.nextTick();
  assert.equal(selected.value, 2);
  assert.deepEqual(
    buttons().map((b) => b.props["aria-pressed"]),
    [false, false, true]
  );
  // A visible focus indicator stays on every option.
  for (const button of buttons()) assert.match(button.props.class, /focus-visible:outline-accent/);
  app.unmount();
});

test("disabled toggle options are natively disabled and an unnamed group carries no empty label", async () => {
  const html = await renderToString(
    Vue.createSSRApp({
      render: () =>
        Vue.h(ButtonToggle, {
          buttonOptions: [{ name: "Buttons.Monthly" }, { name: "Buttons.Yearly", disabled: true }],
          modelValue: 0,
        }),
    }).use(i18n("en-US"))
  );
  assert.match(html, /<div role="group" class="/);
  assert.doesNotMatch(html, /aria-label/);
  const buttons = [...html.matchAll(/<button([^>]*)>\s*([^<]*?)\s*<\/button>/g)];
  assert.deepEqual(
    buttons.map(([, attrs, label]) => [
      label,
      /type="button"/.test(attrs),
      /aria-pressed="(true|false)"/.exec(attrs)[1],
      /\sdisabled(\s|$|=)/.test(attrs),
    ]),
    [
      ["Monthly", true, "true", false],
      ["Yearly", true, "false", true],
    ]
  );
});

const attribute = (html, tag, name) =>
  new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`).exec(html)?.[1];

for (const [locale, caption] of [
  ["de", "Sortieren nach"],
  ["en-US", "Sort By"],
]) {
  test(`the visible sort caption is the select's label (${locale})`, async () => {
    const app = Vue.createSSRApp({ render: () => [Vue.h(Sort), Vue.h(Sort)] });
    app.component("InputSelect", Select);
    const html = await renderToString(app.use(i18n(locale)));
    const labels = [...html.matchAll(/<label for="([^"]+)"[^>]*>([^<]*)<\/label>/g)];
    const selects = [...html.matchAll(/<select[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(
      labels.map((m) => m[2].trim()),
      [caption, caption]
    );
    assert.deepEqual(
      labels.map((m) => m[1]),
      selects
    );
    assert.equal(new Set(selects).size, 2, "Every sort control keeps its own label target");
    assert.doesNotMatch(html, /aria-label/);
  });
}

test("a select without visible text is named by its translated aria label", async () => {
  const render = (props) =>
    renderToString(
      Vue.createSSRApp({ render: () => Vue.h(Select, { options: [], ...props }) }).use(i18n("de"))
    );
  const unlabelled = await render({ ariaLabel: "LearningRooms.Language" });
  assert.equal(attribute(unlabelled, "select", "aria-label"), "Programmiersprache");
  const labelled = await render({
    id: "language",
    label: "Headings.Language",
    ariaLabel: "LearningRooms.Language",
  });
  assert.equal(attribute(labelled, "select", "aria-label"), undefined);
  assert.equal(attribute(labelled, "label", "for"), "language");
  assert.equal(attribute(labelled, "select", "id"), "language");
});

// WCAG 2.2 relative luminance and contrast ratio (https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio).
function luminance(hex) {
  const [r, g, b] = hex
    .replace("#", "")
    .match(/../g)
    .map((part) => parseInt(part, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test("the contrast calculation matches WCAG reference values", () => {
  assert.equal(contrast("#ffffff", "#000000"), 21);
  assert.equal(contrast("#777777", "#777777"), 1);
  // The review's axe measurement for the former free chip: white on #177edc is 4.15:1.
  assert.equal(contrast("#ffffff", "#177edc").toFixed(2), "4.15");
  assert.equal(contrast("#000000", "#ffffff"), contrast("#ffffff", "#000000"));
});

test("every chip color, including random profile tag colors, keeps small text at 4.5:1", async () => {
  const theme = Object.fromEntries(
    [
      ...(await read("../assets/css/tailwind.css")).matchAll(/--color-([a-z]+):\s*(#[0-9a-f]{6})/g),
    ].map(([, name, value]) => [name, value])
  );
  const chip = parse(await read("../components/Chip.vue")).descriptor;
  const style = chip.styles[0].content;
  const resolve = (value) => {
    const variable = /var\(--color-([a-z]+)\)/.exec(value);
    if (variable) return theme[variable[1]];
    if (/^#[0-9a-f]{3}$/i.test(value)) return "#" + [...value.slice(1)].map((c) => c + c).join("");
    return value;
  };
  const rules = new Map(
    [...style.matchAll(/(?:^|\n)(\.?[a-z][\w-]*) \{([^}]*)\}/g)].map(([, selector, body]) => [
      selector,
      body,
    ])
  );
  const textColor = (body) => {
    const applied = /@apply[^;]*\btext-([a-z]+)\b/.exec(body);
    const plain = /(?:^|\n)\s*color:\s*([^;]+);/.exec(body);
    return plain ? resolve(plain[1].trim()) : applied && theme[applied[1]];
  };
  const base = textColor(rules.get("div"));
  assert.equal(base, theme.primary);
  const colorOf = (name) => {
    const body = rules.get("." + name) ?? "";
    const background = /background-color:\s*([^;]+);/.exec(body)?.[1].trim();
    return {
      background: background ? resolve(background) : name.startsWith("bg-") && theme[name.slice(3)],
      text: textColor(body) ?? base,
    };
  };

  const random = [...chip.script.content.matchAll(/"(chip-color-\d+)"/g)].map((m) => m[1]);
  assert.equal(random.length, 12);
  const used = new Set(random);
  const sources = [];
  for (const folder of ["components", "pages", "layouts"])
    for (const entry of await readdir(new URL(`../${folder}`, import.meta.url), {
      recursive: true,
    }))
      if (entry.endsWith(".vue")) sources.push(await read(`../${folder}/${entry}`));
  for (const source of sources) {
    for (const [tag] of source.matchAll(/<chip\b[^>]*>/gi))
      for (const [, value] of tag.matchAll(/:?color="'?([\w-]+)'?"/g)) used.add(value);
    for (const [, value] of source.matchAll(/color: "(chip-color-\d+)"/g)) used.add(value);
  }
  for (const name of rules.keys())
    if (name.startsWith(".chip-color-") || name === ".bg-info") used.add(name.slice(1));
  assert.ok(used.has("bg-info") && used.has("bg-success") && used.has("chip-color-13"));

  const measured = [...used].sort().map((name) => {
    const { background, text } = colorOf(name);
    assert.match(String(background), /^#[0-9a-f]{6}$/i, `${name} has a known background`);
    return [name, background, text, Math.floor(contrast(background, text) * 100) / 100];
  });
  const failing = measured.filter(([, , , ratio]) => ratio < 4.5);
  assert.deepEqual(failing, [], JSON.stringify(measured));
});
