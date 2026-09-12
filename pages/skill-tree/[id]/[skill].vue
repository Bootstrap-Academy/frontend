<template>
  <main class="skill-learning-page">
    <SkillTreeHeader :absolute="false" no-zoom-level :breadcrumbs="breadcrumbs" />
    <p v-if="loading" class="skill-state" role="status">{{ copy.loading }}</p>
    <section v-else-if="error" class="skill-state" role="alert">
      <p>{{ copy.loadError }}</p>
      <button type="button" @click="load">{{ copy.retry }}</button>
    </section>
    <template v-else>
      <header class="skill-hero">
        <div>
          <p class="eyebrow">{{ copy.learning }}</p>
          <h1>{{ skill?.name || skillName }}</h1>
          <p>{{ copy.topicIntro }}</p>
        </div>
        <SkillTreeNodeSvg
          v-if="skill"
          :size="140"
          :node="skill"
          :active="true"
          :completed="skill?.completed || false"
          :navigate="false"
          :is-bookmarked="bookmarked"
          @bookmarked="toggleBookmark"
        />
      </header>
      <section v-if="courses.length" aria-labelledby="skill-courses-title">
        <h2 id="skill-courses-title">{{ copy.topicCourses }}</h2>
        <div class="topic-courses">
          <NuxtLink
            v-for="course in courses"
            :key="course.id"
            :to="courseLink(course.id)"
            class="topic-course"
            @click="rememberCourse(course.id)"
          >
            <img v-if="course.image" :src="course.image" alt="" />
            <div>
              <h3>{{ course.title }}</h3>
              <p v-if="course.learning_goals?.[0]">{{ course.learning_goals[0] }}</p>
              <p v-else-if="course.description" class="course-preview">{{ course.description }}</p>
              <span class="course-open">{{ copy.open }} <span aria-hidden="true">→</span></span>
            </div>
          </NuxtLink>
        </div>
      </section>
      <p v-else class="skill-state">{{ copy.topicEmpty }}</p>
      <section v-if="courseError" class="skill-state" role="alert">
        <p>{{ copy.loadError }}</p>
        <button type="button" @click="load">{{ copy.retry }}</button>
      </section>
      <details
        class="topic-practice"
        @toggle="practiceOpened ||= ($event.target as HTMLDetailsElement).open"
      >
        <summary>{{ copy.browsePractice }}</summary>
        <CoursePractice
          v-if="practiceOpened"
          source="skill"
          :source-id="subSkillID"
          :skill-i-d="rootSkillID"
          :sub-skill-i-d="subSkillID"
        />
      </details>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { Course } from "~/types/courseTypes";
definePageMeta({ middleware: ["auth"] });
const { copy, localizeCourse } = useCourseExperienceCopy();
const route = useRoute();
const user = useUser();
const session = useSession();
const rootSkillID = computed(() => String(route.params.id || ""));
const subSkillID = computed(() => String(route.params.skill || ""));
const skillName = computed(() => subSkillID.value.replaceAll("_", " "));
const skill = ref<any>(null);
const originalCourses = ref<Course[]>([]);
const courses = computed(() => originalCourses.value.map(localizeCourse));
const bookmarked = ref(false);
const loading = ref(true);
const error = ref(false);
const courseError = ref(false);
const practiceOpened = ref(false);
const breadcrumbs = computed(() => [
  { label: "Headings.RootSkillTree", to: "/skill-tree" },
  {
    label: rootSkillID.value.replaceAll("_", " "),
    to: `/skill-tree/${encodeURIComponent(rootSkillID.value)}`,
  },
  { label: skill.value?.name || skillName.value },
]);
useHead(() => ({ title: skill.value?.name || skillName.value }));
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
  error.value = courseError.value = false;
  practiceOpened.value = false;
  originalCourses.value = [];
  skill.value = null;
  try {
    const tree = await GET(`/skills/skilltree/${encodeURIComponent(rootSkillID.value)}`);
    if (!current()) return;
    const selected = tree.skills?.find((item: any) => item.id === subSkillID.value);
    if (!selected) throw new Error("Unknown skill");
    skill.value = selected;
    bookmarked.value = !!selected.is_bookmarked;
    const responses = await Promise.allSettled(
      (selected.courses || []).map((id: string) =>
        GET(`/skills/courses/${encodeURIComponent(id)}/summary`)
      )
    );
    if (!current()) return;
    courseError.value = responses.some((response) => response.status === "rejected");
    originalCourses.value = responses
      .flatMap((response) =>
        response.status === "fulfilled" && response.value ? [response.value as Course] : []
      )
      .sort((a, b) => Number(!!b.learning_path_id) - Number(!!a.learning_path_id));
  } catch {
    if (current()) error.value = true;
  } finally {
    if (current()) loading.value = false;
  }
}
async function toggleBookmark(value: boolean) {
  const ticket = generation;
  try {
    if (value) await createBookmark(rootSkillID.value, subSkillID.value);
    else await deleteBookmark(rootSkillID.value, subSkillID.value);
    if (alive && ticket === generation) bookmarked.value = value;
  } catch {
    openSnackbar("error", copy.value.errorTitle);
  }
}
const courseLink = (id: string) => ({
  path: `/courses/${encodeURIComponent(id)}`,
  query: { skillID: rootSkillID.value, subSkillID: subSkillID.value },
});
function rememberCourse(courseId: string) {
  useAppCookie("lastViewCourse").value = {
    courseId,
    skillID: rootSkillID.value,
    subSkillID: subSkillID.value,
  };
}
onMounted(load);
watch([rootSkillID, subSkillID, () => user.value?.id, () => session.value?.id], load);
onBeforeUnmount(() => {
  alive = false;
  generation++;
});
</script>

<style scoped>
.skill-learning-page {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 2rem clamp(1rem, 4vw, 3rem) 5rem;
  display: grid;
  gap: 2.5rem;
  color: var(--color-body);
}
.skill-learning-page :deep(:is(p, h1, h2, h3, li, button, summary)) {
  font-family: inherit;
}
.skill-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}
.skill-hero > div {
  max-width: 60ch;
}
.eyebrow {
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.8rem;
  margin: 0 0 0.65rem;
}
h1 {
  color: var(--color-heading);
  font-size: clamp(2rem, 5vw, 3.5rem);
  margin: 0 0 1rem;
  overflow-wrap: anywhere;
}
h2 {
  color: var(--color-heading);
  font-size: 1.4rem;
  margin-bottom: 1.1rem;
}
.topic-courses {
  display: grid;
  gap: 1rem;
}
.topic-course {
  display: flex;
  gap: 1.3rem;
  padding: 1.4rem;
  align-items: center;
  border: 1px solid var(--color-tertiary);
  border-radius: 1.15rem;
  background: var(--color-secondary);
}
.topic-course:hover {
  border-color: var(--color-accent);
}
.topic-course img {
  width: 100px;
  height: 100px;
  border-radius: 0.75rem;
  object-fit: cover;
}
.topic-course h3 {
  color: var(--color-heading);
  font-size: 1.2rem;
  line-height: 1.4;
}
.topic-course p {
  margin: 0.6rem 0;
  font-size: 0.95rem;
  line-height: 1.65;
}
.course-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.course-open {
  display: inline-flex;
  gap: 0.5rem;
  color: var(--color-accent);
  font-size: 0.9rem;
  margin-top: 0.7rem;
}
.topic-practice {
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-tertiary);
}
.topic-practice summary {
  color: var(--color-subheading);
  cursor: pointer;
  margin-bottom: 1.25rem;
}
.skill-state button {
  padding: 0.75rem 0;
  color: var(--color-accent);
}
a:focus-visible,
button:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 5px;
}
@media (max-width: 600px) {
  .skill-hero > :last-child:not(:first-child) {
    display: none;
  }
  .topic-course img {
    width: 64px;
    height: 64px;
  }
  .topic-course {
    padding: 1rem;
    align-items: start;
    gap: 1rem;
  }
}
</style>
