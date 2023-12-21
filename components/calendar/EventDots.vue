<template>
  <article
    class="max-w-full p-0 lg:py-1 lg:px-2 rounded shadow-lg flex lg:gap-2 justify-between items-center h-fit"
    :class="theme.bgLight"
  >
    <span
      class="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-xl flex-shrink-0 block"
      :class="theme.bg"
    ></span>

    <h3 class="text-xs capitalize hidden lg:clamp line-1" :class="theme.text">
      {{ heading }}
    </h3>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type {  PropType } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
    index: { type: Number, default: 0 },
  },
  setup(props) {
    const { t } = useI18n();

    const type = computed(() => {
      return props.data?.type ?? "webinar";
    });

    const heading = computed(() => {
      // return props.data?.title ?? props.data?.name ?? type.value;
      let skillID = props.data?.skill_id ?? "";
      return skillID.replace(/_/g, " ");
    });

    const theme = computed(() => {
      switch (type.value) {
      case "coaching":
        return {
          bg: "bg-info",
          bgLight: "bg-info-light",
          fill: "fill-info",
          stroke: "stroke-info",
          border: "border-info",
          text: "text-info",
        };
      default:
        return {
          bg: "bg-warning",
          bgLight: "bg-warning-light",
          fill: "fill-warning",
          stroke: "stroke-warning",
          border: "border-warning",
          text: "text-warning",
        };
      }
    });

    return { t, theme, heading };
  },
});
</script>

<style scoped></style>
