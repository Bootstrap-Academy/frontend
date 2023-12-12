<template>
  <section
    class="grid-auto gap-card container h-screen-inner min pb-container pt-container grid-rows-[auto_auto_1fr] grid place-items-center"
  >
    <section class="flex gap-3 items-center justify-end mb-3">
      <InputButtonToggle
        v-model="selectedTab"
        :mobile-responsive="false"
        :buttonOptions="toggleButtonOptions"
        smInMobile
      />
    </section>
    <section v-if="selectedTab == 0" class="container-form max-w-4xl">
      <QuizSubTaskListEditable :quizzes="quizzes" :taskId="quizId" />
    </section>

    <section v-if="selectedTab == 1" class="container-form max-w-4xl">
      <LazyMatchingEditableList :matchings="myMatchings" :taskId="quizId" />
    </section>
    <section v-if="selectedTab == 2" class="container-form max-w-4xl">
      <LazyCodingChallengeEditableList
        :challengeId="quizId"
        :codingChallenges="codingChallenges"
      />
    </section>
  </section>
</template>

<script lang="ts" setup>
import { getSubTasksInQuiz, useSubTasksInQuiz } from "~~/composables/quizzes";
definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

const route = useRoute();
const sectionId = ref();
const courseId = ref();
const lectureId = ref();
const level: any = ref(0);
const quizId = ref();
const loading = ref(true);
const selectedTab = ref(0);
const user: any = useUser();
const quizzes = useSubTasksInQuiz();
const myMatchings = useMyMatchings();
const codingChallenges = useAllCodingChallengesInATask();

const toggleButtonOptions = [
  {
    name: "Headings.Quizzes",
  },
  {
    name: "Headings.Matchings",
  },
  {
    name: "Headings.Challenges",
  },
];

watch(
  () => selectedTab.value,
  (newValue, oldValue) => {
    if (!!!user.value.admin && level.value < 20 && selectedTab.value == 2) {
      openSnackbar("info", "Error.Level20RequiredForCreatingCodingChallenge");
      setTimeout(() => {
        selectedTab.value = oldValue;
      }, 0);
    }
  }
);

watch(
  () => route,
  (newValue, oldValue) => {
    courseId.value = (newValue.query?.course ?? "").toString();
    lectureId.value = (newValue.query?.lecture ?? "").toString();
    sectionId.value = (newValue.query?.section ?? "").toString();
    level.value = (newValue.query?.level ?? "").toString();
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
  else {
    openSnackbar("error", error.data.detail);
  }

  await getSubTasksInQuiz(quizId.value, user?.value.id ?? "");
  await getAllCodingChallengesInATask(quizId.value, user?.value.id ?? "");
  await getMyMatchingsInTask(quizId.value, user?.value.id ?? "");
  loading.value = false;
});
</script>

<style scoped></style>
