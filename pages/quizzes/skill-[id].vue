<template>
  <main
    class="h-screen-inner container grid grid-cols-[400px_minmax(0,1fr)] overflow-hidden mt-card-sm gap-y-card pt-card pb-card gap-x-container"
  >
    <SectionTitle subheading="Web Development / Angular Skill" heading="Quizzes" />

    <FormQuizAnswer :data="selectedQuiz ?? quizzes[0]" class="row-span-2" />

    <aside class="grid max-h-full overflow-scroll pb-44 gap-card">
      <template v-if="loading">
        <QuizCardSkeleton v-for="n in 3" :key="n" class="w-full" />
        <QuizCardSkeleton v-for="n in 3" :key="n" class="w-full" />
        <QuizCardSkeleton v-for="n in 3" :key="n" class="w-full" />
      </template>

      <template v-else-if="quizzes && quizzes.length > 0">
        <QuizCard
          class="h-fit"
          v-for="(quiz, i) of quizzes"
          :key="i"
          full
          :data="quiz"
          @click="selectedQuiz = quiz"
        />
        <QuizCard
          v-for="(quiz, i) of quizzes"
          :key="i"
          full
          :data="quiz"
          @click="selectedQuiz = quiz"
        />
      </template>

      <template v-else>
        <QuizCardSkeleton class="child opacity-60" no-animate />
        <QuizCardSkeleton class="child opacity-40" no-animate />
        <QuizCardSkeleton class="child opacity-20" no-animate />
      </template>
    </aside>
  </main>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

definePageMeta({
  layout: "inner",
  title: "Quizzes",
});

export default {
  setup() {
    const { t } = useI18n();

    const route = useRoute();

    const skillID = computed(() => {
      return route.params?.id ?? "";
    });

    const selectedQuiz = ref();

    const quizzes = useQuizzes();

    const loading = ref(true);

    onMounted(async () => {
      loading.value = true;
      await getQuizzes();
      loading.value = false;
    });

    return { t, skillID, quizzes, selectedQuiz, loading };
  },
};
</script>

<style scoped></style>
