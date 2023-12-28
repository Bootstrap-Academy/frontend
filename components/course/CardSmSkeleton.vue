<template>
	<article
		class="relative bg-secondary rounded-lg shadow-lg overflow-clip flex items-end min-h-[175px] min-w-[175px] md:min-w-[150px]"
	>
		<div class="relative p-4 w-full h-fit">
			<SkeletonText :noAnimate="noAnimate" lg class="max-w-[70%]" />
			<SkeletonText :noAnimate="noAnimate" body class="mt-3" />
		</div>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: { noAnimate: { type: Boolean, default: false } },
  setup() {
    return {};
  },
});
</script>

<style scoped></style>
