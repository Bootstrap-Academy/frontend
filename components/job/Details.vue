<template>
	<section
		class="card style-card bg-secondary grid gap-card"
		v-if="description || responsibilities.length || skillRequirements.length"
	>
		<article v-if="description">
			<h2 class="mb-box text-heading-3 truncate">
				{{ t('Headings.Description') }}
			</h2>
			<div class="break-all markdown" v-html="description"></div>
		</article>

		<article v-if="responsibilities.length">
			<h2 class="mb-box text-heading-3">
				{{ t('Headings.Responsibilities') }}
			</h2>
			<List :items="responsibilities" id="responsibilities" />
		</article>

		<article v-if="skillRequirements.length">
			<h2 class="mb-box text-heading-3">
				{{ t('Headings.SkillRequirements') }}
			</h2>
			<List :items="skillRequirements" id="skillRequirements" points />
		</article>
	</section>

	<div v-else></div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
	},
	setup(props) {
		const { t } = useI18n();

		const description = computed(() => {
			const md = new MarkdownIt();
			const htmlText = md.render(props.data?.description ?? '');
			return DOMPurify.sanitize(htmlText);
		});

		const responsibilities = computed(() => {
			return props.data?.responsibilities ?? [];
		});

		const skillRequirements = computed(() => {
			let arr: any[] = props.data?.skill_requirements ?? [];

			let updatedArr = arr.map((item) => {
				return {
					text: `${item[1]} level ${item[2]}`,
					link: `/skill-tree/${item[0]}?subSkillID=${item[1]}`,
				};
			});

			return updatedArr;
		});

		return {
			description,
			responsibilities,
			skillRequirements,
			t,
		};
	},
});
</script>

<style scoped></style>
