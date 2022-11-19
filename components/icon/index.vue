<template>
	<div class="bg-tertiary p-1.5 rounded-lg h-fit w-fit">
		<component class="w-5 h-5 text-accent" :is="icon"></component>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	props: {
		icon: { default: null },
	},
	setup() {
		return {};
	},
});
</script>

<style scoped></style>
