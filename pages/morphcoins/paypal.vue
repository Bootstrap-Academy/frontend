<template>
  <main class="h-screen-inner container w-full overflow-scroll bg-white pt-container pb-container">
    <PaypalCheckoutStatus v-if="showRecovery" />
    <template v-else>
      <p v-if="sdkError" role="alert">{{ t("PaypalRecovery.BeforeCaptureError") }}</p>
      <h1 v-if="locale == 'de'" class="text-heading-1 mb-2 text-subheading">
        <span class="font-black text-black font-body">
          {{ t("Headings.Morphcoins", { n: coinsToBuy }, coinsToBuy) }}
        </span>
        für
        <span class="font-black text-black font-body"> {{ totalPrice }} </span>
        kaufen
      </h1>
      <h1 v-else class="text-heading-1 mb-2 text-subheading">
        Buying
        <span class="font-black text-black font-body">
          {{ t("Headings.Morphcoins", { n: coinsToBuy }, coinsToBuy) }}
        </span>
        for
        <span class="font-black text-black font-body"> {{ totalPrice }} </span>
      </h1>
      <p class="mb-2 text-subheading mb-card">
        {{ t("Body.BuyCoins") }}
      </p>

      <p
        v-if="!validAmount"
        class="text-body-1 flex w-fit items-center border border-dashed border-error px-3 py-1 text-error bg-error-light style-box gap-box mt-card mb-card"
      >
        <ExclamationCircleIcon class="h-7 w-7" />

        {{ t("Error.InvalidCoinAmount") }}

        <NuxtLink to="/morphcoins/buy" class="font-bold underline">
          {{ t("Headings.BuyMorphcoins") }}
        </NuxtLink>
      </p>

      <template v-else>
        <article class="mb-card">
          <h2
            class="text-heading-2 mb-2 flex flex-wrap items-center font-black text-black gap-card"
          >
            {{ t("Headings.YourProfileInformation") }}

            <NuxtLink :to="`/profile/edit?coins=${coinsToBuy}`">
              <Btn>{{ t("Buttons.EditProfile") }}</Btn>
            </NuxtLink>
          </h2>

          <p
            v-if="!canBuy"
            class="text-body-1 flex w-fit border border-dashed border-error px-3 py-1 text-error bg-error-light style-box gap-box mt-card mb-card"
          >
            <ExclamationCircleIcon class="h-7 w-7" />

            {{ t("Body.MissingProfileInfo") }}
          </p>

          <div class="flex gap-box">
            <h3 class="text-body-1 text-body">{{ t("Headings.UserType") }}:</h3>
            <p class="text-body-1 text-black">
              {{ t(user?.business ? "Headings.Business" : "Headings.Person") }}
            </p>
          </div>

          <template v-if="user?.business">
            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.FirstName") }}:</h3>
              <p v-if="user && user.first_name" class="text-body-1 m-0 text-black">
                {{ user.first_name }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>

            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.LastName") }}:</h3>
              <p v-if="user && user.last_name" class="text-body-1 m-0 text-black">
                {{ user.last_name }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>

            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.Street") }}:</h3>
              <p v-if="user && user.street" class="text-body-1 m-0 text-black">
                {{ user.street }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>

            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.ZipCode") }}:</h3>
              <p v-if="user && user.zip_code" class="text-body-1 m-0 text-black">
                {{ user.zip_code }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>

            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.VAT_ID") }}:</h3>
              <p v-if="user && user.vat_id" class="text-body-1 m-0 text-black">
                {{ user.vat_id }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>
          </template>

          <template v-else>
            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.Country") }}:</h3>
              <p v-if="user && user.country" class="text-body-1 m-0 text-black">
                {{ user.country }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>

            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">
                {{ t("Inputs.EmailAddress") }}
              </h3>
              <p v-if="user && user.email" class="text-body-1 m-0 text-black">
                {{ user.email }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>
          </template>
        </article>

        <!--
        The order is placed here, so this is where the information required by
        § 312j Abs. 2 BGB and the "Zahlungspflichtig bestellen" button belong.
        PayPal is only the payment method and its SDK is loaded after the
        order has been placed.
      -->
        <article class="max-w-2xl bg-secondary p-6 style-card mb-card">
          <OrderSummary
            exact-offer
            :coins="coinsToBuy"
            kind="coins"
            breakdown
            :disabled="!canBuy || !offer || !withdrawalConsent"
            :hide-actions="ordered"
            :loading="busy || placing"
            @order="onclickOrder"
          >
            <template #characteristics>
              <p class="text-body-1 m-0 text-body">
                {{ t("Body.OrderCoinsCharacteristics") }}
              </p>
            </template>

            <template #consent>
              <OrderContract
                v-if="offer"
                :key="offer.id"
                :offer="offer"
                v-model="withdrawalConsent"
              />
              <p v-else role="status">{{ t("Body.PurchaseOfferUnavailable") }}</p>
            </template>
          </OrderSummary>
        </article>

        <article v-if="ordered" class="mb-card">
          <h2 class="text-heading-2 mb-4 font-black text-black">
            {{ t("Headings.PurchaseMorphcoins") }}
          </h2>
          <div id="paypal-button-container" ref="paypal" class="w-full max-w-md"></div>
        </article>
      </template>
    </template>
  </main>
</template>

<script>
import { useI18n } from "vue-i18n";
import { ExclamationCircleIcon } from "@heroicons/vue/24/outline";

definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  head: {
    title: "Buy Morphcoins via Paypal",
  },
  components: { ExclamationCircleIcon },
  setup() {
    const { t, locale } = useI18n();

    const route = useRoute();
    const { checkout, busy, error, create, capture, dismiss } = usePaypalCheckout();
    const sdkError = ref(false);
    const offer = ref(null);
    const placing = ref(false);
    let active = true;
    onBeforeUnmount(() => {
      active = false;
      invalidateAction();
    });
    const coinConfig = useCoinConfig();
    const coinsToBuy = computed(() => {
      return (
        checkout.value?.coins ?? offer.value?.product.coins ?? parseInt(route?.query?.coins ?? "0")
      );
    });
    // A deep link must not be able to order an amount the shop does not sell.
    const validAmount = computed(() => {
      const amount = coinsToBuy.value;
      return Number.isInteger(amount) && amount >= COIN_PURCHASE_MIN && amount <= COIN_PURCHASE_MAX;
    });
    const totalPrice = computed(() =>
      formatEuros(coinsToEuros(coinsToBuy.value, coinConfig.value), locale.value)
    );
    const user = useUser();

    const canBuy = computed(() => {
      if (!!!user.value) return false;
      if (!user.value.business) {
        return user.value.email && user.value.country;
      } else {
        return (
          user.value.street &&
          user.value.zip_code &&
          user.value.vat_id &&
          user.value.first_name &&
          user.value.last_name
        );
      }
    });

    const paypal = ref(null);
    const ordered = ref(false);
    const showRecovery = computed(
      () =>
        !!error.value ||
        (!!checkout.value && (checkout.value.phase !== "approval" || !ordered.value))
    );
    // Single orders retain the neutral early-performance request; do not
    // infer a statutory expiry acknowledgment from this checked state.
    const withdrawalConsent = ref(false);
    let offerGeneration = 0;
    let actionGeneration = 0;
    function invalidateAction() {
      actionGeneration++;
      if (placing.value) setLoading(false);
      placing.value = false;
      ordered.value = false;
    }
    async function refreshOffer() {
      const generation = ++offerGeneration;
      invalidateAction();
      offer.value = null;
      withdrawalConsent.value = false;
      if (!canBuy.value || !validAmount.value || checkout.value || ordered.value) return;
      const result = await requestPurchaseOffer(`/shop/coins/paypal/offers/${coinsToBuy.value}`);
      if (active && generation === offerGeneration) offer.value = result;
    }
    onMounted(refreshOffer);
    watch(
      () =>
        JSON.stringify([
          route.query.coins,
          user.value?.id,
          user.value?.email,
          user.value?.country,
          user.value?.street,
          user.value?.zip_code,
          user.value?.first_name,
          user.value?.last_name,
          user.value?.vat_id,
          user.value?.business,
        ]),
      refreshOffer,
      { flush: "sync" }
    );
    watch(
      withdrawalConsent,
      (consented) => {
        if (!consented) invalidateAction();
      },
      { flush: "sync" }
    );
    const paypalClientID = usePaypalClientID();

    onMounted(loadCoinConfig);

    // Placing the order is what starts the purchase, so the PayPal SDK is
    // requested only from here (§ 25 Abs. 2 Nr. 2 TDDDG).
    async function onclickOrder() {
      if (
        !active ||
        placing.value ||
        busy.value ||
        ordered.value ||
        checkout.value ||
        error.value ||
        !validAmount.value ||
        !canBuy.value ||
        !offer.value
      )
        return;
      sdkError.value = false;
      if (!withdrawalConsent.value) {
        openSnackbar("error", "Error.WithdrawalConsentMissing");
        return;
      }

      // Capture the complete clicked action before the first await. A later
      // offer or owner can never inherit declarations from this button press.
      const acceptedOffer = JSON.parse(JSON.stringify(offer.value));
      const owner = user.value?.id;
      if (!owner || acceptedOffer.user_id !== owner) return;
      const generation = ++actionGeneration;
      const offerVersion = offerGeneration;
      const orderBody = JSON.stringify({
        coins: acceptedOffer.product.coins,
        ...purchaseAcceptance(acceptedOffer),
      });
      const current = () =>
        active &&
        generation === actionGeneration &&
        offerVersion === offerGeneration &&
        user.value?.id === owner &&
        offer.value?.id === acceptedOffer.id &&
        offer.value?.hash === acceptedOffer.hash &&
        withdrawalConsent.value;
      placing.value = true;
      setLoading(true);
      try {
        await getPaypalClientID();
        if (!current()) return;
        setLoading(false);
        if (!paypalClientID.value) {
          openSnackbar("error", "Error.BuyCoins");
          return;
        }
        ordered.value = true;
        // This is the payment-obligation button. Persist the exact acceptance
        // and original provider identity here; the SDK only performs payment.
        const orderId = await withPurchaseRecovery(acceptedOffer, () =>
          create(acceptedOffer.product.coins, orderBody, current)
        );
        // Once dispatched, the original provider identity must remain saved
        // even if the UI action was invalidated while its response was pending.
        handoffPurchaseRecovery(acceptedOffer);
        if (!current()) return;
        await nextTick();
        if (!current()) return;
        await renderPaypalButtons(orderId, owner, current);
      } catch {
        if (current()) {
          sdkError.value = true;
          ordered.value = false;
        }
      } finally {
        if (generation === actionGeneration) {
          placing.value = false;
          setLoading(false);
        }
      }
    }

    async function renderPaypalButtons(orderId, owner, current) {
      try {
        const sdk = await loadPaypalSdk(paypalClientID.value);
        if (!current() || !paypal.value) return;
        await sdk
          .Buttons({
            createOrder: async () => {
              if (!current() || user.value?.id !== owner)
                throw new Error("Checkout closed or owner changed");
              return orderId;
            },
            onApprove: (data) => {
              if (current() && user.value?.id === owner && data?.orderID === orderId)
                return capture(orderId);
            },
            onCancel: () => {
              if (!current() || user.value?.id !== owner) return;
              if (orderId) dismiss(orderId, "approval");
              invalidateAction();
            },
            onError: () => {
              if (!current() || user.value?.id !== owner) return;
              sdkError.value = true;
              invalidateAction();
            },
          })
          .render(paypal.value);
      } catch {
        if (current()) {
          sdkError.value = true;
          invalidateAction();
        }
      }
    }

    return {
      t,
      locale,
      showRecovery,
      sdkError,
      coinsToBuy,
      totalPrice,
      validAmount,
      user,
      canBuy,
      paypal,
      ordered,
      busy,
      placing,
      withdrawalConsent,
      offer,
      onclickOrder,
    };
  },
};
</script>

<style scoped></style>
