<template>
	<section
		class="max-max-h-[70vh] h-fit w-full flex justify-between items-center"
	>
		<div
			class="content-container"
			v-if="activeStepper == 0"
			:class="{ 'hide-scrollbar': !!!courses || courses.length <= 0 }"
		>
			<template v-if="courses && courses.length > 0">
				<NuxtLink
					class="content"
					v-for="(course, i) of courses"
					:key="i"
					:to="`/courses/${course.id}`"
				>
					<CourseCard :data="course" />
				</NuxtLink>
			</template>

			<h3 v-else class="text-center text-heading-3">
				{{ t('Headings.CoursesComingSoon') }}
			</h3>
		</div>

		<div
			class="content-container"
			v-else-if="activeStepper == 1"
			:class="{ 'hide-scrollbar': !!!coachings || coachings.length <= 1 }"
		>
			<template v-if="coachings && coachings.length > 0">
				<CalendarEvent
					class="content full"
					v-for="(coaching, i) of coachings"
					:key="i"
					full
					:data="coaching"
					:subSkillID="subSkillID"
				/>
			</template>
			<h3 v-else class="text-center text-heading-3">
				{{ t('Headings.CoachingComingSoon') }}
			</h3>
		</div>

		<div
			class="content-container"
			v-else-if="activeStepper == 2"
			:class="{ 'hide-scrollbar': !!!webinars || webinars.length <= 1 }"
		>
			<template v-if="webinars && webinars.length > 0">
				<CalendarEvent
					class="content"
					v-for="(webinar, i) of webinars"
					:key="i"
					full
					:data="webinar"
					:subSkillID="subSkillID"
				/>
			</template>
			<h3 v-else class="text-center text-heading-3">
				{{ t('Headings.WebinarsComingSoon') }}
			</h3>
		</div>

		<article v-else-if="activeStepper == 3">
			<NuxtLink to="/quizzes/create">
				<Btn>+ {{ t('Buttons.AddQuizQuestion') }}</Btn>
			</NuxtLink>
			<div
				class="content-container mt-card"
				:class="{
					'hide-scrollbar': !!!quizQuestions || quizQuestions.length <= 1,
				}"
			>
				<template v-if="quizQuestions && quizQuestions.length > 0">
					<NuxtLink
						to="/quizzes/skill-23424"
						class="content"
						v-for="(quizQuestion, i) of quizQuestions"
						:key="i"
					>
						<QuizCard full :data="quizQuestion" :subSkillID="subSkillID" />
					</NuxtLink>
				</template>
				<h3 v-else class="text-center text-heading-3">
					{{ t('Headings.QuizQuestionsComingSoon') }}
				</h3>
			</div>
		</article>
	</section>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		subSkillID: { default: '' },
		activeStepper: { default: 0 },
		courses: { type: Array as PropType<any[]>, default: [] },
		coachings: { default: [] },
		webinars: { default: [] },
		quizQuestions: {
			default: [
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
			],
		},
	},
	emits: [],
	setup(props, { emit }) {
		const { t } = useI18n();

		return { t };
	},
});
</script>

<style scoped>
.content-container {
	@apply flex lg:flex-col gap-card w-full max-w-full max-h-[70vh] overflow-x-scroll lg:overflow-x-auto snap-x lg:overflow-y-scroll lg:snap-y snap-mandatory;
}
.content {
	@apply flex-shrink-0 snap-center block w-fit lg:w-full max-w-[300px];
}
.content.full {
	@apply w-full;
}
</style>
