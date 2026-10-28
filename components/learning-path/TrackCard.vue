<!--
  A curated path in the list: who offers it, for whom, its stages, and for a learner with an
  account the two ways onto the plan: the whole path, or only the first stage that is not
  there yet. Every stage on its own is on the page of the path.
-->
<template>
  <article class="track">
    <div class="heading">
      <h3>{{ track.title }}</h3>
      <span v-if="track.level" class="level">{{
        t(`LearningPlan.Characters.${track.level}`)
      }}</span>
    </div>
    <p v-if="track.provider" class="provider">
      {{ t("LearningPlan.By", { provider: track.provider.name }) }}
    </p>
    <p v-if="track.description" class="description">{{ track.description }}</p>
    <ol v-if="track.stages.length" class="stages">
      <li v-for="(stage, index) in track.stages" :key="stage.id">
        <LearningPathStageSymbol :kind="stage.kind" :number="index + 1" />{{ stage.title }}
      </li>
    </ol>
    <div class="actions">
      <template v-if="steps">
        <template v-if="whole.planned < whole.total">
          <button type="button" class="adopt" @click="emit('adopt', null)">
            {{ t("LearningPlan.AdoptAll") }}
          </button>
          <button
            v-if="stage && stagesWithItems > 1"
            type="button"
            class="adopt quiet"
            @click="emit('adopt', stage.id)"
          >
            {{ t("LearningPlan.AdoptStage", { stage: stage.title }) }}
          </button>
        </template>
        <p v-else-if="whole.total" class="planned">
          <CheckIcon aria-hidden="true" />{{ t("LearningPlan.Planned") }}
        </p>
      </template>
      <NuxtLink :to="`/path/${encodeURIComponent(track.id)}`" class="look"
        >{{ t("LearningPlan.ShowTrack") }}<ArrowRightIcon aria-hidden="true"
      /></NuxtLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ArrowRightIcon, CheckIcon } from "@heroicons/vue/24/outline";
import type { PropType } from "vue";
import type { PlanStep, Track } from "~/types/learningPlan";
import { openTrackStage, trackCoverage } from "~/utils/learningPlan";

const props = defineProps({
  track: { type: Object as PropType<Track>, required: true },
  /** The steps of the plan; `null` without an account, which shows no way onto a plan. */
  steps: { type: Array as PropType<PlanStep[] | null>, default: null },
});
const emit = defineEmits<{ adopt: [stage: string | null] }>();
const { t } = useI18n();

const whole = computed(() => trackCoverage(props.track, props.steps ?? []));
const stage = computed(() => openTrackStage(props.track, props.steps ?? []));
const stagesWithItems = computed(
  () => props.track.stages.filter((candidate) => candidate.items.length).length
);
</script>

<style scoped>
/* The base styles give lists, paragraphs and links the monospace face of older pages. */
.track,
.track :is(h3, p, ol, li, a, span, button) {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.track {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 20px;
  border: 1px solid #2c4259;
  border-radius: 18px;
  background: #0f1d31;
}
.heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
h3 {
  margin: 0;
  color: #edf3fb;
  font-size: 1.15rem;
  font-weight: 650;
  line-height: 1.3;
}
.level {
  padding: 3px 10px;
  border: 1px solid #3a5672;
  border-radius: 999px;
  color: #b5c7d9;
  font-size: 0.75rem;
  font-weight: 600;
}
.provider,
.description {
  margin: 0;
  color: #9fb3c8;
  font-size: 0.9rem;
  line-height: 1.5;
}
.description {
  color: #c4d2e1;
}
.stages {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 6px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}
.stages li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #d6e1ec;
  font-size: 0.85rem;
}
.stages li + li::before {
  content: "→";
  margin-right: 2px;
  color: #5d7690;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: auto;
  padding-top: 8px;
}
.adopt {
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  background: #0cc9ab;
  color: #0b192e;
  font-size: 0.875rem;
  font-weight: 700;
}
.adopt:hover {
  background: #2ad8bc;
}
.adopt.quiet {
  border: 1px solid #0cc9ab;
  background: transparent;
  color: #87e6d4;
}
.adopt.quiet:hover {
  background: #0f2a35;
}
.planned {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin: 0;
  color: #87e6d4;
  font-size: 0.875rem;
  font-weight: 600;
}
.planned svg,
.look svg {
  width: 18px;
  height: 18px;
}
.look {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  margin-left: auto;
  color: #b5c7d9;
  font-size: 0.875rem;
}
.look:hover {
  color: #0cc9ab;
}
:is(a, button):focus-visible {
  outline: 2px solid #87e6d4;
  outline-offset: 3px;
}
</style>
