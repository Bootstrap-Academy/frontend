<template>
  <div :class="classes" @click.self="onclick">
    <component
      v-if="icon"
      :is="icon"
      class="icon cursor-pointer"
      @click="onclickIcon"
    ></component>
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    xs: { type: Boolean, default: false },
    sm: { type: Boolean, default: true },
    md: { type: Boolean, default: false },
    lg: { type: Boolean, default: false },
    icon: { type: Object, default: null },
    iconRight: { type: Boolean, default: false },
    color: { type: String, default: "" },
  },
  emits: ["click", "iconClick"],
  setup(props, { emit }) {
    function onclick() {
      emit("click", true);
    }

    const chipColor = computed(() => {
      let colors = [
        "chip-color-1",
        "chip-color-2",
        "chip-color-3",
        "chip-color-4",
        "chip-color-5",
        "chip-color-6",
        "chip-color-7",
        "chip-color-8",
        "chip-color-9",
        "chip-color-10",
        "chip-color-11",
        "chip-color-12",
      ];

      return !!props.color
        ? props.color
        : colors[getRandomNumber(0, colors.length - 1)];
    });

    const classes = computed(() => {
      return [
        {
          lg: props.lg,
          md: props.md,
          sm: props.sm && !props.lg && !props.md && !props.xs,
          xs: props.xs,
          "flex-row-reverse": props.iconRight,
        },
        chipColor.value,
      ];
    });

    function onclickIcon() {
      emit("iconClick", true);
    }
    return { classes, onclick, onclickIcon };
  },
});
</script>
<style scoped>
div {
  @apply h-fit rounded-[100px] flex items-center text-center text-primary font-heading uppercase tracking-widest transition-basic font-bold;
  font-family: Arial, Helvetica, sans-serif;
}

.chip-color-1 {
  @apply text-primary;
  background-color: #00c9ef;
}
.chip-color-2 {
  @apply text-white;
  background-color: #fb027c;
}
.chip-color-3 {
  @apply text-white;
  background-color: #835aff;
}
.chip-color-4 {
  @apply text-primary;
  background-color: #35dc85;
}
.chip-color-5 {
  @apply text-white;
  background-color: #1680fd;
}
.chip-color-6 {
  @apply text-primary;
  background-color: #ff34cc;
}
.chip-color-7 {
  @apply text-primary;
  background-color: #ffcb30;
}
.chip-color-8 {
  @apply text-white;
  background-color: #f6584f;
}
.chip-color-9 {
  @apply text-white;
  background-color: #d278f0;
}
.chip-color-10 {
  @apply text-white;
  background-color: #546bed;
}
.chip-color-11 {
  @apply text-primary;
  background-color: #ff64d9;
}
.chip-color-12 {
  @apply text-white;
  background-color: #fc8618;
}
.chip-color-13 {
  @apply text-white;
  background-color: #0cc9ab;
}
.bg-info {
  color: var(--color-white);
}
/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ SIZE */
.xs {
  @apply text-xs px-2.5 py-1 gap-2;
}
.sm {
  @apply text-xs px-3.5 py-2 gap-2;
}
.md {
  @apply text-sm px-5 py-3 gap-2.5;
}
.lg {
  @apply text-base px-6 py-4 gap-3;
}
:is(.sm, .md, .lg).tertiary {
  @apply px-0;
}

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ICON */
.sm .icon {
  @apply w-4 h-4;
}
.md .icon {
  @apply w-5 h-5;
}
.lg .icon {
  @apply w-6 h-6;
}
.primary .icon {
  @apply fill-white;
}
.secondary .icon {
  @apply fill-white;
}
.tertiary .icon {
  @apply fill-accent;
}
</style>
