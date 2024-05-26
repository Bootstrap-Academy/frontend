<template>
	<article
		class="relative bg-secondary rounded-lg shadow-lg overflow-hidden flex items-end min-h-[175px] min-w-[175px] max-w-[150px] md:max-w-none md:min-w-[150px] h-full"
	>
		<img
			:src="image"
			:alt="t('AltAttributes.CourseCover')"
			class="absolute top-0 left-0 w-full h-full object-cover"
		/>
		<div
			class="relative py-3 px-4 bg-primary/10 backdrop-blur-xl w-full h-fit overflow-hidden rounded-lg"
		>
			<h3 class="text-heading-2 font-semibold clamp tight line-3">
				{{ title }}
			</h3>
			<p class="text-body-1 mt-1 clamp line-1">{{ description }}</p>
		</div>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type {  PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();
	
    const image = computed(() => {
      return props.data?.image ?? `/images/about-${getRandomNumber(1, 5)}.webp`;
    });

    const title = computed(() => {
      return props.data?.title ?? '';
    });

    const description = computed(() => {
      return props.data?.description ?? '';
    });

    return { t, image, title, description };
  },
});
</script>

<style scoped></style>
