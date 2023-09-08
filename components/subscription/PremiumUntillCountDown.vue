<template>
  <div>
    <p class="text-xl text-center text-accent mb-3">
      {{ t("Headings.PremiumEndsIn") }}
    </p>
    <P class="text-6xl text-white text-center">
      {{ countdown }}
    </P>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();
// Set the date we're counting down to
// var countDownDate = new Date("Jan 5, 2024 15:37:25").getTime();
const premiumInfo: any = usePremiumInfo();

const until = computed(() => {
  return premiumInfo.value?.until * 1000;
});
const days = ref(0);
const hours = ref(0);
const minutes = ref(0);
const seconds = ref(0);
// Update the count down every 1 second
var x = setInterval(function () {
  // Get today's date and time
  var now = new Date().getTime();

  // Find the distance between now and the count down date
  var distance = until.value - now;

  // Time calculations for days, hours, minutes and seconds
  days.value = Math.floor(distance / (1000 * 60 * 60 * 24));
  hours.value = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  minutes.value = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  seconds.value = Math.floor((distance % (1000 * 60)) / 1000);

  // Output the result in an element with id="demo"
  // If the count down is over, write some text
  if (distance < 0) {
    clearInterval(x);
  }
}, 1000);

const countdown = computed(() => {
  return `${days.value}D ${hours.value}H ${minutes.value}M ${seconds.value}S`;
});
onMounted(async () => {
  await getPremiumStatus();
});
</script>

<style scoped></style>
