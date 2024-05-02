<template>
  <div>
    <p class="pr-7 text-end mt-2">
      {{ t("Headings.Solved") }}
      {{ solvedQuizzes }}
      /
      {{ matchings?.length - userCreatedQuizzes }}
    </p>
    <FormSolveMatching
      v-if="matchings.length && !!selectedQuiz"
      :data="selectedQuiz"
      @rated="setRatedLocally($event)"
      @solved="setSolvedLocally($event)"
      @nextQuestion="nextQuestion($event)"
    />
    <p v-else-if="!!!selectedQuiz" class="text-center">
      {{ t("Headings.NoMatchingFoundForYouToSolve") }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import type { Matching, MatchingForSections } from "~/types/matching";
const props = defineProps<{
  matchings: MatchingForSections[]
}>()

const emits = defineEmits(["update:modelValue"]);
const { t } = useI18n();
const selectedQuiz = ref();
const user: any = useUser();

const solvedQuizzes = computed(() => {
  let total = 0;
  props.matchings?.forEach((quiz: MatchingForSections) => {
    if (!!quiz.matching.solved) {
      ++total;
    }
  });
  return total;
});

const userCreatedQuizzes = computed(() => {
  let total = 0;
  props.matchings?.forEach((quiz: MatchingForSections) => {
    if (quiz?.matching.creator == user?.value.id) {
      ++total;
    }
  });
  return total;
});

function nextQuestion(id: number) {
  let index = 0;

  if (index == props.matchings?.length - 1 && index != 0) {
    selectedQuiz.value = null;
    return;
  }
  console.log("index is ", index);
  for (let i = index; i < props.matchings?.length; i++) {
    console.log("inside loop");
    if (
      !props.matchings[i]?.matching.solved &&
      props.matchings[i]?.matching.creator != user?.value.id
      // &&      i != index
    ) {
      selectedQuiz.value = props.matchings[i].matching;
      break;
    }
  }
}

function setRatedLocally(id: any) {
  props.matchings?.forEach((element: MatchingForSections, i: any) => {
    if (element.matching.id == id) {
      element.matching.rated = true;
    }
  });
}

function setSolvedLocally(id: any) {
  props.matchings.forEach((element: MatchingForSections) => {
    if (element.matching.id == id) {
      element.matching.solved = true;
    }
  });
}

watch(
  () => props.matchings,
  (newValue, oldValue) => {
    nextQuestion(0);
  },
  { immediate: true }
);
</script>

<style scoped></style>
