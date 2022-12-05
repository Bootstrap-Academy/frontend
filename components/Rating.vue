<template>
	<article
		class="flex items-center p-2.5 rounded-md w-fit h-fit"
		:class="[theme.bgLight, theme.text]"
	>
		<StarIcon
			class="w-5 h-5 md:w-6 md:h-6 flex-shrink-0"
			:class="[theme.text]"
		/>
		<h6 class="text-heading-4 ml-2 pr-1 md:ml-2.5">
			{{ t('Headings.Stars', { n: rating }, rating) }}
		</h6>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { StarIcon } from '@heroicons/vue/24/solid/index.js';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		rating: { type: Number, default: 0 },
	},
	components: { StarIcon },

	setup(props) {
		const { t } = useI18n();

		const type = computed(() => {
			if (props.rating > 4) return 'success';
			else if (props.rating > 2 && props.rating <= 4) return 'info';
			else return 'error';
		});

		const theme = computed(() => {
			return getTheme(type.value);
		});

		return { theme, t };
	},
});
</script>

<style scoped></style>
