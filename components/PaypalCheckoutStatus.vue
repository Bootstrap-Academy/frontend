<template>
  <section class="mx-auto max-w-3xl space-y-4" aria-live="polite" data-paypal-recovery>
    <template v-if="checkout">
      <h1 class="text-heading-1 font-bold">{{ t(`PaypalRecovery.${checkout.phase}Title`) }}</h1>
      <p>{{ t(`PaypalRecovery.${checkout.phase}Body`) }}</p>
      <details>
        <summary class="cursor-pointer">{{ t("PaypalRecovery.Order") }}</summary>
        <p class="break-all">{{ checkout.orderId }}</p>
      </details>
      <p v-if="checkout.phase === 'complete'">
        {{ t("Headings.Morphcoins", { n: checkout.coins }, checkout.coins) }}
      </p>
      <Btn
        v-if="checkout.phase === 'pending' && !coordinationUnavailable"
        :disabled="busy"
        @click="capture(checkout.orderId)"
      >
        {{ t(busy ? "PaypalRecovery.Checking" : "PaypalRecovery.Check") }}
      </Btn>
      <template v-if="checkout.phase === 'approval' && !coordinationUnavailable">
        <Btn :disabled="busy || resuming" @click="resume">{{ t("PaypalRecovery.Resume") }}</Btn>
        <Btn :disabled="busy" @click="dismiss(checkout.orderId, 'approval')">{{
          t("Buttons.Cancel")
        }}</Btn>
        <div ref="paypal"></div>
        <p v-if="sdkError" role="alert">{{ t("PaypalRecovery.BeforeCaptureError") }}</p>
      </template>
      <Btn v-if="checkout.phase === 'complete' && !coordinationUnavailable" @click="finish">{{
        t("Buttons.Okay")
      }}</Btn>
    </template>
    <p v-if="error" role="alert">{{ t(error) }}</p>
    <NuxtLink to="/contact" class="block underline">{{ t("PaypalRecovery.Contact") }}</NuxtLink>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const router = useRouter();
const { checkout, busy, error, coordinationUnavailable, capture, dismiss } = usePaypalCheckout();
const paypal = ref<HTMLElement | null>(null);
const resuming = ref(false);
const sdkError = ref(false);
let active = true;
onBeforeUnmount(() => {
  active = false;
});

async function resume() {
  const current = checkout.value;
  if (!current || current.phase !== "approval" || resuming.value) return;
  resuming.value = true;
  sdkError.value = false;
  try {
    const [clientId] = await getPaypalClientID();
    if (!clientId) throw new Error("PayPal unavailable");
    const sdk = await loadPaypalSdk(clientId);
    if (!active || checkout.value?.orderId !== current.orderId || !paypal.value) return;
    await sdk
      .Buttons({
        createOrder: () => current.orderId,
        onApprove: (data: { orderID?: string }) => {
          if (data?.orderID === current.orderId) return capture(current.orderId);
        },
        onCancel: () => dismiss(current.orderId, "approval"),
        onError: () => {
          sdkError.value = true;
        },
      })
      .render(paypal.value);
  } catch {
    sdkError.value = true;
    resuming.value = false;
  }
}

async function finish() {
  if (!checkout.value) return;
  await dismiss(checkout.value.orderId, "complete");
  router.push("/morphcoins/buy");
}
</script>
