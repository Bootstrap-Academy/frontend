/**
 * Restores the session from the cookies into the application state and loads
 * the profile of the logged in user before the application is mounted.
 *
 * The `user` cookie only holds the id, the nickname and the display name, so
 * everything else (e-mail address, invoice address, ...) has to come from the
 * API.
 */

// Never let a slow or unreachable API keep the interface from rendering.
const PROFILE_TIMEOUT = 5000;

export default defineNuxtPlugin(async () => {
  restoreStates();

  if (!!!getAccessToken()) return;

  await Promise.race([getUser(), new Promise((resolve) => setTimeout(resolve, PROFILE_TIMEOUT))]);
});
