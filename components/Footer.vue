<template>
	<footer
		class="container-fluid bg-tertiary flex flex-col items-center gap-7 pt-8 relative z-0"
	>
		<img
			src="/images/logo-text.png"
			:alt="t('AltAttributes.BootstrapAcademyLogo')"
			class="w-40 mb-5 md:mt-2 block lg:hidden object-contain"
		/>

		<nav class="flex flex-wrap justify-center gap-container">
			<NuxtLink
				v-for="({ label, pathname }, i) of webLinks"
				:key="i"
				:to="pathname"
			>
				{{ t(label) }}
			</NuxtLink>
		</nav>

		<article class="my-2.5 md:my-5 flex gap-10 justify-center">
			<a href="https://twitter.com/TheMorpheusTuts" target="_blank">
				<IconTwitter class="fill-accent transition-basic hover:scale-125" />
			</a>
			<a href="https://www.instagram.com/TheMorpheusTuts/" target="_blank">
				<IconInstagram class="fill-accent transition-basic hover:scale-125" />
			</a>
			<a href="https://www.youtube.com/user/themorpheus407" target="_blank">
				<IconYoutube class="fill-accent transition-basic hover:scale-125" />
			</a>
			<a href="https://github.com/Bootstrap-Academy" target="_blank">
				<IconGithub class="fill-accent transition-basic hover:scale-125" />
			</a>
		</article>

		<section
			class="w-full py-6 flex flex-wrap-reverse midXl:flex-nowrap gap-container justify-center border-t border-subheading"
		>
			<p class="text-sm text-subheading text-center md:text-left mt-0.5">
				Ⓒ {{ new Date().getFullYear() }}
				{{ t('Body.Copyright') }}
			</p>
			<nav
				class="flex flex-wrap gap-2.5 md:gap-5 justify-center text-sm text-subheading"
			>
				<template v-for="({ label, pathname }, i) of usefulLinks" :key="i">
					<span class="text-accent" v-if="i > 0">|</span>
					<NuxtLink :to="pathname" class="text-hover">
						{{ t(label) }}
					</NuxtLink>
				</template>
			</nav>
		</section>
	</footer>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  setup() {
    const { t } = useI18n();

    let webLinks = [
      {
        label: 'Links.Home',
        pathname: '/',
      },
      {
        label: 'Links.SkillTree',
        pathname: '/skill-tree',
      },
      {
        label: 'Links.Contact',
        pathname: '/contact',
      },
    ];

    let usefulLinks = [
      {
        label: 'Links.Privacy',
        pathname: '/docs/privacy',
      },
      {
        label: 'Links.TermsAndConditions',
        pathname: '/docs/terms-and-conditions',
      },
      {
        label: 'Links.Imprint',
        pathname: '/docs/imprint',
      },
    ];

    return {
      webLinks,
      usefulLinks,
      t,
    };
  },
});
</script>

<style scoped>
footer a {
	@apply transition-basic font-body text-base text-body;
}
</style>
