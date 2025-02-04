<template>
  <section class="flex flex-wrap gap-12">
    <article v-for="({ label, value, border, text }, i) of summary" :key="i"
      class="text-center flex gap-2 w-fit items-center" :class="[border]">
      <p class="text-body-1" :class="[text]">{{ value }}</p>
      <h3 class="text-body-1">{{ t(label) }}</h3>
    </article>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";

interface PropData {
  attempted: number;
  solved: number;
}

export default defineComponent({
  props: {
    data: { type: Object as PropType<PropData | null>, default: null },
    loading: { type: Boolean, default: true },
  },
  setup(props) {
    const { t } = useI18n();

    const summary = computed(() => {
      return [
        {
          label: "Headings.Attempted",
          value: props.data?.attempted ?? 0,
          border: "border-[#eb585720]",
          text: "text-warning",
        },
        {
          label: "Headings.Solved",
          value: props.data?.solved ?? 0,
          border: "border-[#00cc9920]",
          text: "text-success",
        },
      ];
    });

    return { t, summary };
  },
});
</script>
