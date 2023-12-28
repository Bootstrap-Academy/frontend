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
const props = defineProps({
  matchings: { type: Object as PropType<any>, default: null },
});

const emits = defineEmits(["update:modelValue"]);
const { t } = useI18n();
const selectedQuiz = ref();
const user: any = useUser();

const solvedQuizzes = computed(() => {
  let total = 0;
  props.matchings?.forEach((quiz: any) => {
    if (!!quiz.solved) {
      ++total;
    }
  });
  return total;
});

const userCreatedQuizzes = computed(() => {
  let total = 0;
  props.matchings?.forEach((quiz: any) => {
    if (quiz?.creator == user?.value.id) {
      ++total;
    }
  });
  return total;
});

function nextQuestion(id: any) {
  let index = 0;
  props.matchings.forEach((element: any, i: any) => {
    if (element.id == id) {
      console.log("inside index", index);
      index = i;
    }
  });

  if (index == props.matchings?.length - 1 && index != 0) {
    selectedQuiz.value = null;
    console.log("returning");
    return;
  }
  console.log("index is ", index);
  for (let i = index; i < props.matchings?.length; i++) {
    console.log("inside loop");
    if (
      !props.matchings[i]?.solved &&
      props.matchings[i]?.creator != user?.value.id
      // &&      i != index
    ) {
      selectedQuiz.value = props.matchings[i];
      break;
    }
  }
}

function setRatedLocally(id: any) {
  props.matchings?.forEach((element: any, i: any) => {
    if (element.id == id) {
      element.rated = true;
    }
  });
}

function setSolvedLocally(id: any) {
  props.matchings.forEach((element: any) => {
    if (element.id == id) {
      element.solved = true;
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
