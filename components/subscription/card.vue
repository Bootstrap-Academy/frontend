<template>
  <div>
    <div class="mx-auto">
      <section
        class="mx-auto max-w-2xl rounded-3xl ring-1 ring-gray lg:mx-0 lg:flex lg:max-w-none"
      >
        <article class="p-8 sm:p-10 lg:flex-auto">
          <h3 class="text-2xl font-bold tracking-tight text-accent">
            {{ t(card.heading) }}
          </h3>

          <p class="mt-6 text-base leading-7 text-gray">
            {{ t(card.body) }}
          </p>
          <div class="mt-10 flex items-center gap-x-4">
            <h4 class="flex-none text-sm font-semibold leading-6 text-accent">
              {{ t(card.featuresHeading) }}
            </h4>
            <div class="h-px flex-auto" />
          </div>
          <ul
            role="list"
            class="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 text-gray sm:grid-cols-2 sm:gap-6"
          >
            <li
              v-for="feature in card.features"
              :key="feature"
              class="flex gap-x-3"
            >
              <CheckIcon
                class="h-6 w-5 flex-none text-accent"
                aria-hidden="true"
              />
              {{ t(feature) }}
            </li>
          </ul>
        </article>

        <article
          class="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0"
        >
          <div
            class="rounded-2xl h-full bg-gray py-10 text-center ring-1 ring-inset ring-accent lg:flex lg:flex-col lg:justify-center lg:py-16"
          >
            <div class="mx-1 flex flex-col items-center">
              <p class="text-base font-semibold text-gray">
                {{ t(card.Quote) }}
              </p>
              <div class="mt-6 flex items-center justify-center gap-x-2">
                <p class="text-5xl font-bold tracking-tight text-accent">
                  {{ t(card.price) }}
                </p>
                <img
                  src="/images/coin.png"
                  alt="coin"
                  class="object-contain w-10 h-10"
                />
              </div>
              <SubscriptionButton
                :billCoins="card.price"
                :label="card.buttonLabel"
                @click="card.subscribe()"
                class="my-4"
              />
            </div>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  card: { type: Object, default: null },
});

import { CheckIcon } from "@heroicons/vue/20/solid";
import { useI18n } from "vue-i18n";
import { useCoins } from "../../composables/coins";
const { t } = useI18n();

const coins = useCoins();
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
</script>
