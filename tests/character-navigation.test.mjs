import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { parse } from "vue/compiler-sfc";

const source = async (path) => readFile(new URL(path, import.meta.url), "utf8");
const authSource = await source("../middleware/auth.ts");
const routeSource = await source("../middleware/route.global.ts");
const profileScript = parse(await source("../pages/profile/index.vue")).descriptor.scriptSetup;

function fixture(authenticated) {
  const logs = [];
  const context = {
    process: { client: false },
    console: { log: (...args) => logs.push(args) },
    useAppCookie: () => ({ value: authenticated ? "synthetic-private-token" : null }),
    navigateTo: (path, options = {}) => ({ path, replace: options.replace ?? false }),
    defineNuxtRouteMiddleware: (middleware) => middleware,
    definePageMeta: (meta) => (context.meta = meta),
  };
  const middleware = (text) => {
    runInNewContext(text.replace("export default", "result ="), context);
    return context.result;
  };
  const auth = middleware(authSource);
  const global = middleware(routeSource);
  runInNewContext(profileScript.content, context);
  const visitProfile = () => {
    for (const entry of context.meta.middleware) {
      const result = (entry === "auth" ? auth : entry)();
      if (result) return result;
    }
  };
  return { global, logs, visitProfile };
}

test("the old personal URL retains its login gate and replaces history for signed-in users", () => {
  assert.deepEqual(fixture(false).visitProfile(), { path: "/auth/login", replace: false });
  assert.deepEqual(fixture(true).visitProfile(), { path: "/dashboard", replace: true });
});

test("opening login while signed in reaches the character without logging the session token", () => {
  const signedIn = fixture(true);
  assert.deepEqual(signedIn.global({ path: "/auth/login" }, { path: "/" }), {
    path: "/dashboard",
    replace: false,
  });
  assert.deepEqual(signedIn.logs, []);
  assert.equal(fixture(false).global({ path: "/auth/login" }, { path: "/" }), undefined);
});

test("personal navigation changes leave public account-independent routes accessible", () => {
  for (const authenticated of [false, true]) {
    const app = fixture(authenticated);
    for (const path of [
      "/docs/privacy",
      "/docs/imprint",
      "/moderation",
      "/moderation/access",
      "/vertrag-kuendigen",
      "/vertrag-widerrufen",
    ]) {
      assert.equal(app.global({ path }, { path }), undefined, path);
    }
    assert.deepEqual(app.logs, []);
  }
});
