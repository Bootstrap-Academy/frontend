<template>
  <button :class="classes" @click="onclick" :disabled="disabled" type="button">
    <component v-if="icon" :is="icon" class="icon" />
    <slot></slot>
  </button>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  props: {
    full: { type: Boolean, default: false },
    sm: { type: Boolean, default: false },
    md: { type: Boolean, default: true },
    lg: { type: Boolean, default: false },
    primary: { type: Boolean, default: true },
    secondary: { type: Boolean, default: false },
    tertiary: { type: Boolean, default: false },
    icon: { type: Object, default: null },
    iconRight: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    // bgColor and borderColor ar no longer used directly in the computed classes, as the primary/secondary logic handle the color based on the theme.
    // However, they are kept as props for backward compatibility if needed.
    bgColor: { type: String, default: "bg-accent" },
    borderColor: { type: String, default: "border-accent" },
  },
  emits: ["click"],
  setup(props, { emit }) {
    function onclick() {
      if (!props.disabled) emit("click", true);
    }
    const classes = computed(() => {
      return [
        {
          lg: props.lg,
          md: props.md && !props.lg && !props.sm,
          sm: props.sm,
          'flex-row-reverse': props.iconRight,
          'text-center justify-center w-full': props.full,
          disabled: props.disabled,
        },
        /*
        props.primary && !props.secondary && !props.tertiary
          ? `primary ${props.bgColor} text-primary enabled:hover:${props.bgColor} border ${props.borderColor} enabled:hover:ring-4 md:enabled:hover:ring-8 enabled:hover:ring-tertiary`
          : '',
        props.secondary
          ? `secondary bg-transparent text-heading enabled:hover:bg-transparent border ${props.borderColor} enabled:hover:ring-4 md:enabled:hover:ring-8 enabled:hover:ring-tertiary`
          : '',
        props.tertiary
          ? `tertiary bg-transparent text-heading enabled:hover:bg-transparent enabled:hover:scale-105 border border-transparent enabled:hover:ring-4 md:enabled:hover:ring-8 enabled:hover:ring-transparent`
          : '',
          */
        props.primary && !props.secondary && !props.tertiary
          ? `primary`
          : '',
        props.secondary
          ? `secondary`
          : '',
        props.tertiary
          ? `tertiary`
          : '',
      ];
    });
    return { classes, onclick };
  },
});
</script>

<style scoped>
button {
  @apply flex h-fit items-center rounded text-center uppercase tracking-widest font-body transition-basic;
}

button:disabled {
  @apply cursor-not-allowed opacity-50;
}

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ STYLE */
.primary {
  /* Apply specific classes that match desired look. */
	@apply bg-info text-white font-bold py-2 px-4 rounded hover:bg-info;
}
.secondary {
	@apply bg-transparent hover:bg-transparent border border-accent focus:ring-8 focus:ring-tertiary;
}
.tertiary {
	@apply bg-transparent hover:bg-transparent hover:scale-105 border border-transparent focus:ring-8 focus:ring-transparent;
}

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ SIZE */
.sm {
  @apply gap-2 px-3.5 py-2 text-xs font-medium;
}
.md {
  @apply gap-3 px-5 py-3 text-sm font-bold;
}
.lg {
  @apply gap-4 px-6 py-4 text-base;
}
:is(.sm, .md, .lg).tertiary {
  @apply px-0 sm:px-0 md:px-0 lg:px-0 xl:px-0;
}

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ICON */
.sm .icon {
  @apply h-4 w-4;
}
.md .icon {
  @apply h-5 w-5;
}
.lg .icon {
  @apply h-6 w-6;
}
.primary .icon {
  @apply fill-primary;
}
.secondary .icon {
  @apply fill-accent;
}
.tertiary .icon {
  @apply fill-accent;
}
.bg-info {
  color: var(--color-white) !important;
}
</style>
