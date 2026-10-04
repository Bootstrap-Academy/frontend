import type { Ref } from "vue";
import type { DailyLearning } from "~/types/dailyLearning";
import { dailyBlocked, dailyError } from "~/utils/dailyLearning";

/** Reads never reserve a lesson. Call start only from a deliberate learning action. */
export function useLessonStart(course: Ref<string>, lesson: Ref<string>) {
  const dailyState = useDailyLearning();
  const user = useUser();
  const session = useSession();
  const local = ref<DailyLearning | null>(null);
  const pending = ref(false);
  const error = ref(false);
  const failure = ref<unknown>(null);
  const limited = ref<DailyLearning | null>(null);
  const owner = computed(
    () => `${user.value?.id || ""}:${session.value?.id || ""}:${course.value}:${lesson.value}`
  );
  const daily = computed(() => dailyState.forLesson(course.value, lesson.value, local.value));
  watch(daily, (value) => {
    if (value && !dailyBlocked(value)) limited.value = null;
  });
  let requestId = "";
  let generation = 0;
  let alive = true;
  const path = () =>
    `/skills/courses/${encodeURIComponent(course.value)}/lessons/${encodeURIComponent(lesson.value)}`;
  async function read() {
    if (!course.value || !lesson.value || !user.value?.id) return;
    const ticket = ++generation;
    const expected = owner.value;
    try {
      const result = await GET(path());
      if (!alive || ticket !== generation || expected !== owner.value) return;
      local.value = result?.daily || null;
      dailyState.observe(local.value, course.value, lesson.value);
      limited.value = dailyBlocked(local.value) ? local.value : null;
    } catch {
      // The actual action still verifies access; a failed preview does not start anything.
    }
  }
  async function start() {
    if (pending.value) return false;
    const expected = owner.value;
    pending.value = true;
    error.value = false;
    failure.value = null;
    try {
      await dailyState.refresh();
      if (!alive || expected !== owner.value) return false;
      if (dailyState.mode.value === "legacy" && !local.value) return true;
      if ((local.value?.mode || dailyState.mode.value) === "legacy" || daily.value?.started)
        return true;
      requestId ||= crypto.randomUUID();
      const result = await POST(`${path()}/start`, { request_id: requestId });
      if (!alive || expected !== owner.value) return false;
      local.value = result.daily || result;
      dailyState.observe(local.value, course.value, lesson.value);
      limited.value = null;
      return true;
    } catch (cause) {
      if (alive && expected === owner.value) {
        failure.value = cause;
        limited.value = dailyError(cause);
        if (limited.value) dailyState.observe(limited.value, course.value, lesson.value);
        else error.value = true;
      }
      return false;
    } finally {
      if (alive && expected === owner.value) pending.value = false;
    }
  }
  watch(
    owner,
    () => {
      generation++;
      requestId = "";
      local.value = limited.value = null;
      pending.value = error.value = false;
      failure.value = null;
      void read();
    },
    { immediate: true }
  );
  onBeforeUnmount(() => {
    alive = false;
    generation++;
  });
  return { daily, pending, error, failure, limited, start, read };
}
