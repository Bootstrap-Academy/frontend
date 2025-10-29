<template>
  <div class="px-4 sm:container-fluid">
    <section v-if="!isPremium" class="mt-10 flex flex-col items-center gap-10">
      <h2 class="text-3xl font-bold tracking-tight text-accent sm:text-4xl">
        {{ t("Headings.RefillHearts") }}
      </h2>

      <p v-if="hearts >= 6" class="text-center text-xl">
        {{ t("Body.HeartsAreFilled") }}
      </p>

      <div v-else class="w-full md:flex md:space-x-8">
        <div class="ring-gray w-full rounded-xl p-8 text-center ring-1">
          <h2 class="mb-6 text-2xl font-bold tracking-tight text-accent">
            {{ t("Headings.AutomaticRefill") }}
          </h2>
          <SubscriptionTimer :target-time="getNextMidnight()" />
        </div>
        <div class="flex items-center uppercase max-md:my-4 max-md:justify-center">
          <p class="text-3xl">{{ t("Headings.Or") }}</p>
        </div>
        <div class="ring-gray w-full rounded-xl p-8 text-center ring-1">
          <h2 class="mb-6 text-2xl font-bold tracking-tight text-accent">
            {{ t("Headings.RefillHeartsNow") }}
          </h2>

          <div v-if="coins < 50" class="mt-4 flex justify-center">
            <p class="max-w-sm text-xl">
              {{ t("Body.Need50MorphCoinsForRefill") }}
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
        class="mb-5 mt-5 px-2"
      />

      <div class="mt-10 flex flex-col items-center" v-if="!!isPremium">
        <p class="font-bold text-accent">{{ t("Body.ChangeAutoPaySubscription") }}</p>

        <InputButtonToggle
          :mobileResponsive="false"
          secondary
          :buttonOptions="changeSubscriptionAutopayButtons"
          v-model="setValueForAutopayButton"
          class="mb-20 mt-4"
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

    function subscribe(isYearly: boolean) {
      console.log("Coins", coins.value);
      const plan = isYearly ? "YEARLY" : "MONTHLY";
      const coinsRequired = isYearly ? 10_000 : 1_000;

      if (coins.value >= coinsRequired) {
        openDialog(
          "info",
          isYearly ? "Headings.BuyYearlySubscription" : "Headings.BuyMonthlySubscription",
          isYearly ? "Body.BuyYearlySubscription" : "Body.BuyMonthlySubscription",
          false,
          {
            label: "Buttons.Buy",
            onclick: async () => {
              const [success] = await buyPremium({
                plan: plan,
                autopay: !!premiumStatusAutoPay.value,
              });
              if (success) {
                openSnackbar(
                  "success",
                  isYearly ? "Success.SubscribedYearly" : "Success.SubscribedMonthly"
                );
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

    const formatTime = (time: number) => {
      const hours = Math.floor(time / (1000 * 60 * 60));
      const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((time % (1000 * 60)) / 1000);
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

      function pad(number: number) {
        return (number < 10 ? "0" : "") + number;
      }
    };

    function getNextMidnight() {
      const now = new Date();
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);

      return nextDay.getTime();
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
      subscribe,
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
      getNextMidnight,
      filHearts,
      setValueForAutopayButton,
      autopay,
      premiumStatusAutoPay,
    };
  },
};
</script>

<style scoped></style>
