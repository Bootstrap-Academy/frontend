<template>
  <div>
    <article class="flex gap-4 flex-wrap mb-7">
      <chip sm :color="'chip-color-13'" class="w-fit" md>
        {{ t("Headings.TotalQuizzes") }}:
        <span>{{ quizzesToShow.length }}</span>
      </chip>
      <chip sm :color="'chip-color-13'" class="w-fit" md>
        {{ t("Headings.MyQuizzes") }}: <span>{{ userCreatedQuizzes }}</span>
      </chip>
      <chip sm :color="'chip-color-13'" class="w-fit" md>
        {{ t("Headings.SolvedQuizzes") }}: <span>{{ solvedQuizzes }}</span>
      </chip>
    </article>

    <FormQuizAnswer
      v-if="quizzesToShow.length && !!selectedQuiz"
      doubleColumnOptions
      :data="selectedQuiz"
      @nextQuestion="nextQuestion($event)"
      @rated="setRatedLocally($event)"
      @solved="setSolvedLocally($event)"
    />
    <p v-else-if="!!!selectedQuiz" class="text-center">
      {{ t("Headings.NoQuizFoundForYouToSolve") }}
    </p>
  </div>
</template>

<script lang="ts">
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";
import type { Quiz } from "~/types/courseTypes";
export default {
  props: {
    quizzesToShow: { type: Object as PropType<Quiz[]>, default: null },
  },

  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const selectedQuiz = ref();
    const user: any = useUser();

    const solvedQuizzes = computed(() => {
      let total = 0;
      props.quizzesToShow?.forEach((quiz: Quiz) => {
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

      if (index == props.quizzesToShow?.length - 1) {
        selectedQuiz.value = null;
        return;
      }
      for (let i = index; i < props.quizzesToShow?.length; i++) {
        if (
          !props.quizzesToShow[i]?.solved &&
          props.quizzesToShow[i]?.creator != user?.value.id &&
          i != index
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
    return {
      selectedQuiz,
      nextQuestion,
      setSolvedLocally,
      setRatedLocally,
      t,
      solvedQuizzes,
      userCreatedQuizzes,
    };
  },
};
</script>

<style scoped></style>
