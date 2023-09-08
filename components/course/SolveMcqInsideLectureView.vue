<template>
  <div>
    <FormQuizAnswer
      v-if="quizzesToShow.length && selectedQuiz"
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
import { PropType } from "vue";
import { useI18n } from "vue-i18n";
export default {
  props: {
    quizzesToShow: { type: Object as PropType<any>, default: null },
  },

  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const selectedQuiz = ref();
    const user: any = useUser();

    function solveThis(quiz: any) {
      //   router.replace({
      //     path: route.path,
      //     query: {
      //       quizzesFrom: quizzesFrom.value,
      //       querySubTaskId: quiz.id,
      //       taskId: quiz.task_id,
      //     },
      //   });
      selectedQuiz.value = quiz;
    }

    function nextQuestion(id: any) {
      console.log("next");
      let index = 0;
      props.quizzesToShow.forEach((element: any, i: any) => {
        if (element.id == id) {
          console.log("inside index", id);
          index = i;
        }
      });

      for (let i = index; i < props.quizzesToShow?.length; i++) {
        if (
          !props.quizzesToShow[i]?.solved &&
          props.quizzesToShow[i]?.creator != user?.value.id &&
          i != index
        ) {
          console.log("next quiz id", props.quizzesToShow[i].creator);
          console.log("user id", user.value?.id);
          solveThis(props.quizzesToShow[i]);

          break;
        }
        console.log("after");
      }
      selectedQuiz.value = null;
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
    return { selectedQuiz, nextQuestion, setSolvedLocally, setRatedLocally, t };
  },
};
</script>

<style scoped></style>
