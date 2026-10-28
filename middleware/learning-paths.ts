import { learningPathsAvailable } from "~/composables/learningPlan";

/**
 * The learning journey (`/path`, `/path/<track>`) needs the learning paths of skills-ms. Where
 * the service has none yet, its pages lead home without a word: an account to its dashboard,
 * a visitor to the start page, because the dashboard would only ask a visitor to log in.
 */
export default defineNuxtRouteMiddleware(async () => {
  if (await learningPathsAvailable()) return;
  return navigateTo(useAppCookie("accessToken").value ? "/dashboard" : "/", { replace: true });
});
