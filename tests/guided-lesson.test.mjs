import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import { compileScript, parse } from "@vue/compiler-sfc";

const source = await readFile(new URL("../utils/guidedLesson.ts", import.meta.url), "utf8");
const runtime = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
const { guidedStage, experimentInput, experimentResult, lessonAnswers } = await import(
  `data:text/javascript;base64,${Buffer.from(runtime).toString("base64")}`
);

test("saved guided-lesson positions recover within the current lesson", () => {
  for (const invalid of [undefined, null, "2", 1.5, NaN, Infinity, {}, []]) {
    assert.equal(guidedStage(invalid, 4), 0);
  }
  assert.equal(guidedStage(2, 4), 2);
  assert.equal(guidedStage(12, 4), 3);
  assert.equal(guidedStage(-1, 4), 0);
  assert.equal(guidedStage(1, 0), 0);
});

test("controlled experiments preserve zero quantities and exact inclusive boundaries", () => {
  const basket = { min: 0, max: 8, initial: 3, operation: { kind: "multiply", factor: 4 } };
  assert.equal(experimentResult(basket, 0), 0);
  assert.equal(experimentResult(basket, 3), 12);
  assert.equal(experimentInput(basket, -10), 0);
  assert.equal(experimentInput(basket, 100), 8);
  assert.equal(experimentInput(basket, NaN), 3);
  const shipping = {
    min: 0,
    max: 60,
    initial: 29,
    operation: { kind: "threshold", threshold: 30, below: 5, atLeast: 0 },
  };
  assert.equal(experimentResult(shipping, 29), 5);
  assert.equal(experimentResult(shipping, 30), 0);
  assert.equal(experimentResult(shipping, 31), 0);
});

test("lesson completion submits only the complete checked answer map", () => {
  const lesson = {
    steps: [
      { id: "intro" },
      { check: { id: "a", answer: "0" } },
      { check: { id: "b", answer: "1" } },
    ],
  };
  assert.equal(lessonAnswers(lesson, {}), null);
  assert.equal(lessonAnswers(lesson, { a: "0", b: "0" }), null);
  assert.equal(lessonAnswers(lesson, { a: 0, b: 1 }), null);
  assert.equal(lessonAnswers(lesson, ["0", "1"]), null);
  assert.deepEqual(lessonAnswers(lesson, { a: "0", b: "1", arbitrary: "draft text" }), {
    a: "0",
    b: "1",
  });
});

test("the actual guided renderer compiles with installed Vue hooks and its template", async () => {
  const file = "components/learning/GuidedLesson.vue";
  const { descriptor, errors } = parse(
    await readFile(new URL(`../${file}`, import.meta.url), "utf8"),
    { filename: file }
  );
  assert.deepEqual(errors, []);
  const compiled = compileScript(descriptor, { id: file, inlineTemplate: true });
  assert.equal(compiled.imports.useId.source, "vue");
  const transformed = ts.transpileModule(compiled.content, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2023 },
  });
  assert.deepEqual(transformed.diagnostics, []);
});
