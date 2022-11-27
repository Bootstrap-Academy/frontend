export default defineNuxtRouteMiddleware((to, from) => {
	if (to.path !== from.path && process.client) {
		setTimeout(() => {
			window.scrollTo({
				top: 0,
				left: 0,
				behavior: 'smooth',
			});
		}, 450);
	}

	if (to.path == '/privacy' || to.path == '/datenschutz') {
		return navigateTo('/docs/privacy');
	}

	const cookie_accessToken = useCookie('accessToken');
	if (to.path == '/auth/login' && !!cookie_accessToken.value) {
		return navigateTo('/profile');
	}
});
