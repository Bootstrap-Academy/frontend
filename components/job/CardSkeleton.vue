<template>
	<article
		class="card md:card-sm style-card bg-secondary w-full flex flex-col gap-box"
	>
		<div class="flex justify-between items-center">
			<SkeletonText sm class="flex-shrink-0" color="bg-accent" />
			<div
				class="transition-basic animate-pulse rounded-3xl bg-[#42546e] p-2 w-[50px]"
			></div>
		</div>
		<SkeletonText class="flex-shrink-0" />

		<article class="flex items-center flex-wrap gap-x-card gap-y-2 mt-1">
			<IconText v-for="(stat, i) of stats" :key="i" :icon="stat.icon" sm>
				<div
					class="transition-basic animate-pulse rounded-3xl bg-[#42546e] p-1 w-[50px]"
				></div>
			</IconText>
		</article>

		<div>
			<SkeletonText class="flex-shrink-0" sm body />
			<SkeletonText class="flex-shrink-0 my-2" sm body />
			<SkeletonText class="flex-shrink-0" sm body />
		</div>

		<Btn sm class="self-end mt-box h-fit">
			<span class="text-accent">View Details</span>
		</Btn>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import {
  BriefcaseIcon,
  CurrencyDollarIcon,
  MapPinIcon,
} from '@heroicons/vue/24/solid';

export default defineComponent({
  components: { BriefcaseIcon, CurrencyDollarIcon, MapPinIcon },
  setup(props) {
    const stats = computed(() => {
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

    return { stats };
  },
});
</script>

<style scoped></style>
