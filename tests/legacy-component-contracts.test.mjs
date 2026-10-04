import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse, compileTemplate } from "@vue/compiler-sfc";
import * as Vue from "vue";
import ts from "typescript";

test("the legacy skill quiz page requests the skill's tasks rather than an undefined course", async () => {
  const file = await readFile(new URL("../pages/quizzes/skill-[id].vue", import.meta.url), "utf8");
  const source = parse(file).descriptor.script.content.replace(/^import[\s\S]*?;\n/gm, "");
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
  }).outputText;
  let mounted;
  const calls = [];
  const exports = {};
  new Function(
    "exports",
    "definePageMeta",
    "useI18n",
    "useRoute",
    "useQuizzes",
    "ref",
    "computed",
    "onMounted",
    "getQuizzes",
    "getQuizzesInSkill",
    output
  )(
    exports,
    () => {},
    () => ({ t: (key) => key }),
    () => ({ params: { id: "skill-fixture" } }),
    () => Vue.ref([]),
    Vue.ref,
    Vue.computed,
    (fn) => {
      mounted = fn;
    },
    () => assert.fail("the course quiz request must not run without a course"),
    async (id) => {
      calls.push(id);
    }
  );
  const state = exports.default.setup();
  await mounted();
  assert.deepEqual(calls, ["skill-fixture"]);
  assert.equal(state.loading.value, false);
});

test("submission rows keep their server identity when the newest result is inserted first", async () => {
  const filename = "ItemSubmission.vue";
  const file = await readFile(
    new URL("../components/challenges/ItemSubmission.vue", import.meta.url),
    "utf8"
  );
  const { code, errors } = compileTemplate({
    source: parse(file).descriptor.template.content,
    filename,
    id: "submission-contract",
  });
  assert.deepEqual(errors, []);
  const output = code
    .replace(
      /import \{([\s\S]*?)\} from "vue"/g,
      (_, names) => `const {${names.replaceAll(" as ", ": ")}} = Vue;`
    )
    .replace("export function render", "function render");
  const render = new Function("Vue", output + "\nreturn render;")(Vue);
  const old = {
    id: "old-submission",
    environment: "python",
    creation_timestamp: "2026-10-01",
    result: null,
  };
  const newer = { ...old, id: "new-submission", creation_timestamp: "2026-10-02" };
  function keys(submissions) {
    const tree = render(
      {
        submissions,
        t: (key) => key,
        dateFormat: String,
        messageTitle: () => "Pending",
        messageDescription: () => "",
        hasDetails: () => false,
        statusIcon: () => "span",
      },
      []
    );
    const rows = [];
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      if (node.type === "tr" && node.key !== null) rows.push(node.key);
      visit(node.children);
    }
    visit(tree);
    return rows;
  }
  assert.deepEqual(keys([old]), [old.id]);
  assert.deepEqual(keys([newer, old]), [newer.id, old.id]);
});
