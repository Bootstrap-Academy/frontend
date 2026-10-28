<!-- The symbol of a known kind of stage; any other stage shows its number. -->
<template>
  <span class="stage-symbol" aria-hidden="true">
    <component :is="icon" v-if="icon" />
    <template v-else>{{ number }}</template>
  </span>
</template>

<script setup lang="ts">
import {
  ArrowPathIcon,
  BookOpenIcon,
  CheckBadgeIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/vue/24/outline";

const props = defineProps<{ kind: string; number: number }>();
const icons: Record<string, unknown> = {
  fundamentals: BookOpenIcon,
  practitioner: WrenchScrewdriverIcon,
  mastery: SparklesIcon,
  refresher: ArrowPathIcon,
  certification: CheckBadgeIcon,
};
const icon = computed(() => icons[props.kind] ?? null);
</script>

<style scoped>
.stage-symbol {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #12384a;
  color: #87e6d4;
  font-size: 0.8rem;
  font-weight: 650;
}
.stage-symbol svg {
  width: 16px;
  height: 16px;
}
</style>
