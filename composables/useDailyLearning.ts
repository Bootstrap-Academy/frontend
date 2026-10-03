import type { DailyLearning } from "~/types/dailyLearning";
import { dailyLearning } from "~/utils/dailyLearning";

type Policy = {
  mode: "legacy" | "shadow" | "daily";
  premium?: boolean;
  heart_sales: boolean;
  single_course_sales: boolean;
};
export function useDailyLearning() {
  const user = useUser();
  const session = useSession();
  const owner = computed(() =>
    user.value?.id && session.value?.id ? `${user.value.id}:${session.value.id}` : ""
  );
  const premium = usePremiumInfo();
  const lessons = useState<Record<string, DailyLearning>>("daily-learning-lessons", () => ({}));
  const state = useState("daily-learning", () => ({
    owner: "",
    daily: null as DailyLearning | null,
    policy: null as Policy | null,
    pending: false,
    epoch: 0,
    revision: 0,
    checked: 0,
  }));
  function observe(value: unknown, course?: string, lesson?: string) {
    const parsed = dailyLearning(value);
    if (!owner.value || state.value.owner !== owner.value || !parsed) return;
    const used =
      state.value.daily?.resets_at === parsed.resets_at
        ? Math.max(state.value.daily.used, parsed.used)
        : parsed.used;
    const globallyUnlimited =
      parsed.exempt === "purchase" ? !!state.value.policy?.premium : parsed.unlimited;
    state.value.daily = {
      ...parsed,
      used,
      started: undefined,
      can_start: undefined,
      exempt: null,
      unlimited: globallyUnlimited,
      remaining:
        parsed.enforced === false || globallyUnlimited ? null : Math.max(0, parsed.limit - used),
    };
    if (course && lesson) {
      const key = `${course}:${lesson}`;
      lessons.value[key] = {
        ...parsed,
        started: parsed.started || lessons.value[key]?.started === true,
      };
    }
    state.value.revision++;
  }
  async function refresh(force = false) {
    if (!owner.value || state.value.pending || (!force && Date.now() - state.value.checked < 5000))
      return;
    const expected = owner.value;
    const epoch = state.value.epoch;
    const revision = state.value.revision;
    state.value.pending = true;
    try {
      const results = await Promise.allSettled([
        GET("/skills/daily-limit"),
        GET("/shop/learning/policy"),
      ]);
      if (owner.value !== expected || state.value.owner !== expected || state.value.epoch !== epoch)
        return;
      if (
        results.every(
          (r) =>
            r.status === "rejected" && (r.reason?.statusCode || r.reason?.response?.status) === 404
        )
      )
        state.value.policy = { mode: "legacy", heart_sales: true, single_course_sales: true };
      if (results[0].status === "fulfilled" && state.value.revision === revision)
        observe(results[0].value);
      if (
        results[1].status === "fulfilled" &&
        ["legacy", "shadow", "daily"].includes(results[1].value?.mode)
      )
        state.value.policy = results[1].value;
      state.value.checked = Date.now();
    } finally {
      if (state.value.owner === expected && state.value.epoch === epoch)
        state.value.pending = false;
    }
  }
  watch(
    owner,
    (value) => {
      if (state.value.owner !== value) {
        lessons.value = {};
        state.value = {
          owner: value,
          epoch: state.value.epoch + 1,
          daily: null,
          policy: null,
          pending: false,
          revision: 0,
          checked: 0,
        };
      }
      if (value && import.meta.client) void refresh();
    },
    { immediate: true, flush: "sync" }
  );
  watch(
    () => premium.value?.premium,
    () => {
      void refresh(true);
    }
  );
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  watch(
    () => state.value.daily?.resets_at,
    (at) => {
      clearTimeout(resetTimer);
      if (at && import.meta.client && Date.parse(at) > Date.now())
        resetTimer = setTimeout(
          () => {
            void refresh(true);
          },
          Math.min(2147483647, Date.parse(at) - Date.now() + 1000)
        );
    },
    { immediate: true }
  );
  const onFocus = () => {
    if (document.visibilityState === "visible") void refresh();
  };
  onMounted(() => {
    void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
  });
  onBeforeUnmount(() => {
    clearTimeout(resetTimer);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
  });
  const mode = computed(() => state.value.policy?.mode || state.value.daily?.mode || null);
  function forLesson(course: string, lesson: string, fallback?: DailyLearning | null) {
    const local = lessons.value[`${course}:${lesson}`] || fallback;
    if (!local) return null;
    const fresh = state.value.daily;
    if (!fresh) return local;
    const exempt = local.started
      ? "started"
      : ["premium", "admin"].includes(local.exempt || "")
        ? fresh.unlimited
          ? local.exempt
          : null
        : local.exempt;
    return {
      ...local,
      mode: fresh.mode,
      enforced: fresh.enforced,
      limit: fresh.limit,
      used: fresh.used,
      remaining: fresh.remaining,
      resets_at: fresh.resets_at,
      exempt,
      unlimited: fresh.unlimited || exempt === "purchase",
      can_start:
        fresh.enforced === false || fresh.unlimited || !!exempt || (fresh.remaining ?? 1) > 0,
    };
  }
  return {
    forLesson,
    daily: computed(() => state.value.daily),
    mode,
    isDaily: computed(() => mode.value === "daily"),
    showHearts: computed(() => ["legacy", "shadow"].includes(mode.value || "")),
    policyKnown: computed(() => mode.value !== null),
    observe,
    refresh,
  };
}
