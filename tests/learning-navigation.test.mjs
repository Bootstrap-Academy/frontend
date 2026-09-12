import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse } from "@vue/compiler-sfc";
import * as vue from "vue";
import ts from "typescript";

const source = await readFile(new URL("../pages/learn.vue", import.meta.url), "utf8");
const { descriptor } = parse(source);
const file = ts.createSourceFile(
  "learn.ts",
  descriptor.scriptSetup.content,
  ts.ScriptTarget.Latest,
  true
);
const setup = file.statements
  .filter((node) => !ts.isImportDeclaration(node))
  .map((node) => node.getText(file))
  .join("\n");

test("the actual room shell blocks an in-flight POST but allows a saved unknown or known pending result", async (t) => {
  let leave;
  let nextCalls = 0;
  let cancelCalls = 0;
  let canSave = true;
  const view = vue.ref({
    status: "ready",
    room: { unit: { id: "unit-a", content: {} }, progress: { status: "in_progress" } },
    path: { id: "path-a" },
    draft: { submission_unknown: true },
    saving: false,
    dirty: false,
    completing: false,
    completionPending: false,
    conflict: false,
  });
  const owner = vue.ref("user-a:session-a");
  const accessToken = vue.ref("token-a");
  const scope = vue.effectScope();
  t.after(() => scope.stop());
  const bindings = {
    ref: vue.ref,
    computed: vue.computed,
    watch: vue.watch,
    definePageMeta: () => {},
    useHead: () => {},
    useI18n: () => ({ t: (key) => key, locale: vue.ref("de") }),
    useRouter: () => ({ replace: async () => {} }),
    useLearningRooms: () => ({
      view,
      data: {
        save: async () => canSave,
        next: async () => {
          nextCalls++;
          return true;
        },
        complete: async () => true,
      },
      edit: () => {},
      request: async () => {},
      owner,
      user: vue.ref({ id: "user-a" }),
      accessToken,
    }),
    onBeforeRouteLeave: (guard) => {
      leave = guard;
    },
    onMounted: () => {},
    onBeforeUnmount: () => {},
  };
  const code = ts.transpileModule(setup, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
  }).outputText;
  const page = scope.run(() =>
    new Function(
      ...Object.keys(bindings),
      `${code}\nreturn { exercisePosting, exerciseComponent, changePath, advance, beforeUnload, roomKey };`
    )(...Object.values(bindings))
  );
  page.exerciseComponent.value = {
    cancelPreparation: () => {
      cancelCalls++;
    },
  };
  page.exercisePosting.value = true;
  assert.equal(await leave({ path: "/dashboard" }), false);
  await page.changePath("other-path");
  await page.advance();
  assert.equal(nextCalls, 0);
  let warned = false;
  page.beforeUnload({
    preventDefault: () => {
      warned = true;
    },
    returnValue: null,
  });
  assert.equal(warned, true);
  page.exercisePosting.value = false;
  assert.equal(await leave({ path: "/dashboard" }), true);
  assert.ok(cancelCalls > 0);
  warned = false;
  page.beforeUnload({
    preventDefault: () => {
      warned = true;
    },
  });
  assert.equal(warned, false);
  view.value.draft = { submission_id: "known-id" };
  assert.equal(await leave({ path: "/dashboard" }), true);
  await page.changePath("other-path");
  assert.equal(nextCalls, 1);
  const previousKey = page.roomKey.value;
  accessToken.value = "renewed-token";
  assert.equal(page.roomKey.value, previousKey);
  view.value.dirty = true;
  canSave = false;
  assert.equal(await leave({ path: "/auth/login" }), false);
  page.exercisePosting.value = true;
  owner.value = null;
  assert.equal(await leave({ path: "/auth/login" }), true);
});
