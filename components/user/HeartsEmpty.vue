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
      to="/subscription"
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
        @order="confirmOrder"
      >
        <template #characteristics>
          <p class="text-body-1 m-0 text-body">
            {{ t("Body.OrderHeartsCharacteristics", { max: maxHearts }) }}
          </p>
        </template>

        <template #consent>
          <OrderContract v-if="offer" :key="offer.id" :offer="offer" v-model="withdrawalConsent" />
        </template>

        <template #actions>
          <Btn secondary @click="ordering = false">{{ t("Buttons.Cancel") }}</Btn>
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

    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });
    const refillPrice = computed(
      () => offer.value?.product.coins ?? heartConfig.value.hearts_refill_price
    );
    const maxHearts = computed(() => formatHearts(heartConfig.value.hearts_max, locale.value));
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
        // The balance decides between the order and the coin shop, so it is read now.
        await getBalance();
        if (coins.value < refillPrice.value) {
          // The coin shop says what the coins are needed for.
          return await navigateTo({ path: "/morphcoins/buy", query: { for: "hearts" } });
        }

        // The dialog is rebuilt every time it opens, so the boxes start unticked.
        offer.value = await requestPurchaseOffer("/shop/purchases/offers/hearts");
        if (!offer.value) return;
        withdrawalConsent.value = false;
        ordering.value = true;
      } finally {
        opening.value = false;
      }
    }

    async function confirmOrder() {
      if (loading.value) return;
      if (!withdrawalConsent.value) {
        return openSnackbar("error", "Error.WithdrawalConsentMissing");
      }

      loading.value = true;
      const success = await acceptPurchase(offer.value);
      loading.value = false;
      if (success) ordering.value = false;
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
      refillPrice,
      refillTime,
      maxHearts,
    };
  },
};
</script>

<style scoped></style>
