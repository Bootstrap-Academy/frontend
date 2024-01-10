export default defineNuxtRouteMiddleware((to, from) => {
  const cookie_accessToken = useCookie('accessToken');
  if (!!!cookie_accessToken.value) {
    return navigateTo('/auth/login');
  }
});
