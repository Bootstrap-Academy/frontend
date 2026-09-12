import type { ExerciseReference, ExerciseView, LearningRequest } from "../types/learningRooms";

const segment = encodeURIComponent;
export function exercisePath(reference: ExerciseReference) {
  const resource = {
    multiple_choice: "multiple_choice",
    matching: "matchings",
    coding: "coding_challenges",
  }[reference.type];
  if (!resource || !reference.task_id || !reference.subtask_id)
    throw new Error("Invalid exercise reference");
  return `/challenges/tasks/${segment(reference.task_id)}/${resource}/${segment(reference.subtask_id)}`;
}

export function learningError(error: any) {
  const code = error?.data?.error || error?.data?.detail?.code;
  if (code === "not_enough_hearts") return "NoHearts";
  if (
    code === "not_enough_coins" ||
    code === "permission_denied" ||
    code === "subtask_access_denied"
  )
    return "NoAccess";
  if (code === "too_many_requests" || error?.status === 429 || error?.statusCode === 429)
    return "Wait";
  if (error?.status === 401 || error?.statusCode === 401) return "Session";
  return "RequestError";
}

export function createLearningExercise(options: {
  request: LearningRequest;
  changed: (view: ExerciseView) => void;
  persistSubmission: (unknown: boolean, id?: string, attemptId?: string) => Promise<boolean>;
  heartsChanged?: (info: any) => void;
  wait?: () => Promise<void>;
  maxPolls?: number;
}) {
  const empty = (): ExerciseView => ({
    data: null,
    environments: [],
    examples: [],
    premium: null,
    phase: "idle",
    error: "",
    submissionId: null,
    result: null,
    posting: false,
  });
  let view = empty();
  let generation = 0;
  let alive = true;
  let reference: ExerciseReference | null = null;
  let polling = false;
  let sending = false;
  let dispatched = false;
  let checking = false;
  let userId = "";
  let reviewId: string | undefined;
  let currentAttemptId: string | undefined;
  let heartRefresh = 0;
  const publish = () => options.changed({ ...view });
  const current = (ticket: number) => alive && ticket === generation;
  const wait = options.wait || (() => new Promise<void>((resolve) => setTimeout(resolve, 2000)));
  const maxPolls = options.maxPolls ?? 30;

  async function refreshHearts(ticket: number) {
    if (!current(ticket) || !options.heartsChanged) return;
    const refresh = ++heartRefresh;
    try {
      const info = await options.request(`/shop/hearts/${segment(userId)}`);
      if (current(ticket) && refresh === heartRefresh && Number.isFinite(info?.hearts))
        options.heartsChanged(info);
    } catch {
      // A failed display refresh must not affect or repeat the submitted attempt.
    }
  }

  async function poll(ticket: number) {
    if (!current(ticket) || polling || !reference) return;
    const coding = reference.type === "coding";
    const attemptId = coding ? view.submissionId : currentAttemptId;
    if (!attemptId) return;
    polling = true;
    // The detail endpoint returns source code only. Verdicts are exposed in the
    // current user's list; never infer success from its first/latest entry.
    const path = `${exercisePath(reference)}/${coding ? "submissions" : `attempts/${segment(attemptId)}`}`;
    try {
      for (let i = 0; i < maxPolls; i++) {
        if (!current(ticket)) return;
        const data = await options.request(path);
        if (!current(ticket)) return;
        if (coding && !Array.isArray(data)) throw new Error("Invalid submissions");
        const response = coding
          ? data.find((submission: any) => submission?.id === attemptId)
          : data;
        if (
          !coding &&
          (response?.id !== attemptId ||
            response.task_id !== reference.task_id ||
            response.subtask_id !== reference.subtask_id ||
            typeof response.solved !== "boolean")
        )
          throw new Error("Invalid attempt");
        if (coding ? response?.result?.verdict : typeof response?.solved === "boolean") {
          view.result = coding ? response.result : { solved: response.solved };
          if (response.hearts_pending === true) {
            view.phase = "pending";
            publish();
            if (i + 1 < maxPolls) await wait();
            continue;
          }
          view.posting = true;
          publish();
          await refreshHearts(ticket);
          if (!current(ticket)) return;
          view.posting = false;
          const correct = coding ? response.result.verdict === "OK" : response.solved;
          view.phase = correct ? "correct" : "incorrect";
          view.error = "";
          publish();
          return;
        }
        if (i + 1 < maxPolls) await wait();
      }
      if (current(ticket)) {
        view.phase = "pending";
        view.error = view.result ? "HeartsPending" : "StillRunning";
        publish();
      }
    } catch (error) {
      if (current(ticket)) {
        view.phase = "pending";
        view.error = learningError(error);
        publish();
      }
    } finally {
      if (current(ticket)) {
        polling = false;
        view.posting = false;
        publish();
      }
    }
  }

  return {
    reset() {
      generation++;
      polling = false;
      sending = false;
      dispatched = false;
      checking = false;
      reference = null;
      currentAttemptId = undefined;
      view = empty();
      publish();
    },
    async load(
      next: ExerciseReference,
      nextUserId: string,
      submissionId?: string,
      submissionUnknown = false,
      nextReviewId?: string,
      attemptId?: string
    ) {
      const ticket = ++generation;
      polling = false;
      sending = false;
      dispatched = false;
      checking = false;
      reference = next;
      userId = nextUserId;
      reviewId = nextReviewId;
      currentAttemptId = attemptId;
      view = { ...empty(), phase: "loading" };
      publish();
      try {
        const path = exercisePath(next);
        const [data, premium, environments, examples] = await Promise.all([
          options.request(path),
          options.request(`/shop/premium/${segment(userId)}`),
          next.type === "coding" ? options.request("/challenges/executor/environments") : {},
          next.type === "coding" ? options.request(`${path}/examples`) : [],
        ]);
        if (!current(ticket)) return;
        if (
          !data ||
          data.id !== next.subtask_id ||
          data.task_id !== next.task_id ||
          data.retired === true ||
          data.enabled !== true ||
          data.creator === userId ||
          typeof premium?.premium !== "boolean"
        )
          throw new Error("Unavailable exercise");
        view.data = data;
        view.premium = premium.premium;
        view.environments = Object.keys(environments || {});
        view.examples = Array.isArray(examples) ? examples : [];
        const alreadySolved = data.solved && !reviewId;
        view.phase = alreadySolved ? "correct" : submissionUnknown ? "uncertain" : "ready";
        view.error = submissionUnknown && !alreadySolved ? "Uncertain" : "";
        view.submissionId = submissionUnknown ? null : submissionId || null;
        publish();
        if (attemptId && !submissionUnknown && !alreadySolved && next.type !== "coding") {
          view.phase = "pending";
          publish();
          await poll(ticket);
        }
        if (submissionId && !submissionUnknown && next.type === "coding" && !alreadySolved) {
          view.phase = "pending";
          publish();
          await poll(ticket);
        }
      } catch (error) {
        if (current(ticket)) {
          view.phase = "error";
          view.error = learningError(error);
          publish();
        }
      }
    },
    async submit(body: unknown) {
      if (!alive || sending || !reference || !["ready", "incorrect"].includes(view.phase)) return;
      const ticket = generation;
      const path = exercisePath(reference);
      const coding = reference.type === "coding";
      let heartsRefreshed = Promise.resolve();
      sending = true;
      dispatched = false;
      view.phase = "preparing";
      view.error = "";
      view.result = null;
      publish();
      try {
        // The answer and uncertainty marker must survive reload before dispatch.
        if (!(await options.persistSubmission(true))) {
          if (current(ticket)) {
            view.phase = "uncertain";
            view.error = "SaveError";
            publish();
          }
          return;
        }
        if (!current(ticket)) return;
        view.submissionId = null;
        currentAttemptId = undefined;
        view.phase = "submitting";
        view.posting = true;
        dispatched = true;
        publish();
        // Exactly one mutation. Network failure must never replay a paid attempt.
        let response;
        try {
          response = await options.request(
            `${path}/${coding ? "submissions" : "attempts"}`,
            "POST",
            body
          );
        } finally {
          // Start immediately, but persist the submission ID before waiting.
          // A lost response may still have cost hearts; read the server balance.
          heartsRefreshed = refreshHearts(ticket);
        }
        if (!current(ticket)) return;
        // Keep room navigation locked until its shared counter is synchronized.
        if (!options.heartsChanged) view.posting = false;
        if (coding) {
          if (!response?.id || typeof response.id !== "string")
            throw new Error("Unknown submission");
          view.submissionId = response.id;
          view.phase = "preparing";
          publish();
          await options.persistSubmission(false, response.id);
          await heartsRefreshed;
          if (!current(ticket)) return;
          view.posting = false;
          view.phase = "pending";
          publish();
          await poll(ticket);
        } else {
          if (typeof response?.solved !== "boolean") throw new Error("Unknown result");
          if (reviewId && typeof response.attempt_id !== "string")
            throw new Error("Unknown attempt");
          currentAttemptId = response.attempt_id;
          view.phase = "preparing";
          publish();
          if (!(await options.persistSubmission(false, undefined, response.attempt_id)))
            throw new Error("Attempt was not saved");
          await heartsRefreshed;
          if (!current(ticket)) return;
          view.posting = false;
          if (response.hearts_pending === true) {
            if (!currentAttemptId) throw new Error("Unknown pending attempt");
            view.phase = "pending";
            view.result = { solved: response.solved };
            publish();
            await poll(ticket);
            return;
          }
          view.phase = response.solved ? "correct" : "incorrect";
          publish();
        }
      } catch (error: any) {
        await heartsRefreshed;
        if (!current(ticket)) return;
        view.posting = false;
        // A known 4xx refusal did not create an attempt; a lost/5xx response may have.
        const status = error?.statusCode || error?.status || error?.response?.status;
        const refused = status >= 400 && status < 500 && status !== 408;
        view.phase = refused ? "preparing" : "uncertain";
        publish();
        if (refused) {
          await options.persistSubmission(false);
          if (!current(ticket)) return;
          view.phase = "ready";
        }
        view.error = view.phase === "uncertain" ? "Uncertain" : learningError(error);
        publish();
      } finally {
        if (current(ticket)) {
          sending = false;
          view.posting = false;
          publish();
        }
      }
    },
    async check() {
      const ticket = generation;
      if (!alive || checking || sending || !reference) return;
      if (view.phase !== "uncertain") {
        await poll(ticket);
        return;
      }
      // An old solved flag cannot confirm a new review whose response was lost.
      if (reviewId) return;
      checking = true;
      try {
        const response = await options.request(exercisePath(reference));
        if (!current(ticket)) return;
        if (
          response?.id === reference.subtask_id &&
          response?.task_id === reference.task_id &&
          response.solved === true
        ) {
          await options.persistSubmission(false);
          if (!current(ticket)) return;
          view.data = response;
          view.phase = "correct";
          view.error = "";
        } else view.error = "Uncertain";
        publish();
      } catch (error) {
        if (current(ticket)) {
          view.error = learningError(error);
          publish();
        }
      } finally {
        if (current(ticket)) checking = false;
      }
    },
    cancelPreparation() {
      if (!sending || dispatched || view.phase !== "preparing") return;
      generation++;
      sending = false;
      view.phase = "ready";
      view.error = "";
      publish();
    },
    async newAttempt() {
      if (!alive || sending || checking || view.phase !== "uncertain") return;
      const ticket = generation;
      sending = true;
      try {
        if (!(await options.persistSubmission(false)) || !current(ticket)) return;
        view.submissionId = null;
        view.phase = "ready";
        view.error = "";
        publish();
      } finally {
        if (current(ticket)) sending = false;
      }
    },
    dispose() {
      alive = false;
      generation++;
      polling = false;
      sending = false;
      dispatched = false;
      checking = false;
      reference = null;
      view = empty();
      publish();
    },
  };
}
