<template>
  <section class="daily-limit" aria-labelledby="daily-limit-title">
    <h2 id="daily-limit-title" ref="heading" tabindex="-1">
      {{ t("DailyLearning.Reset", { time }) }}
    </h2>
    <p>{{ t("DailyLearning.LimitBody", { n: value.limit }) }}</p>
    <NuxtLink :to="continueTo || '/learn'" :prefetch="false" class="daily-action">{{
      t(continueLabel || (continueTo ? "DailyLearning.BackToCourse" : "DailyLearning.Continue"))
    }}</NuxtLink>
    <p class="daily-premium">
      {{ t("DailyLearning.PremiumBenefit") }}
      <NuxtLink to="/subscription">{{ t("DailyLearning.SeePremium") }} →</NuxtLink>
    </p>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { DailyLearning } from "~/types/dailyLearning";
import { dailyResetTime } from "~/utils/dailyLearning";
const props = defineProps<{ value: DailyLearning; continueTo?: string; continueLabel?: string }>();
const { t, locale } = useI18n();
const heading = ref<HTMLElement | null>(null);
const time = computed(() => dailyResetTime(props.value, locale.value));
onMounted(() => heading.value?.focus({ preventScroll: true }));
</script>
<style scoped>
.daily-limit {
  display: grid;
  justify-items: start;
  gap: 1.25rem;
  border: 1px solid #375368;
  border-radius: 18px;
  padding: clamp(22px, 5vw, 42px);
  background: #142a3e;
  color: #edf3fb;
  font-family: Inter, sans-serif;
}
h2 {
  font:
    650 clamp(1.4rem, 4vw, 1.9rem)/1.3 Inter,
    sans-serif;
  margin: 0;
}
p {
  max-width: 42rem;
  font:
    400 1rem/1.6 Inter,
    sans-serif;
  margin: 0;
}
.daily-action {
  display: inline-flex;
  align-items: center;
  min-height: 48px;
  padding: 12px 18px;
  border-radius: 10px;
  background: #0cc9ab;
  color: #07312d;
  font-weight: 650;
}
.daily-premium {
  color: #b6cbdc;
  font-size: 0.875rem;
}
.daily-premium a {
  color: #a5ded6;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  text-decoration: underline;
  text-underline-offset: 4px;
}
a:focus-visible,
h2:focus-visible {
  outline: 2px solid #7de5d0;
  outline-offset: 5px;
}
@media (max-width: 600px) {
  .daily-action {
    width: 100%;
    justify-content: center;
  }
}
</style>
