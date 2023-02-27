<template>
	<!-- <article class="box style-box bg-secondary flex gap-box w-full">
		<img :src="`/svgs/{{img}}.svg`" alt="" class="w-12 h-12 object-contain" />

		<div>
			<h3 class="text-heading-4">{{ data.question }}</h3>
			<p class="my-1 mb-2">{{ data.type }}</p>
			<p v-if="data && data.price > 0">
				{{
					t(
						'Headings.Morphcoins',
						{ n: abbreviateNumber(data.price) },
						data.price
					)
				}}
			</p>
			<Chip v-else sm color="chip-color-6" class="w-fit">
				{{ t('Headings.Free') }}
			</Chip>
		</div>
	</article> -->

	<!-- <article class="box style-box bg-secondary w-full">
		<h3 class="text-heading-4">Q). {{ data.question }}</h3>
		<div class="flex justify-between gap-box items-center">
			<p class="text-body-2">{{ data.type }}</p>

			<p
				class="text-body-2 py-0.5 px-2.5 bg-error-light border border-dashed border-error text-heading style-box"
				v-if="data && data.price > 0"
			>
				{{ data.price }} MC
			</p>
			<Chip
				v-if="data && data.price <= 0"
				xs
				color="chip-color-6"
				class="w-fit"
			>
				{{ t('Headings.Free') }}
			</Chip>
		</div>
	</article> -->

	<article class="box style-box bg-secondary w-full cursor-pointer">
		<h3 class="text-heading-4">Q). {{ data.question }}</h3>
		<div class="flex justify-between gap-box items-center">
			<p class="text-body-2">{{ data.type }}</p>
			<Chip
				v-if="data && data.price <= 0"
				xs
				color="chip-color-6"
				class="w-fit"
			>
				{{ t('Headings.Free') }}
			</Chip>
		</div>
	</article>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
	},
	setup() {
		const { t } = useI18n();

		const route = useRoute();

		const img = computed(() => {
			return route?.query?.skill ?? '';
		});
		return { t, img };
	},
});
</script>

<style scoped></style>
