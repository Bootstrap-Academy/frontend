<template>
  <component
    :is="unit.selectable === true ? NuxtLink : 'div'"
    :to="unit.selectable === true ? courseRoomLocation(courseId, pathId, unit.id) : undefined"
    :class="['course-unit', { 'course-unit-link': unit.selectable === true }]"
    :aria-current="current ? 'step' : undefined"
  >
    <span class="unit-symbol" aria-hidden="true">{{
      unit.status === "completed" ? "✓" : unit.status === "skipped" ? "↷" : "·"
    }}</span>
    <span class="unit-copy">
      <span>{{ localized(unit.title) }}</span>
      <small v-if="unit.result">{{
        unit.result.kind === "solved" ? copy.solved : copy.introduction
      }}</small>
      <small v-else-if="unit.status === 'in_progress'">{{ copy.inProgress }}</small>
    </span>
    <span v-if="unit.selectable === true" class="unit-arrow" aria-hidden="true">→</span>
  </component>
</template>

<script setup lang="ts">
import { NuxtLink } from "#components";
import type { CourseLearningPlan } from "~/types/courseTypes";
import { courseRoomLocation } from "~/utils/courseJourney";

defineProps<{
  unit: CourseLearningPlan["units"][number];
  courseId: string;
  pathId: string;
  current?: boolean;
}>();
const { copy, localized } = useCourseExperienceCopy();
</script>

<style scoped>
.course-unit {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 52px;
  padding: 0.8rem;
  border-radius: 0.6rem;
  color: var(--color-heading);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.course-unit-link {
  background: var(--color-secondary);
  transition: background 150ms;
}
.course-unit-link:hover {
  background: var(--color-tertiary);
}
.course-unit-link:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}
.course-unit[aria-current] .unit-symbol,
.unit-arrow {
  color: var(--color-accent);
}
.unit-symbol {
  flex-shrink: 0;
  width: 1rem;
  text-align: center;
}
.unit-copy {
  min-width: 0;
  flex: 1;
}
small {
  display: block;
  color: var(--color-body);
  font-size: 0.8rem;
}
</style>
