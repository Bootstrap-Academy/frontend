<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  commercialState,
  commercialStatementPath,
  commercialUnits,
  createCommercialReader,
} from "../composables/commercialStatus";

const props = defineProps<{
  identity: string;
  read: () => Promise<unknown>;
  original: (number: string) => Promise<Blob>;
}>();
const { t, locale } = useI18n();
const reader = createCommercialReader(
  () => props.read(),
  () => props.identity
);
const number = ref(""),
  documentState = ref<"idle" | "loading" | "error">("idle");
let documentGeneration = 0;
const documentUrls = new Set<string>();
function invalidateDocument() {
  documentGeneration++;
  documentState.value = "idle";
  for (const url of documentUrls) URL.revokeObjectURL(url);
  documentUrls.clear();
}
function clear() {
  reader.clear();
  invalidateDocument();
  number.value = "";
}
watch(() => props.identity, clear, { flush: "sync" });
watch(number, invalidateDocument, { flush: "sync" });
onScopeDispose(clear);
const validNumber = computed(() => commercialStatementPath(number.value) !== null);
function date(value: unknown) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return t("Claims.Unknown");
  return new Date(value).toLocaleString(locale.value);
}
async function download() {
  if (!validNumber.value || documentState.value === "loading") return;
  const owner = props.identity,
    selected = number.value,
    generation = ++documentGeneration;
  const current = () =>
    owner === props.identity && generation === documentGeneration && selected === number.value;
  documentState.value = "loading";
  try {
    const blob = await props.original(selected);
    if (!current()) return;
    if (!blob.size || blob.type.split(";", 1)[0] !== "application/pdf")
      throw new Error("Original PDF unavailable");
    const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    documentUrls.add(url);
    anchor.href = url;
    anchor.download = `final-statement-${selected}.pdf`;
    anchor.click();
    setTimeout(() => {
      if (documentUrls.delete(url)) URL.revokeObjectURL(url);
    }, 1000);
    documentState.value = "idle";
  } catch {
    if (current()) documentState.value = "error";
  }
}
</script>

<template>
  <section class="grid gap-4 text-body" aria-labelledby="commercial-status-title">
    <h3 id="commercial-status-title">{{ t("Claims.Title") }}</h3>
    <p>{{ t("Claims.Limit") }}</p>
    <button type="button" :disabled="reader.state.value === 'loading'" @click="reader.load">
      {{ t("Claims.Load") }}
    </button>
    <p v-if="reader.state.value === 'loading'" role="status">{{ t("Claims.Loading") }}</p>
    <p v-if="reader.state.value === 'error'" role="alert">{{ t("Claims.Error") }}</p>
    <div v-if="reader.state.value === 'ready' && reader.data.value" class="grid gap-4">
      <p v-if="!reader.data.value.case">{{ t("Claims.NoCase") }}</p>
      <dl v-if="reader.data.value.erasure_intake" class="grid gap-1">
        <dt>{{ t("Claims.Received") }}</dt>
        <dd>{{ date(reader.data.value.erasure_intake.received_at) }}</dd>
        <dt>{{ t("Claims.Receipt") }}</dt>
        <dd class="break-all">{{ reader.data.value.erasure_intake.id }}</dd>
      </dl>
      <p>{{ t("Claims.ReceiptLimit") }}</p>
      <p v-if="!reader.data.value.obligations.length">{{ t("Claims.NoRecords") }}</p>
      <ul v-else class="grid gap-3">
        <li
          v-for="(item, index) in reader.data.value.obligations"
          :key="String(item.id ?? index)"
          class="grid gap-1 rounded border p-3"
        >
          <p class="break-all">{{ t("Claims.Record") }}: {{ item.id }}</p>
          <p>{{ t(`Claims.State.${commercialState(item.status)}`) }}</p>
          <p>{{ t("Claims.Units") }}: {{ commercialUnits(item.units) ?? t("Claims.Unknown") }}</p>
          <p>{{ t("Claims.Recorded") }}: {{ date(item.created_at) }}</p>
        </li>
      </ul>
      <template v-if="reader.data.value.reservations.length">
        <h4>{{ t("Claims.Reservations") }}</h4>
        <p>{{ t("Claims.ReservationLimit") }}</p>
        <ul class="grid gap-3">
          <li
            v-for="(item, index) in reader.data.value.reservations"
            :key="String(item.id ?? index)"
            class="grid gap-1 rounded border p-3"
          >
            <p class="break-all">{{ t("Claims.Record") }}: {{ item.obligation_id }}</p>
            <p class="break-all">{{ t("Claims.SettlementReference") }}: {{ item.id }}</p>
            <p v-if="item.parent_id" class="break-all">
              {{ t("Claims.ParentReference") }}: {{ item.parent_id }}
            </p>
            <p>
              {{ t("Claims.Mode") }}:
              {{
                t(
                  `Claims.Method.${["cash", "wallet", "redemption"].includes(String(item.mode)) ? item.mode : "unknown"}`
                )
              }}
            </p>
            <p>{{ t(`Claims.State.${commercialState(item.state)}`) }}</p>
            <p>{{ t("Claims.Units") }}: {{ commercialUnits(item.units) ?? t("Claims.Unknown") }}</p>
          </li>
        </ul>
      </template>
      <template v-if="reader.data.value.cash_payments.length">
        <h4>{{ t("Claims.Payments") }}</h4>
        <p>{{ t("Claims.PaymentLimit") }}</p>
        <ul class="grid gap-3">
          <li
            v-for="(item, index) in reader.data.value.cash_payments"
            :key="String(item.id ?? index)"
            class="grid gap-1 rounded border p-3"
          >
            <p class="break-all">{{ t("Claims.PaymentReference") }}: {{ item.id }}</p>
            <p class="break-all">
              {{ t("Claims.ExternalReference") }}: {{ item.external_reference }}
            </p>
            <p>
              {{ t("Claims.CashUnits") }}: {{ commercialUnits(item.units) ?? t("Claims.Unknown") }}
            </p>
            <p>{{ t("Claims.Occurred") }}: {{ date(item.occurred_at) }}</p>
            <p>{{ t("Claims.Recorded") }}: {{ date(item.recorded_at) }}</p>
            <ul class="grid gap-1">
              <li
                v-for="allocation in reader.data.value.cash_allocations.filter(
                  (row) => row.payment_id === item.id
                )"
                :key="String(allocation.reservation_id)"
                class="break-all"
              >
                {{ t("Claims.SettlementReference") }}: {{ allocation.reservation_id }};
                {{ t("Claims.Units") }}:
                {{ commercialUnits(allocation.units) ?? t("Claims.Unknown") }}
              </li>
            </ul>
          </li>
        </ul>
      </template>
    </div>
    <form class="grid gap-2" @submit.prevent="download">
      <label for="commercial-statement-number">{{ t("Claims.StatementNumber") }}</label>
      <input
        id="commercial-statement-number"
        v-model="number"
        maxlength="21"
        autocomplete="off"
        aria-describedby="commercial-statement-format"
        :aria-invalid="number.length > 0 && !validNumber"
      />
      <p id="commercial-statement-format">{{ t("Claims.StatementFormat") }}</p>
      <button type="submit" :disabled="!validNumber || documentState === 'loading'">
        {{ t("Claims.Download") }}
      </button>
      <p v-if="documentState === 'loading'" role="status">{{ t("Claims.Loading") }}</p>
      <p v-if="documentState === 'error'" role="alert">{{ t("Claims.DocumentError") }}</p>
    </form>
    <p>
      {{ t("Claims.Contact") }}
      <a href="mailto:hallo@bootstrap.academy">hallo@bootstrap.academy</a>
    </p>
  </section>
</template>

<style scoped>
input {
  color: #111827;
  background: white;
}
button:disabled {
  opacity: 0.5;
}
button:focus-visible,
input:focus-visible,
a:focus-visible {
  outline: 3px solid var(--color-body);
  outline-offset: 3px;
}
</style>
