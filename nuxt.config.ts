// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
	app: {
		pageTransition: { name: 'page', mode: 'out-in' },
		layoutTransition: { name: 'layout', mode: 'out-in' },
	},
	buildModules: ['@nuxtjs/tailwindcss'],
	runtimeConfig: {
		public: {
			BASE_API_URL: 'https://api.bootstrap.academy',
			BASE_WEB_URL: 'https://bootstrap.academy',
			Gleap_API_KEY: '8TVLuULNmWxZHIifA1PW6TYHUCKEb5so',
			Vue3ReCaptcha_SITE_KEY: '6Le9pMIiAAAAAAMmaH3J7ZCsQk6JcBdQtAJNXaQJ',
			ChallengesLoginURL: 'https://the-morpheus.cc/login',
			NODE_ENV: 'production',
		},
	},
});
