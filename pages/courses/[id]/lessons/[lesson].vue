<template>
  <main class="course-lesson">
    <NuxtLink :to="overview" :prefetch="false">← {{ course?.title || copy.course }}</NuxtLink>
    <div v-if="reauthRequired" role="alert">
      <p>{{ copy.session }}</p>
      <button type="button" @click="reauthenticate">{{ copy.signIn }}</button>
    </div>
    <p v-if="loading" role="status">{{ copy.loading }}</p>
    <div v-else-if="error || !lesson || !course || !activeId" role="alert">
      <p>{{ copy.error }}</p>
      <button type="button" @click="load">{{ copy.retry }}</button>
    </div>
    <template v-else>
      <h1>{{ title(lesson.title) }}</h1>
      <LearningLessonPlayer
        :lesson="lesson"
        :daily="lessonDaily"
        :active-activity-id="activeId"
        :locale="locale"
        :disabled="busy"
        @select="select"
      >
        <template #activity="{ activity }">
          <LearningLessonActivity
            ref="activityHandle"
            :key="`${owner}:${lesson.id}:${activity.id}`"
            :activity="activity"
            :course="course"
            :lesson-id="lesson.id"
            :locale="locale"
            @busy="busy = $event"
            @completed="recordCompletion"
            @next="next"
          />
        </template>
      </LearningLessonPlayer>
    </template>
  </main>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { Course } from "~/types/courseTypes";
import type { CourseCurriculum, LearningLesson } from "~/types/learningActivities";
import type { LocalizedText } from "~/types/learningRooms";

definePageMeta({ middleware: ["auth"] });
const route = useRoute();
const router = useRouter();
const { locale } = useI18n();
const { owner, request, reauthRequired, reauthenticate } = useLearningRooms({
  loadRoom: false,
  syncLocation: false,
});
const dailyState = useDailyLearning();
const course = ref<Course | null>(null);
const lesson = ref<LearningLesson | null>(null);
const curriculum = ref<CourseCurriculum | null>(null);
const loading = ref(true);
const error = ref(false);
const busy = ref(false);
const activityHandle = ref<{ canLeave: () => Promise<boolean>; shouldWarn: () => boolean } | null>(
  null
);
const courseId = computed(() => String(route.params.id || ""));
const lessonId = computed(() => String(route.params.lesson || ""));
const lessonDaily = computed(() =>
  dailyState.forLesson(courseId.value, lesson.value?.id || lessonId.value, lesson.value?.daily)
);
const overview = computed(() => `/courses/${encodeURIComponent(courseId.value)}`);
const activeId = computed(() => {
  const requested = typeof route.query.activity === "string" ? route.query.activity : null;
  if (requested)
    return lesson.value?.activities.some((activity) => activity.id === requested)
      ? requested
      : null;
  return (
    (lesson.value?.initial_activity_id &&
    lesson.value.activities.some((activity) => activity.id === lesson.value?.initial_activity_id)
      ? lesson.value.initial_activity_id
      : null) ||
    lesson.value?.activities.find((activity) => activity.completed !== true)?.id ||
    lesson.value?.activities[0]?.id ||
    null
  );
});
const title = (value?: LocalizedText) => value?.[locale.value.startsWith("de") ? "de" : "en"] || "";
const copy = computed(() =>
  locale.value.startsWith("de")
    ? {
        course: "Zum Kurs",
        loading: "Wird geladen …",
        error: "Die Lektion konnte nicht geladen werden.",
        retry: "Nochmal versuchen",
        session: "Melde dich bitte nochmal an.",
        signIn: "Anmelden",
      }
    : {
        course: "Back to course",
        loading: "Loading …",
        error: "The lesson couldn't be loaded.",
        retry: "Try again",
        session: "Please sign in again.",
        signIn: "Sign in",
      }
);
useHead(() => ({ title: title(lesson.value?.title) || course.value?.title || copy.value.course }));
let generation = 0;
let alive = true;
async function load() {
  const ticket = ++generation;
  const expectedOwner = owner.value;
  const expectedCourse = courseId.value;
  const expectedLesson = lessonId.value;
  const current = () => alive && ticket === generation && expectedOwner === owner.value;
  loading.value = true;
  error.value = false;
  busy.value = false;
  course.value = lesson.value = curriculum.value = null;
  if (!expectedOwner) return;
  try {
    const base = `/skills/courses/${encodeURIComponent(expectedCourse)}`;
    const [courseResponse, lessonResponse, outline] = await Promise.all([
      request.value(base),
      request.value(`${base}/lessons/${encodeURIComponent(expectedLesson)}`),
      request.value(`${base}/curriculum`),
    ]);
    if (!current()) return;
    if (
      courseResponse?.id !== expectedCourse ||
      lessonResponse?.course_id !== expectedCourse ||
      !(
        lessonResponse?.id === expectedLesson ||
        (lessonResponse?.initial_activity_id === expectedLesson &&
          lessonResponse?.activities?.some((activity: any) => activity.id === expectedLesson))
      ) ||
      lessonResponse.explicit !== true ||
      !Array.isArray(lessonResponse.activities) ||
      !lessonResponse.activities.length ||
      outline?.course_id !== expectedCourse ||
      !Array.isArray(outline.lessons)
    )
      throw new Error("Invalid lesson response");
    course.value = courseResponse;
    lesson.value = lessonResponse;
    curriculum.value = outline;
    if (typeof route.query.activity !== "string" && activeId.value)
      await router.replace({ query: { ...route.query, activity: activeId.value } });
  } catch {
    if (current()) error.value = true;
  } finally {
    if (current()) loading.value = false;
  }
}
async function canLeave() {
  return !activityHandle.value || (await activityHandle.value.canLeave());
}
async function select(id: string) {
  if (
    !lesson.value?.activities.some((activity) => activity.id === id) ||
    id === activeId.value ||
    !(await canLeave())
  )
    return;
  await router.replace({ query: { ...route.query, activity: id } });
}
function recordCompletion(id: string) {
  const activity = lesson.value?.activities.find((item) => item.id === id);
  if (activity) activity.completed = true;
}
async function next() {
  if (!lesson.value || !(await canLeave())) return;
  const index = lesson.value.activities.findIndex((activity) => activity.id === activeId.value);
  const following = lesson.value.activities[index + 1];
  if (following) return await select(following.id);
  const lessonIndex =
    curriculum.value?.lessons.findIndex((item) => item.id === lesson.value?.id) ?? -1;
  const nextLesson = lessonIndex >= 0 ? curriculum.value?.lessons[lessonIndex + 1] : null;
  await router.push(
    nextLesson
      ? `/courses/${encodeURIComponent(courseId.value)}/lessons/${encodeURIComponent(nextLesson.id)}`
      : overview.value
  );
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (!activityHandle.value?.shouldWarn()) return;
  event.preventDefault();
  event.returnValue = "";
}
onBeforeRouteLeave(canLeave);
onBeforeRouteUpdate(async (to) => {
  if (
    to.params.id === route.params.id &&
    to.params.lesson === route.params.lesson &&
    to.query.activity === route.query.activity
  )
    return true;
  return await canLeave();
});
watch([courseId, lessonId, owner], load, { immediate: true, flush: "sync" });
onMounted(() => window.addEventListener("beforeunload", beforeUnload));
onBeforeUnmount(() => {
  alive = false;
  generation++;
  window.removeEventListener("beforeunload", beforeUnload);
});
</script>

<style scoped>
.course-lesson {
  width: min(1056px, calc(100% - 32px));
  margin: 32px auto 80px;
  color: var(--color-heading);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
h1 {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  margin: 1.5rem 0;
}
a,
button {
  min-height: 44px;
  color: var(--color-accent);
}
.course-lesson :deep(:is(button, input, textarea, select)) {
  font: inherit;
}
</style>
