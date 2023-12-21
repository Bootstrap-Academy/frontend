<!--
❌ Responsive UI
✅ Page Title
✅ Translation
❌ Animation

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Recaptcha
✅ Api implemented
✅ Form Client Side Error Handling
✅ Form Submission Process
✅ Form Post Api Error Handling + ✅ Translation
✅ Form Post Api Success Handling + ✅ Translation
-->

<template>
	<main
		class="container-fluid pt-container pb-container h-screen-inner min grid gap-container grid-cols-1 midXl:grid-cols-[auto_minmax(0,0.8fr)] items-center"
	>
		<section class="container-form">
			<h3 class="text-center text-heading-3 mb-2">
				{{ t('Forms.Login') }}
			</h3>
			<p class="text-body-1 mb-6 md:mb-8">{{ t('Body.ChallengesNickname') }}</p>

			<FormLogin />
		</section>

		<article class="hidden midXl:flex gap-8 flex-col items-center">
			<SectionTitle
				center
				subheading="Buttons.Login"
				heading="Headings.WelcomeBack"
				body="Body.Login"
			/>
			<SvgLogin />
		</article>
	</main>
</template>

<script>
import { useI18n } from 'vue-i18n';

definePageMeta({
  layout: 'inner',
});

export default {
  head: {
    title: 'Login',
  },
  setup() {
    const { t } = useI18n();

    onMounted(async () => {
      await getOAuthProviders();
    });

    return { t };
  },
};
</script>

<style scoped></style>
