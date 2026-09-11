<template>
  <div
    class="grid min-w-0 grid-cols-1 gap-4 [overflow-wrap:anywhere]"
    lang="de"
    data-purchase-contract
  >
    <p class="m-0 whitespace-pre-wrap break-words">{{ offer.text }}</p>
    <p class="m-0 break-words">Bestätigung an: {{ offer.recipient }}</p>
    <div class="flex flex-wrap gap-4">
      <button
        type="button"
        class="min-w-0 text-left text-accent underline"
        @click="downloadPurchaseDocument(offer.id, 'terms')"
      >
        AGB dieses Angebots herunterladen (PDF)
      </button>
      <button
        type="button"
        class="min-w-0 text-left text-accent underline"
        @click="downloadPurchaseDocument(offer.id, 'withdrawal')"
      >
        Widerrufsinformationen dieses Angebots herunterladen (PDF)
      </button>
    </div>
    <label class="flex items-start gap-3"
      ><input
        v-model="accepted"
        data-purchase-acceptance
        type="checkbox"
        class="mt-1 h-5 w-5 shrink-0"
      />
      <span class="min-w-0 flex-1"
        >Ich nehme dieses konkrete Angebot einschließlich der beigefügten AGB und
        Widerrufsinformationen an.</span
      ></label
    >
    <label class="flex items-start gap-3"
      ><input v-model="early" data-purchase-early type="checkbox" class="mt-1 h-5 w-5 shrink-0" />
      <span class="min-w-0 flex-1">{{ offer.declaration }}</span></label
    >
  </div>
</template>
<script setup lang="ts">
import type { PurchaseOffer } from "~/composables/purchases";
const props = defineProps<{ offer: PurchaseOffer; modelValue: boolean }>();
const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();
const accepted = ref(false);
const early = ref(false);
watch([accepted, early], ([a, b]) => emit("update:modelValue", a && b));
watch(
  () => props.modelValue,
  (v) => {
    if (!v) {
      accepted.value = false;
      early.value = false;
    }
  }
);
</script>
