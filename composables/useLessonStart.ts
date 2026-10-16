import type { InjectionKey, Ref } from "vue";
import type { DailyLearning } from "~/types/dailyLearning";
import { dailyBlocked, dailyError } from "~/utils/dailyLearning";

type LessonAnswer = { owner: string; reply: Promise<any> };
/** What the view around a component read about its lesson while showing it. */
const OUTER_ANSWER: InjectionKey<() => LessonAnswer | undefined> = Symbol("lesson-answer");

/** Reads never reserve a lesson. Call start only from a deliberate learning action. */
export function useLessonStart(course: Ref<string>, lesson: Ref<string>) {
  // A view of the lesson inside another view of the same lesson (the video on the course page)
  // takes the answer the outer view read for this showing instead of asking the server again.
  const inComponent = !!getCurrentInstance();
  const outer = inComponent ? inject(OUTER_ANSWER, undefined) : undefined;
  let answer: LessonAnswer | undefined;
  if (inComponent) provide(OUTER_ANSWER, () => answer);
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
    const url = path();
    const shared = outer?.();
    try {
      // If the outer view's read failed, this one asks for itself as before.
      const reply = shared?.owner === expected ? shared.reply.catch(() => GET(url)) : GET(url);
      answer = { owner: expected, reply };
      const result = await reply;
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
      // The lesson has started; a view shown inside this one from now on asks for itself.
      if (answer?.owner === expected) answer = undefined;
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
      answer = undefined;
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
