import { useDocumentVisibility } from "@vueuse/core";

/**
 * For pages that decide or write from profile fields the `user` cookie does not
 * carry. `profileLoaded` says whether the profile is there. When the page finds
 * it missing - after a slow or failed load at app start, or after another tab
 * changed the account - the profile is requested once per account, starting
 * with the mounted page and without a timer. A failed request is reported like
 * a failed save, and only `loadProfile()` repeats it. When the session has
 * ended and the page is looked at, the page is left for the login.
 */
export function useProfileLoad() {
  // Start from the account the cookies name now, as every request does.
  syncSessionCookies();
  const user = useUser();
  const accessToken = useAccessToken();
  const profileLoaded = useProfileLoaded();
  const profileFailed = ref(false);
  const route = useRoute();
  const visibility = useDocumentVisibility();
  let active = true;
  let profileOwner: string | null | undefined = null;

  async function loadProfile() {
    const owner = user.value?.id;
    // One request at a time; a second call only repeats a failed one.
    if (owner === profileOwner && !profileFailed.value) return;
    profileOwner = owner;
    profileFailed.value = false;
    const [, failure] = await getUser();
    if (!active || profileLoaded.value || user.value?.id !== owner) return;
    profileFailed.value = true;
    openSnackbar("error", failure || "Error.TryAgainLater");
  }

  onMounted(() =>
    watch(
      () => [user.value?.id, profileLoaded.value, accessToken.value, visibility.value],
      ([owner, loaded, token, seen]) => {
        // Once nobody is in the state, the next account is asked for, also the same one again.
        if (!owner) profileOwner = null;
        if (!token) {
          // The pages that use this require a login, so they leave with the session. A tab in
          // the background waits: the account may be signed in again before anyone looks.
          if (seen === "visible")
            navigateTo({ path: "/auth/login", query: { redirect: route.fullPath } });
          return;
        }
        if (owner && !loaded && owner !== profileOwner) loadProfile();
      },
      { immediate: true }
    )
  );
  onBeforeUnmount(() => {
    active = false;
  });

  return { profileLoaded, profileFailed, loadProfile };
}
