<template>
  <div
    class="p-1.5 h-fit w-fit"
    :class="[rounded ? 'rounded-[50px]' : 'rounded-lg', bgColor]"
  >
    <component
      :class="[sm ? 'w-4 h-4' : 'w-5 h-5', iconColor]"
      :is="icon"
    ></component>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    icon: { type: Object, default: null },
    sm: { type: Boolean, default: false },
    rounded: { type: Boolean, default: false },
    bgColor: { type: String, default: "bg-tertiary" },
    iconColor: { type: String, default: "text-accent" },
  },
  setup() {
    return {};
  },
});
</script>

<style scoped></style>
