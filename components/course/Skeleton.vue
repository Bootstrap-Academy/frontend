<template>
	<main
		class="relative h-screen-main min container-fluid mt-main mb-main grid gap-container grid-cols-1 md:grid-cols-[1fr_275px] xl:grid-cols-[1fr_350px]"
	>
		<header
			class="md:col-span-2 grid gap-5 md:gap-x-10 grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[300px_1fr_auto] h-fit"
		>
			<SkeletonMedia
				class="h-[200px] sm:h-[250px] w-full rounded-md shadow-xl md:row-span-2 lg:row-span-1"
			/>

			<div>
				<SkeletonText sm />
				<SkeletonText lg class="mt-card-sm w-3/5" />
				<SkeletonText lg class="mt-box mb-card w-2/5" />
				<SkeletonText sm body />
			</div>

			<SkeletonText
				sm
				body
				class="mt-card min-w-[75px] w-[75px] max-w-[75px] h-fit"
			/>
		</header>

		<section class="card style-card bg-secondary">
			<article>
				<h2 class="mb-box text-heading-3">{{ t('Headings.Description') }}</h2>
				<SkeletonText body />
				<SkeletonText body class="mt-box mb-box" />
				<SkeletonText body />
			</article>

			<article class="mt-card mb-card">
				<h2 class="mb-box text-heading-3">{{ t('Headings.LearningGoals') }}</h2>
				<SkeletonList id="skeletonLearningGoals" checklist />
			</article>

			<article>
				<h2 class="mb-box text-heading-3">{{ t('Headings.Requirements') }}</h2>
				<SkeletonList id="skeletonRequirements" />
			</article>
		</section>

		<section
			class="card style-card bg-secondary md:row-span-2 md:sticky md:top-container md:self-start col-start-1 row-start-2 md:col-start-[initial] md:row-start-[initial]"
		>
			<article class="mx-auto w-fit">
				<p class="text-subheading text-body-1 uppercase">
					{{ t('Headings.Price') }}
				</p>

				<div class="flex items-end gap-box mt-2">
					<div
						class="transition-basic animate-pulse rounded-3xl bg-[#42546e] p-2 w-[50px]"
					></div>
					<p class="m-0 text-body-1">
						{{ t('Headings.Morphcoins') }}
					</p>
				</div>
			</article>

			<hr class="mt-4 mb-8" />

			<div class="grid gap-box">
				<IconText
					v-for="({ icon }, i) of stats"
					:key="i"
					:icon="icon"
					lg
					highlight-label
				>
					<SkeletonText body class="min-w-[75px] mt-2" />
				</IconText>
			</div>

			<hr class="my-8" />

			<Btn full>
				<span class="text-accent">{{ t('Buttons.EnrollNow') }}</span>
			</Btn>
		</section>

		<section>
			<h2 class="mb-box text-heading-3">
				{{ t('Headings.CourseCurriculum') }}
			</h2>

			<section class="card style-card bg-secondary grid gap-card">
				<div v-for="n in 3" :key="n">
					<hr v-if="n > 0" class="mb-card" />

					<header class="flex justify-between items-center cursor-pointer">
						<div>
							<p class="text-xs mb-1 uppercase tracking-[2px]">
								{{ t('Headings.Section') }} {{ n }}
							</p>
							<SkeletonText class="flex-shrink-0 mt-5" />
						</div>
						<ChevronDownIcon class="w-5 h-5 text-accent" />
					</header>

					<div v-if="n == 1" class="grid gap-card-sm pt-card-sm">
						<article
							class="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-box items-center"
							v-for="j in 3"
							:key="j"
						>
							<PlayIconSolid
								class="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 fill-accent"
							/>

							<SkeletonText class="flex-shrink-0" />

							<SkeletonText body class="flex-shrink-0 min-w-fit" />
						</article>
					</div>
				</div>
			</section>
		</section>
	</main>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';
import {
  ClockIcon,
  PlayIcon,
  KeyIcon,
  LanguageIcon,
  ChevronDownIcon,
} from '@heroicons/vue/24/outline';

import { PlayIcon as PlayIconSolid } from '@heroicons/vue/24/solid';

export default {
  components: {
    ClockIcon,
    PlayIcon,
    KeyIcon,
    LanguageIcon,
    ChevronDownIcon,
    PlayIconSolid,
  },
  setup() {
    const { t } = useI18n();

    const stats = computed(() => {
      return [
        {
          icon: ClockIcon,
        },
        {
          icon: PlayIcon,
        },
        {
          icon: KeyIcon,
        },
        {
          icon: LanguageIcon,
        },
      ];
    });

    return { t, stats };
  },
};
</script>

<style scoped></style>
