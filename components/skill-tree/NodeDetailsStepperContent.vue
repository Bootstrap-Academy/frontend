<template>
	<section
		class="max-max-h-[70vh] h-fit w-full flex justify-between items-center"
	>
		<div class="content-container" v-if="activeStepper == 0">
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

		<div class="content-container" v-else-if="activeStepper == 1">
			<template v-if="coachings && coachings.length > 0">
				<SkillTreeNodeDetailsCard
					class="content"
					v-for="(coaching, i) of coachings"
					:key="i"
					:data="coaching"
					:subSkillID="subSkillID"
					type="coaching"
				/>
			</template>
			<h3 v-else class="text-center text-heading-3">
				{{ t('Headings.CoachingComingSoon') }}
			</h3>
		</div>

		<div class="content-container" v-else-if="activeStepper == 2">
			<template v-if="webinars && webinars.length > 0">
				<SkillTreeNodeDetailsCard
					class="content"
					v-for="(webinar, i) of webinars"
					:key="i"
					:data="webinar"
					:subSkillID="subSkillID"
					type="webinar"
				/>
			</template>
			<h3 v-else class="text-center text-heading-3">
				{{ t('Headings.WebinarsComingSoon') }}
			</h3>
		</div>
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
	@apply flex lg:flex-col gap-card w-full max-w-full max-h-[70vh] overflow-x-scroll snap-x
	lg:overflow-y-scroll lg:snap-y snap-mandatory;
}
.content {
	@apply flex-shrink-0 block snap-center w-fit lg:w-full max-w-[300px];
}
</style>
