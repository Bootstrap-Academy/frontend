import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const temporary = await mkdtemp(join(tmpdir(), "academy-feedback-test-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "feedback.mjs");
await writeFile(
  output,
  ts.transpileModule(await readFile(new URL("../utils/feedback.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
);
const {
  feedbackPayload,
  sendFeedback,
  FeedbackSendError,
  browserSummary,
  osSummary,
  imageDimensions,
  boundedRegion,
  arrowPoints,
  isPrivateFeedbackPath,
} = await import(pathToFileURL(output).href);
const draft = {
  request_id: "12345678-1234-4234-8234-123456789012",
  kind: "bug",
  title: "A button is covered",
  description: "The mobile button cannot be reached.",
};
const diagnostics = {
  app_build: "abc123",
  browser: "Firefox 130.0",
  os: "Linux",
  viewport: "390×844",
  language: "de",
  theme: "dark",
  reduced_motion: true,
};
const issue = "https://github.com/Bootstrap-Academy/Bootstrap-Academy/issues/160";
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("text-only has no diagnosis, image, identity or raw browser fields even when supplied upstream", () => {
  const result = feedbackPayload(
    { ...draft, account_id: "private", token: "private" },
    false,
    { ...diagnostics, user_agent: "private", cookie: "private" },
    null
  );
  assert.deepEqual(result, { ...draft, diagnostics_consent: false });
});

test("consented payload contains exactly the preview allowlist and final image", () => {
  const result = feedbackPayload(
    draft,
    true,
    { ...diagnostics, email: "private", localStorage: {} },
    { data_url: "data:image/png;base64,AAAA", original: "private", layers: ["private"] }
  );
  assert.deepEqual(result.diagnostics, diagnostics);
  assert.deepEqual(result.screenshot, { data_url: "data:image/png;base64,AAAA" });
  assert.equal(result.diagnostics_consent, true);
});

test("summaries do not leak full user agent, model or OS build", () => {
  const agent =
    "Mozilla/5.0 (Linux; Android 14; PRIVATE-MODEL-BUILD) AppleWebKit/537.36 Chrome/130.0.1.2 Mobile Safari/537.36";
  assert.equal(browserSummary(agent), "Chrome 130.0.1.2");
  assert.equal(osSummary(agent), "Android");
  assert.equal(browserSummary("private-unknown-browser"), "unavailable");
  assert.equal(osSummary("private-unknown-os"), "unavailable");
});

test("guest send has no credentials/referrer/auth headers and confirms only exact GitHub destination", async () => {
  const payload = feedbackPayload(draft, false, null, null);
  let count = 0;
  const result = await sendFeedback(
    "https://api.example.invalid/",
    payload,
    async (url, options) => {
      count++;
      assert.equal(url, "https://api.example.invalid/feedback");
      assert.deepEqual(options.headers, { "Content-Type": "application/json" });
      assert.equal(options.credentials, "omit");
      assert.equal(options.referrerPolicy, "no-referrer");
      assert.deepEqual(JSON.parse(options.body), payload);
      return response({ status: "created", issue_url: issue });
    }
  );
  assert.equal(count, 1);
  assert.deepEqual(result, { status: "created", issue_url: issue });
});

test("pending and explicit retry keep the same UUID and body, without automatic requests", async () => {
  const payload = feedbackPayload(draft, true, diagnostics, null);
  const bodies = [];
  const transport = async (_url, options) => {
    bodies.push(options.body);
    return bodies.length === 1
      ? response({ status: "pending", request_id: draft.request_id }, 202)
      : response({ status: "created", issue_url: issue });
  };
  assert.deepEqual(await sendFeedback("https://api.invalid", payload, transport), {
    status: "pending",
    request_id: draft.request_id,
  });
  assert.equal(bodies.length, 1);
  assert.equal((await sendFeedback("https://api.invalid", payload, transport)).status, "created");
  assert.equal(bodies[0], bodies[1]);
});

test("timeout is ambiguous, aborts transport and never retries", async () => {
  let calls = 0;
  await assert.rejects(
    sendFeedback(
      "https://api.invalid",
      feedbackPayload(draft, false, null, null),
      async (_url, { signal }) => {
        calls++;
        return new Promise((_, reject) =>
          signal.addEventListener("abort", () => reject(new Error("aborted")))
        );
      },
      10
    ),
    (error) => error instanceof FeedbackSendError && error.ambiguous
  );
  assert.equal(calls, 1);
});

test("proxy/server errors, conflicting UUID, malformed success and foreign issue URLs remain ambiguous", async () => {
  for (const [body, status] of [
    [{ error: "unavailable" }, 503],
    [{ error: "request_conflict" }, 409],
    [{ status: "created", issue_url: "https://example.invalid/private" }, 200],
    [{ status: "pending", request_id: "another-request" }, 202],
    [{ status: "created" }, 200],
  ]) {
    await assert.rejects(
      sendFeedback("https://api.invalid", feedbackPayload(draft, false, null, null), async () =>
        response(body, status)
      ),
      (error) => error.ambiguous
    );
  }
});

test("typed pre-publication validation and rate rejection do not claim an issue exists", async () => {
  for (const [status, code] of [
    [422, "invalid_request"],
    [429, "rate_limited"],
  ]) {
    await assert.rejects(
      sendFeedback("https://api.invalid", feedbackPayload(draft, false, null, null), async () =>
        response({ error: code }, status)
      ),
      (error) => error.code === code && !error.ambiguous
    );
  }
});

test("image limits cap both dimensions and total pixels, preserving portrait/landscape proportions", () => {
  for (const [width, height] of [
    [8000, 8000],
    [8000, 1000],
    [1000, 8000],
    [400, 300],
  ]) {
    const result = imageDimensions(width, height);
    assert.ok(result.width <= 4096 && result.height <= 4096);
    assert.ok(result.width * result.height <= 8 * 1024 * 1024);
    assert.ok(Math.abs(result.width / result.height - width / height) < 0.01);
  }
  assert.throws(() => imageDimensions(0, 100));
  assert.throws(() => imageDimensions(NaN, 100));
});

test("keyboard/pointer edit region cannot escape image boundaries", () => {
  assert.deepEqual(boundedRegion({ x: -20, y: 12.8, width: 9999, height: 9999 }, 100, 50), {
    x: 0,
    y: 12,
    width: 100,
    height: 38,
  });
});

test("rendered account, order and contract text is private, including nested routes", () => {
  for (const pathname of [
    "/account",
    "/profile",
    "/moderation",
    "/billing",
    "/purchase",
    "/premium",
    "/orders",
    "/subscription",
    "/vertrag-kuendigen",
    "/vertrag-widerrufen",
  ]) {
    assert.equal(isPrivateFeedbackPath(pathname), true, pathname);
    assert.equal(isPrivateFeedbackPath(pathname + "/"), true, pathname + "/");
    assert.equal(isPrivateFeedbackPath(pathname + "/synthetic"), true, pathname + "/synthetic");
  }
  for (const pathname of ["/", "/docs/imprint", "/skill-tree", "/orders-help", "/subscriptions"]) {
    assert.equal(isPrivateFeedbackPath(pathname), false, pathname);
  }
});

test("arrows preserve the actual drag direction, including left and up", () => {
  assert.deepEqual(arrowPoints({ x: 80, y: 70, width: -60, height: -50 }, 100, 100), {
    x: 80,
    y: 70,
    endX: 20,
    endY: 20,
  });
  assert.deepEqual(arrowPoints({ x: 20, y: 80, width: 50, height: -60 }, 100, 100), {
    x: 20,
    y: 80,
    endX: 70,
    endY: 20,
  });
});
