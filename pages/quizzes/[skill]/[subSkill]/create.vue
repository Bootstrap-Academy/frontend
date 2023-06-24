<template>
  <section
    class="grid-auto gap-card container h-screen-inner min pb-container pt-container grid-rows-[auto_auto_1fr] grid place-items-center"
  >
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
        <PencilIcon class="h-5 w-5 text-accent inline-block mr-2" />
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
        {{ $t("Headings.CodingChallenge") }}
      </article>
    </section>

    <section v-if="selectedTab == 0" class="container-form max-w-4xl">
      <SectionTitle
        center
        heading="Headings.Quizzes"
        size="sm"
        class="mb-card mx-auto"
      />
      <QuizSubTaskListEditable :subtasks="subtasks" :taskId="quizId" />
    </section>

    <section v-if="selectedTab == 1" class="container-form max-w-4xl">
      <SectionTitle
        center
        heading="Headings.CodingChallenge"
        size="sm"
        class="mb-card mx-auto"
      />
      <LazyCodingChallengeEditableList
        :challengeId="quizId"
        :codingChallenges="codingChallenges"
      />
    </section>
  </section>
</template>

<script lang="ts">
import { PencilIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
import { getSubTasksInQuiz, useSubTasksInQuiz } from "~~/composables/quizzes";
definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  head: {
    title: "Create Quiz",
  },
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const sectionId = ref();
    const courseId = ref();
    const lectureId = ref();
    const quizId = ref();
    const loading = ref(true);
    const selectedTab = ref(0);

    const subtasks = useSubTasksInQuiz();
    const codingChallenges = useAllCodingChallengesInATask();
    watch(
      () => route,
      (newValue, oldValue) => {
        courseId.value = (newValue.query?.course ?? "").toString();
        lectureId.value = (newValue.query?.lecture ?? "").toString();
        sectionId.value = (newValue.query?.section ?? "").toString();
      },
      { immediate: true, deep: true }
    );

    onMounted(async () => {
      loading.value = true;
      const [success, error] = await createQuiz(courseId.value, {
        section_id: sectionId.value,
        lecture_id: lectureId.value,
      });
      if (success) quizId.value = success?.id ?? "";
      else openSnackbar("error", "Error.CannotCreateQuiz");

      await getSubTasksInQuiz(quizId.value);
      await getAllCodingChallengesInATask(quizId.value);
      loading.value = false;
    });
    return { subtasks, codingChallenges, t, selectedTab, quizId };
  },
  components: { PencilIcon },
};
</script>

<style scoped></style>
