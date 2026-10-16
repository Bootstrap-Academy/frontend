import { guestReturnPath } from "~/utils/guest/handoff";
import { schedulePageTop } from "~/utils/pageTop";

export default defineNuxtRouteMiddleware((to, from) => {
  // A target with an anchor is left to the router, which moves to the named section.
  // A page that brings its own content into view cancels this (`utils/pageTop.ts`).
  if (to.path !== from.path && !to.hash && import.meta.client) schedulePageTop();

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
