import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
const { createLearningLlm, readSse, llmError } = await import(
  `data:text/javascript;base64,${Buffer.from(
    compile(await readFile(new URL("../utils/learningLlm.ts", import.meta.url), "utf8"))
  ).toString("base64")}`
);

const GRANT = "grant.jwt.value";
const RECEIPT = "verdict.jwt.signature";
const encoder = new TextEncoder();

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const event = (name, data) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
/** A fake SSE body; `drop` ends it like a lost connection, `hang` keeps it open until aborted. */
function sse(chunks, { drop = false, hang = false, signal } = {}) {
  let next = 0;
  return new Response(
    new ReadableStream({
      // Pull-based, so every chunk is read before the stream fails like a lost connection.
      pull(controller) {
        if (next < chunks.length) return controller.enqueue(encoder.encode(chunks[next++]));
        if (hang)
          return new Promise((_, reject) => {
            const abort = () => reject(new DOMException("aborted", "AbortError"));
            if (signal?.aborted) abort();
            else signal?.addEventListener("abort", abort);
          });
        if (drop) controller.error(new TypeError("network connection lost"));
        else controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } }
  );
}
const result = (requestId, text = "Hallo Welt", extra = {}) => ({
  request_id: requestId,
  status: "completed",
  replayed: false,
  model: { alias: "fast", id: "gpt-6-luna" },
  outputs: [{ sample: 0, status: "completed", type: "text", text }],
  usage: { input_tokens: 12, cached_input_tokens: 0, output_tokens: 4, reasoning_tokens: 0 },
  redacted: false,
  allowance: { state: "ok", used_ratio: 0.1, resets_at: null, plan: "free" },
  ...extra,
});

function fixture({ llm, skills, locale = "de" } = {}) {
  const calls = [];
  const grants = [];
  const waits = [];
  const lifetime = new AbortController();
  let ids = 0;
  const client = createLearningLlm({
    unitId: "llm-unit",
    courseId: "llm-course",
    locale: () => locale,
    request: async (path, method = "GET", body) => {
      grants.push({ path, method, body });
      if (skills) return await skills(path, method, grants.length);
      return { grant: GRANT, profiles: ["chat", "grader"], expires_at: "2099-01-01T00:00:00Z" };
    },
    send: async (path, init, renew) => {
      const call = {
        path,
        method: init.method,
        headers: init.headers,
        body: init.body ? JSON.parse(init.body) : undefined,
        renew,
        signal: init.signal,
      };
      calls.push(call);
      return await llm(call, calls.length);
    },
    signal: lifetime.signal,
    document: {
      createElement: (tag) => ({
        tag,
        dataset: {},
        textContent: "",
        setAttribute(name, value) {
          this[name] = value;
        },
      }),
    },
    id: () => `request-${++ids}`,
    wait: async (ms) => {
      waits.push(ms);
    },
  });
  return { client, calls, grants, waits, lifetime };
}

const secretsIn = (value) =>
  [GRANT, RECEIPT, "Bearer", "access-token", "/llm/v1", "/skills/"].filter((secret) =>
    JSON.stringify(value).includes(secret)
  );

test("SSE parsing handles split chunks, CRLF, pings, multi-line data and a cut-off tail", async () => {
  const text =
    ': ping\r\nevent: start\r\ndata: {"a":1}\r\n\r\nevent: delta\ndata: {"t":\ndata: "x"}\n\n: ping\n\ndata: plain\n\nevent: delta\ndata: {"lost":true}';
  const bytes = encoder.encode(text);
  const body = new ReadableStream({
    start(controller) {
      // Split everywhere, including inside multi-byte characters and line endings.
      for (let index = 0; index < bytes.length; index += 3)
        controller.enqueue(bytes.slice(index, index + 3));
      controller.close();
    },
  });
  const events = [];
  for await (const item of readSse(body)) events.push(item);
  assert.deepEqual(events, [
    { event: "start", data: '{"a":1}' },
    { event: "delta", data: '{"t":\n"x"}' },
    { event: "message", data: "plain" },
  ]);
});

test("a streamed answer fetches one grant lazily, streams deltas and hides every credential", async () => {
  const f = fixture({
    llm: (call) =>
      sse([
        event("start", {
          request_id: call.body.request_id,
          model: { alias: "fast", id: "gpt-6-luna" },
          samples: 1,
        }),
        ": ping\n\n",
        event("delta", { sample: 0, text: "Hallo" }),
        event("delta", { sample: 0, text: " Welt" }),
        event("done", result(call.body.request_id)),
      ]),
  });
  assert.equal(f.grants.length, 0, "no grant before the first call");
  const deltas = [];
  const answer = await f.client.respond(
    {
      profile: "chat",
      input: [{ role: "user", content: "Sag hallo" }],
      params: { temperature: 1 },
    },
    { onDelta: (delta) => deltas.push(delta) }
  );
  assert.deepEqual(f.grants, [
    { path: "/skills/rooms/llm-unit/llm-grant?course=llm-course", method: "POST", body: undefined },
  ]);
  assert.equal(f.calls[0].path, "/llm/v1/respond");
  assert.equal(f.calls[0].headers.Accept, "text/event-stream");
  assert.deepEqual(f.calls[0].body, {
    request_id: "request-1",
    profile: "chat",
    locale: "de",
    input: [{ role: "user", content: "Sag hallo" }],
    params: { temperature: 1 },
    grant: GRANT,
  });
  assert.deepEqual(deltas, [
    { sample: 0, text: "Hallo" },
    { sample: 0, text: " Welt" },
  ]);
  assert.deepEqual(answer, {
    ok: true,
    requestId: "request-1",
    status: "completed",
    outputs: [{ sample: 0, status: "completed", type: "text", text: "Hallo Welt" }],
    usage: { input_tokens: 12, cached_input_tokens: 0, output_tokens: 4, reasoning_tokens: 0 },
    model: { alias: "fast", id: "gpt-6-luna" },
    redacted: false,
  });
  assert.deepEqual(secretsIn(answer), []);
  await f.client.respond({ profile: "chat", input: [] });
  assert.equal(f.grants.length, 1, "the grant is reused until it nearly expires");
  assert.equal(f.calls[1].headers.Accept, "application/json");
});

test("a dropped stream rejoins the same request and forwards each piece of text once", async () => {
  const f = fixture({
    llm: (call, n) => {
      if (n === 1)
        return sse(
          [
            event("start", {
              request_id: "request-1",
              model: { alias: "fast", id: "x" },
              samples: 1,
            }),
            event("delta", { sample: 0, text: "Hal" }),
          ],
          { drop: true }
        );
      // Joining replays the whole history, then the rest and `done`.
      return sse([
        event("start", { request_id: "request-1", model: { alias: "fast", id: "x" }, samples: 1 }),
        event("delta", { sample: 0, text: "Hal" }),
        event("delta", { sample: 0, text: "lo" }),
        event("done", result("request-1", "Hallo")),
      ]);
    },
  });
  const deltas = [];
  const answer = await f.client.respond(
    { profile: "chat", input: [{ role: "user", content: "hi" }] },
    { onDelta: (delta) => deltas.push(delta.text) }
  );
  assert.equal(answer.ok, true);
  assert.equal(deltas.join(""), "Hallo");
  assert.deepEqual(deltas, ["Hal", "lo"]);
  assert.deepEqual(
    f.calls.map((call) => [call.method, call.path]),
    [
      ["POST", "/llm/v1/respond"],
      ["GET", "/llm/v1/requests/request-1"],
    ]
  );
  assert.equal(f.calls[1].headers.Accept, "text/event-stream");
});

test("a finished call replayed without deltas still delivers the missing text", async () => {
  const f = fixture({
    llm: (call, n) =>
      n === 1
        ? sse([event("delta", { sample: 0, text: "Hal" })], { drop: true })
        : sse([event("done", result("request-1", "Hallo"))]),
  });
  const deltas = [];
  await f.client.respond({ profile: "chat", input: [] }, { onDelta: (d) => deltas.push(d.text) });
  assert.deepEqual(deltas, ["Hal", "lo"]);
});

test("a POST that never arrived is sent again under the same id; a running call is polled", async () => {
  const f = fixture({
    llm: (call, n) => {
      if (n === 1) throw new TypeError("fetch failed");
      if (n === 2) return json(404, { code: "request_unknown", message: "", retryable: false });
      if (n === 3) throw new TypeError("fetch failed");
      if (n === 4)
        return json(409, {
          code: "request_in_progress",
          message: "",
          retryable: true,
          retry_after_ms: 1000,
        });
      return json(200, result("request-1"));
    },
  });
  const answer = await f.client.respond({ profile: "chat", input: [] });
  assert.equal(answer.ok, true);
  assert.deepEqual(
    f.calls.map((call) => [call.method, call.path, call.body?.request_id]),
    [
      ["POST", "/llm/v1/respond", "request-1"],
      ["GET", "/llm/v1/requests/request-1", undefined],
      ["POST", "/llm/v1/respond", "request-1"],
      ["GET", "/llm/v1/requests/request-1", undefined],
      ["GET", "/llm/v1/requests/request-1", undefined],
    ]
  );
  assert.deepEqual(f.waits, [500, 1000, 1000]);
});

test("reconnects are bounded and end in a retryable network error", async () => {
  const f = fixture({
    llm: () => {
      throw new TypeError("fetch failed");
    },
  });
  const answer = await f.client.respond({ profile: "chat", input: [] });
  assert.equal(f.calls.length, 4);
  assert.equal(answer.error.code, "network");
  assert.equal(answer.error.retryable, true);
  assert.equal(answer.error.fallback, false);
});

test("an expired token and an expired grant are renewed once and keep the request id", async () => {
  let grantCount = 0;
  const f = fixture({
    skills: () => ({
      grant: `${GRANT}-${++grantCount}`,
      profiles: ["chat"],
      expires_at: "2099-01-01T00:00:00Z",
    }),
    llm: (call, n) => {
      if (n === 1) return json(401, { code: "unauthenticated", message: "", retryable: true });
      if (n === 2) return json(403, { code: "grant_expired", message: "", retryable: true });
      return json(200, result(call.body.request_id));
    },
  });
  const answer = await f.client.respond({ profile: "chat", input: [] });
  assert.equal(answer.ok, true);
  assert.deepEqual(
    f.calls.map((call) => [call.body.request_id, call.body.grant, call.renew]),
    [
      ["request-1", `${GRANT}-1`, false],
      ["request-1", `${GRANT}-1`, true],
      ["request-1", `${GRANT}-2`, false],
    ]
  );
  // A second refusal is not retried forever.
  const g = fixture({
    llm: () => json(401, { code: "unauthenticated", message: "", retryable: true }),
  });
  const refused = await g.client.respond({ profile: "chat", input: [] });
  assert.equal(g.calls.length, 2);
  assert.deepEqual([refused.error.code, refused.error.fallback], ["session", true]);
});

// Every code llm-ms returns (academy_llm/src/error.rs) and what a lesson does with it.
const table = [
  [400, "invalid_request", "fallback"],
  [400, "input_too_long", "edit"],
  [400, "param_not_allowed", "fallback"],
  [403, "email_not_verified", "fallback"],
  [403, "grant_invalid", "fallback"],
  [403, "grant_expired", "fallback"],
  [403, "profile_not_granted", "fallback"],
  [403, "model_not_in_plan", "fallback"],
  [403, "no_entitlement", "fallback"],
  [403, "age_confirmation_required", "fallback"],
  [404, "profile_unknown", "fallback"],
  [404, "not_found", "fallback"],
  [409, "request_id_conflict", "fallback"],
  [409, "request_already_done", "fallback"],
  [422, "input_blocked", "edit"],
  [429, "rate_limited", "retry"],
  [429, "allowance_exhausted", "fallback"],
  [429, "lesson_budget_exhausted", "fallback"],
  [502, "provider_rejected", "fallback"],
  [502, "output_invalid", "retry"],
  [503, "llm_paused", "fallback"],
  [503, "provider_unavailable", "retry"],
  [503, "service_unavailable", "retry"],
  [504, "provider_timeout", "retry"],
  [500, "internal_error", "retry"],
];

test("every gateway error code maps to one clear action and a friendly text", async () => {
  for (const [status, code, action] of table) {
    for (const stream of [false, true]) {
      const body = {
        code,
        message: "technical text for logs",
        retryable: action === "retry",
        ...(code === "rate_limited" ? { retry_after_ms: 1500 } : {}),
        ...(code.endsWith("exhausted")
          ? { details: { resets_at: "2026-10-01T00:00:00+02:00", plan: "free" } }
          : {}),
      };
      const f = fixture({
        llm: () =>
          stream && status >= 500
            ? sse([event("start", {}), event("error", body)])
            : json(status, body),
      });
      const answer = await f.client.respond(
        { profile: "chat", input: [] },
        stream ? { onDelta: () => {} } : {}
      );
      assert.equal(answer.ok, false, code);
      const error = answer.error;
      assert.equal(error.code, code);
      assert.equal(error.fallback, action === "fallback", `${code} fallback`);
      assert.equal(error.retryable, action === "retry", `${code} retryable`);
      assert.ok(error.message && !error.message.includes("technical"), `${code} message`);
      if (code === "rate_limited") assert.equal(error.retryAfterMs, 1500);
      if (code.endsWith("exhausted")) assert.equal(error.resetsAt, "2026-10-01T00:00:00+02:00");
      assert.deepEqual(
        Object.keys(error).sort(),
        [
          "code",
          "fallback",
          "message",
          "retryable",
          ...(code === "rate_limited" ? ["retryAfterMs"] : []),
          ...(code.endsWith("exhausted") ? ["resetsAt"] : []),
        ].sort()
      );
    }
  }
  const paused = llmError("llm_paused", "de");
  assert.equal(paused.message, "Die KI macht gerade Pause. Du kannst trotzdem weitermachen.");
  assert.equal(llmError("llm_paused", "en").fallback, true);
  assert.equal(llmError("something_new", "de").fallback, true, "unknown codes fall back");
});

test("a proxy error without our body and a broken result still let the lesson continue", async () => {
  const f = fixture({ llm: () => new Response("<html>502</html>", { status: 502 }) });
  const answer = await f.client.respond({ profile: "chat", input: [] });
  assert.deepEqual([answer.error.code, answer.error.retryable], ["provider_unavailable", true]);
  const g = fixture({ llm: () => json(200, { request_id: "x" }) });
  assert.equal(
    (await g.client.respond({ profile: "chat", input: [] })).error.code,
    "invalid_response"
  );
  const h = fixture({ llm: () => json(200, result("x")) });
  assert.equal((await h.client.respond({ profile: 5, input: "no" })).error.code, "invalid_request");
  assert.equal(h.calls.length, 0);
});

test("grant refusals from skills-ms become fallbacks, a lost grant response can be retried", async () => {
  const cases = [
    [{ statusCode: 404 }, "llm_unavailable", true],
    [{ statusCode: 403 }, "no_entitlement", true],
    [{ statusCode: 503 }, "llm_unavailable", true],
    [{ statusCode: 401 }, "session", true],
    [new TypeError("fetch failed"), "network", false],
  ];
  for (const [failure, code, fallback] of cases) {
    const f = fixture({
      skills: () => {
        throw failure;
      },
      llm: () => json(200, result("x")),
    });
    const answer = await f.client.respond({ profile: "chat", input: [] });
    assert.deepEqual([answer.error.code, answer.error.fallback], [code, fallback]);
    assert.equal(f.calls.length, 0, "no gateway call without a grant");
  }
});

test("cancelling stops listening at once and no late delta reaches the module", async () => {
  const listen = new AbortController();
  const f = fixture({
    llm: (call) =>
      sse([event("delta", { sample: 0, text: "Erst" })], { hang: true, signal: call.signal }),
  });
  const deltas = [];
  const pending = f.client.respond(
    { profile: "chat", input: [] },
    {
      signal: listen.signal,
      onDelta: (delta) => {
        deltas.push(delta.text);
        listen.abort();
      },
    }
  );
  const answer = await pending;
  assert.deepEqual(deltas, ["Erst"]);
  assert.deepEqual(
    [answer.error.code, answer.error.retryable, answer.error.fallback],
    ["cancelled", true, false]
  );
  assert.equal(f.calls.length, 1, "a cancelled call never reconnects");

  const g = fixture({
    llm: (call) =>
      sse([event("delta", { sample: 0, text: "x" })], { hang: true, signal: call.signal }),
  });
  const late = g.client.respond(
    { profile: "chat", input: [] },
    { onDelta: () => g.lifetime.abort() }
  );
  assert.equal((await late).error.code, "cancelled");
});

const graded = (requestId, verdict, receipt) =>
  result(requestId, "", {
    outputs: [
      {
        sample: 0,
        status: "completed",
        type: "grading",
        grading: {
          verdict,
          score: verdict === "pass" ? 3 : 1,
          max_score: 4,
          pass_score: 3,
          reason: "Du nennst den Kunden beim Namen, aber nicht die Lieferzeit.",
          criteria: [
            { id: "greeting", met: true, claimed: true, points: 1, evidence: "Hallo Frau Berg" },
            { id: "delivery", met: false, claimed: true, points: 0, evidence: "morgen" },
          ],
          receipt,
        },
      },
    ],
  });

test("grading finds the grading profile, returns the details and keeps the verdict in the host", async () => {
  const f = fixture({
    llm: (call) => {
      if (call.path.startsWith("/llm/v1/profiles/"))
        return json(200, {
          id: call.path.split("/").pop(),
          output: { type: call.path.endsWith("grader") ? "grading" : "text" },
        });
      return json(200, graded(call.body.request_id, "pass", RECEIPT));
    },
  });
  const answer = "Hallo Frau Berg, danke für Ihre Nachricht.";
  const grade = await f.client.grade(answer);
  const profileCalls = f.calls.filter((call) => call.path.startsWith("/llm/v1/profiles/"));
  assert.deepEqual(
    profileCalls.map((call) => [call.path, call.headers["X-LLM-Grant"]]),
    [
      ["/llm/v1/profiles/chat", GRANT],
      ["/llm/v1/profiles/grader", GRANT],
    ]
  );
  const respond = f.calls.at(-1);
  assert.equal(respond.body.profile, "grader");
  assert.deepEqual(respond.body.input, [{ role: "user", content: answer }]);
  assert.equal(respond.headers.Accept, "application/json");
  assert.deepEqual(grade, {
    ok: true,
    passed: true,
    counts: true,
    score: 3,
    maxScore: 4,
    passScore: 3,
    reason: "Du nennst den Kunden beim Namen, aber nicht die Lieferzeit.",
    criteria: [
      { id: "greeting", met: true, points: 1, evidence: "Hallo Frau Berg" },
      { id: "delivery", met: false, points: 0, evidence: "morgen" },
    ],
    model: { alias: "fast", id: "gpt-6-luna" },
  });
  assert.deepEqual(secretsIn(grade), []);
  assert.deepEqual(f.client.takeProof(), { text: answer, verdict: RECEIPT });
  assert.equal(f.client.takeProof(), null, "a verdict completes once");
  await f.client.grade("Zweiter Versuch");
  assert.equal(
    f.calls.filter((call) => call.path.startsWith("/llm/v1/profiles/")).length,
    2,
    "the grading profile is looked up once"
  );
});

test("a failed or unsigned grade never counts, a new grade replaces an earlier pass", async () => {
  let verdict = "pass";
  let receipt = RECEIPT;
  const f = fixture({
    llm: (call) => json(200, graded(call.body.request_id, verdict, receipt)),
  });
  assert.equal((await f.client.grade("gut", { profile: "grader" })).counts, true);
  verdict = "fail";
  const failed = await f.client.grade("schlecht", { profile: "grader" });
  assert.deepEqual([failed.passed, failed.counts], [false, false]);
  assert.equal(f.client.takeProof(), null, "the later failed grade decides");
  verdict = "pass";
  receipt = null;
  const practice = await f.client.grade("gut", { profile: "grader" });
  assert.deepEqual([practice.passed, practice.counts], [true, false]);
  assert.equal(f.client.takeProof(), null);
  const empty = await f.client.grade("   ", { profile: "grader" });
  assert.deepEqual([empty.error.code, empty.error.fallback], ["input_empty", false]);
  const blocked = fixture({
    llm: () => json(422, { code: "input_blocked", message: "", retryable: false }),
  });
  const refused = await blocked.client.grade("…", { profile: "grader" });
  assert.deepEqual([refused.error.code, refused.error.fallback], ["input_blocked", false]);
  const noGrader = fixture({ llm: () => json(200, { output: { type: "text" } }) });
  const missing = await noGrader.client.grade("Antwort");
  assert.deepEqual([missing.error.code, missing.error.fallback], ["llm_unavailable", true]);
});

test("respond never passes a signed verdict on and the AI label is localized", async () => {
  const f = fixture({ llm: (call) => json(200, graded(call.body.request_id, "pass", RECEIPT)) });
  const answer = await f.client.respond({
    profile: "grader",
    input: [{ role: "user", content: "x" }],
  });
  assert.equal(answer.outputs[0].type, "json");
  assert.equal(answer.outputs[0].json.passed, true);
  assert.deepEqual(secretsIn(answer), []);
  assert.equal(f.client.takeProof(), null, "only grade() can complete a room");
  const label = f.client.label("grading");
  assert.equal(label.textContent, "KI-Bewertung, kann irren");
  assert.equal(label.dataset.academyAiLabel, "grading");
  assert.equal(f.client.label().textContent, "KI-Antwort");
  assert.equal(f.client.label("example").textContent, "Vorbereitete Beispielantwort");
  const en = fixture({ locale: "en", llm: () => json(200, result("x")) });
  assert.equal(en.client.label("live").textContent, "AI answer");
});
