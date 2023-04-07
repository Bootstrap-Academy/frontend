<template>
	<section class="flex flex-wrap gap-container">
		<article
			v-for="({ label, value, border, text }, i) of summary"
			:key="i"
			class="text-center flex gap-box w-fit items-center"
			:class="[border]"
		>
			<p class="text-heading-2" :class="[text]">{{ value }}</p>
			<h3 class="text-body-1">{{ t(label) }}</h3>
		</article>
	</section>
</template>

<script lang="ts">
import { PropType, defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

interface PropData {
	total: number;
	solved: number;
	incorrect: number;
	untried: number;
	unlocked: number;
	locked: number;
}

export default defineComponent({
	props: {
		data: { type: Object as PropType<PropData | null>, default: null },
		loading: { type: Boolean, default: true },
	},
	setup(props) {
		const { t } = useI18n();

		const summary = computed(() => {
			return [
				{
					label: 'Headings.Solved',
					value: props.data?.solved ?? 0,
					border: 'border-[#00cc9920]',
					text: 'text-success',
				},
				{
					label: 'Headings.Incorrect',
					value: props.data?.incorrect ?? 0,
					border: 'border-[#eb585720]',
					text: 'text-error',
				},
				{
					label: 'Headings.Untried',
					value: props.data?.untried ?? 0,
					border: 'border-[#f2c94c20]',
					text: 'text-warning',
				},
				{
					label: 'Headings.Locked',
					value: props.data?.locked ?? 0,
					border: 'border-[#177ddc20]',
					text: 'text-info',
				},
			];
		});

		return { t, summary };
	},
});
</script>

<style scoped></style>
