<template>
	<section class="markdown grid md:grid-cols-2 gap-card">
		<textarea
			ref="DOM_TEXTAREA"
			v-model="markdown"
			class="w-full h-full resize-none"
			rows="20"
		></textarea>
		<div v-html="$md.render(markdown)"></div>
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
		modelValue: { default: '' },
	},
	components: { TrophyIcon },
	emits: ['update:modelValue'],
	setup(props, { emit }) {
		const { t } = useI18n();

		const markdown = computed({
			get() {
				return props.modelValue;
			},
			set(value: string) {
				emit('update:modelValue', value);
			},
		});

		return {
			t,
			markdown,
		};
	},
});
</script>

<style scoped></style>
