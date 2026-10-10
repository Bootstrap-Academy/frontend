import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "@vue/compiler-sfc";
import * as Vue from "vue";
import ts from "typescript";

/**
 * The skill tree renders one node per grid cell, empty cells included, so
 * anything a node requests while mounting is requested once per cell on every
 * page view. The session plugin has already loaded the profile by then.
 */
async function mountNode(name, props, user) {
  const file = await readFile(new URL(`../components/skill-tree/${name}.vue`, import.meta.url));
  const source = parse(String(file)).descriptor.script.content.replace(/^import[\s\S]*?;\n/gm, "");
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const calls = { profile: 0, bookmarks: [], routes: [] };
  const mounted = [];
  const scope = {
    defineComponent: (component) => component,
    StarIcon: {},
    computed: Vue.computed,
    ref: Vue.ref,
    onMounted: (hook) => mounted.push(hook),
    useI18n: () => ({ t: (key) => key }),
    useRouter: () => ({ push: (path) => calls.routes.push(path) }),
    useUser: () => Vue.ref(user),
    getUser: async () => {
      calls.profile++;
      return [user, null];
    },
    createBookmark: async (...ids) => calls.bookmarks.push(["create", ...ids]),
    deleteBookmark: async (...ids) => calls.bookmarks.push(["delete", ...ids]),
  };
  const exports = {};
  new Function("exports", ...Object.keys(scope), output)(exports, ...Object.values(scope));
  const state = exports.default.setup(props, { emit: () => {} });
  await Promise.all(mounted.map((hook) => hook()));
  return { state, calls };
}

const account = { id: "user-fixture", name: "Fixture", display_name: "Fixture" };
const node = { id: "skill-fixture", name: "Fixture skill", parent_id: null, is_bookmarked: false };

test("mounting a skill tree node does not request the profile", async () => {
  for (const user of [account, null]) {
    const cell = await mountNode("Node", { node, row: 2, column: 3 }, user);
    const icon = await mountNode("NodeSvg", { node, isBookmarked: false, navigate: true }, user);
    assert.equal(cell.calls.profile, 0);
    assert.equal(icon.calls.profile, 0);
  }
});

test("the bookmark star follows the session that was restored when the app started", async () => {
  assert.ok((await mountNode("NodeSvg", { node }, account)).state.isAuth);
  assert.ok(!(await mountNode("NodeSvg", { node }, null)).state.isAuth);

  const member = await mountNode("Node", { node }, account);
  await member.state.toggleBookmark(true);
  assert.deepEqual(member.calls.bookmarks, [["create", "skill-fixture", ""]]);
  assert.deepEqual(member.calls.routes, []);

  const guest = await mountNode("Node", { node }, null);
  await guest.state.toggleBookmark(true);
  assert.deepEqual(guest.calls.bookmarks, []);
  assert.deepEqual(guest.calls.routes, ["/auth/login"]);
});
