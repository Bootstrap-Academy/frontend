<template>
  <div>
  		<article class="flex gap-4 flex-wrap mb-7">
  			<chip sm :color="'chip-color-13'" class="w-fit" md>
  				{{ t("Headings.TotalQuizzes") }}:
  				<span>{{ allQuizzes.length }}</span>
  			</chip>
  			<chip color="chip-color-13" class="w-fit" md v-if="quizzesInThisLecture">
  				{{ t("Headings.TotalQuizzesInLecture") }}:
  				<span>{{ quizzesInThisLecture.length }}</span>
  			</chip>
  			<chip sm :color="'chip-color-13'" class="w-fit" md>
  				{{ t("Headings.MyQuizzes") }}: <span>{{ userCreatedQuizzes }}</span>
  			</chip>
  			<chip sm :color="'chip-color-13'" class="w-fit" md>
  				{{ t("Headings.SolvedQuizzes") }}: <span>{{ solvedQuizzes }}</span>
  			</chip>
  		</article>

    <!--<FormQuizAnswer
      v-if="quizzesToShow.length && !!selectedQuiz"
      doubleColumnOptions
      :data="selectedQuiz"
      @nextQuestion="nextQuestion($event)"
      @rated="setRatedLocally($event)"
      @solved="setSolvedLocally($event)"
    />
    <p v-else-if="!!!selectedQuiz" class="w-full text-xl text-center">
      {{ t("Headings.NoQuizFoundForYouToSolve") }}
    </p> -->
	</div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import type { Quiz } from "~/types/courseTypes";

const props = defineProps<{
    totalQuizzes: Quiz[];
    quizzesInThisLecture?: Quiz[];
  }>();


const { t } = useI18n();
const selectedQuiz = ref();
const user: any = useUser();

const allQuizzes = computed(() => props.totalQuizzes)


const solvedQuizzes = computed(() => {
  let total = 0;
  allQuizzes.value?.forEach((quiz: Quiz) => {
    if (!!quiz.solved) {
      ++total;
    }
  });
  return total;
});

const userCreatedQuizzes = computed(() => {
  let total = 0;
  allQuizzes.value.forEach((quiz: any) => {
    if (quiz?.creator == user?.value.id) {
      ++total;
    }
  });
  return total;
});

function nextQuestion(id: any) {
  let index = 0;
  allQuizzes.value.forEach((element: any, i: any) => {
    if (element.id == id) {
      console.log("inside index", index);
      index = i;
    }
  });

  if (index == allQuizzes.value?.length - 1 && index !== 0) {
    selectedQuiz.value = null;
    return;
  }
  for (let i = index; i < allQuizzes.value?.length; i++) {
    if (
      !allQuizzes.value[i]?.solved &&
				allQuizzes.value[i]?.creator != user?.value.id 
    // && i != index
    ) {
      selectedQuiz.value = allQuizzes.value[i];
      break;
    }
  }
}

function setRatedLocally(id: any) {
  allQuizzes.value?.forEach((element: any, i: any) => {
    if (element.id == id) {
      element.rated = true;
    }
  });
}

function setSolvedLocally(id: any) {
  allQuizzes.value.forEach((element: any) => {
    if (element.id == id) {
      element.solved = true;
    }
  });
}

watch(
  () => allQuizzes.value,
  (newValue, oldValue) => {
    nextQuestion(0);
  },
  { immediate: true }
);
</script>

<style scoped></style>
