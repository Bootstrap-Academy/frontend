/** Before Nuxt reloads after an update or a failed chunk, it copies the whole app state
 * (tokens, profile, drafts) into this tab's Session Storage. This app never restores it
 * (`experimental.restoreState` stays off), so the copy must not outlive the reload. */
export default defineNuxtPlugin(() => {
  try {
    window.sessionStorage.removeItem("nuxt:reload:state");
  } catch {
    /* Blocked storage holds no reload state. */
  }
});
