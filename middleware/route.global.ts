import { guestReturnPath } from "~/utils/guest/handoff";

export default defineNuxtRouteMiddleware((to, from) => {
  // A target with an anchor is left to the router, which moves to the named section.
  if (to.path !== from.path && !to.hash && import.meta.client) {
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }, 450);
  }

  if (
    (!to.path.includes("/docs/privacy") && to.path.includes("/privacy")) ||
    (to.path.includes("/datenschutz") && !to.path.includes("/skill-tree"))
  ) {
    return navigateTo("/docs/privacy");
  }

  if (to.path.includes("impressum")) {
    return navigateTo("/docs/imprint");
  }

  const cookie_accessToken = useAppCookie("accessToken");

  if (to.path.includes("/auth/login") && !!cookie_accessToken.value) {
    return navigateTo(guestReturnPath() || "/dashboard");
  }
});
