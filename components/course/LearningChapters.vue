<template>
  <div class="learning-chapters">
    <details v-for="(chapter, index) in chapters" :key="chapter.id" :open="chapter.active">
      <summary>
        <span>{{ index + 1 }}. {{ localized(chapter.title) }}</span
        ><span class="chapter-progress"
          >{{ chapter.completed }}/{{ chapter.units.length }}
          {{ en ? "completed" : "abgeschlossen" }}</span
        >
      </summary>
      <p v-if="chapter.skipped" class="chapter-note">
        {{ chapter.skipped }}
        {{
          en
            ? "skipped; these do not count as solved."
            : "übersprungen; das zählt nicht als gelöst."
        }}
      </p>
      <ol>
        <li v-for="unit in chapter.units" :key="unit.id">
          <CourseLearningUnit
            :unit="unit"
            :course-id="courseId"
            :path-id="plan.path.id"
            :current="plan.next?.unit.id === unit.id"
          />
        </li>
      </ol>
    </details>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { CourseLearningPlan } from "~/types/courseTypes";
import { learningChapterGroups } from "~/utils/learningChapters";
const props = defineProps<{ plan: CourseLearningPlan; courseId: string }>();
const { locale } = useI18n();
const en = computed(() => !locale.value.startsWith("de"));
const localized = (title: { de: string; en: string }) => (en.value ? title.en : title.de);
const chapters = computed(() => learningChapterGroups(props.plan));
</script>
<style scoped>
.learning-chapters {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}
details {
  border: 1px solid var(--color-tertiary);
  border-radius: 0.8rem;
  padding: 0.25rem 1rem;
}
summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 0;
  min-height: 48px;
  cursor: pointer;
  color: var(--color-heading);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.chapter-progress,
.chapter-note {
  font-size: 0.8rem;
  color: var(--color-subheading);
  font-weight: 400;
}
ol {
  display: grid;
  gap: 0.5rem;
  padding-bottom: 1rem;
}
summary:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 3px;
}
@media (max-width: 390px) {
  details {
    padding: 0.2rem 0.7rem;
  }
  .chapter-progress {
    width: 100%;
  }
}
</style>
