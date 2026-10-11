<template>
  <main class="course-page">
    <NuxtLink :to="backLink" class="back-link">← {{ copy.back }}</NuxtLink>
    <p v-if="loading" class="course-state" role="status">{{ copy.loading }}</p>
    <section v-else-if="error || !course" class="course-state" role="alert">
      <h1>{{ copy.loadError }}</h1>
      <button type="button" @click="load">{{ copy.retry }}</button>
    </section>
    <template v-else>
      <header class="course-hero">
        <div class="hero-copy">
          <p class="eyebrow">{{ guest ? copy.courseLabel : copy.course }}</p>
          <h1>{{ course.title }}</h1>
          <p v-if="course.description" class="course-description">{{ course.description }}</p>
        </div>
        <img v-if="course.image" :src="course.image" alt="" class="course-cover" />
      </header>

      <aside class="course-action">
        <section v-if="guest" class="card grid gap-4 bg-secondary style-card">
          <p>{{ accountSentence }}</p>
          <NuxtLink to="/auth/signup" class="account-link">{{ guestText.signup }}</NuxtLink>
          <NuxtLink
            :to="{ path: '/auth/login', query: { redirect: route.fullPath } }"
            class="login-link"
            >{{ guestText.login }}</NuxtLink
          >
        </section>
        <CourseOverview
          v-else
          :data="course"
          :learning-plan="learningPlan"
          :curriculum="curriculum"
          :is-course-accessible="accessible"
          :skill-i-d="skillID"
          :sub-skill-i-d="subSkillID"
        />
      </aside>

      <div class="course-content">
        <section v-if="course.learning_goals?.length" class="course-goals">
          <h2>{{ copy.goals }}</h2>
          <ul>
            <li v-for="(goal, index) in course.learning_goals" :key="index">
              <span aria-hidden="true">✓</span>{{ goal }}
            </li>
          </ul>
        </section>

        <section v-if="curriculum" class="course-plan" aria-labelledby="course-plan-title">
          <h2 id="course-plan-title">{{ copy.contents }}</h2>
          <CourseCurriculumLessons :curriculum="curriculum" />
        </section>
        <section v-else-if="learningPlan" class="course-plan" aria-labelledby="course-plan-title">
          <h2 id="course-plan-title">{{ copy.contents }}</h2>
          <CourseLearningChapters
            v-if="learningPlan.path.chapters?.length"
            :plan="learningPlan"
            :course-id="id"
          />
          <ol v-else class="unit-list">
            <li v-for="unit in learningPlan.units" :key="unit.id">
              <CourseLearningUnit
                :unit="unit"
                :course-id="id"
                :path-id="learningPlan.path.id"
                :current="learningPlan.next?.unit.id === unit.id"
              />
            </li>
          </ol>
        </section>
        <section v-else-if="learningError" class="course-state" role="alert">
          <p>{{ copy.practiceError }}</p>
          <button type="button" @click="load">{{ copy.retry }}</button>
        </section>

        <section
          v-if="course.sections?.length && !curriculum"
          class="course-plan"
          aria-labelledby="course-materials-title"
        >
          <h2 id="course-materials-title">{{ learningPlan ? copy.materials : copy.contents }}</h2>
          <CourseCurriculum
            :data="course"
            :is-course-accessible="accessible"
            @watch="openLecture"
          />
        </section>
        <p
          v-else-if="!course.learning_path_id && !course.has_explicit_curriculum"
          class="course-state"
        >
          {{ copy.noLesson }}
        </p>

        <CoursePractice
          v-if="accessible && course.sections?.length && !curriculum"
          source="course"
          :source-id="id"
          :exclude-lecture-ids="courseSteps(course).map((step) => step.id)"
          :skill-i-d="skillID"
          :sub-skill-i-d="subSkillID"
          :heading="copy.practiceMore"
          hide-empty
        />
        <details v-if="course.requirements?.length" class="course-requirements">
          <summary>{{ copy.requirements }}</summary>
          <ul>
            <li v-for="(requirement, index) in course.requirements" :key="index">
              {{ requirement }}
            </li>
          </ul>
        </details>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import { useI18n } from "vue-i18n";
import type { SessionIdentity } from "~/types/sessionIdentity";
import type { Course, CourseLearningPlan } from "~/types/courseTypes";
import type { CourseCurriculum } from "~/types/learningActivities";
import { courseSteps, courseWatchLocation } from "~/utils/courseJourney";
import { guestCopy } from "~/utils/guest/copy";
import { pageTitle, shortDescription } from "~/utils/siteHead";

// Anyone may read what a course is about. Learning, exercises and progress belong to an
// account: without one the page shows the way to it and nothing that needs a login.
const route = useRoute();
const router = useRouter();
const { locale } = useI18n();
const { copy, localized, localizeCourse } = useCourseExperienceCopy();
const guestText = computed(() => guestCopy(locale.value));
const token = useAccessToken();
const guest = computed(() => !token.value);
// What the box says to a visitor without an account. A course with a price says that it
// costs something; the amount and the purchase stay behind the login.
const accountSentence = computed(() =>
  (course.value?.price ?? 0) > 0
    ? `${copy.value.accountNeeded} ${copy.value.paidCourse}`
    : copy.value.accountNeeded
);
const user = useUser();
const session: Ref<SessionIdentity | null> = useSession();
const originalCourse = ref<Course | null>(null);
const course = computed(() => (originalCourse.value ? localizeCourse(originalCourse.value) : null));
const learningPlan = ref<CourseLearningPlan | null>(null);
const curriculum = ref<CourseCurriculum | null>(null);
const loading = ref(true);
const error = ref(false);
// The API knows no course of this name.
const missing = ref(false);
const learningError = ref(false);
const accessible = ref(false);
const id = computed(() => String(route.params.id || ""));
const skillID = computed(() =>
  typeof route.query.skillID === "string" ? route.query.skillID : ""
);
const subSkillID = computed(() =>
  typeof route.query.subSkillID === "string" ? route.query.subSkillID : ""
);
const backLink = computed(() =>
  skillID.value && subSkillID.value
    ? `/skill-tree/${encodeURIComponent(skillID.value)}/${encodeURIComponent(subSkillID.value)}`
    : guest.value
      ? "/courses"
      : "/profile/courses"
);
const about = computed(() => shortDescription(course.value?.description) || undefined);
useSeoMeta({
  title: () => (course.value ? pageTitle(course.value.title) : undefined),
  ogTitle: () => (course.value ? pageTitle(course.value.title) : undefined),
  description: () => about.value,
  ogDescription: () => about.value,
  // An address without a course must not end up in a search index.
  robots: () => (missing.value ? "noindex" : undefined),
});
let generation = 0;
let alive = true;
async function load() {
  const ticket = ++generation;
  const expectedUser = user.value?.id;
  const expectedSession = session.value?.id;
  const current = () =>
    alive &&
    ticket === generation &&
    expectedUser === user.value?.id &&
    expectedSession === session.value?.id;
  loading.value = true;
  error.value = learningError.value = missing.value = false;
  originalCourse.value = null;
  learningPlan.value = null;
  curriculum.value = null;
  accessible.value = false;
  try {
    let detail: Course;
    let owns = false;
    const summary = () => GET(`/skills/courses/${encodeURIComponent(id.value)}/summary`);
    // Without an account only the summary is public, so nothing else is asked for.
    if (guest.value) detail = await summary();
    else
      try {
        detail = await GET(`/skills/courses/${encodeURIComponent(id.value)}`);
        owns = true;
      } catch (cause: any) {
        const status = cause?.response?.status || cause?.statusCode || cause?.status;
        if (![401, 403].includes(status)) throw cause;
        detail = await summary();
      }
    if (!current()) return;
    originalCourse.value = detail;
    accessible.value = owns;
    if (owns && detail.has_explicit_curriculum) {
      try {
        const outline = await GET(`/skills/courses/${encodeURIComponent(id.value)}/curriculum`);
        if (
          outline?.course_id !== id.value ||
          outline.explicit !== true ||
          !Array.isArray(outline.lessons)
        )
          throw new Error("Invalid curriculum");
        if (current()) curriculum.value = outline;
      } catch {
        if (current()) learningError.value = true;
      }
    } else if (owns && detail.learning_path_id) {
      try {
        const plan = await GET(`/skills/courses/${encodeURIComponent(id.value)}/learning`);
        if (current()) learningPlan.value = plan;
      } catch {
        if (current()) learningError.value = true;
      }
    }
  } catch (cause: any) {
    if (current()) {
      error.value = true;
      missing.value = (cause?.response?.status || cause?.statusCode || cause?.status) === 404;
    }
  } finally {
    if (current()) loading.value = false;
  }
}
function openLecture({ sectionID, lectureID }: { sectionID: string; lectureID: string }) {
  if (!accessible.value) return;
  router.push(
    courseWatchLocation(
      id.value,
      { sectionID, id: lectureID },
      { skillID: skillID.value, subSkillID: subSkillID.value }
    )
  );
}
onMounted(load);
watch([id, () => user.value?.id, () => session.value?.id, guest], load, { flush: "sync" });
onBeforeUnmount(() => {
  alive = false;
  generation++;
});
</script>

<style scoped>
.course-page {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  width: min(1220px, 100%);
  margin: 0 auto;
  padding: 2rem clamp(1rem, 4vw, 3rem) 5rem;
  display: grid;
  gap: 2rem;
  color: var(--color-body);
}
.course-page :deep(:is(p, h1, h2, h3, li, button, summary, span, a)) {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.back-link {
  width: fit-content;
  color: var(--color-subheading);
  font-size: 0.9rem;
}
.course-hero {
  display: flex;
  gap: 2rem;
  align-items: center;
  padding: 1rem 0;
}
.hero-copy {
  min-width: 0;
  flex: 1;
}
.eyebrow {
  margin-bottom: 0.75rem;
  color: var(--color-accent);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
h1 {
  color: var(--color-heading);
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 1.12;
  margin: 0 0 1.25rem;
  overflow-wrap: anywhere;
}
.course-description {
  max-width: 65ch;
  line-height: 1.8;
  white-space: pre-line;
}
.course-cover {
  width: 160px;
  height: 160px;
  object-fit: cover;
  border-radius: 1.5rem;
}
.course-content {
  display: grid;
  gap: 2rem;
  min-width: 0;
}
h2 {
  color: var(--color-heading);
  font-size: 1.35rem;
  margin: 0 0 1.25rem;
}
.course-goals,
.course-plan,
.course-requirements {
  border: 1px solid var(--color-tertiary);
  border-radius: 1.2rem;
  padding: clamp(1rem, 3vw, 1.75rem);
}
.course-goals ul {
  display: grid;
  gap: 0.9rem;
}
.course-goals li {
  display: flex;
  gap: 0.85rem;
  line-height: 1.5;
}
.course-goals li span {
  color: var(--color-accent);
}
.unit-list {
  display: grid;
  gap: 0;
}
.course-requirements summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--color-heading);
}
.course-requirements ul {
  list-style: disc;
  padding: 1rem 0 0 1.25rem;
  line-height: 1.8;
}
.course-state {
  padding: 2rem 0;
}
.course-state button {
  color: var(--color-accent);
  padding: 0.75rem 0;
}
.account-link {
  padding: 0.75rem 1.25rem;
  border-radius: 0.25rem;
  background: var(--color-accent);
  color: var(--color-primary);
  font-weight: 700;
  text-align: center;
}
.login-link {
  justify-self: center;
  padding: 0.5rem;
  color: var(--color-accent);
}
a:focus-visible,
button:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 5px;
}
@media (min-width: 900px) {
  .course-page {
    grid-template-columns: minmax(0, 1fr) 290px;
  }
  .back-link,
  .course-hero {
    grid-column: 1 / -1;
  }
  .course-content {
    grid-column: 1;
    grid-row: 3;
  }
  .course-action {
    grid-column: 2;
    grid-row: 3;
    align-self: start;
    position: sticky;
    top: 1.5rem;
  }
}
@media (max-width: 600px) {
  .course-cover {
    display: none;
  }
  .course-page {
    gap: 1.5rem;
  }
}
</style>
