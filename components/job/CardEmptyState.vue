<template>
	<article
		class="flex flex-col gap-container items-center justify-center w-full h-5/6 lg:h-full"
	>
		<SvgEmptyStateJobs class="max-w-[350px]" />
		<SectionTitle
			size="sm"
			center
			heading="EmptyStates.Jobs.Heading"
			body="EmptyStates.Jobs.Body"
		/>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {
    return {};
  },
});
</script>

<style scoped></style>
