<template>
  <div class="px-4 sm:container-fluid">
    <section v-if="!isPremium" class="mt-10 flex flex-col items-center gap-10">
      <h2 class="text-3xl font-bold tracking-tight text-accent sm:text-4xl">
        {{ t("Headings.RefillHearts") }}
      </h2>

      <p v-if="hearts >= heartConfig.hearts_max" class="text-center text-xl">
        {{ t("Body.HeartsAreFilled") }}
      </p>

      <div v-else class="w-full md:flex md:space-x-8">
        <div class="ring-gray w-full rounded-xl p-8 text-center ring-1">
          <h2 class="mb-6 text-2xl font-bold tracking-tight text-accent">
            {{ t("Headings.AutomaticRefill") }}
          </h2>
          <SubscriptionTimer :target-time="nextRefill" />
          <p class="mt-4 text-sm">{{ t("Body.AutomaticRefillAtUtc") }}</p>
        </div>
        <div class="flex items-center uppercase max-md:my-4 max-md:justify-center">
          <p class="text-3xl">{{ t("Headings.Or") }}</p>
        </div>
        <div class="ring-gray w-full rounded-xl p-8 text-center ring-1">
          <h2 class="mb-6 text-2xl font-bold tracking-tight text-accent">
            {{ t("Headings.RefillHeartsNow") }}
          </h2>

          <div v-if="coins < refillPrice" class="mt-4 flex justify-center">
            <p class="max-w-sm text-xl">
              {{ t("Body.NeedCoinsForRefill", { coins: refillPrice }) }}
            </p>
          </div>
          <div v-else>
            <div class="flex justify-center" v-if="hearts != 0">
              <p class="mb-6 text-center text-xl text-warning">
                {{ t("Body.NotAllHeartsUsed") }}
                <br />
                {{ t("Body.RefillHeartsNow") }}
              </p>
            </div>
            <InputBtn @click="filHearts" :icon="SvgHeart" full iconRight secondary>
              {{ t("Buttons.Refill") }}
            </InputBtn>
          </div>
        </div>
      </div>
    </section>
    <hr v-if="!isPremium" class="mt-10" />

    <SubscriptionPremiumUntillCountDown v-if="!!isPremium" class="mt-20" />

    <section class="mb-20 mt-10 rounded-md">
      <div class="mx-auto max-w-2xl sm:text-center" v-if="!isPremium">
        <h2 class="text-3xl font-bold tracking-tight text-accent sm:text-4xl">
          {{ t("Headings.NoTrickPricing") }}
        </h2>
        <p class="text-gray mt-2 text-lg leading-8">
          {{ t("Body.PremiumCardMain") }}
        </p>
      </div>

      <div class="flex-end mb-3 mt-16 flex items-center justify-center gap-2">
        <InputButtonToggle
          :mobileResponsive="false"
          :buttonOptions="buttonOptions"
          v-model="selectedButton"
          class="mb-3"
        />
      </div>

      <div class="flex justify-center">
        <p class="mt-3 max-w-md text-center text-accent" v-if="isPremium">
          {{ t("Headings.BuyAdditionalSubscription") }}
        </p>
      </div>
      <SubscriptionCard
        :subscribeMonthly="() => subscribe(false)"
        :subscribeYearly="() => subscribe(true)"
        :yearly="selectedButton === 1"
        :monthlyPrice="monthlyPrice"
        :yearlyPrice="yearlyPrice"
        :disabled="premiumBusy || !!order || !!renewalOrder"
        class="mb-5 mt-5 px-2"
      />

      <div class="mt-10 flex flex-col items-center" v-if="!!isPremium">
        <p v-if="premiumInfo?.renewal" class="mb-4 max-w-xl text-center" role="status">
          {{
            t(
              premiumInfo.renewal.confirmation_sent
                ? "Body.RenewalConfirmed"
                : "Body.RenewalPending",
              { coins: premiumInfo.renewal.monthly_price }
            )
          }}
        </p>
        <p id="premium-renewal-label" class="font-bold text-accent">
          {{ t("Body.ChangeAutoPaySubscription") }}
        </p>

        <div
          role="group"
          aria-labelledby="premium-renewal-label"
          :aria-busy="premiumBusy"
          class="mt-4 flex w-fit gap-3 rounded-full border border-light p-2"
        >
          <button
            v-for="button in changeSubscriptionAutopayButtons"
            :key="button.name"
            type="button"
            :aria-pressed="premiumStatusKnown && premiumStatusAutoPay === button.plan"
            :disabled="premiumBusy || !!order || !!renewalOrder"
            class="rounded-full px-4 py-2 text-xs font-semibold capitalize disabled:opacity-50 sm:px-6 sm:text-sm md:px-8"
            :class="
              premiumStatusKnown && premiumStatusAutoPay === button.plan
                ? 'bg-light text-black'
                : 'text-white'
            "
            @click="fnUpdatePremiumAutoPay(button.plan)"
          >
            {{ t(button.name) }}
          </button>
        </div>
      </div>

      <section
        v-if="renewalOrder"
        id="premium-renewal-order"
        class="mx-auto mt-8 max-w-2xl rounded-xl bg-secondary p-6"
      >
        <OrderSummary
          :coins="renewalOrder.monthly_price"
          :disabled="!renewalAccepted || !renewalWithdrawalConsent"
          :loading="premiumBusy"
          @order="confirmRenewal"
        >
          <template #characteristics>
            <p class="whitespace-pre-line">{{ renewalOrder.text }}</p>
          </template>
          <template #consent>
            <InputCheckbox
              id="RenewalAgreementAccepted"
              label="Body.RenewalAgreementAccepted"
              v-model="renewalAccepted"
            />
            <OrderWithdrawalConsent
              :key="renewalOrder.id"
              kind="service"
              v-model="renewalWithdrawalConsent"
            />
          </template>
          <template #actions>
            <Btn secondary :disabled="premiumBusy" @click="renewalOrder = null">{{
              t("Buttons.Cancel")
            }}</Btn>
          </template>
        </OrderSummary>
      </section>

      <div v-if="!premiumStatusKnown && !premiumBusy" class="mt-4 text-center" role="alert">
        <p class="text-error">{{ t("Error.PremiumStatusUnavailable") }}</p>
        <Btn secondary class="mx-auto mt-3" @click="refreshPremiumStatus">
          {{ t("Buttons.TryAgain") }}
        </Btn>
      </div>
    </section>

    <!--
      Every coin purchase is an order, so the order summary required by
      § 312j Abs. 2 BGB and the statutory order button are shown before the
      coins are debited.
    -->
    <Modal
      v-if="order"
      :aria-label="t('Headings.OrderSummary')"
      @backdrop="!ordering && (order = null)"
    >
      <div class="w-full max-w-2xl bg-secondary p-4 style-card sm:p-8">
        <OrderSummary
          exact-offer
          :coins="order.coins"
          :kind="order.kind"
          :loading="ordering"
          :disabled="!withdrawalConsent"
          @order="confirmOrder"
        >
          <template #characteristics>
            <p class="text-body-1 m-0 text-body">{{ t(order.characteristics, order.params) }}</p>

            <dl
              v-if="order.details.length"
              class="grid grid-cols-1 gap-y-1 gap-x-card sm:grid-cols-[auto_minmax(0,1fr)]"
            >
              <template v-for="detail of order.details" :key="detail.label">
                <dt class="text-body-1 m-0 text-body">{{ t(detail.label) }}</dt>
                <dd class="text-body-1 m-0 text-heading">
                  {{ t(detail.value, detail.params ?? {}) }}
                </dd>
              </template>
            </dl>
          </template>

          <template #consent>
            <OrderContract :key="order.offer.id" :offer="order.offer" v-model="withdrawalConsent" />
          </template>

          <template #actions>
            <Btn secondary :disabled="ordering" @click="order = null">{{
              t("Buttons.Cancel")
            }}</Btn>
          </template>
        </OrderSummary>
      </div>
    </Modal>
  </div>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { useCoins } from "~~/composables/coins";
import { HeartIcon } from "@heroicons/vue/24/solid";
import SvgHeart from "../../components/svg/Heart.vue";

export default {
  setup() {
    const { t, locale } = useI18n();
    const coins = useCoins();
    const selectedButton = ref(0);
    const currentCard = ref(1);
    const heartInfo: any = useHeartInfo();
    const premiumInfo: any = usePremiumInfo();
    const premiumStatusKnown = usePremiumStatusKnown();
    const premiumPlans = usePremiumPlans();
    const heartConfig = useHeartConfig();
    const premiumBusy = ref(false);
    const renewalOrder = ref<any>(null);
    const renewalAccepted = ref(false);
    const renewalWithdrawalConsent = ref(false);

    function renewalKey(status: any) {
      return JSON.stringify([
        status.autopay,
        status.renewal?.id,
        status.renewal?.monthly_price,
        status.renewal?.confirmation_sent,
      ]);
    }
    function renewalDescription(status: any) {
      if (!status.autopay) return { value: "Body.AutomaticRenewalOff" };
      if (!status.renewal) return { value: "Body.RenewalUnsupported" };
      return {
        value: status.renewal.confirmation_sent ? "Body.RenewalConfirmed" : "Body.RenewalPending",
        params: { coins: status.renewal.monthly_price },
      };
    }

    onMounted(async () => {
      await Promise.all([
        loadCoinConfig(),
        loadHeartConfig(),
        getPremiumPlans(),
        refreshPremiumStatus(),
      ]);
    });

    const monthlyPrice = computed(() => premiumPlanPrice(premiumPlans.value, "MONTHLY"));
    const yearlyPrice = computed(() => premiumPlanPrice(premiumPlans.value, "YEARLY"));
    const refillPrice = computed(() => heartConfig.value.hearts_refill_price);

    const isPremium = computed(() => {
      return premiumInfo.value?.premium;
    });

    const premiumStatusAutoPay = computed(() => {
      return premiumInfo.value?.autopay ?? null;
    });

    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });

    const buttonOptions = [{ name: "Buttons.Monthly" }, { name: "Buttons.Yearly" }];

    const changeSubscriptionAutopayButtons = [
      { name: "Buttons.Monthly", plan: "MONTHLY" },
      { name: "Buttons.TurnOff", plan: null },
    ];

    // The pending order shown in the order summary, or `null`.
    const order = ref<any>(null);
    const ordering = ref(false);
    let orderOpener: HTMLElement | null = null;
    watch(order, async (value, previous) => {
      if (value || !previous) return;
      // Premium disables its opener during checkout. Restore focus only after
      // Vue has enabled it again and the modal has released its focus trap.
      await nextTick();
      if (orderOpener?.isConnected) orderOpener.focus({ preventScroll: true });
    });
    // The declarations of § 356 Abs. 5/6 BGB for the pending order.
    const withdrawalConsent = ref(false);

    async function refreshPremiumStatus() {
      if (premiumBusy.value) return null;
      premiumBusy.value = true;
      try {
        const [status, error] = await getPremiumStatus();
        if (error || !status) {
          openSnackbar("error", "Error.PremiumStatusUnavailable");
          return null;
        }
        return status;
      } finally {
        premiumBusy.value = false;
      }
    }

    async function subscribe(isYearly: boolean) {
      if (premiumBusy.value || order.value || renewalOrder.value) return;
      orderOpener = document.activeElement as HTMLElement | null;

      const status = await refreshPremiumStatus();
      if (!status) return;

      const offer = await requestPurchaseOffer(
        `/shop/purchases/offers/${isYearly ? "premium_yearly" : "premium_monthly"}`
      );
      if (!offer) return;
      if (coins.value < offer.product.coins) {
        openSnackbar("error", "Error.NotEnoughCoins");
        return;
      }
      withdrawalConsent.value = false;
      order.value = {
        offer,
        coins: offer.product.coins,
        kind: "premium",
        autopay: status.autopay,
        renewalKey: renewalKey(status),
        // Premium is a service (part A of the withdrawal instruction).
        consentKind: "service",
        characteristics: "Body.OrderPremiumCharacteristics",
        params: {},
        details: [
          {
            label: "Headings.ContractTerm",
            value:
              offer.product.kind === "premium_yearly"
                ? "Body.PremiumTermYearly"
                : "Body.PremiumTermMonthly",
          },
          {
            label: "Headings.AutomaticRenewal",
            ...renewalDescription(status),
          },
        ],
        submit: async () => {
          return acceptPurchase(offer);
        },
      };
    }

    async function confirmOrder() {
      if (!order.value || ordering.value) return;
      if (!withdrawalConsent.value) {
        openSnackbar("error", "Error.WithdrawalConsentMissing");
        return;
      }

      ordering.value = true;
      try {
        if (order.value.kind === "premium") {
          const status = await refreshPremiumStatus();
          if (!status) return;
          // Another tab or the public cancellation flow may have changed renewal.
          // Show the new state and require a fresh confirmation before purchase.
          if (renewalKey(status) !== order.value.renewalKey) {
            order.value.autopay = status.autopay;
            order.value.renewalKey = renewalKey(status);
            Object.assign(order.value.details[1], renewalDescription(status));
            withdrawalConsent.value = false;
            openSnackbar("info", "Error.PremiumRenewalChanged");
            return;
          }
        }
        if (await order.value.submit()) {
          order.value = null;
          withdrawalConsent.value = false;
        }
      } finally {
        ordering.value = false;
      }
    }

    async function filHearts() {
      if (hearts.value >= heartConfig.value.hearts_max) {
        return openSnackbar("info", "Error.AlreadyHaveHearts");
      } else if (coins.value < refillPrice.value) {
        return openSnackbar("error", "Error.NeedCoinsForRefill", "", false, {
          coins: refillPrice.value,
        });
      }

      orderOpener = document.activeElement as HTMLElement | null;
      const offer = await requestPurchaseOffer("/shop/purchases/offers/hearts");
      if (!offer) return;
      withdrawalConsent.value = false;
      order.value = {
        offer,
        coins: offer.product.coins,
        kind: "",
        // Hearts are digital content (part B of the withdrawal instruction).
        consentKind: "digital",
        characteristics: "Body.OrderHeartsCharacteristics",
        params: { max: formatHearts(heartConfig.value.hearts_max, locale.value) },
        details: [],
        submit: async () => {
          return acceptPurchase(offer);
        },
      };
    }

    const formatTime = (time: number) => {
      const hours = Math.floor(time / (1000 * 60 * 60));
      const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((time % (1000 * 60)) / 1000);
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

      function pad(number: number) {
        return (number < 10 ? "0" : "") + number;
      }
    };

    // The backend refills at 00:00 UTC, which is not the visitor's midnight.
    const nextRefill = computed(() => nextHeartRefill());

    async function fnUpdatePremiumAutoPay(value: any) {
      if (premiumBusy.value || order.value || renewalOrder.value) return;
      premiumBusy.value = true;
      try {
        if (value === "MONTHLY") {
          // Preparing an offer never enables renewal. Every declaration gets a
          // request id which survives uncertain response retries in this form.
          const offer = await GET("/shop/premium/renewal-offer");
          if (!offer?.id || !offer?.text || !(offer.monthly_price > 0))
            throw new Error("Invalid renewal offer");
          renewalAccepted.value = false;
          renewalWithdrawalConsent.value = false;
          renewalOrder.value = { ...offer, request_id: crypto.randomUUID() };
          return;
        }
        const [status, error] = await updatePremiumAutoPay({ plan: null });
        if (error || !status || status.autopay !== null) {
          openSnackbar("error", "Error.AutopayUpdateFailed");
        } else {
          openSnackbar("success", "Success.AutopayUpdated");
        }
      } catch {
        openSnackbar("error", "Error.AutopayUpdateFailed");
      } finally {
        premiumBusy.value = false;
      }
    }

    async function confirmRenewal() {
      if (
        !renewalOrder.value ||
        premiumBusy.value ||
        !renewalAccepted.value ||
        !renewalWithdrawalConsent.value
      )
        return;
      premiumBusy.value = true;
      try {
        const current = await GET("/shop/premium/renewal-offer");
        if (current?.id !== renewalOrder.value.id) {
          renewalOrder.value = null;
          openSnackbar("error", "Error.RenewalOfferChanged");
          return;
        }
        const [status, error] = await updatePremiumAutoPay({
          plan: "MONTHLY",
          consent: {
            request_id: renewalOrder.value.request_id,
            offer_id: renewalOrder.value.id,
            accepted: renewalAccepted.value,
            withdrawal_consent: renewalWithdrawalConsent.value,
          },
        });
        if (error || !status || status.renewal?.id !== renewalOrder.value.request_id) {
          openSnackbar("error", "Error.AutopayUpdateFailed");
          return;
        }
        renewalOrder.value = null;
        openSnackbar("success", "Success.AutopayUpdated");
      } catch {
        openSnackbar("error", "Error.AutopayUpdateFailed");
      } finally {
        premiumBusy.value = false;
      }
    }

    watch(
      () => selectedButton.value,

      (newValue, oldValue) => {
        if (newValue == 1) {
          currentCard.value = 0;
        } else {
          currentCard.value = 1;
        }
      }
    );

    return {
      t,
      premiumInfo,
      renewalOrder,
      renewalAccepted,
      renewalWithdrawalConsent,
      confirmRenewal,
      subscribe,
      heartConfig,
      order,
      ordering,
      withdrawalConsent,
      confirmOrder,
      monthlyPrice,
      yearlyPrice,
      refillPrice,
      currentCard,
      selectedButton,
      buttonOptions,
      isPremium,
      SvgHeart,
      HeartIcon,
      changeSubscriptionAutopayButtons,
      hearts,
      heartInfo,
      coins,
      formatTime,
      nextRefill,
      filHearts,
      fnUpdatePremiumAutoPay,
      refreshPremiumStatus,
      premiumStatusKnown,
      premiumBusy,
      premiumStatusAutoPay,
    };
  },
};
</script>

<style scoped></style>
