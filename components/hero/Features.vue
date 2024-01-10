<template>
	<section
		class="container-fluid container-py grid grid-auto gap-card"
		ref="aos"
	>
		<SectionTitle
			class="col-span-full place-self-center"
			heading="Headings.Features"
			subheading="Subheadings.Features"
			center
		/>

		<article
			class="transition-basic card bg-secondary rounded-lg"
			v-for="(icon, i) of features"
			:key="i"
		>
			<component
				class="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 fill-accent mx-auto mb-box"
				:is="icon"
			></component>
			<h3 class="text-heading-2 font-heading mb-2.5 mt-box mx-auto text-center">
				{{ t(`List.Features.${i + 1}.Heading`) }}
			</h3>
			<p class="font-body text-body text-body-2 mx-auto text-center">
				{{ t(`List.Features.${i + 1}.Body`) }}
			</p>
		</article>
	</section>
</template>

<script lang="ts">
import { CheckCircleIcon } from '@heroicons/vue/24/solid';
import { useI18n } from 'vue-i18n';

export default {
  components: { CheckCircleIcon },
  setup() {
    const { t } = useI18n();

    const aos = ref<HTMLDivElement | null>(null);

    let features = [
      CheckCircleIcon,
      CheckCircleIcon,
      CheckCircleIcon,
      CheckCircleIcon,
      CheckCircleIcon,
      CheckCircleIcon,
    ];

    onMounted(() => {
      setStaggeringAOSViaParent(aos.value, 'aos', 'show', [0]);
    });
    return { features, t, aos };
  },
};
</script>

<style scoped>
.grid-auto {
	grid-template-columns: repeat(1, minmax(0, 1fr));
}
@media screen and (min-width: 375px) {
	.grid-auto {
		grid-template-columns: repeat(auto-fit, minmax(325px, 1fr));
	}
}
@media screen and (min-width: 1024px) {
	.grid-auto {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
}
</style>
