<template>
  <div>
    <p class="pr-7 text-end mt-2">
      {{ t("Headings.Solved") }}
      {{ solvedQuizzes }}
      /
      {{ quizzesToShow.length - userCreatedQuizzes }}
    </p>
    <FormQuizAnswer
      v-if="quizzesToShow.length && !!selectedQuiz"
      doubleColumnOptions
      :data="selectedQuiz"
      @nextQuestion="nextQuestion($event)"
      @rated="setRatedLocally($event)"
      @solved="setSolvedLocally($event)"
    />
    <p v-else-if="!!!selectedQuiz" class="w-full text-xl text-center">
      {{ t("Headings.NoQuizFoundForYouToSolve") }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
const props = defineProps({
  quizzesToShow: { type: Object as PropType<any>, default: null },
});

const emits = defineEmits(["update:modelValue"]);
const { t } = useI18n();
const selectedQuiz = ref();
const user: any = useUser();

const solvedQuizzes = computed(() => {
  let total = 0;
  props.quizzesToShow?.forEach((quiz: any) => {
    if (!!quiz.solved) {
      ++total;
    }
  });
  return total;
});

const userCreatedQuizzes = computed(() => {
  let total = 0;
  props.quizzesToShow?.forEach((quiz: any) => {
    if (quiz?.creator == user?.value.id) {
      ++total;
    }
  });
  return total;
});

function nextQuestion(id: any) {
  let index = 0;
  props.quizzesToShow.forEach((element: any, i: any) => {
    if (element.id == id) {
      console.log("inside index", index);
      index = i;
    }
  });

  if (index == props.quizzesToShow?.length - 1 && index != 0) {
    selectedQuiz.value = null;
    return;
  }
  for (let i = index; i < props.quizzesToShow?.length; i++) {
    if (
      !props.quizzesToShow[i]?.solved &&
      props.quizzesToShow[i]?.creator != user?.value.id
      // && i != index
    ) {
      selectedQuiz.value = props.quizzesToShow[i];
      break;
    }
  }
}

function setRatedLocally(id: any) {
  props.quizzesToShow?.forEach((element: any, i: any) => {
    if (element.id == id) {
      element.rated = true;
    }
  });
}

function setSolvedLocally(id: any) {
  props.quizzesToShow.forEach((element: any) => {
    if (element.id == id) {
      element.solved = true;
    }
  });
}

watch(
  () => props.quizzesToShow,
  (newValue, oldValue) => {
    nextQuestion(0);
  },
  { immediate: true }
);
</script>

<style scoped></style>
