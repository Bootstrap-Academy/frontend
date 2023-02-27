<template>
	<main
		class="h-screen-inner overflow-hidden container pt-card pb-card mt-card-sm grid grid-cols-[400px_minmax(0,1fr)] gap-y-card gap-x-container"
	>
		<SectionTitle
			subheading="Web Development / Angular Skill"
			heading="Quizzes"
		/>

		<FormQuizAnswer :data="selectedQuiz ?? quizzes[0]" class="row-span-2" />

		<aside class="grid gap-card max-h-full overflow-scroll">
			<QuizCard
				v-for="(quiz, i) of quizzes"
				:key="i"
				full
				:data="quiz"
				@click="selectedQuiz = quiz"
			/>
			<QuizCard
				v-for="(quiz, i) of quizzes"
				:key="i"
				full
				:data="quiz"
				@click="selectedQuiz = quiz"
			/>
			<QuizCard
				v-for="(quiz, i) of quizzes"
				:key="i"
				full
				:data="quiz"
				@click="selectedQuiz = quiz"
			/>
			<QuizCard
				v-for="(quiz, i) of quizzes"
				:key="i"
				full
				:data="quiz"
				@click="selectedQuiz = quiz"
			/>
		</aside>
	</main>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';

definePageMeta({
	layout: 'inner',
	title: 'Quizzes',
});

export default {
	setup() {
		const { t } = useI18n();

		const route = useRoute();

		const skillID = computed(() => {
			return route.params?.id ?? '';
		});

		const selectedQuiz = ref();

		const quizzes = [
			{
				question: 'What is Vue?',
				type: 'multi-choice',
				price: 0,
				options: [
					{
						answer: 'Framework',
						correct: false,
					},
					{
						answer: 'Node JS',
						correct: false,
					},
					{
						answer: 'Library',
						correct: true,
					},
				],
			},
			{
				question: 'Which is the powerhouse of cell?',
				type: 'multi-choice',
				price: 1,
				options: [
					{
						answer: 'Mitochondria',
						correct: true,
					},
					{
						answer: 'Plasma',
						correct: false,
					},
					{
						answer: 'Brain',
						correct: false,
					},
				],
			},
		];
		return { t, skillID, quizzes, selectedQuiz };
	},
};
</script>

<style scoped></style>
