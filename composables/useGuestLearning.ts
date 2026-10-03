import { computed, onBeforeUnmount, shallowRef, watch } from "vue";
import { createGuestLearning, GUEST_KEY } from "~/utils/guest/learning";
import { registerLearningLogout } from "~/utils/learningStorage";

export function useGuestLearning() {
  const { user, owner, request, reauthRequired, reauthenticate } = useLearningRooms({
    loadRoom: false,
    syncLocation: false,
  });
  const view = shallowRef<Parameters<Parameters<typeof createGuestLearning>[0]["changed"]>[0]>();
  let local: Storage | null = null,
    tab: Storage | null = null;
  try {
    local = window.localStorage;
  } catch {
    /* Local play can continue in memory. */
  }
  try {
    tab = window.sessionStorage;
  } catch {
    /* Account handoff requires tab storage. */
  }
  const data = createGuestLearning({
    local,
    tab,
    user: () => (owner.value ? user.value?.id || null : null),
    request: (path, method, body) => request.value(path, method, body),
    lock: async (run) => {
      if (!navigator.locks) throw { guest: "browser" };
      return navigator.locks.request("academy-guest-transfer", run);
    },
    changed: (next) => {
      view.value = next;
    },
  });
  watch(owner, () => data.load(), { flush: "sync" });
  function storageChanged(event: StorageEvent) {
    if (event.key?.startsWith(GUEST_KEY) && !view.value?.busy) data.load();
  }
  window.addEventListener("storage", storageChanged);
  const unregisterLogout = registerLearningLogout({
    user: () => user.value?.id || null,
    prepare: () => !view.value?.busy,
    unsaved: () => !!view.value?.draft.owner && !view.value.draft.saved,
  });
  onBeforeUnmount(() => {
    unregisterLogout();
    data.dispose();
    window.removeEventListener("storage", storageChanged);
  });
  return {
    view,
    data,
    user,
    owner,
    reauthRequired,
    reauthenticate,
    authenticated: computed(() => !!owner.value),
  };
}
