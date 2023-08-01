<template>
  <div class="sm:container-fluid">
    <section class="flex flex-col items-center mt-10 gap-10">
      <h2 class="text-3xl font-bold tracking-tight text-accent sm:text-4xl">
        {{ t("Headings.RefillHearts") }}
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
    <hr class="my-10" />

    <section class="rounded-md">
      <div class="mx-auto max-w-2xl sm:text-center">
        <h2 class="text-3xl font-bold tracking-tight text-accent sm:text-4xl">
          {{ t("Headings.NoTrickPricing") }}
        </h2>
        <p class="mt-6 text-lg leading-8 text-gray">
          {{ t("Body.PremiumCardMain") }}
        </p>
      </div>

      <div class="flex flex-end gap-2 justify-center items-center mb-3 mt-10">
        <InputButtonToggle
          :buttonOptions="buttonOptions"
          v-model="selectedButton"
          class="mb-5"
        />
      </div>

      <SubscriptionCard :card="cards[currentCard]" />
    </section>
  </div>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { HeartIcon } from "@heroicons/vue/24/solid";
import SvgHeart from "../../components/svg/Heart.vue";
export default {
  setup() {
    const { t } = useI18n();
    const coins = useCoins();
    const selectedButton = ref(0);
    const currentCard = ref(1);
    const hearts = useHearts();

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

    const buttonOptions = [
      { name: "Buttons.Monthly" },
      { name: "Buttons.Yearly" },
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
            onclick: () => {},
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
            onclick: () => {},
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

    function filHearts() {
      if (hearts.value >= 3) openSnackbar("error", "Error.AlreadyHaveHearts");
      else if (hearts.value == 2.5 && coins.value < 15)
        openSnackbar("error", "Error.Need15CoinsForRefill");
      else if (hearts.value == 2 && coins.value < 20)
        openSnackbar("error", "Error.Need20CoinsForRefill");
      else if (hearts.value == 1.5 && coins.value < 30)
        openSnackbar("error", "Error.Need30CoinsForRefill");
      else if (hearts.value == 1 && coins.value < 35)
        openSnackbar("error", "Error.Need35CoinsForRefill");
      else if (hearts.value == 0.5 && coins.value < 45)
        openSnackbar("error", "Error.Need45CoinsForRefill");
      else if (hearts.value == 0 && coins.value < 50)
        openSnackbar("error", "Error.Need50CoinsForRefill");
      else if (hearts.value < 3 && coins.value > 0) {
        openDialog(
          "info",
          `Headings.RefillHearts`,
          hearts.value == 0
            ? "Body.Refill3Hearts"
            : "" || hearts.value == 0.5
            ? "Body.Refill2p5Hearts"
            : "" || hearts.value == 1
            ? "Body.Refill2Hearts"
            : "" || hearts.value == 1.5
            ? "Body.Refill1p5Hearts"
            : "" || hearts.value == 2
            ? "Body.Refill1Hearts"
            : "" || hearts.value == 2.5
            ? "Body.Refill0p5Hearts"
            : "",
          false,
          {
            label: "Buttons.Refill",
            onclick: () => {},
          },
          {
            label: "Buttons.Cancel",
            onclick: () => {},
          }
        );
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
      cards,
      currentCard,
      selectedButton,
      buttonOptions,
      SvgHeart,
      HeartIcon,
      hearts,
      filHearts,
    };
  },
};
</script>

<style scoped></style>
