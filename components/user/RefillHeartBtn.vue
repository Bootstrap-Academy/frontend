<!--
  Shortcut to refill the hearts from a challenge page. Refilling costs
  Morphcoins, so it goes through the same order summary as every other purchase
  instead of debiting the balance on the first click.
-->
<template>
  <section
    @click="fnRefillHearts()"
    class="flex scale-90 cursor-pointer items-center justify-between rounded-full bg-light px-6 text-sm text-white"
  >
    {{ t("Headings.RefillHearts") }}
    <SvgHeart class="-mb-3" />
  </section>

  <Modal v-if="ordering" @backdrop="ordering = false">
    <div class="w-full max-w-2xl bg-secondary p-8 style-card">
      <OrderSummary
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
          <OrderWithdrawalConsent kind="digital" v-model="withdrawalConsent" />
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

export default {
  setup() {
    const { t, locale } = useI18n();
    const coins = useCoins();
    const heartInfo: any = useHeartInfo();
    const heartConfig = useHeartConfig();
    const ordering = ref(false);
    const loading = ref(false);
    // Hearts are digital content, so the declarations of § 356 Abs. 6 Nr. 2
    // BGB are required before the refill is ordered.
    const withdrawalConsent = ref(false);

    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });
    const refillPrice = computed(() => heartConfig.value.hearts_refill_price);
    const maxHearts = computed(() => formatHearts(heartConfig.value.hearts_max, locale.value));

    onMounted(loadHeartConfig);

    function fnRefillHearts() {
      if (hearts.value >= heartConfig.value.hearts_max) {
        return openSnackbar("info", "Error.AlreadyHaveHearts");
      }
      if (coins.value < refillPrice.value) {
        return openSnackbar("error", "Error.NeedCoinsForRefill", "", false, {
          coins: refillPrice.value,
        });
      }

      // The dialog is rebuilt every time it opens, so the boxes start unticked.
      withdrawalConsent.value = false;
      ordering.value = true;
    }

    async function confirmOrder() {
      if (loading.value) return;
      if (!withdrawalConsent.value) {
        return openSnackbar("error", "Error.WithdrawalConsentMissing");
      }

      loading.value = true;
      const [success] = await refillHearts(withdrawalConsentBody());
      loading.value = false;
      ordering.value = false;

      if (success) openSnackbar("success", "Success.RefilledHearts");
    }

    return {
      t,
      fnRefillHearts,
      confirmOrder,
      ordering,
      loading,
      withdrawalConsent,
      refillPrice,
      maxHearts,
    };
  },
};
</script>

<style scoped></style>
