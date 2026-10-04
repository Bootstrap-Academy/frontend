import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../plugins/reload-state-cleanup.client.ts", import.meta.url),
  "utf8"
);
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;

async function run(sessionStorage) {
  globalThis.defineNuxtPlugin = (setup) => setup;
  globalThis.window = { sessionStorage };
  try {
    const plugin = (
      await import(`data:text/javascript,${encodeURIComponent(code)}#${Math.random()}`)
    ).default;
    plugin();
  } finally {
    delete globalThis.defineNuxtPlugin;
    delete globalThis.window;
  }
}

test("app start removes the copied reload state but keeps Nuxt's reload-loop marker", async () => {
  const data = new Map([
    ["nuxt:reload:state", JSON.stringify({ state: { $saccessToken: "token" } })],
    ["nuxt:reload", JSON.stringify({ path: "/learn", expires: 1 })],
    ["academy-guest-return:1", "{}"],
  ]);
  await run({ removeItem: (key) => data.delete(key) });
  assert.deepEqual([...data.keys()], ["nuxt:reload", "academy-guest-return:1"]);
});

test("blocked tab storage does not break app start", async () => {
  await run({
    removeItem() {
      throw new Error("blocked");
    },
  });
});

test("the app does not opt into restoring Nuxt's reload state", async () => {
  const config = await readFile(new URL("../nuxt.config.ts", import.meta.url), "utf8");
  assert(!/restoreState\s*:\s*true/.test(config));
});
