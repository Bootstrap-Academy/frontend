<template>
  <!--
    The page is dark like every other page. Only what PayPal draws keeps the light ground
    this page had from its first version: see the container of its buttons below.

    It is also the one page that scrolls inside its `main`. Firefox draws the scrollbar of
    such an area light unless it is told the colours. The other browsers keep the thin bar
    of the stylesheet, so the colours are given to Firefox alone.
  -->
  <main
    ref="page"
    class="h-screen-inner container w-full overflow-scroll pt-container pb-container supports-[-moz-appearance:none]:[scrollbar-color:var(--color-tertiary)_var(--color-primary)]"
  >
    <PaypalCheckoutStatus v-if="showRecovery" />
    <template v-else>
      <p v-if="sdkError" role="alert">{{ t("PaypalRecovery.BeforeCaptureError") }}</p>
      <!--
        The amount and its price stand once on this page: in the order summary
        right above the order button, where § 312j Abs. 2 BGB asks for them.
      -->
      <h1 class="text-heading-1 text-heading mb-card">{{ t("Headings.BuyMorphcoins") }}</h1>

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
            class="text-heading-2 mb-2 flex flex-wrap items-center font-black text-heading gap-card"
          >
            {{ t("Headings.YourProfileInformation") }}

            <NuxtLink :to="`/profile/edit?coins=${coinsToBuy}`">
              <Btn secondary>{{ t("Buttons.EditProfile") }}</Btn>
            </NuxtLink>
          </h2>

          <!--
            The session cookie only says who is signed in. Buyer type, country
            and invoice data are shown once the profile has arrived.
          -->
          <p
            v-if="!profileLoaded && profileFailed"
            class="text-body-1 flex w-fit flex-wrap items-center border border-dashed border-error px-3 py-1 text-error bg-error-light style-box gap-box mt-card mb-card"
            role="alert"
          >
            <ExclamationCircleIcon class="h-7 w-7" />

            {{ t("Error.TryAgainLater") }}

            <button type="button" class="min-h-11 font-bold underline" @click="loadProfile">
              {{ t("Buttons.TryAgain") }}
            </button>
          </p>

          <p v-else-if="!profileLoaded" class="text-body-1 text-body mt-card mb-card" role="status">
            {{ t("Moderation.Loading") }}
          </p>

          <p
            v-else-if="user?.email_verified === false"
            class="text-body-1 flex w-fit flex-wrap border border-dashed border-error px-3 py-1 text-error bg-error-light style-box gap-box mt-card mb-card"
          >
            <ExclamationCircleIcon class="h-7 w-7" />

            {{ t("Error.AccountNotVerified") }}

            <NuxtLink to="/auth/verify-account" class="font-bold underline">
              {{ t("Buttons.VerifyAccount") }}
            </NuxtLink>
          </p>

          <!--
            A private buyer only lacks the country for the invoice. It is asked
            for here and saved to the profile with the button, so the order
            goes on without a detour through the profile form.
          -->
          <form
            v-else-if="countryAsked"
            class="grid max-w-md gap-box mt-card mb-card"
            @submit.prevent
          >
            <label for="order-country" class="text-body-1 text-heading">
              {{ t("Body.CountryForInvoice") }}
            </label>
            <select
              id="order-country"
              v-model="countryChoice"
              class="block w-full rounded-md bg-secondary px-4 py-3 text-base text-white ring-2 ring-tertiary focus:outline-none focus:ring-accent focus:ring-offset-2 focus:ring-offset-tertiary"
            >
              <option v-for="option of countryOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
              <option value="">{{ t("Inputs.OtherCountry") }}</option>
            </select>
            <Input
              v-if="!countryChoice"
              v-model="otherCountry"
              label="Inputs.Country"
              :rules="countryRules"
              :show-error="countryAttempted"
            />
            <InputBtn class="w-fit" :loading="savingCountry" @click="saveCountry">
              {{ t("Buttons.Continue") }}
            </InputBtn>
          </form>

          <p
            v-else-if="!canBuy"
            class="text-body-1 flex w-fit border border-dashed border-error px-3 py-1 text-error bg-error-light style-box gap-box mt-card mb-card"
          >
            <ExclamationCircleIcon class="h-7 w-7" />

            {{ t("Body.MissingProfileInfo") }}
          </p>

          <div v-if="profileLoaded" class="flex gap-box">
            <h3 class="text-body-1 text-body">{{ t("Headings.UserType") }}:</h3>
            <p class="text-body-1 text-heading">
              {{ t(user?.business ? "Headings.Business" : "Headings.Person") }}
            </p>
          </div>

          <template v-if="profileLoaded && user?.business">
            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.FirstName") }}:</h3>
              <p v-if="user && user.first_name" class="text-body-1 m-0 text-heading">
                {{ user.first_name }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>

            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.LastName") }}:</h3>
              <p v-if="user && user.last_name" class="text-body-1 m-0 text-heading">
                {{ user.last_name }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>

            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.Street") }}:</h3>
              <p v-if="user && user.street" class="text-body-1 m-0 text-heading">
                {{ user.street }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>

            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.ZipCode") }}:</h3>
              <p v-if="user && user.zip_code" class="text-body-1 m-0 text-heading">
                {{ user.zip_code }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>

            <div class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.VAT_ID") }}:</h3>
              <p v-if="user && user.vat_id" class="text-body-1 m-0 text-heading">
                {{ user.vat_id }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>
          </template>

          <template v-else-if="profileLoaded">
            <div v-if="!needsCountry" class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">{{ t("Inputs.Country") }}:</h3>
              <p v-if="user && user.country" class="text-body-1 m-0 text-heading">
                {{ user.country }}
              </p>
              <p v-else class="text-body-1 m-0 text-error">
                {{ t("Headings.Missing") }}
              </p>
            </div>

            <!--
              The address stands at most once on the page. It stands here while the page asks
              for the country, when no offer came, and when the address is missing. With an
              offer it goes: an offer with its own summary does not name it (the confirmation
              mail goes to it), an older offer names it in its full text. While the offer is
              on its way nothing is shown that would vanish a moment later.
            -->
            <div v-if="!user?.email || (!offer && !offerPending)" class="flex gap-box">
              <h3 class="text-body-1 m-0 text-body">
                {{ t("Inputs.EmailAddress") }}
              </h3>
              <p
                v-if="user?.email"
                class="text-body-1 m-0 min-w-0 text-heading [overflow-wrap:anywhere]"
              >
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
        <article ref="summaryCard" class="max-w-2xl bg-secondary p-4 style-card mb-card sm:p-6">
          <OrderSummary
            exact-offer
            :coins="coinsToBuy"
            kind="coins"
            :disabled="!canBuy || !offer || !withdrawalConsent"
            :hide-actions="ordered || !profileLoaded || countryAsked"
            :loading="busy || placing"
            :worded="worded"
            :missing-key="missingKey"
            @order="onclickOrder"
          >
            <!-- Shown for an offer without its own summary, which states amount and price itself. -->
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
              <!--
                Without an offer the summary says what comes next: the choice
                of the country while the page asks for it. That the purchase is
                unavailable is only said once an offer was asked for and none
                came, or the profile itself stands in the way.
              -->
              <p v-else-if="countryAsked" role="status">
                {{ t("Body.CountryThenOffer", { button: t("Buttons.Continue") }) }}
              </p>
              <p v-else-if="offerPending" role="status">{{ t("Moderation.Loading") }}</p>
              <p v-else-if="profileLoaded" role="status">
                {{ t("Body.PurchaseOfferUnavailable") }}
              </p>
            </template>

            <!--
              Until the order button is pressed the buyer can go back to the amount or stop
              (AGB 11.1). On a phone both come after the order button, which stays in the
              first view.
            -->
            <template #actions>
              <Btn secondary class="order-last sm:order-none" @click="backToAmount">
                {{ t("Buttons.Back") }}
              </Btn>
              <Btn secondary class="order-last sm:order-none" @click="cancelOrder">
                {{ t("Buttons.Cancel") }}
              </Btn>
            </template>
          </OrderSummary>
        </article>

        <article v-if="ordered" class="mb-card">
          <h2 class="text-heading-2 mb-4 font-black text-heading">
            {{ t("Headings.PurchaseMorphcoins") }}
          </h2>
          <!--
            PayPal draws its buttons, its tagline and its card form for a light ground: on
            the dark page the card button and the tagline all but disappear. So the
            container is light, once PayPal has drawn into it.
          -->
          <div
            id="paypal-button-container"
            ref="paypal"
            class="w-full max-w-md rounded-md bg-white p-4 empty:bg-transparent empty:p-0"
          ></div>
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
    const worded = computed(() => !!offerWording(offer.value, locale.value));
    const missingKey = computed(() => consentMissingKey(offer.value));
    // The offer has been asked for and the answer is still on its way.
    const offerPending = ref(false);
    const placing = ref(false);
    let active = true;
    onBeforeUnmount(() => {
      active = false;
      invalidateAction();
    });
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
    const user = useUser();
    // The `user` cookie only carries the id and the two names. Until the
    // profile has arrived, a missing field says nothing about the account.
    // The request starts with the mounted page, so the offer below is requested once.
    const { profileLoaded, profileFailed, loadProfile } = useProfileLoad();

    const canBuy = computed(() => {
      if (!profileLoaded.value || !!!user.value) return false;
      // The server makes no offer before the email address is verified.
      if (user.value.email_verified === false) return false;
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

    // The invoice is German. These are the spellings most profiles already
    // have; any other country stays free text, as in the profile form.
    const COUNTRIES = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz" };
    const needsCountry = computed(
      () => profileLoaded.value && !!user.value && !user.value.business && !user.value.country
    );
    // The page asks for the country once nothing stands before it: an
    // unverified e-mail address comes first. The question, the note in the
    // order summary and the missing order button follow this one value, so
    // the summary never names a step the page does not offer.
    const countryAsked = computed(() => needsCountry.value && user.value?.email_verified !== false);
    const countryOptions = computed(() => {
      let names;
      try {
        names = new Intl.DisplayNames([locale.value], { type: "region" });
      } catch {
        // The stored German names are shown instead.
      }
      return Object.entries(COUNTRIES).map(([code, value]) => ({
        value,
        label: names?.of(code) ?? value,
      }));
    });
    function suggestedCountry(language) {
      let region = "";
      try {
        region = new Intl.Locale(language).region ?? "";
      } catch {
        // An unreadable language keeps the most common country.
      }
      return COUNTRIES[region] ?? COUNTRIES.DE;
    }
    // Preselected from the browser language, visible and changeable. The empty
    // choice stands for another country, typed into the field below.
    const countryChoice = ref(COUNTRIES.DE);
    const otherCountry = ref("");
    const countryAttempted = ref(false);
    const savingCountry = ref(false);
    const countryRules = [
      (v) => !!String(v).trim() || "Error.InputEmpty_Inputs.Country",
      (v) => String(v).trim().length <= 64 || "Error.InputMaxLength_64",
    ];
    onMounted(() => {
      countryChoice.value = suggestedCountry(navigator.language);
    });
    async function saveCountry() {
      // Only the loaded profile of a private buyer without a country is completed
      // here, and only while the page asks for it.
      if (!countryAsked.value) return;
      const country = (countryChoice.value || otherCountry.value).trim();
      countryAttempted.value = true;
      if (savingCountry.value || !country || country.length > 64) return;
      savingCountry.value = true;
      // The server sells coins to a private buyer with `business: false` and a country.
      const [saved, failure] = await editUser({ country, business: false });
      savingCountry.value = false;
      if (!saved) openSnackbar("error", failure || "Error.TryAgainLater");
    }

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
      offerPending.value = false;
      withdrawalConsent.value = false;
      if (!canBuy.value || !validAmount.value || checkout.value || ordered.value) return;
      offerPending.value = true;
      const result = await requestPurchaseOffer(`/shop/coins/paypal/offers/${coinsToBuy.value}`);
      if (active && generation === offerGeneration) {
        offer.value = result;
        offerPending.value = false;
      }
    }
    onMounted(refreshOffer);
    // Once the offer stands, the order summary is brought into the first screen (phone).
    // A web font that is still loading wraps the lines differently: a short summary can
    // seem to fit and then grow below the screen. So where it seemed to fit, it is looked
    // at once more when the fonts have loaded.
    const page = ref(null);
    const summaryCard = ref(null);
    watch(offer, async (value) => {
      if (!value) return;
      await nextTick();
      if (showOrderSummary(page.value, summaryCard.value)) return;
      await document.fonts?.ready;
      if (offer.value === value) showOrderSummary(page.value, summaryCard.value);
    });
    watch(
      () =>
        JSON.stringify([
          route.query.coins,
          profileLoaded.value,
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
    /**
     * Back to the amount page, which shows the amount of this order again. The way back to
     * Premium (`next`) goes along, so that "Weiter" there leads to Premium after the payment.
     */
    function backToAmount() {
      const coins = String(coinsToBuy.value);
      const query =
        route.query.next === "subscription" ? { coins, next: "subscription" } : { coins };
      return navigateTo({ path: "/morphcoins/buy", query });
    }
    /** Stops the order and leaves the purchase: back to Premium, where it began, or home. */
    function cancelOrder() {
      return navigateTo(route.query.next === "subscription" ? "/subscription" : "/dashboard");
    }

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
        openSnackbar("error", consentMissingKey(offer.value));
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
        ...purchaseAcceptance(acceptedOffer, locale.value),
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
      } catch (failure) {
        if (!current()) return;
        ordered.value = false;
        // A quote the server no longer takes (409, e.g. issued before a change of the offer
        // texts) is replaced by a new one; no payment was requested for it.
        if (failure?.status === 409 && (await discardStaleOffer(acceptedOffer))) {
          if (!active) return;
          openSnackbar("info", "Body.OfferRenewed");
          // The new quote comes into view as on a first load. Emptying the page moves its
          // own scroll area back to the top, while the window stays where the page scrolled
          // it for the old quote; the order summary only moves a window nobody scrolled.
          window.scrollTo({ top: 0, behavior: "instant" });
          await refreshOffer();
          return;
        }
        sdkError.value = true;
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
      showRecovery,
      sdkError,
      coinsToBuy,
      validAmount,
      user,
      profileLoaded,
      profileFailed,
      loadProfile,
      canBuy,
      needsCountry,
      countryAsked,
      countryOptions,
      countryChoice,
      otherCountry,
      countryAttempted,
      savingCountry,
      countryRules,
      saveCountry,
      paypal,
      page,
      summaryCard,
      ordered,
      busy,
      placing,
      withdrawalConsent,
      offer,
      offerPending,
      worded,
      missingKey,
      onclickOrder,
      backToAmount,
      cancelOrder,
    };
  },
};
</script>

<style scoped></style>
