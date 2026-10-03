<template>
  <div
    v-if="
      value?.mode === 'daily' &&
      value.enforced !== false &&
      value.remaining !== null &&
      !value.unlimited
    "
    class="daily-notice"
  >
    <details>
      <summary>
        <span role="status" aria-live="polite">{{
          value.remaining
            ? t(value.remaining === 1 ? "DailyLearning.RemainingOne" : "DailyLearning.Remaining", {
                n: value.remaining,
              })
            : t("DailyLearning.Reset", { time })
        }}</span>
      </summary>
      <p>{{ t("DailyLearning.Explanation", { n: value.limit, time }) }}</p>
    </details>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { DailyLearning } from "~/types/dailyLearning";
import { dailyResetTime } from "~/utils/dailyLearning";
const props = defineProps<{ value?: DailyLearning | null }>();
const { t, locale } = useI18n();
const time = computed(() => (props.value ? dailyResetTime(props.value, locale.value) : ""));
</script>
<style scoped>
.daily-notice {
  color: #c4d6e3;
  font:
    400 0.875rem/1.55 Inter,
    sans-serif;
}
summary {
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  width: fit-content;
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-color: #557382;
}
p {
  color: inherit;
  max-width: 42rem;
  margin: 0.25rem 0 0.75rem;
  font: inherit;
}
summary:focus-visible {
  outline: 2px solid var(--color-accent, #7de5d0);
  outline-offset: 4px;
  border-radius: 4px;
}
</style>
