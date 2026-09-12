import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import { parse } from "@vue/compiler-sfc";
import ts from "typescript";

async function visit(file, route = { params: {}, query: {} }) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const { descriptor, errors } = parse(source, { filename: file });
  assert.deepEqual(errors, []);
  const code = ts.transpileModule(descriptor.scriptSetup.content, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  let metadata;
  const navigation = [];
  // A visit must only navigate. No account, API or onMounted creation is available.
  runInNewContext(code, {
    definePageMeta: (value) => (metadata = value),
    navigateTo: (location, options) => {
      navigation.push(JSON.parse(JSON.stringify({ location, options })));
      return location;
    },
  });
  assert.equal(typeof metadata?.middleware, "function", file);
  await metadata.middleware(route);
  assert.equal(navigation.length, 1, file);
  assert.deepEqual(navigation[0].options, { replace: true }, file);
  return navigation[0].location;
}

test("old quiz creation links return to the existing course or skill without creating content", async () => {
  const route = "pages/quizzes/[skill]/[subSkill]/create.vue";
  assert.equal(
    await visit(route, {
      params: { skill: "programming", subSkill: "python" },
      query: { course: "C++ / basics" },
    }),
    "/courses/C%2B%2B%20%2F%20basics"
  );
  assert.equal(
    await visit(route, {
      params: { skill: "language & science", subSkill: "C++" },
      query: { course: ["ambiguous", "query"] },
    }),
    "/skill-tree/language%20%26%20science/C%2B%2B"
  );
  for (const file of ["pages/quizzes/edit-[id].vue", "pages/profile/quizzes.vue"]) {
    assert.equal(await visit(file), "/skill-tree");
  }
});

test("old challenge publishing links return to existing challenges", async () => {
  assert.deepEqual(
    await visit("pages/challenges/[category]/create.vue", {
      params: { category: "python" },
      query: {},
    }),
    { path: "/challenges/all", query: { category: "python" } }
  );
  assert.deepEqual(
    await visit("pages/challenges/edit-[challenge].vue", {
      params: { challenge: "old challenge" },
      query: { category: "python" },
    }),
    { path: "/challenges/all", query: { category: "python", challenge: "old challenge" } }
  );
});

test("removed events and coin rewards have useful bookmark destinations without API side effects", async () => {
  for (const file of [
    "pages/calendar.vue",
    "pages/webinars/index.vue",
    "pages/webinars/[id].vue",
    "pages/webinars/create/[skill].vue",
  ]) {
    assert.equal(await visit(file), "/profile/courses");
  }
  assert.equal(await visit("pages/morphcoins/index.vue"), "/morphcoins/buy");
});
