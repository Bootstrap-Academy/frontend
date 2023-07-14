<template>
  <div>
    <InputTextarea :label="'Headings.ReportComment'" v-model="comment" />
    <article class="flex gap-8 flex-wrap justify-evenly">
      <Chip
        v-for="(chip, i) of reportValueArray"
        :key="i"
        class="w-fit cursor-pointer"
        md
        @click="reason = chip.value"
        :class="reason == chip.value ? 'scale-[120%]' : ''"
      >
        {{ t(`Headings.${chip.key}`) }}
      </Chip>
    </article>
    <article class="flex justify-end gap-4 flex-wrap mt-12">
      <InputBtn @click="closeReportDialog()" secondary>
        {{ t("Buttons.Cancel") }}</InputBtn
      >
      <InputBtn :loading="loading" @click="submitForm()">{{
        t("Buttons.Report")
      }}</InputBtn>
    </article>
  </div>
</template>

<script lang="ts">
import { useDialogReportTask, useDialogSlot } from "~~/composables/dialogSlot";
import { reportSubtask } from "~~/composables/codingChallenges";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    task_id: { type: String, default: "" },
    subtask_id: { type: String, default: "" },
    stopDialogSlotFromBeingFalse: { type: Boolean, default: false },
  },
  emits: ["reportSubmitted"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const dialogReportTask = useDialogReportTask();
    const dialogSlot = useDialogSlot();
    const reason = ref("");
    const comment = ref("");
    const loading = ref(false);
    function closeReportDialog() {
      console.log("closed");
      if (!props.stopDialogSlotFromBeingFalse) {
        dialogSlot.value = false;
      }
      dialogReportTask.value = false;
    }
    const reportValueArray = [
      { key: "Abuse", value: "ABUSE" },
      { key: "Wrong", value: "WRONG" },
      { key: "UnrelatedSkill", value: "UNRELATED_SKILL" },
      { key: "Other", value: "OTHER" },
      { key: "Dislike", value: "DISLIKE" },
    ];
    async function submitForm() {
      console.log("submit");
      if (!!!reason.value || !!!comment.value) {
        return openSnackbar("error", "Error.InvalidForm");
      }
      loading.value = true;
      const [success, error] = await reportSubtask({
        task_id: props.task_id ?? "",
        subtask_id: props.subtask_id ?? "",
        comment: comment.value,
        reason: reason.value,
      });
      loading.value = false;

      if (success) {
        emit("reportSubmitted", true);
        openSnackbar("success", "Success.ReportedSubtask");
        closeReportDialog();
      } else {
        openSnackbar("error", error);
      }
    }
    return {
      reportValueArray,
      t,
      closeReportDialog,
      submitForm,
      reason,
      comment,
      loading,
    };
  },
});
</script>
<style scoped></style>
