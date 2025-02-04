<template>
  <article class="grid gap-2">
    <h3 v-if="heading" class="text-body-1">{{ heading }}</h3>
    <p class="text-right">{{ totalValue }} / {{ max }}</p>
    <div class="progress-container w-full col-span-2">
      <div v-for="(subdivision, index) in subdivisions" :key="index" :class="[subdivision.color]"
        :style="{ width: getSubdivisionWidth(subdivision) }" class="progress-segment" />
      <div v-if="remainingPercentage > 0" class="progress-segment bg-dark" :style="{ width: remainingPercentage }" />
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    heading: { type: String, default: '' },
    subdivisions: { type: Array as PropType<{ value: number; color: string }[]>, required: true },
    total: { type: Number, required: true },
  },
  setup(props) {
    const { t } = useI18n();

    const subdivisions = computed(() => {
      return props.subdivisions ?? [];
    });

    const totalValue = computed(() => {
      return subdivisions.value.reduce((acc, subdivision) => acc + subdivision.value, 0);
    });

    const max = computed(() => {
      return props.total;
    });

    const getSubdivisionWidth = (subdivision: { value: number }) => {
      const total = max.value;
      return total > 0 ? `${(subdivision.value / total) * 100}%` : '0%';
    };

    const remainingPercentage = computed(() => {
      const total = max.value;
      const used = totalValue.value;
      return total > 0 ? ((total - used) / total) * 100 : 0;
    });

    return { t, subdivisions, totalValue, max, getSubdivisionWidth, remainingPercentage };
  },
});
</script>

<style scoped>
.progress-container {
  display: flex;
  height: 1rem;
  border-radius: 1rem;
  overflow: hidden;
  background-color: var(--color-primary);
  transition: all 0.5s ease-in-out;
}

.progress-segment {
  height: 100%;
  transition: width 0.5s ease-in-out;
}

.bg-dark {
  background-color: var(--bg-dark);
}
</style>
