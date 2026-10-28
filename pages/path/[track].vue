<!--
  One curated learning path with its stages. Anyone may read it. With an account every item
  says how far the learner is, and the whole path or each stage goes onto the own plan.
-->
<template>
  <main class="track-page">
    <NuxtLink to="/path" class="back-link"
      >← {{ t(guest ? "LearningPlan.AllTracks" : "LearningPlan.Title") }}</NuxtLink
    >
    <p v-if="status === 'loading'" class="state" role="status">{{ t("LearningPlan.Loading") }}</p>
    <section v-else-if="status === 'missing'" class="state">
      <h1>{{ t("LearningPlan.TrackMissing") }}</h1>
    </section>
    <section v-else-if="status === 'error' || !track" class="state" role="alert">
      <p>{{ t("LearningPlan.TrackError") }}</p>
      <button type="button" class="text-button" @click="load()">
        {{ t("LearningPlan.Retry") }}
      </button>
    </section>
    <template v-else>
      <header class="track-heading">
        <p class="eyebrow">{{ t("LearningPlan.TrackEyebrow") }}</p>
        <h1>{{ track.title }}</h1>
        <p v-if="track.provider || track.level" class="facts">
          <span v-if="track.level" class="level">{{
            t(`LearningPlan.Characters.${track.level}`)
          }}</span>
          <template v-if="track.provider">
            <a
              v-if="track.provider.url"
              :href="track.provider.url"
              target="_blank"
              rel="noopener noreferrer"
              >{{ t("LearningPlan.By", { provider: track.provider.name })
              }}<span class="sr-only"> ({{ t("LearningPlan.NewTab") }})</span></a
            >
            <span v-else>{{ t("LearningPlan.By", { provider: track.provider.name }) }}</span>
          </template>
        </p>
        <p v-if="track.description" class="description">{{ track.description }}</p>
        <div v-if="plan" class="adopt-row">
          <button
            v-if="whole.planned < whole.total"
            type="button"
            class="adopt"
            @click="adopt(null)"
          >
            {{ t("LearningPlan.AdoptAll") }}
          </button>
          <p v-else-if="whole.total" class="planned">
            <CheckIcon aria-hidden="true" />{{ t("LearningPlan.Planned") }}
          </p>
        </div>
        <p v-if="view.failed" class="notice" role="status">{{ t("LearningPlan.SaveFailed") }}</p>
      </header>

      <LearningPathInvitation
        v-if="guest"
        :target="route.fullPath"
        body="LearningPlan.Invitation.TrackBody"
      />

      <ol class="stages">
        <li v-for="(stage, index) in track.stages" :key="stage.id" class="stage">
          <div class="stage-heading">
            <LearningPathStageSymbol :kind="stage.kind" :number="index + 1" />
            <h2>{{ stage.title }}</h2>
          </div>
          <p v-if="stage.repeat_after_months" class="repeat">
            {{ t("LearningPlan.Repeat", { months: stage.repeat_after_months }) }}
          </p>
          <ul v-if="stage.items.length" class="items">
            <li v-for="item in stage.items" :key="`${item.type}:${itemId(item)}`" class="item">
              <NuxtLink
                v-if="item.type === 'course'"
                :to="`/courses/${encodeURIComponent(item.course)}`"
                class="item-title"
                >{{ item.title }}</NuxtLink
              >
              <a
                v-else-if="item.url"
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
                class="item-title"
                >{{ item.title }}<ArrowTopRightOnSquareIcon aria-hidden="true" /><span
                  class="sr-only"
                  >{{ t("LearningPlan.NewTab") }}</span
                ></a
              >
              <span v-else class="item-title">{{ item.title }}</span>
              <span class="item-meta">{{ itemMeta(item) }}</span>
            </li>
          </ul>
          <p v-else-if="!stage.repeat_after_months" class="quiet">
            {{ t("LearningPlan.StageEmpty") }}
          </p>
          <template v-if="plan && stage.items.length && track.stages.length > 1">
            <button
              v-if="coverage(stage.id).planned < coverage(stage.id).total"
              type="button"
              class="adopt quiet-adopt"
              @click="adopt(stage.id)"
            >
              {{ t("LearningPlan.AdoptThisStage") }}
            </button>
            <p v-else class="planned">
              <CheckIcon aria-hidden="true" />{{ t("LearningPlan.Planned") }}
            </p>
          </template>
        </li>
      </ol>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowTopRightOnSquareIcon, CheckIcon } from "@heroicons/vue/24/outline";
import type { SessionIdentity } from "~/types/sessionIdentity";
import type { Track, TrackItem } from "~/types/learningPlan";
import { getTrack, useLearningPlan } from "~/composables/learningPlan";
import {
  addPlanSteps,
  planRequestStatus,
  trackCoverage,
  trackSteps,
  type PlanLanguage,
  type PlanView,
} from "~/utils/learningPlan";
import { pageTitle, shortDescription } from "~/utils/siteHead";

// Without learning paths in skills-ms the page leads home (`middleware/learning-paths.ts`).
definePageMeta({ middleware: ["learning-paths"] });
const { t, locale } = useI18n();
const route = useRoute();
const user = useUser();
const session: Ref<SessionIdentity | null> = useSession();
const accessToken = useAccessToken();
const guest = computed(() => !accessToken.value);
const owner = computed(() =>
  accessToken.value && user.value?.id ? `${user.value.id}:${session.value?.id || "session"}` : null
);
const language = computed<PlanLanguage>(() => (locale.value.startsWith("de") ? "de" : "en"));
const id = computed(() => String(route.params.track || ""));

const track = shallowRef<Track | null>(null);
const status = ref<"loading" | "ready" | "missing" | "error">("loading");
const view = shallowRef<PlanView>({ status: "idle", plan: null, saving: false, failed: false });
const editor = useLearningPlan({
  language: () => language.value,
  changed: (next) => (view.value = next),
  // Items of a path say how far the learner is; after a change that is read again.
  settled: () => void load(true),
});
const plan = computed(() => (view.value.status === "ready" ? view.value.plan : null));
const whole = computed(() =>
  track.value ? trackCoverage(track.value, plan.value?.steps ?? []) : { planned: 0, total: 0 }
);
const coverage = (stage: string) => trackCoverage(track.value!, plan.value?.steps ?? [], stage);

const about = computed(() => shortDescription(track.value?.description) || undefined);
useSeoMeta({
  title: () => (track.value ? pageTitle(track.value.title) : undefined),
  ogTitle: () => (track.value ? pageTitle(track.value.title) : undefined),
  description: () => about.value,
  ogDescription: () => about.value,
  robots: () => (status.value === "missing" ? "noindex" : undefined),
});

const itemId = (item: TrackItem) => (item.type === "course" ? item.course : item.id);
/** What the item is and, with an account, how far the learner is. */
function itemMeta(item: TrackItem) {
  const parts = [t(item.type === "course" ? "LearningPlan.Course" : "LearningPlan.External")];
  if (item.status === "done")
    parts.push(
      t(item.type === "course" ? "LearningPlan.StatusDone" : "LearningPlan.SelfConfirmed")
    );
  else if (item.status === "in_progress") parts.push(t("LearningPlan.StatusStarted"));
  return parts.join(" · ");
}

function adopt(stage: string | null) {
  if (track.value) void editor.apply(addPlanSteps(trackSteps(track.value, stage ?? undefined)));
}

let generation = 0;
let alive = true;
/** `quiet` keeps the shown path while it is read again. */
async function load(quiet = false) {
  const ticket = ++generation;
  if (!quiet) {
    status.value = "loading";
    track.value = null;
  }
  try {
    const next = await getTrack(id.value, language.value);
    if (!alive || ticket !== generation) return;
    track.value = next;
    status.value = "ready";
  } catch (error) {
    if (!alive || ticket !== generation || quiet) return;
    status.value = planRequestStatus(error) === 404 ? "missing" : "error";
  }
}

watch(
  [id, owner, accessToken, language],
  ([, next, token]) => {
    void load();
    editor.clear();
    if (!next) return;
    // setStates writes user and session before the token, so the reads wait for that batch.
    queueMicrotask(() => {
      if (alive && owner.value === next && accessToken.value === token) void editor.load();
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
.track-page {
  max-width: 960px;
  width: calc(100% - 64px);
  margin: 32px auto 88px;
  display: grid;
  gap: 24px;
  color: #edf3fb;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.track-page :deep(:is(p, h1, h2, h3, ul, ol, li, button, a, span)) {
  font-family: inherit;
}
.back-link {
  width: fit-content;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  color: #b5c7d9;
  font-size: 0.9rem;
}
.back-link:hover {
  color: #0cc9ab;
}
.state {
  display: grid;
  gap: 8px;
  justify-items: start;
  color: #c4d2e1;
}
.state p,
.state h1 {
  margin: 0;
}
.state h1 {
  font-size: 1.5rem;
}
.text-button {
  min-height: 44px;
  color: #87e6d4;
  font-weight: 600;
}
.track-heading {
  display: grid;
  gap: 10px;
}
.eyebrow {
  margin: 0;
  color: #adbdce;
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
h1 {
  margin: 0;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  margin: 0;
  color: #b5c7d9;
  font-size: 0.9rem;
}
.facts a {
  color: #87e6d4;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.level {
  padding: 3px 10px;
  border: 1px solid #3a5672;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.description {
  max-width: 65ch;
  margin: 0;
  color: #c4d2e1;
  line-height: 1.6;
}
.adopt-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  margin-top: 6px;
}
.adopt {
  min-height: 46px;
  padding: 0 22px;
  border-radius: 999px;
  background: #0cc9ab;
  color: #0b192e;
  font-weight: 700;
}
.adopt:hover {
  background: #2ad8bc;
}
.quiet-adopt {
  justify-self: start;
  min-height: 44px;
  border: 1px solid #0cc9ab;
  background: transparent;
  color: #87e6d4;
  font-size: 0.875rem;
}
.quiet-adopt:hover {
  background: #0f2a35;
}
.planned {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin: 0;
  color: #87e6d4;
  font-size: 0.9rem;
  font-weight: 600;
}
.planned svg,
.item-title svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
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
.stages {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.stage {
  display: grid;
  gap: 12px;
  padding: 20px;
  border: 1px solid #2c4259;
  border-radius: 18px;
  background: #122238;
}
.stage-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}
h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 650;
}
.repeat,
.quiet {
  margin: 0;
  color: #9fb3c8;
  font-size: 0.9rem;
}
.items {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0 16px;
  padding: 4px 14px;
  border-radius: 12px;
  background: #0f1d31;
}
.item-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  color: #edf3fb;
  font-weight: 600;
  overflow-wrap: anywhere;
}
a.item-title:hover {
  color: #0cc9ab;
}
.item-meta {
  color: #9fb3c8;
  font-size: 0.85rem;
}
:is(a, button):focus-visible {
  outline: 2px solid #87e6d4;
  outline-offset: 3px;
}
@media (max-width: 760px) {
  .track-page {
    width: calc(100% - 32px);
    margin: 20px auto 64px;
    gap: 18px;
  }
  .stage {
    padding: 14px;
  }
  .adopt-row .adopt {
    flex: 1 1 100%;
  }
}
</style>
