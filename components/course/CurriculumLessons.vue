<template>
  <div class="curriculum-lessons">
    <section v-for="group in groups" :key="group.id">
      <h3 v-if="group.title">{{ title(group.title) }}</h3>
      <ol>
        <li v-for="lesson in group.lessons" :key="lesson.id">
          <NuxtLink
            :to="`/courses/${encodeURIComponent(curriculum.course_id)}/lessons/${encodeURIComponent(lesson.id)}`"
            :prefetch="false"
          >
            <span aria-hidden="true">{{ lesson.completed ? "✓" : "·" }}</span>
            {{ title(lesson.title) }}
            <span aria-hidden="true">→</span>
          </NuxtLink>
        </li>
      </ol>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { CourseCurriculum } from "~/types/learningActivities";
import type { LocalizedText } from "~/types/learningRooms";
const props = defineProps<{ curriculum: CourseCurriculum }>();
const { locale } = useI18n();
const title = (value: LocalizedText) => value[locale.value.startsWith("de") ? "de" : "en"];
const groups = computed(() => {
  const titles = new Map(props.curriculum.chapters.map((chapter) => [chapter.id, chapter.title]));
  const ordered: {
    id: string;
    title: LocalizedText | null;
    lessons: CourseCurriculum["lessons"];
  }[] = [];
  let previous: string | null | undefined;
  for (const lesson of props.curriculum.lessons) {
    const chapter = lesson.chapter_id || null;
    if (!ordered.length || chapter !== previous) {
      ordered.push({
        id: String(ordered.length),
        title: titles.get(chapter || "") || null,
        lessons: [],
      });
    }
    ordered[ordered.length - 1]?.lessons.push(lesson);
    previous = chapter;
  }
  return ordered;
});
</script>
<style scoped>
.curriculum-lessons,
ol {
  display: grid;
  gap: 0.6rem;
}
h3 {
  margin: 1rem 0 0.6rem;
  color: var(--color-heading);
}
a {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  min-height: 52px;
  padding: 0.8rem;
  background: var(--color-secondary);
  color: var(--color-heading);
  border-radius: 0.6rem;
}
a span:last-child {
  margin-left: auto;
  color: var(--color-accent);
}
</style>
