<template>
  <section class="exercise-room" :aria-busy="view.phase === 'loading'">
    <p v-if="view.phase === 'loading'" role="status">{{ t("LearningRooms.Loading") }}</p>
    <template v-else-if="view.data">
      <div
        class="exercise-description prose-invert"
        v-html="$md.render(view.data.question || view.data.description || '')"
      />
      <fieldset v-if="reference.type === 'multiple_choice'" :disabled="locked">
        <legend>
          {{
            t(view.data.single_choice ? "LearningRooms.ChooseOne" : "LearningRooms.ChooseSeveral")
          }}
        </legend>
        <label
          v-for="(answer, index) in view.data.answers || []"
          :key="index"
          class="answer-option"
        >
          <input
            :type="view.data.single_choice ? 'radio' : 'checkbox'"
            :name="inputId"
            :checked="draft.answers?.[index] === true"
            @change="chooseAnswer(index)"
          />
          <span>{{ answer }}</span>
        </label>
      </fieldset>
      <fieldset v-else-if="reference.type === 'matching'" :disabled="locked">
        <legend>{{ t("LearningRooms.MatchPairs") }}</legend>
        <div v-for="(left, index) in view.data.left || []" :key="index" class="matching-pair">
          <label :for="`${inputId}-${index}`">{{ left }}</label>
          <select
            :id="`${inputId}-${index}`"
            :value="draft.answer?.[index] ?? -1"
            @change="chooseMatch(index, Number(($event.target as HTMLSelectElement).value))"
          >
            <option :value="-1">{{ t("LearningRooms.ChooseMatch") }}</option>
            <option
              v-for="(right, rightIndex) in view.data.right || []"
              :key="rightIndex"
              :value="rightIndex"
            >
              {{ right }}
            </option>
          </select>
        </div>
      </fieldset>
      <template v-else-if="reference.type === 'coding'">
        <label :for="`${inputId}-language`">{{ t("LearningRooms.Language") }}</label>
        <select
          :id="`${inputId}-language`"
          :value="draft.environment || defaultEnvironment"
          :disabled="locked"
          @change="update({ environment: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="environment in view.environments" :key="environment" :value="environment">
            {{ environment }}
          </option>
        </select>
        <LearningCodeEditor
          :model-value="draft.code || ''"
          :language="draft.environment || defaultEnvironment"
          :disabled="locked"
          @update:model-value="update({ code: $event })"
        />
        <details v-if="view.examples.length" class="examples">
          <summary>{{ t("LearningRooms.Examples") }}</summary>
          <div v-for="example in view.examples" :key="example.id" class="example">
            <p>{{ t("LearningRooms.Input") }}</p>
            <pre>{{ printable(example.input) }}</pre>
            <p>{{ t("LearningRooms.Output") }}</p>
            <pre>{{ printable(example.output) }}</pre>
          </div>
        </details>
      </template>
      <div v-if="view.phase === 'correct'" class="exercise-result correct" role="status">
        <p>{{ t("LearningRooms.Correct") }}</p>
        <button
          type="button"
          :disabled="disabled"
          @click="emit('complete', draft.attempt_id || draft.submission_id)"
        >
          {{ t("LearningRooms.Continue") }}
        </button>
      </div>
      <template v-else>
        <div
          v-if="view.phase === 'incorrect' || (view.phase === 'pending' && view.result)"
          class="exercise-result"
          role="status"
        >
          <p>
            {{
              resultTitle ||
              t(view.result?.solved === true ? "LearningRooms.Correct" : "LearningRooms.Incorrect")
            }}
          </p>
          <p v-if="resultBody">{{ resultBody }}</p>
          <details v-if="resultDetails">
            <summary>{{ t("LearningRooms.Details") }}</summary>
            <pre>{{ resultDetails }}</pre>
          </details>
        </div>
        <p v-if="view.phase === 'pending'" role="status">
          {{ t(view.result ? "LearningRooms.BalanceUpdating" : "LearningRooms.Running") }}
        </p>
        <p v-if="view.error" role="alert">{{ t(`LearningRooms.${view.error}`) }}</p>
        <button
          v-if="
            (view.phase === 'uncertain' && !reviewId) || (view.phase === 'pending' && view.error)
          "
          type="button"
          :disabled="disabled"
          @click="controller.check()"
        >
          {{ t("LearningRooms.CheckResult") }}
        </button>
        <div v-if="view.phase === 'uncertain'" class="uncertain-actions">
          <p>{{ t("LearningRooms.PreviousAttemptMayCount") }}</p>
          <button
            type="button"
            class="skip-exercise"
            :disabled="disabled"
            @click="controller.newAttempt()"
          >
            {{ t("LearningRooms.NewAttempt") }}
          </button>
        </div>
        <div v-if="!['pending', 'uncertain'].includes(view.phase)" class="submit-action">
          <p v-if="view.premium === false">
            {{ t("Body.WrongAnswerCostsOneHeart") }}
          </p>
          <button type="button" :disabled="locked || !valid" @click="submit">
            {{
              t(
                view.phase === "submitting"
                  ? "LearningRooms.Submitting"
                  : "LearningRooms.CheckAnswer"
              )
            }}
          </button>
        </div>
      </template>
      <button
        v-if="['ready', 'incorrect'].includes(view.phase)"
        type="button"
        class="skip-exercise"
        :disabled="locked"
        @click="emit('skip')"
      >
        {{ t("LearningRooms.SkipExercise") }}
      </button>
    </template>
    <div v-else-if="view.phase === 'error'" role="alert">
      <p>{{ t(`LearningRooms.${view.error}`) }}</p>
      <button type="button" @click="load">{{ t("LearningRooms.Retry") }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type {
  ExerciseDraft,
  ExerciseReference,
  ExerciseView,
  LearningRequest,
} from "~/types/learningRooms";
import { createLearningExercise } from "~/utils/learningExercise";

const props = defineProps<{
  reference: ExerciseReference;
  state: Record<string, any>;
  request: LearningRequest;
  userId: string;
  disabled: boolean;
  save: () => Promise<boolean>;
  content?: Record<string, any>;
  reviewId?: string;
}>();
const emit = defineEmits<{
  change: [state: Record<string, any>];
  complete: [attemptId?: string];
  skip: [];
  posting: [active: boolean];
}>();
const { t } = useI18n();
const inputId = useId();
const view = shallowRef<ExerciseView>({
  data: null,
  environments: [],
  examples: [],
  premium: null,
  phase: "idle",
  error: "",
  submissionId: null,
  result: null,
  posting: false,
});
const draft = ref<ExerciseDraft>({ code: props.content?.initial_code || "", ...props.state });
const preparing = ref(false);
const heartInfo = useHeartInfo();
let alive = true;
const controller = createLearningExercise({
  request: (...args) => props.request(...args),
  heartsChanged: (info) => {
    heartInfo.value = info;
  },
  changed: (next) => {
    view.value = next;
    emit("posting", next.posting);
  },
  persistSubmission: async (unknown, id, attemptId) => {
    if (!alive) return false;
    update({
      submission_unknown: unknown ? true : undefined,
      submission_id: id,
      attempt_id: attemptId,
    });
    return await props.save();
  },
});
const locked = computed(
  () => props.disabled || preparing.value || !["ready", "incorrect"].includes(view.value.phase)
);
const defaultEnvironment = computed(() =>
  view.value.environments.includes(props.content?.environment)
    ? props.content?.environment
    : view.value.environments.find((value) => value.toLowerCase().startsWith("python")) ||
      view.value.environments[0] ||
      ""
);
const valid = computed(() => {
  if (props.reference.type === "coding")
    return (
      !!draft.value.code?.trim() &&
      view.value.environments.includes(draft.value.environment || defaultEnvironment.value)
    );
  if (props.reference.type === "multiple_choice")
    return draft.value.answers?.some(Boolean) === true;
  const count = view.value.data?.left?.length || 0;
  return (
    count > 0 &&
    Array.from({ length: count }, (_, i) => draft.value.answer?.[i] ?? -1).every(
      (value) => value >= 0
    ) &&
    new Set(draft.value.answer).size === count
  );
});
const resultTitle = computed(() => {
  const result = view.value.result;
  if (result?.message?.title_key) return t(result.message.title_key);
  return result?.verdict ? t(`Error.Verdict.${result.verdict}`) : "";
});
const resultBody = computed(() =>
  view.value.result?.message?.body_key
    ? t(view.value.result.message.body_key, view.value.result.message.body_params || {})
    : ""
);
const resultDetails = computed(
  () =>
    view.value.result?.message?.detail ||
    view.value.result?.compile?.stderr ||
    view.value.result?.run?.stderr ||
    ""
);
function printable(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
function update(patch: Partial<ExerciseDraft>) {
  draft.value = { ...draft.value, ...patch };
  emit("change", { ...props.state, ...draft.value });
}
function chooseAnswer(index: number) {
  const answers = (view.value.data?.answers || []).map((_, i) =>
    view.value.data?.single_choice
      ? i === index
      : i === index
        ? !draft.value.answers?.[i]
        : draft.value.answers?.[i] === true
  );
  update({ answers });
}
function chooseMatch(index: number, value: number) {
  const answer = (view.value.data?.left || []).map((_, i) =>
    i === index ? value : draft.value.answer?.[i] === value ? -1 : (draft.value.answer?.[i] ?? -1)
  );
  update({ answer });
}
async function submit() {
  if (!valid.value || locked.value) return;
  const body =
    props.reference.type === "coding"
      ? { code: draft.value.code, environment: draft.value.environment || defaultEnvironment.value }
      : props.reference.type === "matching"
        ? { answer: draft.value.answer }
        : { answers: draft.value.answers };
  if (props.reference.type === "coding") update({ environment: body.environment });
  preparing.value = true;
  try {
    await controller.submit(body);
  } finally {
    if (alive) preparing.value = false;
  }
}
function load() {
  void controller.load(
    props.reference,
    props.userId,
    draft.value.submission_id,
    draft.value.submission_unknown === true,
    props.reviewId,
    draft.value.attempt_id
  );
}
defineExpose({ cancelPreparation: () => controller.cancelPreparation() });
watch(
  () => props.state,
  (state) => {
    draft.value = { code: props.content?.initial_code || "", ...state };
  },
  { deep: true }
);
watch(
  [
    () => `${props.reference.type}:${props.reference.task_id}:${props.reference.subtask_id}`,
    () => props.userId,
    () => props.request,
    () => props.reviewId,
  ],
  () => {
    controller.reset();
    load();
  },
  { immediate: true, flush: "sync" }
);
onBeforeUnmount(() => {
  alive = false;
  controller.dispose();
});
</script>

<style scoped>
.exercise-room {
  display: grid;
  gap: 22px;
  min-width: 0;
}
.exercise-description {
  overflow-wrap: anywhere;
  line-height: 1.65;
}
.exercise-description :deep(pre) {
  overflow-x: auto;
  max-width: 100%;
}
fieldset {
  display: grid;
  gap: 12px;
  min-width: 0;
}
legend {
  margin-bottom: 14px;
  color: #bdcedd;
}
.answer-option {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  min-height: 52px;
  border: 1px solid #39576d;
  border-radius: 12px;
  cursor: pointer;
}
.answer-option input {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 2px;
  accent-color: #0cc9ab;
}
.answer-option span {
  overflow-wrap: anywhere;
}
.matching-pair {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  padding: 12px 0;
}
select {
  min-width: 0;
  width: 100%;
  min-height: 48px;
  border: 1px solid #426074;
  border-radius: 10px;
  background: #10283c;
  color: #eaf2f8;
  padding: 12px;
  font: inherit;
}
button {
  min-height: 46px;
  border-radius: 10px;
  padding: 12px 18px;
  background: #0cc9ab;
  color: #07312d;
  font-weight: 700;
  white-space: normal;
}
button:disabled {
  opacity: 0.55;
  cursor: default;
}
.skip-exercise {
  justify-self: end;
  background: transparent;
  color: #b1d7d6;
  border: 1px solid #3e6272;
  font-weight: 500;
}
.uncertain-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.submit-action {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}
.submit-action p {
  color: #b6c9d8;
  font-size: 0.875rem;
}
.exercise-result {
  padding: 18px;
  border: 1px solid #476376;
  border-radius: 12px;
  display: grid;
  gap: 12px;
}
.correct {
  border-color: #298879;
  background: #0b3838;
}
.correct button {
  justify-self: start;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  padding: 12px;
  background: #0d1c2b;
  border-radius: 8px;
}
summary {
  padding: 12px 0;
  cursor: pointer;
}
.example {
  margin-top: 14px;
}
:is(button, select, input, summary):focus-visible {
  outline: 2px solid #71e3cf;
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .matching-pair {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
}
</style>
