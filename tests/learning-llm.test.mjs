import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";

const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
const { createLearningLlm, readSse, llmError, LLM_FALLBACK_ANSWER } = await import(
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
  assert.deepEqual(f.client.peekProof(), { text: answer, verdict: RECEIPT });
  f.client.peekProof().text = "changed by the caller";
  assert.deepEqual(
    f.client.peekProof(),
    { text: answer, verdict: RECEIPT },
    "the verdict stays until a new grade, so a completion can be sent again"
  );
  await f.client.grade("Zweiter Versuch");
  assert.equal(f.client.peekProof().text, "Zweiter Versuch");
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
  assert.equal(f.client.peekProof(), null, "the later failed grade decides");
  verdict = "pass";
  receipt = null;
  const practice = await f.client.grade("gut", { profile: "grader" });
  assert.deepEqual([practice.passed, practice.counts], [true, false]);
  assert.equal(f.client.peekProof(), null);
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
  assert.equal(f.client.peekProof(), null, "only grade() can complete a room");
  const label = f.client.label("grading");
  assert.equal(label.textContent, "KI-Bewertung, kann irren");
  assert.equal(label.dataset.academyAiLabel, "grading");
  assert.equal(f.client.label().textContent, "KI-Antwort");
  assert.equal(f.client.label("example").textContent, "Vorbereitete Beispielantwort");
  const en = fixture({ locale: "en", llm: () => json(200, result("x")) });
  assert.equal(en.client.label("live").textContent, "AI answer");
});

test("a grading profile lookup that failed on the network is asked again", async () => {
  let down = true;
  const f = fixture({
    llm: (call) => {
      if (call.path.startsWith("/llm/v1/profiles/")) {
        if (down) throw new TypeError("fetch failed");
        return json(200, { output: { type: call.path.endsWith("grader") ? "grading" : "text" } });
      }
      return json(200, graded(call.body.request_id, "pass", RECEIPT));
    },
  });
  const first = await f.client.grade("Antwort");
  assert.deepEqual([first.error.code, first.error.fallback], ["llm_unavailable", true]);
  down = false;
  const second = await f.client.grade("Antwort");
  assert.equal(second.ok, true);
  assert.equal(f.calls.at(-1).body.profile, "grader");
});

// Review 24.09. M4: nginx or another proxy answers with a status and an HTML page.
test("proxy answers without our body map per status and are never an endless retry", async () => {
  const html =
    (status, headers = {}) =>
    () =>
      new Response("<html><body>nginx</body></html>", {
        status,
        headers: { "content-type": "text/html", ...headers },
      });
  const cases = [
    [404, "llm_unavailable", "fallback"],
    [405, "llm_unavailable", "fallback"],
    [400, "llm_unavailable", "fallback"],
    [403, "llm_unavailable", "fallback"],
    [422, "llm_unavailable", "fallback"],
    [413, "input_too_long", "edit"],
    [429, "rate_limited", "retry"],
    [408, "provider_unavailable", "retry"],
    [502, "provider_unavailable", "retry"],
    [503, "provider_unavailable", "retry"],
    [504, "provider_unavailable", "retry"],
  ];
  for (const [status, code, action] of cases)
    for (const stream of [false, true]) {
      const f = fixture({ llm: html(status) });
      const answer = await f.client.respond(
        { profile: "chat", input: [] },
        stream ? { onDelta() {} } : {}
      );
      assert.equal(answer.error.code, code, `${status}`);
      assert.equal(answer.error.fallback, action === "fallback", `${status} fallback`);
      assert.equal(answer.error.retryable, action === "retry", `${status} retryable`);
      assert.equal(f.calls.length, 1, `${status} is not repeated by the host`);
    }
  const seconds = fixture({ llm: html(429, { "retry-after": "7" }) });
  const wait = await seconds.client.respond({ profile: "chat", input: [] });
  assert.equal(wait.error.retryAfterMs, 7000);
  const date = new Date(Date.now() + 30000).toUTCString();
  const dated = fixture({ llm: html(429, { "retry-after": date }) });
  const later = (await dated.client.respond({ profile: "chat", input: [] })).error.retryAfterMs;
  assert.ok(later > 27000 && later <= 30000, `${later}`);
});

// Review 24.09. M3: "Nochmal" after a lost answer must not pay for the same answer twice.
test("asking the same again after a lost answer joins that call instead of paying twice", async () => {
  let online = false;
  const f = fixture({
    llm: (call) => {
      if (!online) throw new TypeError("fetch failed");
      if (call.method === "GET") return json(200, result("request-1", "Hallo"));
      return json(200, result(call.body.request_id, "neu"));
    },
  });
  const request = { profile: "chat", input: [{ role: "user", content: "hi" }] };
  const lost = await f.client.respond(request);
  assert.deepEqual([lost.error.code, lost.error.retryable], ["network", true]);
  assert.equal(f.calls.length, 4, "one POST and three reconnects");
  online = true;
  const deltas = [];
  const again = await f.client.respond(request, { onDelta: (delta) => deltas.push(delta.text) });
  assert.equal(again.ok, true);
  assert.equal(again.outputs[0].text, "Hallo");
  assert.deepEqual(deltas, ["Hallo"]);
  assert.deepEqual(
    f.calls.slice(4).map((call) => [call.method, call.path]),
    [["GET", "/llm/v1/requests/request-1"]],
    "the retry joins the first call; no second POST"
  );
  // Once answered, the same question is a new call: a lesson may ask twice on purpose.
  const third = await f.client.respond(request);
  assert.equal(third.outputs[0].text, "neu");
  assert.deepEqual([f.calls.at(-1).method, f.calls.at(-1).body.request_id], ["POST", "request-2"]);
  // Another question never joins.
  await f.client.respond({ profile: "chat", input: [{ role: "user", content: "anders" }] });
  assert.equal(f.calls.at(-1).body.request_id, "request-3");
});

test("a joined call that never arrived is sent under its id, an expired one is asked anew", async () => {
  let phase = "down";
  const f = fixture({
    llm: (call) => {
      if (phase === "down") throw new TypeError("fetch failed");
      if (call.method === "GET")
        return phase === "unknown"
          ? json(404, { code: "request_unknown", message: "", retryable: false })
          : json(409, {
              code: "request_already_done",
              message: "",
              retryable: false,
              details: { status: "completed" },
            });
      return json(200, result(call.body.request_id));
    },
  });
  const request = { profile: "chat", input: [] };
  const describe = (call) => [call.method, call.body?.request_id ?? call.path];
  await f.client.respond(request);
  phase = "unknown";
  assert.equal((await f.client.respond(request)).ok, true);
  assert.deepEqual(f.calls.slice(4).map(describe), [
    ["GET", "/llm/v1/requests/request-1"],
    ["POST", "request-1"],
  ]);
  phase = "down";
  await f.client.respond(request);
  phase = "done";
  assert.equal((await f.client.respond(request)).ok, true);
  assert.deepEqual(f.calls.slice(-2).map(describe), [
    ["GET", "/llm/v1/requests/request-2"],
    ["POST", "request-3"],
  ]);
});

test("a lost grade, a proxy timeout and a cancelled listen are joined; a gateway error is not", async () => {
  const request = { profile: "chat", input: [{ role: "user", content: "hi" }] };
  let online = false;
  const f = fixture({
    llm: (call) => {
      if (!online) throw new TypeError("fetch failed");
      return json(200, graded(call.body?.request_id ?? "request-1", "pass", RECEIPT));
    },
  });
  assert.equal(
    (await f.client.grade("Hallo Frau Berg", { profile: "grader" })).error.code,
    "network"
  );
  online = true;
  const found = await f.client.grade("Hallo Frau Berg", { profile: "grader" });
  assert.equal(found.counts, true);
  assert.equal(f.calls.filter((call) => call.method === "POST").length, 1);
  assert.deepEqual(f.client.peekProof(), { text: "Hallo Frau Berg", verdict: RECEIPT });

  let gateway = "timeout";
  const g = fixture({
    llm: (call) =>
      gateway === "timeout"
        ? new Response("<html>504</html>", { status: 504 })
        : json(200, result(call.body?.request_id ?? "request-1")),
  });
  assert.equal((await g.client.respond(request)).error.code, "provider_unavailable");
  gateway = "ok";
  assert.equal((await g.client.respond(request)).ok, true);
  assert.deepEqual(
    g.calls.map((call) => call.method),
    ["POST", "GET"]
  );

  const listen = new AbortController();
  const c = fixture({
    llm: (call) =>
      call.method === "POST"
        ? sse([event("delta", { sample: 0, text: "Erst" })], { hang: true, signal: call.signal })
        : sse([
            event("delta", { sample: 0, text: "Erst" }),
            event("delta", { sample: 0, text: "mal" }),
            event("done", result("request-1", "Erstmal")),
          ]),
  });
  const stopped = await c.client.respond(request, {
    signal: listen.signal,
    onDelta: () => listen.abort(),
  });
  assert.equal(stopped.error.code, "cancelled");
  const deltas = [];
  assert.equal((await c.client.respond(request, { onDelta: (d) => deltas.push(d.text) })).ok, true);
  assert.deepEqual(deltas, ["Erst", "mal"]);
  assert.deepEqual(
    c.calls.map((call) => call.method),
    ["POST", "GET"]
  );

  // The gateway answered with its own error: that call is settled, a new try is a new id.
  const h = fixture({
    llm: (call, n) =>
      n === 1
        ? json(503, { code: "provider_unavailable", retryable: true, retry_after_ms: 5000 })
        : json(200, result(call.body.request_id)),
  });
  await h.client.respond(request);
  await h.client.respond(request);
  assert.deepEqual(
    h.calls.map((call) => [call.method, call.body.request_id]),
    [
      ["POST", "request-1"],
      ["POST", "request-2"],
    ]
  );

  // The same unreadable answer twice falls back instead of offering "again" forever.
  const broken = fixture({ llm: () => json(200, { request_id: "x" }) });
  const once = await broken.client.respond(request);
  assert.deepEqual([once.error.code, once.error.retryable], ["invalid_response", true]);
  const twice = await broken.client.respond(request);
  assert.deepEqual([twice.error.code, twice.error.fallback], ["llm_unavailable", true]);
  assert.deepEqual(
    broken.calls.map((call) => call.method),
    ["POST", "GET"]
  );
});

// Review 24.09. N1.
test("only the newest grade decides, even when an older one finishes later", async () => {
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const f = fixture({
    llm: async (call) => {
      if (call.body.input[0].content === "alt und gut") {
        await gate;
        return json(200, graded(call.body.request_id, "pass", RECEIPT));
      }
      return json(200, graded(call.body.request_id, "fail", "signed.fail.verdict"));
    },
  });
  const older = f.client.grade("alt und gut", { profile: "grader" });
  await new Promise(setImmediate);
  const newer = await f.client.grade("neu", { profile: "grader" });
  assert.deepEqual([newer.passed, newer.counts], [false, false]);
  release();
  const late = await older;
  assert.deepEqual([late.passed, late.counts], [true, false], "an outdated pass does not count");
  assert.equal(f.client.peekProof(), null);
});

// Review 24.09. N2.
test("odd options from a module are ignored instead of throwing", async () => {
  const f = fixture({
    llm: (call) =>
      call.path.startsWith("/llm/v1/profiles/")
        ? json(200, { output: { type: call.path.endsWith("grader") ? "grading" : "text" } })
        : json(
            200,
            call.body.profile === "grader"
              ? graded(call.body.request_id, "pass", RECEIPT)
              : result(call.body.request_id)
          ),
  });
  const request = { profile: "chat", input: [] };
  assert.equal((await f.client.respond(request, null)).ok, true);
  assert.equal((await f.client.respond(request, { signal: {}, onDelta: 5 })).ok, true);
  assert.equal((await f.client.grade("Antwort", null)).counts, true);
  assert.equal((await f.client.grade("Antwort", { signal: "no", profile: 7 })).counts, true);
});

// Review 24.09. H1: the host decides when the ungraded way on is honest.
test("the ungraded way on opens only after the model was unavailable or could not sign", async () => {
  let reply;
  const f = fixture({ llm: (call) => reply(call) });
  const grade = () => f.client.grade("Meine Antwort", { profile: "grader" });
  assert.equal(f.client.fallbackAvailable(), false);
  for (const [status, code] of [
    [429, "rate_limited"],
    [422, "input_blocked"],
    [400, "input_too_long"],
  ]) {
    reply = () => json(status, { code, message: "", retryable: code === "rate_limited" });
    await grade();
    assert.equal(f.client.fallbackAvailable(), false, `${code} is no outage`);
  }
  const listen = new AbortController();
  listen.abort();
  await f.client.grade("x", { profile: "grader", signal: listen.signal });
  assert.equal(f.client.fallbackAvailable(), false, "a cancelled grade is no outage");

  reply = () => json(503, { code: "llm_paused", message: "", retryable: false });
  assert.equal((await grade()).error.fallback, true);
  assert.equal(f.client.fallbackAvailable(), true, "paused");

  reply = (call) => json(200, graded(call.body.request_id, "fail", "signed.fail.verdict"));
  await grade();
  assert.equal(f.client.fallbackAvailable(), false, "a signed grade shows the model at work");

  reply = (call) => json(200, graded(call.body.request_id, "pass", null));
  const unsigned = await grade();
  assert.deepEqual([unsigned.passed, unsigned.counts], [true, false]);
  assert.equal(f.client.fallbackAvailable(), true, "test mode signs nothing");

  reply = (call) => json(200, graded(call.body.request_id, "pass", RECEIPT));
  assert.equal((await grade()).counts, true);
  assert.equal(f.client.fallbackAvailable(), false);

  reply = () => json(503, { code: "provider_unavailable", message: "", retryable: true });
  await f.client.respond({ profile: "chat", input: [] });
  assert.equal(f.client.fallbackAvailable(), true, "provider down");
  assert.deepEqual(f.client.peekProof(), { text: "Meine Antwort", verdict: RECEIPT });

  const fresh = fixture({
    llm: () => json(429, { code: "allowance_exhausted", retryable: false }),
  });
  await fresh.client.grade("x", { profile: "grader" });
  assert.equal(fresh.client.fallbackAvailable(), true, "allowance used up");

  assert.deepEqual(LLM_FALLBACK_ANSWER, { fallback: "example" });
  assert.equal(Object.isFrozen(LLM_FALLBACK_ANSWER), true);
  assert.equal(
    llmError("session", "de").message,
    "Melde dich kurz neu an, dann ist die KI wieder dabei."
  );
});
