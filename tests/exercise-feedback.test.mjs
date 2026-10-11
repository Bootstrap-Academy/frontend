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
async function room({ type, data, answerTo, language = "de", state = {}, attempt }) {
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

test("after a reload the wrong answer is still locked until it changes", async (t) => {
  // The saved state holds the answer and the attempt; the service confirms it was wrong.
  const r = await room({
    type: "matching",
    data: matching,
    answerTo: judge([0, 1, 2]),
    state: { answer: [0, 2, 1], attempt_id: "attempt-before-reload" },
    attempt: { solved: false, hearts_pending: false },
  });
  t.after(r.stop);
  assert(r.lines().includes(r.texts.Incorrect));
  assert.equal(r.check().props.disabled, true);
  await r.press(r.check());
  assert.equal(r.sent.length, 0);
  await r.choose(1, 1);
  await r.choose(2, 2);
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
