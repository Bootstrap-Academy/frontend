<template>
	<button :class="classes" @click.self="onclick" type="button">
		<component v-if="icon" :is="icon" class="icon"></component>
		<slot></slot>
	</button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    full: { type: Boolean, default: false },
    sm: { type: Boolean, default: false },
    md: { type: Boolean, default: true },
    lg: { type: Boolean, default: false },
    primary: { type: Boolean, default: true },
    secondary: { type: Boolean, default: false },
    tertiary: { type: Boolean, default: false },
    icon: { default: null },
    iconRight: { type: Boolean, default: false },
    bgColor: { type: String, default: 'bg-accent' },
    borderColor: { type: String, default: 'border-accent' },
  },
  emits: ['click'],
  setup(props, { emit }) {
    function onclick() {
      emit('click', true);
    }

    const textColor = computed(() => {
      return props.bgColor.includes('warning') ? 'text-primary' : 'text-white';
    });
    const classes = computed(() => {
      return [
        {
          lg: props.lg,
          md: props.md && !props.lg && !props.sm,
          sm: props.sm,
          'flex-row-reverse': props.iconRight,
          'text-center justify-center w-full': props.full,
        },
        props.primary && !props.secondary && !props.tertiary
          ? `primary ${props.bgColor} text-primary hover:${props.bgColor} border ${props.borderColor} hover:ring-4 md:hover:ring-8 hover:ring-tertiary`
          : '',
        props.secondary
          ? `secondary bg-transparent text-heading hover:bg-transparent border ${props.borderColor} hover:ring-4 md:hover:ring-8 hover:ring-tertiary`
          : '',
        props.tertiary
          ? `tertiary bg-transparent text-heading hover:bg-transparent hover:scale-105 border border-transparent hover:ring-4 md:hover:ring-8 hover:ring-transparent`
          : '',
      ];
    });
    return { classes, onclick };
  },
});
</script>
<style scoped>
button {
	@apply h-fit rounded flex items-center text-center
			 uppercase tracking-widest transition-basic font-body;
}

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ STYLE */
/* .primary {
	@apply bg-accent hover:bg-accent border border-accent focus:ring-8 focus:ring-tertiary;
}
.secondary {
	@apply bg-transparent hover:bg-transparent border border-accent focus:ring-8 focus:ring-tertiary;
}
.tertiary {
	@apply bg-transparent hover:bg-transparent hover:scale-105 border border-transparent focus:ring-8 focus:ring-transparent;
} */

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ SIZE */
.sm {
	@apply text-xs px-3.5 py-2 gap-2 font-medium;
}
.md {
	@apply text-sm px-5 py-3 gap-3 font-bold;
}
.lg {
	@apply text-base px-6 py-4 gap-4;
}
:is(.sm, .md, .lg).tertiary {
	@apply px-0 sm:px-0 md:px-0 lg:px-0 xl:px-0;
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
