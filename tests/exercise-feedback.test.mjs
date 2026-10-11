// What an exercise of the learning room says and allows after an answer. The room is mounted
// with its real script, template and controller; the service and the page around it are stand-ins.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "typescript";
import * as Vue from "vue";
import { evaluate, host, settle } from "./helpers/mounted-page.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const locales = Object.fromEntries(
  await Promise.all(
    ["de", "en-US"].map(async (language) => [
      language,
      JSON.parse(await read(`locales/${language}.json`)),
    ])
  )
);
const apiError = await evaluate("utils/apiError.ts", {});
const controller = await evaluate("utils/learningExercise.ts", { require: () => apiError });
const { descriptor } = parse(await read("components/learning/ExerciseRoom.vue"));
const code = ts.transpileModule(
  compileScript(descriptor, { id: "exercise-room", inlineTemplate: true }).content,
  { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } }
).outputText;

const REFERENCE = { task_id: "task", subtask_id: "exercise" };
const exerciseData = (extra) => ({
  id: REFERENCE.subtask_id,
  task_id: REFERENCE.task_id,
  creator: "author",
  enabled: true,
  retired: false,
  solved: false,
  ...extra,
});

/**
 * One exercise as the learning room shows it. `answerTo` is the service: it gets each answer
 * that is sent and says what the check found.
 */
async function room({ type, data, answerTo, language = "de", state = {}, attempt, reviewId }) {
  const sentence = (key, named = {}) =>
    key
      .split(".")
      .reduce((part, name) => part?.[name], locales[language])
      ?.replace(/\{(\w+)\}/g, (whole, name) => (name in named ? named[name] : whole)) ?? key;
  const sent = [];
  const completed = [];
  const request = async (path, method = "GET", body) => {
    if (path.startsWith("/shop/hearts/")) return { hearts: 6 };
    if (path.startsWith("/shop/premium/")) return { premium: false };
    if (path.endsWith("/environments")) return { python: {} };
    if (path.endsWith("/examples")) return [];
    if (method === "POST") {
      // The answer leaves the page as plain data.
      sent.push(JSON.parse(JSON.stringify(body)));
      return answerTo(sent.at(-1), sent.length);
    }
    if (path.endsWith("/submissions")) return [{ id: "submission", result: attempt }];
    if (path.includes("/attempts/")) return { id: state.attempt_id, ...REFERENCE, ...attempt };
    return exerciseData(data);
  };
  const scope = {
    require: (name) =>
      ({
        vue: Vue,
        "vue-i18n": { useI18n: () => ({ t: sentence, locale: Vue.ref(language) }) },
        "~/utils/learningExercise": controller,
      })[name],
    ...Vue,
    useDailyLearning: () => ({ showHearts: Vue.ref(true) }),
    useHeartsEmpty: () => ({ heartsEmpty: Vue.ref(false), reportNoHearts() {} }),
    useHeartInfo: () => Vue.ref(null),
  };
  const exports = {};
  const environment = new Proxy(scope, {
    has: () => true,
    get: (target, key) =>
      key === Symbol.unscopables
        ? undefined
        : key === "exports"
          ? exports
          : key in target
            ? target[key]
            : key in globalThis
              ? globalThis[key]
              : () => {},
  });
  new Function("environment", `with (environment) { ${code} }`)(environment);
  const ui = host();
  const saved = Vue.ref(state);
  const app = ui.renderer.createApp({
    render: () =>
      Vue.h(exports.default, {
        reference: { ...REFERENCE, type },
        state: saved.value,
        request,
        userId: "learner",
        reviewId,
        disabled: false,
        save: async () => true,
        onChange: (next) => (saved.value = next),
        onComplete: (id) => completed.push(id),
      }),
  });
  for (const name of ["Markdown", "UserHeartsEmpty"]) app.component(name, () => Vue.h("span"));
  // The editor stands in as a field that reports what is typed into it.
  app.component("LearningCodeEditor", (props, { emit }) =>
    Vue.h("textarea", { onInput: (event) => emit("update:modelValue", event.target.value) })
  );
  app.mount(ui.root);
  await settle();
  const said = (node) => [node.text, ...node.children.map(said)].join("").trim();
  const button = (label) => ui.all().find((node) => node.type === "button" && said(node) === label);
  const { LearningRooms } = locales[language];
  return {
    sent,
    completed,
    texts: LearningRooms,
    /** Every sentence the room shows right now. */
    lines: () =>
      ui
        .all()
        .filter((node) => node.type === "p")
        .map(said),
    check: button.bind(null, LearningRooms.CheckAnswer),
    button,
    async choose(row, value) {
      const selects = ui.all().filter((node) => node.type === "select");
      selects[row].props.onChange({ target: { value: String(value) } });
      await settle();
    },
    async tick(index) {
      const boxes = ui.all().filter((node) => node.type === "input");
      boxes[index].props.onChange();
      await settle();
    },
    async type(text) {
      ui.all()
        .find((node) => node.type === "textarea")
        .props.onInput({ target: { value: text } });
      await settle();
    },
    async press(node) {
      // A disabled button takes no click, as in a browser.
      if (!node.props.disabled) node.props.onClick();
      await settle();
    },
    /** A click that reaches the button's handler although the button is disabled. */
    async force(node) {
      node.props.onClick();
      await settle();
    },
    /** What the page has saved of this exercise: the state a later visit starts from. */
    state: () => JSON.parse(JSON.stringify(saved.value)),
    stop: () => app.unmount(),
  };
}

const matching = { left: ["a", "b", "c"], right: ["1", "2", "3"] };
const judge = (solution) => (body, number) => {
  const correct = body.answer.filter((value, index) => value === solution[index]).length;
  return {
    attempt_id: `attempt-${number}`,
    hearts_pending: false,
    solved: correct === solution.length,
    correct,
  };
};

for (const language of ["de", "en-US"])
  test(`a wrong matching that has not been changed cannot be sent again, and the room says how much of it is right (${language})`, async (t) => {
    const r = await room({
      type: "matching",
      data: matching,
      answerTo: judge([0, 1, 2]),
      language,
    });
    t.after(r.stop);
    const count = (correct) =>
      r.texts.MatchesCorrect.replace("{correct}", correct).replace("{total}", 3);
    // Nothing is chosen yet: the answer cannot be sent.
    assert.equal(r.check().props.disabled, true);
    await r.choose(0, 0);
    await r.choose(1, 2);
    await r.choose(2, 1);
    assert.equal(r.check().props.disabled, false);
    await r.press(r.check());
    assert.deepEqual(r.sent, [{ answer: [0, 2, 1] }]);
    // The result says what to do and how much of the answer is right.
    assert(r.lines().includes(r.texts.Incorrect));
    assert(r.lines().includes(count(1)));
    assert.match(
      r.texts.Incorrect,
      language === "de" ? /Ändere deine Antwort/ : /Change your answer/
    );
    // The same answer is not checked a second time, however often the button is pressed.
    assert.equal(r.check().props.disabled, true);
    await r.press(r.check());
    await r.press(r.check());
    assert.equal(r.sent.length, 1);
    // Nor does a click that gets past the disabled button send it.
    await r.force(r.check());
    assert.equal(r.sent.length, 1);
    // A changed answer frees the button. The count spoke of the checked answer, so it goes.
    await r.choose(1, 1);
    await r.choose(2, 2);
    assert.equal(r.check().props.disabled, false);
    assert(!r.lines().some((line) => line === count(1)));
    // Changed back to the answer that was found wrong: locked again, with its count.
    await r.choose(1, 2);
    await r.choose(2, 1);
    assert.equal(r.check().props.disabled, true);
    assert(r.lines().includes(count(1)));
    // The right answer goes out and is accepted.
    await r.choose(1, 1);
    await r.choose(2, 2);
    await r.press(r.check());
    assert.deepEqual(r.sent.at(-1), { answer: [0, 1, 2] });
    assert.equal(r.sent.length, 2);
    assert(r.lines().includes(r.texts.Correct));
  });

test("a second wrong answer is counted anew and locked in turn", async (t) => {
  const r = await room({ type: "matching", data: matching, answerTo: judge([0, 1, 2]) });
  t.after(r.stop);
  const count = (correct) =>
    r.texts.MatchesCorrect.replace("{correct}", correct).replace("{total}", 3);
  for (const [row, value] of [
    [0, 1],
    [1, 2],
    [2, 0],
  ])
    await r.choose(row, value);
  await r.press(r.check());
  assert(r.lines().includes(count(0)));
  await r.choose(0, 0);
  await r.choose(1, 2);
  await r.choose(2, 1);
  await r.press(r.check());
  assert.equal(r.sent.length, 2);
  assert(r.lines().includes(count(1)) && !r.lines().includes(count(0)));
  assert.equal(r.check().props.disabled, true);
  await r.press(r.check());
  assert.equal(r.sent.length, 2);
});

test("a question with several right answers says how many it judged right; one with a single answer does not", async (t) => {
  const answers = ["w", "x", "y", "z"];
  const wrong = (correct) => (body, number) => ({
    attempt_id: `attempt-${number}`,
    hearts_pending: false,
    solved: false,
    correct,
  });
  const several = await room({
    type: "multiple_choice",
    data: { answers, single_choice: false },
    answerTo: wrong(2),
  });
  t.after(several.stop);
  await several.tick(0);
  await several.tick(1);
  await several.press(several.check());
  assert.deepEqual(several.sent, [{ answers: [true, true, false, false] }]);
  assert(
    several
      .lines()
      .includes(several.texts.AnswersCorrect.replace("{correct}", 2).replace("{total}", 4))
  );
  assert.equal(several.check().props.disabled, true);
  await several.tick(1);
  assert.equal(several.check().props.disabled, false);

  const single = await room({
    type: "multiple_choice",
    data: { answers, single_choice: true },
    answerTo: wrong(2),
  });
  t.after(single.stop);
  await single.tick(3);
  await single.press(single.check());
  assert(single.lines().includes(single.texts.Incorrect));
  assert(!single.lines().some((line) => /\b2\b.*\b4\b/.test(line)));
  // The lock holds here too.
  assert.equal(single.check().props.disabled, true);
  await single.press(single.check());
  assert.equal(single.sent.length, 1);
  await single.tick(0);
  assert.equal(single.check().props.disabled, false);
});

// What a visit finds when it comes back: the service still reports the last attempt as wrong,
// and the fields hold the saved draft. The draft may be the checked answer or a later one.
const choices = ["w", "x", "y", "z"];
const judgeChoice = (solution) => (body, number) => {
  const correct = body.answers.filter((value, index) => value === solution[index]).length;
  return {
    attempt_id: `attempt-${number}`,
    hearts_pending: false,
    solved: correct === solution.length,
    correct,
  };
};
const kinds = {
  matching: {
    exercise: { type: "matching", data: matching, answerTo: judge([0, 1, 2]) },
    wrong: { answer: [0, 2, 1] },
    right: { answer: [0, 1, 2] },
    async setWrong(r) {
      await r.choose(0, 0);
      await r.choose(1, 2);
      await r.choose(2, 1);
    },
    async setRight(r) {
      await r.choose(1, 1);
      await r.choose(2, 2);
    },
  },
  "a choice with one answer": {
    exercise: {
      type: "multiple_choice",
      data: { answers: choices, single_choice: true },
      answerTo: judgeChoice([true, false, false, false]),
    },
    wrong: { answers: [false, false, false, true] },
    right: { answers: [true, false, false, false] },
    setWrong: (r) => r.tick(3),
    setRight: (r) => r.tick(0),
  },
  "a choice with several right answers": {
    exercise: {
      type: "multiple_choice",
      data: { answers: choices, single_choice: false },
      answerTo: judgeChoice([true, false, true, false]),
    },
    wrong: { answers: [true, true, false, false] },
    right: { answers: [true, false, true, false] },
    async setWrong(r) {
      await r.tick(0);
      await r.tick(1);
    },
    async setRight(r) {
      await r.tick(1);
      await r.tick(2);
    },
  },
};
const reported = { solved: false, hearts_pending: false };

for (const [name, kind] of Object.entries(kinds))
  test(`coming back to ${name}: an answer changed after the check is free, the checked one stays locked`, async (t) => {
    const checkedAnswer = Object.values(kind.wrong)[0];
    // The first visit: a wrong answer is checked.
    const first = await room(kind.exercise);
    await kind.setWrong(first);
    await first.press(first.check());
    assert.deepEqual(first.sent, [kind.wrong]);
    const afterCheck = first.state();
    // The page saves what the attempt checked together with the attempt.
    assert.equal(afterCheck.attempt_id, "attempt-1");
    assert.deepEqual(afterCheck.checked_answer, checkedAnswer);
    // The right answer is set and not sent. The page saves this draft too.
    await kind.setRight(first);
    const changedDraft = first.state();
    assert.deepEqual({ ...changedDraft, ...kind.right }, changedDraft);
    assert.deepEqual(changedDraft.checked_answer, checkedAnswer);
    assert.equal(first.sent.length, 1);
    first.stop();

    // Back with the changed draft. It was never checked, so it can be sent, and it is right.
    const back = await room({ ...kind.exercise, state: changedDraft, attempt: reported });
    t.after(back.stop);
    assert(back.lines().includes(back.texts.Incorrect));
    assert.equal(back.check().props.disabled, false);
    await back.press(back.check());
    assert.deepEqual(back.sent, [kind.right]);
    assert(back.lines().includes(back.texts.Correct));

    // Back with the checked answer unchanged: it stays locked until it changes.
    const same = await room({ ...kind.exercise, state: afterCheck, attempt: reported });
    t.after(same.stop);
    assert(same.lines().includes(same.texts.Incorrect));
    assert.equal(same.check().props.disabled, true);
    await same.press(same.check());
    await same.force(same.check());
    assert.equal(same.sent.length, 0);
    await kind.setRight(same);
    assert.equal(same.check().props.disabled, false);

    // Back with an attempt that does not say what it checked, as an earlier version saved
    // it: nothing is locked, whatever stands in the fields.
    const { checked_answer: _unknown, ...withoutRecord } = afterCheck;
    const old = await room({ ...kind.exercise, state: withoutRecord, attempt: reported });
    t.after(old.stop);
    assert(old.lines().includes(old.texts.Incorrect));
    assert.equal(old.check().props.disabled, false);
    await old.press(old.check());
    assert.deepEqual(old.sent, [kind.wrong]);
  });

test("a new check replaces what the page remembers of the last one", async (t) => {
  const r = await room({ type: "matching", data: matching, answerTo: judge([0, 1, 2]) });
  t.after(r.stop);
  for (const [row, value] of [
    [0, 1],
    [1, 2],
    [2, 0],
  ])
    await r.choose(row, value);
  await r.press(r.check());
  assert.deepEqual(r.state().checked_answer, [1, 2, 0]);
  await r.choose(0, 0);
  await r.choose(1, 2);
  await r.choose(2, 1);
  await r.press(r.check());
  const state = r.state();
  assert.equal(state.attempt_id, "attempt-2");
  assert.deepEqual(state.checked_answer, [0, 2, 1]);
  // The first wrong answer is no longer the checked one: it could be sent again.
  for (const [row, value] of [
    [0, 1],
    [1, 2],
    [2, 0],
  ])
    await r.choose(row, value);
  assert.equal(r.check().props.disabled, false);
});

test("code that was found wrong can be handed in again unchanged", async (t) => {
  // A verdict such as a time limit can differ between two runs of the same code.
  const r = await room({
    type: "coding",
    data: {},
    answerTo: () => ({ id: "submission" }),
    attempt: { verdict: "TIME_LIMIT_EXCEEDED" },
  });
  t.after(r.stop);
  await r.type("print(1)");
  await r.press(r.check());
  assert.equal(r.sent.length, 1);
  assert.equal(r.check().props.disabled, false);
  await r.press(r.check());
  assert.equal(r.sent.length, 2);
});

test("a solved exercise shows what it brought, with one button that leads on", async (t) => {
  for (const language of ["de", "en-US"]) {
    const r = await room({
      type: "matching",
      data: { ...matching, xp: 5 },
      answerTo: judge([0, 1, 2]),
      language,
    });
    t.after(r.stop);
    for (const row of [0, 1, 2]) await r.choose(row, row);
    await r.press(r.check());
    const earned = r.texts.EarnedXp.replace("{xp}", 5);
    assert.equal(earned, "+5 XP");
    assert.deepEqual(r.lines().filter(Boolean), [r.texts.Correct, earned], language);
    // The button hands the solved attempt to the page, which opens the next unit.
    await r.press(r.button(r.texts.Continue));
    assert.deepEqual(r.completed, ["attempt-1"], language);
  }
});

test("XP are shown for a first solution only", async (t) => {
  const solve = async (r) => {
    for (const row of [0, 1, 2]) await r.choose(row, row);
    await r.press(r.check());
  };
  // An exercise that opens already solved brought its XP earlier.
  const solvedBefore = await room({
    type: "matching",
    data: { ...matching, xp: 5, solved: true },
    answerTo: judge([0, 1, 2]),
  });
  t.after(solvedBefore.stop);
  assert.deepEqual(solvedBefore.lines().filter(Boolean), [solvedBefore.texts.Correct]);
  // A repetition of a solved exercise brings none.
  const repeated = await room({
    type: "matching",
    data: { ...matching, xp: 5, solved: true },
    answerTo: judge([0, 1, 2]),
    reviewId: "review",
  });
  t.after(repeated.stop);
  await solve(repeated);
  assert.deepEqual(repeated.lines().filter(Boolean), [repeated.texts.Correct]);
  // An exercise without XP says nothing about XP.
  const none = await room({
    type: "matching",
    data: { ...matching, xp: 0 },
    answerTo: judge([0, 1, 2]),
  });
  t.after(none.stop);
  await solve(none);
  assert.deepEqual(none.lines().filter(Boolean), [none.texts.Correct]);
});
