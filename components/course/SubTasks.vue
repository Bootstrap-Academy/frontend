<template>
  <!-- quizzez and coding challenges in a lecture -->
  <article class="container mb-16">
    <section class="flex gap-3 items-center justify-end mb-3">
      <article
        class="text-white font-medium sm:text-xl sm:px-5 pb-1 cursor-pointer border-b-2"
        :class="
          selectedTab == 0
            ? 'border-b-accent'
            : ' border-black hover:border-tertiary'
        "
        @click="selectedTab = 0"
      >
        {{ $t("Headings.Quizzes") }}
      </article>
      <article
        class="text-white font-medium sm:text-xl sm:px-5 pb-1 cursor-pointer border-b-2"
        :class="
          selectedTab == 1
            ? 'border-b-accent'
            : ' border-black hover:border-tertiary'
        "
        @click="selectedTab = 1"
      >
        {{ $t("Headings.CodingChallenges") }}
      </article>
    </section>
    <article
      class="container-form max-w-4xl max-h-[600px] overflow-scroll"
      v-if="selectedTab == 0"
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
    </article>

    <article
      class="container-form max-w-4xl max-h-[600px] overflow-scroll"
      v-if="selectedTab == 1"
    >
      <div v-if="codingChallenges.length">
        <CodingChallengeCard
          @click="solveCodingChallenge(codingChallenge?.id)"
          v-for="(codingChallenge, i) of codingChallenges"
          :codingChallenge="codingChallenge"
          :key="i"
        >
        </CodingChallengeCard>
      </div>
      <p v-if="!codingChallenges.length" class="w-full text-xl text-center">
        {{ t("Headings.EmptyCodingChallenge") }}
      </p>
    </article>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
export default defineComponent({
  props: {
    activeLecture: { type: Object, default: null },
    activeSection: { type: Object, default: null },
    courseId: { type: String, default: null },
  },

  setup(props) {
    const { t } = useI18n();
    const router = useRouter();
    const taskId = ref();
    const subtasks = useSubTasksInQuiz();
    const codingChallenges = useAllCodingChallengesInATask();
    const selectedTab = ref(0);

    async function fnGetCodingChallengeInQuiz(quizId: any) {
      console.log("getting coding challenges");
      const [success, error] = await getAllCodingChallengesInATask(quizId);
      if (error) {
        setLoading(false);
        openSnackbar("error", error);
      }
    }

    async function fnGetSubtasksInQuiz(quizId: any) {
      console.log("getting mcqs etc");
      const [success, error] = await getSubTasksInQuiz(quizId);
      if (error) {
        setLoading(false);
        openSnackbar("error", error);
      }
    }
    function solveCodingChallenge(id: any) {
      router.push(
        `/challenges/QuizCodingChallenge-${taskId.value}?codingChallenge=${id}`
      );
    }
    watch(
      () => [props.activeLecture, props.activeSection],
      async () => {
        console.log("props.active lcture", props.activeLecture);
        console.log("props.active section", props.activeSection);
        console.log("course id", props.courseId);
        setLoading(true);
        if (
          !!!props.activeLecture ||
          !!!props.activeLecture?.id ||
          !!!props.activeSection ||
          !!!props.activeSection?.id ||
          !!!props.courseId
        )
          return setLoading(false);

        const [success, error] = await createQuiz(props.courseId, {
          section_id: props.activeSection.id,
          lecture_id: props.activeLecture.id,
        });
        if (success) {
          taskId.value = success?.id;
          fnGetSubtasksInQuiz(success?.id);
          fnGetCodingChallengeInQuiz(success?.id);
        }
        setLoading(false);
      },
      { immediate: true, deep: true }
    );

    return {
      solveCodingChallenge,
      subtasks,
      codingChallenges,
      selectedTab,
      t,
    };
  },
});
</script>

<style scoped></style>
