import type {
  LlmError,
  LlmGradeResult,
  LlmLabelKind,
  LlmOutput,
  LlmRequest,
  LlmResult,
} from "~/types/learningModule";
import type { LearningRequest } from "~/types/learningRooms";

export interface SseEvent {
  event: string;
  data: string;
}

/** Reads a `text/event-stream` body. Comments such as `: ping` are skipped. */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";
  let data: string[] = [];
  let finished = false;
  try {
    while (!finished) {
      const { value, done } = await reader.read();
      finished = done;
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end).replace(/\r$/, "");
        buffer = buffer.slice(end + 1);
        if (!line) {
          if (data.length) yield { event: event || "message", data: data.join("\n") };
          event = "";
          data = [];
        } else if (!line.startsWith(":")) {
          const colon = line.indexOf(":");
          const field = colon < 0 ? line : line.slice(0, colon);
          const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
          if (field === "event") event = value;
          else if (field === "data") data.push(value);
        }
      }
    }
    // An event without its closing blank line was cut off and is not dispatched.
  } finally {
    if (!finished) await reader.cancel().catch(() => {});
  }
}

const RETRY = new Set([
  "rate_limited",
  "provider_unavailable",
  "provider_timeout",
  "output_invalid",
  "service_unavailable",
  "internal_error",
  "invalid_response",
  "network",
  "cancelled",
]);
const EDIT = new Set(["input_blocked", "input_too_long", "input_empty"]);

const messages: Record<string, { de: string; en: string }> = {
  llm_paused: {
    de: "Die KI macht gerade Pause. Du kannst trotzdem weitermachen.",
    en: "The AI is taking a break right now. You can still carry on.",
  },
  allowance_exhausted: {
    de: "Dein KI-Kontingent ist gerade aufgebraucht. Du kannst trotzdem weitermachen.",
    en: "Your AI allowance is used up for now. You can still carry on.",
  },
  lesson_budget_exhausted: {
    de: "In dieser Lektion ist die KI für heute ausgeschöpft. Du kannst trotzdem weitermachen.",
    en: "The AI is used up for this lesson today. You can still carry on.",
  },
  model_not_in_plan: {
    de: "Dieses Modell gibt es mit Premium. Du kannst trotzdem weitermachen.",
    en: "This model comes with Premium. You can still carry on.",
  },
  email_not_verified: {
    de: "Bestätige zuerst deine E-Mail-Adresse, dann ist die KI dabei. Du kannst trotzdem weitermachen.",
    en: "Confirm your email address first to use the AI. You can still carry on.",
  },
  session: {
    de: "Deine Anmeldung ist abgelaufen. Du kannst trotzdem weitermachen.",
    en: "Your sign-in has expired. You can still carry on.",
  },
  request_already_done: {
    de: "Diese Antwort ist nicht mehr abrufbar. Du kannst trotzdem weitermachen.",
    en: "This answer is no longer available. You can still carry on.",
  },
  rate_limited: {
    de: "Kurz durchatmen, gleich kannst du es nochmal versuchen.",
    en: "Take a breath, you can try again in a moment.",
  },
  input_blocked: {
    de: "Darauf antwortet die KI hier nicht. Formulier es bitte anders.",
    en: "The AI won't answer that here. Please phrase it differently.",
  },
  input_too_long: {
    de: "Das ist zu lang für diese Aufgabe. Kürz es bitte etwas.",
    en: "That's too long for this task. Please shorten it a little.",
  },
  input_empty: {
    de: "Schreib zuerst deine Antwort.",
    en: "Write your answer first.",
  },
  cancelled: { de: "Abgebrochen.", en: "Cancelled." },
  retry: {
    de: "Die KI antwortet gerade nicht. Versuch es gleich nochmal.",
    en: "The AI isn't answering right now. Try again in a moment.",
  },
  fallback: {
    de: "Die KI ist hier gerade nicht verfügbar. Du kannst trotzdem weitermachen.",
    en: "The AI isn't available here right now. You can still carry on.",
  },
};

const labels: Record<LlmLabelKind, { de: string; en: string }> = {
  live: { de: "KI-Antwort", en: "AI answer" },
  example: { de: "Vorbereitete Beispielantwort", en: "Prepared example answer" },
  grading: { de: "KI-Bewertung, kann irren", en: "AI grading, may be wrong" },
};

const language = (locale: string) => (locale.startsWith("de") ? "de" : "en");

/**
 * The module-facing error. Every code lets the lesson continue: `fallback` means the
 * prepared example is the way on, `retryable` that pressing again may help.
 */
export function llmError(
  code: string,
  locale: string,
  extra: { retryAfterMs?: unknown; resetsAt?: unknown } = {}
): LlmError {
  const retryable = RETRY.has(code);
  const fallback = !retryable && !EDIT.has(code);
  const text = messages[code] || messages[retryable ? "retry" : "fallback"];
  return {
    code,
    fallback,
    retryable,
    ...(typeof extra.retryAfterMs === "number" && extra.retryAfterMs >= 0
      ? { retryAfterMs: extra.retryAfterMs }
      : {}),
    ...(typeof extra.resetsAt === "string" ? { resetsAt: extra.resetsAt } : {}),
    message: text[language(locale)],
  };
}

class HostError extends Error {
  constructor(
    readonly code: string,
    readonly extra: { retryAfterMs?: unknown; resetsAt?: unknown } = {}
  ) {
    super(code);
  }
}

const status = (error: any) => error?.statusCode || error?.status || error?.response?.status;
const isAbort = (error: any) => error?.name === "AbortError";

function grantError(error: unknown) {
  if (isAbort(error)) return new HostError("cancelled");
  const code = status(error);
  if (code === 401) return new HostError("session");
  if (code === 403) return new HostError("no_entitlement");
  // 404: this activity has no LLM profiles; 503: the grant service has no key.
  if (code === 404 || code === 503) return new HostError("llm_unavailable");
  if (code && code >= 400 && code < 500) return new HostError("llm_unavailable");
  return new HostError("network");
}

async function errorBody(response: Response) {
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    /* nginx or a proxy answered without our error body */
  }
  const code =
    typeof body?.code === "string"
      ? body.code
      : response.status === 401
        ? "unauthenticated"
        : response.status >= 500
          ? "provider_unavailable"
          : "invalid_response";
  return {
    status: response.status,
    code,
    retryAfterMs: body?.retry_after_ms,
    resetsAt: body?.details?.resets_at,
  };
}

const TEXT_TYPES = new Set(["text", "refusal"]);
const STATUSES = new Set(["completed", "truncated", "refused", "blocked"]);

/** A validated server result; the signed verdict stays inside the host. */
interface ServerResult {
  requestId: string;
  status: LlmOutput["status"];
  model: { alias: string; id: string };
  outputs: any[];
  usage: Record<string, number>;
  redacted: boolean;
}

function serverResult(value: any): ServerResult {
  if (
    typeof value?.request_id !== "string" ||
    !STATUSES.has(value.status) ||
    typeof value.model?.alias !== "string" ||
    typeof value.model?.id !== "string" ||
    !Array.isArray(value.outputs) ||
    !value.usage ||
    typeof value.usage !== "object"
  )
    throw new HostError("invalid_response");
  return {
    requestId: value.request_id,
    status: value.status,
    model: { alias: value.model.alias, id: value.model.id },
    outputs: value.outputs,
    usage: value.usage,
    redacted: value.redacted === true,
  };
}

const count = (value: unknown) => (typeof value === "number" && value >= 0 ? value : 0);

function grading(value: any) {
  const g = value?.grading;
  if (
    !g ||
    !["pass", "fail"].includes(g.verdict) ||
    typeof g.reason !== "string" ||
    !Array.isArray(g.criteria)
  )
    return null;
  return {
    passed: g.verdict === "pass",
    score: count(g.score),
    maxScore: count(g.max_score),
    passScore: count(g.pass_score),
    reason: g.reason,
    criteria: g.criteria.map((criterion: any) => ({
      id: String(criterion?.id ?? ""),
      met: criterion?.met === true,
      points: count(criterion?.points),
      evidence: typeof criterion?.evidence === "string" ? criterion.evidence : "",
    })),
    receipt: typeof g.receipt === "string" && g.receipt ? (g.receipt as string) : null,
  };
}

/** Public outputs only: a grading output loses its signed verdict and becomes plain JSON. */
function publicOutput(output: any): LlmOutput {
  const sample = count(output?.sample);
  const outputStatus = STATUSES.has(output?.status) ? output.status : "completed";
  if (output?.type === "json")
    return {
      sample,
      status: outputStatus,
      type: "json",
      json: JSON.parse(JSON.stringify(output.json ?? null)),
    };
  if (output?.type === "grading") {
    const { receipt: _receipt, ...rest } = grading(output) || { receipt: null };
    return { sample, status: outputStatus, type: "json", json: rest };
  }
  return {
    sample,
    status: outputStatus,
    type: TEXT_TYPES.has(output?.type) ? output.type : "text",
    text: typeof output?.text === "string" ? output.text : "",
  };
}

export type LlmSend = (
  path: string,
  init: {
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
    signal: AbortSignal;
  },
  renew: boolean
) => Promise<Response>;

const MAX_RECONNECTS = 3;
/** A running call is polled about once a second, at most as long as the gateway lets it run. */
const MAX_POLLS = 180;

function linked(...signals: (AbortSignal | undefined)[]) {
  const controller = new AbortController();
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) controller.abort();
    else
      signal.addEventListener("abort", () => controller.abort(), {
        once: true,
        signal: controller.signal,
      });
  }
  return controller;
}

function defaultWait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new HostError("cancelled"));
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new HostError("cancelled"));
      },
      { once: true }
    );
  });
}

/**
 * `host.llm` for one activity. The host holds token, grant and the signed verdict;
 * modules only get copies of public results.
 */
export function createLearningLlm(options: {
  unitId: string;
  courseId?: string | null;
  locale: () => string;
  /** skills-ms JSON calls through the learning transport. */
  request: LearningRequest;
  /** llm-ms calls with the learner's access token; `renew` forces a token refresh first. */
  send: LlmSend;
  /** Ends with the activity; late answers are dropped. */
  signal: AbortSignal;
  document?: Document;
  id?: () => string;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
  now?: () => number;
}) {
  const id = options.id || (() => crypto.randomUUID());
  const wait = options.wait || defaultWait;
  const now = options.now || Date.now;
  let grant: { value: string; profiles: string[]; expires: number } | null = null;
  let granting: Promise<NonNullable<typeof grant>> | null = null;
  let grader: Promise<string | null> | null = null;
  let proof: { text: string; verdict: string } | null = null;

  function currentGrant(stale?: string) {
    if (grant && grant.value !== stale && grant.expires - 60000 > now())
      return Promise.resolve(grant);
    granting ||= (async () => {
      try {
        const response = await options.request(
          `/skills/rooms/${encodeURIComponent(options.unitId)}/llm-grant${
            options.courseId ? `?course=${encodeURIComponent(options.courseId)}` : ""
          }`,
          "POST"
        );
        const expires = Date.parse(response?.expires_at);
        if (
          typeof response?.grant !== "string" ||
          !response.grant ||
          !Array.isArray(response.profiles) ||
          !Number.isFinite(expires)
        )
          throw new HostError("llm_unavailable");
        grant = { value: response.grant, profiles: response.profiles.map(String), expires };
        return grant;
      } catch (error) {
        throw error instanceof HostError ? error : grantError(error);
      } finally {
        granting = null;
      }
    })();
    return granting;
  }

  /** One gateway call with token and grant renewal and reconnects under the same request id. */
  async function call(
    request: LlmRequest,
    signal: AbortSignal,
    onDelta?: (delta: { sample: number; text: string }) => void
  ): Promise<ServerResult> {
    if (
      !request ||
      typeof request.profile !== "string" ||
      !Array.isArray(request.input) ||
      !request.input.every(
        (message) =>
          ["user", "assistant"].includes(message?.role) && typeof message?.content === "string"
      )
    )
      throw new HostError("invalid_request");
    const requestId = id();
    const body = JSON.parse(
      JSON.stringify({
        request_id: requestId,
        profile: request.profile,
        ...(request.model ? { model: request.model } : {}),
        locale: language(options.locale()),
        input: request.input.map(({ role, content }) => ({ role, content })),
        ...(request.variables ? { variables: request.variables } : {}),
        ...(request.params ? { params: request.params } : {}),
      })
    );
    const accept = onDelta ? "text/event-stream" : "application/json";
    // Joining a call replays its deltas from the start; forward only what is new.
    const delivered = new Map<number, string>();
    const deliver = (sample: number, text: string) => {
      if (signal.aborted || !onDelta || !text) return;
      delivered.set(sample, (delivered.get(sample) || "") + text);
      onDelta({ sample, text });
    };
    let current = await currentGrant();
    let renewToken = false;
    let renewedToken = false;
    let renewedGrant = false;
    let joined = false;
    let reconnects = 0;
    let polls = 0;
    const reconnect = async (ms: number) => {
      if (reconnects >= MAX_RECONNECTS) return false;
      reconnects++;
      joined = true;
      await wait(ms, signal);
      return true;
    };
    for (;;) {
      if (signal.aborted) throw new HostError("cancelled");
      let response: Response;
      const seen = new Map<number, string>();
      try {
        response = joined
          ? await options.send(
              `/llm/v1/requests/${encodeURIComponent(requestId)}`,
              { method: "GET", headers: { Accept: accept }, signal },
              renewToken
            )
          : await options.send(
              "/llm/v1/respond",
              {
                method: "POST",
                headers: { Accept: accept, "Content-Type": "application/json" },
                body: JSON.stringify({ ...body, grant: current.value }),
                signal,
              },
              renewToken
            );
        renewToken = false;
        if (!response.ok) {
          const error = await errorBody(response);
          if (error.status === 401 && !renewedToken) {
            renewedToken = renewToken = true;
            continue;
          }
          if (["grant_invalid", "grant_expired"].includes(error.code) && !renewedGrant) {
            renewedGrant = true;
            current = await currentGrant(current.value);
            joined = false;
            continue;
          }
          if (error.code === "request_in_progress" && polls < MAX_POLLS) {
            polls++;
            joined = true;
            await wait(count(error.retryAfterMs) || 1000, signal);
            continue;
          }
          // The first POST never arrived: send it again under the same id.
          if (error.code === "request_unknown" && joined) {
            joined = false;
            continue;
          }
          throw new HostError(error.code === "unauthenticated" ? "session" : error.code, error);
        }
        if (!(response.headers.get("content-type") || "").includes("text/event-stream")) {
          const result = serverResult(await response.json());
          catchUp(result.outputs, delivered, deliver);
          return result;
        }
        if (!response.body) throw new HostError("invalid_response");
        for await (const event of readSse(response.body)) {
          if (signal.aborted) throw new HostError("cancelled");
          let data: any;
          try {
            data = JSON.parse(event.data);
          } catch {
            throw new HostError("invalid_response");
          }
          if (event.event === "delta" && typeof data?.text === "string") {
            const sample = count(data.sample);
            const text = (seen.get(sample) || "") + data.text;
            seen.set(sample, text);
            const already = delivered.get(sample) || "";
            if (text.length > already.length && text.startsWith(already))
              deliver(sample, text.slice(already.length));
          } else if (event.event === "done") {
            const result = serverResult({ request_id: requestId, ...data });
            catchUp(result.outputs, delivered, deliver);
            return result;
          } else if (event.event === "error") {
            throw new HostError(
              typeof data?.code === "string" ? data.code : "provider_unavailable",
              {
                retryAfterMs: data?.retry_after_ms,
                resetsAt: data?.details?.resets_at,
              }
            );
          }
        }
        // The stream ended without `done` or `error`: the connection dropped.
        if (await reconnect(500 * 2 ** reconnects)) continue;
        throw new HostError("network");
      } catch (error) {
        if (signal.aborted || isAbort(error)) throw new HostError("cancelled");
        if (error instanceof HostError) throw error;
        if (status(error) === 401) throw new HostError("session");
        if (await reconnect(500 * 2 ** reconnects)) continue;
        throw new HostError("network");
      }
    }
  }

  function catchUp(
    outputs: any[],
    delivered: Map<number, string>,
    deliver: (sample: number, text: string) => void
  ) {
    for (const output of outputs) {
      if (!TEXT_TYPES.has(output?.type) || typeof output.text !== "string") continue;
      const already = delivered.get(count(output.sample)) || "";
      if (output.text.length > already.length && output.text.startsWith(already))
        deliver(count(output.sample), output.text.slice(already.length));
    }
  }

  const failure = (error: unknown) =>
    llmError(
      error instanceof HostError ? error.code : isAbort(error) ? "cancelled" : "network",
      options.locale(),
      error instanceof HostError ? error.extra : {}
    );

  async function info(profile: string) {
    if (typeof profile !== "string" || options.signal.aborted) return null;
    const signal = options.signal;
    try {
      let current = await currentGrant();
      let renew = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await options.send(
          `/llm/v1/profiles/${encodeURIComponent(profile)}`,
          {
            method: "GET",
            headers: { Accept: "application/json", "X-LLM-Grant": current.value },
            signal,
          },
          renew
        );
        renew = false;
        if (response.ok) {
          const value = await response.json();
          return value && typeof value === "object" && !Array.isArray(value)
            ? (JSON.parse(JSON.stringify(value)) as Record<string, unknown>)
            : null;
        }
        const error = await errorBody(response);
        if (error.status === 401) renew = true;
        else if (["grant_invalid", "grant_expired"].includes(error.code))
          current = await currentGrant(current.value);
        else return null;
      }
    } catch {
      /* Unknown info is not an error for the lesson; it keeps its own defaults. */
    }
    return null;
  }

  function gradingProfile() {
    grader ||= (async () => {
      const { profiles } = await currentGrant();
      const found: string[] = [];
      let unanswered = false;
      for (const profile of profiles) {
        const value: any = await info(profile);
        if (!value) unanswered = true;
        else if (value.output?.type === "grading") found.push(profile);
      }
      // Remember only a complete answer; a network hiccup is asked again next time.
      if (unanswered && found.length !== 1) grader = null;
      return found.length === 1 ? found[0] : null;
    })().catch((error) => {
      grader = null;
      throw error;
    });
    return grader;
  }

  return {
    info,
    async respond(
      request: LlmRequest,
      respondOptions: {
        onDelta?: (delta: { sample: number; text: string }) => void;
        signal?: AbortSignal;
      } = {}
    ): Promise<LlmResult> {
      const listen = linked(options.signal, respondOptions.signal);
      const onDelta =
        typeof respondOptions.onDelta === "function"
          ? (delta: { sample: number; text: string }) => {
              try {
                respondOptions.onDelta!({ ...delta });
              } catch {
                /* A faulty module callback must not break the host's stream. */
              }
            }
          : undefined;
      try {
        const result = await call(request, listen.signal, onDelta);
        if (listen.signal.aborted) throw new HostError("cancelled");
        return {
          ok: true,
          requestId: result.requestId,
          status: result.status,
          outputs: result.outputs.map(publicOutput),
          usage: {
            input_tokens: count(result.usage.input_tokens),
            cached_input_tokens: count(result.usage.cached_input_tokens),
            output_tokens: count(result.usage.output_tokens),
            reasoning_tokens: count(result.usage.reasoning_tokens),
          },
          model: result.model,
          redacted: result.redacted,
        };
      } catch (error) {
        return { ok: false, error: failure(error) };
      } finally {
        listen.abort();
      }
    },
    async grade(
      answer: string,
      gradeOptions: { profile?: string; signal?: AbortSignal } = {}
    ): Promise<LlmGradeResult> {
      proof = null;
      const listen = linked(options.signal, gradeOptions.signal);
      try {
        if (typeof answer !== "string" || !answer.trim()) throw new HostError("input_empty");
        const profile = gradeOptions.profile ?? (await gradingProfile());
        if (!profile) throw new HostError("llm_unavailable");
        const result = await call(
          { profile, input: [{ role: "user", content: answer }] },
          listen.signal
        );
        if (listen.signal.aborted) throw new HostError("cancelled");
        const graded = grading(result.outputs.find((output) => output?.type === "grading"));
        if (!graded) {
          if (result.status === "blocked") throw new HostError("input_blocked");
          throw new HostError("output_invalid");
        }
        // Only a signed pass counts; the fake provider and practice profiles sign nothing.
        const counts = graded.passed && !!graded.receipt;
        if (counts) proof = { text: answer, verdict: graded.receipt! };
        return {
          ok: true,
          passed: graded.passed,
          counts,
          score: graded.score,
          maxScore: graded.maxScore,
          passScore: graded.passScore,
          reason: graded.reason,
          criteria: graded.criteria,
          model: result.model,
        };
      } catch (error) {
        return { ok: false, error: failure(error) };
      } finally {
        listen.abort();
      }
    },
    label(kind: LlmLabelKind = "live") {
      const doc = options.document || globalThis.document;
      const text = (labels[kind] || labels.live)[language(options.locale())];
      const element = doc.createElement("span");
      element.dataset.academyAiLabel = kind in labels ? kind : "live";
      element.textContent = text;
      element.setAttribute(
        "style",
        "display:inline-block;padding:0.1em 0.55em;border:1px solid currentColor;" +
          "border-radius:999px;font-size:0.75rem;font-weight:600;line-height:1.6;" +
          "white-space:nowrap;opacity:0.85"
      );
      return element;
    },
    /** The last counting verdict with its exact text, for one completion. */
    takeProof() {
      const taken = proof;
      proof = null;
      return taken;
    },
  };
}
