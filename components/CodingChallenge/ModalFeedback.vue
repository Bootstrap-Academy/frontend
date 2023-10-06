<template>
  <section
    class="bg-light p-3 sm:px-6 lg:px-8 rounded-lg flex justify-between items-center"
  >
    <!-- <p class="font-semibold text-lg">{{ t("Headings.Feedback") }}</p> -->
    <div class="flex items-center gap-3">
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
    <FlagIcon
      class="h-5 w-5 text-error cursor-pointer"
      @click="openReportDialog()"
    />

    <DialogSlot
      v-if="dialogReportTask"
      :label="'Headings.Report'"
      :propClass="'modal-width-lg lg:modal-width-sm '"
      :show="dialogSlot"
      @closeFunction="dialogReportTask = false"
      :showCross="false"
    >
      <FormReportSubtask
        :stopDialogSlotFromBeingFalse="true"
        @reportSubmitted="goBack()"
        :task_id="challengeId"
        :subtask_id="codingChallengeId"
      />
    </DialogSlot>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import {
  useDialogCodingChallengeFeedback,
  useDialogSlot,
} from "~~/composables/dialogSlot";
import { FlagIcon } from "@heroicons/vue/24/outline";
export default {
  props: {
    codingChallengeId: { type: String, default: "" },
    challengeId: { type: String, default: "" },
  },
  emits: ["submitted"],
  components: { FlagIcon },

  setup(props, { emit }) {
    const { t } = useI18n();
    const feedback = ref("");
    const dialogReportTask = useDialogReportTask();
    const dialogSlot = useDialogSlot();
    const router = useRouter();
    const dialogCodingChallengeFeedback = useDialogCodingChallengeFeedback();

    function openReportDialog() {
      dialogSlot.value = true;
      dialogReportTask.value = true;
    }
    const loading = ref(false);

    watch(
      () => feedback.value,
      (newValue, oldValue) => {
        if (!!newValue) {
          submitFeedBack();
        }
      }
    );

    async function submitFeedBack() {
      if (feedback.value.trim() == "") {
        return openSnackbar("error", "Error.SelectRatingFirst");
      }
      setLoading(true);
      const [success, error] = await rateQuiz(
        props.challengeId,
        props.codingChallengeId,
        { rating: feedback.value }
      );
      setLoading(false);

      feedback.value = "";
      if (success !== null) {
        openSnackbar("success", "Success.SubmittedRating");
        goBack();
      } else {
        openSnackbar("error", error);
      }
    }

    function goBack() {
      dialogSlot.value = false;
      dialogReportTask.value = false;
      dialogCodingChallengeFeedback.value = false;
      emit("submitted", true);
    }

    return {
      submitFeedBack,
      feedback,
      dialogReportTask,
      dialogSlot,
      openReportDialog,
      t,
      FlagIcon,
      goBack,
      loading,
    };
  },
};
</script>

<style scoped></style>
