<template>
  <div class="flex justify-center">
    <div class="md:flex md:space-x-8 max-md:space-y-8 md:max-w-4xl">


      <div class="w-full border border-accent rounded-xl p-8 m-3 shadow-xl md:w-1/2" v-if="!isPremium">
        <div class="flex justify-center mb-4">
          <BookOpenIcon class="h-16 w-16 flex-none text-accent" aria-hidden="true" />
        </div>
        <h1 class="font-bold text-3xl mb-2 text-center">{{ t("Headings.Free") }}</h1>
        <p class="mb-8 text-center">{{ t("Body.LearnNewSkillsForFree") }}</p>
        <div class="flex items-center justify-center space-x-4 border border-tertiary rounded-full px-6 py-3 mb-8">
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p class="text-lg font-bold">{{ t("Body.CurrentPlan") }}</p>
        </div>
        <div class="flex space-x-4 items-center mt-4">
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p>{{ t("Body.ThreeHeartsEveryDay") }}</p>
          <Tooltip :heading="'Body.UnlimitedHeartsTooltip'">
            <InformationCircleIcon class="h-6 w-6 text-accent" />
          </Tooltip>
        </div>
        <div class="flex space-x-4 items-center mt-4">
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p>{{ t("Body.LimitedAccessToCourses") }}</p>
          <Tooltip :heading="'Body.LimitedAccessToCoursesTooltip'">
            <InformationCircleIcon class="h-6 w-6 text-accent" />
          </Tooltip>
        </div>
        <div class="flex space-x-4 items-center mt-4">
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p>{{ t("Body.LearnNewThings") }}</p>
        </div>
      </div>


      <div class="w-full bg-accent text-black rounded-xl p-8 m-3 shadow-xl" :class="{ 'md:w-1/2': !isPremium }">
        <div class="flex justify-center mb-4">
          <RocketLaunchIcon class="h-16 w-16 flex-none text-black" aria-hidden="true" />
        </div>
        <h1 class="font-bold text-3xl text-black mb-2 text-center">{{ t("Headings.Premium") }}</h1>
        <p class="text-black mb-8 text-center">
          {{ t("Body.GetAllServices").replace("%%%", props.yearly ? t("Body.Yearly") : t("Body.Monthly")) }}
        </p>
        <div @click="hasEnoughCoins ?
          props.yearly ? subscribeYearly ? subscribeYearly() : null : subscribeMonthly ? subscribeMonthly() : null : null
          " role="button" :class="{
            'flex items-center justify-center space-x-4 border border-white duration-200 bg-white shadow-lg rounded-full px-6 py-3 mb-8 active:scale-95 cursor-pointer hover:scale-105': hasEnoughCoins,
            'flex items-center justify-center space-x-4 border border-tertiary duration-200 rounded-full px-6 py-3 cursor-default': !hasEnoughCoins
          }">
          <p class="text-lg font-bold text-black">{{ yearly ? "10.000" : "1.000" }}</p>
          <img src="/images/coin.png" alt="coin" class="object-contain w-8 h-8" />
        </div>
        <p v-if="!hasEnoughCoins" class="text-center text-error font-bold mt-2">
          {{ t("Body.NotEnoughMorphcoins") }}
        </p>
        <div class="flex space-x-4 items-center mt-4">
          <CheckIcon class="h-6 w-5 flex-none text-black" aria-hidden="true" />
          <p class="text-black">{{ t("Body.UnlimitedHearts") }}</p>
        </div>
        <div class="flex space-x-4 items-center mt-4">
          <CheckIcon class="h-6 w-5 flex-none text-black" aria-hidden="true" />
          <p class="text-black">{{ t("Body.AccessToAllCourses") }}</p>
        </div>
        <div class="flex space-x-4 items-center mt-4">
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
});

import { CheckIcon } from "@heroicons/vue/20/solid";
import { BookOpenIcon, InformationCircleIcon, RocketLaunchIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
import { useCoins } from "../../composables/coins";
const { t } = useI18n();
const premiumInfo: any = usePremiumInfo();

const isPremium = computed(() => {
  return premiumInfo.value?.premium;
});

const coins = useCoins();
const hasEnoughCoins = computed(() => {
  return props.yearly ? coins.value >= 10_000 : coins.value >= 1_000;
});
</script>