<!--
✅ Responsive UI
✅ Page Title
✅ Translation
❌ Animation

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
✅ Tested on android mobile
✅ Tested on apple mobile

✅ Handle loading if data already exists
✅ Handle loading if data is empty
✅ Display data
✅ Handle empty state 

✅ Api implemented
-->

<template>
	<main class="container-fluid mt-main mb-main grid-layout-aside">
		<JobFilter
			class="hidden lg:block aside sticky self-start bg-transparent w-full h-fit top-container"
			:filters="filters"
			@filters="setFilters($event)"
		/>

		<Transition class="block lg:hidden" name="fade-in" mode="in-out">
			<section
				v-if="show"
				@click.self="show = false"
				class="h-screen w-screen bg-[#0b192edd] fixed left-0 top-0 z-[99999] overflow-scroll"
			>
				<XCircleIcon
					@click="show = false"
					class="slide-left w-10 h-10 text-accent fixed left-[82.5vw] sm:left-[370px] top-card cursor-pointer"
				/>

				<JobFilter
					class="bg-secondary w-full max-w-[80vw] sm:max-w-[350px] slide-left min-h-screen"
					:filters="filters"
					@filters="setFilters($event)"
				/>
			</section>
		</Transition>

		<article class="flex items-center justify-between lg:justify-end gap-card">
			<FormSearch
				class="justify-self-end"
				placeholder="Body.SearchJobs"
				:modelValue="filters.search_term"
				@update:modelValue="setFilters({ search_term: $event })"
			/>

			<div
				class="block lg:hidden bg-tertiary p-1.5 rotate-90 rounded-lg h-fit w-fit cursor-pointer"
				@click="show = true"
			>
				<AdjustmentsVerticalIcon class="w-5 h-5 text-accent" />
			</div>
		</article>

		<Sort :quantity="jobs.length" @selected="onSelectedOption($event)" />

		<section class="grid grid-auto gap-card place-content-start">
			<template v-if="loading">
				<JobCardSkeleton v-for="n in 5" :key="n" :index="n" />
			</template>

			<template v-else-if="jobs && jobs.length > 0">
				<NuxtLink
					v-for="job of jobs"
					:key="job.id"
					:to="`/jobs/${job.id}`"
					class="cursor-pointer w-full block h-fit"
				>
					<JobCard :data="job" />
				</NuxtLink>
			</template>

			<JobCardEmptyState class="col-span-full" v-else />
		</section>
	</main>
</template>

<script lang="ts">
import type { Ref } from 'vue';
import { AdjustmentsVerticalIcon, XCircleIcon } from '@heroicons/vue/24/solid';

definePageMeta({
  middleware: ['auth'],
});

export default {
  head: {
    title: 'Explore Jobs',
  },
  components: { AdjustmentsVerticalIcon, XCircleIcon },
  setup() {
    const jobs: Ref<any[]> = useJobs();

    const loading = ref(!(jobs.value && jobs.value.length > 0));

    const cookie_filters = <any>useCookie('job_filters');
    const filters = reactive(
      cookie_filters.value ?? {
        type: [],
        remote: false,
        search_term: '',
        requirements_met: false,
        professional_level: [],
        salary_min: 0,
        salary_unit: '---',
      }
    );

    async function setFilters(paramFilters: any) {
      Object.assign(filters, {
        ...filters,
        ...paramFilters,
      });

      cookie_filters.value = JSON.stringify(filters);

      // loading.value = !(jobs.value && jobs.value.length > 0);
      loading.value = true;
      await Promise.all([getFilteredJobs(filters), getJobMaxSalary()]);
      loading.value = false;
    }

    function onSelectedOption(option: string) {
      setFilters({ requirements_met: option == 'bestMatch' });

      if (option == 'latest' && jobs.value && jobs.value.length > 0) {
        jobs.value.sort(function (x, y) {
          return x.last_update - y.last_update;
        });
      }
    }

    const show = ref(false);
    return {
      loading,
      jobs,
      filters,
      setFilters,
      onSelectedOption,
      show,
    };
  },
};
</script>

<style scoped>
.grid-layout-aside {
	@apply grid gap-x-container gap-y-card grid-rows-[auto_auto_1fr] lg:grid-cols-[275px_1fr];
}

.grid-layout-aside .aside {
	@apply lg:row-span-3;
}

.grid-auto {
	grid-template-columns: repeat(auto-fit, minmax(275px, 1fr));
}

@media screen and (min-width: 1024px) {
	.grid-auto {
		grid-template-columns: repeat(auto-fit, minmax(325px, 1fr));
	}
}

.slide-left {
	animation: slideLeft 0.25s ease-out forwards;
}

@keyframes slideLeft {
	0% {
		opacity: 0;
		transform: translateX(-30px);
	}
	100% {
		opacity: 1;
		transform: translateX(0);
	}
}
</style>
