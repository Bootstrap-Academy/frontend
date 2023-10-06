<template>
  <div class="sm:container-fluid px-4">
    <section v-if="!isPremium" class="flex flex-col items-center mt-10 gap-10">
      <h2 class="text-3xl font-bold tracking-tight text-accent sm:text-4xl">
        {{ t("Headings.RefillHearts") }}
        <!-- {{ premiumStatusAutoPay }} -->
      </h2>
      <div class="max-w-xs">
        <InputBtn
          @click="filHearts"
          :icon="SvgHeart"
          full
          iconRight
          secondary
          >{{ t("Buttons.Refill") }}</InputBtn
        >
      </div>
    </section>
    <hr v-if="!isPremium" class="mt-10" />

    <SubscriptionPremiumUntillCountDown v-if="!!isPremium" class="mt-20" />

    <section class="rounded-md mb-20 mt-10">
      <div class="mx-auto max-w-2xl sm:text-center">
        <h2 class="text-3xl font-bold tracking-tight text-accent sm:text-4xl">
          {{ t("Headings.NoTrickPricing") }}
        </h2>
        <p class="mt-2 text-lg leading-8 text-gray">
          {{ t("Body.PremiumCardMain") }}
        </p>
      </div>

      <div class="flex flex-end gap-2 justify-center items-center mb-3 mt-16">
        <InputButtonToggle
          :mobileResponsive="false"
          :buttonOptions="buttonOptions"
          v-model="selectedButton"
          class="mb-3"
        />
      </div>

      <div class="flex justify-end mr-10 mb-2 mt-10 gap-3" v-if="!isPremium">
        <p>{{ t("Body.AutoPay") }}</p>
        <InputSwitch v-model="autopay" />
      </div>

      <p class="text-accent mt-3 text-center" v-if="isPremium">
        {{ t("Headings.ButAdditionalSubscription") }}
      </p>
      <SubscriptionCard :card="cards[currentCard]" class="px-2 mt-5 mb-5" />

      <div class="mt-10" v-if="!!isPremium">
        <p>{{ t("Body.ChangeAutoPaySubscription") }}</p>

        <InputButtonToggle
          :mobileResponsive="false"
          secondary
          :buttonOptions="changeSubscriptionAutopayButtons"
          v-model="setValueForAutopayButton"
          class="my-5 mb-20"
        />
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { useCoins } from "~~/composables/coins";
import { HeartIcon } from "@heroicons/vue/24/solid";
import SvgHeart from "../../components/svg/Heart.vue";
export default {
  setup() {
    const { t } = useI18n();
    const coins = useCoins();
    const selectedButton = ref(0);
    const currentCard = ref(1);
    const heartInfo: any = useHeartInfo();
    const premiumInfo: any = usePremiumInfo();
    const autopay = ref(false);

    const cards = [
      {
        heading: "Headings.YearlyPremiumCardHeading",
        body: "Body.YearlyPremiumCardBody",
        featuresHeading: "Headings.WhatsIncluded",
        features: [
          "Headings.ExtraTwoMonths",
          "Headings.Save2000Coins",
          "Headings.UnlimitedChallenges",
          "Headings.UnlimitedQuizzes",
          "Headings.AccessAllCourses",
          "Headings.OneYearNoLimitations",
        ],
        buttonLabel: "Buttons.GoYearly",
        Quote: "Headings.PayOnceOwnItYearly",
        price: "Headings.TenThousand",
        subscribe: () => {
          subscribeYearly();
        },
      },
      {
        heading: "Headings.MonthlyPremiumCardHeading",
        body: "Body.MonthlyPremiumCardBody",
        featuresHeading: "Headings.WhatsIncluded",
        features: [
          "Headings.UnlimitedChallenges",
          "Headings.UnlimitedQuizzes",
          "Headings.AccessAllCourses",
          "Headings.OneMonthNoLimitations",
        ],
        buttonLabel: "Buttons.GoMonthly",
        Quote: "Headings.PayOnceOwnItMonthly",
        price: "Headings.Thousand",
        subscribe: () => {
          subscribeMonthly();
        },
      },
    ];

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
        } else if (
          premiumStatusAutoPay.value == null ||
          !!!premiumStatusAutoPay.value
        ) {
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

    const buttonOptions = [
      { name: "Buttons.Monthly" },
      { name: "Buttons.Yearly" },
    ];
    const changeSubscriptionAutopayButtons = [
      { name: "Buttons.Monthly" },
      { name: "Buttons.Yearly" },
      { name: "Buttons.TurnOff" },
    ];

    function subscribeMonthly() {
      console.log("Coins", coins.value);
      if (coins.value >= 1_000) {
        openDialog(
          "info",
          "Headings.BuyMonthlySubscription",
          "Body.BuyMonthlySubscription",
          false,
          {
            label: "Buttons.Buy",
            onclick: async () => {
              const [success, error] = await buyPremium({
                plan: "MONTHLY",
                autopay: !!premiumStatusAutoPay.value,
              });
              if (success) {
                openSnackbar("success", "Success.SubscribedMonthly");
              }
            },
          },
          {
            label: "Buttons.Cancel",
            onclick: () => {},
          }
        );
      } else {
        openSnackbar("error", "Error.NotEnoughCoins");
      }
    }

    function subscribeYearly() {
      console.log("Coins", coins.value);
      if (coins.value >= 10_000) {
        openDialog(
          "info",
          "Headings.BuyYearlySubscription",
          "Body.BuyYearlySubscription",
          false,
          {
            label: "Buttons.Buy",
            onclick: async () => {
              const [success, error] = await buyPremium({
                plan: "YEARLY",
                autopay: !!premiumStatusAutoPay.value,
              });
              if (success) {
                openSnackbar("success", "Success.SubscribedYearly");
              }
            },
          },
          {
            label: "Buttons.Cancel",
            onclick: () => {},
          }
        );
      } else {
        openSnackbar("error", "Error.NotEnoughCoins");
      }
    }

    async function filHearts() {
      // if (hearts.value >= 6) return openSnackbar("info", "Error.AlreadyHaveHearts");
      // else if (hearts.value == 5 && coins.value < 15)
      //   return openSnackbar("error", "Error.Need15CoinsForRefill");
      // else if (hearts.value == 4 && coins.value < 20)
      //   return openSnackbar("error", "Error.Need20CoinsForRefill");
      // else if (hearts.value == 3 && coins.value < 30)
      //   return openSnackbar("error", "Error.Need30CoinsForRefill");
      // else if (hearts.value == 2 && coins.value < 35)
      //   return openSnackbar("error", "Error.Need35CoinsForRefill");
      // else if (hearts.value == 1 && coins.value < 45)
      //   return openSnackbar("error", "Error.Need45CoinsForRefill");
      // else if (hearts.value == 0 && coins.value < 50)
      //   return openSnackbar("error", "Error.Need50CoinsForRefill");
      // else if (hearts.value < 6 && coins.value > 0) {
      //   return openDialog(
      //     "info",
      //     `Headings.RefillHearts`,
      //     hearts.value == 0
      //       ? "Body.Refill3Hearts"
      //       : "" || hearts.value == 1
      //       ? "Body.Refill2p5Hearts"
      //       : "" || hearts.value == 2
      //       ? "Body.Refill2Hearts"
      //       : "" || hearts.value == 3
      //       ? "Body.Refill1p5Hearts"
      //       : "" || hearts.value == 4
      //       ? "Body.Refill1Hearts"
      //       : "" || hearts.value == 5
      //       ? "Body.Refill0p5Hearts"
      //       : "",
      //     false,
      //     {
      //       label: "Buttons.Refill",
      //       onclick: async () => {
      //         await refillHearts();
      //       },
      //     },
      //     {
      //       label: "Buttons.Cancel",
      //       onclick: () => {},
      //     }
      //   );
      // }

      if (hearts.value >= 6) {
        return openSnackbar("info", "Error.AlreadyHaveHearts");
      } else if (coins.value < 50) {
        return openSnackbar("error", "Error.Need50CoinsForRefill");
      }
      return openDialog(
        "info",
        `Headings.RefillHearts`,
        "Body.RefillHearts",
        false,
        {
          label: "Buttons.Refill",
          onclick: async () => {
            const [success, error] = await refillHearts();
            if (success) openSnackbar("success", "Success.RefilledHearts");
          },
        },
        {
          label: "Buttons.Cancel",
          onclick: () => {},
        }
      );
    }

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
      cards,
      currentCard,
      selectedButton,
      buttonOptions,
      isPremium,
      SvgHeart,
      HeartIcon,
      changeSubscriptionAutopayButtons,
      hearts,
      filHearts,
      setValueForAutopayButton,
      autopay,
      premiumStatusAutoPay,
    };
  },
};
</script>

<style scoped></style>
