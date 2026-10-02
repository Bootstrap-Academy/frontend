import type { LearningRequest, LearningRoomsView } from "~/types/learningRooms";
import { createLearningRooms } from "~/utils/learningRooms";
import { createLearningRecovery, createLearningTransport } from "~/utils/learningTransport";

export function useLearningRooms(
  options: {
    selection?: { path?: string; courseId: string; unitId: string };
    syncLocation?: boolean;
    loadRoom?: boolean;
  } = {}
) {
  const config = useRuntimeConfig().public;
  const user = useUser();
  const session = useSession();
  const accessToken = useAccessToken();
  const refreshToken = useRefreshToken();
  const route = useRoute();
  const router = useRouter();
  const owner = computed(() =>
    user.value?.id && session.value?.id ? `${user.value.id}:${session.value.id}` : null
  );
  const enabled = computed(() => String(config.learningRoomsEnabled) === "true");
  const view = shallowRef<LearningRoomsView | null>(null);
  const reauthRequired = ref(false);
  const recoveryError = ref(false);
  const recovering = ref(false);
  let epoch = 0;
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastUserId = "";
  const recoveryNamespace = options.selection
    ? `activity:${encodeURIComponent(options.selection.courseId)}:${encodeURIComponent(options.selection.unitId)}`
    : "";
  let recovery: ReturnType<typeof createLearningRecovery> | null = null;
  try {
    recovery = createLearningRecovery(window.sessionStorage, recoveryNamespace);
  } catch {
    /* Keep drafts mounted when tab storage is unavailable. */
  }
  const memoryRecovery = useState<Record<string, any>>(
    `learning-room-recovery${recoveryNamespace ? `:${recoveryNamespace}` : ""}`,
    () => ({})
  );
  const snapshot = () => {
    const shared = getSessionSnapshot();
    return {
      identity: shared.identity,
      generation: shared.generation,
      epoch,
      userId: user.value?.id || "",
      sessionId: session.value?.id || "",
      accessToken: shared.accessToken,
      refreshToken: shared.refreshToken,
    };
  };
  const transport = createLearningTransport({
    snapshot,
    renew: (expected) => refreshSession({ ...getSessionSnapshot(), ...expected }, false),
    raw: (path, method, body, token) =>
      $fetch(path, {
        baseURL: config.BASE_API_URL,
        method,
        body: body as any,
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        retry: 0,
        timeout: 20000,
      }),
    expired: (required) => {
      reauthRequired.value = required;
    },
  });
  const data = createLearningRooms({
    request: transport,
    changed: (value) => {
      view.value = value;
    },
    checkpoint: () => preserve(lastUserId, true),
  });
  function selection(query: Record<string, unknown>) {
    return {
      path: typeof query.path === "string" ? query.path : undefined,
      courseId: typeof query.course === "string" ? query.course : null,
      unitId: typeof query.unit === "string" ? query.unit : undefined,
    };
  }
  function matchesLocation(query: Record<string, unknown>) {
    const target = selection(query);
    return (
      view.value?.status === "ready" &&
      target.courseId === view.value.courseId &&
      target.path === view.value.path?.id &&
      target.unitId === (view.value.courseId ? view.value.room?.unit.id : undefined)
    );
  }
  async function syncLocation() {
    if (options.syncLocation === false) return;
    if (!view.value?.room || view.value.status !== "ready") return;
    const query = {
      path: view.value.room.unit.path_id,
      ...(view.value.courseId
        ? { course: view.value.courseId, unit: view.value.room.unit.id }
        : {}),
    };
    if (!matchesLocation(route.query)) await router.replace({ path: "/learn", query });
  }
  async function openLocation(query: Record<string, unknown>) {
    const target = selection(query);
    return await data.next(target.path, undefined, true, target);
  }
  async function retry() {
    if (await data.retry()) await syncLocation();
  }
  function preserve(userId: string, required = false) {
    const saved = data.recovery();
    if (!userId) return true;
    if (!saved) {
      // setStates changes user and session separately. An empty/intermediate
      // controller is not evidence that this user's earlier recovery was saved.
      if (!view.value?.room || view.value.status !== "ready" || recovering.value) return true;
      const remaining = { ...memoryRecovery.value };
      delete remaining[userId];
      memoryRecovery.value = remaining;
      try {
        recovery?.clear(userId);
      } catch {
        /* Only an obsolete owned backup is affected. */
      }
      return true;
    }
    memoryRecovery.value = { ...memoryRecovery.value, [userId]: saved };
    try {
      if (!recovery) throw new Error("Tab storage unavailable");
      recovery.save(userId, saved);
      return true;
    } catch {
      if (required) recoveryError.value = true;
      return !required;
    }
  }
  watch(
    owner,
    (next) => {
      if (lastUserId) preserve(lastUserId);
      const ticket = ++epoch;
      clearTimeout(timer);
      data.reset();
      recovering.value = false;
      reauthRequired.value = false;
      recoveryError.value = false;
      lastUserId = user.value?.id || "";
      if (!next || options.loadRoom === false) return;
      const requestedUser = lastUserId;
      const previous = memoryRecovery.value[requestedUser] || recovery?.read(requestedUser);
      const saved =
        !options.selection ||
        (previous?.unitId === options.selection.unitId &&
          previous?.courseId === options.selection.courseId)
          ? previous
          : null;
      recovering.value = !!saved;
      queueMicrotask(async () => {
        if (!alive || ticket !== epoch || next !== owner.value) return;
        const target = saved
          ? {
              path: saved.pathId,
              courseId: saved.courseId || null,
              unitId: saved.courseId ? saved.unitId : undefined,
            }
          : options.selection || selection(route.query);
        await data.start(enabled.value, target.path, !!saved, target);
        if (!alive || ticket !== epoch || next !== owner.value) return;
        if (view.value?.status !== "ready") {
          recovering.value = false;
          return;
        }
        if (saved) {
          recovering.value = true;
          const restored = await data.restore(saved);
          if (!alive || ticket !== epoch || next !== owner.value) return;
          recovering.value = false;
          if (restored) {
            preserve(requestedUser);
          }
        }
        if (view.value?.courseId) await syncLocation();
      });
    },
    { immediate: true, flush: "sync" }
  );
  function edit(state: Record<string, any>) {
    data.edit(state);
    clearTimeout(timer);
    timer = setTimeout(() => {
      void data.save();
    }, 700);
  }
  const request = computed<LearningRequest>(() => {
    const expectedOwner = owner.value;
    const expectedEpoch = epoch;
    return (path, method, body) => {
      if (!alive || epoch !== expectedEpoch || owner.value !== expectedOwner)
        return Promise.reject({ statusCode: 401 });
      return transport(path, method, body);
    };
  });
  async function reauthenticate() {
    if (!owner.value || !preserve(user.value?.id || "", true)) return false;
    clearTimeout(timer);
    const redirect = route.fullPath || "/learn";
    // Clear the stale cookie before navigation so the global login guard cannot
    // send this request back to the dashboard. No server logout/write is needed.
    setStates(null, false, false);
    await router.push({ path: "/auth/login", query: { redirect } });
    return true;
  }
  onBeforeUnmount(() => {
    preserve(lastUserId);
    alive = false;
    epoch++;
    clearTimeout(timer);
    data.dispose();
  });
  return {
    view,
    data,
    edit,
    request,
    owner,
    user,
    accessToken,
    enabled,
    reauthRequired,
    reauthenticate,
    recoveryError,
    recovering,
    matchesLocation,
    openLocation,
    syncLocation,
    retry,
  };
}
