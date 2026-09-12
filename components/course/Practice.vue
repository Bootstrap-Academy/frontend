<template>
  <section
    v-if="!hideEmpty || error || (!loading && items.length)"
    class="course-practice"
    :aria-busy="loading"
  >
    <h2 v-if="heading && items.length">{{ heading }}</h2>
    <p v-if="loading" role="status">{{ copy.loading }}</p>
    <div v-else-if="error" role="alert">
      <p>{{ copy.practiceError }}</p>
      <button type="button" @click="load">{{ copy.retry }}</button>
    </div>
    <ol v-else-if="items.length">
      <li v-for="(item, index) in items" :key="`${item.kind}:${item.id}`">
        <NuxtLink :to="practiceLocation(item, source, sourceId, { skillID, subSkillID })">
          <span class="practice-number" aria-hidden="true">{{
            item.solved ? "✓" : index + 1
          }}</span>
          <span class="practice-title">{{ item.title || copy.practiceOpen }}</span>
          <span aria-hidden="true">→</span>
        </NuxtLink>
      </li>
    </ol>
    <p v-else>{{ copy.practiceEmpty }}</p>
  </section>
</template>

<script setup lang="ts">
import {
  loadCoursePractice,
  practiceLocation,
  type CoursePracticeItem,
} from "~/utils/coursePractice";
const props = defineProps<{
  source: "course" | "skill";
  sourceId: string;
  section?: string;
  lecture?: string;
  skillID?: string;
  subSkillID?: string;
  excludeLectureIds?: string[];
  hideEmpty?: boolean;
  heading?: string;
}>();
const { copy } = useCourseExperienceCopy();
const user = useUser();
const session = useSession();
const loading = ref(true);
const error = ref(false);
const items = ref<CoursePracticeItem[]>([]);
let generation = 0;
let alive = true;
async function load() {
  const ticket = ++generation;
  const owner = `${user.value?.id || ""}:${session.value?.id || ""}`;
  const current = () =>
    alive &&
    ticket === generation &&
    owner === `${user.value?.id || ""}:${session.value?.id || ""}`;
  loading.value = true;
  error.value = false;
  items.value = [];
  try {
    const result = await loadCoursePractice(
      GET,
      {
        source: props.source,
        id: props.sourceId,
        section: props.section,
        lecture: props.lecture,
        excludeLectureIds: props.excludeLectureIds,
      },
      current
    );
    if (current()) items.value = result;
  } catch {
    if (current()) error.value = true;
  } finally {
    if (current()) loading.value = false;
  }
}
onMounted(load);
watch(
  [
    () => props.sourceId,
    () => props.section,
    () => props.lecture,
    () => user.value?.id,
    () => session.value?.id,
  ],
  load,
  { flush: "sync" }
);
onBeforeUnmount(() => {
  alive = false;
  generation++;
});
</script>

<style scoped>
.course-practice {
  color: var(--color-body);
}
h2 {
  color: var(--color-heading);
  font-size: 1.25rem;
  margin-bottom: 1rem;
}
ol {
  display: grid;
  gap: 0.6rem;
}
a {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid var(--color-tertiary);
  border-radius: 0.8rem;
}
a:hover {
  background: var(--color-tertiary);
}
.practice-number {
  color: var(--color-accent);
  min-width: 1.5rem;
}
.practice-title {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
  line-height: 1.5;
  white-space: pre-line;
}
button {
  padding: 0.8rem 0;
  color: var(--color-accent);
}
a:focus-visible,
button:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 3px;
}
</style>
