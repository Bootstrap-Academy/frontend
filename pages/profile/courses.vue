<template>
  <main
    class="grid-auto h-screen-inner min container grid-rows-[auto_auto_1fr] gap-card pt-container pb-container"
  >
    <FormSearch
      live
      class="col-span-full justify-self-end"
      placeholder="Body.SearchCourses"
      v-model="filters.search_term"
    />

    <Sort
      class="col-span-full mb-card-sm"
      :quantity="myCourses.length"
      :options="options"
      @selected="onSelectedOption($event)"
    />

    <div v-if="failed" role="alert" class="col-span-full">
      <p>{{ t("Error.TryAgainLater") }}</p>
      <Btn secondary class="mt-4" @click="loadCourses">{{ retry }}</Btn>
    </div>

    <template v-else-if="loading">
      <CourseCardSkeleton v-for="n in 5" :key="n" />
    </template>

    <template v-else-if="myCourses && myCourses.length > 0">
      <NuxtLink
        v-for="(course, i) of visibleCourses"
        :key="course.id"
        :to="`/courses/${course.id}`"
      >
        <CourseCard :data="course" :eager-image="Number(i) < 3" />
      </NuxtLink>
      <Btn
        v-if="visibleCount < myCourses.length"
        secondary
        class="col-span-full justify-self-center"
        @click="visibleCount += 12"
      >
        {{ loadMore }}
      </Btn>
    </template>

    <CourseCardEmptyState class="col-span-full" v-else />
  </main>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { getCourseCatalogue } from "~/composables/courses";
import type { Course } from "~/types/courseTypes";
import type { CourseCatalogueFilters } from "~/utils/courseCatalogue";

definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  head: {
    title: "My Courses",
  },
  setup() {
    const myCourses = ref<Course[]>([]);
    const { locale, t } = useI18n();
    const retry = computed(() => (locale.value === "de" ? "Noch einmal versuchen" : "Try again"));
    const loadMore = computed(() =>
      locale.value === "de" ? "Mehr Kurse anzeigen" : "Load more courses"
    );
    const visibleCount = ref(12);
    const visibleCourses = computed(() => myCourses.value.slice(0, visibleCount.value));
    watch(myCourses, () => (visibleCount.value = 12));

    const loading = ref(true);
    const failed = ref(false);
    const user = useUser();
    const session = useSession();
    const owner = computed(() => `${user.value?.id || ""}:${session.value?.id || ""}`);
    let epoch = 0;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function onSelectedOption(option: string) {
      filters.free = option == "free";
      filters.recent_first = option == "lastSeen";
    }

    const filters = reactive<CourseCatalogueFilters>({
      free: false,
      recent_first: true,
      search_term: "",
    });

    async function loadCourses() {
      clearTimeout(timer);
      const request = ++epoch;
      const expectedOwner = owner.value;
      loading.value = true;
      failed.value = false;
      const [courses, error] = await getCourseCatalogue({ ...filters });
      if (!alive || request !== epoch || expectedOwner !== owner.value) return;
      myCourses.value = courses || [];
      failed.value = !!error;
      loading.value = false;
    }

    function schedule(delay: number) {
      ++epoch;
      clearTimeout(timer);
      loading.value = true;
      failed.value = false;
      visibleCount.value = 12;
      timer = setTimeout(loadCourses, delay);
    }

    onMounted(loadCourses);
    onBeforeUnmount(() => {
      alive = false;
      ++epoch;
      clearTimeout(timer);
    });

    watch(
      () => [filters.search_term, filters.free, filters.recent_first],
      (next, previous) => schedule(next[0] !== previous[0] ? 250 : 0),
      { flush: "sync" }
    );
    watch(owner, () => {
      myCourses.value = [];
      schedule(0);
    });

    const options = reactive([
      {
        label: "Headings.Free",
        value: "free",
      },
      {
        label: "Headings.LastSeen",
        value: "lastSeen",
      },
    ]);

    return {
      loading,
      failed,
      retry,
      loadCourses,
      t,
      myCourses,
      visibleCourses,
      visibleCount,
      loadMore,
      onSelectedOption,
      filters,
      options,
    };
  },
};
</script>

<style scoped>
.grid-auto {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 425px) {
  .grid-auto {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}
</style>
