<template>
  <div>
    <main
      class="h-full overflow-hidden container pt-card pb-card mt-card-sm grid md:grid-cols-[400px_minmax(0,1fr)] gap-y-card gap-x-container items-start"
    >
      <div class="">
        <div class="py-2 px-4 md:py-3 md:px-6 bg-secondary mb-8 style-box">
          <template v-for="(path, i) of breadcrumbs" :key="i">
            <NuxtLink
              v-if="path.to"
              :to="path.to"
              class="inline-block text-body-2"
            >
              {{ t(path.label) }}
            </NuxtLink>
            <h1 v-else class="text-heading-2 capitalize inline-block">
              {{ t(path.label) }}
            </h1>

            <span v-if="i < breadcrumbs.length - 1" class="text-accent mx-3">
              /
            </span>
          </template>
        </div>

        <InputButtonToggle
          :mobileResponsive="false"
          v-model="selectedOption"
          :buttonOptions="buttonOptions"
        />
      </div>

      <FormQuizAnswer
        :amount-questions-left="quizzesToShow.filter((quiz: any) => !quiz.solved).length"
        v-if="quizzesToShow.length || loading"
        :data="selectedQuiz ?? quizzesToShow[0]"
        @solved="setSolvedLocally($event)"
        @rated="setRatedLocally($event)"
        @nextQuestion="nextQuestion($event)"
        @updateQuestion="updateQuestion($event)"
        class="row-span-2 md:mt-48"
      />
      <div>
        <p class="mb-3 text-xs pl-2 flex justify-between" v-if="!!arrayOfSubtasks.length">
          <div v-if="(selectedOption == 1 && quizzesToShow?.lenght > 0) || selectedOption == 0">
            <span class="text-accent"> {{ t("Headings.Total") }} </span>:
            {{ quizzesToShow?.length }}
          </div>
          <div class="mr-4" v-if="selectedOption == 0">
            <span class="text-accent">{{ t("Headings.OfWhichUnsolved") }}</span>:
            {{ arrayOfSubtasks.filter((quiz: any) => !quiz.solved).length }}
          </div>
        </p>
        <aside class="p-2 grid max-h-[600px] h-fit pb-44 overflow-auto gap-4">
          <template v-if="loading">
            <QuizCardSkeleton v-for="n in 9" :key="n" class="w-full" />
          </template>

          <template v-else-if="quizzesToShow && quizzesToShow.length">
            <div class="max-h-fit grid gap-card">
              <QuizCard
                :id="querySubTaskId == quiz.id ? querySubTaskId : 'none'"
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
      </div>
    </main>
    <p
      v-if="!loading && !quizzesToShow.length && arrayOfSubtasks.filter((quiz: any) => !quiz.solved).length == 0"
      class="text-center w-full mb-20 text-xl"
    >
      {{
        t("Headings.AllQuestionsSolved")
      }}
    </p>
    <p
      v-else-if="!loading && !quizzesToShow.length"
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

    const querySubTaskId: any = computed(() => {
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

    const rootSkillID = computed(() => {
      return route?.query?.rootSkillID ?? "";
    });

    const subSkillID = computed(() => {
      return route?.query?.subSkillID ?? "";
    });

    const breadcrumbs: any = computed(() => {
      if (quizzesFrom.value == "course") {
        return [
          {
            label: id.value,
            to: `/courses/${id.value}?skillID=${rootSkillID.value}&subSkillID=${subSkillID.value}`,
          },
          { label: "Headings.Quizzes" },
        ];
      } else if (quizzesFrom.value == "skill") {
        console.log("bradl crum quizzs from skill");
        return [
          {
            label: subSkillID.value,
            to: `/skill-tree/${rootSkillID.value}/${subSkillID.value}`,
          },
          { label: "Headings.Quizzes" },
        ];
      } else if (quizzesFrom.value == "quiz") {
      } else return [{ label: "Quizzes" }];
    });

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
      if (quizzesFrom.value == "course" || quizzesFrom.value == "skill") {
        router.replace({
          path: route.path,
          query: {
            quizzesFrom: quizzesFrom.value,
            querySubTaskId: quiz.id,
            taskId: quiz.task_id,
            rootSkillID: rootSkillID.value,
            subSkillID: subSkillID.value,
          },
        });
      } else {
        router.replace({
          path: route.path,
          query: {
            quizzesFrom: quizzesFrom.value,
            querySubTaskId: quiz.id,
            taskId: quiz.task_id,
          },
        });
      }
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
      scroolToView();
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
            }
          });
        }
      }
    );

    function scroolToView() {
      setTimeout(() => {
        let eleme = document.getElementById(querySubTaskId.value);
        eleme?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 0);
    }

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
      breadcrumbs,
      querySubTaskId,
    };
  },
});
</script>

<style scoped></style>
