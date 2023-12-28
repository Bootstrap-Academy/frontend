<template>
	<div :class="classes"></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    color: { type: String, default: '' },
    noAnimate: { type: Boolean, default: false },
  },
  setup(props) {
    const color = computed(() => {
      if (!!props.color) return props.color;
      else return 'bg-[#2e405a]';
    });

    const classes = computed(() => {
      return [
        color.value,
        {
          'transition-basic animate-pulse': !props.noAnimate,
        },
      ];
    });

    return { classes };
  },
});
</script>

<style scoped></style>
