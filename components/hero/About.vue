<template>
	<section
		class="container-fluid flex gap-container flex-wrap lg:flex-nowrap items-center"
	>
		<article class="gallery gap-card-sm max-w-3xl mx-auto min-w-[250px]">
			<img
				src="/images/about-1.webp"
				class="rounded shadow-md object-cover w-full h-full row-span-2"
				:alt="t('AltAttributes.CodingImage')"
			/>
			<img
				src="/images/about-4.webp"
				class="rounded shadow-md object-cover w-full h-full"
				:alt="t('AltAttributes.CodingImage')"
			/>
			<img
				src="/images/about-3.webp"
				class="rounded shadow-md object-cover w-full h-full"
				:alt="t('AltAttributes.CodingImage')"
			/>
		</article>

		<article class="max-w-3xl mx-auto">
			<SectionTitle
				class="mb-10"
				heading="Headings.About"
				subheading="Subheadings.About"
				full
				body="Body.About"
			/>

			<div class="flex gap-5 my-3 sm:items-center" v-for="n in 4" :key="n">
				<CheckCircleIcon
					class="w-7 h-7 min-w-[1.75rem] min-h-[1.75rem] fill-accent"
				/>
				<p class="text-sm">
					{{ t(`List.About.${n}`) }}
				</p>
			</div>
		</article>
	</section>
</template>

<script>
import { CheckCircleIcon } from '@heroicons/vue/24/solid';
import { useI18n } from 'vue-i18n';

export default {
  components: { CheckCircleIcon },
  setup() {
    const { t } = useI18n();

    return { t };
  },
};
</script>

<style scoped>
.gallery {
	display: grid;
	grid-template-columns: 1fr 0.65fr;
	grid-template-rows: repeat(2, minmax(0, 1fr));
	width: 100%;
	height: 20vh;
}
@media (min-width: 768px) {
	.gallery {
		height: 40vh;
	}
}

@media (min-width: 1024px) {
	.gallery {
		width: 60vw;
	}
}
@media (min-width: 1200px) {
	.gallery {
		min-width: 35vw;
		height: min(50vh, 40em);
	}
}
</style>
