<template>
	<article
		class="card md:card-sm style-card bg-secondary w-full h-fit flex flex-col gap-box"
	>
		<div class="flex justify-between items-center">
			<p class="text-body-2 text-accent">{{ companyName }}</p>
			<p class="text-body-2 text-subheading">{{ lastUpdated }}</p>
		</div>
		<h3 class="text-heading-2">{{ jobTitle }}</h3>

		<article class="flex items-center flex-wrap gap-x-card gap-y-2">
			<IconText v-for="(stat, i) of stats" :key="i" :icon="stat.icon" sm>
				<span :class="{ capitalize: stat.capitalize }">{{ stat.value }}</span>
			</IconText>
		</article>
		<!-- <p class="clamp line-2 w-full text-body-2 h-full">
			{{ jobDescription }}
		</p> -->

		<NuxtLink :to="link" class="self-end mt-box">
			<Btn sm>{{ t('Buttons.ViewDetails') }}</Btn>
		</NuxtLink>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  BriefcaseIcon,
  CurrencyDollarIcon,
  MapPinIcon,
} from '@heroicons/vue/24/solid';
import IconMorphcoin from '~/components/icon/Morphcoin.vue';

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  components: {
    BriefcaseIcon,
    CurrencyDollarIcon,
    MapPinIcon,
    IconMorphcoin,
  },
  setup(props) {
    const { t } = useI18n();

    const jobID = computed(() => {
      return props.data?.id ?? '';
    });

    const companyName = computed(() => {
      return props.data?.company?.name ?? '';
    });

    const jobTitle = computed(() => {
      return props.data?.title ?? '';
    });

    const lastUpdated = computed(() => {
      let timestamp = props.data?.last_update ?? null;
      if (!!!timestamp) return ``;

      return `${get_x_timeAgo(timestamp)}`;
    });

    const salary = computed(() => {
      let min = props.data?.salary?.min ?? 0;
      let max = props.data?.salary?.max ?? 0;
      let per = props.data?.salary?.per ?? '';
      return `${abbreviateNumber(min)} - ${abbreviateNumber(max)} ${
        per != 'once' ? '/' : ''
      } ${per}`;
    });

    const salaryIcon = computed(() => {
      let unit = props.data?.salary?.unit ?? '';
      return unit == 'morphcoins' ? IconMorphcoin : CurrencyDollarIcon;
    });

    const stats = computed(() => {
      return [
        {
          icon: salaryIcon.value,
          value: salary.value,
          capitalize: false,
        },
        {
          icon: BriefcaseIcon,
          value: (props.data?.type ?? '').replace('_', ' '),
          capitalize: true,
        },
        {
          icon: MapPinIcon,
          value: props.data?.location ?? '',
          capitalize: true,
        },
      ];
    });

    const jobDescription = computed(() => {
      return props.data?.description ?? '';
    });

    const link = computed(() => {
      return `/jobs/${jobID.value}`;
    });

    return {
      t,
      companyName,
      lastUpdated,
      jobTitle,
      stats,
      jobDescription,
      link,
    };
  },
});
</script>

<style scoped></style>
