<template>
  <article v-if="stars" class="flex gap-2">
    <StarIcon
      v-for="n in 5"
      :key="n"
      class="flex-shrink-0"
      :class="[
        sm ? 'h-3 w-3 md:h-4 md:w-4' : 'h-5 w-5 md:h-6 md:w-6',
        n <= rating ? theme.text : 'text-subheading',
      ]"
    />
  </article>
  <article
    v-else
    class="flex h-fit w-fit items-center"
    :class="[theme.bgLight, theme.text, sm ? 'rounded px-1.5' : 'rounded-md p-2.5']"
  >
    <StarIcon
      class="flex-shrink-0"
      :class="[theme.text, sm ? 'h-3 w-3 md:h-4 md:w-4' : 'h-5 w-5 md:h-6 md:w-6']"
    />
    <h6 class="text-heading-4 ml-2 pr-1 md:ml-2.5" v-if="sm">
      {{ roundOffTo(rating, 1) }}
    </h6>
    <h6 class="text-heading-4 ml-2 pr-1 md:ml-2.5" v-else>
      {{ t("Headings.Stars", { n: rating }, rating) }}
    </h6>
  </article>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import {
  StarIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
} from "@heroicons/vue/24/solid";

const props = withDefaults(defineProps<ComponentProps>(), {
  rating: 0,
  sm: false,
  stars: false,
});
interface ComponentProps {
  rating?: number;
  sm?: boolean;
  stars?: boolean;
}

const { t } = useI18n();

const type = computed(() => {
  if (props.rating > 4) return "success";
  else if (props.rating > 2 && props.rating <= 4) return "info";
  else return "error";
});

const theme = computed(() => {
  if (type.value == "success") {
    return {
      bg: "bg-success",
      bgLight: "bg-success-light",
      fill: "fill-success",
      stroke: "stroke-success",
      border: "border-success",
      text: "text-success",
      icon: CheckCircleIcon,
    };
  } else if (type.value == "error") {
    return {
      bg: "bg-error",
      bgLight: "bg-error-light",
      fill: "fill-error",
      stroke: "stroke-error",
      border: "border-error",
      text: "text-error",
      icon: XCircleIcon,
    };
  } else {
    return {
      bg: "bg-info",
      bgLight: "bg-info-light",
      fill: "fill-info",
      stroke: "stroke-info",
      border: "border-info",
      text: "text-info",
      icon: InformationCircleIcon,
    };
  }
});
</script>

<style scoped></style>
