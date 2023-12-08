<template>
	<main
		class="container-fluid pt-container pb-container grid gap-container items-start grid-cols-1 md:grid-cols-[1fr_250px] xl:grid-cols-[1fr_350px]"
	>
		<section
			class="bg-secondary relative rounded shadow-xl md:col-span-2 h-fit"
		>
			<SkeletonMedia class="w-full h-52" />

			<article class="card style-card bg-secondary">
				<div
					class="flex justify-between items-center gap-card flex-wrap-reverse"
				>
					<div
						class="text-subheading-1 mb-0 text-accent flex gap-box items-center"
					>
						<SkeletonMedia class="w-7 h-7 rounded-3xl" />

						<SkeletonText sm />
					</div>

					<div
						class="transition-basic animate-pulse rounded-3xl bg-[#42546e] p-1 w-[50px]"
					></div>
				</div>

				<SkeletonText lg class="flex-shrink-0 mt-box mb-card-sm" />

				<article class="flex items-center flex-wrap gap-card">
					<IconText
						v-for="(stat, i) of statsHeader"
						:key="i"
						:icon="stat.icon"
						sm
					>
						<div
							class="transition-basic animate-pulse rounded-3xl bg-[#42546e] p-1 w-[50px] mt-1.5"
						></div>
					</IconText>
				</article>
			</article>

			<Btn class="absolute right-card top-card">
				{{ t('Buttons.ApplyNow') }}
			</Btn>
		</section>

		<div>
			<h2 class="mb-box text-heading-3">{{ t('Headings.JobDetails') }}</h2>
			<section class="card style-card bg-secondary grid gap-card">
				<article>
					<h2 class="mb-box text-heading-3">{{ t('Headings.Description') }}</h2>
					<SkeletonText body />
					<SkeletonText body class="mt-box mb-box" />
					<SkeletonText body />
				</article>

				<article>
					<h2 class="mb-box text-heading-3">
						{{ t('Headings.Responsibilities') }}
					</h2>

					<SkeletonList id="SkeletonResponsibilities" />
				</article>

				<article>
					<h2 class="mb-box text-heading-3">
						{{ t('Headings.SkillRequirements') }}
					</h2>
					<SkeletonList id="SkeletonSkillRequirements" points />
				</article>
			</section>
		</div>

		<div class="md:sticky md:container-top md:self-start">
			<h2 class="mb-box text-heading-3">{{ t('Headings.JobOverview') }}</h2>
			<section class="card style-card bg-secondary grid gap-card">
				<article v-for="(stat, i) of statsOverview" :key="i">
					<p class="text-sm">{{ t(stat.heading) }}</p>
					<Chip v-if="stat.chip" color="bg-info" class="w-fit mt-3">
						<span class="text-info">Remote</span>
					</Chip>
					<SkeletonText v-else class="mt-3 max-w-[80%]" />
				</article>
			</section>
		</div>
	</main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  BriefcaseIcon,
  CurrencyDollarIcon,
  MapPinIcon,
} from '@heroicons/vue/24/solid';

export default defineComponent({
  components: { BriefcaseIcon, CurrencyDollarIcon, MapPinIcon },
  setup() {
    const { t } = useI18n();

    const statsHeader = computed(() => {
      return [
        {
          icon: CurrencyDollarIcon,
        },
        {
          icon: BriefcaseIcon,
        },
        {
          icon: MapPinIcon,
        },
      ];
    });

    const statsOverview = computed(() => {
      return [
        {
          heading: 'Headings.Experience',
        },
        {
          heading: 'Headings.ProfessionalLevel',
        },
        {
          heading: 'Headings.EmploymentType',
        },
        {
          heading: 'Headings.OfferSalary',
        },
        {
          heading: 'Headings.Location',
        },
        {
          heading: 'Headings.JobEnvironment',
          chip: true,
        },
        {
          heading: 'Headings.Contact',
        },
        {
          heading: 'Headings.LastUpdated',
        },
      ];
    });

    return { t, statsHeader, statsOverview };
  },
});
</script>

<style scoped></style>
