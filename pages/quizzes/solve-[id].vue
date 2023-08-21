<template>
  <div>
    <main
      class="h-full overflow-hidden container pt-card pb-card mt-card-sm grid md:grid-cols-[400px_minmax(0,1fr)] gap-y-card gap-x-container items-start"
    >
      <SectionTitle
        subheading="Web Development / Angular Skill"
        heading="Quizzes"
        class="mb-2"
      />

      <FormQuizAnswer
        v-if="arrayOfSubtasks.length || loading"
        :data="selectedQuiz ?? arrayOfSubtasks[0]"
        @solved="setSolvedLocally($event)"
        @rated="setRatedLocally($event)"
        @updateQuestion="updateQuestion($event)"
        class="row-span-2 mt-24"
      />

      <aside
        class="p-2 grid gap-card max-h-[700px] h-fit pb-44 overflow-scroll mt-20 md:mt-0"
      >
        <template v-if="loading">
          <QuizCardSkeleton v-for="n in 3" :key="n" class="w-full" />
          <QuizCardSkeleton v-for="n in 3" :key="n" class="w-full" />
          <QuizCardSkeleton v-for="n in 3" :key="n" class="w-full" />
        </template>

        <template v-else-if="arrayOfSubtasks && arrayOfSubtasks.length">
          <div class="max-h-fit grid gap-card">
            <QuizCard
              class="max-h-fit"
              v-for="(quiz, i) of arrayOfSubtasks"
              :key="i"
              full
              :data="quiz"
              @click="solveThis(quiz)"
            />
          </div>
        </template>
      </aside>
    </main>
    <p
      v-if="!loading && !arrayOfSubtasks.length"
      class="text-center w-full mb-20 text-xl"
    >
      {{
        t("Headings.EmptyQuizForThis", {
          placeholder: t(notFoundFor),
        })
      }}
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  getQuizzesInCourse,
  getSubTasksInQuiz,
  useQuizzes,
  getQuizzesInSkill,
} from "~~/composables/quizzes";
import { useI18n } from "vue-i18n";

export default defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const quizzes: any = useQuizzes();
    const selectedQuiz = ref();
    const loading = ref(true);
    const premiumInfo: any = usePremiumInfo();
    const user: any = useUser();
    const { t } = useI18n();

    const id: any = computed(() => {
      return route?.params?.id ?? "";
    });

    let arrayOfSubtasks: any = ref([]);
    const querySubTaskId = computed(() => {
      return route.query?.querySubTaskId ?? "";
    });
    const taskId = computed(() => {
      return route.query?.taskId ?? "";
    });

    const quizzesFrom = computed(() => {
      return route?.query?.quizzesFrom ?? "no found";
    });

    const notFoundFor = computed(() => {
      if (quizzesFrom.value == "course") {
        return "Headings.Course";
      } else if (quizzesFrom.value == "skill") {
        return "Headings.Skill";
      } else {
        return "Headings.Lecture";
      }
    });

    function setSolvedLocally(id: any) {
      arrayOfSubtasks.value.forEach((element: any) => {
        if (element.id == id) {
          element.solved = true;
        }
      });
    }
    function setRatedLocally(id: any) {
      let index = 0;
      arrayOfSubtasks.value.forEach((element: any, i: any) => {
        if (element.id == id) {
          index = i;
          element.rated = true;
        }
      });
      for (let i = index; i < arrayOfSubtasks?.value?.length; i++) {
        if (
          !arrayOfSubtasks?.value[i]?.solved &&
          arrayOfSubtasks?.value[i]?.creator != user?.id
        ) {
          solveThis(arrayOfSubtasks.value[i]);
          break;
        }
      }
    }

    function updateQuestion(quiz: any) {
      arrayOfSubtasks.value.forEach((element: any) => {
        if (element?.id == quiz?.id) {
          element.question = quiz?.question;
        }
      });
    }

    function solveThis(quiz: any) {
      router.replace({
        path: route.path,
        query: {
          quizzesFrom: quizzesFrom.value,
          querySubTaskId: quiz.id,
          taskId: quiz.task_id,
        },
      });
      selectedQuiz.value = quiz;
    }

    async function manageAllDataForQuizzes() {
      if (!!querySubTaskId.value && !!taskId.value) {
        const [success, error] = await getSubTaskInQuiz(
          taskId.value,
          querySubTaskId.value
        );
        if (success) selectedQuiz.value = success;
      }

      if (quizzesFrom.value == "course") {
        await getQuizzesInCourse(id.value);
      } else if (quizzesFrom.value == "skill") {
        await getQuizzesInSkill(id.value);
      } else if (quizzesFrom.value == "quiz") {
        await getSubTasksInQuiz(id.value);
      }

      if (quizzesFrom.value == "quiz") {
        const subtasks = useSubTasksInQuiz();
        arrayOfSubtasks.value = subtasks.value;
        loading.value = false;
        return;
      }

      if (!quizzes.value.length) {
        loading.value = false;
        return;
      }

      arrayOfSubtasks.value = [];
      await Promise.all(
        quizzes.value.map(async (quiz: any) => {
          const [res, error] = await getSubTasksInQuiz(quiz?.id ?? "");
          if (!!res) {
            res.forEach((element: any) => {
              arrayOfSubtasks.value.push(element);
            });
          }
        })
      );
      loading.value = false;
    }

    onMounted(async () => {
      manageAllDataForQuizzes();
      if (!!!premiumInfo.value.premium) {
        openSnackbar("info", "Body.BuyQuiz");
      }
    });

    return {
      t,
      id,
      quizzesFrom,
      quizzes,
      arrayOfSubtasks,
      selectedQuiz,
      loading,
      setSolvedLocally,
      solveThis,
      setRatedLocally,
      updateQuestion,
      notFoundFor,
    };
  },
});
</script>

<style scoped></style>
