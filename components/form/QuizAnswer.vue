<template>
  <form
    class="flex flex-col gap-box relative card h-full"
    :class="{ 'form-submitting': loading }"
    @submit.prevent="onclickSubmitForm()"
    ref="refForm"
  >
    <h4 class="text-heading-3">Q). {{ subtask?.question ?? "" }}</h4>
    <p class="text-accent">
      {{ t("Headings.ChooseCorrectOption") }}
    </p>

    <p class="text-xs text-accent" v-if="showMaxAttemptsError">
      {{ t(`Error.TooManyAttemptsForQuiz`, { second: secondsForTryAgain }) }}
    </p>

    <article
      class="grid grid-cols-1 gap-card-sm overflow-scroll max-h-[45vh] place-content-start"
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
            !!subtask?.solved || subtask?.creator == user?.id,
        }"
      >
        {{ option }}
      </button>
    </article>

    <article
      class="flex justify-end items-center gap-1 cursor-pointer"
      @click="nextQuestion()"
      v-if="data?.solved || user?.id == subtask?.creator"
    >
      <p>Next</p>
      <ChevronDoubleRightIcon class="h-5 w-5 text-accent" />
    </article>
    <div>
      <InputBtn
        full
        v-if="!data?.solved && user?.id != subtask?.creator && !isPremium"
        :loading="loading"
        @click="onclickSubmitForm()"
        iconRight
        mt
        :icon="HalfHeart"
      >
        {{ t("Buttons.SubmitAnswer") }}
      </InputBtn>

      <InputBtn
        full
        v-if="!data?.solved && user?.id != subtask?.creator && isPremium"
        :loading="loading"
        @click="onclickSubmitForm()"
        mt
      >
        {{ t("Buttons.SubmitAnswer") }}
      </InputBtn>

      <InputBtn full v-if="data?.solved && data?.rated">
        {{ t("Buttons.Solved") }}
      </InputBtn>

      <InputBtn
        :icon="PencilSquareIcon"
        iconRight
        full
        v-else-if="user?.id == subtask?.creator && !!user?.admin"
        @click="openDialogEditTask(subtask)"
      >
        {{ t("Buttons.Edit") }}
      </InputBtn>
    </div>
    <article
      v-if="data?.solved && !data.rated && data.creator != user.id"
      class="flex justify-between gap-card items-center sticky right-card bg-light rounded-md px-3 py-2"
    >
      <div class="flex gap-4 items-center">
        <button
          @click="feedback = 'POSITIVE'"
          type="button"
          :class="feedback == 'POSITIVE' ? 'scale-125 ' : ''"
          class="w-10 h-10 text-heading-3 flex justify-center items-center bg-secondary rounded-full transition-all hover:scale-110"
        >
          👍
        </button>

        <button
          @click="feedback = 'NEUTRAL'"
          type="button"
          :class="feedback == 'NEUTRAL' ? 'scale-125 ' : ''"
          class="w-10 h-10 text-heading-3 flex justify-center items-center bg-secondary rounded-full transition-all hover:scale-110"
        >
          😐
        </button>

        <button
          @click="feedback = 'NEGATIVE'"
          type="button"
          :class="feedback == 'NEGATIVE' ? 'scale-125 ' : ''"
          class="w-10 h-10 pt-1 text-heading-3 flex justify-center items-center bg-secondary rounded-full transition-all hover:scale-110"
        >
          👎
        </button>
      </div>
      <FlagIcon
        class="h-5 w-5 text-error cursor-pointer hover:scale-110"
        @click="openReportDialog()"
      />
    </article>

    <DialogSlot
      v-if="dialogCreateSubtask"
      :label="'Headings.Quiz'"
      :propClass="'modal-width-lg lg:modal-width-md'"
      :show="dialogEditTask"
      @closeFunction="closeEditTaskDialog()"
    >
      <LazyFormQuiz :data="propData" :taskId="subtask.task_id" />
    </DialogSlot>

    <DialogSlot
      v-if="dialogReportTask"
      :label="'Headings.Report'"
      :propClass="'modal-width-lg lg:modal-width-sm'"
      :show="dialogSlotReportTask"
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
import { FlagIcon, PencilSquareIcon } from "@heroicons/vue/24/outline";
import { ChevronDoubleRightIcon } from "@heroicons/vue/24/solid";
import HalfHeart from "../svg/HalfHeart.vue";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  emits: ["solved", "updateQuestion", "rated", "nextQuestion"],
  components: { FlagIcon, ChevronDoubleRightIcon, HalfHeart, PencilSquareIcon },
  setup(props, { emit }) {
    const { t } = useI18n();

    const user: any = useUser();
    const dialogReportTask = useDialogReportTask();
    const dialogSlotReportTask = useDialogSlot();
    const loading = ref(false);
    const selected: any = ref([]);
    const subtask = useSubTaskInQuiz();
    let arrayOfAnswers: any = ref([]);
    const feedback = ref("");
    const showMaxAttemptsError = ref(false);
    const secondsForTryAgain = ref(0);
    const interval: any = ref();
    const premiumInfo: any = usePremiumInfo();
    // edit quiz dialog variable
    const dialogEditTask = useDialogSlot();
    const dialogCreateSubtask = useDialogCreateSubtask();
    const propData = ref();
    // ============================================================= refs

    const refForm = ref<HTMLFormElement | null>(null);
    const isPremium = computed(() => {
      return premiumInfo.value?.premium;
    });
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
      await getHearts();
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
      } else if (!res) {
        openSnackbar("error", "Error.QuizAttempt");
      }
    }

    function errorHandler(error: any) {
      if (error == "Error.TooManyAttemptsForQuiz") {
        showMaxAttemptsError.value = true;
        secondsForTryAgain.value = error.details ?? "";
      } else {
        openSnackbar("error", error);
      }
    }

    async function submitFeedBack() {
      if (feedback.value.trim() == "") {
        return openSnackbar("error", "Error.SelectRatingFirst");
      }
      setLoading(true);
      const [success, error] = await rateQuiz(
        subtask.value.task_id,
        subtask.value.id,
        { rating: feedback.value }
      );
      setLoading(false);
      feedback.value = "";
      if (success !== null) {
        emit("rated", props.data.id);
        openSnackbar("success", "Success.SubmittedRating");
      } else {
        openSnackbar("error", error);
      }
    }

    function nextQuestion() {
      emit("nextQuestion", props.data.id);
    }
    function reportSubmitted() {
      emit("solved", props.data.id);
      emit("rated", props.data.id);
    }

    function openReportDialog() {
      dialogSlotReportTask.value = true;
      dialogReportTask.value = true;
    }

    function openDialogEditTask(data: any) {
      propData.value = data;
      dialogEditTask.value = true;
      dialogCreateSubtask.value = true;
    }

    async function closeEditTaskDialog() {
      dialogCreateSubtask.value = false;
      await setData();
    }

    async function setData() {
      arrayOfAnswers.value = [];
      if (props?.data == null) return;
      showMaxAttemptsError.value = false;
      clearInterval(interval.value);
      setLoading(true);

      const [success, error] = await getSubTaskInQuiz(
        props?.data?.task_id ?? "",
        props?.data?.id ?? ""
      );

      if (success) {
        emit("updateQuestion", success);
      }
      if (!!subtask.value && subtask.value?.answers.length) {
        subtask.value?.answers.forEach((element: any) => {
          arrayOfAnswers.value.push(false);
        });
        selected.value = [];
      }
      setLoading(false);
    }

    watch(
      () => props.data,
      async () => {
        await setData();
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

    watch(
      () => feedback.value,
      (newValue, oldValue) => {
        if (!!newValue) {
          submitFeedBack();
        }
      }
    );

    return {
      t,
      onclickSubmitForm,
      submitFeedBack,
      refForm,
      loading,
      selected,
      subtask,
      arrayOfAnswers,
      setArrayOfAnswers,
      setSelected,
      openDialogEditTask,
      propData,
      feedback,
      dialogReportTask,
      dialogSlotReportTask,
      openReportDialog,
      FlagIcon,
      PencilSquareIcon,
      reportSubmitted,
      dialogCreateSubtask,
      dialogEditTask,
      closeEditTaskDialog,
      user,
      HalfHeart,
      showMaxAttemptsError,
      secondsForTryAgain,
      nextQuestion,
      isPremium,
    };
  },
});
</script>

<style scoped></style>
