<template>
	<article
		class="flex items-center p-2 bg-warning-light text-warning rounded-md md:rounded-lg"
	>
		<BoltIcon class="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 text-[#f2c94c]" />
		<h6 class="text-heading-4 ml-2 pr-1 md:ml-2.5">
			{{ abbreviateNumber(xp) }} XP
		</h6>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { BoltIcon } from '@heroicons/vue/24/outline';

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  components: { BoltIcon },
  setup(props) {
    const xp = computed(() => {
      return props.data?.total_xp ?? 0;
    });

    return { xp };
  },
});
</script>

<style scoped></style>
