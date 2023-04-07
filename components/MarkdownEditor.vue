<template>
	<section class="markdown flex gap-card">
		<textarea v-model="markdown" class="w-full h-full" rows="20"></textarea>
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
	},
	components: { TrophyIcon },
	setup(props) {
		const { t } = useI18n();

		const markdown = ref('');

		return { t, markdown };
	},
});
</script>

<style scoped></style>
