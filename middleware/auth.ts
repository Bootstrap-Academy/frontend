export default defineNuxtRouteMiddleware((to, from) => {
  const cookie_accessToken = useAppCookie("accessToken");
  if (!!!cookie_accessToken.value) {
    return navigateTo("/auth/login");
  }
});
