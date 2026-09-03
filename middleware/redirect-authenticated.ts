export default defineNuxtRouteMiddleware((to) => {
  const accessToken = useAppCookie("accessToken");

  if (!!accessToken.value && to.path === "/") {
    return navigateTo("/dashboard");
  }
});
