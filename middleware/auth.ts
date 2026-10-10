export default defineNuxtRouteMiddleware((to, from) => {
  const cookie_accessToken = useAppCookie("accessToken");
  if (!!!cookie_accessToken.value) {
    // The login leads back to the page that was asked for, as it does for a
    // page that loses its session while it is open (`useProfileLoad`).
    return navigateTo({ path: "/auth/login", query: { redirect: to.fullPath } });
  }
});
