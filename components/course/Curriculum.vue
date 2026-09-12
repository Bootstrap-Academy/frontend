<template>
  <div class="curriculum">
    <details
      v-for="(section, index) in sections"
      :key="section.id || index"
      :open="index === initialSection"
    >
      <summary>
        <span class="section-label">{{ copy.section }} {{ index + 1 }}</span>
        <span class="section-title">{{ section.title }}</span>
        <ChevronDownIcon class="section-chevron" aria-hidden="true" />
      </summary>
      <p v-if="section.description" class="section-description">{{ section.description }}</p>
      <ol>
        <li
          v-for="(lecture, lectureIndex) in section.lectures || []"
          :key="lecture.id || lectureIndex"
        >
          <button
            type="button"
            :disabled="!isCourseAccessible || !section.id || !lecture.id"
            :aria-current="activeLecture === lecture.id ? 'step' : undefined"
            @click="emit('watch', { sectionID: section.id, lectureID: lecture.id })"
          >
            <span class="lecture-number" aria-hidden="true">{{
              lecture.completed ? "✓" : lectureIndex + 1
            }}</span>
            <span class="lecture-title">{{ lecture.title }}</span>
            <span v-if="lecture.completed" class="lecture-status">{{ copy.done }}</span>
            <span v-else-if="lecture.duration > 0" class="lecture-status"
              >{{ Math.ceil(lecture.duration / 60) }} min</span
            >
          </button>
        </li>
      </ol>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ChevronDownIcon } from "@heroicons/vue/24/outline";
import type { Course } from "~/types/courseTypes";
const props = withDefaults(defineProps<{ data: Course | null; isCourseAccessible?: boolean }>(), {
  isCourseAccessible: true,
});
const emit = defineEmits<{ watch: [{ sectionID: string; lectureID: string }] }>();
const { copy } = useCourseExperienceCopy();
const route = useRoute();
const sections = computed(() => (Array.isArray(props.data?.sections) ? props.data.sections : []));
const activeLecture = computed(() =>
  typeof route.query.lecture === "string" ? route.query.lecture : ""
);
const initialSection = computed(() => {
  const active = sections.value.findIndex((section) => section.id === route.query.section);
  if (active >= 0) return active;
  const unfinished = sections.value.findIndex((section) =>
    section.lectures?.some((lecture) => !lecture.completed)
  );
  return unfinished >= 0 ? unfinished : 0;
});
</script>

<style scoped>
.curriculum {
  display: grid;
  gap: 0.75rem;
}
details {
  border-bottom: 1px solid var(--color-tertiary);
  padding-bottom: 0.75rem;
}
details:last-child {
  border-bottom: 0;
}
summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.3rem 1rem;
  cursor: pointer;
  padding: 0.75rem 0;
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
.section-label {
  color: var(--color-subheading);
  font-size: 0.75rem;
}
.section-title {
  color: var(--color-heading);
  font-size: 1rem;
  grid-column: 1;
}
.section-chevron {
  width: 1.2rem;
  height: 1.2rem;
  grid-column: 2;
  grid-row: 1 / 3;
  align-self: center;
}
details[open] .section-chevron {
  transform: rotate(180deg);
}
.section-description {
  padding: 0.5rem 0 1rem;
  font-size: 0.9rem;
}
ol {
  display: grid;
  gap: 0.35rem;
}
button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-align: left;
  padding: 0.8rem 0.6rem;
  border-radius: 0.65rem;
  color: var(--color-body);
}
button:enabled:hover,
button[aria-current] {
  background: var(--color-tertiary);
  color: var(--color-heading);
}
button:disabled {
  cursor: default;
}
.lecture-number {
  min-width: 1.5rem;
  text-align: center;
  color: var(--color-accent);
  font-size: 0.85rem;
}
.lecture-title {
  flex: 1;
  line-height: 1.4;
  min-width: 0;
  overflow-wrap: anywhere;
}
.lecture-status {
  font-size: 0.75rem;
  color: var(--color-subheading);
  flex-shrink: 0;
}
button:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 3px;
}
@media (max-width: 420px) {
  .lecture-status {
    display: none;
  }
}
</style>
