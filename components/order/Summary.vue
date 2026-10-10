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
  <section class="grid min-w-0 grid-cols-1 gap-card">
    <h2 class="text-heading-2 m-0 text-heading">{{ t(heading) }}</h2>

    <div class="grid gap-box">
      <slot name="characteristics" />
    </div>

    <dl
      class="grid grid-cols-1 items-baseline gap-y-1 gap-x-card sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <template v-if="breakdown">
        <dt class="text-body-1 m-0 text-body">{{ t("Headings.NetAmount") }}</dt>
        <dd class="text-body-1 m-0 text-heading sm:text-end">{{ formatEuros(net, locale) }}</dd>

        <dt class="text-body-1 m-0 text-body">
          {{ t("Headings.VatAmount", { vat: vatPercent }) }}
        </dt>
        <dd class="text-body-1 m-0 text-heading sm:text-end">{{ formatEuros(vat, locale) }}</dd>
      </template>

      <dt class="text-heading-4 m-0 text-heading">{{ t("Headings.TotalPrice") }}</dt>
      <dd class="text-heading-4 m-0 text-heading sm:text-end">
        <Price :coins="coins" />
      </dd>
    </dl>

    <!--
      What the price buys beyond the moment of the order: for MorphCoins what
      they can and cannot be turned back into (AGB Ziffer 6), for premium the
      length of the period and how it renews and ends (AGB Ziffer 8).
    -->
    <p v-if="!exactOffer && kind == 'coins'" class="text-body-2 m-0 text-body">
      {{ t("Body.OrderCoinsNote") }}
    </p>

    <p v-else-if="!exactOffer && kind == 'premium'" class="text-body-2 m-0 text-body">
      {{ t("Body.OrderPremiumNote") }}
      <NuxtLink to="/vertrag-kuendigen" target="_blank" class="text-accent hover:underline">
        {{ t("Links.CancelContractsHere") }}
      </NuxtLink>
    </p>

    <p v-if="!exactOffer" class="text-body-2 m-0 text-body">
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
    <div
      v-if="$slots.consent"
      ref="consent"
      class="grid min-w-0 grid-cols-1 gap-box"
      :class="{ 'declarations-missing': missing }"
    >
      <slot name="consent" />
    </div>

    <p
      v-if="missing"
      class="text-body-1 m-0 border-l-4 border-error pl-3 text-heading"
      role="alert"
    >
      {{ t("Error.WithdrawalConsentMissing") }}
    </p>

    <div v-if="!hideActions" class="flex flex-wrap justify-end gap-card">
      <slot name="actions" />
      <InputBtn
        :loading="loading"
        :aria-disabled="disabled"
        :class="{ 'opacity-70': disabled }"
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
  exactOffer: { type: Boolean, default: false },
  /** Locale key of the summary heading. */
  heading: { type: String, default: "Headings.OrderSummary" },
  /** Show the net amount and the VAT amount above the total. */
  breakdown: { type: Boolean, default: false },
  /**
   * What is being bought, where the terms and conditions say something about
   * the purchase that outlives the order itself: `coins` or `premium`. Empty
   * for everything that is simply unlocked and stays unlocked.
   */
  kind: { type: String, default: "" },
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

const consent = ref<HTMLElement | null>(null);
// Set by the order button while a declaration is still open.
const missing = ref(false);
watch(
  () => props.disabled,
  (disabled) => {
    if (!disabled) missing.value = false;
  }
);

// The order must not be placeable while something is still missing, no matter
// how the button is activated. The button stays operable, so that it can say
// what is missing and take the buyer there.
function onclickOrder() {
  if (props.loading) return;
  if (props.disabled) return showMissing();
  emit("order");
}

function showMissing() {
  const open = consent.value?.querySelector<HTMLInputElement>("input[type=checkbox]:not(:checked)");
  if (!open) return;
  missing.value = true;
  // A declaration that is already on screen stays where it is, next to the button.
  const { top, bottom } = open.getBoundingClientRect();
  if (top < 0 || bottom > window.innerHeight) open.scrollIntoView({ block: "center" });
  open.focus({ preventScroll: true });
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

<style scoped>
/* Marks the declarations that are still open once the order button asked for them. */
.declarations-missing :deep(input[type="checkbox"]:not(:checked)),
.declarations-missing :deep(input[type="checkbox"]:not(:checked) + .tick) {
  outline: 2px solid var(--color-error);
  outline-offset: 2px;
}
</style>
