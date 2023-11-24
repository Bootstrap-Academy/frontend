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
			<Title>Watch Course - {{ course?.title ?? "" }}</Title>
		</Head>

		<section>
			<main
				v-if="course"
				class="container-fluid relative h-fit grid gap-card midXl:grid-cols-[1fr_350px] pt-card pb-container mb-20"
			>
				<CourseVideoMeta
					:skillID="skillID"
					:subSkillID="subSkillID"
					class="midXl:col-span-2"
					:course="course"
					:activeSection="activeSection"
					:activeLecture="activeLecture"
					v-model="showCurriculum"
					v-if="!!activeSection && !!activeLecture"
				/>

				<div class="mt-10">
					<InputButtonToggle
						:mobileResponsive="false"
						:buttonOptions="buttonOptions"
						v-model="selectedButton"
						class="mb-5"
					/>
					<CourseVideo
						:course="course"
						:activeSection="activeSection"
						:activeLecture="activeLecture"
						v-if="!!activeSection && !!activeLecture && selectedButton == 0"
					/>
					<section
						v-if="selectedButton == 1"
						class="w-full h-[71vh] overflow-scroll"
					>
						<!-- Information: SolveMcInsideLectureView here -->
						<CourseSolveMcqInsideLectureView
							:total-quizzes="allQuizzes"
							:quizzes-in-this-lecture="quizzesInLecture"
						/>
						<p
							class="w-full text-xl text-center"
							v-if="quizzesInLecture.length === 0 && allQuizzes.length === 0"
						>
							{{ t("Headings.EmptySubtasks") }}
						</p>
						<div v-if="!quizzesInLecture.length && allQuizzes.length">
							<p class="w-full text-xl text-center">
								{{ t("Headings.EmptySubtasks") }}
							</p>
							<p
								class="w-full text-xl text-center"
								v-if="unseenLectureQuizzes.length"
							>
								{{ t("Headings.NextSubTasksLocation") }}
							</p>

							<ul>
								<li
									v-for="(unseenQuiz, index) in unseenLectureQuizzes"
									:key="index"
								>
									{{ t("Headings.Section") }}
									{{ getSectionNumber(unseenQuiz.section) }},
									<NuxtLink
										@click="
											watchThisLecture({
												sectionID: unseenQuiz.section,
												lectureID: unseenQuiz.lectureId,
											})
										"
										class="cursor-pointer text-accent"
										>{{ unseenQuiz.lecture }}</NuxtLink
									>
								</li>
							</ul>
						</div>

						<div
							v-if="!quizzesInLecture.length && !unseenLectureQuizzes.length"
						>
							<p class="w-full text-xl text-center">
								{{ t("Headings.NoMoreSubTasksInThisCourse") }}
							</p>
						</div>

						<div v-else-if="quizzesInLecture.length">
							<QuizList :quizzes="quizzesInLecture" />
						</div>
					</section>
					<!-- Information: Challenges Section here -->
					<section
						class="px-6 h-[71vh] overflow-scroll w-full"
						v-else-if="selectedButton == 2"
					>
						<div v-if="codingChallenges.length">
							<CodingChallengeCard
								@click="solveCodingChallenge(codingChallenge)"
								v-for="(codingChallenge, i) of codingChallenges"
								:codingChallenge="codingChallenge"
								:key="i"
							/>
						</div>
						<p
							v-if="!codingChallenges.length"
							class="w-full text-xl text-center"
						>
							{{ t("Headings.EmptyCodingChallenge") }}
						</p>
					</section>
				</div>

				<div
					class="hidden midXl:block aside sticky self-start top-container mt-16"
				>
					<article class="flex justify-end">
						<CourseVideoControls
							class="hidden midXl:block mb-7 -mt-3"
							:skillID="skillID"
							:subSkillID="subSkillID"
							:course="course"
							:activeLecture="activeLecture"
							v-if="!!activeSection && !!activeLecture"
						/>
					</article>

					<CourseCurriculum
						:data="course"
						@watch="watchThisLecture($event)"
						class="h-[60vh] overflow-y-scroll bg-secondary card style-card"
					/>
				</div>
			</main>
		</section>

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
	import { useI18n } from "vue-i18n";
	import { XCircleIcon } from "@heroicons/vue/24/solid";
	import { Quiz, QuizInUnseenLecture } from "~/types/courseTypes";

	definePageMeta({
		middleware: ["auth"],
	});

	export default {
		components: {
			XCircleIcon,
		},
		head: {
			title: "Watch Course",
		},
		setup() {
			const { t } = useI18n();
			// Important: Use loading in all api-calls
			// Todo: useLoading in all api-calls
			const loading = ref(true);

			const route = useRoute();
			const router = useRouter();

			const course = useCourse();
			const taskId = ref();
			// Bug: Fix- display codingChallenges & number
			const subtasks = useSubTasksInQuiz();
			const codingChallenges = useAllCodingChallengesInATask();

			const allQuizzesInfo = useQuizzesInCourseInfo();
			const allQuizzes = useQuizzesInCourse();
			const quizzesInLecture = useQuizzesInLecture();
			const unseenLectureQuizzes = ref<QuizInUnseenLecture[]>([]);

			const premiumInfo: any = usePremiumInfo();
			const isPremium: any = computed(() => {
				return premiumInfo.value?.premium;
			});

			const heartsInfo: any = useHeartInfo();
			const hearts: any = computed(() => {
				return heartsInfo.value?.hearts ?? 0;
			});

			const selectedButton = ref(0);
			const buttonOptions = ref([
				{ name: "Buttons.Video" },
				// Bug: Number does not get updated in Component -> I guess reactivity problem
				{ name: `${t("Buttons.Quiz")} (${quizzesInLecture.value.length})` },
				{ name: "Buttons.Challenge" },
			]);

			const activeSection = computed(() => {
				const sectionID = <string>(route.query?.section ?? "");
				let sections: any[] = course.value?.sections ?? [];
				if (!!!sections || sections.length <= 0) return null;
				let section = sections.find((sec) => sec.id == sectionID);
				return !!section ? section : null;
			});
			const activeLecture = computed(() => {
				const lectureID = <string>(route.query?.lecture ?? "");
				let lectures: any[] = activeSection.value?.lectures ?? [];
				if (!!!lectures || lectures.length <= 0) return null;

				let lecture = lectures.find((lec) => lec.id == lectureID);

				return !!lecture ? lecture : null;
			});
			const courseId: any = computed(() => {
				return route.params.id;
			});
			const skillID = computed(() => {
				return <string>(route.query?.skillID ?? "");
			});
			const subSkillID = computed(() => {
				return <string>(route.query?.subSkillID ?? "");
			});

			function solveCodingChallenge(codingChallenge: any) {
				if (!isPremium.value && hearts.value < 2) {
					return openSnackbar("info", "Error.NotEnoughHearts");
				} else if (isPremium.value || hearts.value >= 2) {
					router.push(
						`/challenges/QuizCodingChallenge-${taskId.value}?codingChallenge=${
							codingChallenge?.id
						}&solveFrom=${"course"}`
					);
					if (!isPremium.value)
						return openSnackbar("info", "Body.BuyCodingChallnge");
				}
			}

			async function fnGetCodingChallengeInQuiz(quizId: any) {
				const [success, error] = await getAllCodingChallengesInATask(quizId);
				if (error) {
					setLoading(false);
					openSnackbar("error", error);
				}
			}
			async function fnGetSubtasksInQuiz(quizId: any) {
				const [success, error] = await getSubTasksInQuiz(quizId);
				if (error) {
					setLoading(false);
					openSnackbar("error", error);
				}
			}
			watch(
				() => selectedButton.value,
				(newValue) => {
					localStorage.setItem("selectedButton", newValue.toString());
				}
			);

			onMounted(async () => {
				const courseID = <string>(route.params?.id ?? "");

				let a = localStorage.getItem("selectedButton");
				selectedButton.value = Number(a);

				if (!!!courseID) {
					loading.value = false;
					return;
				}
				// Todo: for performance, check for button-states and then load only whats required
				await Promise.all([getCourseByID(courseID), watchCourse(courseID)]);
				await getQuizzes(
					course.value.id,
					activeSection.value.id,
					activeLecture.value.id
				);
				await getQuizzesInUnfinishedLectures();
				loading.value = false;
			});

			onBeforeUnmount(() => {
				localStorage.removeItem("selectedButton");
			});

			const showCurriculum = ref(false);

			function watchThisLecture({ sectionID, lectureID }: any) {
				router.replace({
					path: route.path,
					query: {
						section: sectionID,
						lecture: lectureID,
						skillID: skillID.value,
						subSkillID: subSkillID.value,
					},
				});

				showCurriculum.value = false;
			}

			watch(
				() => [selectedButton.value, activeLecture.value, activeSection.value],
				async () => {
					//Todo: check active-button-option and load only whats required for current step
					// Todo: add functionality to load Challenges
					await getQuizzes(
						course.value.id,
						activeSection.value.id,
						activeLecture.value.id
					);
					await getQuizzesInUnfinishedLectures();
				}
			);

			const getQuizzesInUnfinishedLectures = async () => {
				let testSections: QuizInUnseenLecture[] = [];
				allQuizzesInfo.value.forEach((info) => {
					course.value.sections.find((section) => {
						section.lectures.forEach((lecture) => {
							if (lecture.id == info.lecture_id) {
								testSections.push({
									section: section.id ?? "",
									sectionTitle: section.title,
									lectureId: lecture.id,
									lecture: lecture.title,
									lectureFinished: lecture.completed,
								});
							}
						});
					});
				});
				unseenLectureQuizzes.value = testSections.filter(
					(section) => !section.lectureFinished
				);
			};

			function getSectionNumber(sectionString: string): number {
				if (sectionString === "section") {
					return 1; // Return 1 for "section"
				}

				const sectionRegex = /^section(\d+)$/;
				const match = sectionRegex.exec(sectionString);

				if (match) {
					return parseInt(match[1]) + 1; // Add 1 to the parsed section number
				} else {
					throw new Error(`Invalid section string: ${sectionString}`);
				}
			}

			return {
				t,
				loading,
				course,
				activeSection,
				activeLecture,
				showCurriculum,
				watchThisLecture,
				courseId,
				selectedButton,
				buttonOptions,
				solveCodingChallenge,
				subtasks,
				codingChallenges,
				skillID,
				subSkillID,
				allQuizzes,
				quizzesInLecture,
				unseenLectureQuizzes,
				getSectionNumber,
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
