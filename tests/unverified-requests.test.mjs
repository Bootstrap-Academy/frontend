// Signing up in one tab also signs in the course pages already open in that browser.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import * as Vue from "vue";
import { component, evaluate, host, settle, tag } from "./helpers/mounted-page.mjs";

async function module(file, scope) {
  const source = (await readFile(new URL(`../${file}`, import.meta.url), "utf8")).replaceAll(
    "import.meta.client",
    "true"
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  const environment = new Proxy(
    { ...Vue, ...scope, exports },
    {
      has: () => true,
      get: (target, name) =>
        name === Symbol.unscopables ? undefined : name in target ? target[name] : globalThis[name],
    }
  );
  new Function("environment", `with (environment) { ${code} }`)(environment);
  return exports;
}

const course = {
  id: "python",
  title: "Python",
  description: "Python",
  price: 0,
  sections: [],
  learning_goals: [],
  requirements: [],
  learning_path_id: null,
  has_explicit_curriculum: false,
};
const profile = (verified = false, admin = false) => ({
  id: "learner",
  name: "learner",
  display_name: "Learner",
  email_verified: verified,
  admin,
});
const cookieUser = { id: "learner", name: "learner", display_name: "Learner" };

async function browser(t, count = 14) {
  const cookies = new Map();
  const jar = (key) => {
    if (!cookies.has(key)) cookies.set(key, Vue.ref(null));
    return cookies.get(key);
  };
  const requests = [];
  let verified = false;
  let profileAnswer;
  const tabs = [];
  for (let tab = 0; tab < count; tab++) {
    const states = new Map();
    const listeners = new Map();
    const hooks = {};
    const cleanup = [];
    const scope = Vue.effectScope();
    const listen = (key, fn) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(fn);
    };
    const unlisten = (key, fn) => listeners.get(key)?.delete(fn);
    const useState = (key, init) => {
      if (!states.has(key)) states.set(key, Vue.ref(init()));
      return states.get(key);
    };
    const GET = async (path) => {
      requests.push({ tab, path });
      if (path === "/auth/users/me") return profileAnswer ? profileAnswer() : profile(verified);
      if (path.endsWith("/summary") || path === "/skills/courses/python") return course;
      if (path === "/shop/learning/policy") return { mode: "shadow", premium: false };
      if (path === "/skills/daily-limit") return null;
      throw new Error(`Unexpected request: ${path}`);
    };
    const document = {
      visibilityState: "visible",
      addEventListener: (key, fn) => listen(`document:${key}`, fn),
      removeEventListener: (key, fn) => unlisten(`document:${key}`, fn),
    };
    const window = {
      addEventListener: (key, fn) => listen(`window:${key}`, fn),
      removeEventListener: (key, fn) => unlisten(`window:${key}`, fn),
    };
    const bindings = {
      useState,
      GET,
      document,
      window,
      useAppCookie: jar,
      moderationAmbientChanged() {},
      usePremiumInfo: () => useState("premiumInfo", () => null),
      require: (name) =>
        name === "#app" ? { useState } : name === "~/types/userTypes" ? { User: class {} } : {},
    };
    const user = await module("composables/user.ts", bindings);
    Object.assign(bindings, user);
    const daily = await module("composables/useDailyLearning.ts", {
      ...bindings,
      require: (name) =>
        name === "~/utils/dailyLearning" ? { dailyLearning: () => null } : bindings.require(name),
    });
    const app = {
      runWithContext: (fn) => scope.run(fn),
      hook: (key, fn) => (hooks[key] = fn),
      vueApp: { onUnmount: (fn) => cleanup.push(fn) },
    };
    const plugin = await module("plugins/session-sync.client.ts", {
      ...bindings,
      defineNuxtPlugin: (fn) => fn,
    });
    scope.run(() => plugin.default(app));
    scope.run(() => hooks["app:mounted"]?.());

    const i18n = { useI18n: () => ({ locale: Vue.ref("de"), t: (key) => key }) };
    const navbar = await evaluate("components/NavbarMenu.vue", {
      ...bindings,
      ...daily,
      ...Vue,
      require: (name) =>
        ({
          vue: Vue,
          "vue-i18n": i18n,
          "@heroicons/vue/24/solid": { CheckBadgeIcon: tag("svg") },
          "@headlessui/vue": {},
          "@vueuse/core": { useDateFormat: () => Vue.ref("") },
          "~~/composables/premiumFeature": { usePremiumInfo: bindings.usePremiumInfo },
        })[name],
    });
    const copy = await evaluate("composables/courseExperience.ts", {
      require: (name) => ({ vue: Vue, "vue-i18n": i18n })[name],
    });
    const page = await component(
      "pages/courses/[id]/index.vue",
      {
        ...bindings,
        ...copy,
        useRoute: () => ({ params: { id: "python" }, query: {}, fullPath: "/courses/python" }),
        useRouter: () => ({ push() {} }),
        useSeoMeta() {},
      },
      {
        "vue-i18n": i18n,
        "~/utils/apiError": await evaluate("utils/apiError.ts", {}),
        "~/utils/courseJourney": await evaluate("utils/courseJourney.ts", {}),
        "~/utils/guest/copy": await evaluate("utils/guest/copy.ts", {}),
        "~/utils/siteHead": await evaluate("utils/siteHead.ts", {}),
      }
    );
    const ui = host();
    let dailyState;
    const mounted = ui.renderer.createApp({
      setup() {
        dailyState = daily.useDailyLearning();
        return () => [Vue.h(navbar), Vue.h(page)];
      },
    });
    mounted.config.warnHandler = () => {};
    mounted.component("Popover", {
      setup:
        (_, { slots }) =>
        () =>
          slots.default?.({ close() {} }),
    });
    for (const name of [
      "NuxtLink",
      "Avatar",
      "PopoverButton",
      "PopoverPanel",
      "Btn",
      "CourseOverview",
    ])
      mounted.component(name, tag(name));
    for (const [name, paths] of [
      ["UserHearts", ["/shop/hearts/learner", "/shop/premium/learner", "/shop/hearts/config"]],
      ["UserCoins", ["/shop/coins/learner"]],
      ["LearningPathAddCourse", ["/skills/plan"]],
    ])
      mounted.component(name, {
        setup() {
          Vue.onMounted(() => paths.forEach((path) => requests.push({ tab, path })));
          return () => Vue.h("span");
        },
      });
    mounted.mount(ui.root);
    tabs.push({
      ...user,
      dailyState,
      states,
      focus: () => listeners.get("window:focus")?.forEach((fn) => fn()),
    });
    t.after(() => {
      mounted.unmount();
      cleanup.forEach((fn) => fn());
      scope.stop();
    });
  }
  await settle();
  requests.length = 0;
  return {
    tabs,
    requests,
    holdProfile: (answer) => {
      profileAnswer = answer;
    },
    confirm: () => {
      verified = true;
    },
    async signup(oauth) {
      // Both responses carry a full unconfirmed profile in the registering tab. Other
      // tabs only receive the cookie fields, irrespective of the registration method.
      jar("user").value = cookieUser;
      jar("session").value = { id: "session" };
      jar("accessToken").value = oauth ? "oauth-session" : "password-session";
      jar("authGeneration").value = "registration";
      await settle();
    },
  };
}

for (const oauth of [true, false])
  test(`an unconfirmed ${oauth ? "OAuth" : "mail"} signup stays quiet across 14 course tabs`, async (t) => {
    const f = await browser(t);
    await f.signup(oauth);
    const private_ = f.requests.filter(
      (r) => !r.path.endsWith("/summary") && r.path !== "/auth/users/me"
    );
    assert.deepEqual(
      private_.map((r) => r.path),
      [],
      `${private_.length} private reads after registration`
    );
    assert.equal(f.requests.filter((r) => r.path === "/auth/users/me").length, 14);
    assert.equal(f.requests.filter((r) => r.path.endsWith("/summary")).length, 14);
    assert.ok(f.requests.length < 60, `${f.requests.length} reads after registration`);
    for (const tab of f.tabs) {
      await tab.dailyState.refresh(true);
      tab.states.get("premiumInfo").value = { premium: false };
    }
    await settle();
    assert.equal(f.requests.length, 28, "premium and forced refreshes cannot start private reads");
    f.confirm();
    f.tabs[0].focus();
    await settle();
    assert.equal(f.tabs[0].useLearningAccountReady().value, true);
    for (const path of [
      "/skills/daily-limit",
      "/shop/learning/policy",
      "/skills/plan",
      "/shop/coins/learner",
      "/shop/hearts/learner",
    ])
      assert.equal(f.requests.filter((r) => r.tab === 0 && r.path === path).length, 1, path);
    assert.ok(
      f.requests.every(
        (r) => r.tab === 0 || r.path.endsWith("/summary") || r.path === "/auth/users/me"
      )
    );
  });

test("a cookie is insufficient, and a delayed profile does not start private learning reads", async (t) => {
  const f = await browser(t, 1);
  let answer;
  f.holdProfile(
    () =>
      new Promise((resolve) => {
        answer = resolve;
      })
  );
  await f.signup(true);
  assert.equal(f.tabs[0].useLearningAccountReady().value, false);
  assert.deepEqual(f.requests.map((r) => r.path).sort(), [
    "/auth/users/me",
    "/skills/courses/python/summary",
  ]);
  f.tabs[0].focus();
  await settle();
  assert.equal(f.requests.filter((r) => r.path === "/auth/users/me").length, 1);
  answer(profile(true));
  await settle();
  assert.equal(f.tabs[0].useLearningAccountReady().value, true);
  assert.equal(f.requests.filter((r) => r.path === "/skills/courses/python").length, 1);
});

test("a failed profile read is asked again when the tab is looked at", async (t) => {
  const f = await browser(t, 1);
  f.holdProfile(() => Promise.reject({ data: "Error.TryAgainLater" }));
  await f.signup(false);
  assert.equal(f.tabs[0].useLearningAccountReady().value, false);
  f.holdProfile(() => profile(true));
  f.tabs[0].focus();
  await settle();
  assert.equal(f.requests.filter((r) => r.path === "/auth/users/me").length, 2);
  assert.equal(f.tabs[0].useLearningAccountReady().value, true);
});

test("administrators retain the service's verification exemption", async (t) => {
  const f = await browser(t, 1);
  f.holdProfile(() => profile(false, true));
  await f.signup(false);
  assert.equal(f.tabs[0].useLearningAccountReady().value, true);
  assert.equal(f.requests.filter((r) => r.path === "/skills/daily-limit").length, 1);
});
