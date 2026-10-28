<!--
  The steps of "Dein Lernweg" in their order: what each one is, how far the learner is, and
  where it comes from. Each step moves up or down or leaves the plan; an external step is
  ticked off by the learner, because nothing here can see it.
-->
<template>
  <ol class="step-list">
    <li
      v-for="(step, index) in steps"
      :key="planStepKey(step)"
      class="step"
      :class="{ done: step.status === 'done', upcoming: step === upcoming }"
    >
      <span class="marker" aria-hidden="true">
        <CheckIcon v-if="step.status === 'done'" />
        <PlayIcon v-else-if="step === upcoming" />
        <template v-else>{{ index + 1 }}</template>
      </span>
      <div class="copy">
        <NuxtLink
          v-if="step.type === 'course'"
          :to="`/courses/${encodeURIComponent(step.course)}`"
          class="title"
          >{{ step.title }}</NuxtLink
        >
        <a
          v-else-if="step.url"
          :href="step.url"
          target="_blank"
          rel="noopener noreferrer"
          class="title"
          >{{ step.title }}<ArrowTopRightOnSquareIcon class="outside" aria-hidden="true" /><span
            class="sr-only"
            >{{ t("LearningPlan.NewTab") }}</span
          ></a
        >
        <span v-else class="title">{{ step.title }}</span>
        <p class="meta">
          <span v-if="step === upcoming" class="sr-only">{{ t("LearningPlan.Next") }}: </span
          >{{ meta(step) }}
        </p>
        <label v-if="step.type === 'external'" class="confirm">
          <input
            type="checkbox"
            :checked="step.status === 'done'"
            @change="
              emit('confirm', planStepKey(step), ($event.target as HTMLInputElement).checked)
            "
          />
          <span>{{
            t(step.status === "done" ? "LearningPlan.SelfConfirmedLabel" : "LearningPlan.MarkDone")
          }}</span>
        </label>
      </div>
      <div class="actions">
        <button
          type="button"
          :disabled="index === 0"
          :aria-label="t('LearningPlan.MoveUp', { title: step.title })"
          @click="emit('move', planStepKey(step), -1)"
        >
          <ArrowUpIcon aria-hidden="true" />
        </button>
        <button
          type="button"
          :disabled="index === steps.length - 1"
          :aria-label="t('LearningPlan.MoveDown', { title: step.title })"
          @click="emit('move', planStepKey(step), 1)"
        >
          <ArrowDownIcon aria-hidden="true" />
        </button>
        <button
          type="button"
          :aria-label="t('LearningPlan.Remove', { title: step.title })"
          @click="emit('remove', planStepKey(step))"
        >
          <XMarkIcon aria-hidden="true" />
        </button>
      </div>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import {
  ArrowDownIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  CheckIcon,
  PlayIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import type { PlanStep, Track } from "~/types/learningPlan";
import { planNextStep, planStepKey, planStepOrigin } from "~/utils/learningPlan";

const props = defineProps<{ steps: PlanStep[]; tracks: Track[] }>();
const emit = defineEmits<{
  move: [key: string, by: -1 | 1];
  remove: [key: string];
  confirm: [key: string, done: boolean];
}>();
const { t } = useI18n();

const upcoming = computed(() => planNextStep(props));

/** What the step is, how far it is and where it comes from, in one line. */
function meta(step: PlanStep) {
  const parts = [t(step.type === "course" ? "LearningPlan.Course" : "LearningPlan.External")];
  if (step.type === "course" && step.status === "done") parts.push(t("LearningPlan.StatusDone"));
  else if (step.type === "course" && step.status === "in_progress")
    parts.push(
      step.total_units && step.done_units !== null
        ? t("LearningPlan.Units", { done: step.done_units, total: step.total_units })
        : t("LearningPlan.StatusStarted")
    );
  const origin = planStepOrigin(step, props.tracks);
  if (origin)
    parts.push(
      origin.stage
        ? t("LearningPlan.FromStage", { track: origin.track, stage: origin.stage })
        : t("LearningPlan.From", { track: origin.track })
    );
  return parts.join(" · ");
}
</script>

<style scoped>
/* The base styles give lists, paragraphs and links the monospace face of older pages. */
.step-list,
.step-list :is(li, p, a, span, label) {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.step-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.step {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 12px 12px 12px 14px;
  border: 1px solid #2c4259;
  border-radius: 14px;
  background: #0f1d31;
}
.step.upcoming {
  border-color: #0cc9ab;
  background: #0f2a35;
}
.marker {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #3a5672;
  color: #b5c7d9;
  font-size: 0.875rem;
  font-weight: 650;
}
.marker svg {
  width: 18px;
  height: 18px;
}
.done .marker {
  border-color: #0cc9ab;
  background: #0cc9ab;
  color: #0b192e;
}
.upcoming .marker {
  border-color: #0cc9ab;
  color: #0cc9ab;
}
.copy {
  min-width: 0;
}
.title {
  display: inline-block;
  padding: 5px 0;
  color: #edf3fb;
  font-weight: 650;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
a.title:hover {
  color: #0cc9ab;
}
.outside {
  display: inline-block;
  width: 15px;
  height: 15px;
  margin-left: 6px;
  vertical-align: -2px;
  color: #8fa6bc;
}
.done .title {
  color: #c4d2e1;
}
.meta {
  margin: 0;
  color: #9fb3c8;
  font-size: 0.85rem;
  line-height: 1.4;
}
.confirm {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  margin-top: 2px;
  color: #d6e1ec;
  font-size: 0.875rem;
  cursor: pointer;
}
.confirm input {
  width: 20px;
  height: 20px;
  accent-color: #0cc9ab;
}
.actions {
  display: flex;
  gap: 2px;
}
.actions button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  color: #b5c7d9;
}
.actions button:hover:not(:disabled) {
  background: #1b3049;
  color: #edf3fb;
}
.actions button:disabled {
  color: #3f5670;
  cursor: default;
}
.actions svg {
  width: 20px;
  height: 20px;
}
:is(a, button, input):focus-visible {
  outline: 2px solid #87e6d4;
  outline-offset: 3px;
}
@media (max-width: 520px) {
  .step {
    grid-template-columns: 28px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 10px 6px 10px 10px;
  }
  .marker {
    width: 28px;
    height: 28px;
    font-size: 0.8rem;
  }
  .marker svg {
    width: 15px;
    height: 15px;
  }
  .actions {
    gap: 0;
  }
  .actions button {
    width: 40px;
  }
}
</style>
