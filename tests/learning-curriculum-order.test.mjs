import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse } from "@vue/compiler-sfc";
import { computed, ref } from "vue";
import ts from "typescript";

test("the visible course outline follows lesson order, including lessons outside chapters", async () => {
  const source = await readFile(
    new URL("../components/course/CurriculumLessons.vue", import.meta.url),
    "utf8"
  );
  const ast = ts.createSourceFile(
    "outline.ts",
    parse(source).descriptor.scriptSetup.content,
    ts.ScriptTarget.Latest,
    true
  );
  const body = ast.statements
    .filter((node) => !ts.isImportDeclaration(node))
    .map((node) => node.getText(ast))
    .join("\n");
  const script = ts.transpileModule(body, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  const title = { de: "Kapitel", en: "Chapter" };
  const lessons = [
    { id: "introduction", chapter_id: null },
    { id: "first", chapter_id: "b" },
    { id: "second", chapter_id: "b" },
    { id: "third", chapter_id: "a" },
    { id: "practice", chapter_id: null },
  ];
  const groups = new Function(
    "computed",
    "defineProps",
    "useI18n",
    `${script}\nreturn groups.value;`
  )(
    computed,
    () => ({
      curriculum: {
        chapters: [
          { id: "a", title },
          { id: "b", title },
        ],
        lessons,
      },
    }),
    () => ({ locale: ref("de") })
  );
  assert.deepEqual(
    groups.flatMap((group) => group.lessons),
    lessons
  );
  assert.deepEqual(
    groups.map((group) => group.lessons.length),
    [1, 2, 1, 1]
  );
  assert.deepEqual(
    groups.map((group) => group.title),
    [null, title, title, null]
  );
  assert.equal(new Set(groups.map((group) => group.id)).size, groups.length);
});
