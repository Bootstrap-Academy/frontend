/** Cookie refresh signals carry no credentials; always reread the shared jar. */
export default defineNuxtPlugin((app) => {
  const cookies = ["authGeneration", "accessToken"].map((name) =>
    useAppCookie(name, { readonly: true, watch: false })
  );
  const user = useUser();
  const session = useSession();
  const token = useAccessToken();
  const loaded = useProfileLoaded();
  const owner = () =>
    user.value?.id && session.value?.id && token.value
      ? `${user.value.id}:${session.value.id}`
      : "";
  let asked = "";
  let pending = "";
  const loadProfile = (recheck = false) => {
    const expected = owner();
    if (!expected) {
      asked = "";
      return;
    }
    if (pending === expected || (!recheck && (loaded.value || asked === expected))) return;
    asked = pending = expected;
    void app.runWithContext(getUser).finally(() => {
      if (pending === expected) pending = "";
    });
  };
  const sync = () =>
    app.runWithContext(() => {
      syncSessionCookies();
      // Confirmation in another tab leaves the session cookie unchanged, and a failed
      // profile read is asked again when the tab is looked at.
      loadProfile(!loaded.value || user.value?.email_verified === false);
    });
  let stopProfile = () => {};
  app.hook("app:mounted", () => {
    stopProfile = watch(
      [() => user.value?.id, () => session.value?.id, token, loaded],
      () => loadProfile(),
      { immediate: true }
    );
  });
  const visible = () => {
    if (document.visibilityState === "visible") sync();
  };
  const stop = watch(cookies, sync);
  window.addEventListener("focus", sync);
  document.addEventListener("visibilitychange", visible);
  app.vueApp.onUnmount(() => {
    stop();
    stopProfile();
    window.removeEventListener("focus", sync);
    document.removeEventListener("visibilitychange", visible);
  });
});
