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

	if (
		(!to.path.includes('/docs/privacy') && to.path.includes('/privacy')) ||
		to.path.includes('/datenschutz')
	) {
		return navigateTo('/docs/privacy');
	}

	const cookie_accessToken = useCookie('accessToken');
	if (to.path.includes('/auth/login') && !!cookie_accessToken.value) {
		return navigateTo('/profile');
	}
});
