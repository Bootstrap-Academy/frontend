!
<template>
	<div class="p-2 rounded-md">
		<div
			class="bg-info text-primary p-4 font-bold rounded cursor-pointer text-center"
			v-on:click="isOpen = !isOpen"
		>
			{{ t(title) }}
		</div>
		<Transition name="fade" mode="out-in">
			<div
				class="mt-4 px-2 py-3 border-2 border-primary flex justify-center w-full"
				v-if="isOpen"
			>
				<slot />
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const props = defineProps<{
		title: string;
	}>();

const { t } = useI18n();

const isOpen = ref(false);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 1s;
}
.fade-enter,
.fade-leave-to,
.fade-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
