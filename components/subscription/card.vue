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
        <div
          @click="
            hasEnoughCoins
              ? props.yearly
                ? subscribeYearly
                  ? subscribeYearly()
                  : null
                : subscribeMonthly
                  ? subscribeMonthly()
                  : null
              : null
          "
          role="button"
          :class="{
            'mb-8 flex cursor-pointer items-center justify-center space-x-4 rounded-full border border-white bg-white px-6 py-3 shadow-lg duration-200 hover:scale-105 active:scale-95':
              hasEnoughCoins,
            'flex cursor-default items-center justify-center space-x-4 rounded-full border border-tertiary px-6 py-3 duration-200':
              !hasEnoughCoins,
          }"
        >
          <p class="text-lg font-bold text-black">{{ yearly ? "10.000" : "1.000" }}</p>
          <img src="/images/coin.png" alt="coin" class="h-8 w-8 object-contain" />
        </div>
        <p v-if="!hasEnoughCoins" class="mt-2 text-center font-bold text-error">
          {{ t("Body.NotEnoughMorphcoins") }}
        </p>
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
