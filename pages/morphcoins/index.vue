<template>
	<main class="container mt-main mb-main">
		<SectionTitle
			subheading="Subheadings.GetMorphcoins"
			heading="Headings.GetMorphcoins"
			body="Body.GetMorphcoins"
			center
			full
		/>

		<section
			class="bg-secondary card style-card w-full grid gap-card mt-card mb-card"
		>
			<article
				v-for="(option, i) of options"
				:key="option.type"
				class="bg-primary card style-card grid gap-1 gap-x-4 md:gap-x-5 grid-cols-[auto_1fr]"
			>
				<div class="bg-tertiary box style-box flex-shrink-0 row-span-2 h-fit">
					<component
						class="text-accent"
						:class="
							option.lg ? 'w-6 h-6 xl:w-7 xl:h-7' : 'w-5 h-5 xl:w-6 xl:h-6'
						"
						:is="option.icon"
					></component>
				</div>

				<h3
					class="text-heading-3 flex gap-card self-center justify-between items-center"
				>
					{{ t(`List.GetMorphcoins.${i + 1}.Heading`) }}
				</h3>

				<p class="text-body-2 text-body col-span-2 sm:col-span-1">
					{{ t(`List.GetMorphcoins.${i + 1}.Body`) }}
				</p>

				<NuxtLink
					:to="option.pathname"
					class="col-span-2 justify-self-end mt-box"
				>
					<Btn sm>{{ t(option.button) }}</Btn>
				</NuxtLink>
			</article>
		</section>

		<div class="text-center">
			<a secondary>{{ t('Body.MoreComingSoon') }}</a>
		</div>
	</main>
</template>

<script lang="ts">
definePageMeta({
  middleware: ['auth'],
});

import {
  AcademicCapIcon,
  BriefcaseIcon,
  UserGroupIcon,
  IdentificationIcon,
  ShoppingCartIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/vue/24/outline';
import IconBug from '~/components/icon/Bug.vue';
import IconCoaching from '~/components/icon/Coaching.vue';
import { useI18n } from 'vue-i18n';

export default {
  head: {
    title: 'Get Morphcoins without paying',
  },
  components: {
    AcademicCapIcon,
    BriefcaseIcon,
    UserGroupIcon,
    IdentificationIcon,
    ShoppingCartIcon,
    IconBug,
    IconCoaching,
    ChatBubbleLeftIcon,
  },
  setup() {
    const { t } = useI18n();

    let options = [
      {
        icon: ShoppingCartIcon,
        button: 'Buttons.GoToShop',
        pathname: '/morphcoins/buy',
        type: 'buy',
      },
      {
        icon: BriefcaseIcon,
        button: 'Buttons.ExploreJobs',
        pathname: '/jobs',
        type: 'jobs',
      },
      {
        icon: AcademicCapIcon,
        button: 'Buttons.ContactUs',
        pathname: '/contact',
        type: 'lectures',
      },
      {
        icon: UserGroupIcon,
        button: 'Buttons.ExploreSkill',
        pathname: '/skill-tree/it_paedagoge_und_dozent',
        type: 'webinars',
      },
      {
        icon: IconCoaching,
        button: 'Buttons.ExploreSkill',
        pathname: '/skill-tree/it_paedagoge_und_dozent',
        type: 'coach',
      },
      {
        icon: IconBug,
        lg: true,
        button: 'Buttons.ContactUs',
        pathname: '/contact',
        type: 'bugBounty',
      },
    ];

    return { options, t };
  },
};
</script>

<style scoped>
</style>
