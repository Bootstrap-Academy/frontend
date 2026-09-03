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
      <OrderSummary :coins="refillPrice" :loading="loading" @order="confirmOrder">
        <template #characteristics>
          <p class="text-body-1 m-0 text-body">
            {{ t("Body.OrderHeartsCharacteristics", { max: maxHearts }) }}
          </p>
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

      ordering.value = true;
    }

    async function confirmOrder() {
      if (loading.value) return;

      loading.value = true;
      const [success] = await refillHearts();
      loading.value = false;
      ordering.value = false;

      if (success) openSnackbar("success", "Success.RefilledHearts");
    }

    return { t, fnRefillHearts, confirmOrder, ordering, loading, refillPrice, maxHearts };
  },
};
</script>

<style scoped></style>
