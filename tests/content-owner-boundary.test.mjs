import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = (
  await readFile(new URL("../utils/learningExercise.ts", import.meta.url), "utf8")
).replaceAll('"./apiError"', JSON.stringify(new URL("../utils/apiError.ts", import.meta.url).href));
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
const { createLearningExercise: create } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const reference = { type: "multiple_choice", task_id: "task", subtask_id: "exercise" };
const path = "/challenges/tasks/task/multiple_choice/exercise";

test("a private author's exercise uses the learner's own access and attempt", async () => {
  const calls = [];
  let view;
  const content = {
    id: "exercise",
    task_id: "task",
    creator: "private-author",
    enabled: true,
    retired: false,
    solved: false,
    question: "Choose",
    answers: ["yes", "no"],
  };
  const controller = create({
    request: async (url, method = "GET", body) => {
      calls.push({ url, method, body });
      if (url === path) return content;
      if (url === "/shop/premium/learner") return { premium: false };
      if (url === `${path}/attempts` && method === "POST") return { solved: true };
      throw new Error(`Unexpected identity/progress request: ${url}`);
    },
    changed: (next) => (view = next),
    persistSubmission: async () => true,
  });
  await controller.load(reference, "learner");
  assert.equal(view.phase, "ready");
  assert.equal(view.data.creator, "private-author");
  await controller.submit({ answers: [true, false] });
  assert.equal(view.phase, "correct");
  assert.deepEqual(
    calls.map(({ url }) => url),
    [path, "/shop/premium/learner", `${path}/attempts`]
  );
  assert.equal(content.creator, "private-author");
});

test("technical creator ownership still excludes the learner's own exercise", async () => {
  let view;
  const controller = create({
    request: async (url) => {
      if (url === path)
        return {
          id: "exercise",
          task_id: "task",
          creator: "learner",
          enabled: true,
          retired: false,
        };
      assert.equal(url, "/shop/premium/learner");
      return { premium: false };
    },
    changed: (next) => (view = next),
    persistSubmission: async () => true,
  });
  await controller.load(reference, "learner");
  assert.equal(view.phase, "error");
  assert.equal(view.data, null);
});
