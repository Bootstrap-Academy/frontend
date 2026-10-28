// "Dein Lernweg": the curated paths (tracks) and the learner's own plan, as skills-ms sends them.

/** How hard the learner wants it, chosen by the learner. */
export type PlanCharacter = "einsteiger" | "fortgeschritten" | "profi";
/** Many neighbouring areas, or one area in depth. */
export type PlanPreference = "breit" | "tief";
export type StepStatus = "done" | "in_progress" | "open";

export interface TrackProvider {
  name: string;
  url: string | null;
}

export interface TrackCourseItem {
  type: "course";
  course: string;
  title: string;
  /** Only for a signed-in learner. */
  status?: StepStatus;
}

export interface TrackExternalItem {
  type: "external";
  id: string;
  title: string;
  url: string | null;
  status?: StepStatus;
}

export type TrackItem = TrackCourseItem | TrackExternalItem;

export interface TrackStage {
  id: string;
  title: string;
  /** Free label; fundamentals, practitioner, mastery, refresher and certification have a symbol. */
  kind: string;
  repeat_after_months: number | null;
  items: TrackItem[];
}

export interface Track {
  id: string;
  title: string;
  description: string;
  provider: TrackProvider | null;
  level: PlanCharacter | null;
  stages: TrackStage[];
}

interface StepOrigin {
  track: string | null;
  stage: string | null;
}

export interface PlanCourseStep extends StepOrigin {
  type: "course";
  course: string;
  title: string;
  status: StepStatus;
  done_units: number | null;
  total_units: number | null;
}

export interface PlanExternalStep extends StepOrigin {
  type: "external";
  id: string;
  title: string;
  url: string | null;
  status: StepStatus;
  self_confirmed: boolean;
}

export type PlanStep = PlanCourseStep | PlanExternalStep;

export type PlanNext = { type: "course"; course: string } | { type: "external"; id: string };

export interface Plan {
  revision: number;
  character: PlanCharacter | null;
  preference: PlanPreference | null;
  steps: PlanStep[];
  next: PlanNext | null;
}

/** What a change works on: the choices and the ordered steps with everything shown about them. */
export interface PlanDraft {
  character: PlanCharacter | null;
  preference: PlanPreference | null;
  steps: PlanStep[];
}

/** One step as `PUT /skills/plan` takes it. */
export type PlanStateStep =
  | { type: "course"; course: string; track?: string; stage?: string }
  | { type: "external"; track: string; stage: string; id: string; done: boolean };

export interface PlanState {
  character: PlanCharacter | null;
  preference: PlanPreference | null;
  steps: PlanStateStep[];
}

export interface PlanMutation {
  request_id: string;
  expected_revision: number;
  state: PlanState;
}

export type SuggestionReason = "next_after" | "new_area" | "in_track";

export interface PlanSuggestion {
  type: "course";
  course: string;
  title: string;
  /** A text key; an unknown one shows no reason. */
  reason: string;
  reason_course?: string | null;
  reason_track?: string | null;
}
