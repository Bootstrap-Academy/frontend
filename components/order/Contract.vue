<!--
  The agreed offer and the two declarations of one order.

  An offer with an order summary (`offer.summary`) is short: what is bought, further
  characteristics, the term of Premium, when it is provided, the total price with VAT and
  how it is paid, each stated once and taken from the offer itself. The product, the term
  and the price are highlighted (§ 312j Abs. 2 BGB). The English interface shows the
  English wording and says that the German one is binding (AGB 1.4). The acceptance links
  the terms and the withdrawal policy of this very offer.

  Older offers and those of other services carry a long text. It stands in a disclosure
  that starts closed, together with the recipient of the confirmation and the two
  documents, so that the price and the essential characteristics above stay directly in
  front of the two boxes and the order button, on a phone as well.
-->
<template>
  <div
    v-if="wording"
    class="grid min-w-0 grid-cols-1 gap-3 [overflow-wrap:anywhere] sm:gap-card"
    :lang="wording.lang"
    data-purchase-contract
    data-purchase-summary
  >
    <div class="grid min-w-0 grid-cols-1 gap-1 sm:gap-2" data-purchase-lines>
      <p
        v-for="(line, index) of wording.lines"
        :key="index"
        class="m-0"
        :class="
          highlighted(line.role)
            ? 'text-heading-4 leading-snug text-heading'
            : 'text-body-1 leading-snug text-body'
        "
        :data-line="line.role"
      >
        {{ line.text }}
      </p>
      <p v-if="wording.lang === 'en'" class="text-body-2 m-0 leading-snug text-body">
        {{ t("Body.OfferGermanBinding") }}
      </p>
    </div>
    <div class="grid min-w-0 grid-cols-1 gap-3">
      <p
        v-if="renewed"
        role="status"
        class="text-body-1 m-0 font-bold text-heading"
        data-offer-renewed
      >
        {{ t("Body.OfferRenewed") }}
      </p>
      <div class="flex items-start gap-3 text-body">
        <input
          :id="acceptanceId"
          v-model="accepted"
          data-purchase-acceptance
          type="checkbox"
          class="mt-1 h-5 w-5 shrink-0"
        />
        <!-- The two links download the documents this offer is bound to. -->
        <label :for="acceptanceId" class="min-w-0 flex-1">
          <i18n-t keypath="Body.OfferAcceptance" scope="global">
            <template #terms>
              <a
                href="#"
                class="text-accent underline underline-offset-2"
                data-purchase-document="terms"
                @click.prevent="downloadPurchaseDocument(offer.id, 'terms')"
                >{{ t("Links.TermsAndConditions") }}</a
              >
            </template>
            <template #withdrawal>
              <a
                href="#"
                class="text-accent underline underline-offset-2"
                data-purchase-document="withdrawal"
                @click.prevent="downloadPurchaseDocument(offer.id, 'withdrawal')"
                >{{ t("Links.RightOfWithdrawalLinkText") }}</a
              >
            </template>
          </i18n-t>
        </label>
      </div>
      <label class="flex items-start gap-3 text-body"
        ><input v-model="early" data-purchase-early type="checkbox" class="mt-1 h-5 w-5 shrink-0" />
        <span class="min-w-0 flex-1">{{ wording.declaration }}</span></label
      >
    </div>
  </div>
  <div
    v-else
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
    <p
      v-if="renewed"
      role="status"
      class="text-body-1 m-0 font-bold text-heading"
      data-offer-renewed
    >
      {{ t("Body.OfferRenewed") }}
    </p>
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
import { useId } from "vue";
import { useI18n } from "vue-i18n";
import type { PurchaseOffer } from "~/composables/purchases";
/**
 * `renewed`: this offer replaced one the server no longer took. The notice stands right above
 * the boxes, which start empty again, from the moment the refusal is known.
 */
const props = defineProps<{ offer: PurchaseOffer; modelValue: boolean; renewed?: boolean }>();
const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();
const { t, locale } = useI18n();
const wording = computed(() => offerWording(props.offer, locale.value));
const acceptanceId = useId();
// What § 312j Abs. 2 BGB wants highlighted right above the order button.
const highlighted = (role: string) => ["product", "term", "price"].includes(role);
const accepted = ref(false);
const early = ref(false);
// A new offer starts with empty boxes and says so at once, so that the order only goes out
// with declarations given for the offer that is shown.
watch([accepted, early], ([a, b]) => emit("update:modelValue", a && b), { immediate: true });
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
