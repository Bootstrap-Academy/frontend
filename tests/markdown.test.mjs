import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { compileScript, parse } from "@vue/compiler-sfc";
import { effectScope, nextTick, reactive } from "vue";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await readFile(new URL("../components/Markdown.vue", import.meta.url), "utf8");
const { descriptor } = parse(source);
let code = ts.transpileModule(compileScript(descriptor, { id: "markdown-test" }).content, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
code = code.replace(
  /from ["']vue["']/g,
  `from ${JSON.stringify(pathToFileURL(require.resolve("vue")).href)}`
);
code = code.replace(
  'import("~/utils/markdown/renderer")',
  "Promise.resolve({ renderMarkdown: globalThis.__markdownTestRender })"
);
const { default: component } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const flush = async () => {
  for (let i = 0; i < 5; i++) await nextTick();
};

test("Markdown ignores late render results and does not update an unmounted consumer", async () => {
  const pending = new Map();
  globalThis.__markdownTestRender = (text) => new Promise((resolve) => pending.set(text, resolve));
  const props = reactive({ source: "old", as: "div" });
  const scope = effectScope();
  const view = scope.run(() => component.setup(props, { expose() {} }));
  try {
    await flush();
    props.source = "new";
    await flush();
    pending.get("new")("<p>new</p>");
    await flush();
    assert.equal(view.html.value, "<p>new</p>");
    pending.get("old")("<p>old</p>");
    await flush();
    assert.equal(view.html.value, "<p>new</p>");
    props.source = "unmounted";
    await flush();
    scope.stop();
    pending.get("unmounted")("<p>late</p>");
    await flush();
    assert.equal(view.html.value, null);
  } finally {
    scope.stop();
    delete globalThis.__markdownTestRender;
  }
});

test("empty Markdown skips loading; failed loading retains the escaped-text fallback", async () => {
  let calls = 0;
  globalThis.__markdownTestRender = async () => {
    calls++;
    throw new Error("offline");
  };
  const props = reactive({ source: "", as: "span" });
  const scope = effectScope();
  const view = scope.run(() => component.setup(props, { expose() {} }));
  try {
    await flush();
    assert.equal(calls, 0);
    assert.equal(view.html.value, "");
    props.source = "<script>untrusted</script>";
    await flush();
    assert.equal(calls, 1);
    assert.equal(view.html.value, null);
  } finally {
    scope.stop();
    delete globalThis.__markdownTestRender;
  }
});
