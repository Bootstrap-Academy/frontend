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
		class="grid grid-cols-1 gap-card container h-screen-inner min pb-container pt-container grid-rows-[auto_auto_1fr]"
	>
		<FormSearch
			class="justify-self-end col-span-full"
			placeholder="Body.SearchCourses"
			v-model="filters.search_term"
		/>

		<Sort
			class="mb-card-sm col-span-full"
			:quantity="challengesCategories.length"
			:options="options"
			@selected="onSelectedOption($event)"
		/>

		<template v-for="(category, i) of challengesCategories" :key="category.id">
			<ChallengesCategory :data="category" mine />
			<hr class="mt-box" v-if="i < challengesCategories.length - 1" />
		</template>
	</main>
</template>

<script lang="ts">
definePageMeta({
  layout: 'inner',
  middleware: ['auth'],
});

export default {
  head: {
    title: 'My Challenges',
  },
  setup() {
    const challengesCategories = useChallengesCategories();
    const loading = ref(challengesCategories.value.length <= 0);

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
        await getChallengesCategories();
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

    return {
      loading,
      challengesCategories,
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
