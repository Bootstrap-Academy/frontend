import { VueReCaptcha } from 'vue-recaptcha-v3';

export default defineNuxtPlugin(({ vueApp }) => {
	const config = useRuntimeConfig();

	vueApp.use(VueReCaptcha, {
		siteKey: config.Vue3ReCaptcha_SITE_KEY,
		loaderOptions: {
			useRecaptchaNet: true,
			autoHideBadge: true,
		},
	});
});
