<!--
  Takes the place of the submit button once a learner without Premium has no
  heart left for another attempt (`useHeartsEmpty`): when the hearts come back
  for free, and the two ways to go on right away. Refilling costs Morphcoins,
  so it goes through the same order summary as every other purchase instead of
  debiting the balance on the first click.
-->
<template>
  <section v-bind="$attrs" class="grid justify-items-center text-center gap-box">
    <p class="m-0 text-heading" role="status">
      {{ t("Body.HeartsEmpty", { time: refillTime }) }}
    </p>

    <InputBtn
      v-if="showHearts"
      full
      iconRight
      :icon="FullHeart"
      :loading="opening"
      @click="fnRefillHearts()"
    >
      <span class="grid justify-items-center">
        {{ t("Headings.RefillHearts") }}
        <Price :coins="refillPrice" class="justify-center text-xs normal-case tracking-normal" />
      </span>
    </InputBtn>

    <NuxtLink
      to="/subscription#premium"
      class="inline-flex min-h-11 items-center text-accent underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {{ t("Links.UnlimitedHeartsWithPremium") }}
    </NuxtLink>
  </section>

  <Modal v-if="ordering" :aria-label="t('Headings.OrderSummary')" @backdrop="ordering = false">
    <div class="w-full max-w-2xl bg-secondary p-4 style-card sm:p-8">
      <OrderSummary
        exact-offer
        :coins="refillPrice"
        :loading="loading"
        :disabled="!withdrawalConsent"
        :worded="worded"
        :missing-key="missingKey"
        @order="confirmOrder"
      >
        <!-- Shown for an offer without its own summary, which states quantity and price itself. -->
        <template #characteristics>
          <p class="text-body-1 m-0 text-body">
            {{ t("Body.OrderHeartsCharacteristics", { max: maxHearts }) }}
          </p>
          <!-- The exact quantity of this quote, in view next to the characteristic. -->
          <p v-if="quantity" class="text-body-1 m-0 text-heading" data-order-quantity>
            {{ t("Body.OrderHeartsQuantity", { n: quantity.n }, quantity.plural) }}
          </p>
        </template>

        <template #consent>
          <OrderContract
            v-if="offer"
            :key="offer.id"
            :offer="offer"
            v-model="withdrawalConsent"
            :renewed="offerRenewed"
          />
        </template>

        <template #actions>
          <!-- On a phone the order button keeps the first row; cancelling follows it. -->
          <Btn secondary class="order-last sm:order-none" @click="ordering = false">{{
            t("Buttons.Cancel")
          }}</Btn>
        </template>
      </OrderSummary>
    </div>
  </Modal>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import FullHeart from "../svg/FullHeart.vue";

export default {
  // The order dialog is a second root node; classes belong to the visible block.
  inheritAttrs: false,
  setup() {
    const { t, locale } = useI18n();
    const coins = useCoins();
    const { isDaily, showHearts } = useDailyLearning();
    const heartInfo: any = useHeartInfo();
    const heartConfig = useHeartConfig();
    const offer = ref<any>(null);
    const opening = ref(false);
    const ordering = ref(false);
    const loading = ref(false);
    // Hearts are digital content, so the declarations of § 356 Abs. 6 Nr. 2
    // BGB are required before the refill is ordered.
    const withdrawalConsent = ref(false);
    // The offer of the open dialog replaces one the server no longer took; the dialog says so.
    const offerRenewed = ref(false);

    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });
    const refillPrice = computed(
      () => offer.value?.product.coins ?? heartConfig.value.hearts_refill_price
    );
    const maxHearts = computed(() => formatHearts(heartConfig.value.hearts_max, locale.value));
    const quantity = computed(() => refillQuantity(offer.value, locale.value));
    const worded = computed(() => !!offerWording(offer.value, locale.value));
    const missingKey = computed(() => consentMissingKey(offer.value));
    const refillTime = computed(() => heartRefillTime(locale.value));

    // The page may stay open until the free refill; the new balance brings the
    // submit button back.
    let refillTimer: ReturnType<typeof setTimeout> | undefined;
    onMounted(() => {
      loadHeartConfig();
      refillTimer = setTimeout(getHearts, nextHeartRefill() - Date.now() + 1000);
    });
    onBeforeUnmount(() => clearTimeout(refillTimer));

    async function fnRefillHearts() {
      if (isDaily.value || opening.value) return;
      if (hearts.value >= heartConfig.value.hearts_max) {
        return openSnackbar("info", "Error.AlreadyHaveHearts");
      }

      opening.value = true;
      try {
        // The balance decides between the order and the coin shop, and the hearts decide
        // whether a quote from an earlier opening still fits, so both are read now.
        await Promise.all([getBalance(), getHearts()]);
        if (coins.value < refillPrice.value) {
          // The coin shop says what the coins are needed for.
          return await navigateTo({ path: "/morphcoins/buy", query: { for: "hearts" } });
        }

        // The dialog is rebuilt every time it opens, so the boxes start unticked.
        offer.value = await heartsOffer();
        if (!offer.value) return;
        withdrawalConsent.value = false;
        offerRenewed.value = false;
        ordering.value = true;
      } finally {
        opening.value = false;
      }
    }

    /** Opening the dialog again shows the same quote while it fits the hearts. */
    function heartsOffer() {
      return requestPurchaseOffer(
        "/shop/purchases/offers/hearts",
        (quote) => quote.product.facts?.refill_units === heartConfig.value.hearts_max - hearts.value
      );
    }

    async function confirmOrder() {
      if (loading.value) return;
      if (!withdrawalConsent.value) {
        return openSnackbar("error", consentMissingKey(offer.value));
      }

      loading.value = true;
      try {
        const result = await acceptPurchase(offer.value);
        if (result === "renew") {
          // The server refused the quote as changed, without a charge: a new one takes its
          // place, with empty boxes and the notice above them, which stands at once. Without
          // one the dialog closes; the page said why.
          withdrawalConsent.value = false;
          offerRenewed.value = true;
          const next = await heartsOffer();
          if (next) offer.value = next;
          else ordering.value = false;
        } else if (result) ordering.value = false;
      } finally {
        loading.value = false;
      }
    }

    return {
      isDaily,
      showHearts,
      offer,
      t,
      FullHeart,
      fnRefillHearts,
      confirmOrder,
      opening,
      ordering,
      loading,
      withdrawalConsent,
      offerRenewed,
      refillPrice,
      refillTime,
      maxHearts,
      quantity,
      worded,
      missingKey,
    };
  },
};
</script>

<style scoped></style>
