// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
	ssr: false,
	app: {
		pageTransition: { name: 'page', mode: 'out-in' },
		layoutTransition: { name: 'layout', mode: 'out-in' },
	},
	css: ['~/assets/css/tailwind.css'],
	postcss: {
		plugins: {
			tailwindcss: {},
			autoprefixer: {},
		},
	},
	runtimeConfig: {
		public: {
			BASE_API_URL: 'https://api-test.bootstrap.academy',
			BASE_WEB_URL: 'https://bootstrap-academy-frontend.pages.dev',
			Gleap_API_KEY: '8TVLuULNmWxZHIifA1PW6TYHUCKEb5so',
			Vue3ReCaptcha_SITE_KEY: '6Ldb070iAAAAAKsAt_M_ilgDbnWcF-N_Pj2DBBeP',
			ChallengesLoginURL: 'https://develop.coding-challenges.pages.dev/login',
			NODE_ENV: 'production',
		},
	},
});
