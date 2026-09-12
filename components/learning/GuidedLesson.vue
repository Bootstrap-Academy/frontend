<template>
  <section v-if="step" class="guided-lesson" :aria-labelledby="`${id}-heading`">
    <div class="lesson-progress" aria-hidden="true">
      <span v-for="(_, index) in lesson.steps" :key="index" :class="{ reached: index <= stage }" />
    </div>
    <p class="step-count">{{ ui.step }} {{ stage + 1 }} / {{ lesson.steps.length }}</p>
    <h2 :id="`${id}-heading`" ref="heading" tabindex="-1">{{ step.title }}</h2>
    <p class="lesson-body">{{ step.body }}</p>

    <div v-if="step.code" class="code-example">
      <span class="block-label">Python</span>
      <pre><code>{{ step.code }}</code></pre>
      <template v-if="step.stdin">
        <span class="block-label">{{ ui.input }}</span>
        <pre>{{ step.stdin }}</pre>
      </template>
      <template v-if="step.output !== undefined">
        <span class="block-label">{{ ui.output }}</span>
        <pre class="example-output">{{ step.output }}</pre>
      </template>
    </div>

    <div v-if="step.experiment" class="experiment">
      <label :for="`${id}-slider`">
        {{ step.experiment.label }}
        <output>{{ input }}</output>
      </label>
      <input
        :id="`${id}-slider`"
        type="range"
        :min="step.experiment.min"
        :max="step.experiment.max"
        step="1"
        :value="input"
        :disabled="disabled"
        @input="changeExperiment(Number(($event.target as HTMLInputElement).value))"
      />
      <div class="range-labels" aria-hidden="true">
        <span>{{ step.experiment.min }}</span
        ><span>{{ step.experiment.max }}</span>
      </div>
      <div class="experiment-result" aria-live="polite" aria-atomic="true">
        <span>{{ step.experiment.resultLabel }}</span
        ><strong>{{ result }}</strong>
      </div>
      <pre v-if="experimentCode"><code>{{ experimentCode }}</code></pre>
    </div>

    <p v-if="step.note" class="lesson-note">{{ step.note }}</p>
    <form v-if="step.check" class="understanding-check" @submit.prevent="check">
      <fieldset :disabled="disabled">
        <legend>{{ step.check.question }}</legend>
        <label v-for="option in step.check.options" :key="option.value" class="answer-option">
          <input
            type="radio"
            :name="`${id}-answer`"
            :value="option.value"
            :checked="selected === option.value"
            @change="choose(option.value)"
          />
          <span>{{ option.text }}</span>
        </label>
      </fieldset>
      <p v-if="checked" class="check-feedback" :class="{ correct }" role="status">
        {{ correct ? step.check.correct : step.check.tryAgain }}
      </p>
      <button
        v-if="!correct"
        type="submit"
        class="primary-action"
        :disabled="disabled || !selected"
      >
        {{ ui.check }}
      </button>
    </form>

    <div class="step-actions">
      <button
        v-if="stage > 0"
        type="button"
        class="quiet-action"
        :disabled="disabled"
        @click="go(-1)"
      >
        ← {{ ui.back }}
      </button>
      <button
        v-if="!step.check || correct"
        type="button"
        class="primary-action next-action"
        :disabled="disabled"
        @click="next"
      >
        {{ stage === lesson.steps.length - 1 ? ui.finish : ui.next }}
        <span aria-hidden="true">→</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId } from "vue";
import {
  experimentInput,
  experimentResult,
  guidedStage,
  lessonAnswers,
  type GuidedLesson,
} from "~/utils/guidedLesson";

const props = defineProps<{
  content: Record<string, unknown>;
  state: Record<string, unknown>;
  disabled: boolean;
  locale: string;
}>();
const emit = defineEmits<{
  change: [state: Record<string, unknown>];
  complete: [answer: Record<string, unknown>];
}>();
const id = useId();
const heading = ref<HTMLElement | null>(null);
const lesson = computed(() => props.content as unknown as GuidedLesson);
const stage = computed(() => guidedStage(props.state.stage, lesson.value.steps?.length || 0));
const step = computed(() => lesson.value.steps?.[stage.value]);
const answers = computed(() => object(props.state.answers));
const checks = computed(() => object(props.state.checks));
const selected = computed(() => (step.value?.check ? answers.value[step.value.check.id] : ""));
const checked = computed(
  () =>
    !!step.value?.check &&
    typeof selected.value === "string" &&
    checks.value[step.value.check.id] === selected.value
);
const correct = computed(() => checked.value && selected.value === step.value?.check?.answer);
const input = computed(() => {
  const experiment = step.value?.experiment;
  return experiment
    ? experimentInput(experiment, object(props.state.experiments)[experiment.id])
    : 0;
});
const result = computed(() =>
  step.value?.experiment ? experimentResult(step.value.experiment, input.value) : 0
);
const experimentCode = computed(() =>
  step.value?.experiment?.code
    ?.replaceAll("{input}", String(input.value))
    .replaceAll("{result}", String(result.value))
);
const ui = computed(() =>
  props.locale.startsWith("en")
    ? {
        step: "Step",
        input: "Input",
        output: "Output",
        check: "Check answer",
        back: "Back",
        next: "Next",
        finish: "Try it yourself",
      }
    : {
        step: "Schritt",
        input: "Eingabe",
        output: "Ausgabe",
        check: "Antwort prüfen",
        back: "Zurück",
        next: "Weiter",
        finish: "Selbst ausprobieren",
      }
);
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function update(patch: Record<string, unknown>) {
  if (!props.disabled) emit("change", { ...props.state, ...patch });
}
function choose(answer: string) {
  if (!step.value?.check || props.disabled) return;
  const { id, options } = step.value.check;
  if (!options.some((option) => option.value === answer)) return;
  update({ answers: { ...answers.value, [id]: answer }, checks: { ...checks.value, [id]: null } });
}
function check() {
  if (props.disabled || !step.value?.check || !selected.value) return;
  update({ checks: { ...checks.value, [step.value.check.id]: selected.value } });
}
function changeExperiment(value: number) {
  const experiment = step.value?.experiment;
  if (!experiment || props.disabled) return;
  update({
    experiments: {
      ...object(props.state.experiments),
      [experiment.id]: experimentInput(experiment, value),
    },
  });
}
async function go(change: number) {
  if (props.disabled) return;
  update({ stage: guidedStage(stage.value + change, lesson.value.steps.length) });
  await nextTick();
  heading.value?.focus({ preventScroll: true });
  heading.value?.scrollIntoView({ block: "nearest" });
}
function next() {
  if (props.disabled || (step.value?.check && !correct.value)) return;
  if (stage.value < lesson.value.steps.length - 1) return void go(1);
  const answer = lessonAnswers(lesson.value, answers.value);
  if (answer) emit("complete", answer);
}
</script>

<style scoped>
.guided-lesson {
  display: grid;
  gap: 20px;
  min-width: 0;
}
.lesson-progress {
  display: flex;
  gap: 6px;
}
.lesson-progress span {
  flex: 1;
  height: 4px;
  border-radius: 4px;
  background: #263a54;
}
.lesson-progress .reached {
  background: #36dfbe;
}
.step-count,
.block-label {
  color: #b5c7db;
  font-size: 0.85rem;
}
h2 {
  font-size: clamp(1.45rem, 3vw, 2rem);
  font-weight: 700;
  line-height: 1.25;
  outline: none;
}
.lesson-body,
.lesson-note {
  line-height: 1.75;
  white-space: pre-line;
}
.lesson-note {
  padding: 16px 20px;
  border-left: 3px solid #36dfbe;
  background: #142940;
  border-radius: 0 12px 12px 0;
}
.code-example,
.experiment {
  min-width: 0;
  padding: 22px;
  border: 1px solid #344c67;
  border-radius: 16px;
  background: #0c1b2c;
}
.code-example {
  display: grid;
  gap: 12px;
}
pre {
  overflow-x: auto;
  font:
    0.95rem/1.8 ui-monospace,
    monospace;
  tab-size: 4;
}
.example-output {
  color: #72e5cd;
}
.experiment label,
.experiment-result,
.range-labels {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}
.experiment output {
  font-weight: 700;
  color: #72e5cd;
}
.experiment input {
  width: 100%;
  min-height: 44px;
  accent-color: #36dfbe;
  margin-top: 8px;
}
.range-labels {
  font-size: 0.8rem;
  color: #b5c7db;
}
.experiment-result {
  align-items: center;
  margin: 20px 0;
  padding: 14px 18px;
  border-radius: 10px;
  background: #1a344d;
}
.experiment-result strong {
  color: #72e5cd;
  font-size: 1.6rem;
}
.understanding-check,
fieldset {
  display: grid;
  gap: 12px;
}
legend {
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.6;
}
.answer-option {
  display: flex;
  gap: 14px;
  align-items: center;
  min-height: 52px;
  border: 1px solid #3a5270;
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  white-space: pre-line;
}
.answer-option:has(input:checked) {
  background: #173c49;
  border-color: #36dfbe;
}
.answer-option input {
  accent-color: #36dfbe;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.check-feedback {
  padding: 14px 18px;
  border-radius: 12px;
  background: #273248;
  color: #fff0d6;
  line-height: 1.7;
}
.check-feedback.correct {
  background: #123b35;
  color: #aff8df;
}
.step-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 8px;
}
.primary-action,
.quiet-action {
  min-height: 48px;
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 650;
}
.primary-action {
  background: #36dfbe;
  color: #082b2b;
  justify-self: start;
}
.quiet-action {
  color: #dbe7f5;
}
.next-action {
  margin-left: auto;
}
button:disabled,
input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible {
  outline: 3px solid #ffd487;
  outline-offset: 4px;
}
@media (max-width: 480px) {
  .code-example,
  .experiment {
    padding: 16px;
  }
  .primary-action {
    padding: 12px 16px;
  }
}
</style>
