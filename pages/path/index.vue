<!--
  "Dein Lernweg": the learner's own steps with their progress, the choices that steer the
  suggestions, the suggestions, and the curated learning paths. Without an account the page
  shows the learning paths and the way to an account, like the skill tree.
-->
<template>
  <main class="path-page">
    <header class="path-heading">
      <h1>{{ t(guest ? "LearningPlan.Tracks" : "LearningPlan.Title") }}</h1>
      <p class="lead">{{ t(guest ? "LearningPlan.GuestLead" : "LearningPlan.Lead") }}</p>
    </header>

    <LearningPathInvitation v-if="guest" target="/path" body="LearningPlan.Invitation.Body" />

    <template v-else>
      <p v-if="view.status === 'loading' || view.status === 'idle'" class="state" role="status">
        {{ t("LearningPlan.Loading") }}
      </p>
      <section v-else-if="view.status === 'error' || !plan" class="state" role="alert">
        <p>{{ t("LearningPlan.LoadError") }}</p>
        <button type="button" class="text-button" @click="editor.load()">
          {{ t("LearningPlan.Retry") }}
        </button>
      </section>
      <template v-else>
        <div class="board">
          <section class="plan" aria-labelledby="plan-steps-title">
            <div class="section-heading">
              <h2 id="plan-steps-title">{{ t("LearningPlan.Steps") }}</h2>
              <p v-if="progress.total" class="progress-text">
                {{ t("LearningPlan.Progress", progress, progress.total) }}
              </p>
            </div>
            <progress
              v-if="progress.total"
              :value="progress.done"
              :max="progress.total"
              :aria-label="t('LearningPlan.Progress', progress, progress.total)"
            />
            <p v-if="view.failed" class="notice" role="status">
              {{ t("LearningPlan.SaveFailed") }}
            </p>
            <template v-if="upcoming">
              <a
                v-if="upcoming.type === 'external' && upcoming.url"
                :href="upcoming.url"
                target="_blank"
                rel="noopener noreferrer"
                class="continue"
                >{{ t("LearningPlan.Continue")
                }}<ArrowTopRightOnSquareIcon aria-hidden="true" /><span class="sr-only">{{
                  t("LearningPlan.NewTab")
                }}</span></a
              >
              <button
                v-else-if="upcoming.type === 'course'"
                type="button"
                class="continue"
                :disabled="continuing"
                :aria-busy="continuing"
                @click="continueLearning(upcoming.course)"
              >
                {{ t("LearningPlan.Continue") }}<ArrowRightIcon aria-hidden="true" />
              </button>
            </template>
            <p v-else-if="progress.total" class="quiet">{{ t("LearningPlan.AllDone") }}</p>
            <LearningPathStepList
              v-if="plan.steps.length"
              :steps="plan.steps"
              :tracks="tracks"
              :aria-busy="view.saving"
              @move="(key, by) => change(movePlanStep(plan?.steps ?? [], key, by))"
              @remove="(key) => change(removePlanStep(key))"
              @confirm="(key, done) => change(confirmPlanStep(key, done))"
            />
            <p v-else class="quiet">{{ t("LearningPlan.Empty") }}</p>
          </section>

          <div class="side">
            <section class="choices" :aria-label="t('LearningPlan.Choices')">
              <fieldset>
                <legend>{{ t("LearningPlan.Character") }}</legend>
                <div class="options">
                  <label
                    v-for="value in PLAN_CHARACTERS"
                    :key="value"
                    class="option"
                    :class="{ chosen: plan.character === value }"
                  >
                    <input
                      type="radio"
                      name="plan-character"
                      class="sr-only"
                      :value="value"
                      :checked="plan.character === value"
                      @change="change(choosePlanCharacter(value))"
                    />
                    <span class="option-label">{{ t(`LearningPlan.Characters.${value}`) }}</span>
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend>{{ t("LearningPlan.Preference") }}</legend>
                <div class="options even">
                  <label
                    v-for="value in PLAN_PREFERENCES"
                    :key="value"
                    class="option"
                    :class="{ chosen: plan.preference === value }"
                  >
                    <input
                      type="radio"
                      name="plan-preference"
                      class="sr-only"
                      :value="value"
                      :checked="plan.preference === value"
                      @change="change(choosePlanPreference(value))"
                    />
                    <span class="option-label">{{ t(`LearningPlan.Preferences.${value}`) }}</span>
                    <span class="option-hint">{{
                      t(`LearningPlan.PreferenceHints.${value}`)
                    }}</span>
                  </label>
                </div>
              </fieldset>
              <p class="choices-hint">{{ t("LearningPlan.ChoicesHint") }}</p>
            </section>

            <section class="suggestions" aria-labelledby="plan-suggestions-title">
              <h2 id="plan-suggestions-title">{{ t("LearningPlan.Suggestions") }}</h2>
              <div v-if="visibleSuggestions.length" class="suggestion-list">
                <LearningPathSuggestionCard
                  v-for="suggestion in visibleSuggestions"
                  :key="suggestion.course"
                  :suggestion="suggestion"
                  :reason="reasonOf(suggestion)"
                  @add="change(addPlanSteps([suggestionStep(suggestion)]))"
                />
              </div>
              <p v-else-if="suggestionsLoaded" class="quiet">
                {{ t("LearningPlan.SuggestionsEmpty") }}
              </p>
            </section>
          </div>
        </div>
      </template>
    </template>

    <section class="tracks" aria-labelledby="plan-tracks-title">
      <h2 v-if="!guest" id="plan-tracks-title">{{ t("LearningPlan.Tracks") }}</h2>
      <h2 v-else id="plan-tracks-title" class="sr-only">{{ t("LearningPlan.Tracks") }}</h2>
      <p v-if="tracksStatus === 'loading'" class="state" role="status">
        {{ t("LearningPlan.Loading") }}
      </p>
      <div v-else-if="tracksStatus === 'error'" class="state" role="alert">
        <p>{{ t("LearningPlan.TracksError") }}</p>
        <button type="button" class="text-button" @click="loadTracks()">
          {{ t("LearningPlan.Retry") }}
        </button>
      </div>
      <div v-else-if="tracks.length" class="track-list">
        <LearningPathTrackCard
          v-for="track in tracks"
          :key="track.id"
          :track="track"
          :steps="guest || !plan ? null : plan.steps"
          @adopt="(stage) => change(addPlanSteps(trackSteps(track, stage ?? undefined)))"
        />
      </div>
      <p v-else class="quiet">{{ t("LearningPlan.TracksEmpty") }}</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowRightIcon, ArrowTopRightOnSquareIcon } from "@heroicons/vue/24/outline";
import type { SessionIdentity } from "~/types/sessionIdentity";
import type { PlanSuggestion, Track } from "~/types/learningPlan";
import { GET } from "~/composables/fetch";
import { getPlanSuggestions, getTracks, useLearningPlan } from "~/composables/learningPlan";
import { courseContinueLocation } from "~/utils/courseJourney";
import {
  PLAN_CHARACTERS,
  PLAN_PREFERENCES,
  addPlanSteps,
  choosePlanCharacter,
  choosePlanPreference,
  confirmPlanStep,
  movePlanStep,
  planNextStep,
  planProgress,
  planText,
  removePlanStep,
  suggestionReason,
  suggestionStep,
  trackSteps,
  type PlanChange,
  type PlanLanguage,
  type PlanView,
} from "~/utils/learningPlan";
import { pageTitle } from "~/utils/siteHead";

const { t, locale } = useI18n();
const router = useRouter();
const user = useUser();
const session: Ref<SessionIdentity | null> = useSession();
const accessToken = useAccessToken();
const guest = computed(() => !accessToken.value);
const owner = computed(() =>
  accessToken.value && user.value?.id ? `${user.value.id}:${session.value?.id || "session"}` : null
);
const language = computed<PlanLanguage>(() => (locale.value.startsWith("de") ? "de" : "en"));
useHead(() => ({
  title: pageTitle(t(guest.value ? "LearningPlan.Tracks" : "LearningPlan.Title")),
}));

const view = shallowRef<PlanView>({ status: "idle", plan: null, saving: false, failed: false });
const editor = useLearningPlan({
  language: () => language.value,
  changed: (next) => (view.value = next),
  // What fits next depends on the plan and its choices.
  settled: () => void loadSuggestions(),
});
const plan = computed(() => view.value.plan);
const progress = computed(() => planProgress(plan.value?.steps ?? []));
const upcoming = computed(() => (plan.value ? planNextStep(plan.value) : null));
const change = (next: PlanChange) => void editor.apply(next);

const tracks = shallowRef<Track[]>([]);
const tracksStatus = ref<"loading" | "ready" | "error">("loading");
const suggestions = shallowRef<PlanSuggestion[]>([]);
const suggestionsLoaded = ref(false);
/** Names of courses a reason refers to that neither the plan nor a path names. */
const courseNames = ref<Record<string, string>>({});
// What is on the plan is no longer suggested, also before the next suggestions arrive.
const visibleSuggestions = computed(() => {
  const planned = new Set(
    (plan.value?.steps ?? []).flatMap((step) => (step.type === "course" ? [step.course] : []))
  );
  return suggestions.value.filter((suggestion) => !planned.has(suggestion.course));
});

let generation = 0;
let alive = true;

async function loadTracks() {
  const ticket = generation;
  tracksStatus.value = "loading";
  try {
    const list = await getTracks(language.value);
    if (!alive || ticket !== generation) return;
    tracks.value = list;
    tracksStatus.value = "ready";
  } catch {
    if (alive && ticket === generation) tracksStatus.value = "error";
  }
}

async function loadSuggestions() {
  const ticket = generation;
  try {
    const list = await getPlanSuggestions(language.value);
    if (!alive || ticket !== generation) return;
    suggestions.value = list;
    void nameReasonCourses(list, ticket);
  } catch {
    // Without suggestions the plan and the learning paths still stand on their own.
    if (alive && ticket === generation) suggestions.value = [];
  } finally {
    if (alive && ticket === generation) suggestionsLoaded.value = true;
  }
}

function courseName(id: string) {
  for (const step of plan.value?.steps ?? [])
    if (step.type === "course" && step.course === id) return step.title;
  for (const track of tracks.value)
    for (const stage of track.stages)
      for (const item of stage.items)
        if (item.type === "course" && item.course === id) return item.title;
  return courseNames.value[id];
}

/** Asks for the names a "next step after …" needs and nothing else knows. */
async function nameReasonCourses(list: PlanSuggestion[], ticket: number) {
  const missing = [
    ...new Set(
      list.flatMap((item) =>
        item.reason === "next_after" && item.reason_course && !courseName(item.reason_course)
          ? [item.reason_course]
          : []
      )
    ),
  ];
  await Promise.all(
    missing.map(async (id) => {
      try {
        const summary = (await GET(`/skills/courses/${encodeURIComponent(id)}/summary`)) as {
          title?: unknown;
          translations?: Record<string, { title?: string | null }>;
        };
        const name =
          summary?.translations?.[language.value]?.title ||
          planText(summary?.title, language.value);
        if (alive && ticket === generation && name)
          courseNames.value = { ...courseNames.value, [id]: name };
      } catch {
        // The reason then speaks of the course without its name.
      }
    })
  );
}

function reasonOf(suggestion: PlanSuggestion) {
  return suggestionReason(suggestion, {
    course: courseName,
    track: (id) => tracks.value.find((track) => track.id === id)?.title,
  });
}

/** The existing way back into a course (`utils/courseJourney.ts`); the course page otherwise. */
const continuing = ref(false);
async function continueLearning(courseId: string) {
  if (continuing.value) return;
  continuing.value = true;
  const api = `/skills/courses/${encodeURIComponent(courseId)}`;
  let target: string | ReturnType<typeof courseContinueLocation> =
    `/courses/${encodeURIComponent(courseId)}`;
  try {
    const course = (await GET(api)) as Parameters<typeof courseContinueLocation>[0];
    const curriculum = course?.has_explicit_curriculum
      ? await GET(`${api}/curriculum`).catch(() => null)
      : null;
    target = courseContinueLocation({ ...course, id: courseId }, curriculum);
  } catch {
    // Not open to this account yet: the course page shows how to get in.
  }
  if (alive) await router.push(target);
  continuing.value = false;
}

watch(
  [owner, accessToken, language],
  ([next, token]) => {
    const ticket = ++generation;
    suggestions.value = [];
    suggestionsLoaded.value = false;
    courseNames.value = {};
    editor.clear();
    void loadTracks();
    if (!next) return;
    // setStates writes user and session before the token, so the reads wait for that batch.
    queueMicrotask(() => {
      if (!alive || ticket !== generation || owner.value !== next || accessToken.value !== token)
        return;
      void editor.load().then(() => {
        if (alive && ticket === generation && view.value.status === "ready") void loadSuggestions();
      });
    });
  },
  { immediate: true, flush: "sync" }
);

onBeforeUnmount(() => {
  alive = false;
  generation++;
  editor.dispose();
});
</script>

<style scoped>
.path-page {
  max-width: 1240px;
  width: calc(100% - 64px);
  margin: 40px auto 88px;
  color: #edf3fb;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  display: grid;
  gap: 28px;
}
.path-page :deep(:is(p, h1, h2, h3, ul, ol, li, button, a, span, legend, label)) {
  font-family: inherit;
}
.path-heading h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.2;
}
.lead {
  margin: 8px 0 0;
  max-width: 60ch;
  color: #b5c7d9;
  line-height: 1.55;
}
h2 {
  margin: 0;
  color: #edf3fb;
  font-size: 1.3rem;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.state {
  display: grid;
  gap: 8px;
  justify-items: start;
  color: #c4d2e1;
}
.state p {
  margin: 0;
}
.text-button {
  min-height: 44px;
  color: #87e6d4;
  font-weight: 600;
}
.quiet {
  margin: 0;
  color: #9fb3c8;
  line-height: 1.5;
}
.side {
  display: grid;
  align-content: start;
  gap: 28px;
  min-width: 0;
}
.choices {
  display: grid;
  gap: 16px;
  padding: 18px 20px;
  border: 1px solid #2c4259;
  border-radius: 18px;
  background: #122238;
}
fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
legend {
  margin-bottom: 8px;
  color: #adbdce;
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.option {
  display: grid;
  flex: 1 1 auto;
  align-content: center;
  min-height: 44px;
  padding: 6px 12px;
  border: 1px solid #3a5672;
  border-radius: 12px;
  color: #d6e1ec;
  cursor: pointer;
}
.option:hover {
  border-color: #5d7690;
}
.option.chosen {
  border-color: #0cc9ab;
  background: #0f2a35;
  color: #edf3fb;
}
.option:focus-within {
  outline: 2px solid #87e6d4;
  outline-offset: 3px;
}
.option-label {
  font-size: 0.95rem;
  font-weight: 650;
}
/* The two preferences carry a hint each and share the row evenly. */
.options.even .option {
  flex-basis: 0;
}
.option-hint {
  color: #9fb3c8;
  font-size: 0.78rem;
  line-height: 1.3;
}
.choices-hint {
  margin: -4px 0 0;
  color: #9fb3c8;
  font-size: 0.85rem;
}
.board {
  display: grid;
  gap: 28px;
}
.plan,
.suggestions {
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
}
.plan {
  padding: 22px;
  border: 1px solid #2c4259;
  border-radius: 20px;
  background: #122238;
}
.section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 16px;
}
.progress-text {
  margin: 0;
  color: #b5c7d9;
  font-size: 0.9rem;
}
progress {
  width: 100%;
  height: 8px;
  overflow: hidden;
  border: 0;
  border-radius: 999px;
  background: #1d3550;
  accent-color: #0cc9ab;
  appearance: none;
}
progress::-webkit-progress-bar {
  background: #1d3550;
}
progress::-webkit-progress-value {
  border-radius: 999px;
  background: #0cc9ab;
}
progress::-moz-progress-bar {
  border-radius: 999px;
  background: #0cc9ab;
}
.notice {
  margin: 0;
  padding: 10px 14px;
  border-left: 3px solid #e2b04a;
  border-radius: 8px;
  background: #2a2a24;
  color: #f1e3c0;
  font-size: 0.9rem;
}
.continue {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: start;
  gap: 10px;
  min-height: 48px;
  padding: 0 22px;
  border-radius: 999px;
  background: #0cc9ab;
  color: #0b192e;
  font-weight: 700;
}
.continue:hover {
  background: #2ad8bc;
}
.continue:disabled {
  opacity: 0.7;
}
.continue svg {
  width: 18px;
  height: 18px;
}
.suggestion-list {
  display: grid;
  gap: 12px;
}
.tracks {
  display: grid;
  gap: 14px;
}
.track-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 16px;
}
:is(a, button):focus-visible {
  outline: 2px solid #87e6d4;
  outline-offset: 3px;
}
@media (min-width: 1000px) {
  .board {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    align-items: start;
  }
}
/* A phone held sideways: the steps come up without scrolling past the introduction. */
@media (max-height: 500px) {
  .path-page {
    margin-top: 16px;
  }
  .path-heading h1 {
    font-size: 1.6rem;
  }
  .lead {
    display: none;
  }
}
@media (max-width: 760px) {
  .path-page {
    width: calc(100% - 32px);
    margin: 24px auto 64px;
    gap: 22px;
  }
  .choices {
    padding: 14px;
    gap: 14px;
  }
  .plan {
    padding: 14px;
  }
  .continue {
    justify-self: stretch;
  }
}
</style>
