<template>
	<article>
		<h4 class="text-heading-3">{{ t('Headings.Limits') }}</h4>
		<ul>
			<li
				v-for="limit of limits"
				:key="limit"
				class="list-item list-disc list-inside pl-4"
			>
				{{ limit }}
			</li>
		</ul>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { PropType } from 'vue';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
	},
	setup(props) {
		const { t } = useI18n();

		const limits = computed(() => {
			return props.data?.limits ?? '';
		});

		return { t, limits };
	},
});
</script>

<style scoped></style>
