<template>
  <section class="flex flex-wrap gap-x-container">
    <article
      @click="navigateTo('/challenges/all')"
      v-for="({ label, value, border, text }, i) of summary"
      :key="i"
      class="text-center flex gap-box w-fit items-center cursor-pointer"
      :class="[border]"
    >
      <p class="text-heading-2" :class="[text]">{{ value }}</p>
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
  locked: number;
  solved: number;
  total: number;
  unattempted: number;
  unlocked: number;
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
          label: "Headings.Total",
          value: props.data?.total ?? 0,
          border: "border-[#f2c94c20]",
          text: "text-warning",
        },
        {
          label: "Headings.Solved",
          value: props.data?.solved ?? 0,
          border: "border-[#00cc9920]",
          text: "text-success",
        },
        {
          label: "Headings.Unattempted",
          value: props.data?.unattempted ?? 0,
          border: "border-[#eb585720]",
          text: "text-error",
        },
        {
          label: "Headings.Attempted",
          value: props.data?.attempted ?? 0,
          border: "border-[#eb585720]",
          text: "text-error",
        },
      ];
    });

    return { t, summary };
  },
});
</script>

<style scoped></style>
