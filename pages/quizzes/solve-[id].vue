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
        :data="selectedQuiz ?? arrayOfSubtasks[0]"
        @solved="setSolvedLocally($event)"
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

        <template v-else-if="arrayOfSubtasks && arrayOfSubtasks.length > 0">
          <div class="max-h-fit grid gap-card">
            <QuizCard
              class="max-h-fit"
              v-for="(quiz, i) of arrayOfSubtasks"
              :key="i"
              full
              :data="quiz"
              @click="selectedQuiz = quiz"
            />
          </div>
        </template>

        <template v-else-if="!loading">
          <p>{{ t("Headings.EmptyQuiz") }}</p>
        </template>
      </aside>
    </main>
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
    const quizzes: any = useQuizzes();
    const selectedQuiz = ref();
    const loading = ref(true);
    const { t } = useI18n();

    const id: any = computed(() => {
      return route?.params?.id ?? "";
    });
    let arrayOfSubtasks: any = ref([]);
    const quizzesFrom = computed(() => {
      return route?.query?.quizzesFrom ?? "no found";
    });

    function setSolvedLocally(id: any) {
      console.log("seting", id);
      arrayOfSubtasks.value.forEach((element: any) => {
        if (element.id == id) {
          console.log("in if");

          element.solved = true;
        }
      });
    }

    onMounted(async () => {
      if (quizzesFrom.value == "course") {
        console.log("getting from course");
        await getQuizzesInCourse(id.value);
      } else if (quizzesFrom.value == "skill") {
        console.log("getting from skill");
        await getQuizzesInSkill(id.value);
      } else if (quizzesFrom.value == "quiz") {
        console.log("getting from quiz");
        await getSubTasksInQuiz(id.value);
      }

      if (quizzesFrom.value == "quiz") {
        const subtasks = useSubTasksInQuiz();
        arrayOfSubtasks.value = subtasks.value;
        loading.value = false;
        console.log("returning");
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
      console.log("arrayOfSubtasks", arrayOfSubtasks.value);
      loading.value = false;
    });
    return {
      id,
      quizzesFrom,
      quizzes,
      arrayOfSubtasks,
      selectedQuiz,
      loading,
      setSolvedLocally,
    };
  },
});
</script>

<style scoped></style>
