/** Cookie refresh signals carry no credentials; always reread the shared jar. */
export default defineNuxtPlugin((app) => {
  const cookies = ["authGeneration", "accessToken"].map((name) =>
    useAppCookie(name, { readonly: true, watch: false })
  );
  const sync = () => app.runWithContext(syncSessionCookies);
  const visible = () => {
    if (document.visibilityState === "visible") sync();
  };
  const stop = watch(cookies, sync);
  window.addEventListener("focus", sync);
  document.addEventListener("visibilitychange", visible);
  app.vueApp.onUnmount(() => {
    stop();
    window.removeEventListener("focus", sync);
    document.removeEventListener("visibilitychange", visible);
  });
});
