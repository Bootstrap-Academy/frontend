<template>
  <article
    class="flex h-fit max-w-full items-center justify-between rounded p-0 shadow-lg lg:gap-2 lg:px-2 lg:py-1"
    :class="theme.bgLight"
  >
    <span class="block h-1.5 w-1.5 flex-shrink-0 rounded-xl sm:h-2 sm:w-2" :class="theme.bg"></span>

    <h3 class="lg:clamp line-1 hidden text-xs capitalize" :class="theme.text">
      {{ heading }}
    </h3>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
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
