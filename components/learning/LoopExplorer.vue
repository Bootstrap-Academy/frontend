<template>
  <section class="loop-explorer" :aria-labelledby="`${id}-heading`">
    <div class="chapter-track" aria-hidden="true">
      <span
        v-for="(step, index) in lesson.steps"
        :key="step.id"
        :class="{ reached: index <= stage }"
      />
    </div>
    <p class="chapter-count">{{ ui.step }} {{ stage + 1 }} / {{ lesson.steps.length }}</p>
    <h2 :id="`${id}-heading`" ref="heading" tabindex="-1">{{ current.title }}</h2>
    <p class="introduction">{{ current.body }}</p>

    <template v-if="stage < 4">
      <div class="instruction">
        <span class="instruction-symbol" aria-hidden="true">↗</span>
        <div>
          <span class="small-label">{{ ui.instruction }}</span>
          <strong>{{ instruction }}</strong>
        </div>
        <span v-if="stage > 0" class="repeat-count">× {{ repetitions }}</span>
      </div>
      <p v-if="stage === 3" :id="`${id}-goal`" class="question practice-goal">
        {{ lesson.practice.question }}
      </p>

      <div v-if="stage !== 2" class="experiment">
        <div class="walking-track" :style="{ '--spaces': cells.length }" aria-hidden="true">
          <div
            v-for="cell in cells"
            :key="cell"
            class="space"
            :class="{
              visited: cell <= position,
              destination: stage === 3 && cell === lesson.practice.target,
            }"
          >
            <span class="figure-slot">
              <svg v-if="cell === position" viewBox="0 0 24 40" class="figure">
                <circle cx="12" cy="5" r="4" />
                <path
                  d="M8 11Q12 9 16 11Q18 12 19 17L22 25Q23 29 20 29L17 21L16 28L17 37Q17 40 14 40L12 30L10 40Q7 40 7 37L8 28L7 21L4 29Q1 29 2 25L5 17Q6 12 8 11Z"
                />
              </svg>
              <span v-else-if="stage === 3 && cell === lesson.practice.target" class="target"
                >◎</span
              >
            </span>
            <span class="tile">{{ cell }}</span>
          </div>
        </div>
        <p class="experiment-result" role="status" aria-live="polite">{{ positionText }}</p>
        <button
          v-if="stage === 0"
          type="button"
          class="action"
          :disabled="disabled"
          @click="update({ singleDone: !singleDone })"
        >
          {{ singleDone ? ui.reset : ui.move }}<span aria-hidden="true">→</span>
        </button>
      </div>

      <div v-if="stage === 1 || stage === 3" class="repeat-control">
        <label :for="`${id}-repetitions`"
          >{{ ui.repetitions }}<output>{{ repetitions }}</output></label
        >
        <input
          :id="`${id}-repetitions`"
          type="range"
          :min="range.min"
          :max="range.max"
          step="1"
          :value="repetitions"
          :disabled="disabled"
          :aria-describedby="stage === 3 ? `${id}-goal` : undefined"
          @input="setRepetitions"
        />
        <div class="range-ends" aria-hidden="true">
          <span>{{ range.min }}</span
          ><span>{{ range.max }}</span>
        </div>
      </div>

      <form
        v-if="stage === 2"
        class="answer-form"
        @submit.prevent="update({ predictionChecked: true })"
      >
        <label :for="`${id}-prediction`">{{ lesson.prediction.question }}</label>
        <div class="answer-row">
          <input
            :id="`${id}-prediction`"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            :value="prediction"
            :disabled="disabled"
            :aria-describedby="predictionChecked ? `${id}-prediction-feedback` : undefined"
            @input="
              update({
                prediction: ($event.target as HTMLInputElement).value,
                predictionChecked: false,
              })
            "
          />
          <button type="submit" class="action" :disabled="disabled || prediction.trim() === ''">
            {{ ui.check }}
          </button>
        </div>
        <p
          v-if="predictionChecked"
          :id="`${id}-prediction-feedback`"
          class="feedback"
          :class="{ correct: predictionCorrect }"
          role="status"
        >
          {{ predictionCorrect ? lesson.prediction.correct : lesson.prediction.tryAgain }}
        </p>
      </form>

      <div v-if="stage === 3" class="guided-practice">
        <button
          type="button"
          class="text-action"
          :aria-expanded="hintOpen"
          :disabled="disabled"
          @click="update({ hintOpen: !hintOpen })"
        >
          {{ hintOpen ? ui.hideHint : ui.hint }}
        </button>
        <p v-if="hintOpen" class="hint">{{ lesson.practice.hint }}</p>
        <p v-if="practiceCorrect" class="feedback correct" role="status">
          {{ lesson.practice.correct }}
        </p>
      </div>
    </template>

    <div v-else class="code-bridge">
      <div class="code-example">
        <pre><code>{{ lesson.code.single }}</code></pre>
        <p>{{ lesson.code.singleExplanation }}</p>
      </div>
      <div class="code-example">
        <pre><code>{{ lesson.code.loop }}</code></pre>
        <p>{{ lesson.code.loopExplanation }}</p>
        <ul>
          <li v-for="note in lesson.code.notes" :key="note">{{ note }}</li>
        </ul>
      </div>
      <div class="code-output">
        <span class="small-label">{{ lesson.code.outputLabel }}</span>
        <pre><code v-for="line in lesson.code.repeatCount" :key="line">{{ lesson.code.outputLine }}{{ "\n" }}</code></pre>
      </div>
      <p class="next-connection">{{ lesson.code.next }}</p>
    </div>

    <nav class="step-actions" :aria-label="ui.navigation">
      <button
        v-if="stage > 0"
        type="button"
        class="text-action"
        :disabled="disabled"
        @click="goTo(stage - 1)"
      >
        ← {{ ui.back }}
      </button>
      <button
        v-if="stage < 4"
        type="button"
        class="action next-action"
        :disabled="disabled || !canContinue"
        @click="goTo(stage + 1)"
      >
        {{ ui.next }}<span aria-hidden="true">→</span>
      </button>
      <button
        v-else
        type="button"
        class="action next-action"
        :disabled="disabled"
        @click="
          emit('complete', { prediction: Number(prediction), repetitions: practiceRepetitions })
        "
      >
        {{ ui.finish }}<span aria-hidden="true">→</span>
      </button>
    </nav>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId } from "vue";

type Step = { id: string; title: string; body: string };
type Range = { min: number; max: number; initial: number };
type LoopContent = {
  steps: Step[];
  single: { instruction: string; result: string; start: string };
  repeat: Range & { instruction: string; result: string };
  prediction: {
    instruction: string;
    repetitions: number;
    stride: number;
    question: string;
    correct: string;
    tryAgain: string;
  };
  practice: Range & {
    instruction: string;
    target: number;
    stride: number;
    question: string;
    hint: string;
    correct: string;
    position: string;
  };
  code: {
    single: string;
    singleExplanation: string;
    loop: string;
    loopExplanation: string;
    notes: string[];
    outputLine: string;
    repeatCount: number;
    outputLabel: string;
    next: string;
  };
};
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
const lesson = computed(() => props.content as unknown as LoopContent);
const ui = computed(() =>
  props.locale.startsWith("en")
    ? {
        step: "Step",
        instruction: "Instruction",
        repetitions: "Repetitions",
        move: "Move one step",
        reset: "Back to the start",
        check: "Check prediction",
        hint: "Give me a hint",
        hideHint: "Hide hint",
        back: "Back",
        next: "Continue",
        finish: "Finish introduction",
        navigation: "Introduction steps",
      }
    : {
        step: "Schritt",
        instruction: "Anweisung",
        repetitions: "Wiederholungen",
        move: "Einen Schritt gehen",
        reset: "Zurück zum Start",
        check: "Vorhersage prüfen",
        hint: "Gib mir einen Tipp",
        hideHint: "Tipp ausblenden",
        back: "Zurück",
        next: "Weiter",
        finish: "Einführung abschließen",
        navigation: "Schritte der Einführung",
      }
);
function integer(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}
const stage = computed(() => integer(props.state.stage, 0, 0, 4));
const current = computed(() => lesson.value.steps[stage.value]);
const singleDone = computed(() => props.state.singleDone === true);
const prediction = computed(() =>
  typeof props.state.prediction === "string" || typeof props.state.prediction === "number"
    ? String(props.state.prediction)
    : ""
);
const predictionChecked = computed(() => props.state.predictionChecked === true);
const predictionCorrect = computed(
  () =>
    prediction.value.trim() !== "" &&
    Number(prediction.value) ===
      lesson.value.prediction.repetitions * lesson.value.prediction.stride
);
const practiceRepetitions = computed(() =>
  integer(
    props.state.practiceRepetitions,
    lesson.value.practice.initial,
    lesson.value.practice.min,
    lesson.value.practice.max
  )
);
const practiceCorrect = computed(
  () => practiceRepetitions.value * lesson.value.practice.stride === lesson.value.practice.target
);
const hintOpen = computed(() => props.state.hintOpen === true);
const range = computed(() => (stage.value === 3 ? lesson.value.practice : lesson.value.repeat));
const repetitions = computed(() =>
  stage.value === 2
    ? lesson.value.prediction.repetitions
    : stage.value === 3
      ? practiceRepetitions.value
      : integer(
          props.state.repetitions,
          lesson.value.repeat.initial,
          lesson.value.repeat.min,
          lesson.value.repeat.max
        )
);
const instruction = computed(() =>
  stage.value === 0
    ? lesson.value.single.instruction
    : stage.value === 1
      ? lesson.value.repeat.instruction
      : stage.value === 2
        ? lesson.value.prediction.instruction
        : lesson.value.practice.instruction
);
const cells = computed(() =>
  Array.from(
    { length: (stage.value === 3 ? lesson.value.practice.max : lesson.value.repeat.max) + 1 },
    (_, i) => i * (stage.value === 3 ? lesson.value.practice.stride : 1)
  )
);
const position = computed(() =>
  stage.value === 0
    ? Number(singleDone.value)
    : stage.value === 3
      ? practiceRepetitions.value * lesson.value.practice.stride
      : repetitions.value
);
const positionText = computed(() =>
  stage.value === 0
    ? singleDone.value
      ? lesson.value.single.result
      : lesson.value.single.start
    : (stage.value === 3 ? lesson.value.practice.position : lesson.value.repeat.result)
        .replaceAll("{count}", String(repetitions.value))
        .replaceAll("{position}", String(position.value))
);
const canContinue = computed(() =>
  stage.value === 0
    ? singleDone.value
    : stage.value === 2
      ? predictionChecked.value && predictionCorrect.value
      : stage.value === 3
        ? practiceCorrect.value
        : true
);
function update(patch: Record<string, unknown>) {
  if (!props.disabled) emit("change", { ...props.state, ...patch });
}
function setRepetitions(event: Event) {
  update({
    [stage.value === 3 ? "practiceRepetitions" : "repetitions"]: Number(
      (event.target as HTMLInputElement).value
    ),
  });
}
async function goTo(next: number) {
  update({ stage: next });
  await nextTick();
  heading.value?.focus({ preventScroll: true });
  heading.value?.scrollIntoView({ block: "nearest" });
}
</script>

<style scoped>
.loop-explorer {
  color: #edf3fb;
  max-width: 760px;
  margin: auto;
}
.chapter-track {
  display: flex;
  gap: 7px;
  margin-bottom: 18px;
}
.chapter-track span {
  height: 4px;
  flex: 1;
  border-radius: 8px;
  background: #294256;
}
.chapter-track .reached {
  background: var(--color-accent, #0cc9ab);
}
.chapter-count,
.small-label {
  color: #a8bfd0;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
}
h2 {
  margin: 6px 0 12px;
  font-size: clamp(1.45rem, 4vw, 2rem);
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}
p,
li {
  color: inherit;
  line-height: 1.6;
}
.introduction {
  max-width: 65ch;
  color: #c6d5e2;
}
.instruction {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  margin: 26px 0 0;
  background: #102c3b;
  border: 1px solid #2d5660;
  border-radius: 14px;
}
.instruction-symbol {
  color: #76e2ca;
  font-size: 1.8rem;
}
.instruction > div {
  flex: 1;
  min-width: 0;
}
.instruction .small-label {
  display: block;
  margin-bottom: 3px;
}
.instruction strong {
  display: block;
  font-weight: 550;
  overflow-wrap: anywhere;
}
.repeat-count {
  flex-shrink: 0;
  color: #78e5cf;
  font-size: 1.45rem;
  font-weight: 650;
}
.experiment {
  margin-top: 12px;
  padding: 20px 18px;
  border: 1px solid #294256;
  border-radius: 14px;
  background: #101f32;
}
.walking-track {
  display: grid;
  grid-template-columns: repeat(var(--spaces), minmax(0, 1fr));
  gap: 5px;
}
.space {
  min-width: 0;
  text-align: center;
}
.figure-slot {
  display: grid;
  place-items: end center;
  height: 50px;
  padding-bottom: 8px;
}
.figure {
  width: 23px;
  height: 38px;
  fill: #0cc9ab;
}
.target {
  font-size: 1.6rem;
  line-height: 1.1;
  color: #f2ce84;
}
.tile {
  display: block;
  border-top: 3px solid #35516a;
  padding: 8px 0 0;
  color: #9fb3c7;
  font-size: 0.85rem;
}
.visited .tile {
  border-top-color: #0cc9ab;
}
.destination .tile {
  color: #f2ce84;
  border-top-color: #f2ce84;
}
.experiment-result {
  margin: 20px 0 0;
  min-height: 1.6em;
  color: #c6d5e2;
  font-size: 0.9rem;
}
.experiment > button {
  margin-top: 18px;
}
.repeat-control {
  margin-top: 24px;
}
.repeat-control label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-weight: 550;
}
.repeat-control output {
  color: #82e5d1;
  font-variant-numeric: tabular-nums;
}
input[type="range"] {
  width: 100%;
  height: 44px;
  margin: 2px 0;
  padding: 0;
  accent-color: #0cc9ab;
  cursor: pointer;
}
.range-ends {
  display: flex;
  justify-content: space-between;
  color: #9fb3c7;
  font-size: 0.8rem;
}
.answer-form,
.guided-practice {
  margin-top: 26px;
}
.practice-goal {
  margin-top: 24px;
}
.answer-form label,
.question {
  display: block;
  font-weight: 550;
  line-height: 1.55;
}
.answer-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
}
.answer-row input {
  width: 110px;
  min-height: 46px;
  border: 1px solid #527087;
  border-radius: 9px;
  padding: 10px 13px;
  color: #edf3fb;
  background: #101f32;
  font: inherit;
}
.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 46px;
  border: 1px solid #0cc9ab;
  border-radius: 9px;
  padding: 11px 17px;
  color: #07312c;
  background: #0cc9ab;
  font: inherit;
  font-weight: 650;
  line-height: 1.4;
  cursor: pointer;
}
.action:hover:not(:disabled) {
  background: #64e2c9;
}
button:disabled,
input:disabled {
  opacity: 0.5;
  cursor: default;
}
.text-action {
  border: 0;
  background: transparent;
  min-height: 44px;
  padding: 9px 0;
  color: #85e4d2;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.feedback,
.hint {
  margin-top: 15px;
  border-left: 3px solid #7194ad;
  padding: 9px 14px;
  color: #c6d5e2;
}
.feedback.correct {
  border-color: #0cc9ab;
  color: #b5efdf;
}
.step-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-top: 1px solid #294256;
  margin-top: 30px;
  padding-top: 22px;
}
.next-action {
  margin-left: auto;
}
.code-bridge {
  display: grid;
  gap: 22px;
  margin-top: 26px;
}
.code-example p {
  margin-top: 12px;
  color: #c6d5e2;
}
pre {
  margin: 0;
  padding: 17px;
  border: 1px solid #2b4b61;
  border-radius: 12px;
  background: #091c2a;
  color: #9be8d5;
  line-height: 1.7;
  font-size: 0.92rem;
  overflow-x: auto;
}
code {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
.code-example ul {
  margin: 12px 0 0;
  padding-left: 22px;
  color: #c6d5e2;
}
.code-example li + li {
  margin-top: 8px;
}
.code-output {
  border: 1px solid #294256;
  border-radius: 12px;
  padding: 16px;
}
.code-output pre {
  border: 0;
  background: none;
  border-radius: 0;
  padding: 10px 0 0;
}
.next-connection {
  color: #b5efdf;
}
:is(button, input):focus-visible {
  outline: 2px solid #b5efdf;
  outline-offset: 4px;
}
h2:focus {
  outline: none;
}
@media (max-width: 420px) {
  .instruction,
  .experiment {
    padding: 15px 12px;
  }
  .walking-track {
    gap: 3px;
  }
  .answer-row .action {
    flex: 1;
  }
  .answer-row input {
    width: 90px;
  }
  .step-actions .action {
    max-width: 100%;
  }
  pre {
    padding: 13px;
    font-size: 0.85rem;
  }
}
</style>
