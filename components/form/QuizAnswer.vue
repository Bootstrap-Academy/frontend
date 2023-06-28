<template>
  <form
    class="flex flex-col gap-box relative card h-full"
    :class="{ 'form-submitting': loading }"
    @submit.prevent="onclickSubmitForm()"
    ref="refForm"
  >
    <!-- <img
      class="w-full h-60 object-cover style-card"
      src="https://placehold.co/450x400/webp"
      alt=""
    /> -->
    <h4 class="text-heading-3">
      Q). {{ subtask?.question ?? "" }}
      <span class="text-xs text-accent break-keep" v-if="subtask?.single_choice"
        >({{ t("Headings.SingleChoice") }})</span
      >
      <span class="text-xs text-accent break-keep" v-else
        >({{ t("Headings.MultiChoice") }})</span
      >
    </h4>

    <article
      class="grid grid-cols-1 gap-card-sm overflow-scroll h-[45vh] place-content-start pb-20"
    >
      <button
        v-for="(option, i) of subtask?.answers ?? []"
        :key="option"
        @click="setArrayOfAnswers(i), setSelected(option)"
        type="button"
        class="box style-box border-4 border-tertiary text-heading h-fit"
        :class="{
          'bg-success text-primary': option.correct == true && answer == option,
          'bg-error': option.correct == false && answer == option,
          'bg-warning': selected.includes(option),
        }"
      >
        {{ option }}
      </button>
    </article>

    <article
      class="flex justify-between gap-card items-center sticky -bottom-2 right-card"
    >
      <InputBtn
        full
        v-if="!!!answer"
        :loading="loading"
        @click="onclickSubmitForm()"
        mt
      >
        <span v-if="!data?.solved">
          {{ t("Buttons.SubmitAnswer") }}
        </span>
        <span v-else>
          {{ t("Buttons.Solved") }}
        </span>
      </InputBtn>

      <div v-if="answer" class="flex gap-4 items-center mt-8">
        <button
          type="button"
          class="w-10 h-10 text-heading-3 flex justify-center items-center bg-secondary rounded-full"
        >
          👍
        </button>
        <button
          type="button"
          class="w-10 h-10 pt-1 text-heading-3 flex justify-center items-center bg-secondary rounded-full"
        >
          👎
        </button>
        <button
          type="button"
          class="w-10 h-10 text-heading-3 flex justify-center items-center bg-secondary rounded-full"
        >
          😐
        </button>
        <button
          type="button"
          class="w-10 h-10 pl-2 text-heading-3 flex justify-center items-center bg-secondary rounded-full"
        >
          🚩
        </button>
      </div>
      <InputBtn
        v-if="answer"
        :loading="loading"
        class="self-center"
        @click="onclickSubmitForm()"
        mt
      >
        {{ t("Buttons.Continue") }}
      </InputBtn>
    </article>
  </form>
</template>

<script lang="ts">
import { defineComponent, ref, PropType } from "vue";
import { attempQuiz } from "~~/composables/quizzes";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  emits: ["solved"],

  setup(props, { emit }) {
    const { t } = useI18n();

    const loading = ref(false);
    const selected: any = ref([]);
    const answer = ref("");
    const subtask = useSubTaskInQuiz();
    let arrayOfAnswers: any = ref([]);
    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= Checks

    function setArrayOfAnswers(index: any) {
      if (subtask.value?.single_choice) {
        arrayOfAnswers.value.forEach((element: any, i: any) => {
          if (i == index) {
            arrayOfAnswers.value[i] = true;
          } else arrayOfAnswers.value[i] = false;
        });
      } else {
        if (arrayOfAnswers.value[index] == true) {
          arrayOfAnswers.value[index] = false;
        } else {
          arrayOfAnswers.value[index] = true;
        }
      }
    }

    function setSelected(answer: any) {
      if (subtask.value?.single_choice) {
        selected.value = [];
        selected.value.push(answer);
      } else {
        let alreadyIn = selected.value.find((element: any) => {
          return element == answer;
        });

        if (alreadyIn == undefined) {
          selected.value.push(answer);
        } else {
          selected.value.forEach((element: any, index: any) => {
            if (element == answer) {
              selected.value.splice(index, 1);
            }
          });
        }
      }
    }

    async function onclickSubmitForm() {
      if (subtask.value.solved == true) return;
      loading.value = true;
      const [success, error] = await attempQuiz(
        subtask.value.task_id,
        subtask.value.id,
        { answers: arrayOfAnswers.value }
      );
      loading.value = false;
      if (success == true || success == false) successHandler(success);
      else errorHandler(error);
      // answer.value = selected.value;
      selected.value = [];
    }

    function successHandler(res: any) {
      if (!!res) {
        openSnackbar("success", "Success.QuizAttempt");
        emit("solved", props.data.id);
      } else if (!res) {
        openSnackbar("error", "Error.QuizAttempt");
      }
    }

    function errorHandler(error: any) {
      console.log("error handler", error);
      openSnackbar("error", error?.detail ?? "");
    }

    watch(
      () => props.data,
      async () => {
        arrayOfAnswers.value = [];
        if (props?.data == null) return;
        setLoading(true);

        const [success, error] = await getSubTaskInQuiz(
          props?.data?.task_id ?? "",
          props?.data?.id ?? ""
        );
        // if (!!error) {
        //   console.log("in if");
        //   setLoading(false);
        //   return openSnackbar("error", error);
        // }

        if (!!subtask.value && subtask.value?.answers.length) {
          subtask.value?.answers.forEach((element: any) => {
            arrayOfAnswers.value.push(false);
          });
          selected.value = [];
        }
        setLoading(false);
      },
      { deep: true, immediate: true }
    );

    return {
      onclickSubmitForm,
      refForm,
      t,
      loading,
      answer,
      selected,
      subtask,
      arrayOfAnswers,
      setArrayOfAnswers,
      setSelected,
    };
  },
});
</script>

<style scoped></style>
