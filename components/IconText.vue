<template>
	<article class="flex" :class="classes">
		<component
			:is="icon"
			class="icon"
			:color="highlightIcon ? 'fill-accent' : fill"
			:class="highlightIcon ? 'text-accent' : iconColor"
		></component>
		<div
			class="label font-body"
			:class="highlightLabel ? 'text-heading' : labelColor"
		>
			<slot></slot>
		</div>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';

export default defineComponent({
  props: {
    sm: { type: Boolean, default: false },
    md: { type: Boolean, default: true },
    lg: { type: Boolean, default: false },
    icon: { type: Object as PropType<any>, default: null },
    highlightLabel: { type: Boolean, default: false },
    highlightIcon: { type: Boolean, default: true },
    labelColor: { type: String, default: 'text-subheading' },
    iconColor: { type: String, default: 'text-subheading' },
    fill: { type: String, default: 'fill-subheading' },
  },
  setup(props) {
    const classes = computed(() => {
      return {
        lg: props.lg,
        md: props.md && !props.lg && !props.sm,
        sm: props.sm,
      };
    });

    return { classes };
  },
});
</script>

<style scoped>
.lg {
	@apply gap-3.5 md:gap-4;
}
.md {
	@apply gap-3 sm:gap-3.5;
}
.sm {
	@apply gap-3;
}

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ LABEL */
.lg .label {
	@apply text-base;
}
.md .label {
	@apply text-sm;
}
.sm .label {
	@apply text-xs;
}

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ ICON */
.lg .icon {
	@apply w-5 h-5 md:w-6 md:h-6 flex-shrink-0;
}
.md .icon {
	@apply w-5 h-5 flex-shrink-0;
}
.sm .icon {
	@apply w-4 h-4 flex-shrink-0;
}
</style>
