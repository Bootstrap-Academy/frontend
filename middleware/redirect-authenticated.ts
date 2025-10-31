export default defineNuxtRouteMiddleware((to) => {
  const accessToken = useCookie("accessToken");

  if (!!accessToken.value && to.path === "/") {
    return navigateTo("/dashboard");
  }
});
