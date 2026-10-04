import { joinURL } from "ufo";
import type { RouteLocationNormalized } from "vue-router";

/** Replace Nuxt's automatic handler, which persists the entire payload.state. */
export default defineNuxtPlugin({
  name: "academy:chunk-reload",
  enforce: "pre",
  setup(app) {
    const clean = () => {
      try {
        window.sessionStorage.removeItem("nuxt:reload:state");
      } catch {
        /* Reload remains available when storage is blocked. */
      }
    };
    clean();
    const router = useRouter();
    const config = useRuntimeConfig();
    const errors = new Set<unknown>();
    const removeBefore = router.beforeEach(() => errors.clear());
    const removeChunk = app.hook("app:chunkError", ({ error }) => {
      errors.add(error);
    });
    const reload = (to: RouteLocationNormalized) => {
      clean();
      reloadNuxtApp({ path: joinURL(config.app.baseURL, to.fullPath), persistState: false });
    };
    const removeError = router.onError((error, to) => {
      if (errors.has(error)) reload(to);
    });
    let removeUpdate: (() => void) | undefined;
    const removeManifest = app.hook("app:manifest:update", () => {
      removeUpdate ??= router.beforeResolve(reload);
    });
    app.vueApp.onUnmount(() => {
      removeBefore();
      removeChunk();
      removeError();
      removeManifest();
      removeUpdate?.();
    });
  },
});
