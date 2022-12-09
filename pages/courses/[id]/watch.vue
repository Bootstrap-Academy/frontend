<!--
❌ Responsive UI
✅ Page Title
❌ Translation
❌ Animation
✅ middleware

❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

❌ Handle loading if data already exists
❌ Handle loading if data is empty
❌ Display data
❌ Handle empty state

❌ Api implemented
-->

<template>
	<div class="relative">
		<Head>
			<Title>Watch Course - {{ course?.title ?? '' }}</Title>
		</Head>

		<main
			v-if="course"
			class="container-fluid relative h-fit midXl:h-screen-main grid gap-card midXl:grid-cols-[1fr_350px] pt-card pb-container"
		>
			<CourseVideoControls
				class="midXl:col-span-2"
				:course="course"
				:activeSection="activeSection"
				:activeLecture="activeLecture"
				v-model="showCurriculum"
				v-if="!!activeSection && !!activeLecture"
			/>

			<CourseVideo
				:course="course"
				:activeSection="activeSection"
				:activeLecture="activeLecture"
				v-if="!!activeSection && !!activeLecture"
			/>

			<CourseCurriculum
				class="hidden midXl:block aside card sticky self-start top-container style-card bg-secondary w-full h-full max-h-full overflow-y-scroll"
				:data="course"
				@watch="watchThisLecture($event)"
			/>
		</main>

		<Transition class="block midXl:hidden" name="fade-in" mode="in-out">
			<section
				v-if="showCurriculum"
				@click.self="showCurriculum = false"
				class="h-screen w-screen bg-[#0b192edd] fixed left-0 top-0 z-[99999] overflow-y-scroll flex justify-end"
			>
				<XCircleIcon
					@click="showCurriculum = false"
					class="slide-right w-10 h-10 text-accent fixed right-[285px] top-card cursor-pointer"
				/>

				<CourseCurriculum
					class="card style-card bg-secondary max-w-[300px] sm:max-w-[350px] slide-right m-0 h-fit"
					:data="course"
					@watch="watchThisLecture($event)"
				/>
			</section>
		</Transition>
	</div>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';

import { XCircleIcon } from '@heroicons/vue/24/solid/index.js';

definePageMeta({
	middleware: ['auth'],
});

export default {
	components: {
		XCircleIcon,
	},
	head: {
		title: 'Watch Course',
	},
	setup() {
		const { t } = useI18n();

		const loading = ref(true);

		const route = useRoute();
		const router = useRouter();

		const course = useCourse();

		const activeSection = computed(() => {
			const sectionID = <string>(route.query?.section ?? '');
			let sections: any[] = course.value?.sections ?? [];
			if (!!!sections || sections.length <= 0) return null;

			let section = sections.find((sec) => sec.id == sectionID);
			console.log('activeSection', section);

			return !!section ? section : null;
		});

		const activeLecture = computed(() => {
			const lectureID = <string>(route.query?.lecture ?? '');
			let lectures: any[] = activeSection.value?.lectures ?? [];
			if (!!!lectures || lectures.length <= 0) return null;

			let lecture = lectures.find((lec) => lec.id == lectureID);

			console.log('activeLecture', lecture);

			return !!lecture ? lecture : null;
		});

		onMounted(async () => {
			const courseID = <string>(route.params?.id ?? '');
			if (!!!courseID) {
				loading.value = false;
				return;
			}

			await Promise.all([getCourseByID(courseID), watchCourse(courseID)]);

			loading.value = false;
		});

		const showCurriculum = ref(false);

		function watchThisLecture({ sectionID, lectureID }: any) {
			router.replace({
				path: route.path,
				query: { section: sectionID, lecture: lectureID },
			});

			showCurriculum.value = false;
		}

		return {
			t,
			loading,
			course,
			activeSection,
			activeLecture,
			showCurriculum,
			watchThisLecture,
		};
	},
};
</script>

<style scoped>
.slide-right {
	animation: slideRight 0.25s ease-out forwards;
}

@keyframes slideRight {
	0% {
		opacity: 0;
		transform: translateX(30px);
	}
	100% {
		opacity: 1;
		transform: translateX(0);
	}
}
</style>
