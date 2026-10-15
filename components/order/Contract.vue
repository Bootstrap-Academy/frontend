<!--
  The agreed offer and the two declarations of one order.

  The full offer text, the recipient of the confirmation and the two documents
  stand in a disclosure that starts closed, so that the price and the essential
  characteristics above (§ 312j Abs. 2 BGB) stay directly in front of the two
  boxes and the order button, on a phone as well. The wording is the offer's
  own and is shown unchanged; opening the disclosure is one tap, and the boxes
  below name what they accept.
-->
<template>
  <div
    class="grid min-w-0 grid-cols-1 gap-3 [overflow-wrap:anywhere]"
    lang="de"
    data-purchase-contract
  >
    <details class="group min-w-0" data-purchase-wording>
      <summary
        class="flex min-h-11 cursor-pointer list-none items-center gap-2 text-accent underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true" class="inline-block transition-transform group-open:rotate-90"
          >▸</span
        >
        Angebot im Wortlaut, AGB und Widerrufsinformationen
      </summary>
      <div class="mt-3 grid min-w-0 grid-cols-1 gap-4">
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
      </div>
    </details>
    <label class="flex items-start gap-3 text-body"
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
    <label class="flex items-start gap-3 text-body"
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
