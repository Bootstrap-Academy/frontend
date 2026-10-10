/**
 * For pages that decide or write from profile fields the `user` cookie does not
 * carry. `profileLoaded` says whether the profile is there. When the page finds
 * it missing - after a slow or failed load at app start, or after another tab
 * changed the account - the profile is requested once per account, starting
 * with the mounted page and without a timer. A failed request is reported like
 * a failed save, and only `loadProfile()` repeats it.
 */
export function useProfileLoad() {
  // Start from the account the cookies name now, as every request does.
  syncSessionCookies();
  const user = useUser();
  const profileLoaded = useProfileLoaded();
  const profileFailed = ref(false);
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
      () => [user.value?.id, profileLoaded.value],
      ([owner, loaded]) => {
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
