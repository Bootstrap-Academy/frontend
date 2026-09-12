<template>
  <main class="course-player">
    <NuxtLink :to="overviewLink" class="back-link">← {{ course?.title || copy.back }}</NuxtLink>
    <p v-if="loading" class="player-state" role="status">{{ copy.loading }}</p>
    <section v-else-if="error || !course" class="player-state" role="alert">
      <p>{{ copy.loadError }}</p>
      <button type="button" @click="load">{{ copy.retry }}</button>
    </section>
    <template v-else-if="active">
      <header class="player-heading">
        <p>
          {{ active.sectionTitle }} · {{ copy.step }} {{ activeIndex + 1 }} {{ copy.of }}
          {{ steps.length }}
        </p>
        <h1>{{ active.title }}</h1>
        <progress
          :value="progress.completed"
          :max="progress.total || 1"
          :aria-label="copy.progress"
        />
      </header>
      <div class="player-content">
        <article class="lesson-content">
          <p v-if="active.description" class="lesson-description">{{ active.description }}</p>
          <CourseVideo
            v-if="hasVideo"
            :key="active.id"
            :course="course"
            :active-section="activeSection"
            :active-lecture="active"
          />
          <CoursePractice
            :key="`${id}:${active.id}`"
            class="lesson-practice"
            source="course"
            :source-id="id"
            :section="active.sectionID"
            :lecture="active.id"
            :skill-i-d="skillID"
            :sub-skill-i-d="subSkillID"
            :heading="copy.practice"
            hide-empty
          />
          <p v-if="saveError" class="save-error" role="alert">{{ copy.saveError }}</p>
          <footer class="lesson-actions">
            <button
              v-if="activeIndex > 0"
              type="button"
              class="secondary-action"
              :disabled="saving"
              @click="go(steps[activeIndex - 1])"
            >
              ← {{ copy.previous }}
            </button>
            <button
              v-if="!active.completed"
              type="button"
              class="primary-action"
              :disabled="saving"
              @click="finishLecture"
            >
              {{ saving ? copy.loading : copy.complete }}
            </button>
            <button
              v-else-if="activeIndex < steps.length - 1"
              type="button"
              class="primary-action"
              @click="go(steps[activeIndex + 1])"
            >
              {{ copy.next }} →
            </button>
            <NuxtLink v-else :to="overviewLink" class="primary-action">{{ copy.finish }}</NuxtLink>
          </footer>
        </article>
        <aside class="player-curriculum">
          <details open>
            <summary>{{ copy.contents }}</summary>
            <CourseCurriculum :data="course" @watch="openLecture" />
          </details>
        </aside>
      </div>
    </template>
    <section v-else class="player-state">
      <NuxtLink
        v-if="course?.learning_path_id"
        :to="{ path: '/learn', query: { path: course.learning_path_id } }"
        class="primary-action"
        >{{ copy.continue }}</NuxtLink
      >
      <p v-else>{{ copy.noLesson }}</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { Course } from "~/types/courseTypes";
import {
  courseSteps,
  courseResumeStep,
  courseProgress,
  courseWatchLocation,
  lectureHasVideo,
  type CourseStep,
} from "~/utils/courseJourney";

definePageMeta({ middleware: ["auth"] });
const route = useRoute();
const router = useRouter();
const user = useUser();
const session = useSession();
const { copy } = useCourseExperienceCopy();
const course = ref<Course | null>(null);
const loading = ref(true);
const error = ref(false);
const saving = ref(false);
const saveError = ref(false);
const id = computed(() => String(route.params.id || ""));
const skillID = computed(() =>
  typeof route.query.skillID === "string" ? route.query.skillID : ""
);
const subSkillID = computed(() =>
  typeof route.query.subSkillID === "string" ? route.query.subSkillID : ""
);
const overviewLink = computed(() => ({
  path: `/courses/${encodeURIComponent(id.value)}`,
  query: {
    ...(skillID.value ? { skillID: skillID.value } : {}),
    ...(subSkillID.value ? { subSkillID: subSkillID.value } : {}),
  },
}));
const steps = computed(() => courseSteps(course.value));
const active = computed(
  () =>
    steps.value.find(
      (step) => step.id === route.query.lecture && step.sectionID === route.query.section
    ) || courseResumeStep(course.value)
);
const activeIndex = computed(() => steps.value.findIndex((step) => step.id === active.value?.id));
const activeSection = computed(() =>
  course.value?.sections.find((section) => section.id === active.value?.sectionID)
);
const progress = computed(() => courseProgress(course.value));
const hasVideo = computed(() => lectureHasVideo(active.value));
useHead(() => ({ title: active.value?.title || course.value?.title || copy.value.course }));
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
  course.value = null;
  try {
    const result = await GET(`/skills/courses/${encodeURIComponent(id.value)}`);
    if (!current()) return;
    course.value = result;
    if (active.value) await go(active.value);
    if (!current()) return;
    // This visit starts an existing entitled course; it does not buy or re-enrol it.
    await POST(`/skills/courses/${encodeURIComponent(id.value)}/watch`);
  } catch {
    if (current()) error.value = true;
  } finally {
    if (current()) loading.value = false;
  }
}
async function go(step: CourseStep) {
  saveError.value = false;
  await router.replace(
    courseWatchLocation(id.value, step, { skillID: skillID.value, subSkillID: subSkillID.value })
  );
}
function openLecture({ sectionID, lectureID }: { sectionID: string; lectureID: string }) {
  if (saving.value) return;
  const step = steps.value.find((step) => step.sectionID === sectionID && step.id === lectureID);
  if (step) go(step);
}
async function finishLecture() {
  if (!active.value || saving.value) return;
  const step = active.value;
  const ticket = generation;
  const owner = `${user.value?.id || ""}:${session.value?.id || ""}`;
  const current = () =>
    alive &&
    ticket === generation &&
    owner === `${user.value?.id || ""}:${session.value?.id || ""}`;
  saving.value = true;
  saveError.value = false;
  try {
    await PUT(
      `/skills/courses/${encodeURIComponent(id.value)}/lectures/${encodeURIComponent(step.id)}/complete`
    );
    if (!current()) return;
    const stored = course.value?.sections
      .flatMap((section) => section.lectures)
      .find((lecture) => lecture.id === step.id);
    if (stored) stored.completed = true;
    const next = steps.value[steps.value.findIndex((item) => item.id === step.id) + 1];
    if (next && active.value?.id === step.id) await go(next);
  } catch {
    // A lost response may still have recorded completion. Re-read before offering a retry;
    // never automatically repeat a reward-bearing mutation.
    if (!current()) return;
    try {
      const refreshed = await GET(`/skills/courses/${encodeURIComponent(id.value)}`);
      if (!current()) return;
      const recorded = courseSteps(refreshed).find((item) => item.id === step.id)?.completed;
      course.value = refreshed;
      saveError.value = !recorded;
    } catch {
      if (current()) saveError.value = true;
    }
  } finally {
    if (current()) saving.value = false;
  }
}
onMounted(load);
watch([id, () => user.value?.id, () => session.value?.id], load, { flush: "sync" });
onBeforeRouteLeave(() => !saving.value);
onBeforeUnmount(() => {
  alive = false;
  generation++;
});
</script>

<style scoped>
.course-player {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  max-width: 1440px;
  margin: auto;
  padding: 2rem clamp(1rem, 3vw, 3rem) 5rem;
  display: grid;
  gap: 2rem;
  color: var(--color-body);
}
.course-player :deep(:is(p, h1, h2, h3, li, button, summary, span, a)) {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.back-link {
  width: fit-content;
  color: var(--color-subheading);
}
.player-heading p {
  font-size: 0.85rem;
  color: var(--color-subheading);
  margin: 0 0 0.75rem;
}
h1 {
  color: var(--color-heading);
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  line-height: 1.2;
  margin: 0 0 1.3rem;
}
progress {
  width: min(100%, 34rem);
  height: 0.35rem;
  accent-color: var(--color-accent);
}
.player-content {
  display: grid;
  gap: 2rem;
}
.lesson-content {
  min-width: 0;
  display: grid;
  gap: 2rem;
  align-content: start;
}
.lesson-description {
  white-space: pre-line;
  max-width: 75ch;
  line-height: 1.8;
}
.lesson-practice {
  padding: 1.5rem;
  border: 1px solid var(--color-tertiary);
  border-radius: 1rem;
}
h2 {
  font-size: 1.25rem;
  color: var(--color-heading);
  margin-bottom: 1rem;
}
.player-curriculum {
  border: 1px solid var(--color-tertiary);
  padding: 1.25rem;
  border-radius: 1rem;
  align-self: start;
}
.player-curriculum > details > summary {
  color: var(--color-heading);
  cursor: pointer;
  margin-bottom: 1rem;
  font-weight: 600;
}
.lesson-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.primary-action {
  background: var(--color-accent);
  color: var(--color-primary);
  border-radius: 0.7rem;
  padding: 0.85rem 1.3rem;
  font-weight: 650;
  text-align: center;
}
.secondary-action {
  padding: 0.85rem 0;
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.save-error {
  color: var(--color-error);
}
.player-state {
  padding: 2rem 0;
}
.player-state button {
  color: var(--color-accent);
  padding: 0.75rem 0;
}
a:focus-visible,
button:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 4px;
}
@media (min-width: 1100px) {
  .player-content {
    grid-template-columns: minmax(0, 1fr) 310px;
  }
  .player-curriculum {
    position: sticky;
    top: 1.5rem;
  }
}
@media (max-width: 600px) {
  .lesson-practice {
    padding: 1rem;
  }
  .lesson-actions .primary-action {
    flex: 1;
  }
}
</style>
