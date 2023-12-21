<template>
	<main
		class="grid-auto place-content-start gap-card container h-screen-inner min pb-container pt-container"
	>
		<FormSearch
			class="justify-self-end col-span-full"
			placeholder="Body.SearchQuizzes"
			v-model="filters.search_term"
		/>

		<Sort
			class="mb-card-sm col-span-full"
			:quantity="quizzes.length"
			:options="options"
			@selected="onSelectedOption($event)"
		/>

		<template v-if="loading">
			<QuizCardSkeleton v-for="n in 3" :key="n" class="h-fit" />
		</template>

		<template v-else-if="quizzes && quizzes.length > 0">
			<NuxtLink
				v-for="(quiz, i) of quizzes"
				:key="i"
				:to="`/quizzes/edit-${quiz.id}`"
			>
				<QuizCard :data="quiz" />
			</NuxtLink>
		</template>

		<template v-else>
			<QuizCardSkeleton class="child opacity-60" no-animate />
			<QuizCardSkeleton class="child opacity-40" no-animate />
			<QuizCardSkeleton class="child opacity-20" no-animate />
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
    title: 'My Courses',
  },
  setup() {
    const quizzes = useQuizzes();

    const loading = ref(quizzes.value.length <= 0);

    function onSelectedOption(option: string) {
      filters.latest = option == 'latest';
      filters.oldest = option == 'oldest';
    }

    const filters: any = reactive({
      latest: false,
      oldest: false,
      search_term: '',
    });

    watch(
      () => filters,
      async (newValue, oldValue) => {
        loading.value = true;
        await getFilteredQuizzes(newValue);
        loading.value = false;
      },
      { deep: true }
    );

    const options = reactive([
      {
        label: 'Headings.Latest',
        value: 'latest',
      },
      {
        label: 'Headings.Oldest',
        value: 'oldest',
      },
    ]);

    return { loading, quizzes, onSelectedOption, filters, options };
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
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
	}
}
</style>
