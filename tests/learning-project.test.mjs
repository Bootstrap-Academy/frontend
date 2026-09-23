import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const load = async (file) =>
  await import(
    `data:text/javascript;base64,${Buffer.from(
      ts.transpileModule(await readFile(new URL(file, import.meta.url), "utf8"), {
        compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
      }).outputText
    ).toString("base64")}`
  );
const { createLearningProject, PROJECT_STATE_LIMIT } = await load("../utils/learningProject.ts");
const { createLearningTransport } = await load("../utils/learningTransport.ts");

const envelope = (revision, state) => ({
  course_id: "llm-course",
  revision,
  state,
  updated_at: revision ? "2026-09-24T08:00:00Z" : null,
});

function fixture(respond) {
  const calls = [];
  let ids = 0;
  const project = createLearningProject({
    courseId: "llm-course",
    id: () => `save-${++ids}`,
    request: async (path, method = "GET", body) => {
      calls.push({ path, method, body: body && structuredClone(body) });
      return await respond({ path, method, body }, calls.length);
    },
  });
  return { project, calls };
}
const rejection = async (promise) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  assert.fail("expected a rejection");
};

test("get returns a copy of revision and state; a new learner starts at revision 0", async () => {
  const f = fixture(() => envelope(0, {}));
  assert.deepEqual(await f.project.get(), { revision: 0, state: {} });
  assert.deepEqual(f.calls, [
    { path: "/skills/courses/llm-course/project", method: "GET", body: undefined },
  ]);
  const g = fixture(() => envelope(3, { bot: { name: "Klingel" } }));
  const first = await g.project.get();
  first.state.bot.name = "changed by the module";
  assert.deepEqual(await g.project.get(), { revision: 3, state: { bot: { name: "Klingel" } } });
});

test("a failed or foreign read rejects as offline", async () => {
  for (const respond of [
    () => Promise.reject({ statusCode: 503 }),
    () => Promise.reject(new TypeError("fetch failed")),
    () => ({ ...envelope(1, {}), course_id: "other-course" }),
    () => envelope(1, []),
  ])
    assert.deepEqual(await rejection(fixture(respond).project.get()), { code: "offline" });
});

test("save sends the contract body and resolves to the new revision", async () => {
  const f = fixture((call) => envelope(call.body.expected_revision + 1, call.body.state));
  const saved = await f.project.save({ bot: { name: "Klingel" } }, 2);
  assert.deepEqual(saved, { revision: 3, state: { bot: { name: "Klingel" } } });
  assert.deepEqual(f.calls, [
    {
      path: "/skills/courses/llm-course/project",
      method: "PUT",
      body: { request_id: "save-1", expected_revision: 2, state: { bot: { name: "Klingel" } } },
    },
  ]);
  await f.project.save({}, 3);
  assert.equal(f.calls[1].body.request_id, "save-2", "each save has its own request id");
});

test("conflicts, oversized states and outages reject with their contract codes", async () => {
  assert.deepEqual(
    await rejection(fixture(() => Promise.reject({ statusCode: 409 })).project.save({}, 0)),
    { code: "conflict" }
  );
  assert.deepEqual(
    await rejection(fixture(() => Promise.reject({ statusCode: 413 })).project.save({}, 0)),
    { code: "too_large" }
  );
  const refused = fixture(() => Promise.reject({ statusCode: 503 }));
  assert.deepEqual(await rejection(refused.project.save({}, 0)), { code: "offline" });
  assert.equal(refused.calls.length, 1, "a refusal is not repeated");
  const big = fixture(() => assert.fail("no request for an oversized state"));
  const state = { text: "ü".repeat(PROJECT_STATE_LIMIT / 2) };
  assert.deepEqual(await rejection(big.project.save(state, 0)), { code: "too_large" });
  await assert.rejects(big.project.save([], 0), TypeError);
  await assert.rejects(big.project.save({}, -1), TypeError);
  assert.equal(big.calls.length, 0);
});

test("a lost response is replayed once with the identical request id and body", async () => {
  const f = fixture((call, n) => {
    if (n === 1) throw new TypeError("fetch failed");
    return envelope(5, call.body.state);
  });
  assert.deepEqual(await f.project.save({ step: 2 }, 4), { revision: 5, state: { step: 2 } });
  assert.deepEqual(f.calls[0], f.calls[1]);
  const g = fixture(() => {
    throw new TypeError("fetch failed");
  });
  assert.deepEqual(await rejection(g.project.save({ step: 2 }, 4)), { code: "offline" });
  assert.equal(g.calls.length, 2);
});

const token = (expires) =>
  `header.${Buffer.from(JSON.stringify({ exp: expires })).toString("base64url")}.signature`;
const fresh = () => token(Math.floor(Date.now() / 1000) + 3600);

function transport(fail) {
  let snapshot = {
    identity: "A:S",
    epoch: 1,
    userId: "A",
    sessionId: "S",
    accessToken: fresh(),
    refreshToken: "refresh-A",
  };
  const calls = [];
  let refreshes = 0;
  const request = createLearningTransport({
    snapshot: () => snapshot,
    lock: async () => () => {},
    expired: () => {},
    apply: (r) => {
      snapshot = { ...snapshot, accessToken: r.access_token, refreshToken: r.refresh_token };
    },
    raw: async (path, method, body) => {
      if (path === "/auth/session") {
        refreshes++;
        return {
          user: { id: "A" },
          session: { id: "S" },
          access_token: `${fresh()}-${refreshes}`,
          refresh_token: `renewed-${refreshes}`,
        };
      }
      calls.push({ path, method, body: structuredClone(body) });
      if (fail(calls.length)) throw { statusCode: 401 };
      return { ok: true };
    },
  });
  return { request, calls, snapshot: () => snapshot, refreshes: () => refreshes };
}

test("a project write and a lesson grant are repeated after a refreshed session, a challenge is not", async () => {
  const project = transport((n) => n === 1);
  const body = { request_id: "save-1", expected_revision: 0, state: { a: 1 } };
  await project.request("/skills/courses/llm-course/project", "PUT", body);
  assert.deepEqual(
    project.calls.map((call) => call.body),
    [body, body]
  );

  const grant = transport((n) => n === 1);
  await grant.request("/skills/rooms/llm-unit/llm-grant?course=llm-course", "POST");
  assert.equal(grant.calls.length, 2);

  const unsafe = transport((n) => n === 1);
  await assert.rejects(unsafe.request("/challenges/tasks/t/submit", "POST", { answer: 1 }));
  assert.equal(unsafe.calls.length, 1);
});

test("authorize renews only a token the gateway actually refused", async () => {
  const t = transport(() => false);
  const first = await t.request.authorize();
  assert.equal(t.refreshes(), 0);
  assert.equal(await t.request.authorize("an-older-token"), first, "someone else renewed already");
  assert.equal(t.refreshes(), 0);
  const second = await t.request.authorize(first);
  assert.equal(t.refreshes(), 1);
  assert.notEqual(second, first);
  assert.equal(second, t.snapshot().accessToken);
});
