<!--
  On the page of a course: the way to put it onto the own learning journey, or, once it is
  there, the way to the journey. Until the plan is known nothing shows, and a plan that cannot
  be read leaves the course page as it was.
-->
<template>
  <div v-if="plan" class="add-course">
    <NuxtLink v-if="planned" to="/path" class="planned"
      ><CheckIcon aria-hidden="true" /><span>{{ t("LearningPlan.Planned") }}</span
      ><ArrowRightIcon aria-hidden="true"
    /></NuxtLink>
    <button v-else type="button" class="add" @click="add">
      <PlusIcon aria-hidden="true" />{{ t("LearningPlan.Add") }}
    </button>
    <p v-if="view.failed" class="failed" role="status">{{ t("LearningPlan.SaveFailed") }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowRightIcon, CheckIcon, PlusIcon } from "@heroicons/vue/24/outline";
import { useLearningPlan } from "~/composables/learningPlan";
import {
  addPlanSteps,
  planCourseStep,
  type PlanLanguage,
  type PlanView,
} from "~/utils/learningPlan";

const props = defineProps<{ course: string; title: string }>();
const { t, locale } = useI18n();
const language = computed<PlanLanguage>(() => (locale.value.startsWith("de") ? "de" : "en"));
const view = shallowRef<PlanView>({ status: "idle", plan: null, saving: false, failed: false });
const editor = useLearningPlan({
  language: () => language.value,
  changed: (next) => (view.value = next),
});
const plan = computed(() => (view.value.status === "ready" ? view.value.plan : null));
const planned = computed(
  () => !!plan.value?.steps.some((step) => step.type === "course" && step.course === props.course)
);

function add() {
  void editor.apply(addPlanSteps([planCourseStep(props.course, props.title)]));
}

onMounted(() => void editor.load());
onBeforeUnmount(() => editor.dispose());
</script>

<style scoped>
.add-course,
.add-course :is(a, button, p, span) {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.add-course {
  display: grid;
  gap: 8px;
}
.add,
.planned {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 650;
}
.add {
  border: 1px solid #0cc9ab;
  color: #87e6d4;
}
.add:hover {
  background: #0f2a35;
}
.planned {
  color: #87e6d4;
}
.planned:hover {
  color: #0cc9ab;
}
.add svg,
.planned svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.failed {
  margin: 0;
  color: #f1e3c0;
  font-size: 0.85rem;
  line-height: 1.4;
}
:is(a, button):focus-visible {
  outline: 2px solid #87e6d4;
  outline-offset: 3px;
}
</style>
