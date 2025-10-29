<template>
  <section
    @click="fnRefillHearts()"
    class="flex scale-90 cursor-pointer items-center justify-between rounded-full bg-light px-6 text-sm text-white"
  >
    {{ t("Headings.RefillHearts") }}
    <SvgHeart class="-mb-3" />
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import Coins from "./Coins.vue";

export default {
  setup() {
    const { t } = useI18n();
    const coins = useCoins();
    const heartInfo: any = useHeartInfo();
    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });

    async function fnRefillHearts() {
      if (hearts.value >= 6) {
        return openSnackbar("info", "Error.AlreadyHaveHearts");
      } else if (coins.value < 50) {
        openSnackbar("error", "Error.Need50CoinsForRefill");
      }
      setLoading(true);
      const [success, error] = await refillHearts();
      setLoading(false);
      if (success) openSnackbar("success", "Success.RefilledHearts");
      else {
      }
    }

    return { t, fnRefillHearts };
  },
};
</script>

<style scoped></style>
