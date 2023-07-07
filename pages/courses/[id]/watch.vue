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
        class="container-fluid relative h-fit midXl:h-screen-main grid gap-card midXl:grid-cols-[1fr_350px] pt-card pb-container mb-20"
      >
        <CourseVideoControls
          :skillID="skillID"
          :subSkillID="subSkillID"
          class="midXl:col-span-2"
          :course="course"
          :activeSection="activeSection"
          :activeLecture="activeLecture"
          v-model="showCurriculum"
          v-if="!!activeSection && !!activeLecture"
        />
        <div>
          <InputButtonToggle
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
            v-else-if="selectedButton == 1"
            class="h-fit lg:h-auto md:max-h-[60vh] w-full overflow-scroll p-6"
          >
            <p class="w-full text-xl text-center" v-if="!subtasks.length">
              {{ t("Headings.EmptySubtasks") }}
            </p>
            <QuizCard
              v-for="(task, i) of subtasks"
              :key="i"
              :data="task"
              class="my-3"
            />
          </section>

          <section
            v-else-if="selectedButton == 2"
            class="h-fit lg:h-auto md:max-h-[60vh] w-full overflow-scroll p-6"
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

        <CourseCurriculum
          class="hidden midXl:block aside card sticky self-start top-container style-card bg-secondary w-full h-full max-h-full overflow-y-scroll"
          :data="course"
          @watch="watchThisLecture($event)"
        />
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

    const course = useCourse();
    const taskId = ref();
    const subtasks = useSubTasksInQuiz();
    const codingChallenges = useAllCodingChallengesInATask();

    const selectedButton = ref(0);
    const buttonOptions = [
      { name: "Buttons.Video" },
      { name: "Buttons.Quiz" },
      { name: "Buttons.CodingChallenge" },
    ];

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
      const coins = useCoins();
      if (codingChallenge?.fee > 0 && coins.value < codingChallenge?.fee) {
        return openSnackbar("info", "Error.NoEnoughCoinsToSolve");
      }

      router.push(
        `/challenges/QuizCodingChallenge-${taskId.value}?codingChallenge=${
          codingChallenge?.id
        }&solveFrom=${"course"}`
      );
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
          fnGetSubtasksInQuiz(success[0]?.id);
          fnGetCodingChallengeInQuiz(success[0]?.id);
        } else {
          subtasks.value = [];
          codingChallenges.value = [];
        }
        setLoading(false);
      },
      { immediate: true, deep: true }
    );
    onMounted(async () => {
      const courseID = <string>(route.params?.id ?? "");
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
        query: {
          section: sectionID,
          lecture: lectureID,
          skillID: skillID.value,
          subSkillID: subSkillID.value,
        },
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
      courseId,
      selectedButton,
      buttonOptions,
      solveCodingChallenge,
      subtasks,
      codingChallenges,
      skillID,
      subSkillID,
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
