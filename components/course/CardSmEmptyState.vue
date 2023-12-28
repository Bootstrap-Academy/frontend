<template>
	<div
		class="flex gap-card-sm overflow-x-scroll snap-x snap-mandatory hide-scrollbar"
	>
		<CourseCardSmSkeleton class="child opacity-60" no-animate />
		<CourseCardSmSkeleton class="child opacity-40" no-animate />
		<CourseCardSmSkeleton class="child opacity-20" no-animate />
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {
    return {};
  },
});
</script>

<style scoped>
.child {
	@apply flex-shrink-0 snap-center h-[175px] w-[250px];
}
</style>
