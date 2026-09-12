<script setup lang="ts">
import { onScopeDispose, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { createCommercialFetch } from "../composables/commercialFetch";
import {
  createOriginalDocuments,
  type OriginalReadContext,
} from "../composables/originalDocuments";

const props = defineProps<{
  identity: string;
  capture: (ordinary?: boolean) => OriginalReadContext | null;
  ordinaryAvailable?: boolean;
}>();
const { t, locale } = useI18n();
const urls = new Set<string>();
function revoke() {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.clear();
}
const fetch = createCommercialFetch($fetch);
const reader = createOriginalDocuments({
  capture: (ordinary) => props.capture(ordinary),
  identity: () => props.identity,
  fetch: (path, options) =>
    fetch(path, { ...options, baseURL: useRuntimeConfig().public.BASE_API_URL }),
  revoke,
  deliver(blob, selector) {
    const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    urls.add(url);
    anchor.href = url;
    anchor.download = `bootstrap-${selector.kind}-${selector.id}-${selector.variant}.${blob.type.split(";", 1)[0] === "application/pdf" ? "pdf" : "txt"}`;
    anchor.click();
    setTimeout(() => {
      if (urls.delete(url)) URL.revokeObjectURL(url);
    }, 1000);
  },
});
const selectedRow = ref("");
watch(
  () => props.identity,
  () => {
    reader.clear();
    selectedRow.value = "";
  },
  { flush: "sync" }
);
watch(
  reader.proofCurrent,
  (current) => {
    if (!current) {
      reader.clear();
      selectedRow.value = "";
    }
  },
  { flush: "sync" }
);
onScopeDispose(reader.dispose);
async function load(ordinary = false) {
  selectedRow.value = "";
  await reader.load(ordinary);
}
function choose(value: string) {
  selectedRow.value = value;
  reader.choose(value === "" ? null : (reader.inventory.value?.records[Number(value)] ?? null));
}
function date(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString(locale.value)
    : t("Originals.Unknown");
}
function observation(value: unknown) {
  if (value === null || value === undefined) return t("Originals.Unknown");
  return JSON.stringify(
    value,
    (_key, v) =>
      typeof v === "number" &&
      (!Number.isFinite(v) || (Number.isInteger(v) && !Number.isSafeInteger(v)))
        ? t("Originals.Unknown")
        : v,
    2
  );
}
</script>

<template>
  <section
    class="original-documents grid gap-3 rounded border p-4 text-body"
    aria-labelledby="original-documents-title"
  >
    <h3 id="original-documents-title">{{ t("Originals.Title") }}</h3>
    <div class="flex flex-wrap gap-3">
      <button type="button" :disabled="reader.state.value === 'loading'" @click="load()">
        {{ t("Originals.Load") }}
      </button>
      <button
        v-if="ordinaryAvailable"
        type="button"
        :disabled="reader.state.value === 'loading'"
        @click="load(true)"
      >
        {{ t("Originals.Ordinary") }}
      </button>
    </div>
    <p v-if="reader.state.value === 'loading'" role="status">{{ t("Originals.Loading") }}</p>
    <p v-if="reader.state.value === 'proof_required'" role="alert">
      {{ t("Originals.ProofRequired") }}
    </p>
    <p v-if="reader.state.value === 'error'" role="alert">{{ t("Originals.ReadFailed") }}</p>
    <template v-if="reader.inventory.value">
      <p v-if="!reader.inventory.value.scope.historical_owner_inventory_complete">
        {{ t("Originals.HistoryIncomplete") }}
      </p>
      <p v-if="!reader.inventory.value.records.length">{{ t("Originals.NoRecords") }}</p>
      <label v-else for="original-document-record"
        >{{ t("Originals.Record") }}
        <select
          id="original-document-record"
          :value="selectedRow"
          @change="choose(($event.target as HTMLSelectElement).value)"
        >
          <option value="">{{ t("Originals.Choose") }}</option>
          <option
            v-for="(row, index) in reader.inventory.value.records"
            :key="`${row.kind}:${row.offer_id ?? row.printed_number}`"
            :value="String(index)"
          >
            {{ t(`Originals.Kind.${row.kind}`) }} —
            {{ row.printed_number ?? t("AccessCopy.ItemNumber", { n: index + 1 }) }}
          </option>
        </select>
      </label>
    </template>
    <div v-if="reader.selected.value" class="grid gap-2">
      <p v-if="reader.selected.value.reason">
        {{ t(`Originals.Reason.${reader.selected.value.reason}`) }}
      </p>
      <label for="original-document-artifact"
        >{{ t("Originals.Artifact") }}
        <select
          id="original-document-artifact"
          :value="reader.artifact.value?.variant ?? ''"
          @change="
            reader.chooseArtifact(
              reader.selected.value!.artifacts.find(
                (a) => a.variant === ($event.target as HTMLSelectElement).value
              ) ?? null
            )
          "
        >
          <option value="">{{ t("Originals.Choose") }}</option>
          <option v-for="a in reader.selected.value.artifacts" :key="a.variant" :value="a.variant">
            {{ t(`Originals.Variant.${a.variant}`) }}
          </option>
        </select>
      </label>
      <template v-if="reader.artifact.value">
        <p>{{ t(`Originals.Reader.${reader.artifact.value.reader_state}`) }}</p>
        <p v-if="reader.artifact.value.reason">
          {{ t(`Originals.Reason.${reader.artifact.value.reason}`) }}
        </p>
        <button
          type="button"
          :disabled="!reader.artifact.value.selector || reader.downloadState.value === 'loading'"
          @click="reader.download"
        >
          {{ t("Originals.Download") }}
        </button>
      </template>
      <p v-if="reader.downloadState.value === 'loading'" role="status">
        {{ t("Originals.Loading") }}
      </p>
      <p v-if="reader.downloadState.value === 'error'" role="alert">
        {{ t("Originals.DocumentFailed") }}
      </p>
    </div>
    <form class="grid gap-2" @submit.prevent="reader.loadStatus">
      <p>{{ t("Originals.KnownOrder") }}</p>
      <label for="original-order-id"
        >{{ t("Originals.Order") }}
        <input
          id="original-order-id"
          :value="reader.order.value"
          maxlength="36"
          autocomplete="off"
          spellcheck="false"
          @input="
            selectedRow = '';
            reader.chooseOrder(($event.target as HTMLInputElement).value);
          "
        />
      </label>
      <button
        type="submit"
        :disabled="!reader.order.value || reader.statusState.value === 'loading'"
      >
        {{ t("Originals.Status") }}
      </button>
    </form>
    <p v-if="reader.statusState.value === 'loading'" role="status">{{ t("Originals.Loading") }}</p>
    <p v-if="reader.statusState.value === 'error'" role="alert">
      {{ t("Originals.StatusFailed") }}
    </p>
    <div
      v-if="reader.status.value"
      class="grid gap-2"
      aria-labelledby="original-order-status-title"
    >
      <h4 id="original-order-status-title">{{ t("Originals.StatusTitle") }}</h4>
      <p>{{ reader.status.value.offer.product.title }}</p>
      <p>{{ reader.status.value.offer.product.description }}</p>
      <p>
        {{ t("Originals.Coins") }}:
        {{ reader.status.value.offer.product.coins ?? t("Originals.Unknown") }}
      </p>
      <p>
        {{ t("Originals.Created") }}: {{ date(reader.status.value.offer.created_at) }} ·
        {{ t("Originals.Expires") }}: {{ date(reader.status.value.offer.expires_at) }}
      </p>
      <p>{{ t(`Originals.State.${reader.status.value.state}`) }}</p>
      <p>{{ t("Originals.Accepted") }}: {{ date(reader.status.value.accepted_at) }}</p>
      <p>{{ t("Originals.Deadline") }}: {{ date(reader.status.value.provision_deadline) }}</p>
      <details>
        <summary>{{ t("Originals.OfferText") }}</summary>
        <pre class="whitespace-pre-wrap break-words">{{ reader.status.value.offer.text }}</pre>
      </details>
      <details>
        <summary>{{ t("Originals.Declaration") }}</summary>
        <pre class="whitespace-pre-wrap break-words">{{
          reader.status.value.offer.declaration
        }}</pre>
      </details>
      <details>
        <summary>{{ t("AccessCopy.Details") }}</summary>
        <p class="break-all">
          {{ t("Body.PurchaseReference") }}: {{ reader.status.value.offer.id }}
        </p>
        <details
          v-for="field in ['facts', 'fulfillment', 'financial_evidence', 'provision_timing']"
          :key="field"
        >
          <summary>{{ t(`Originals.Observation.${field}`) }}</summary>
          <pre class="whitespace-pre-wrap break-words">{{
            observation(
              field === "facts"
                ? reader.status.value.offer.product.facts
                : reader.status.value[field]
            )
          }}</pre>
        </details>
      </details>
      <p>
        {{ t("Originals.Corrections") }}:
        {{
          reader.status.value.document_corrections.length
            ? reader.status.value.document_corrections
                .map((v: string) => t(`Originals.Variant.${v}`))
                .join(", ")
            : t("Originals.NoneObserved")
        }}
      </p>
    </div>
  </section>
</template>

<style scoped>
input,
select {
  display: block;
  width: 100%;
  border: 1px solid #64748b;
  padding: 0.5rem;
  background: white;
  color: #111827;
}
button {
  border: 1px solid currentColor;
  border-radius: 0.25rem;
  padding: 0.5rem 0.75rem;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--color-body);
  outline-offset: 3px;
}
</style>
