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
	<main
		v-if="course"
		class="container-fluid relative h-fit midXl:h-screen-main grid gap-card midXl:grid-cols-[1fr_350px] place-items-center place-content-center pt-container pb-container"
	>
		<Head>
			<Title>Watch Course - {{ course?.title ?? '' }}</Title>
		</Head>

		<div class="grid gap-card">
			<header class="flex gap-card justify-between" v-if="activeLecture">
				<div class="flex gap-box flex-wrap items-center">
					<NuxtLink
						:to="`/courses/${course?.id ?? ''}?section=${
							activeSection?.id ?? ''
						}&lecture=${activeLecture?.id ?? ''}`"
					>
						{{ course?.title ?? '' }} /
					</NuxtLink>

					<h1 class="text-heading-2 capitalize mr-6">
						{{ activeLecture?.title ?? '' }}
					</h1>

					<Chip
						v-if="
							activeLecture.completed ||
							listOfCompletedLectureIds.find((lec) => lec == activeLecture.id)
						"
						:icon="CheckIcon"
						color="bg-info"
					>
						{{ t('Headings.Completed') }}
					</Chip>
					<Btn
						sm
						v-else-if="!activeLecture.completed"
						secondary
						@click="markLectureAsComplete(activeLecture.id)"
					>
						{{ t('Buttons.MarkCompleted') }}
					</Btn>
				</div>

				<div
					class="block midXl:hidden bg-tertiary py-1 px-2 rounded-lg h-fit w-fit cursor-pointer"
					@click="showCurriculum = !showCurriculum"
				>
					<p class="text-accent text-body-2 justify-self-end">Content</p>
				</div>
			</header>

			<iframe
				v-if="videoSRC && activeLecture && activeLecture.type == 'youtube'"
				class="style-card"
				:src="videoSRC"
				title="YouTube player"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
			></iframe>

			<video
				v-else-if="videoSRC && activeLecture && activeLecture.type == 'mp4'"
				:poster="course.image"
				controls
				playsInline
				class="style-card"
				title="video player"
				allowfullscreen
			>
				<track kind="captions" />
				<source ref="refSource" :src="videoSRC" type="video/mp4" alt="Video" />
				<p class="vjs-no-js">
					To view this video please enable JavaScript, and consider upgrading to
					a web browser that
					<a
						sveltekit:prefetch
						href="https://videojs.com/html5-video-support/"
						target="_blank"
					>
						supports HTML5 video
					</a>
				</p>
			</video>

			<article class="flex gap-card justify-between items-center h-auto w-full">
				<Btn secondary @click="goToPrevLecture">
					{{ t('Buttons.Prev') }}
				</Btn>

				<Btn @click="goToNextLecture">
					{{ t('Buttons.Next') }}
				</Btn>
			</article>
		</div>

		<CourseCurriculum
			class="hidden midXl:block aside card sticky self-start top-container style-card bg-secondary w-full h-full max-h-full overflow-y-scroll"
			:data="course"
			@watch="watchThisLecture($event)"
		/>
		<Transition class="block midXl:hidden" name="fade-in" mode="in-out">
			<section
				v-if="showCurriculum"
				@click.self="showCurriculum = false"
				class="h-screen w-screen bg-[#0b192edd] fixed left-0 top-0 z-[99999] overflow-scroll flex justify-end"
			>
				<XCircleIcon
					@click="showCurriculum = false"
					class="slide-right w-10 h-10 text-accent fixed right-[82.5vw] sm:right-[370px] top-card cursor-pointer"
				/>

				<CourseCurriculum
					class="card style-card bg-secondary max-w-[80vw] sm:max-w-[350px] slide-right h-fit min-h-screen"
					:data="course"
					@watch="watchThisLecture($event)"
				/>
			</section>
		</Transition>
	</main>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';
import { Ref } from 'vue';
import {
	PlusCircleIcon,
	ArrowLeftIcon,
	CheckIcon,
	AdjustmentsVerticalIcon,
	XCircleIcon,
} from '@heroicons/vue/24/solid/index.js';

definePageMeta({
	middleware: ['auth'],
});

export default {
	components: {
		PlusCircleIcon,
		ArrowLeftIcon,
		CheckIcon,
		AdjustmentsVerticalIcon,
		XCircleIcon,
	},
	head: {
		title: 'Watch Course',
	},
	setup() {
		const { t } = useI18n();

		const loading = ref(true);
		const course = useCourse();

		const route = useRoute();
		const router = useRouter();

		const courseID = computed(() => {
			return <string>(route.params?.id ?? '');
		});

		const activeSectionID = computed(() => {
			return <string>(route.query?.section ?? '');
		});

		const activeSection = computed(() => {
			let sections: any[] = course.value?.sections ?? [];
			if (!!!sections || sections.length <= 0) return null;

			let section = sections.find((sec) => sec.id == activeSectionID.value);
			return !!section ? section : null;
		});

		const activeLectureID = computed(() => {
			return <string>(route.query?.lecture ?? '');
		});

		const activeLecture = computed(() => {
			let lectures: any[] = activeSection.value?.lectures ?? [];
			if (!!!lectures || lectures.length <= 0) return null;

			let lecture = lectures.find((lec) => lec.id == activeLectureID.value);
			return !!lecture ? lecture : null;
		});

		const videoSRC = useVideoSRC();

		onMounted(async () => {
			if (!!!courseID.value) {
				loading.value = false;
				return;
			}

			await Promise.all([
				getCourseByID(courseID.value),
				watchCourse(courseID.value),
			]);

			listOfCompletedLectureIds.value = lectures.value
				.map((lec) => {
					return lec.completed ? lec.id : '';
				})
				.filter((lec) => !!lec);

			loading.value = false;
		});

		let videoInterval: any;
		const refSource = ref<HTMLSourceElement | any>(null);

		watch(
			() => activeLecture.value,
			async (newValue, oldValue) => {
				if (!!!newValue) return;

				loading.value = true;
				clearInterval(videoInterval);

				await getLectureVideoSRC(courseID.value, newValue);
				refSource.value.setAttribute('src', videoSRC.value);

				videoInterval = setInterval(async () => {
					await getLectureVideoSRC(courseID.value, newValue);
					refSource.value.setAttribute('src', videoSRC.value);
					refSource.value.src = videoSRC.value;
				}, 40000);

				loading.value = false;
			},
			{ deep: true }
		);

		function watchThisLecture({ sectionID, lectureID }: any) {
			router.replace({
				path: route.path,
				query: { section: sectionID, lecture: lectureID },
			});

			showCurriculum.value = false;
		}

		const listOfCompletedLectureIds: Ref<string[]> = ref([]);

		async function markLectureAsComplete(lectureID: string) {
			setLoading(true);
			const [success, error] = await completeLecture(courseID.value, lectureID);
			setLoading(false);

			if (success) {
				listOfCompletedLectureIds.value.push(lectureID);
			}
		}

		const lectures: Ref<any[]> = computed(() => {
			const sections: any[] = course.value?.sections ?? [];
			if (!!!sections || sections.length <= 0) return [];

			let arr: any = [];

			sections.forEach((section) => {
				let lectures: any[] = section?.lectures ?? [];

				// mapping section id in each lecture
				lectures = lectures.map((lec) => {
					return { ...lec, sectionID: section.id };
				});

				arr = [...arr, ...lectures];
			});

			return arr;
		});

		async function goToPrevLecture() {
			if (lectures.value.length <= 0) return;

			let indexOfCurrentLecture = lectures.value.findIndex(
				(lec) => lec.id == activeLectureID.value
			);

			// current lecture is first lecture
			if (indexOfCurrentLecture <= 0) {
				openSnackbar('warning', 'Body.ThisIsFirstLecture');
				return;
			}
			// current lecture was not found
			else if (indexOfCurrentLecture < 0) {
				// handle error
				return;
			}

			// current lecture is somewhere in middle
			let preLecture = lectures.value[indexOfCurrentLecture - 1];
			if (!!!preLecture || !!!preLecture.id || !!!preLecture.sectionID) {
				// handle error
				return;
			}

			router.replace({
				path: route.path,
				query: {
					section: preLecture.sectionID ?? '',
					lecture: preLecture.id ?? '',
				},
			});
		}

		async function goToNextLecture() {
			if (lectures.value.length <= 0) return;

			let indexOfCurrentLecture = lectures.value.findIndex(
				(lec) => lec.id == activeLectureID.value
			);

			// current lecture is last lecture
			if (indexOfCurrentLecture >= lectures.value.length - 1) {
				openDialog(
					'success',
					'Headings.CourseCompleted',
					'Body.CourseCompleted',
					false,
					{
						label: 'Buttons.ViewMoreCourses',
						onclick: () => {
							router.push(`/profile/courses`);
						},
					},
					{
						label: 'Buttons.Okay',
						onclick: () => {},
					}
				);
				return;
			}
			// current lecture was not found
			else if (indexOfCurrentLecture < 0) {
				// handle error
				return;
			}

			// current lecture is somewhere in middle
			let nextLecture = lectures.value[indexOfCurrentLecture + 1];
			if (!!!nextLecture || !!!nextLecture.id || !!!nextLecture.sectionID) {
				// handle error
				return;
			}

			router.replace({
				path: route.path,
				query: {
					section: nextLecture.sectionID ?? '',
					lecture: nextLecture.id ?? '',
				},
			});
		}

		const showCurriculum = ref(false);

		return {
			loading,
			course,
			t,
			activeSection,
			activeLecture,
			watchThisLecture,
			markLectureAsComplete,
			CheckIcon,
			listOfCompletedLectureIds,
			showCurriculum,
			goToNextLecture,
			goToPrevLecture,
			videoSRC,
			refSource,
		};
	},
};
</script>

<style scoped>
video,
iframe {
	@apply w-full h-fit max-w-full md:min-h-[60vh] min-w-[50vw];
}
/* portrait */
@media only screen and (max-width: 768px) and (max-aspect-ratio: 1/1) {
	video,
	iframe {
		@apply w-full max-w-full;
		height: calc(100vw * 0.5);
	}
}

/* horizontal */
@media only screen and (max-width: 768px) and (min-aspect-ratio: 1/1) {
	video,
	iframe {
		@apply w-full h-full max-w-full;
	}
}

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
