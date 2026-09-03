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
        class="mb-5 mt-5 px-2"
      />

      <div class="mt-10 flex flex-col items-center" v-if="!!isPremium">
        <p class="font-bold text-accent">{{ t("Body.ChangeAutoPaySubscription") }}</p>

        <InputButtonToggle
          :mobileResponsive="false"
          secondary
          :buttonOptions="changeSubscriptionAutopayButtons"
          v-model="setValueForAutopayButton"
          class="mt-4"
        />
      </div>

      <!--
        Turning the automatic renewal off is not a cancellation. The statutory
        route under § 312k BGB, with the confirmation by e-mail, lives on its
        own page and stays reachable even while no period is currently active -
        which is exactly when the toggle above is unavailable.
      -->
      <div class="mb-20 mt-10 flex flex-col items-center">
        <NuxtLink to="/vertrag-kuendigen">
          <Btn class="!normal-case">{{ t("Buttons.CancelPremium") }}</Btn>
        </NuxtLink>
        <p class="mt-3 max-w-md text-center">{{ t("Body.CancelPremiumHint") }}</p>
      </div>
    </section>

    <!--
      Every coin purchase is an order, so the order summary required by
      § 312j Abs. 2 BGB and the statutory order button are shown before the
      coins are debited.
    -->
    <Modal v-if="order" @backdrop="order = null">
      <div class="w-full max-w-2xl bg-secondary p-8 style-card">
        <OrderSummary :coins="order.coins" :loading="ordering" @order="confirmOrder">
          <template #characteristics>
            <p class="text-body-1 m-0 text-body">{{ t(order.characteristics, order.params) }}</p>

            <dl
              v-if="order.details.length"
              class="grid grid-cols-[auto_minmax(0,1fr)] gap-y-1 gap-x-card"
            >
              <template v-for="detail of order.details" :key="detail.label">
                <dt class="text-body-1 m-0 text-body">{{ t(detail.label) }}</dt>
                <dd class="text-body-1 m-0 text-heading">{{ t(detail.value) }}</dd>
              </template>
            </dl>
          </template>

          <template #actions>
            <Btn secondary @click="order = null">{{ t("Buttons.Cancel") }}</Btn>
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
    const premiumPlans = usePremiumPlans();
    const heartConfig = useHeartConfig();
    const autopay = ref(false);

    onMounted(async () => {
      await Promise.all([loadCoinConfig(), loadHeartConfig(), getPremiumPlans()]);
    });

    const monthlyPrice = computed(() => premiumPlanPrice(premiumPlans.value, "MONTHLY"));
    const yearlyPrice = computed(() => premiumPlanPrice(premiumPlans.value, "YEARLY"));
    const refillPrice = computed(() => heartConfig.value.hearts_refill_price);

    const isPremium = computed(() => {
      return premiumInfo.value?.premium;
    });

    const premiumStatusAutoPay = computed(() => {
      return premiumInfo.value?.autopay ?? "";
    });

    const setValueForAutopayButton = computed({
      get() {
        if (premiumStatusAutoPay.value == "MONTHLY") {
          return 0;
        } else if (premiumStatusAutoPay.value == "YEARLY") {
          return 1;
        } else if (premiumStatusAutoPay.value == null || !!!premiumStatusAutoPay.value) {
          return 2;
        }
      },

      async set(value: any) {
        console.log("setting", value);
        if (value == 0) {
          fnUpdatePremiumAutoPay("MONTHLY");
        } else if (value == 1) {
          fnUpdatePremiumAutoPay("YEARLY");
        } else if (value == 2) {
          fnUpdatePremiumAutoPay(null);
        }
      },
    });

    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });

    const buttonOptions = [{ name: "Buttons.Monthly" }, { name: "Buttons.Yearly" }];

    const changeSubscriptionAutopayButtons = [
      { name: "Buttons.Monthly" },
      { name: "Buttons.Yearly" },
      { name: "Buttons.TurnOff" },
    ];

    // The pending order shown in the order summary, or `null`.
    const order = ref<any>(null);
    const ordering = ref(false);

    function subscribe(isYearly: boolean) {
      const plan = isYearly ? "YEARLY" : "MONTHLY";
      const coinsRequired = isYearly ? yearlyPrice.value : monthlyPrice.value;

      if (coins.value < coinsRequired) {
        openSnackbar("error", "Error.NotEnoughCoins");
        return;
      }

      // The renewal is only booked along if the account already has autopay
      // configured; a first purchase never enables it.
      const renews = !!premiumStatusAutoPay.value;

      order.value = {
        coins: coinsRequired,
        characteristics: "Body.OrderPremiumCharacteristics",
        params: {},
        details: [
          {
            label: "Headings.ContractTerm",
            value: isYearly ? "Body.PremiumTermYearly" : "Body.PremiumTermMonthly",
          },
          {
            label: "Headings.AutomaticRenewal",
            value: renews ? "Body.AutomaticRenewalOn" : "Body.AutomaticRenewalOff",
          },
        ],
        submit: async () => {
          const [success] = await buyPremium({ plan, autopay: renews });
          if (success) {
            openSnackbar(
              "success",
              isYearly ? "Success.SubscribedYearly" : "Success.SubscribedMonthly"
            );
          }
        },
      };
    }

    async function confirmOrder() {
      if (!order.value || ordering.value) return;

      ordering.value = true;
      try {
        await order.value.submit();
      } finally {
        ordering.value = false;
        order.value = null;
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

      order.value = {
        coins: refillPrice.value,
        characteristics: "Body.OrderHeartsCharacteristics",
        params: { max: formatHearts(heartConfig.value.hearts_max, locale.value) },
        details: [],
        submit: async () => {
          const [success] = await refillHearts();
          if (success) openSnackbar("success", "Success.RefilledHearts");
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
      setLoading(true);
      const [success, error] = await updatePremiumAutoPay({ plan: value });
      setLoading(false);
      if (success) openSnackbar("success", "Success.AutopayUpdated");
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
      subscribe,
      heartConfig,
      order,
      ordering,
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
      setValueForAutopayButton,
      autopay,
      premiumStatusAutoPay,
    };
  },
};
</script>

<style scoped></style>
