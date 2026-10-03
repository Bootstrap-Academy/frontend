import { createProfilePublication, emptyPublicationView } from "~/utils/profilePublication";
import type { SessionSnapshot } from "~/utils/sessionRefresh";

export const usePublicationInvalidation = () => useState("publicationInvalidation", () => 0);
export const profilePublicationEnabled = () =>
  [true, "true"].includes(useRuntimeConfig().public.profilePublicationEnabled as boolean | string);

export function useProfilePublication() {
  const app = useNuxtApp();
  const user = useUser();
  const session = useSession();
  const accessToken = useAccessToken();
  const signal = usePublicationInvalidation();
  const request = usePublicationRequest();
  const view = reactive(emptyPublicationView());
  const owner = () => {
    const value = app.runWithContext(getSessionSnapshot) as SessionSnapshot;
    return value.identity ? `${value.identity}:${value.generation}` : "";
  };
  const controller = createProfilePublication({
    view,
    owner,
    userId: () => user.value?.id || "",
    get: (path) => request(path),
    put: (path, body) => request(path, "PUT", body),
    uuid: () => crypto.randomUUID(),
    changed: () => app.runWithContext(() => invalidatePublicationViews(true, false)),
  });
  let previousOwner = owner();
  watch(
    [() => user.value?.id, () => session.value?.id, accessToken],
    () => {
      const nextOwner = owner();
      if (nextOwner === previousOwner) return;
      previousOwner = nextOwner;
      controller.clear();
      void nextTick(controller.reload);
    },
    { flush: "sync" }
  );
  watch(signal, () => void controller.reload());
  watch([() => user.value?.display_name, () => user.value?.email_verified], () => {
    invalidatePublicationViews(true);
  });
  onMounted(controller.reload);
  onBeforeUnmount(controller.clear);
  return { view, ...controller };
}
