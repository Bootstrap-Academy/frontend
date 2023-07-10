<template>
  <form
    class="flex flex-col gap-box relative card h-full"
    :class="{ 'form-submitting': loading }"
    @submit.prevent="onclickSubmitForm()"
    ref="refForm"
  >
    <h4 class="text-heading-3">
      Q). {{ subtask?.question ?? "" }}
      <span class="text-xs text-accent break-keep" v-if="subtask?.single_choice"
        >({{ t("Headings.SingleChoice") }})</span
      >
      <span class="text-xs text-accent break-keep" v-else
        >({{ t("Headings.MultiChoice") }})</span
      >
    </h4>
    <p class="text-xs text-accent" v-if="showMaxAttemptsError">
      {{ t(`Error.TooManyAttemptsForQuiz`, { second: secondsForTryAgain }) }}
    </p>

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
          'pointer-events-none':
            !!subtask.solved || subtask?.creator == user?.id,
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
        v-if="!!!askFeedBack"
        :loading="loading"
        @click="onclickSubmitForm()"
        mt
      >
        <span v-if="!data?.solved && user?.id != subtask?.creator">
          {{ t("Buttons.SubmitAnswer") }}
        </span>
        <span v-else-if="!!data?.solved || user?.id == subtask?.creator">
          {{ t("Buttons.Solved") }}
        </span>
      </InputBtn>

      <div v-if="askFeedBack" class="flex gap-4 items-center mt-8">
        <button
          @click="feedback = 'POSITIVE'"
          type="button"
          :class="feedback == 'POSITIVE' ? 'scale-125 ' : ''"
          class="w-10 h-10 text-heading-3 flex justify-center items-center bg-secondary rounded-full transition-all"
        >
          👍
        </button>

        <button
          @click="feedback = 'NEUTRAL'"
          type="button"
          :class="feedback == 'NEUTRAL' ? 'scale-125 ' : ''"
          class="w-10 h-10 text-heading-3 flex justify-center items-center bg-secondary rounded-full transition-all"
        >
          😐
        </button>

        <button
          @click="feedback = 'NEGATIVE'"
          type="button"
          :class="feedback == 'NEGATIVE' ? 'scale-125 ' : ''"
          class="w-10 h-10 pt-1 text-heading-3 flex justify-center items-center bg-secondary rounded-full transition-all"
        >
          👎
        </button>
      </div>
      <InputBtn
        :loading="loading"
        v-if="askFeedBack"
        class="self-center"
        @click="submitFeedBack()"
        mt
      >
        {{ t("Buttons.Continue") }}
      </InputBtn>
    </article>

    <article class="flex justify-end">
      <p
        v-if="askFeedBack && user?.id != subtask?.creator"
        @click="openReportDialog()"
        class="text-error text-end mt-4 text-sm cursor-pointer w-fit"
      >
        {{ t("Headings.Report") }}
      </p>
    </article>

    <DialogSlot
      v-if="dialogReportTask"
      :label="'Headings.Report'"
      :propClass="'modal-width-lg lg:modal-width-sm'"
      :show="dialogSlot"
      @closeFunction="dialogReportTask = false"
    >
      <FormReportSubtask
        @reportSubmitted="reportSubmitted()"
        :task_id="subtask.task_id"
        :subtask_id="subtask.id"
      />
    </DialogSlot>
  </form>
</template>

<script lang="ts">
import { defineComponent, ref, PropType } from "vue";
import { attempQuiz, rateQuiz } from "~~/composables/quizzes";
import { useDialogReportTask, useDialogSlot } from "~~/composables/dialogSlot";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  emits: ["solved", "updateQuestion"],

  setup(props, { emit }) {
    const { t } = useI18n();

    const user: any = useUser();
    const dialogReportTask = useDialogReportTask();
    const dialogSlot = useDialogSlot();
    const loading = ref(false);
    const selected: any = ref([]);
    const askFeedBack = ref(false);
    const subtask = useSubTaskInQuiz();
    let arrayOfAnswers: any = ref([]);
    const feedback = ref("");
    const showMaxAttemptsError = ref(false);
    const secondsForTryAgain = ref(0);
    const interval: any = ref();
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
      if (
        subtask.value.solved == true ||
        subtask.value?.creator == user.value?.id
      )
        return;
      if (!selected.value.length) {
        return openSnackbar("error", "Error.SelectAtLeastOneOption");
      }
      loading.value = true;
      const [success, error] = await attempQuiz(
        subtask.value.task_id,
        subtask.value.id,
        { answers: arrayOfAnswers.value }
      );
      loading.value = false;
      if (success == true || success == false) successHandler(success);
      else errorHandler(error);
      selected.value = [];
    }

    function successHandler(res: any) {
      showMaxAttemptsError.value = false;
      clearInterval(interval.value);
      if (!!res) {
        openSnackbar("success", "Success.QuizAttempt");
        emit("solved", props.data.id);
        askFeedBack.value = true;
      } else if (!res) {
        openSnackbar("error", "Error.QuizAttempt");
      }
    }

    function errorHandler(error: any) {
      console.log("error handler", error);
      if (error.detail == "Error.TooManyAttemptsForQuiz") {
        showMaxAttemptsError.value = true;
        secondsForTryAgain.value = error.details ?? "";
      } else {
        openSnackbar("error", error?.detail ?? "");
      }
    }

    async function submitFeedBack() {
      if (feedback.value.trim() == "") {
        return openSnackbar("error", "Error.SelectRatingFirst");
      }
      console.log("task id", subtask.value.task_id);
      console.log("subtask id", subtask.value.id);
      loading.value = true;
      const [success, error] = await rateQuiz(
        subtask.value.task_id,
        subtask.value.id,
        { rating: feedback.value }
      );
      loading.value = false;

      feedback.value = "";
      if (success !== null) {
        openSnackbar("success", "Success.SubmittedRating");
        askFeedBack.value = false;
      } else {
        openSnackbar("error", error);
      }
    }
    function reportSubmitted() {
      askFeedBack.value = false;
      emit("solved", props.data.id);
    }
    function openReportDialog() {
      dialogSlot.value = true;
      dialogReportTask.value = true;
    }
    watch(
      () => props.data,
      async () => {
        arrayOfAnswers.value = [];
        if (props?.data == null) return;
        showMaxAttemptsError.value = false;
        clearInterval(interval.value);
        setLoading(true);

        const [success, error] = await getSubTaskInQuiz(
          props?.data?.task_id ?? "",
          props?.data?.id ?? ""
        );
        console.log("succcess", success);
        if (success) {
          emit("updateQuestion", success);
        }
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

    watch(
      () => showMaxAttemptsError.value,
      (newValue: any) => {
        if (!!newValue) {
          interval.value = setInterval(() => {
            if (secondsForTryAgain.value <= 0) {
              clearInterval(interval.value);
              showMaxAttemptsError.value = false;
            }
            --secondsForTryAgain.value;
          }, 1000);
        }
      }
    );
    return {
      t,
      onclickSubmitForm,
      submitFeedBack,
      refForm,
      loading,
      askFeedBack,
      selected,
      subtask,
      arrayOfAnswers,
      setArrayOfAnswers,
      setSelected,
      feedback,
      dialogReportTask,
      dialogSlot,
      openReportDialog,
      reportSubmitted,
      user,
      showMaxAttemptsError,
      secondsForTryAgain,
    };
  },
});
</script>

<style scoped></style>
