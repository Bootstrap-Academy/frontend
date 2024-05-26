<template>
	<section class="bg-secondary relative rounded shadow-xl md:col-span-2 h-fit">
		<img
			:src="companyImage"
			:alt="t('AltAttributes.CompanyLogo')"
			class="w-full h-52 object-cover brightness-50"
		/>

		<article class="card style-card bg-secondary">
			<div class="flex justify-between items-center gap-card flex-wrap-reverse">
				<p class="text-subheading-1 mb-0 text-accent flex gap-box items-center">
					<img
						:src="companyImage"
						:alt="t('AltAttributes.CompanyLogo')"
						class="object-cover w-7 h-7 rounded-3xl"
					/>
					{{ companyName }}
				</p>
				<p class="text-body-2 text-subheading text-right">{{ lastUpdated }}</p>
			</div>

			<h1 class="text-heading-1 mt-box mb-card-sm">{{ jobTitle }}</h1>

			<div class="flex items-center flex-wrap gap-card">
				<IconText v-for="(stat, i) of stats" :key="i" :icon="stat.icon" sm>
					{{ stat.value }}
				</IconText>
			</div>
		</article>

		<Btn class="absolute right-card top-card p-0" @click="applyForJob">
			{{ t('Buttons.ApplyNow') }}
		</Btn>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import {
  BriefcaseIcon,
  CurrencyDollarIcon,
  MapPinIcon,
} from '@heroicons/vue/24/solid';
import IconMorphcoin from '~/components/icon/Morphcoin.vue';

import { useI18n } from 'vue-i18n';

export default defineComponent({
  components: {
    BriefcaseIcon,
    CurrencyDollarIcon,
    MapPinIcon,
    IconMorphcoin,
  },
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();

    function applyForJob() {
      openDialog(
        'info',
        'Headings.ApplyForJob',
        t('Body.ApplyForJob', { placeholder: props.data?.contact ?? '---' }),
        true,
        {
          label: 'Buttons.Okay',
          onclick: () => {},
        },
        null
      );
    }

    const companyImage = computed(() => {
      return (
        props.data?.company?.logo_url ??
				`/images/about-${getRandomNumber(1, 5)}.webp`
      );
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

    const salaryPer = computed(() => {
      let _salaryPer = (props.data?.salary?.per ?? '').toLocaleLowerCase();
      switch (_salaryPer) {
      case 'once':
        return '';
      case 'task':
        return `/ ${t('Headings.Task').toLocaleLowerCase()}`;
      case 'hour':
        return `/ ${t('Headings.Hour').toLocaleLowerCase()}`;
      case 'day':
        return `/ ${t('Headings.Day').toLocaleLowerCase()}`;
      case 'month':
        return `/ ${t('Headings.Month').toLocaleLowerCase()}`;
      case 'year':
        return `/ ${t('Headings.Year').toLocaleLowerCase()}`;
      default:
        return _salaryPer;
      }
    });

    const salary = computed(() => {
      let min = props.data?.salary?.min ?? 0;
      let max = props.data?.salary?.max ?? 0;
      let unit = props.data?.salary?.unit ?? '';

      return `${abbreviateNumber(min)} - ${abbreviateNumber(max)} ${unit} ${
        salaryPer.value
      }`;
    });

    const salaryIcon = computed(() => {
      let unit = props.data?.salary?.unit ?? '';
      return unit == 'morphcoins' ? IconMorphcoin : CurrencyDollarIcon;
    });

    const type = computed(() => {
      let _type = (props.data?.type ?? '').toLocaleLowerCase();
      switch (_type) {
      case 'full_time':
        return t('Headings.FullTime');
      case 'part_time':
        return t('Headings.PartTime');
      case 'internship':
        return t('Headings.Internship');
      case 'temporary':
        return t('Headings.Temporary');
      case 'mini_job':
        return t('Headings.MiniJob');
      default:
        return _type;
      }
    });

    const stats = computed(() => {
      return [
        {
          icon: salaryIcon.value,
          value: salary.value,
        },
        {
          icon: BriefcaseIcon,
          value: type.value,
        },
        {
          icon: MapPinIcon,
          value: props.data?.location ?? '',
        },
      ];
    });

    const jobDescription = computed(() => {
      return props.data?.description ?? '';
    });

    return {
      t,
      companyImage,
      companyName,
      lastUpdated,
      jobTitle,
      stats,
      jobDescription,
      applyForJob,
    };
  },
});
</script>

<style scoped></style>
