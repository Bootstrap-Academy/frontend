import type {
  Plan,
  PlanCharacter,
  PlanCourseStep,
  PlanDraft,
  PlanExternalStep,
  PlanMutation,
  PlanNext,
  PlanPreference,
  PlanState,
  PlanStateStep,
  PlanStep,
  PlanSuggestion,
  StepStatus,
  Track,
  TrackItem,
  TrackStage,
} from "../types/learningPlan";

// "Dein Lernweg" (plan) and the curated "Lernpfade" (tracks): reading the answers of skills-ms,
// the changes a learner makes to the plan, and saving them one after another against the
// revision of the plan. The page only shows what this keeps.

export type PlanLanguage = "de" | "en";

export const PLAN_CHARACTERS: readonly PlanCharacter[] = ["einsteiger", "fortgeschritten", "profi"];
export const PLAN_PREFERENCES: readonly PlanPreference[] = ["breit", "tief"];
/** The kinds of stage that have their own symbol; any other kind is shown by its number. */
export const TRACK_STAGE_KINDS = [
  "fundamentals",
  "practitioner",
  "mastery",
  "refresher",
  "certification",
] as const;

type Raw = Record<string, unknown>;
const object = (value: unknown): value is Raw =>
  !!value && typeof value === "object" && !Array.isArray(value);
const name = (value: unknown) => (typeof value === "string" && value ? value : null);
/** A title arrives in the language of the request; a pair of both languages is read here as well. */
export function planText(value: unknown, language: PlanLanguage): string {
  if (typeof value === "string") return value;
  if (!object(value)) return "";
  for (const key of [language, "en", "de"])
    if (typeof value[key] === "string" && value[key]) return value[key] as string;
  return "";
}
const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
const status = (value: unknown): StepStatus =>
  value === "done" || value === "in_progress" ? value : "open";
const character = (value: unknown) =>
  PLAN_CHARACTERS.includes(value as PlanCharacter) ? (value as PlanCharacter) : null;
const preference = (value: unknown) =>
  PLAN_PREFERENCES.includes(value as PlanPreference) ? (value as PlanPreference) : null;
const url = (value: unknown) =>
  typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;

function readItem(raw: unknown, language: PlanLanguage): TrackItem | null {
  if (!object(raw)) return null;
  const title = planText(raw.title, language);
  const known = raw.status === undefined ? {} : { status: status(raw.status) };
  if (raw.type === "course" && name(raw.course))
    return {
      type: "course",
      course: raw.course as string,
      title: title || (raw.course as string),
      ...known,
    };
  if (raw.type === "external" && name(raw.id) && title)
    return { type: "external", id: raw.id as string, title, url: url(raw.url), ...known };
  return null;
}

function readStage(raw: unknown, language: PlanLanguage): TrackStage | null {
  if (!object(raw) || !name(raw.id)) return null;
  const id = raw.id as string;
  const months = count(raw.repeat_after_months);
  return {
    id,
    title: planText(raw.title, language) || id,
    kind: name(raw.kind) || "",
    repeat_after_months: months && months > 0 ? months : null,
    items: (Array.isArray(raw.items) ? raw.items : [])
      .map((item) => readItem(item, language))
      .filter((item): item is TrackItem => !!item),
  };
}

/** One path, or `null` for an answer that is not one. */
export function readTrack(raw: unknown, language: PlanLanguage): Track | null {
  if (!object(raw) || !name(raw.id)) return null;
  const id = raw.id as string;
  const provider = object(raw.provider) ? planText(raw.provider.name, language) : "";
  return {
    id,
    title: planText(raw.title, language) || id,
    description: planText(raw.description, language),
    provider: provider ? { name: provider, url: url((raw.provider as Raw).url) } : null,
    level: character(raw.level),
    stages: (Array.isArray(raw.stages) ? raw.stages : [])
      .map((stage) => readStage(stage, language))
      .filter((stage): stage is TrackStage => !!stage),
  };
}

export function readTracks(raw: unknown, language: PlanLanguage): Track[] {
  if (!Array.isArray(raw)) throw new Error("Invalid tracks");
  return raw.map((track) => readTrack(track, language)).filter((track): track is Track => !!track);
}

function readStep(raw: unknown, language: PlanLanguage): PlanStep | null {
  if (!object(raw)) return null;
  const origin = { track: name(raw.track), stage: name(raw.stage) };
  const title = planText(raw.title, language);
  if (raw.type === "course" && name(raw.course))
    return {
      type: "course",
      course: raw.course as string,
      title: title || (raw.course as string),
      ...origin,
      status: status(raw.status),
      done_units: count(raw.done_units),
      total_units: count(raw.total_units),
    };
  if (raw.type === "external" && name(raw.id))
    return {
      type: "external",
      id: raw.id as string,
      title: title || (raw.id as string),
      url: url(raw.url),
      ...origin,
      status: status(raw.status),
      self_confirmed: raw.self_confirmed === true,
    };
  return null;
}

/** The plan as the page shows it. Anything that is not a plan is refused. */
export function readPlan(raw: unknown, language: PlanLanguage): Plan {
  if (!object(raw) || count(raw.revision) === null || !Array.isArray(raw.steps))
    throw new Error("Invalid plan");
  const steps = raw.steps
    .map((step) => readStep(step, language))
    .filter((step): step is PlanStep => !!step);
  return {
    revision: raw.revision as number,
    character: character(raw.character),
    preference: preference(raw.preference),
    steps,
    // The first step that is not done; computed here as well, so a shown plan always agrees.
    next: planNext(steps),
  };
}

export function readSuggestions(raw: unknown, language: PlanLanguage): PlanSuggestion[] {
  if (!Array.isArray(raw)) throw new Error("Invalid suggestions");
  return raw.flatMap((item) =>
    object(item) && item.type === "course" && name(item.course)
      ? [
          {
            type: "course" as const,
            course: item.course as string,
            title: planText(item.title, language) || (item.course as string),
            reason: typeof item.reason === "string" ? item.reason : "",
            reason_course: name(item.reason_course),
            reason_track: name(item.reason_track),
          },
        ]
      : []
  );
}

/**
 * What makes a step this step: a course is on the plan once, an external step once per
 * stage of its path.
 */
export function planStepKey(
  step:
    | Pick<PlanCourseStep, "type" | "course">
    | Pick<PlanExternalStep, "type" | "id" | "track" | "stage">
) {
  return step.type === "course"
    ? `course:${step.course}`
    : `external:${step.track ?? ""}:${step.stage ?? ""}:${step.id}`;
}

export function planNext(steps: PlanStep[]): PlanNext | null {
  const step = steps.find((candidate) => candidate.status !== "done");
  if (!step) return null;
  return step.type === "course"
    ? { type: "course", course: step.course }
    : { type: "external", id: step.id };
}

export function planProgress(steps: PlanStep[]) {
  return { done: steps.filter((step) => step.status === "done").length, total: steps.length };
}

/** The step `next` names, with everything shown about it. */
export function planNextStep(plan: Pick<Plan, "steps">): PlanStep | null {
  return plan.steps.find((step) => step.status !== "done") ?? null;
}

export function planDraft(plan: Plan): PlanDraft {
  return { character: plan.character, preference: plan.preference, steps: [...plan.steps] };
}

/**
 * The draft as `PUT /skills/plan` takes it: a course with its path and stage both or neither,
 * an external step always with both, since only they name it.
 */
export function planState(draft: PlanDraft): PlanState {
  const steps: PlanStateStep[] = [];
  for (const step of draft.steps)
    if (step.type === "course")
      steps.push({
        type: "course",
        course: step.course,
        ...(step.track && step.stage ? { track: step.track, stage: step.stage } : {}),
      });
    else if (step.track && step.stage)
      steps.push({
        type: "external",
        track: step.track,
        stage: step.stage,
        id: step.id,
        done: step.status === "done",
      });
  return { character: draft.character, preference: draft.preference, steps };
}

const sameState = (a: PlanState, b: PlanState) => JSON.stringify(a) === JSON.stringify(b);

/** The plan as it will be once the server has the draft; the server's answer replaces it. */
export function projectPlan(base: Plan, draft: PlanDraft): Plan {
  return { revision: base.revision, ...draft, steps: draft.steps, next: planNext(draft.steps) };
}

/**
 * A change names the steps it touches, never their position, so that it means the same
 * after a reload with someone else's changes in it.
 */
export type PlanChange = (draft: PlanDraft) => PlanDraft;

export const choosePlanCharacter =
  (value: PlanCharacter): PlanChange =>
  (draft) => ({ ...draft, character: value });

export const choosePlanPreference =
  (value: PlanPreference): PlanChange =>
  (draft) => ({ ...draft, preference: value });

/**
 * Puts a step right before or after another one. Made once more on a plan that already has
 * it there, it changes nothing.
 */
export const placePlanStep =
  (key: string, anchor: string, side: "before" | "after"): PlanChange =>
  (draft) => {
    const moving = draft.steps.find((step) => planStepKey(step) === key);
    const rest = draft.steps.filter((step) => step !== moving);
    const at = rest.findIndex((step) => planStepKey(step) === anchor);
    if (!moving || at < 0) return draft;
    rest.splice(side === "before" ? at : at + 1, 0, moving);
    return rest.every((step, index) => step === draft.steps[index])
      ? draft
      : { ...draft, steps: rest };
  };

/** One place up or down, as the learner sees `steps`: past the neighbour shown there. */
export function movePlanStep(steps: PlanStep[], key: string, by: -1 | 1): PlanChange {
  const neighbour = steps[steps.findIndex((step) => planStepKey(step) === key) + by];
  return neighbour && planStepKey(neighbour) !== key
    ? placePlanStep(key, planStepKey(neighbour), by < 0 ? "before" : "after")
    : (draft) => draft;
}

export const removePlanStep =
  (key: string): PlanChange =>
  (draft) => ({ ...draft, steps: draft.steps.filter((step) => planStepKey(step) !== key) });

/** Adds at the end what is not on the plan yet; a course already planned keeps its place. */
export const addPlanSteps =
  (steps: PlanStep[]): PlanChange =>
  (draft) => {
    const planned = new Set(draft.steps.map(planStepKey));
    const added = steps.filter((step) => {
      const key = planStepKey(step);
      if (planned.has(key)) return false;
      planned.add(key);
      return true;
    });
    return added.length ? { ...draft, steps: [...draft.steps, ...added] } : draft;
  };

/** An external step is done when the learner says so. */
export const confirmPlanStep =
  (key: string, done: boolean): PlanChange =>
  (draft) => ({
    ...draft,
    steps: draft.steps.map((step) =>
      step.type === "external" && planStepKey(step) === key
        ? { ...step, status: done ? "done" : "open", self_confirmed: done }
        : step
    ),
  });

/** The steps of a whole path, or of one of its stages, as they go onto the plan. */
export function trackSteps(track: Track, stageId?: string): PlanStep[] {
  return track.stages
    .filter((stage) => !stageId || stage.id === stageId)
    .flatMap((stage) =>
      stage.items.map((item): PlanStep => {
        const origin = { track: track.id, stage: stage.id };
        const known = item.status ?? "open";
        return item.type === "course"
          ? {
              type: "course",
              course: item.course,
              title: item.title,
              ...origin,
              status: known,
              done_units: null,
              total_units: null,
            }
          : {
              type: "external",
              id: item.id,
              title: item.title,
              url: item.url,
              ...origin,
              status: known,
              self_confirmed: known === "done",
            };
      })
    );
}

/** A course on its own, as it goes onto the plan; the server's answer says how far it is. */
export function planCourseStep(course: string, title: string): PlanCourseStep {
  return {
    type: "course",
    course,
    title,
    track: null,
    stage: null,
    status: "open",
    done_units: null,
    total_units: null,
  };
}

export function suggestionStep(suggestion: PlanSuggestion): PlanCourseStep {
  return planCourseStep(suggestion.course, suggestion.title);
}

/** How much of a path, or of one stage, already lies on the plan. */
export function trackCoverage(track: Track, steps: PlanStep[], stageId?: string) {
  const planned = new Set(steps.map(planStepKey));
  const items = trackSteps(track, stageId);
  return {
    planned: items.filter((step) => planned.has(planStepKey(step))).length,
    total: items.length,
  };
}

/** The first stage with something that is not on the plan yet. */
export function openTrackStage(track: Track, steps: PlanStep[]) {
  return (
    track.stages.find((stage) => {
      const { planned, total } = trackCoverage(track, steps, stage.id);
      return planned < total;
    }) ?? null
  );
}

/** Where a planned step comes from: the path and its stage by name, when they are known. */
export function planStepOrigin(step: PlanStep, tracks: Track[]) {
  const track = step.track ? tracks.find((candidate) => candidate.id === step.track) : undefined;
  if (!track) return null;
  const stage = track.stages.find((candidate) => candidate.id === step.stage);
  return { track: track.title, stage: stage?.title ?? null };
}

/** The sentence of a suggestion as a text key with its values; an unknown reason has none. */
export function suggestionReason(
  suggestion: PlanSuggestion,
  titles: { course: (id: string) => string | undefined; track: (id: string) => string | undefined }
): { key: string; values: Record<string, string> } | null {
  if (suggestion.reason === "next_after") {
    const course = suggestion.reason_course ? titles.course(suggestion.reason_course) : undefined;
    return course
      ? { key: "LearningPlan.Reason.NextAfter", values: { course } }
      : { key: "LearningPlan.Reason.NextAfterKnown", values: {} };
  }
  if (suggestion.reason === "new_area") return { key: "LearningPlan.Reason.NewArea", values: {} };
  if (suggestion.reason === "deepen") return { key: "LearningPlan.Reason.Deepen", values: {} };
  if (suggestion.reason === "level_fit") return { key: "LearningPlan.Reason.LevelFit", values: {} };
  if (suggestion.reason === "in_track") {
    const track = suggestion.reason_track ? titles.track(suggestion.reason_track) : undefined;
    return track
      ? { key: "LearningPlan.Reason.InTrack", values: { track } }
      : { key: "LearningPlan.Reason.InSomeTrack", values: {} };
  }
  return null;
}

/** The HTTP status of a refused request, `null` when no answer arrived. */
export function planRequestStatus(error: unknown): number | null {
  if (!object(error)) return null;
  const response = object(error.response) ? error.response : {};
  const value = error.statusCode ?? error.status ?? response.status;
  return typeof value === "number" && value >= 400 && value <= 599 ? value : null;
}

export interface PlanView {
  status: "idle" | "loading" | "ready" | "error";
  /** The saved plan with the changes that are still on their way. */
  plan: Plan | null;
  saving: boolean;
  /** The last change did not reach the server; the plan shows what the server has. */
  failed: boolean;
}

type Pending = { change: PlanChange; done: (saved: boolean) => void };

/**
 * Keeps one learner's plan. Changes show at once and go to the server one after another, each
 * against the revision it was made on. When another tab or device saved in between (409), the
 * current plan is read again and the change is made once more on it, without a word to the
 * learner. A request that got no answer is sent again with the same `request_id`.
 */
export function createPlanEditor(options: {
  load: () => Promise<unknown>;
  save: (body: PlanMutation) => Promise<unknown>;
  read: (raw: unknown) => Plan;
  changed: (view: PlanView) => void;
  /** Called once the queue is empty again, with the plan the server has. */
  settled?: (plan: Plan) => void;
  id?: () => string;
  /** How often one change is made: the first time and after each conflict. */
  attempts?: number;
}) {
  const id = options.id || (() => crypto.randomUUID());
  const attempts = options.attempts ?? 4;
  let view: PlanView = { status: "idle", plan: null, saving: false, failed: false };
  let confirmed: Plan | null = null;
  let pending: Pending[] = [];
  let running = false;
  let generation = 0;
  let alive = true;
  const current = (ticket: number) => alive && ticket === generation;

  function publish() {
    if (alive) options.changed({ ...view });
  }
  function refresh() {
    view.plan = confirmed
      ? projectPlan(
          confirmed,
          pending.reduce((draft, item) => item.change(draft), planDraft(confirmed))
        )
      : null;
    view.saving = pending.length > 0;
    publish();
  }
  function drop() {
    const dropped = pending;
    pending = [];
    for (const item of dropped) item.done(false);
  }

  /** The plan a 409 carries (in `plan`, at the top or in `detail`); otherwise it is read again. */
  async function latest(error: unknown) {
    const body = object(error)
      ? (error.data ?? (object(error.response) && error.response._data))
      : null;
    for (const candidate of [
      body,
      object(body) ? body.plan : null,
      object(body) ? body.detail : null,
    ])
      if (object(candidate) && typeof candidate.revision === "number")
        try {
          return options.read(candidate);
        } catch {
          // Not a plan after all: read it from the server.
        }
    return options.read(await options.load());
  }

  async function send(body: PlanMutation) {
    try {
      return await options.save(body);
    } catch (error) {
      // No answer: the same request once more; the server answers a repeat as the first time.
      if (planRequestStatus(error) !== null) throw error;
      return await options.save(body);
    }
  }

  async function commit(change: PlanChange, ticket: number) {
    let base = confirmed!;
    for (let attempt = 1; ; attempt++) {
      const state = planState(change(planDraft(base)));
      if (sameState(state, planState(planDraft(base)))) return base;
      try {
        return options.read(
          await send({ request_id: id(), expected_revision: base.revision, state })
        );
      } catch (error) {
        if (planRequestStatus(error) !== 409 || attempt >= attempts || !current(ticket))
          throw error;
        base = await latest(error);
        if (!current(ticket)) throw error;
        confirmed = base;
      }
    }
  }

  async function drain(ticket: number) {
    running = true;
    try {
      while (current(ticket) && pending.length) {
        const item = pending[0]!;
        let saved = false;
        try {
          const plan = await commit(item.change, ticket);
          if (!current(ticket)) return;
          confirmed = plan;
          saved = true;
        } catch (error) {
          if (!current(ticket)) return;
          view.failed = true;
          // A refused change leaves the plan as the server has it.
          if (planRequestStatus(error) !== null)
            try {
              const plan = options.read(await options.load());
              if (!current(ticket)) return;
              confirmed = plan;
            } catch {
              // The plan stays as it was last saved.
            }
        }
        if (pending[0] === item) pending.shift();
        item.done(saved);
        refresh();
      }
      if (current(ticket) && confirmed) options.settled?.(confirmed);
    } finally {
      if (current(ticket)) running = false;
    }
  }

  return {
    async load() {
      if (!alive) return;
      const ticket = ++generation;
      running = false;
      drop();
      confirmed = null;
      view = { status: "loading", plan: null, saving: false, failed: false };
      publish();
      for (let attempt = 1; attempt <= 2; attempt++)
        try {
          const plan = options.read(await options.load());
          if (!current(ticket)) return;
          confirmed = plan;
          view.status = "ready";
          refresh();
          return;
        } catch (error) {
          if (!current(ticket)) return;
          // One more try only when the answer did not arrive or the server was busy.
          const code = planRequestStatus(error);
          if (attempt === 2 || (code !== null && code < 500)) break;
        }
      view.status = "error";
      publish();
    },
    /** Shows the change at once; resolves with whether the server has it. */
    apply(change: PlanChange): Promise<boolean> {
      if (!alive || !confirmed || view.status !== "ready") return Promise.resolve(false);
      return new Promise<boolean>((done) => {
        pending.push({ change, done });
        view.failed = false;
        refresh();
        if (!running) void drain(generation);
      });
    },
    /** Signed out, or another account: nothing of the previous plan stays. */
    clear() {
      generation++;
      running = false;
      drop();
      confirmed = null;
      view = { status: "idle", plan: null, saving: false, failed: false };
      publish();
    },
    dispose() {
      generation++;
      drop();
      alive = false;
    },
  };
}
