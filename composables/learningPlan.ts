import type { Plan, PlanMutation } from "~/types/learningPlan";
import {
  createPlanEditor,
  readPlan,
  readSuggestions,
  readTrack,
  readTracks,
  type PlanLanguage,
  type PlanView,
} from "~/utils/learningPlan";

// The four addresses of "Dein Lernweg" in skills-ms. Titles and descriptions come in the
// language of the page, which the service reads from `Accept-Language`.

const language = (value: PlanLanguage) => ({ "Accept-Language": value });

let offered: Promise<boolean> | null = null;
/**
 * Whether skills-ms offers learning paths at all, so the ways to the learning journey can
 * show: `GET /skills/tracks` answers with a list. A service without the route (404), an
 * error or no answer means no. Asked once per session of the app, without the account,
 * and kept only in memory.
 */
export function learningPathsAvailable(): Promise<boolean> {
  offered ||= $fetch<unknown>("/skills/tracks", {
    baseURL: useRuntimeConfig().public.BASE_API_URL,
    retry: 0,
    timeout: 6000,
  }).then(
    (answer) => Array.isArray(answer),
    () => false
  );
  return offered;
}

/** The same as a value for templates: `null` until the answer is there, so nothing flickers. */
export function useLearningPathsAvailable() {
  const available = useState<boolean | null>("learningPathsAvailable", () => null);
  if (available.value === null)
    void learningPathsAvailable().then((value) => (available.value = value));
  return available;
}

/** The curated paths; public. */
export async function getTracks(lang: PlanLanguage) {
  return readTracks(await GET("/skills/tracks", undefined, language(lang)), lang);
}

/** One path; with an account every item says how far the learner is. */
export async function getTrack(id: string, lang: PlanLanguage) {
  const track = readTrack(
    await GET(`/skills/tracks/${encodeURIComponent(id)}`, undefined, language(lang)),
    lang
  );
  if (!track) throw new Error("Invalid track");
  return track;
}

export async function getPlan(lang: PlanLanguage) {
  return readPlan(await GET("/skills/plan", undefined, language(lang)), lang);
}

/** Up to six courses with their reason; nothing about them is stored. */
export async function getPlanSuggestions(lang: PlanLanguage) {
  return readSuggestions(await GET("/skills/plan/suggestions", undefined, language(lang)), lang);
}

/** The plan of the signed-in learner, saved against its revision (`utils/learningPlan.ts`). */
export function useLearningPlan(options: {
  language: () => PlanLanguage;
  changed: (view: PlanView) => void;
  settled?: (plan: Plan) => void;
}) {
  return createPlanEditor({
    load: () => GET("/skills/plan", undefined, language(options.language())),
    save: (body: PlanMutation) => PUT("/skills/plan", body, language(options.language())),
    read: (raw) => readPlan(raw, options.language()),
    changed: options.changed,
    settled: options.settled,
    id: () => crypto.randomUUID(),
  });
}
