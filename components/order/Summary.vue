<!--
  The order summary that has to be shown immediately before a consumer places
  an order (§ 312j Abs. 2 BGB, Art. 246a § 1 EGBGB): the essential
  characteristics of what is bought, the total price including VAT, and the
  terms and conditions and the withdrawal policy. The order itself is placed
  with the button below, which by law must read "Zahlungspflichtig bestellen".

  The `consent` slot is the place for the terms and the declarations under
  § 356 Abs. 6 BGB; it sits directly above the order button on every purchase
  surface.
-->
<template>
  <section class="grid gap-card">
    <h2 class="text-heading-2 m-0 text-heading">{{ t(heading) }}</h2>

    <div class="grid gap-box">
      <slot name="characteristics" />
    </div>

    <dl class="grid grid-cols-[1fr_auto] items-baseline gap-y-1 gap-x-card">
      <template v-if="breakdown">
        <dt class="text-body-1 m-0 text-body">{{ t("Headings.NetAmount") }}</dt>
        <dd class="text-body-1 m-0 text-end">{{ formatEuros(net, locale) }}</dd>

        <dt class="text-body-1 m-0 text-body">
          {{ t("Headings.VatAmount", { vat: vatPercent }) }}
        </dt>
        <dd class="text-body-1 m-0 text-end">{{ formatEuros(vat, locale) }}</dd>
      </template>

      <dt class="text-heading-4 m-0 text-heading">{{ t("Headings.TotalPrice") }}</dt>
      <dd class="text-heading-4 m-0 text-end text-heading">
        <Price :coins="coins" />
      </dd>
    </dl>

    <p class="text-body-2 m-0 text-body">
      {{ t("Links.OrderLegalHint") }}
      <NuxtLink
        to="/docs/terms-and-conditions"
        target="_blank"
        class="text-accent hover:underline"
        >{{ t("Links.TermsAndConditions") }}</NuxtLink
      >
      {{ t("Links.OrderLegalHintMiddle") }}
      <NuxtLink
        to="/docs/right-of-withdrawal"
        target="_blank"
        class="text-accent hover:underline"
        >{{ t("Links.RightOfWithdrawalLinkText") }}</NuxtLink
      >{{ t("Links.OrderLegalHintEnd") }}
    </p>

    <!-- Terms and the withdrawal declarations (§ 356 Abs. 6 BGB). -->
    <div v-if="$slots.consent" class="grid gap-box">
      <slot name="consent" />
    </div>

    <div v-if="!hideActions" class="flex flex-wrap justify-end gap-card">
      <slot name="actions" />
      <InputBtn
        :loading="loading"
        :aria-disabled="disabled"
        :class="{ 'pointer-events-none opacity-70': disabled }"
        @click="onclickOrder"
      >
        {{ t(submitLabel) }}
      </InputBtn>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const props = defineProps({
  /** Total price of the order in Morphcoins. */
  coins: { type: Number, default: 0 },
  /** Locale key of the summary heading. */
  heading: { type: String, default: "Headings.OrderSummary" },
  /** Show the net amount and the VAT amount above the total. */
  breakdown: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  /** Keep the information visible but drop the order button. */
  hideActions: { type: Boolean, default: false },
  /**
   * Locale key of the order button. Only override this where nothing has to
   * be paid; a paid order must use the statutory wording.
   */
  submitLabel: { type: String, default: "Buttons.OrderWithObligationToPay" },
});

const emit = defineEmits<{ (e: "order"): void }>();

// The order must not be placeable while something is still missing, no matter
// how the button is activated.
function onclickOrder() {
  if (props.disabled || props.loading) return;
  emit("order");
}

const { t, locale } = useI18n();
const config = useCoinConfig();

onMounted(loadCoinConfig);

const gross = computed(() => coinsToEuros(props.coins, config.value));
const vat = computed(() => vatShare(gross.value, config.value));
const net = computed(() => gross.value - vat.value);
const vatPercent = computed(() =>
  new Intl.NumberFormat(locale.value === "de" ? "de-DE" : "en-US", {
    maximumFractionDigits: 2,
  }).format(config.value.vat_percent)
);
</script>
