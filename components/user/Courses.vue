<template>
	<section>
		<SectionTitle
			sub
			:heading="header.heading"
			:body="header.body"
			:link="header.link"
		/>

		<div class="overflow-hidden max-h-[175px] md:max-h-fit md:overflow-auto">
			<div
				class="overflow-x-scroll snap-x snap-mandatory flex md:grid md:grid-cols-4 gap-card-sm"
			>
				<template v-if="loading">
					<CourseCardSmSkeleton
						v-for="n in 5"
						:key="n"
						:class="{ 'md:row-span-2 md:col-span-2': n == 1 }"
						class="flex-shrink-0 snap-center"
					/>
				</template>

				<template v-else-if="courses && courses.length > 0">
					<NuxtLink
						v-for="(course, i) of courses"
						:key="i"
						:to="`/courses/${course.id}`"
						:class="{
							'md:row-span-2 md:col-span-2': i == 0 && courses.length > 3,
						}"
						class="flex-shrink-0 snap-center cursor-pointer"
					>
						<CourseCardSm :data="course" />
					</NuxtLink>
				</template>

				<CourseCardSmEmptyState class="col-span-full" v-else />
			</div>
		</div>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	setup() {
		const { t } = useI18n();

		const loading = ref(true);

		const myCourses = useMyCourses();

		const courses = computed((): any[] => {
			return myCourses.value.slice(0, 5);
		});

		const header = reactive({
			heading: 'Headings.WatchedCourses',
			body: 'Body.WatchedCourses',
			link: { to: '/profile/courses', text: 'Buttons.ViewAll' },
		});

		onMounted(async () => {
			await getMyCourses();
			loading.value = false;

			if (courses.value && courses.value.length <= 0) {
				Object.assign(header, {
					heading: 'EmptyStates.CourseCardSM.Heading',
					body: 'EmptyStates.CourseCardSM.Body',
					link: { to: '/skill-tree', text: 'Links.SkillTree' },
				});
			}
		});

		return { t, loading, courses, header };
	},
});
</script>

<style scoped></style>
