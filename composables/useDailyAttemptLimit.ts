import type { DailyLearning } from "~/types/dailyLearning";
import { dailyError } from "~/utils/dailyLearning";

/** Keep a rejected legacy submission mounted so answers and code remain editable. */
export function useDailyAttemptLimit() {
  const state = useDailyLearning();
  const user = useUser();
  const session = useSession();
  const attemptLimit = ref<DailyLearning | null>(null);
  watch(
    () => `${user.value?.id || ""}:${session.value?.id || ""}`,
    () => {
      attemptLimit.value = null;
    }
  );
  watch(state.daily, (value) => {
    if (
      value &&
      (value.mode !== "daily" ||
        value.enforced === false ||
        value.unlimited ||
        (value.remaining ?? 0) > 0)
    )
      attemptLimit.value = null;
  });
  function handleLimit(error: unknown) {
    const value = dailyError(error);
    if (!value) return false;
    state.observe(value);
    attemptLimit.value = value;
    return true;
  }
  return { attemptLimit, handleLimit };
}
