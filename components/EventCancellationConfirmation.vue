<template>
  <section class="w-full space-y-4" aria-live="polite">
    <h3 class="text-heading-3">{{ t("EventCancellation.Heading") }}</h3>
    <p v-if="busy">{{ t("EventCancellation.Loading") }}</p>
    <p v-if="failed" role="alert">
      {{ t(attempt ? "EventCancellation.ResponseUnknown" : "EventCancellation.Unavailable") }}
    </p>
    <template v-if="target">
      <h4 class="text-heading-4">{{ target.title }}</h4>
      <p>{{ formatDate(target.start) }} – {{ formatDate(target.end) }}</p>
      <p>{{ t(`EventCancellation.Scope.${target.scope}`, { count: target.affected_orders }) }}</p>
      <p>{{ t(`EventCancellation.Role.${target.role}`) }}</p>
      <p>
        {{
          target.recorded_paid_coins === null
            ? t("EventCancellation.PriceUnknown")
            : t("EventCancellation.Price", { coins: target.recorded_paid_coins })
        }}
      </p>
      <template v-if="!attempt">
        <p>{{ t("EventCancellation.Consequences") }}</p>
        <p v-if="target.role === 'participant'">{{ t("EventCancellation.ParticipantReturns") }}</p>
        <p v-if="target.role === 'provider'">{{ t("EventCancellation.ProviderWaiver") }}</p>
        <label v-if="target.role === 'administrator'" class="block">
          {{ t("EventCancellation.AdministrationReason") }}
          <textarea v-model="reason" maxlength="4000" class="w-full rounded border p-2" />
        </label>
        <label class="flex gap-2">
          <input v-model="confirmed" type="checkbox" />
          {{ declaration }}
        </label>
        <button
          type="button"
          class="btn"
          :disabled="busy || !confirmed || (target.role === 'administrator' && !reason.trim())"
          @click="declare"
        >
          {{ t("EventCancellation.Confirm") }}
        </button>
      </template>
      <template v-else>
        <p>{{ t("EventCancellation.Reference", { id: attempt.command }) }}</p>
        <template v-if="attempt.receipt">
          <p>
            {{ t("EventCancellation.Received", { time: formatDate(attempt.receipt.received_at) }) }}
          </p>
          <p>{{ t(`EventCancellation.State.${attempt.receipt.state}`) }}</p>
          <p>{{ t(`EventCancellation.Financial.${attempt.receipt.financial_state}`) }}</p>
          <p>{{ t("EventCancellation.PaymentSeparate") }}</p>
          <p>
            {{
              t(
                attempt.receipt.notice_state === "smtp_accepted"
                  ? "EventCancellation.NoticeAccepted"
                  : "EventCancellation.NoticePending"
              )
            }}
          </p>
          <p>{{ attempt.receipt.declaration.original_text }}</p>
        </template>
        <p v-else>{{ t("EventCancellation.ResponseUnknown") }}</p>
        <button
          v-if="!attempt.receipt || attempt.receipt.state === 'received'"
          type="button"
          class="btn"
          :disabled="busy"
          @click="submit()"
        >
          {{ t("EventCancellation.Retry") }}
        </button>
        <button type="button" class="btn" :disabled="busy" @click="refresh()">
          {{ t("EventCancellation.Refresh") }}
        </button>
        <button
          v-if="attempt.receipt && attempt.receipt.state !== 'received'"
          type="button"
          class="btn"
          :disabled="busy"
          @click="prepareCurrent"
        >
          {{ t("EventCancellation.PrepareCurrent") }}
        </button>
      </template>
    </template>
    <button v-else-if="failed" type="button" class="btn" :disabled="busy" @click="open()">
      {{ t("EventCancellation.LoadAgain") }}
    </button>
    <button type="button" class="btn" @click="$emit('close')">{{ t("Buttons.Close") }}</button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { CancellationKind, CancellationScope } from "../types/eventCancellation";
import { useEventCancellation } from "../composables/eventCancellation";
const props = defineProps<{ eventId: string; kind: CancellationKind; scope: CancellationScope }>();
const emit = defineEmits<{ close: []; applied: [] }>();
const { t, locale } = useI18n();
const user = useUser();
const { target, attempt, busy, failed, open, submit, refresh, reset } = useEventCancellation(
  props.eventId,
  props.kind,
  props.scope
);
const confirmed = ref(false),
  reason = ref("");
const declaration = computed(() =>
  t(
    target.value?.role === "administrator"
      ? "EventCancellation.AdministrationDeclaration"
      : "EventCancellation.Declaration"
  )
);
const formatDate = (value: string) =>
  new Date(value).toLocaleString(locale.value, { dateStyle: "medium", timeStyle: "medium" });
async function declare() {
  if (!confirmed.value) return;
  await submit(declaration.value, target.value?.role === "administrator" ? reason.value : null);
}
function prepareCurrent() {
  confirmed.value = false;
  reason.value = "";
  open(true);
}
watch(
  () => attempt.value?.receipt?.booking_changed,
  (changed) => {
    if (changed) emit("applied");
  }
);
watch(
  () => user.value?.id,
  () => {
    confirmed.value = false;
    reason.value = "";
    reset();
  }
);
onMounted(() => open());
</script>
