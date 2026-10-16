<!--
  Renders a Morphcoin price together with its total price in Euro including
  VAT, e.g. "1.000 Morphcoins (10,00 € inkl. 19 % MwSt.)".

  Coins are a means of payment, so wherever a coin figure is shown to a user
  who is about to buy something, the Euro total has to be shown next to it
  (Art. 246a § 1 Abs. 1 Nr. 5 EGBGB, § 312j Abs. 2 BGB).
-->
<template>
  <span class="inline-flex flex-wrap items-baseline gap-x-1">
    <span v-if="!euroOnly">{{ coinText }}</span>
    <span v-if="coins > 0" :class="euroClass">{{ euroOnly ? euroText : `(${euroText})` }}</span>
  </span>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const props = defineProps({
  /** Price in Morphcoins. */
  coins: { type: Number, default: 0 },
  /** Render only the Euro amount, without the coin figure. */
  euroOnly: { type: Boolean, default: false },
  /** Append "inkl. X % MwSt." to the Euro amount. */
  vat: { type: Boolean, default: true },
  /** Extra classes for the Euro part. */
  euroClass: { type: String, default: "" },
});

const { t, locale } = useI18n();
const config = useCoinConfig();

onMounted(loadCoinConfig);

// The same wording as a price in running text (`coinPriceText`).
const parts = computed(() => coinPriceParts(props.coins, config.value, locale.value, t));
const coinText = computed(() => parts.value.coins);
const euroText = computed(() =>
  props.vat ? parts.value.euros : formatEuros(coinsToEuros(props.coins, config.value), locale.value)
);
</script>
