<template>
  <main class="container pt-container pb-container">
    <h1 class="text-heading-1">{{ t("Headings.Courses") }}</h1>
    <p class="text-body-1 mt-2">{{ head.description }}</p>
    <input
      :value="search"
      type="search"
      class="course-search mt-card mb-card font-body"
      :placeholder="t('Body.SearchCourses')"
      :aria-label="t('Body.SearchCourses')"
      @input="search = ($event.target as HTMLInputElement).value"
    />

    <div v-if="failed" role="alert">
      <p>{{ t("Error.TryAgainLater") }}</p>
      <Btn secondary class="mt-4" @click="load">{{ copy.retry }}</Btn>
    </div>
    <p v-else-if="loading" role="status">{{ copy.loading }}</p>
    <ul v-else-if="found.length" class="course-list gap-card">
      <li v-for="(course, i) of found" :key="course.id">
        <NuxtLink :to="`/courses/${encodeURIComponent(course.id)}`">
          <CourseCard :data="course" plain :eager-image="i < 3" />
        </NuxtLink>
      </li>
    </ul>
    <CourseCardEmptyState v-else />
  </main>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { getCourseCatalogue } from "~/composables/courses";
import type { Course } from "~/types/courseTypes";
import { siteHead } from "~/utils/siteHead";

// The course list for visitors without an account: every course with a link to its page.
// With an account the catalogue is the course list; it also knows the progress.
definePageMeta({
  middleware: () => {
    if (useAppCookie("accessToken").value) return navigateTo("/profile/courses", { replace: true });
  },
});

const { locale, t } = useI18n();
const { copy, localizeCourse } = useCourseExperienceCopy();
const head = computed(() => siteHead[locale.value.startsWith("en") ? "en" : "de"].courses);
useSeoMeta({
  title: () => head.value.title,
  ogTitle: () => head.value.title,
  description: () => head.value.description,
  ogDescription: () => head.value.description,
});

const courses = ref<Course[]>([]);
const loading = ref(true);
const failed = ref(false);
const search = ref("");

// The courses that lead step by step come first, the others follow in the order of the API.
const ordered = computed(() => [
  ...courses.value.filter((course) => course.learning_path_id),
  ...courses.value.filter((course) => !course.learning_path_id),
]);
const found = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return ordered.value;
  return ordered.value.filter((course) => {
    const { title, description } = localizeCourse(course);
    return `${title} ${description ?? ""}`.toLowerCase().includes(term);
  });
});

async function load() {
  loading.value = true;
  failed.value = false;
  const [list, error] = await getCourseCatalogue({});
  courses.value = list || [];
  failed.value = !!error;
  loading.value = false;
}
onMounted(load);
</script>

<style scoped>
.course-search {
  display: block;
  width: min(100%, 24rem);
  padding: 0.6rem 1rem;
  border: 1px solid var(--color-tertiary);
  border-radius: 0.25rem;
  background: var(--color-secondary);
  color: var(--color-heading);
}
.course-search::placeholder {
  color: var(--color-subheading);
}
.course-search:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.course-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 425px) {
  .course-list {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}
</style>
