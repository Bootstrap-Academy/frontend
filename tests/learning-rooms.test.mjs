import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const temporary = await mkdtemp(join(tmpdir(), "academy-learning-rooms-"));
after(() => rm(temporary, { recursive: true, force: true }));
async function module(name) {
  const source = await readFile(new URL(`../utils/${name}.ts`, import.meta.url), "utf8");
  const target = join(temporary, `${name}.mjs`);
  await writeFile(
    target,
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    }).outputText
  );
  return import(pathToFileURL(target));
}
const { createLearningRooms } = await module("learningRooms");
const { createLearningExercise } = await module("learningExercise");
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const room = (revision = 0, state = {}, status = "new", kind = "loop-explorer") => ({
  unit: {
    id: "loops-intro",
    path_id: "python-loops",
    room: kind,
    title: { de: "Schleifen", en: "Loops" },
    content: {},
    requires: [],
    teaches: [],
    practices: [],
  },
  progress: { revision, state, status, result: null },
});
const selection = (next = room()) => ({
  paths: [{ id: "python-loops", title: { de: "Python", en: "Python" } }],
  path: { id: "python-loops", title: { de: "Python", en: "Python" } },
  next,
});
function fixture(handler, options = {}) {
  let view;
  let sequence = 0;
  const calls = [];
  const controller = createLearningRooms({
    id: () => `request-${++sequence}`,
    checkpoint: options.checkpoint,
    request: async (path, method = "GET", body) => {
      calls.push({ path, method, body: body && structuredClone(body) });
      if (handler) return handler(path, method, body);
      if (path.endsWith("capabilities")) return { enabled: true };
      return selection();
    },
    changed: (next) => {
      view = next;
    },
  });
  return {
    controller,
    calls,
    get view() {
      return view;
    },
  };
}

test("both capability gates are required and loading a saved room creates no writes", async () => {
  const off = fixture();
  await off.controller.start(false);
  assert.equal(off.view.status, "disabled");
  assert.equal(off.calls.length, 0);
  const unsupported = fixture(() => ({ enabled: false }));
  await unsupported.controller.start(true);
  assert.equal(unsupported.view.status, "disabled");
  assert.equal(unsupported.calls.length, 1);
  const f = fixture((path) =>
    path.endsWith("capabilities")
      ? { enabled: true }
      : selection(room(3, { repetitions: 4 }, "in_progress"))
  );
  await f.controller.start(true);
  assert.equal(f.view.status, "ready");
  assert.deepEqual(f.view.draft, { repetitions: 4 });
  assert.ok(f.calls.every(({ method }) => method === "GET"));
});

test("an unavailable capability service stays retryable while 404 disables the new route", async () => {
  const failed = fixture(() => {
    throw { statusCode: 503 };
  });
  await failed.controller.start(true);
  assert.equal(failed.view.status, "error");
  const absent = fixture(() => {
    throw { statusCode: 404 };
  });
  await absent.controller.start(true);
  assert.equal(absent.view.status, "disabled");
});

test("empty selection keeps the server's reason and never invents path completion", async () => {
  for (const reason of [undefined, "unavailable", "prerequisites", "completed"]) {
    const f = fixture((path) =>
      path.endsWith("capabilities")
        ? { enabled: true }
        : { ...selection(null), empty_reason: reason }
    );
    await f.controller.start(true);
    assert.equal(f.view.room, null);
    assert.equal(f.view.emptyReason, reason || "unavailable");
  }
});

test("neutral exercise jump saves work and requests the next candidate without marking a result", async () => {
  const f = fixture((path, method, body) => {
    if (method === "PUT") return room(1, body.state, "in_progress", "exercise");
    return path.endsWith("capabilities")
      ? { enabled: true }
      : selection(room(0, {}, "new", "exercise"));
  });
  await f.controller.start(true);
  f.controller.edit({ code: "unfinished" });
  await f.controller.next("python-loops", "loops-intro");
  assert.equal(f.calls.filter(({ method }) => method === "PUT").length, 1);
  assert.equal(f.calls.filter(({ method }) => method === "POST").length, 0);
  assert.equal(
    f.calls.at(-1).path,
    "/skills/rooms?continuous=true&path=python-loops&after=loops-intro"
  );
});

test("edits made during save remain local and use the returned revision for the next write", async () => {
  const waiting = deferred();
  let writes = 0;
  const f = fixture((path, method, body) => {
    if (method === "PUT")
      return ++writes === 1
        ? waiting.promise
        : room(body.expected_revision + 1, body.state, "in_progress");
    return path.endsWith("capabilities") ? { enabled: true } : selection();
  });
  await f.controller.start(true);
  f.controller.edit({ code: "first" });
  const saved = f.controller.save();
  f.controller.edit({ code: "second" });
  waiting.resolve(room(1, { code: "first" }, "in_progress"));
  assert.equal(await saved, true);
  assert.deepEqual(f.view.draft, { code: "second" });
  assert.equal(f.view.room.progress.revision, 2);
  assert.equal(f.view.dirty, false);
  assert.deepEqual(
    f.calls.filter(({ method }) => method === "PUT").map(({ body }) => body.expected_revision),
    [0, 1]
  );
});

test("unclear save retries reuse the exact id and payload before later edits", async () => {
  let writes = 0;
  const f = fixture((path, method, body) => {
    if (method === "PUT") {
      if (++writes === 1) throw new Error("lost response after commit");
      return room(body.expected_revision + 1, body.state, "in_progress");
    }
    return path.endsWith("capabilities") ? { enabled: true } : selection();
  });
  await f.controller.start(true);
  f.controller.edit({ repetitions: 3 });
  assert.equal(await f.controller.save(), false);
  f.controller.edit({ repetitions: 4 });
  assert.equal(await f.controller.save(), true);
  const writesMade = f.calls.filter(({ method }) => method === "PUT");
  assert.deepEqual(writesMade[0].body, writesMade[1].body);
  assert.notEqual(writesMade[1].body.request_id, writesMade[2].body.request_id);
  assert.equal(writesMade[2].body.expected_revision, 1);
  assert.equal(f.view.draft.repetitions, 4);
});

test("revision conflict preserves local draft until an explicit reconciliation", async () => {
  let conflicted = false;
  const f = fixture((path, method, body) => {
    if (method === "PUT") {
      if (!conflicted) {
        conflicted = true;
        throw { statusCode: 409 };
      }
      return room(body.expected_revision + 1, body.state, "in_progress");
    }
    if (path === "/skills/rooms/loops-intro") return room(5, { repetitions: 2 }, "in_progress");
    return path.endsWith("capabilities") ? { enabled: true } : selection();
  });
  await f.controller.start(true);
  f.controller.edit({ repetitions: 7 });
  assert.equal(await f.controller.save(), false);
  assert.equal(f.view.conflict, true);
  assert.equal(f.view.draft.repetitions, 7);
  assert.equal(await f.controller.next("everyday-math"), false);
  await f.controller.resolveConflict(true);
  assert.equal(f.view.conflict, false);
  assert.equal(f.view.draft.repetitions, 7);
  assert.equal(f.view.room.progress.revision, 6);
});

test("ABA session reset discards delayed data and prevents completion following an old save", async () => {
  const waiting = deferred();
  const f = fixture((path, method) => {
    if (method === "PUT") return waiting.promise;
    return path.endsWith("capabilities") ? { enabled: true } : selection();
  });
  await f.controller.start(true);
  f.controller.edit({ prediction: "4" });
  const completed = f.controller.complete("complete", { prediction: 4 });
  f.controller.reset();
  await f.controller.start(true);
  waiting.resolve(room(1, { prediction: "4" }, "in_progress"));
  assert.equal(await completed, false);
  assert.deepEqual(f.view.draft, {});
  assert.equal(f.calls.filter(({ method }) => method === "POST").length, 0);
});

test("completion retries are idempotent and do not change the answer after a lost response", async () => {
  let posts = 0;
  const f = fixture((path, method) => {
    if (method === "POST") {
      if (++posts === 1) throw { statusCode: 503 };
      return {
        ...room(1, {}, "completed"),
        progress: { ...room(1).progress, status: "completed", result: { kind: "introduced" } },
      };
    }
    return path.endsWith("capabilities") ? { enabled: true } : selection();
  });
  await f.controller.start(true);
  assert.equal(await f.controller.complete("complete", { prediction: 4 }), false);
  assert.equal(f.view.completionPending, true);
  f.controller.edit({ prediction: 10 });
  assert.deepEqual(f.view.draft, {});
  assert.equal(await f.controller.complete("skip"), true);
  const mutations = f.calls.filter(({ method }) => method === "POST");
  assert.deepEqual(mutations[0].body, mutations[1].body);
  assert.equal(f.view.room.progress.result.kind, "introduced");
});

test("incorrect introduction can be edited and exercise units cannot be skipped", async () => {
  const f = fixture((path, method) => {
    if (method === "POST") throw { statusCode: 422 };
    return path.endsWith("capabilities") ? { enabled: true } : selection();
  });
  await f.controller.start(true);
  await f.controller.complete("complete", { prediction: 0 });
  assert.equal(f.view.completionPending, false);
  f.controller.edit({ prediction: "4" });
  assert.equal(f.view.draft.prediction, "4");
  const exercise = fixture((path) =>
    path.endsWith("capabilities") ? { enabled: true } : selection(room(0, {}, "new", "exercise"))
  );
  await exercise.controller.start(true);
  assert.equal(await exercise.controller.complete("skip"), false);
  assert.ok(exercise.calls.every(({ method }) => method === "GET"));
});

const reference = { task_id: "task-a", subtask_id: "code-a", type: "coding" };
function exerciseFixture(handler, options = {}) {
  let view;
  const calls = [];
  const controller = createLearningExercise({
    maxPolls: 3,
    wait: async () => {},
    persistSubmission: options.persistSubmission || (async () => true),
    heartsChanged: options.heartsChanged,
    changed: (next) => {
      view = next;
    },
    request: async (path, method = "GET", body) => {
      calls.push({ path, method, body });
      if (path.startsWith("/shop/hearts/"))
        return options.heartsRequest?.(path, method, body) ?? { hearts: 6 };
      if (path.startsWith("/shop/")) return { premium: false };
      if (path.endsWith("/environments")) return { python: {} };
      if (path.endsWith("/examples")) return [];
      if (
        !path.endsWith("/submissions") &&
        !path.endsWith("/attempts") &&
        !path.includes("/attempts/")
      )
        return {
          id: "code-a",
          task_id: "task-a",
          creator: "author",
          enabled: true,
          retired: false,
          solved: options.solved?.() || false,
        };
      return handler(path, method, body);
    },
  });
  return {
    controller,
    calls,
    get view() {
      return view;
    },
  };
}

test("coding polling is bounded and checks only the ID returned by the single submission", async () => {
  let complete = false;
  const f = exerciseFixture((path, method) =>
    method === "POST"
      ? { id: "mine" }
      : [
          { id: "unrelated", result: { verdict: "OK" } },
          { id: "mine", result: complete ? { verdict: "OK" } : null },
        ]
  );
  await f.controller.load(reference, "learner");
  const first = f.controller.submit({ code: "print(1)", environment: "python" });
  await f.controller.submit({ code: "print(1)", environment: "python" });
  await first;
  assert.equal(f.view.phase, "pending");
  assert.equal(f.view.error, "StillRunning");
  assert.equal(f.calls.filter(({ method }) => method === "POST").length, 1);
  assert.equal(
    f.calls.filter(({ path, method }) => path.endsWith("/submissions") && method === "GET").length,
    3
  );
  complete = true;
  await f.controller.check();
  assert.equal(f.view.phase, "correct");
  assert.equal(f.calls.filter(({ method }) => method === "POST").length, 1);
});

test("lost challenge response neither polls nor resubmits a possibly paid attempt", async () => {
  const f = exerciseFixture(() => {
    throw new Error("network lost");
  });
  await f.controller.load(reference, "learner");
  await f.controller.submit({ code: "print(1)", environment: "python" });
  assert.equal(f.view.phase, "uncertain");
  await f.controller.submit({ code: "print(1)", environment: "python" });
  assert.equal(f.calls.filter(({ method }) => method === "POST").length, 1);
  assert.equal(
    f.calls.filter(({ path, method }) => path.endsWith("/submissions") && method === "GET").length,
    0
  );
});

test("a replaced session cannot receive or start polling a previous submission", async () => {
  const waiting = deferred();
  const f = exerciseFixture(() => waiting.promise);
  await f.controller.load(reference, "learner");
  const submitted = f.controller.submit({ code: "print(1)", environment: "python" });
  await new Promise(setImmediate);
  f.controller.reset();
  waiting.resolve({ id: "old-session" });
  await submitted;
  assert.equal(f.view.phase, "idle");
  assert.equal(f.view.submissionId, null);
  assert.equal(
    f.calls.filter(({ path, method }) => path.endsWith("/submissions") && method === "GET").length,
    0
  );
});

test("MC uses the existing boolean answer contract and keeps backend correctness authoritative", async () => {
  const f = exerciseFixture((path, method, body) => {
    assert.ok(path.endsWith("/multiple_choice/code-a/attempts"));
    assert.deepEqual(body, { answers: [true, false] });
    return { solved: false };
  });
  await f.controller.load({ ...reference, type: "multiple_choice" }, "learner");
  await f.controller.submit({ answers: [true, false] });
  assert.equal(f.view.phase, "incorrect");
  assert.equal(f.view.result, null);
});

test("quiz and matching refresh server hearts after incorrect and correct attempts", async () => {
  for (const [type, body] of [
    ["multiple_choice", { answers: [true, false] }],
    ["matching", { answer: [1, 0] }],
  ]) {
    let solved = false;
    const updates = [];
    const f = exerciseFixture(() => ({ solved }), {
      heartsChanged: (info) => updates.push(info),
      heartsRequest: (path, method) => {
        assert.equal(path, "/shop/hearts/learner");
        assert.equal(method, "GET");
        return { hearts: 4, next_heart: 1234 };
      },
    });
    await f.controller.load({ ...reference, type }, "learner");
    assert.deepEqual(updates, []);
    for (const correct of [false, true]) {
      solved = correct;
      await f.controller.submit(body);
      await new Promise(setImmediate);
      assert.equal(f.view.phase, correct ? "correct" : "incorrect", type);
    }
    assert.deepEqual(updates, [
      { hearts: 4, next_heart: 1234 },
      { hearts: 4, next_heart: 1234 },
    ]);
    assert.deepEqual(
      f.calls
        .filter(({ path, method }) => method === "POST" || path.startsWith("/shop/hearts/"))
        .map(({ method }) => method),
      ["POST", "GET", "POST", "GET"]
    );
  }
});

test("coding saves its submission before awaiting hearts and ignores another attempt until polling", async () => {
  const hearts = deferred();
  const verdict = deferred();
  const updates = [];
  const saved = [];
  const f = exerciseFixture(
    (path, method) => (method === "POST" ? { id: "mine" } : verdict.promise),
    {
      heartsChanged: (info) => updates.push(info),
      heartsRequest: () => hearts.promise,
      persistSubmission: async (unknown, id) => {
        saved.push({ unknown, id });
        return true;
      },
    }
  );
  await f.controller.load(reference, "learner");
  let settled = false;
  const submitted = f.controller.submit({ code: "print(1)", environment: "python" }).then(() => {
    settled = true;
  });
  await new Promise(setImmediate);
  assert.deepEqual(saved, [
    { unknown: true, id: undefined },
    { unknown: false, id: "mine" },
  ]);
  assert.equal(f.view.submissionId, "mine");
  assert.equal(f.view.posting, true);
  assert.notEqual(f.view.phase, "pending");
  assert.equal(settled, false);
  assert.deepEqual(updates, []);
  await f.controller.submit({ code: "print(2)", environment: "python" });
  assert.deepEqual(
    f.calls.slice(-2).map(({ path, method }) => [path, method]),
    [
      ["/challenges/tasks/task-a/coding_challenges/code-a/submissions", "POST"],
      ["/shop/hearts/learner", "GET"],
    ]
  );
  hearts.resolve({ hearts: 4 });
  await new Promise(setImmediate);
  assert.deepEqual(updates, [{ hearts: 4 }]);
  assert.equal(f.view.phase, "pending");
  assert.equal(f.view.posting, false);
  assert.equal(settled, false);
  assert.equal(
    f.calls.at(-1).path,
    "/challenges/tasks/task-a/coding_challenges/code-a/submissions"
  );
  assert.equal(f.calls.at(-1).method, "GET");
  verdict.resolve([{ id: "mine", result: { verdict: "OK" } }]);
  await submitted;
  assert.equal(f.view.phase, "correct");
  assert.equal(f.calls.filter(({ method }) => method === "POST").length, 1);
  assert.equal(f.calls.filter(({ path }) => path.startsWith("/shop/hearts/")).length, 2);
});

test("heart refresh errors stay separate from confirmed and uncertain submission outcomes", async () => {
  for (const outcome of ["confirmed", "lost-response", "save-failed"]) {
    const updates = [];
    const markers = [];
    const f = exerciseFixture(
      () => {
        if (outcome === "lost-response") throw new Error("lost POST response");
        return { solved: true };
      },
      {
        heartsChanged: (info) => updates.push(info),
        heartsRequest: () => {
          if (outcome === "confirmed") throw { statusCode: 503 };
          return { hearts: 5 };
        },
        persistSubmission: async (unknown) => {
          markers.push(unknown);
          return outcome !== "save-failed";
        },
      }
    );
    await f.controller.load({ ...reference, type: "multiple_choice" }, "learner");
    await f.controller.submit({ answers: [true] });
    await new Promise(setImmediate);
    assert.equal(f.view.phase, outcome === "confirmed" ? "correct" : "uncertain", outcome);
    assert.equal(
      f.view.error,
      outcome === "confirmed" ? "" : outcome === "save-failed" ? "SaveError" : "Uncertain"
    );
    assert.deepEqual(markers, outcome === "confirmed" ? [true, false] : [true]);
    assert.deepEqual(updates, outcome === "lost-response" ? [{ hearts: 5 }] : []);
    await f.controller.submit({ answers: [true] });
    assert.equal(
      f.calls.filter(({ method }) => method === "POST").length,
      outcome === "save-failed" ? 0 : 1
    );
    assert.equal(
      f.calls.filter(({ path }) => path.startsWith("/shop/hearts/")).length,
      outcome === "save-failed" ? 0 : 1
    );
  }
});

test("late heart responses are discarded after dispose or loading another session", async () => {
  for (const change of ["dispose", "load"]) {
    const hearts = deferred();
    const updates = [];
    const f = exerciseFixture(() => ({ solved: false }), {
      heartsChanged: (info) => updates.push(info),
      heartsRequest: () => hearts.promise,
    });
    const quiz = { ...reference, type: "multiple_choice" };
    await f.controller.load(quiz, "learner");
    const submitted = f.controller.submit({ answers: [true] });
    await new Promise(setImmediate);
    assert.equal(f.calls.filter(({ path }) => path === "/shop/hearts/learner").length, 1);
    if (change === "dispose") {
      f.controller.dispose();
    } else {
      await f.controller.load(quiz, "another-learner");
      await f.controller.load(quiz, "learner");
    }
    hearts.resolve({ hearts: 5 });
    await submitted;
    assert.deepEqual(updates, [], change);
  }
});

test("overlapping heart refreshes across loads preserve the newer attempt's balance", async () => {
  const responses = [deferred(), deferred()];
  const updates = [];
  let requests = 0;
  const f = exerciseFixture(() => ({ solved: false }), {
    heartsChanged: (info) => updates.push(info),
    heartsRequest: () => responses[requests++].promise,
  });
  const matching = { ...reference, type: "matching" };
  await f.controller.load(matching, "learner");
  const first = f.controller.submit({ answer: [1, 0] });
  await new Promise(setImmediate);
  await f.controller.load(matching, "learner");
  const second = f.controller.submit({ answer: [0, 1] });
  await new Promise(setImmediate);
  assert.equal(requests, 2);
  assert.equal(f.calls.filter(({ method }) => method === "POST").length, 2);
  responses[1].resolve({ hearts: 4 });
  await second;
  assert.deepEqual(updates, [{ hearts: 4 }]);
  responses[0].resolve({ hearts: 5 });
  await first;
  assert.deepEqual(updates, [{ hearts: 4 }]);
});

test("an unknown submission survives reload and requires an explicit new attempt", async () => {
  let saved = {};
  const persistSubmission = async (unknown, id) => {
    saved = {
      ...(unknown ? { submission_unknown: true } : {}),
      ...(id ? { submission_id: id } : {}),
    };
    return true;
  };
  const first = exerciseFixture(
    () => {
      assert.equal(saved.submission_unknown, true);
      throw new Error("lost response");
    },
    { persistSubmission }
  );
  await first.controller.load(reference, "learner");
  await first.controller.submit({ code: "print(1)", environment: "python" });
  assert.equal(first.view.phase, "uncertain");
  assert.equal(first.view.posting, false);
  assert.equal(saved.submission_unknown, true);
  first.controller.dispose();
  const resumed = exerciseFixture(
    () => {
      throw new Error("No mutation expected");
    },
    { persistSubmission }
  );
  await resumed.controller.load(reference, "learner", "older-id", saved.submission_unknown);
  assert.equal(resumed.view.phase, "uncertain");
  await resumed.controller.submit({ code: "print(1)", environment: "python" });
  await resumed.controller.check();
  assert.equal(resumed.view.phase, "uncertain");
  assert.equal(saved.submission_unknown, true);
  assert.equal(resumed.calls.filter(({ method }) => method === "POST").length, 0);
  assert.equal(resumed.calls.filter(({ path }) => path.endsWith("/submissions")).length, 0);
  await resumed.controller.newAttempt();
  assert.equal(resumed.view.phase, "ready");
  assert.deepEqual(saved, {});
  assert.equal(resumed.calls.filter(({ method }) => method === "POST").length, 0);
});

test("checking an unknown attempt accepts only backend confirmation and never resends", async () => {
  let solved = false;
  let saved = { submission_unknown: true };
  const f = exerciseFixture(
    () => {
      throw new Error("No submission expected");
    },
    {
      solved: () => solved,
      persistSubmission: async (unknown) => {
        saved = unknown ? { submission_unknown: true } : {};
        return true;
      },
    }
  );
  await f.controller.load(reference, "learner", undefined, true);
  solved = true;
  await f.controller.check();
  assert.equal(f.view.phase, "correct");
  assert.deepEqual(saved, {});
  assert.ok(f.calls.every(({ method }) => method === "GET"));
});

test("only the actual POST blocks navigation and its returned ID is persisted before polling", async () => {
  const marked = deferred();
  const posted = deferred();
  const confirmed = deferred();
  let saved;
  const f = exerciseFixture(
    (path, method) =>
      method === "POST" ? posted.promise : [{ id: "mine", result: { verdict: "OK" } }],
    {
      persistSubmission: async (unknown, id) => {
        if (unknown) {
          await marked.promise;
          saved = { submission_unknown: true };
        } else {
          await confirmed.promise;
          saved = { submission_id: id };
        }
        return true;
      },
    }
  );
  await f.controller.load(reference, "learner");
  const submission = f.controller.submit({ code: "print(1)", environment: "python" });
  assert.equal(f.view.posting, false);
  assert.equal(f.calls.filter(({ method }) => method === "POST").length, 0);
  marked.resolve();
  await new Promise(setImmediate);
  assert.equal(f.view.posting, true);
  assert.equal(saved.submission_unknown, true);
  posted.resolve({ id: "mine" });
  await new Promise(setImmediate);
  assert.equal(f.view.posting, false);
  assert.equal(
    f.calls.filter(({ path, method }) => path.endsWith("/submissions") && method === "GET").length,
    0
  );
  confirmed.resolve();
  await submission;
  assert.deepEqual(saved, { submission_id: "mine" });
  assert.equal(f.view.phase, "correct");
});

test("navigation can cancel preparation without dispatching a late paid attempt", async () => {
  const save = deferred();
  const f = exerciseFixture(
    () => {
      throw new Error("Must not dispatch");
    },
    { persistSubmission: async () => save.promise }
  );
  await f.controller.load(reference, "learner");
  const submission = f.controller.submit({ code: "print(1)", environment: "python" });
  f.controller.cancelPreparation();
  save.resolve(true);
  await submission;
  assert.equal(f.view.phase, "ready");
  assert.equal(f.view.posting, false);
  assert.equal(f.calls.filter(({ method }) => method === "POST").length, 0);
});

test("continuous selection crosses paths and a new review checkpoints before its explicit POST", async () => {
  const finished = {
    ...room(8, { old: "answer" }, "completed", "exercise"),
    review_available: true,
  };
  const started = {
    ...room(9, {}, "in_progress", "exercise"),
    progress: { ...room(9).progress, review_id: "review-a" },
  };
  const events = [];
  const f = fixture(
    (path, method, body) => {
      if (path.endsWith("capabilities")) return { enabled: true };
      if (method === "POST") {
        events.push("post");
        assert.equal(path, "/skills/rooms/loops-intro/review");
        assert.deepEqual(body, { request_id: "request-1", expected_revision: 8 });
        return started;
      }
      assert.equal(new URL(path, "https://fixture.invalid").searchParams.get("continuous"), "true");
      return { ...selection(finished), path: { id: "other-path", title: { de: "Anderes Thema" } } };
    },
    {
      checkpoint: () => {
        events.push("checkpoint");
        return true;
      },
    }
  );
  await f.controller.start(true, "python-loops");
  assert.equal(f.view.path.id, "other-path");
  assert.equal(f.view.room.progress.review_id, "review-a");
  assert.deepEqual(f.view.draft, {});
  assert.deepEqual(events, ["checkpoint", "post", "checkpoint"]);
  assert.equal(f.controller.recovery(), null);
});

test("a lost review-start response survives reload and retries the exact request before another review", async () => {
  const candidate = { ...room(4, {}, "completed"), review_available: true };
  const active = { ...room(5), progress: { ...room(5).progress, review_id: "review-a" } };
  const writes = [];
  let first = true;
  const handler = (path, method, body) => {
    if (path.endsWith("capabilities")) return { enabled: true };
    if (method === "POST") {
      writes.push(structuredClone(body));
      if (first) {
        first = false;
        throw new Error("response lost after commit");
      }
      return active;
    }
    if (path === "/skills/rooms/loops-intro") return active;
    return selection(candidate);
  };
  const old = fixture(handler);
  await old.controller.start(true);
  assert.equal(old.view.reviewPending, true);
  const recovery = old.controller.recovery();
  old.controller.dispose();
  const restored = fixture(handler);
  await restored.controller.start(true, undefined, true);
  assert.equal(writes.length, 1, "the preliminary GET must not start another review");
  assert.equal(await restored.controller.restore(recovery), true);
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1], writes[0]);
  assert.equal(restored.view.room.progress.review_id, "review-a");
  assert.equal(restored.view.reviewPending, false);
});

test("unavailable recovery storage prevents review dispatch and account reset discards a late review", async () => {
  const candidate = { ...room(2, {}, "completed"), review_available: true };
  const blocked = fixture(
    (path) => (path.endsWith("capabilities") ? { enabled: true } : selection(candidate)),
    { checkpoint: () => false }
  );
  await blocked.controller.start(true);
  assert.equal(blocked.view.reviewPending, true);
  assert.equal(blocked.calls.filter((call) => call.method === "POST").length, 0);
  const pending = deferred();
  const old = fixture((path, method) =>
    method === "POST"
      ? pending.promise
      : path.endsWith("capabilities")
        ? { enabled: true }
        : selection(candidate)
  );
  const loading = old.controller.start(true);
  await new Promise(setImmediate);
  old.controller.reset();
  pending.resolve({ ...room(3), progress: { ...room(3).progress, review_id: "old-review" } });
  await loading;
  assert.equal(old.view.status, "idle");
  assert.equal(old.view.room, null);
});

test("review saves and completion bind the current review and exact current attempt", async () => {
  const active = (revision) => ({
    ...room(revision, {}, "in_progress", "exercise"),
    progress: { ...room(revision).progress, review_id: "review-a" },
  });
  const f = fixture((path, method, body) => {
    if (path.endsWith("capabilities")) return { enabled: true };
    if (method === "PUT") {
      assert.equal(body.review_id, "review-a");
      return active(2);
    }
    if (method === "POST") {
      assert.equal(body.review_id, "review-a");
      assert.equal(body.attempt_id, "attempt-new");
      assert.equal(body.expected_revision, 2);
      assert.equal(body.answer, undefined);
      return {
        ...active(3),
        progress: { ...active(3).progress, status: "completed", result: { kind: "solved" } },
      };
    }
    return selection(active(1));
  });
  await f.controller.start(true);
  f.controller.edit({ answers: [true], attempt_id: "attempt-new" });
  assert.equal(await f.controller.complete("complete", undefined, "attempt-new"), true);
  assert.equal(f.view.room.progress.status, "completed");
});

test("review ignores historical solved, saves the new attempt ID and resumes only its own proof", async () => {
  const saved = [];
  const f = exerciseFixture(
    (path, method) => {
      if (method === "POST")
        return { solved: true, attempt_id: "new-attempt", hearts_pending: false };
      assert.ok(path.endsWith("/attempts/new-attempt"));
      return {
        id: "new-attempt",
        task_id: "task-a",
        subtask_id: "code-a",
        solved: true,
        hearts_pending: false,
      };
    },
    {
      solved: () => true,
      persistSubmission: async (...args) => {
        saved.push(args);
        return true;
      },
    }
  );
  const ref = { ...reference, type: "multiple_choice" };
  await f.controller.load(ref, "learner", undefined, false, "review-a");
  assert.equal(f.view.phase, "ready");
  await f.controller.submit({ answers: [true] });
  assert.equal(f.view.phase, "correct");
  assert.deepEqual(saved.at(-1), [false, undefined, "new-attempt"]);
  await f.controller.load(ref, "learner", undefined, false, "review-a", "new-attempt");
  assert.equal(f.view.phase, "correct");
  assert.equal(f.calls.filter((c) => c.method === "POST").length, 1);
  await f.controller.load(ref, "learner", undefined, true, "review-a");
  await f.controller.check();
  assert.equal(f.view.phase, "uncertain");
  assert.equal(f.calls.filter((c) => c.method === "POST").length, 1);
});

test("pending heart settlement polls only the accepted attempt and refreshes after settlement", async () => {
  for (const type of ["multiple_choice", "coding"]) {
    let polls = 0;
    const updates = [];
    const f = exerciseFixture(
      (path, method) => {
        if (method === "POST")
          return type === "coding"
            ? { id: "mine" }
            : { solved: false, attempt_id: "mine", hearts_pending: true };
        polls++;
        const pending = polls < 2;
        return type === "coding"
          ? [{ id: "mine", result: { verdict: "WRONG_ANSWER" }, hearts_pending: pending }]
          : {
              id: "mine",
              task_id: "task-a",
              subtask_id: "code-a",
              solved: false,
              hearts_pending: pending,
            };
      },
      {
        heartsChanged: (info) => updates.push(info),
        heartsRequest: () => ({ hearts: polls >= 2 ? 4 : 6 }),
      }
    );
    await f.controller.load({ ...reference, type }, "learner");
    await f.controller.submit(type === "coding" ? { code: "wrong" } : { answers: [false] });
    assert.equal(f.view.phase, "incorrect");
    assert.equal(polls, 2);
    assert.deepEqual(updates, [{ hearts: 6 }, { hearts: 4 }]);
    assert.equal(f.calls.filter((c) => c.method === "POST").length, 1);
  }
});

test("an unsettled final result stays bounded and is checked without another submission", async () => {
  const f = exerciseFixture((path, method) =>
    method === "POST"
      ? { id: "mine" }
      : [{ id: "mine", result: { verdict: "WRONG_ANSWER" }, hearts_pending: true }]
  );
  await f.controller.load(reference, "learner");
  await f.controller.submit({ code: "wrong" });
  assert.equal(f.view.phase, "pending");
  assert.equal(f.view.error, "HeartsPending");
  assert.equal(f.view.result.verdict, "WRONG_ANSWER");
  await f.controller.check();
  assert.equal(
    f.calls.filter((c) => c.method === "GET" && c.path.endsWith("/submissions")).length,
    6
  );
  assert.equal(f.calls.filter((c) => c.method === "POST").length, 1);
});
