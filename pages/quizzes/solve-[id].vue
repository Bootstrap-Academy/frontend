<template>
  <div>
    <main
      class="h-full overflow-hidden container pt-card pb-card mt-card-sm grid md:grid-cols-[400px_minmax(0,1fr)] gap-y-card gap-x-container items-start"
    >
      <div class="">
        <SectionTitle
          subheading="Web Development / Angular Skill"
          heading="Quizzes"
          class="mb-2"
        />
        <InputButtonToggle
          :mobileResponsive="false"
          v-model="selectedOption"
          :buttonOptions="buttonOptions"
        />
      </div>

      <FormQuizAnswer
        v-if="quizzesToShow.length || loading"
        :data="selectedQuiz ?? quizzesToShow[0]"
        @solved="setSolvedLocally($event)"
        @rated="setRatedLocally($event)"
        @nextQuestion="nextQuestion($event)"
        @updateQuestion="updateQuestion($event)"
        class="row-span-2 md:mt-48"
      />

      <aside class="p-2 grid max-h-[600px] h-fit pb-44 overflow-scroll gap-4">
        <template v-if="loading">
          <QuizCardSkeleton v-for="n in 3" :key="n" class="w-full" />
          <QuizCardSkeleton v-for="n in 3" :key="n" class="w-full" />
          <QuizCardSkeleton v-for="n in 3" :key="n" class="w-full" />
        </template>

        <template v-else-if="quizzesToShow && quizzesToShow.length">
          <p class="mb-3 text-xs">
            <span class="text-accent"> {{ t("Headings.Total") }} </span>:
            {{ quizzesToShow?.length }}
          </p>
          <div class="max-h-fit grid gap-card">
            <QuizCard
              class="max-h-fit"
              :class="
                quiz?.id == selectedQuiz?.id ? 'border border-accent' : ''
              "
              v-for="(quiz, i) of quizzesToShow"
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
      v-if="!loading && !quizzesToShow.length"
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
    const user: any = useUser();
    const selectedOption = ref(0);
    const { t } = useI18n();
    const quizzesToShow: any = ref([]);
    let arrayOfSubtasks: any = ref([]);
    const buttonOptions = [
      { name: "Buttons.All" },
      { name: "Buttons.UnSolved" },
    ];
    const id: any = computed(() => {
      return route?.params?.id ?? "";
    });

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
      arrayOfSubtasks.value.forEach((element: any, i: any) => {
        if (element.id == id) {
          element.rated = true;
        }
      });
    }

    function nextQuestion(id: any) {
      console.log("next");
      let index = 0;
      arrayOfSubtasks.value.forEach((element: any, i: any) => {
        if (element.id == id) {
          console.log("inside index", id);
          index = i;
        }
      });

      for (let i = index; i < arrayOfSubtasks?.value?.length; i++) {
        if (
          !arrayOfSubtasks?.value[i]?.solved &&
          arrayOfSubtasks?.value[i]?.creator != user?.value.id &&
          i != index
        ) {
          console.log("next quiz id", arrayOfSubtasks.value[i].creator);
          console.log("user id", user.value?.id);
          solveThis(arrayOfSubtasks.value[i]);

          break;
        }
        console.log("after");
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
        console.log("incurse from");
        await getQuizzesInCourse(id.value);
      } else if (quizzesFrom.value == "skill") {
        await getQuizzesInSkill(id.value);
      } else if (quizzesFrom.value == "quiz") {
        await getSubTasksInQuiz(id.value);
      }

      if (quizzesFrom.value == "quiz") {
        const subtasks = useSubTasksInQuiz();
        arrayOfSubtasks.value = subtasks.value;
        quizzesToShow.value = subtasks.value;
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
              quizzesToShow.value.push(element);
            });
          }
        })
      );
      loading.value = false;
    }

    watch(
      () => selectedOption.value,
      (newValue, oldValue) => {
        if (newValue == 0) {
          quizzesToShow.value = arrayOfSubtasks.value;
        } else if (newValue == 1) {
          quizzesToShow.value = [];
          arrayOfSubtasks.value.forEach((element: any) => {
            if (!element.solved && element.creator != user.value?.id) {
              quizzesToShow.value.push(element);
              console.log("pushing");
            }
          });
        }
      }
    );

    onMounted(async () => {
      manageAllDataForQuizzes();
    });

    return {
      t,
      id,
      quizzesFrom,
      quizzes,
      arrayOfSubtasks,
      buttonOptions,
      selectedQuiz,
      loading,
      setSolvedLocally,
      solveThis,
      setRatedLocally,
      updateQuestion,
      notFoundFor,
      nextQuestion,
      selectedOption,
      quizzesToShow,
    };
  },
});
</script>

<style scoped></style>
