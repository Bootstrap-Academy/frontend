<template>
	<article class="grid gap-x-card grid-cols-2 w-fit">
		<h4 class="text-heading-3 col-span-2 mb-3">{{ t('Headings.Duration') }}</h4>

		<div
			class="py-2 px-4 border border-success bg-success-light style-box w-fit"
		>
			<h5 class="text-body">{{ t('Headings.Start') }}</h5>
			<p class="text-heading">{{ data?.start }}</p>
		</div>

		<div class="py-2 px-4 border border-error bg-error-light style-box w-fit">
			<h5 class="text-body">{{ t('Headings.End') }}</h5>
			<p class="text-heading">{{ data?.end }}</p>
		</div>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import type { PropType } from 'vue';

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();

    return { t };
  },
});
</script>

<style scoped></style>
