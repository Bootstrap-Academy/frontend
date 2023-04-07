<template>
	<section class="markdown">
		<div
			v-if="typeof description == 'string'"
			v-html="$md.render(description)"
		></div>
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

		const description = computed(() => {
			return props.data?.description ?? '';
		});

		return { t, description };
	},
});
</script>

<style scoped></style>
