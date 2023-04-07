<template>
	<section class="markdown grid grid-cols-2 gap-card">
		<textarea
			ref="DOM_TEXTAREA"
			v-model="markdown"
			class="w-full h-full"
			rows="20"
		></textarea>
		<div v-html="$md.render(markdown)"></div>

		<Btn @click="onclickGetMarkdownAsString">get markdown As string</Btn>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { TrophyIcon } from '@heroicons/vue/24/outline';
import { PropType } from 'vue';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
	},
	components: { TrophyIcon },
	setup(props) {
		const { t } = useI18n();

		const markdown = ref('');

		const DOM_TEXTAREA = ref<HTMLTextAreaElement | null>(null);

		const markdownString = computed(() => {
			return markdown.value.replace(/\n/g, '\\n');
		});

		function onclickGetMarkdownAsString() {
			console.log(markdownString.value);
		}

		return {
			t,
			markdown,
			onclickGetMarkdownAsString,
			DOM_TEXTAREA,
			markdownString,
		};
	},
});
</script>

<style scoped></style>
