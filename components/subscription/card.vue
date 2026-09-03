<template>
  <div class="flex justify-center">
    <div class="max-md:space-y-8 md:flex md:max-w-4xl md:space-x-8">
      <div
        class="m-3 w-full rounded-xl border border-accent p-8 shadow-xl md:w-1/2"
        v-if="!isPremium"
      >
        <div class="mb-4 flex justify-center">
          <BookOpenIcon class="h-16 w-16 flex-none text-accent" aria-hidden="true" />
        </div>
        <h1 class="mb-2 text-center text-3xl font-bold">{{ t("Headings.Free") }}</h1>
        <p class="mb-8 text-center">{{ t("Body.LearnNewSkillsForFree") }}</p>
        <div
          class="mb-8 flex items-center justify-center space-x-4 rounded-full border border-tertiary px-6 py-3"
        >
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p class="text-lg font-bold">{{ t("Body.CurrentPlan") }}</p>
        </div>
        <div class="mt-4 flex items-center space-x-4">
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p>{{ t("Body.ThreeHeartsEveryDay") }}</p>
          <Tooltip :heading="'Body.UnlimitedHeartsTooltip'">
            <InformationCircleIcon class="h-6 w-6 text-accent" />
          </Tooltip>
        </div>
        <div class="mt-4 flex items-center space-x-4">
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p>{{ t("Body.LimitedAccessToCourses") }}</p>
          <Tooltip :heading="'Body.LimitedAccessToCoursesTooltip'">
            <InformationCircleIcon class="h-6 w-6 text-accent" />
          </Tooltip>
        </div>
        <div class="mt-4 flex items-center space-x-4">
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p>{{ t("Body.LearnNewThings") }}</p>
        </div>
      </div>

      <div
        class="m-3 w-full rounded-xl bg-accent p-8 text-black shadow-xl"
        :class="{ 'md:w-1/2': !isPremium }"
      >
        <div class="mb-4 flex justify-center">
          <RocketLaunchIcon class="h-16 w-16 flex-none text-black" aria-hidden="true" />
        </div>
        <h1 class="mb-2 text-center text-3xl font-bold text-black">{{ t("Headings.Premium") }}</h1>
        <p class="mb-8 text-center text-black">
          {{
            t("Body.GetAllServices").replace(
              "%%%",
              props.yearly ? t("Body.Yearly") : t("Body.Monthly")
            )
          }}
        </p>
        <div class="mb-8">
          <button
            type="button"
            :disabled="!hasEnoughCoins"
            @click="onclickSubscribe"
            :class="{
              'flex w-full cursor-pointer items-center justify-center space-x-4 rounded-full border border-white bg-white px-6 py-3 shadow-lg duration-200 hover:scale-105 active:scale-95':
                hasEnoughCoins,
              'flex w-full cursor-default items-center justify-center space-x-4 rounded-full border border-tertiary px-6 py-3 duration-200':
                !hasEnoughCoins,
            }"
          >
            <img src="/images/coin.png" alt="" class="h-8 w-8 flex-none object-contain" />
            <Price :coins="planPrice" class="justify-center font-bold text-black" />
          </button>
          <p v-if="!hasEnoughCoins" class="mt-2 text-center font-bold text-error">
            {{ t("Body.NotEnoughMorphcoins") }}
          </p>
          <p v-else-if="yearly" class="mt-2 text-center text-black">
            {{ t("Body.PricePerMonth", { amount: pricePerMonth }) }}
          </p>
        </div>
        <div class="mt-4 flex items-center space-x-4">
          <CheckIcon class="h-6 w-5 flex-none text-black" aria-hidden="true" />
          <p class="text-black">{{ t("Body.UnlimitedHearts") }}</p>
        </div>
        <div class="mt-4 flex items-center space-x-4">
          <CheckIcon class="h-6 w-5 flex-none text-black" aria-hidden="true" />
          <p class="text-black">{{ t("Body.AccessToAllCourses") }}</p>
        </div>
        <div class="mt-4 flex items-center space-x-4">
          <CheckIcon class="h-6 w-5 flex-none text-black" aria-hidden="true" />
          <p class="text-black">{{ t("Body.LearnNewThings") }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  subscribeMonthly: Function,
  subscribeYearly: Function,
  yearly: { type: Boolean, default: false },
  monthlyPrice: { type: Number, default: PREMIUM_PRICE_FALLBACK.MONTHLY },
  yearlyPrice: { type: Number, default: PREMIUM_PRICE_FALLBACK.YEARLY },
});

import { CheckIcon } from "@heroicons/vue/20/solid";
import { BookOpenIcon, InformationCircleIcon, RocketLaunchIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
import { useCoins } from "../../composables/coins";
const { t, locale } = useI18n();
const premiumInfo: any = usePremiumInfo();
const coinConfig = useCoinConfig();

const isPremium = computed(() => {
  return premiumInfo.value?.premium;
});

const coins = useCoins();
const planPrice = computed(() => (props.yearly ? props.yearlyPrice : props.monthlyPrice));
const hasEnoughCoins = computed(() => coins.value >= planPrice.value);

// Art. 246a § 1 Abs. 1 Nr. 8 EGBGB: the monthly cost of a yearly plan.
const pricePerMonth = computed(() =>
  formatEuros(coinsToEuros(props.yearlyPrice, coinConfig.value) / 12, locale.value)
);

function onclickSubscribe() {
  if (!hasEnoughCoins.value) return;
  if (props.yearly) props.subscribeYearly?.();
  else props.subscribeMonthly?.();
}
</script>
