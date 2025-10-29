<template>
  <div>
    <article
      v-if="!data?.rated && data?.creator != user?.id"
      class="sticky flex items-center justify-between rounded-md bg-light px-3 py-2 gap-card right-card"
    >
      <div v-if="data?.solved" class="flex items-center gap-4">
        <button
          @click="feedback = 'POSITIVE'"
          type="button"
          :class="feedback == 'POSITIVE' ? 'scale-125' : ''"
          class="text-heading-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-all hover:scale-110"
        >
          👍
        </button>

        <button
          @click="feedback = 'NEUTRAL'"
          type="button"
          :class="feedback == 'NEUTRAL' ? 'scale-125' : ''"
          class="text-heading-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-all hover:scale-110"
        >
          😐
        </button>

        <button
          @click="feedback = 'NEGATIVE'"
          type="button"
          :class="feedback == 'NEGATIVE' ? 'scale-125' : ''"
          class="text-heading-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary pt-1 transition-all hover:scale-110"
        >
          👎
        </button>
      </div>
      <FlagIcon
        class="h-5 w-5 cursor-pointer text-error hover:scale-110"
        @click="openReportDialog()"
      />
    </article>
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
  </div>
</template>

<script lang="ts">
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";
import { FlagIcon, PencilSquareIcon } from "@heroicons/vue/24/outline";
import { useDialogReportTask, useDialogSlot } from "~~/composables/dialogSlot";

export default {
  props: {
    data: { type: Object as PropType<any>, default: null },
    subtask: { type: Object as PropType<any>, default: null },
  },
  emits: ["solved", "updateQuestion", "rated", "nextQuestion", "reportSubmitted"],
  components: { FlagIcon },

  setup(props, { emit }) {
    const { t } = useI18n();
    const user: any = useUser();
    const feedback = ref("");
    const dialogReportTask = useDialogReportTask();
    const dialogSlotReportTask = useDialogSlot();

    // ============================================== functions ==============================================================

    function openReportDialog() {
      dialogSlotReportTask.value = true;
      dialogReportTask.value = true;
    }

    async function submitFeedBack() {
      if (feedback.value.trim() == "") {
        return openSnackbar("error", "Error.SelectRatingFirst");
      }

      setLoading(true);
      const [success, error] = await rateQuiz(props.subtask.task_id, props.subtask.id, {
        rating: feedback.value,
      });
      setLoading(false);
      feedback.value = "";
      if (success !== null) {
        emit("rated", props.data.id);
        openSnackbar("success", "Success.SubmittedRating");
      } else {
        openSnackbar("error", error);
      }
    }

    function reportSubmitted() {
      emit("rated", props.data.id);
    }

    // ============================================== watches ==============================================================
    watch(
      () => feedback.value,
      (newValue, oldValue) => {
        if (!!newValue) {
          submitFeedBack();
        }
      }
    );

    return {
      user,
      t,
      feedback,
      openReportDialog,
      reportSubmitted,
      FlagIcon,
      dialogReportTask,
      dialogSlotReportTask,
    };
  },
};
</script>

<style scoped></style>
