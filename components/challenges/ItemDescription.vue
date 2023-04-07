<template>
	<section class="markdown">
		<!-- <MarkdownEditor /> -->
		<div v-html="$mdRenderer.render('\n + a')"></div>
		<div v-html="$mdRenderer.render(data?.description ?? '')"></div>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { TrophyIcon } from '@heroicons/vue/24/outline';
import { PropType } from 'vue';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
	},
	components: { TrophyIcon },
	setup(props) {
		const { t } = useI18n();

		const description = computed(() => {
			const md = new MarkdownIt({
				html: true,
				linkify: true,
				typographer: true,
			});
			// md.use(require('markdown-it-heading'));

			const htmlText = md.render(props.data?.description ?? '');
			return DOMPurify.sanitize(htmlText);
		});

		return { t, description };
	},
});
</script>

<style scoped></style>
