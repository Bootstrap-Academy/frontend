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
  persistSubmission: (unknown: boolean, id?: string) => Promise<boolean>;
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
  const publish = () => options.changed({ ...view });
  const current = (ticket: number) => alive && ticket === generation;
  const wait = options.wait || (() => new Promise<void>((resolve) => setTimeout(resolve, 2000)));
  const maxPolls = options.maxPolls ?? 30;

  async function poll(ticket: number) {
    if (!current(ticket) || polling || !reference || !view.submissionId) return;
    polling = true;
    const submissionId = view.submissionId;
    // The detail endpoint returns source code only. Verdicts are exposed in the
    // current user's list; never infer success from its first/latest entry.
    const path = `${exercisePath(reference)}/submissions`;
    try {
      for (let i = 0; i < maxPolls; i++) {
        if (!current(ticket)) return;
        const submissions = await options.request(path);
        if (!current(ticket)) return;
        if (!Array.isArray(submissions)) throw new Error("Invalid submissions");
        const response = submissions.find((submission) => submission?.id === submissionId);
        if (response?.result?.verdict) {
          view.result = response.result;
          view.phase = response.result.verdict === "OK" ? "correct" : "incorrect";
          view.error = "";
          publish();
          return;
        }
        if (i + 1 < maxPolls) await wait();
      }
      if (current(ticket)) {
        view.phase = "pending";
        view.error = "StillRunning";
        publish();
      }
    } catch (error) {
      if (current(ticket)) {
        view.phase = "pending";
        view.error = learningError(error);
        publish();
      }
    } finally {
      if (current(ticket)) polling = false;
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
      view = empty();
      publish();
    },
    async load(
      next: ExerciseReference,
      userId: string,
      submissionId?: string,
      submissionUnknown = false
    ) {
      const ticket = ++generation;
      polling = false;
      sending = false;
      dispatched = false;
      checking = false;
      reference = next;
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
        view.phase = data.solved ? "correct" : submissionUnknown ? "uncertain" : "ready";
        view.error = submissionUnknown && !data.solved ? "Uncertain" : "";
        view.submissionId = submissionUnknown ? null : submissionId || null;
        publish();
        if (submissionId && !submissionUnknown && next.type === "coding" && !data.solved) {
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
        view.phase = "submitting";
        view.posting = true;
        dispatched = true;
        publish();
        // Exactly one mutation. Network failure must never replay a paid attempt.
        const response = await options.request(
          `${path}/${coding ? "submissions" : "attempts"}`,
          "POST",
          body
        );
        if (!current(ticket)) return;
        view.posting = false;
        if (coding) {
          if (!response?.id || typeof response.id !== "string")
            throw new Error("Unknown submission");
          view.submissionId = response.id;
          view.phase = "preparing";
          publish();
          await options.persistSubmission(false, response.id);
          if (!current(ticket)) return;
          view.phase = "pending";
          publish();
          await poll(ticket);
        } else {
          if (typeof response?.solved !== "boolean") throw new Error("Unknown result");
          view.phase = "preparing";
          publish();
          await options.persistSubmission(false);
          if (!current(ticket)) return;
          view.phase = response.solved ? "correct" : "incorrect";
          publish();
        }
      } catch (error: any) {
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
