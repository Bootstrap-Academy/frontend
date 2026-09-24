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
  const waits = [];
  let ids = 0;
  const project = createLearningProject({
    courseId: "llm-course",
    id: () => `save-${++ids}`,
    request: async (path, method = "GET", body) => {
      calls.push({ path, method, body: body && structuredClone(body) });
      return await respond({ path, method, body }, calls.length);
    },
    wait: async (ms) => {
      waits.push(ms);
    },
  });
  return { project, calls, waits };
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
  const refused = fixture(() => Promise.reject({ statusCode: 400 }));
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

// Review 24.09. N5: refusals get their own codes, a server error is retried like a lost answer.
test("no access and invalid states have their own codes; a server error is retried once", async () => {
  for (const status of [401, 403, 404]) {
    const f = fixture(() => Promise.reject({ statusCode: status }));
    assert.deepEqual(await rejection(f.project.get()), { code: "no_access" }, `get ${status}`);
    assert.deepEqual(await rejection(f.project.save({}, 0)), { code: "no_access" }, `${status}`);
    assert.equal(f.calls.length, 2, `${status} is not repeated`);
  }
  const invalid = fixture(() => Promise.reject({ statusCode: 422 }));
  assert.deepEqual(await rejection(invalid.project.save({}, 0)), { code: "invalid" });
  assert.equal(invalid.calls.length, 1);

  for (const status of [500, 502, 503, 504]) {
    const f = fixture((call, n) =>
      n === 1 ? Promise.reject({ statusCode: status }) : envelope(1, call.body.state)
    );
    assert.deepEqual(await f.project.save({ step: 1 }, 0), { revision: 1, state: { step: 1 } });
    assert.deepEqual(f.calls[0], f.calls[1], "the same id and body");
    assert.deepEqual(f.waits, [1000], "after a short pause, not in the same outage");
  }
  const down = fixture(() => Promise.reject({ statusCode: 503 }));
  assert.deepEqual(await rejection(down.project.save({}, 0)), { code: "offline" });
  assert.equal(down.calls.length, 2);
});

// Review 24.09. N6: a lone surrogate cannot be stored as UTF-8 on the server.
test("a lone surrogate is refused locally; emoji and a written backslash-u are fine", async () => {
  const f = fixture((call) => envelope(1, call.body.state));
  assert.deepEqual(await rejection(f.project.save({ name: "Klingel \ud800" }, 0)), {
    code: "invalid",
  });
  assert.deepEqual(await rejection(f.project.save({ ["\udc00"]: 1 }, 0)), { code: "invalid" });
  assert.equal(f.calls.length, 0);
  for (const state of [{ name: "Klingel 🚲" }, { note: "\\ud800 steht hier als Text" }])
    assert.deepEqual(await f.project.save(state, 0), { revision: 1, state });
});
