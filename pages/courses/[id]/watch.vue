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
            v-else-if="selectedButton == 1"
            class="w-full h-[71vh] overflow-scroll"
          >
            <p class="w-full text-xl text-center" v-if="!subtasks.length">
              {{ t("Headings.EmptyQuizzes") }}
            </p>
            <CourseSolveMcqInsideLectureView
              v-else-if="subtasks.length"
              :quizzesToShow="subtasks"
            />
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
            <div v-if="matchings.length">
              <MatchingSolveInsideCourse :matchings="matchings" />
            </div>
            <p v-if="!matchings.length" class="w-full text-xl text-center">
              {{ t("Headings.EmptyMatchings") }}
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
    const loading = ref(true);
    const route = useRoute();
    const router = useRouter();

    const showCurriculum = ref(false);
    const course = useCourse();
    const taskId = ref();
    const subtasks = useSubTasksInQuiz();
    const codingChallenges = useAllCodingChallengesInATask();
    const matchings = useMatchings();

    const premiumInfo: any = usePremiumInfo();
    const isPremium: any = computed(() => {
      return premiumInfo.value?.premium;
    });

    const heartsInfo: any = useHeartInfo();
    const hearts: any = computed(() => {
      return heartsInfo.value?.hearts ?? 0;
    });

    const selectedButton = ref(0);
    const buttonOptions = [
      { name: "Buttons.Video" },
      { name: "Buttons.Quiz" },
      { name: "Buttons.Challenge" },
      { name: "Buttons.Matching" },
    ];

    const courseId: any = computed(() => {
      return route.params.id;
    });
    const skillID = computed(() => {
      return <string>(route.query?.skillID ?? "");
    });
    const subSkillID = computed(() => {
      return <string>(route.query?.subSkillID ?? "");
    });

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

    async function fnGetMatchingsInQuiz(quizId: any) {
      const [success, error] = await getMatchingsInTask(quizId);
      if (error) {
        setLoading(false);
        openSnackbar("error", error);
      }
    }

    watch(
      () => [activeLecture.value, activeSection.value],
      async () => {
        setLoading(true);
        if (
          !!!activeLecture.value ||
          !!!activeLecture?.value.id ||
          !!!activeSection.value ||
          !!!activeSection?.value.id ||
          !!!courseId.value
        ) {
          setLoading(false);
          return;
        }
        const [success, error] = await getQuizzesInCourse(
          courseId.value,
          activeSection.value.id,
          activeLecture.value.id
        );

        if (!!success[0]) {
          taskId.value = success[0]?.id;
          subtasks.value = [];
          fnGetSubtasksInQuiz(success[0]?.id);
          fnGetCodingChallengeInQuiz(success[0]?.id);
          fnGetMatchingsInQuiz(success[0]?.id);
        } else {
          subtasks.value = [];
          codingChallenges.value = [];
          matchings.value = [];
        }
        setLoading(false);
      },
      { immediate: true, deep: true }
    );

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

      await Promise.all([getCourseByID(courseID), watchCourse(courseID)]);

      loading.value = false;
    });

    onBeforeUnmount(() => {
      localStorage.removeItem("selectedButton");
    });

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
      matchings,
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
