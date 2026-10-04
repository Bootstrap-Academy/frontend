import { dailyError } from "~/utils/dailyLearning";
import type { DailyLearning } from "~/types/dailyLearning";
import type { LearningRequest, LearningRoomsView } from "~/types/learningRooms";
import { createLearningRooms } from "~/utils/learningRooms";
import { createLearningRecovery, createLearningTransport } from "~/utils/learningTransport";
import { registerLearningLogout } from "~/utils/learningStorage";

export function useLearningRooms(
  options: {
    selection?: { path?: string; courseId: string; unitId: string };
    syncLocation?: boolean;
    loadRoom?: boolean;
    prepareLogout?: () => Promise<boolean> | boolean;
    protocolNext?: () => Promise<boolean> | boolean;
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
  const dailyState = useDailyLearning();
  const limitReached = ref<DailyLearning | null>(null);
  const daily = computed(() => {
    const room = view.value?.room;
    return room?.course_id && room.lesson_id
      ? dailyState.forLesson(room.course_id, room.lesson_id, room.daily)
      : dailyState.daily.value || room?.daily || view.value?.daily || null;
  });
  const rawTransport = createLearningTransport({
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
  const startRequests = new Map<string, string>();
  const transport: LearningRequest = async (path, method, body) => {
    const expected = owner.value;
    try {
      const room = view.value?.room;
      if (
        method === "POST" &&
        path.startsWith("/challenges/") &&
        room &&
        daily.value &&
        daily.value.mode !== "legacy" &&
        !daily.value.started &&
        room.course_id &&
        room.lesson_id
      ) {
        const startPath = `/skills/courses/${encodeURIComponent(room.course_id)}/lessons/${encodeURIComponent(room.lesson_id)}/start`;
        if (!startRequests.has(startPath)) startRequests.set(startPath, crypto.randomUUID());
        const started = await rawTransport(startPath, "POST", {
          request_id: startRequests.get(startPath),
        });
        if (expected !== owner.value) throw { statusCode: 401 };
        dailyState.observe(started.daily || started, room.course_id, room.lesson_id);
      }
      const result = await rawTransport(path, method, body);
      if (expected === owner.value) {
        dailyState.observe(result?.daily, result?.course_id, result?.lesson_id || result?.id);
        if (result?.next)
          dailyState.observe(result.next.daily, result.next.course_id, result.next.lesson_id);
        if (result?.daily?.can_start !== false) limitReached.value = null;
      }
      return result;
    } catch (error) {
      if (expected === owner.value) {
        const daily = dailyError(error);
        if (daily) {
          limitReached.value = daily;
          dailyState.observe(daily);
        }
      }
      throw error;
    }
  };
  const data = createLearningRooms({
    request: transport,
    changed: (value) => {
      view.value = value;
    },
    checkpoint: () => preserve(lastUserId, true),
  });
  watch(dailyState.daily, (value) => {
    const available =
      value &&
      (value.mode !== "daily" ||
        value.enforced === false ||
        value.unlimited ||
        (value.remaining ?? 0) > 0);
    if (!available) return;
    limitReached.value = null;
    // Refresh only an empty queue. A mounted lesson and its private draft stay put.
    if (
      view.value?.status === "ready" &&
      view.value.emptyReason === "limit_reached" &&
      !view.value.room
    )
      void retry();
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
      limitReached.value = null;
      startRequests.clear();
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
  const unregisterLogout = registerLearningLogout({
    user: () => (owner.value ? user.value?.id || null : null),
    prepare: async () => {
      if (view.value?.saving || view.value?.completing || view.value?.reviewStarting) return false;
      const expectedOwner = owner.value;
      const expectedEpoch = epoch;
      // A module may still hold work outside the native room draft.
      if (options.prepareLogout && (await options.prepareLogout()) === false) return false;
      if (!alive || epoch !== expectedEpoch || owner.value !== expectedOwner) return false;
      if (view.value?.saving || view.value?.completing || view.value?.reviewStarting) return false;
      if (view.value?.dirty && !view.value.completionPending && !view.value.conflict)
        await data.save();
      if (!alive || epoch !== expectedEpoch || owner.value !== expectedOwner) return false;
      return preserve(lastUserId, true);
    },
    unsaved: () => !!data.recovery(),
    clear: (userId) => {
      const remaining = { ...memoryRecovery.value };
      delete remaining[userId];
      memoryRecovery.value = remaining;
    },
  });
  onBeforeUnmount(() => {
    unregisterLogout();
    preserve(lastUserId);
    alive = false;
    epoch++;
    clearTimeout(timer);
    data.dispose();
  });
  // Session-local, server-selected history gives the v2 host a real previous target.
  const visits = shallowRef<
    { owner: string; path: string; courseId: string | null; unitId: string }[]
  >([]);
  let goingBack: { owner: string } | undefined;
  watch(
    () => [owner.value, view.value?.status, view.value?.courseId, view.value?.room?.unit.id],
    () => {
      if (!owner.value || visits.value.some((visit) => visit.owner !== owner.value))
        visits.value = [];
      const value = view.value;
      if (
        goingBack?.owner === owner.value ||
        String(config.lessonProtocolV2) !== "true" ||
        value?.status !== "ready" ||
        !value.room ||
        !owner.value
      )
        return;
      const previous = visits.value.at(-1);
      if (previous?.courseId !== value.courseId || previous?.path !== value.room.unit.path_id)
        visits.value = [];
      if (visits.value.at(-1)?.unitId === value.room.unit.id) return;
      visits.value = [
        ...visits.value,
        {
          owner: owner.value,
          path: value.room.unit.path_id,
          courseId: value.courseId,
          unitId: value.room.unit.id,
        },
      ];
    },
    { flush: "sync", immediate: true }
  );
  async function previous() {
    const target = visits.value.at(-2);
    if (!target || target.owner !== owner.value || goingBack?.owner === owner.value) return false;
    const operation = { owner: target.owner };
    goingBack = operation;
    try {
      const opened = await data.openConfirmed(target.unitId, target.path, target.courseId);
      if (!opened) return false;
      if (target.owner !== owner.value) return false;
      visits.value = visits.value.slice(0, -1);
      await syncLocation();
      return true;
    } finally {
      if (goingBack === operation) goingBack = undefined;
    }
  }
  async function advanceProtocol() {
    const identity = owner.value;
    const value = view.value;
    if (
      !alive ||
      !identity ||
      value?.status !== "ready" ||
      !value.room ||
      !["completed", "skipped"].includes(value.room.progress.status)
    )
      return false;
    if (options.protocolNext) return await options.protocolNext();
    const opened = await data.next(value.path?.id, value.room.unit.id);
    if (!opened || !alive || identity !== owner.value) return false;
    await syncLocation();
    return true;
  }
  return {
    protocol: {
      data,
      owner: () => owner.value,
      get previous() {
        return visits.value.length > 1 ? previous : undefined;
      },
      advance:
        options.protocolNext || (!options.selection && options.syncLocation !== false)
          ? advanceProtocol
          : undefined,
    },
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
    daily,
    limitReached,
    keepDailyDraft: () => preserve(user.value?.id || "", true),
  };
}
