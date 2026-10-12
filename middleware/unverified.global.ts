/**
 * An account whose e-mail address is not confirmed is sent to the confirmation
 * from every page that would offer it something the server declines.
 *
 * Global middleware runs in the order of the file names, so this one follows
 * `route.global.ts`: the old addresses of the legal documents are resolved
 * before the rule looks at the target.
 */
export default defineNuxtRouteMiddleware((to) => {
  const confirmation = emailVerificationRedirect(useUser().value, useProfileLoaded().value, to);

  if (confirmation) return navigateTo(confirmation);
});
