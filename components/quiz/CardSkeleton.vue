<template>
	<article class="box style-box bg-secondary cursor-pointer">
		<SkeletonText :noAnimate="noAnimate" />
		<div class="flex justify-between gap-box items-center">
			<SkeletonText :noAnimate="noAnimate" body sm class="mt-box" />
			<Chip xs color="chip-color-6" class="w-fit text-transparent">Free</Chip>
		</div>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: { noAnimate: { type: Boolean, default: false } },
  setup() {},
});
</script>

<style scoped></style>
