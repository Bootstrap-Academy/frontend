<template>
  <div>
    <p v-if="receipt" role="status">
      {{ t("ReportCopy.Received") }}
    </p>
    <InputTextarea
      v-if="!receipt && !pending"
      :label="'Headings.ReportComment'"
      v-model="comment"
    />
    <p v-if="pending && !receipt" role="status">
      {{ t("ReportCopy.Unconfirmed") }}<br />{{ pending.comment }}
    </p>
    <article v-if="!receipt && !pending" class="flex flex-wrap justify-evenly gap-8">
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
    <article class="mt-12 flex flex-wrap justify-end gap-4">
      <InputBtn @click="closeReportDialog()" secondary>
        {{ t(receipt ? "Buttons.Close" : "Buttons.Cancel") }}
      </InputBtn>
      <InputBtn v-if="!receipt" :loading="loading" @click="submitForm()">{{
        t(pending ? "ReportCopy.Check" : "ReportCopy.Submit")
      }}</InputBtn>
    </article>
    <NuxtLink v-if="receipt || pending" to="/moderation">{{ t("ReportCopy.Open") }}</NuxtLink>
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
    const receipt = ref("");
    const pending = ref<any>(null);
    let alive = true;
    onBeforeUnmount(() => {
      alive = false;
    });
    const identity = () => `${useUser().value?.id || ""}:${props.task_id}:${props.subtask_id}`;
    const storageKey = () => `moderation-report:${identity()}`;
    watch(
      () => [props.task_id, props.subtask_id, useUser().value?.id],
      () => {
        reason.value = comment.value = receipt.value = "";
        pending.value = null;
        loading.value = false;
        if (import.meta.client) {
          try {
            pending.value = JSON.parse(sessionStorage.getItem(storageKey()) || "null");
          } catch {
            /* malformed local draft */
          }
        }
        if (pending.value) {
          reason.value = pending.value.reason;
          comment.value = pending.value.comment;
          receipt.value = pending.value.confirmed ? pending.value.request_id : "";
        }
      },
      { immediate: true }
    );
    function closeReportDialog() {
      if (receipt.value) emit("reportSubmitted", true);
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
    ];
    async function submitForm() {
      if (loading.value || receipt.value) return;
      if (!!!reason.value || !!!comment.value) {
        return openSnackbar("error", "Error.InvalidForm");
      }
      const owner = identity(),
        store = storageKey();
      const intent = pending.value || {
        request_id: crypto.randomUUID(),
        task_id: props.task_id,
        subtask_id: props.subtask_id,
        comment: comment.value,
        reason: reason.value,
      };
      pending.value = intent;
      sessionStorage.setItem(store, JSON.stringify(intent));
      loading.value = true;
      const { confirmed, ...body } = intent;
      const [success, error] = await reportSubtask(body);
      if (!alive || identity() !== owner) return;
      loading.value = false;
      if (success && success.id === intent.request_id) {
        receipt.value = intent.request_id;
        pending.value = { ...intent, confirmed: true };
        sessionStorage.setItem(store, JSON.stringify(pending.value));
      } else {
        openSnackbar("error", error || "Moderation.ComplaintUnconfirmed");
      }
    }
    return {
      receipt,
      pending,
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
