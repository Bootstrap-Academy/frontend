import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const source = await fs.readFile(new URL("../utils/monaco.ts", import.meta.url), "utf8");
const specifiers = [...source.matchAll(/import\("([^"]+)"\)/g)].map((m) => m[1]);
const code = ts
  .transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  })
  .outputText.replace(/import\("([^"]+)"\)/g, 'globalThis.__monacoImport("$1")');

async function load(environment) {
  const imported = [];
  const previous = globalThis.MonacoEnvironment;
  globalThis.MonacoEnvironment = environment;
  globalThis.__monacoImport = async (specifier) => {
    imported.push(specifier);
    if (specifier === "monaco-editor") return { editor: "fixture" };
    return {
      default: class {
        constructor(options) {
          this.module = specifier;
          this.options = options;
        }
      },
    };
  };
  const restore = () => {
    globalThis.MonacoEnvironment = previous;
    delete globalThis.__monacoImport;
  };
  try {
    const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
    const { loadMonaco } = await import(`${url}#${Math.random()}`);
    return { monaco: await loadMonaco(), env: globalThis.MonacoEnvironment, imported, restore };
  } catch (error) {
    restore();
    throw error;
  }
}

test("every Monaco worker label gets its bundled worker, named after the label", async (t) => {
  const { monaco, env, imported, restore } = await load(undefined);
  t.after(restore);
  assert.deepEqual(monaco, { editor: "fixture" });
  assert.deepEqual(imported, ["monaco-editor"], "workers load only when Monaco asks");
  const worker = (label) => `monaco-editor/languages/features/${label}.worker?worker`;
  for (const [label, module] of [
    ["css", worker("css/css")],
    ["scss", worker("css/css")],
    ["less", worker("css/css")],
    ["html", worker("html/html")],
    ["handlebars", worker("html/html")],
    ["razor", worker("html/html")],
    ["json", worker("json/json")],
    ["typescript", worker("typescript/ts")],
    ["javascript", worker("typescript/ts")],
    ["editorWorkerService", "monaco-editor/editor/editor.worker?worker"],
    ["python", "monaco-editor/editor/editor.worker?worker"],
  ]) {
    const created = await env.getWorker("workerMain.js", label);
    assert.equal(created.module, module, label);
    assert.deepEqual(created.options, { name: label });
  }
});

test("an existing Monaco environment is kept", async () => {
  const own = { getWorker: () => "own" };
  const { env, restore } = await load(own);
  restore();
  assert.equal(env, own);
});

test("worker entry points exist in the installed Monaco package", () => {
  const workers = specifiers.filter((s) => s.endsWith("?worker"));
  assert.equal(workers.length, 5);
  for (const specifier of workers) {
    const file = fileURLToPath(import.meta.resolve(specifier.slice(0, -"?worker".length)));
    assert(existsSync(file), `${specifier} -> ${file}`);
  }
});

test("app code loads Monaco only through the worker-aware loader", async () => {
  const offenders = [];
  for (const dir of ["components", "composables", "layouts", "pages", "plugins", "utils"]) {
    for (const entry of await fs.readdir(new URL(`../${dir}/`, import.meta.url), {
      recursive: true,
    })) {
      if (!/\.(vue|ts|js|mjs)$/.test(entry) || `${dir}/${entry}` === "utils/monaco.ts") continue;
      const text = await fs.readFile(new URL(`../${dir}/${entry}`, import.meta.url), "utf8");
      if (
        /import\(\s*["']monaco-editor|^\s*import\s+(?!type\b)[^;]*from\s+["']monaco-editor/m.test(
          text
        )
      )
        offenders.push(`${dir}/${entry}`);
    }
  }
  assert.deepEqual(offenders, []);
});
