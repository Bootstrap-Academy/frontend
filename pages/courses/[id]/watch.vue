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
            sm-in-mobile
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
            <CourseSolveMcqInsideLectureView
              :total-quizzes="allQuizzes"
              :quizzes-in-this-lecture="quizzesInLecture"
            />
            <div v-if="quizzesInLecture.length">
              <QuizList :quizzes="quizzesInLecture" />
            </div>
            <p
              class="w-full text-xl text-center"
              v-if="!quizzesInLecture.length && !allQuizzes.length"
            >
              {{ t("Headings.EmptySubtasks") }}
            </p>
            <div
              v-if="allQuizzes.length"
              class="mt-10"
            >
            </div>

            <div v-if="!quizzesInLecture.length && !unseenLectureQuizzes.length">
              <p class="w-full text-xl text-center">
                {{ t("Headings.NoMoreSubTasksInThisCourse") }}
              </p>
            </div>
          </section>
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
          <section
            class="md:px-6 h-[71vh] overflow-scroll w-full"
            v-else-if="selectedButton == 3"
          >
            <div v-if="currentMatches.length">
              <MatchingSolveInsideCourse :matchings="currentMatches" />
            </div>
            <p
              v-if="!currentMatches.length"
              class="w-full text-xl text-center"
            >
              {{ t("Headings.EmptyMatchings") }}
            </p>
          </section>
        </div>

        <div class="hidden midXl:block aside sticky self-start top-container mt-16">
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

    <Transition
      class="block midXl:hidden"
      name="fade-in"
      mode="in-out"
    >
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
import { QuizInUnseenLecture } from "~/types/courseTypes";
import { useMatchingsForLectures, useMatchingsInLecture } from "~/composables/matching";

definePageMeta({
  middleware: ["auth"]
});

export default {
  components: {
    XCircleIcon
  },
  head: {
    title: "Watch Course"
  },
  setup() {
    const { t } = useI18n();
    const loading = ref(true);
    const callActive = ref(false);

    const route = useRoute();
    const router = useRouter();

    const course = useCourse();
    const taskId = ref();
    const subtasks = useSubTasksInQuiz();
    const codingChallenges = useAllCodingChallengesInATask();

    const allQuizzesInfo = useQuizzes();
    const allQuizzes = useQuizzesInCourse();
    const quizzesInLecture = useQuizzesInLecture();
    const unseenLectureQuizzes = ref<QuizInUnseenLecture[]>([]);
    const matches = useMatchingsForLectures()

    const currentMatches = computed(() => matches.value.filter((match) => match.lectureId === activeLecture?.value?.id))

    const showCurriculum = ref(false);

    const premiumInfo: any = usePremiumInfo();
    const isPremium: any = computed(() => {
      return premiumInfo.value?.premium;
    });

    const heartsInfo: any = useHeartInfo();
    const hearts: any = computed(() => {
      return heartsInfo.value?.hearts ?? 0;
    });

    const selectedButton = ref(0);
    const buttonOptions = computed(() => [
      { name: "Buttons.Video" },
      { name: `${t("Buttons.Quiz")} ${quizzesInLecture.value.length}` },
      { name: `${t("Buttons.Challenge")} ${codingChallenges.value.length}` },
      { name: `${t("Buttons.Matching")} ${currentMatches.value.length}` }
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
        router.push(`/challenges/QuizCodingChallenge-${codingChallenge?.task_id}?codingChallenge=${codingChallenge?.id}&solveFrom=${"course"}`);
        if (!isPremium.value) return openSnackbar("info", "Body.BuyCodingChallnge");
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

    async function fnGetMatchingsInQuiz(quizId: any) {
      const [success, error] = await getMatchingsInTask(quizId);
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
      loading.value = true;
      const courseID = <string>(route.params?.id ?? "");

      let a = localStorage.getItem("selectedButton");
      selectedButton.value = Number(a);

      if (!!!courseID) {
        loading.value = false;
        return;
      }
      await Promise.all([getCourseByID(courseID), watchCourse(courseID)]);

      loading.value = false;
    });

    onBeforeUnmount(() => {
      localStorage.removeItem("selectedButton");
    });


    function watchThisLecture({ sectionID, lectureID }: any) {
      router.replace({
        path: route.path,
        query: {
          section: sectionID,
          lecture: lectureID,
          skillID: skillID.value,
          subSkillID: subSkillID.value
        }
      });

      showCurriculum.value = false;
    }
    watch(
      () => [activeLecture.value, activeSection.value],
      async () => {
        loading.value = true;
        if (!callActive.value) {
          callActive.value = true;
          await getQuizzes(
            course.value.id,
            activeSection.value.id,
            activeLecture.value.id
          );
          await getQuizzesInUnfinishedLectures();
            
        }

        callActive.value = false;
        loading.value = false;
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
        return parseInt(match[1]); // Add 1 to the parsed section number
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
      currentMatches
    };
  }
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
