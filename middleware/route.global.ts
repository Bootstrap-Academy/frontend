export default defineNuxtRouteMiddleware((to, from) => {
	if (to.path !== from.path && process.client) {
		setTimeout(() => {
			window.scrollTo({
				top: 0,
				left: 0,
				behavior: 'smooth',
			});
		}, 400);
	}

	if (to.path == '/privacy' || to.path == '/datenschutz') {
		return navigateTo('/docs/privacy');
	}
});
