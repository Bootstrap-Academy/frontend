<template>
  <div>
    <SkeletonQuizAnswer v-if="loading" class="card" />
    <form
      v-else
      class="flex flex-col gap-box relative card h-full"
      :class="{ 'form-submitting': formSubmitting }"
      @submit.prevent="onclickSubmitForm()"
      ref="refForm"
    >
      <h4 class="text-heading-3 text-accent">
        Q). {{ subtask?.question ?? "" }}
      </h4>
      <p
        class="text-heading2 text-sm"
        v-if="!subtask?.solved && user?.id != subtask?.creator"
      >
        {{
          subtask?.single_choice
            ? t("Headings.ChooseSingleCorrectOption")
            : t("Headings.ChooseMultipleCorrectOption")
        }}
      </p>

      <p class="text-xs text-accent" v-if="showMaxAttemptsError">
        {{ t(`Error.TooManyAttemptsForQuiz`, { second: secondsForTryAgain }) }}
      </p>

      <article
        class="grid gap-card-sm overflow-auto max-h-[45vh] place-content-start"
        :class="
          doubleColumnOptions ? ' grid-cols-1 sm:grid-cols-2' : ' grid-cols-1'
        "
      >
        <button
          v-for="(option, i) of subtask?.answers ?? []"
          :key="option"
          @click="setArrayOfAnswers(i), setSelected(option)"
          type="button"
          class="box style-box border-4 border-tertiary text-heading h-fit"
          :class="{
            'bg-success text-primary':
              selected.includes(option) && wasOptionsCorrect == 'yes',

            'bg-error': selected.includes(option) && wasOptionsCorrect == 'no',

            'bg-warning':
              selected.includes(option) && wasOptionsCorrect == 'waiting',
            'pointer-events-none':
              !!subtask?.solved || subtask?.creator == user?.id,
          }"
        >
          {{ option }}
        </button>
      </article>

      <div>
        <p v-if="amountQuestionsLeft == 0" class="text-center mb-2">
          {{ t("Headings.QuestionsAllSolved") }}
        </p>

        <p v-else-if="subtask?.solved && user?.id != subtask?.creator" class="text-center mb-2">
          {{ t("Headings.QuestionAlreadySolved") }}
        </p>

        <InputBtn v-else-if="data?.solved || user?.id == subtask?.creator" full @click="nextQuestion()" iconRight :icon="ChevronDoubleRightIcon">
          {{ t("Buttons.Next") }}
        </InputBtn>

        <InputBtnWithHeart
          full
          v-if="!data?.solved && user?.id != subtask?.creator && !isPremium"
          :loading="formSubmitting"
          @click="onclickSubmitForm()"
          iconRight
          mt
          :icon="HalfHeart"
        >
          {{
            subtask?.single_choice
              ? t("Buttons.SubmitAnswer")
              : t("Buttons.SubmitAnswers")
          }}
        </InputBtnWithHeart>

        <InputBtn
          full
          v-if="!data?.solved && user?.id != subtask?.creator && isPremium"
          :loading="formSubmitting"
          @click="onclickSubmitForm()"
          mt
        >
          {{
            subtask?.single_choice
              ? t("Buttons.SubmitAnswer")
              : t("Buttons.SubmitAnswers")
          }}
        </InputBtn>

        <InputBtn
          :icon="PencilSquareIcon"
          iconRight
          full
          mt
          secondary
          v-else-if="user?.id == subtask?.creator && !!user?.admin"
          @click="openDialogEditTask(subtask)"
        >
          {{ t("Buttons.Edit") }}
        </InputBtn>
      </div>
      <InputQuizRating
        :data="data"
        :subtask="subtask"
        @rated="fnRated($event)"
      />

      <DialogSlot
        v-if="dialogCreateSubtask"
        :label="'Headings.Quiz'"
        :propClass="'modal-width-lg lg:modal-width-md'"
        :show="dialogEditTask"
        @closeFunction="closeEditTaskDialog()"
      >
        <LazyFormQuiz :data="propData" :taskId="subtask.task_id" />
      </DialogSlot>
    </form>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { attempQuiz, rateQuiz } from "~~/composables/quizzes";
import { useDialogReportTask, useDialogSlot } from "~~/composables/dialogSlot";
import { useI18n } from "vue-i18n";
import { FlagIcon, PencilSquareIcon } from "@heroicons/vue/24/outline";
import { ChevronDoubleRightIcon } from "@heroicons/vue/24/solid";
import HalfHeart from "../svg/HalfHeart.vue";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
    doubleColumnOptions: { type: Boolean, default: false },
    amountQuestionsLeft: { type: Number, default: 0 },
  },
  emits: ["solved", "updateQuestion", "rated", "nextQuestion"],
  components: { FlagIcon, ChevronDoubleRightIcon, HalfHeart, PencilSquareIcon },
  setup(props, { emit }) {
    const { t } = useI18n();

    const user: any = useUser();

    const formSubmitting = ref(false);
    const loading = ref(true);
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
    const wasOptionsCorrect = ref("waiting");
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
      if (wasOptionsCorrect.value != "waiting") {
        wasOptionsCorrect.value = "waiting";
        selected.value = [];
      }
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

      formSubmitting.value = true;
      const [success, error] = await attempQuiz(
        subtask.value.task_id,
        subtask.value.id,
        { answers: arrayOfAnswers.value }
      );
      formSubmitting.value = false;
      await getHearts();
      if (success == true || success == false) successHandler(success);
      else errorHandler(error);
    }

    function successHandler(res: any) {
      showMaxAttemptsError.value = false;
      console.log("res", res);
      clearInterval(interval.value);
      if (!!res) {
        // openSnackbar("success", "Success.QuizAttempt");
        selected.value = [];
        wasOptionsCorrect.value = "yes";
        emit("solved", props.data.id);
      } else if (!res) {
        wasOptionsCorrect.value = "no";
        // openSnackbar("error", "Error.QuizAttempt");
        setInitialArrayOfAnswers();
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

    function nextQuestion() {
      emit("nextQuestion", props.data.id);
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

      loading.value = true;

      const [success, error] = await getSubTaskInQuiz(
        props?.data?.task_id ?? "",
        props?.data?.id ?? ""
      );

      if (success) {
        emit("updateQuestion", success);
      }
      if (!!subtask.value && subtask.value?.answers.length) {
        setInitialArrayOfAnswers();
        if (!subtask.value.solved) {
          selected.value = [];
        }
      }
      loading.value = false;
    }

    function setInitialArrayOfAnswers() {
      arrayOfAnswers.value = [];
      subtask.value?.answers.forEach((element: any) => {
        arrayOfAnswers.value.push(false);
      });
    }

    function fnRated(id: any) {
      emit("rated", id);
    }

    watch(
      () => props.data,
      async (newValue, oldValue) => {
        if (newValue === oldValue) {
          return;
        }
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

    return {
      t,
      onclickSubmitForm,
      refForm,
      loading,
      formSubmitting,
      selected,
      subtask,
      arrayOfAnswers,
      setArrayOfAnswers,
      setSelected,
      openDialogEditTask,
      propData,
      feedback,
      FlagIcon,
      PencilSquareIcon,
      dialogCreateSubtask,
      dialogEditTask,
      closeEditTaskDialog,
      user,
      HalfHeart,
      showMaxAttemptsError,
      secondsForTryAgain,
      nextQuestion,
      isPremium,
      fnRated,
      wasOptionsCorrect,
      ChevronDoubleRightIcon,
    };
  },
});
</script>

<style scoped></style>
