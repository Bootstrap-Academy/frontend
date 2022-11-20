<template>
	<article
		class="max-w-full p-0 lg:py-1 lg:px-2 rounded shadow-lg flex lg:gap-2 justify-between items-center h-fit"
		:class="theme.bgLight"
	>
		<span
			class="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-xl flex-shrink-0 block"
			:class="theme.bg"
		></span>
		<h3 class="text-xs capitalize hidden lg:clamp line-1" :class="theme.text">
			{{ heading }}
		</h3>
	</article>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
	},
	setup(props) {
		const { t } = useI18n();

		const type = computed(() => {
			return props.data?.type ?? 'webinar';
		});

		const heading = computed(() => {
			return props.data?.title ?? props.data?.name ?? type.value;
		});

		const theme = computed(() => {
			switch (type.value) {
				case 'coaching':
					return getTheme('info');
				default:
					return getTheme('warning');
			}
		});

		return { t, theme, heading };
	},
});
</script>

<style scoped></style>
