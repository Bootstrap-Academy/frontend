import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import { createFetch } from "ofetch";
import { decodeApiError } from "../utils/apiError.ts";

const daily = {
  mode: "daily",
  enforced: true,
  limit: 3,
  used: 3,
  remaining: 0,
  unlimited: false,
  started: false,
  can_start: false,
  exempt: null,
  resets_at: "2026-10-05T00:00:00+02:00",
  timezone: "Europe/Berlin",
};
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
const load = async (file) =>
  import(
    `data:text/javascript;base64,${Buffer.from(
      compile(
        (await read(file)).replaceAll(
          '"./apiError"',
          JSON.stringify(new URL("../utils/apiError.ts", import.meta.url).href)
        )
      )
    ).toString("base64")}`
  );
const { dailyError } = await load("utils/dailyLearning.ts");
const { createLearningExercise, learningError } = await load("utils/learningExercise.ts");

test("all server envelopes preserve structured daily refusals without modifying the payload", () => {
  for (const body of [
    { code: "daily_limit_reached", daily },
    { error: "daily_limit_reached", daily },
    { detail: { code: "daily_limit_reached", daily } },
  ])
    for (const error of [
      body,
      { statusCode: 429, data: body },
      { response: { status: 429, _data: body } },
      { status: 429, _data: body },
    ]) {
      const before = structuredClone(error);
      assert.equal(decodeApiError(error).kind, "daily_limit");
      assert.equal(dailyError(error), daily);
      assert.deepEqual(error, before);
    }
  assert.equal(
    dailyError({ detail: { code: "daily_limit_reached", daily: { ...daily, remaining: -1 } } }),
    null
  );
});

test("HTTP failures and exact server codes keep session, conflict, throttle, hearts and daily access separate", () => {
  for (const [status, body, kind, ui] of [
    [401, {}, "session", "Session"],
    [409, {}, "conflict", "Conflict"],
    [429, {}, "throttle", "Wait"],
    [429, { error: "too_many_requests" }, "throttle", "Wait"],
    [403, { detail: { code: "not_enough_hearts" } }, "hearts", "NoHearts"],
    [403, { error: "permission_denied" }, "access", "NoAccess"],
    [429, { detail: { code: "daily_limit_reached", daily } }, "daily_limit", "DailyLimit"],
    [503, { error: "not_enough_hearts", daily }, "unavailable", "RequestError"],
    [503, { code: "daily_limit_reached", daily }, "unavailable", "RequestError"],
  ]) {
    const error = { response: { status, _data: body } };
    assert.equal(decodeApiError(error).kind, kind);
    assert.equal(learningError(error), ui);
  }
  assert.equal(dailyError({ statusCode: 429, data: { daily } }), null);
  for (const error of [
    undefined,
    null,
    new Error("offline"),
    "server crashed",
    { data: "HTML response" },
  ])
    assert.equal(decodeApiError(error).messageKey, "Error.TryAgainLater");
});

test("request throttles use only an explicit valid server delay", () => {
  for (const value of [undefined, "later", "10oops", -1, 0, 1.5, Infinity])
    assert.equal(
      decodeApiError({ statusCode: 429, data: { retry_after: value } }).retryAfter,
      null
    );
  assert.equal(
    decodeApiError({ response: { status: 429, headers: new Headers({ "retry-after": "12" }) } })
      .retryAfter,
    12
  );
  assert.equal(decodeApiError({ data: { retry_after: 20 } }).retryAfter, 20);
  assert.equal(
    decodeApiError({ statusCode: 429, data: { detail: "too many failed login attempts" } })
      .messageKey,
    "Error.TooManyFailedLoginAttempts"
  );
});

test("legacy translated messages survive another decode, and structured validation remains readable", async () => {
  assert.equal(
    decodeApiError({ detail: "Error.InvalidCredentials" }).messageKey,
    "Error.InvalidCredentials"
  );
  assert.equal(
    decodeApiError({ detail: "Error.AttackerChosenMessage" }).messageKey,
    "Error.TryAgainLater"
  );
  const code = compile(
    (await read("composables/response.ts")).replace(/^import .*;\n/gm, "").replace(/^export /gm, "")
  );
  const state = { value: {} };
  const { openSnackbar } = new Function(
    "useState",
    "decodeApiError",
    code + "\nreturn { openSnackbar };"
  )(() => state, decodeApiError);
  const detail = [{ loc: ["body", "email"], msg: "invalid email" }];
  const before = structuredClone(detail);
  openSnackbar("error", detail, "", true);
  assert.equal(state.value.heading, "Error.InvalidEmail");
  assert.deepEqual(detail, before);
});

const fetchSource = await read("composables/fetch.js");
const hookSource = fetchSource.slice(
  fetchSource.indexOf("const onResponseError ="),
  fetchSource.indexOf("function isAccessTokenExpired")
);
const onResponseError = new Function("decodeApiError", hookSource + "\nreturn onResponseError;")(
  decodeApiError
);
test("the real ofetch error hook preserves nested limits and committed-operation receipts", async () => {
  for (const body of [
    { detail: { code: "daily_limit_reached", daily } },
    { detail: { code: "EventBookingPaymentPending", receipt: "existing-operation" } },
  ]) {
    const fetch = createFetch({
      defaults: { onResponseError, retry: 0 },
      fetch: async () =>
        new Response(JSON.stringify(body), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
    });
    await assert.rejects(
      fetch("https://synthetic.invalid/attempt", { method: "POST" }),
      (error) => {
        assert.deepEqual(error.data, body);
        return true;
      }
    );
  }
});

async function attempt(
  file,
  name,
  post,
  reads = async () => [null, new Error("poll unavailable")]
) {
  const source = await read(`composables/${file}.ts`);
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const node = ast.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name);
  return new Function(
    "POST",
    "getSubmissions",
    compile(node.getText(ast).replace(/^export /, "")) + `\nreturn ${name};`
  )(post, reads);
}
test("legacy quiz, matching and coding refusals keep the full error and never repeat a mutation", async () => {
  for (const [file, name] of [
    ["quizzes", "attempQuiz"],
    ["matching", "solveMatching"],
    ["codingChallenges", "createSubmission"],
    ["codingChallenges", "testAgainstCodingExample"],
  ]) {
    for (const status of [401, 409, 429, 503]) {
      const failure = {
        response: {
          status,
          _data: { detail: { code: status === 429 ? "daily_limit_reached" : "refused", daily } },
        },
      };
      let posts = 0;
      const submit = await attempt(file, name, async () => {
        posts++;
        throw failure;
      });
      const draft = { code: "keep this code", answers: [true], answer: [0] };
      const original = structuredClone(draft);
      const [verdict, error] = await submit("task", "unit", draft);
      assert.equal(verdict, null);
      assert.equal(error, failure);
      assert.equal(posts, 1);
      assert.deepEqual(draft, original);
    }
  }
});
test("an incomplete quiz or matching response never becomes a wrong answer", async () => {
  for (const [file, name] of [
    ["quizzes", "attempQuiz"],
    ["matching", "solveMatching"],
  ]) {
    for (const result of [
      null,
      {},
      { error: "evaluator_failed" },
      { error: "evaluator_failed", solved: false },
      { solved: "false" },
    ]) {
      const submit = await attempt(file, name, async () => result);
      const [verdict, error] = await submit("task", "unit", {});
      assert.equal(verdict, null);
      assert.equal(decodeApiError(error).kind, "unavailable");
    }
    for (const solved of [true, false]) {
      const submit = await attempt(file, name, async () => ({ solved }));
      assert.deepEqual(await submit("task", "unit", {}), [solved, null]);
    }
  }
});
test("coding keeps an accepted submission when its follow-up read fails", async () => {
  const submission = { id: "submission-1" };
  let posts = 0;
  const submit = await attempt("codingChallenges", "createSubmission", async () => {
    posts++;
    return submission;
  });
  assert.deepEqual(await submit("task", "unit", {}), [submission, null]);
  assert.equal(posts, 1);
  const malformed = await attempt("codingChallenges", "createSubmission", async () => ({}));
  const [result, error] = await malformed("task", "unit", {});
  assert.equal(result, null);
  assert.equal(decodeApiError(error).kind, "unavailable");
});
test("a coding evaluator failure stays pending without another submission or an incorrect verdict", async () => {
  let view,
    posts = 0;
  const controller = createLearningExercise({
    request: async (path, method = "GET") => {
      if (method === "POST") {
        posts++;
        return { id: "submission-1" };
      }
      if (path.endsWith("/submissions"))
        return [{ id: "submission-1", result: { verdict: "EXECUTOR_UNAVAILABLE" } }];
      if (path.endsWith("/examples")) return [];
      if (path.includes("/shop/")) return { premium: true };
      if (path.endsWith("/environments")) return { python: {} };
      return { id: "unit", task_id: "task", enabled: true, creator: "teacher" };
    },
    persistSubmission: async () => true,
    changed: (next) => {
      view = next;
    },
  });
  await controller.load({ type: "coding", task_id: "task", subtask_id: "unit" }, "student");
  await controller.submit({ code: "keep this code", environment: "python" });
  assert.equal(view.phase, "pending");
  assert.equal(view.error, "RequestError");
  assert.equal(posts, 1);
  assert.equal(view.result, null);
  controller.dispose();
});
