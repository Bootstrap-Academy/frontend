<template>
	<div class="rounded-3xl max-w-full" :class="classes"></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    body: { type: Boolean, default: false },
    lg: { type: Boolean, default: false },
    md: { type: Boolean, default: true },
    sm: { type: Boolean, default: false },
    color: { type: String, default: '' },
    noAnimate: { type: Boolean, default: false },
  },
  setup(props) {
    const width = computed(() => {
      let options = props.body
        ? ['w-full', 'w-9/12', 'w-6/12', 'w-4/12']
        : ['w-24', 'w-36', 'w-52', 'w-64'];
      return options[getRandomNumber(0, options.length - 1)];
    });

    const color = computed(() => {
      if (!!props.color) return props.color;
      else if (props.body) return 'bg-[#2e405a]';
      else return 'bg-[#42546e]';
    });

    const classes = computed(() => {
      return [
        {
          'heading-lg': props.lg,
          'heading-md': props.md && !props.lg && !props.sm,
          'heading-sm': props.sm,

          'body-lg': props.body && props.lg,
          'body-md': props.body && props.md && !props.lg && !props.sm,
          'body-sm': props.body && props.sm,
          'transition-basic animate-pulse': !props.noAnimate,
        },
        width.value,
        color.value,
      ];
    });

    return { classes };
  },
});
</script>

<style scoped>
.heading-lg {
	@apply p-3;
}
.heading-md {
	@apply p-2;
}
.heading-sm {
	@apply p-1.5;
}

.body-lg {
	@apply p-2;
}
.body-md {
	@apply p-1.5;
}
.body-sm {
	@apply p-1;
}
</style>
