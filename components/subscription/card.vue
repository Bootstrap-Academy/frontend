<template>
  <div class="flex justify-center">
    <div class="max-md:space-y-8 md:flex md:max-w-4xl md:space-x-8">
      <div
        class="my-3 w-full rounded-xl border border-accent p-8 shadow-xl md:w-1/2"
        v-if="!isPremium"
      >
        <div class="mb-4 flex justify-center">
          <BookOpenIcon class="h-16 w-16 flex-none text-accent" aria-hidden="true" />
        </div>
        <h1 class="mb-2 text-center text-3xl font-bold">{{ t("Headings.Free") }}</h1>
        <p class="mb-8 text-center">{{ t("Body.LearnNewSkillsForFree") }}</p>
        <!--
          A visitor without an account has no plan yet. Where an account sees its plan marked,
          the visitor finds the way to a free account, in the colours of the Premium card. The
          heading of the card already says that this plan costs nothing, so the link does not
          say it again.
        -->
        <NuxtLink
          v-if="guest"
          to="/auth/signup"
          data-guest-signup
          class="mb-8 flex items-center justify-center rounded-full bg-accent px-6 py-3 text-center text-lg font-bold text-black shadow-lg duration-200 hover:scale-105 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95"
        >
          {{ t("Links.CreateAccount") }}
        </NuxtLink>
        <div
          v-else
          class="mb-8 flex items-center justify-center space-x-4 rounded-full border border-tertiary px-6 py-3"
        >
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p class="text-lg font-bold">{{ t("Body.CurrentPlan") }}</p>
        </div>
        <div class="mt-4 flex items-center space-x-4">
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p>
            {{
              isDaily
                ? t("DailyLearning.FreePace", { n: daily?.limit ?? 3 })
                : t("Body.HeartsEveryDay", { n: dailyHearts })
            }}
          </p>
          <!--
            The hint names the time of the free refill unless the page already does:
            above the cards, in the box with the countdown.
          -->
          <Tooltip
            v-if="!isDaily"
            :heading="
              refillTimeStated ? 'Body.WrongAnswerCostsOneHeart' : 'Body.UnlimitedHeartsTooltip'
            "
            :params="{ time: refillTime }"
          >
            <InformationCircleIcon class="h-6 w-6 text-accent" />
          </Tooltip>
        </div>
        <!-- Every course is open to every account, so the courses stand with the free plan only. -->
        <div class="mt-4 flex items-center space-x-4">
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p>{{ t("DailyLearning.AllCourses") }}</p>
        </div>
        <div class="mt-4 flex items-center space-x-4">
          <CheckIcon class="h-6 w-5 flex-none text-body" aria-hidden="true" />
          <p>{{ t(isDaily ? "DailyLearning.FreeReview" : "Body.LearnNewThings") }}</p>
        </div>
      </div>

      <!--
        `#premium` is where the link at the heart limit lands. On a phone the card starts at
        the top of the screen; on wider screens the plan switch above it stays in view.
      -->
      <div
        id="premium"
        class="my-3 w-full scroll-mt-4 rounded-xl bg-accent p-8 text-black shadow-xl md:scroll-mt-32"
        :class="{ 'md:w-1/2': !isPremium }"
      >
        <div class="mb-4 flex justify-center">
          <RocketLaunchIcon class="h-16 w-16 flex-none text-black" aria-hidden="true" />
        </div>
        <h1 class="mb-2 text-center text-3xl font-bold text-black">{{ t("Headings.Premium") }}</h1>
        <!--
          What the price below is for: one month or one year. The switch above the cards
          says it too, but on a phone it is off screen once the card is. The line stands
          here in every state of the card, so the price is never without its period. What
          Premium brings is left to the list below.
        -->
        <p class="mb-8 text-center text-black" data-premium-period>
          {{ t(yearly ? "Body.PremiumForOneYear" : "Body.PremiumForOneMonth") }}
        </p>
        <div class="mb-8">
          <p v-if="isDaily" class="mb-3 text-center text-black">
            {{ t("DailyLearning.CoinPayment") }}
          </p>
          <!--
            Both buttons of the card take the colours of the pill that opens the
            feedback form on every page: filled with the colour of the page,
            labelled in the colour of headings. The interface has no white
            surfaces.
          -->
          <!--
            A visitor without an account sees the price and nothing to press: there
            is no coin balance to speak of and nothing to buy yet. The way to an
            account stands in the card of the free plan.
          -->
          <template v-if="guest">
            <div
              class="flex w-full items-center justify-center space-x-4 rounded-full border border-tertiary px-6 py-3 text-center"
            >
              <img src="/images/coin.png" alt="" class="h-8 w-8 flex-none object-contain" />
              <Price :coins="planPrice" class="justify-center font-bold text-black" />
            </div>
          </template>
          <template v-else-if="hasEnoughCoins">
            <button
              type="button"
              :disabled="disabled"
              @click="onclickSubscribe"
              class="flex w-full cursor-pointer items-center justify-center space-x-4 rounded-full border border-primary bg-primary px-6 py-3 shadow-lg duration-200 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:scale-95"
            >
              <img src="/images/coin.png" alt="" class="h-8 w-8 flex-none object-contain" />
              <Price :coins="planPrice" class="justify-center font-bold text-heading" />
            </button>
            <p v-if="yearly" class="mt-2 text-center text-black">
              {{ t("Body.PricePerMonth", { amount: pricePerMonth }) }}
            </p>
          </template>

          <!--
            Without enough Morphcoins the price is plain text, and the button
            below leads straight to the order of the missing coins. The button
            names an amount only when it orders another one than the price
            above it, because the account already holds a part.
          -->
          <template v-else>
            <div
              class="flex w-full items-center justify-center space-x-4 rounded-full border border-tertiary px-6 py-3 text-center"
            >
              <img src="/images/coin.png" alt="" class="h-8 w-8 flex-none object-contain" />
              <Price :coins="planPrice" class="justify-center font-bold text-black" />
            </div>
            <p class="mt-2 text-center font-bold text-black">
              {{ t("Body.NotEnoughMorphcoins") }}
            </p>
            <NuxtLink
              :to="coinOrder"
              class="mt-3 flex w-full flex-col items-center justify-center rounded-full border border-primary bg-primary px-6 py-3 text-center text-heading shadow-lg duration-200 hover:scale-105 hover:text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:scale-95"
            >
              <span class="font-bold">{{ t("Headings.BuyMorphcoins") }}</span>
              <Price v-if="orderDiffers" :coins="missingCoins" class="justify-center text-sm" />
            </NuxtLink>
          </template>
        </div>
        <div class="mt-4 flex items-center space-x-4">
          <CheckIcon class="h-6 w-5 flex-none text-black" aria-hidden="true" />
          <p class="text-black">
            {{ t(isDaily ? "DailyLearning.PremiumPace" : "Body.UnlimitedHearts") }}
          </p>
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
  disabled: { type: Boolean, default: false },
  /** The page around the card already states when the hearts refill. */
  refillTimeStated: { type: Boolean, default: false },
  /** The visitor has no account: the cards show the plans, their prices and the way to a free account. */
  guest: { type: Boolean, default: false },
});

import { CheckIcon } from "@heroicons/vue/20/solid";
import { BookOpenIcon, InformationCircleIcon, RocketLaunchIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
import { useCoins } from "../../composables/coins";
const { t, locale } = useI18n();
const premiumInfo: any = usePremiumInfo();
const { isDaily, daily } = useDailyLearning();
const coinConfig = useCoinConfig();
const heartConfig = useHeartConfig();

onMounted(loadHeartConfig);

// Hearts are shown in whole hearts, not in the half hearts the API counts.
const dailyHearts = computed(() => formatHearts(heartConfig.value.hearts_max, locale.value));
// The same time of day as the block at the heart limit names.
const refillTime = computed(() => heartRefillTime(locale.value));

// A guest has no plan, whatever an account that logged out left in memory.
const isPremium = computed(() => !props.guest && premiumInfo.value?.premium);

const coins = useCoins();
const planPrice = computed(() => (props.yearly ? props.yearlyPrice : props.monthlyPrice));
const hasEnoughCoins = computed(() => coins.value >= planPrice.value);

// What is still missing for the plan, at least the smallest amount the shop sells.
const missingCoins = computed(() => Math.max(COIN_PURCHASE_MIN, planPrice.value - coins.value));
const coinOrder = computed(
  () => `/morphcoins/paypal?coins=${missingCoins.value}&next=subscription`
);
// The same amount is said once: the price of the plan stands above the button.
const orderDiffers = computed(() => missingCoins.value !== planPrice.value);

// Art. 246a § 1 Abs. 1 Nr. 8 EGBGB: the monthly cost of a yearly plan.
const pricePerMonth = computed(() =>
  formatEuros(coinsToEuros(props.yearlyPrice, coinConfig.value) / 12, locale.value)
);

function onclickSubscribe() {
  if (props.disabled || !hasEnoughCoins.value) return;
  if (props.yearly) props.subscribeYearly?.();
  else props.subscribeMonthly?.();
}
</script>
