<!--
❌ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Handle loading if data already exists
✅ Handle loading if data is empty
✅ Display data
✅ Handle empty state

✅ Api implemented
-->
<template>
	<main
		class="grid-auto gap-card container h-screen-inner min pb-container pt-container grid-rows-[auto_auto_1fr]"
	>
		<FormSearch
			class="justify-self-end col-span-full"
			placeholder="Body.SearchCourses"
			v-model="filters.search_term"
		/>

		<Sort
			class="mb-card-sm col-span-full"
			:quantity="myCourses.length"
			:options="options"
			@selected="onSelectedOption($event)"
		/>

		<template v-if="loading">
			<CourseCardSkeleton v-for="n in 5" :key="n" />
		</template>

		<template v-else-if="myCourses && myCourses.length > 0">
			<NuxtLink
				v-for="(course, i) of myCourses"
				:key="i"
				:to="`/courses/${course.id}`"
			>
				<CourseCard :data="course" />
			</NuxtLink>
		</template>

		<CourseCardEmptyState class="col-span-full" v-else />
	</main>
</template>

<script lang="ts">
definePageMeta({
  layout: 'inner',
  middleware: ['auth'],
});

export default {
  head: {
    title: 'My Courses',
  },
  setup() {
    const myCourses = useMyCourses();

    const loading = ref(myCourses.value.length <= 0);

    function onSelectedOption(option: string) {
      filters.free = option == 'free';
      filters.recent_first = option == 'lastSeen';
    }

    const filters: any = reactive({
      free: false,
      recent_first: false,
      search_term: '',
    });

    watch(
      () => filters,
      async (newValue, oldValue) => {
        loading.value = true;
        await getFilteredMyCourses(newValue);
        loading.value = false;
      },
      { deep: true }
    );

    const options = reactive([
      {
        label: 'Headings.Free',
        value: 'free',
      },
      {
        label: 'Headings.LastSeen',
        value: 'lastSeen',
      },
    ]);

    return { loading, myCourses, onSelectedOption, filters, options };
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
