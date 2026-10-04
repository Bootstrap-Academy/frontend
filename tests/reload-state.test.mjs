import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { joinURL } from "ufo";

const pluginSource = await readFile(
  new URL("../plugins/reload-state-cleanup.client.ts", import.meta.url),
  "utf8"
);
const pluginCode = ts.transpileModule(
  pluginSource.replace(/^import[\s\S]*?;\n/gm, "").replace("export default", "const plugin ="),
  { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None } }
).outputText;
// Execute the installed Nuxt implementation, including its actual sessionStorage guard.
const reloadCode = (
  await readFile(
    new URL("../node_modules/nuxt/dist/app/composables/chunk.js", import.meta.url),
    "utf8"
  )
)
  .replace(/^import .*;\n/gm, "")
  .replace(/^export .*;\n?/gm, "")
  .replaceAll("import.meta.server", "false");

function fixture() {
  const map = new Map([["nuxt:reload:state", "old-private-state"]]);
  const writes = [];
  const sessionStorage = {
    getItem: (key) => map.get(key) ?? null,
    removeItem: (key) => map.delete(key),
    setItem: (key, value) => {
      writes.push(key);
      map.set(key, value);
    },
  };
  const locations = [];
  const window = {
    sessionStorage,
    location: {
      pathname: "/",
      host: "academy.invalid",
      href: "https://academy.invalid/",
      reload: () => locations.push("reload"),
    },
  };
  const reloadNuxtApp = new Function(
    "window",
    "sessionStorage",
    "useNuxtApp",
    "navigationDiagnostics",
    "isScriptProtocol",
    `${reloadCode}\nreturn reloadNuxtApp;`
  )(
    window,
    sessionStorage,
    () => assert.fail("state must not be read"),
    {},
    () => false
  );
  const hooks = new Map(),
    routerHooks = new Map();
  let disposed = 0,
    stop;
  const listen = (map, name, run) => {
    map.set(name, run);
    return () => {
      disposed++;
      map.delete(name);
    };
  };
  const router = Object.fromEntries(
    ["beforeEach", "beforeResolve", "onError"].map((name) => [
      name,
      (run) => listen(routerHooks, name, run),
    ])
  );
  const bindings = {
    window,
    joinURL,
    reloadNuxtApp,
    defineNuxtPlugin: (plugin) => plugin,
    useRouter: () => router,
    useRuntimeConfig: () => ({ app: { baseURL: "/academy/" } }),
  };
  const plugin = new Function(...Object.keys(bindings), `${pluginCode}\nreturn plugin;`)(
    ...Object.values(bindings)
  );
  plugin.setup({
    hook: (name, run) => listen(hooks, name, run),
    vueApp: {
      onUnmount: (run) => {
        stop = run;
      },
    },
  });
  return {
    hooks,
    routerHooks,
    map,
    writes,
    window,
    locations,
    stop: () => {
      stop();
      return disposed;
    },
  };
}

test("chunk recovery deletes legacy state and uses Nuxt's loop guard without persisting state", () => {
  const f = fixture();
  assert.equal(f.map.has("nuxt:reload:state"), false);
  const error = Error("missing dynamic chunk");
  f.routerHooks.get("beforeEach")();
  f.hooks.get("app:chunkError")({ error });
  f.routerHooks.get("onError")(error, { fullPath: "/orders?retry=1#purchase" });
  const path = "/academy/orders?retry=1#purchase";
  assert.equal(f.window.location.href, path);
  assert.deepEqual(f.writes, ["nuxt:reload"]);
  assert.equal(JSON.parse(f.map.get("nuxt:reload")).path, path);
  // Simulate loading that same destination while the missing chunk is still missing.
  f.window.location.pathname = path;
  f.window.location.href = `https://academy.invalid${path}`;
  f.routerHooks.get("onError")(error, { fullPath: "/orders?retry=1#purchase" });
  assert.deepEqual(f.writes, ["nuxt:reload"]);
  assert.deepEqual(f.locations, []);
  f.map.set("nuxt:reload", JSON.stringify({ path, expires: 0 }));
  f.routerHooks.get("onError")(error, { fullPath: "/orders?retry=1#purchase" });
  assert.deepEqual(f.locations, ["reload"]);
  assert.equal(f.map.has("nuxt:reload:state"), false);
  assert.equal(f.stop(), 4);
});

test("ordinary route errors do not reload; manifest updates use the same private reload path", () => {
  const f = fixture();
  f.routerHooks.get("onError")(Error("application error"), { fullPath: "/orders" });
  assert.equal(f.writes.length, 0);
  f.hooks.get("app:manifest:update")();
  f.hooks.get("app:manifest:update")();
  f.routerHooks.get("beforeResolve")({ fullPath: "/orders" });
  assert.deepEqual(f.writes, ["nuxt:reload"]);
  assert.equal(f.window.location.href, "/academy/orders");
  assert.equal(f.map.has("nuxt:reload:state"), false);
  assert.equal(f.stop(), 5);
});
