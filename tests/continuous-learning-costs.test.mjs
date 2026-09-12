import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const source = await read("composables/codingChallenges.ts");
const file = ts.createSourceFile("coding.ts", source, ts.ScriptTarget.Latest, true);
const method = file.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === "getSubmissions"
);
const code = ts.transpileModule(method.getText(file).replace(/^export /, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2023 },
}).outputText;
function legacyFixture() {
  const user = { value: { id: "owner-a" } },
    session = { value: { id: "session-a" } };
  const hearts = { value: { hearts: 6 } },
    submissions = { value: [] },
    calls = [];
  let rows = [],
    heartResponse = { hearts: 4 };
  const bindings = {
    useUser: () => user,
    useSession: () => session,
    useHeartInfo: () => hearts,
    useCodingSubmissions: () => submissions,
    GET: async (path) => {
      calls.push(path);
      return path.startsWith("/shop/hearts/") ? await heartResponse : structuredClone(rows);
    },
  };
  return {
    user,
    session,
    hearts,
    submissions,
    calls,
    rows: (next) => {
      rows = next;
    },
    heartResponse: (next) => {
      heartResponse = next;
    },
    load: new Function(...Object.keys(bindings), `${code}\nreturn getSubmissions;`)(
      ...Object.values(bindings)
    ),
  };
}

test("all current solver captions use the conditional whole-heart rule in both languages", async () => {
  for (const language of ["de", "en-US"]) {
    const locale = JSON.parse(await read(`locales/${language}.json`));
    const rule = locale.Body.WrongAnswerCostsOneHeart;
    assert.match(rule, /1 (Herz|heart)/);
    assert.match(
      rule,
      language === "de"
        ? /falsche Lösung.*Richtige Lösungen sind kostenlos/
        : /incorrect solution.*Correct solutions are free/
    );
    assert.equal(locale.Body.BuyCodingChallnge, rule);
    assert(locale.Body.UnlimitedHeartsTooltip.startsWith(rule));
    assert.equal(locale.Body.AttemptCostsHalfHeart, undefined);
    assert.equal(locale.LearningRooms.HalfHeart, undefined);
  }
  for (const path of [
    "components/form/QuizAnswer.vue",
    "components/form/SolveMatching.vue",
    "components/challenges/CodeEditor.vue",
    "components/learning/ExerciseRoom.vue",
  ]) {
    const component = await read(path);
    assert(component.includes('t("Body.WrongAnswerCostsOneHeart")'), path);
    assert(
      !component.includes("InputBtnWithHeart"),
      "a minus sign must not imply an unconditional submission charge"
    );
  }
});

test("legacy coding refreshes after a final verdict and again after its delayed debit settles", async () => {
  const f = legacyFixture();
  f.rows([{ id: "attempt-a", result: null, hearts_pending: false }]);
  await f.load("task", "code");
  assert.equal(f.calls.filter((path) => path.startsWith("/shop/hearts/")).length, 0);
  f.rows([{ id: "attempt-a", result: { verdict: "WRONG_ANSWER" }, hearts_pending: true }]);
  f.heartResponse({ hearts: 6 });
  await f.load("task", "code");
  assert.equal(f.hearts.value.hearts, 6);
  f.rows([{ id: "attempt-a", result: { verdict: "WRONG_ANSWER" }, hearts_pending: false }]);
  f.heartResponse({ hearts: 4 });
  await f.load("task", "code");
  assert.equal(f.hearts.value.hearts, 4);
  await f.load("task", "code");
  assert.equal(f.calls.filter((path) => path.startsWith("/shop/hearts/")).length, 2);
});

test("a delayed legacy coding balance cannot update a different signed-in owner", async () => {
  const f = legacyFixture();
  let resolve;
  f.heartResponse(
    new Promise((yes) => {
      resolve = yes;
    })
  );
  f.rows([{ id: "attempt-a", result: { verdict: "WRONG_ANSWER" } }]);
  const loading = f.load("task", "code");
  await new Promise(setImmediate);
  f.user.value = { id: "owner-b" };
  f.session.value = { id: "session-b" };
  f.hearts.value = { hearts: 2 };
  f.submissions.value = [{ id: "b" }];
  resolve({ hearts: 4 });
  await loading;
  assert.equal(f.hearts.value.hearts, 2);
  assert.deepEqual(f.submissions.value, [{ id: "b" }]);
});

test("the r2 contractual original is byte-preserved while the current terms retain the released heart rule", async () => {
  const archive = await read("components/legal/TermsAndConditionsR2.vue");
  assert.equal(
    createHash("sha256").update(archive).digest("hex"),
    "6e959b7ccb304285f6abb1ac59389e2eadb1310998ea430daed77e3e18fb71a7"
  );
  assert(archive.includes("Fassung: 2026-09-r2"));
  const current = await read("pages/docs/terms-and-conditions.vue");
  assert(current.includes("Fassung: 2026-09-r4"));
  assert.match(current, /Nur bei einer falschen Lösung[\s\S]*Richtige\s+Lösungen sind kostenlos/);
  assert(!current.includes("unabhängig davon, ob die Lösung richtig ist"));
  assert((await read("composables/terms.ts")).includes('TERMS_VERSION = "2026-09-r4"'));
});
