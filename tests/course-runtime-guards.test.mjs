import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "@vue/compiler-sfc";
import ts from "typescript";

async function actualFunction(filename, name, bindings) {
  const file = await readFile(new URL(filename, import.meta.url), "utf8");
  const source = filename.endsWith(".vue") ? parse(file).descriptor.scriptSetup.content : file;
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  let expression;
  for (const statement of tree.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name)
      expression = statement.getText(tree).replace(/^export\s+/, "");
    if (ts.isVariableStatement(statement)) {
      const declaration = statement.declarationList.declarations.find(
        (item) => item.name.getText(tree) === name
      );
      if (declaration) expression = declaration.initializer.getText(tree);
    }
  }
  assert(expression, `Actual function ${name} must exist`);
  const compiled = ts.transpileModule(`const underTest = ${expression};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return new Function(...Object.keys(bindings), compiled + "\nreturn underTest;")(
    ...Object.values(bindings)
  );
}

test("stale video metadata without a pending lecture does not throw or start playback", async () => {
  let plays = 0;
  const media = {
    currentTime: 5,
    duration: 60,
    play: () => {
      plays++;
      return Promise.resolve();
    },
  };
  const bindings = { alive: true, video: { value: media }, props: {}, pendingPosition: null };
  const restore = await actualFunction(
    "../components/course/Video.vue",
    "restorePosition",
    bindings
  );
  assert.doesNotThrow(() => restore({ target: media }));
  assert.equal(media.currentTime, 5);
  assert.equal(plays, 0);

  const valid = await actualFunction("../components/course/Video.vue", "restorePosition", {
    ...bindings,
    props: { activeLecture: { id: "lecture-fixture" } },
    pendingPosition: { lecture: "lecture-fixture", position: 12, playing: true },
  });
  valid({ target: media });
  assert.equal(media.currentTime, 12);
  assert.equal(plays, 1);
});

test("lecture quiz preparation abandons a lecture that changed during loading", async () => {
  const info = { value: [{ id: "quiz-fixture" }] };
  let clearDuringRequest = true;
  const task = { id: "question-fixture" };
  const assigned = { value: [] };
  const calls = [];
  const prepare = await actualFunction("../composables/quizzes.ts", "assignLectureQuizzes", {
    useSubTasksInQuiz: () => ({ value: [task] }),
    useQuizzesInLectureInfo: () => info,
    useQuizzesInLecture: () => assigned,
    getSubTasksInQuiz: async (id) => {
      calls.push(["questions", id]);
      if (clearDuringRequest) info.value = [];
    },
    getMatchingsInLecture: async (id) => calls.push(["matchings", id]),
    console: { log: () => {} },
  });
  await prepare();
  assert.deepEqual(calls, [["questions", "quiz-fixture"]]);
  assert.deepEqual(assigned.value, []);
  await prepare();
  assert.equal(calls.length, 1, "an empty list makes no request");
  clearDuringRequest = false;
  info.value = [{ id: "quiz-fixture" }];
  await prepare();
  assert.deepEqual(calls, [
    ["questions", "quiz-fixture"],
    ["questions", "quiz-fixture"],
    ["matchings", "quiz-fixture"],
  ]);
  assert.deepEqual(assigned.value, [task]);
});

test("a stale adjacent course step leaves the current page and error state intact", async () => {
  const saveError = { value: true };
  const calls = [];
  const step = { id: "lecture-fixture" };
  const go = await actualFunction("../pages/courses/[id]/watch.vue", "go", {
    saveError,
    id: { value: "course-fixture" },
    skillID: { value: "skill-fixture" },
    subSkillID: { value: "subskill-fixture" },
    router: { replace: async (location) => calls.push(location) },
    courseWatchLocation: (course, lecture, context) => {
      assert.equal(course, "course-fixture");
      assert.equal(lecture, step);
      assert.deepEqual(context, { skillID: "skill-fixture", subSkillID: "subskill-fixture" });
      return "/fixture-course-location";
    },
  });
  await go(undefined);
  assert.deepEqual(calls, []);
  assert.equal(saveError.value, true);
  await go(step);
  assert.deepEqual(calls, ["/fixture-course-location"]);
  assert.equal(saveError.value, false);
});
