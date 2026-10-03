import type { SessionSnapshot } from "~/utils/sessionRefresh";

/** Cross-tab signals invalidate views; only server reads establish permission. */
export default defineNuxtPlugin((app) => {
  const user = useUser();
  const session = useSession();
  const accessToken = useAccessToken();
  const identity = () => {
    const value = app.runWithContext(getSessionSnapshot) as SessionSnapshot;
    return `${value.identity || ""}:${value.generation}`;
  };
  let previous = identity();
  const invalidate = () => app.runWithContext(() => invalidatePublicationViews());
  const stop = watch(
    [() => user.value?.id, () => session.value?.id, accessToken],
    () => {
      const next = identity();
      if (next !== previous) {
        previous = next;
        invalidate();
      }
    },
    { flush: "sync" }
  );
  const visible = () => {
    if (document.visibilityState === "visible") invalidate();
  };
  const storage = (event: StorageEvent) => {
    if (event.key === "academy-publication-invalidated") invalidate();
  };
  window.addEventListener("focus", invalidate);
  window.addEventListener("storage", storage);
  document.addEventListener("visibilitychange", visible);
  const stopRoute = app.$router.afterEach((to, from) => {
    if (to.path !== from.path) invalidate();
  });
  app.vueApp.onUnmount(() => {
    stop();
    stopRoute();
    window.removeEventListener("focus", invalidate);
    window.removeEventListener("storage", storage);
    document.removeEventListener("visibilitychange", visible);
  });
});
