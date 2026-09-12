<template>
  <section class="percentage-explorer" :aria-labelledby="`${id}-heading`">
    <div class="chapter-track" aria-hidden="true">
      <span class="reached" /><span :class="{ reached: answering }" />
    </div>
    <p class="chapter-count">{{ ui.step }} {{ answering ? 2 : 1 }} / 2</p>
    <h2 :id="`${id}-heading`" ref="heading" tabindex="-1">
      {{ answering ? lesson.questionTitle : lesson.title }}
    </h2>
    <p class="introduction">{{ answering ? lesson.question : lesson.intro }}</p>

    <template v-if="!answering">
      <div class="price-experiment">
        <div class="price-heading">
          <span class="small-label">{{ ui.original }}</span>
          <strong>{{ money(lesson.price) }}</strong>
        </div>
        <div class="price-bar" aria-hidden="true">
          <span class="remaining" :style="{ flexBasis: `${100 - discount}%` }" />
          <span class="saving" :style="{ flexBasis: `${discount}%` }" />
        </div>
        <dl class="price-parts" aria-live="polite" aria-atomic="true">
          <div>
            <dt><span class="legend paid" aria-hidden="true" />{{ ui.youPay }}</dt>
            <dd>{{ money(discountedPrice) }}</dd>
          </div>
          <div>
            <dt><span class="legend saved" aria-hidden="true" />{{ ui.discount }}</dt>
            <dd>−{{ money(saving) }}</dd>
          </div>
        </dl>
        <label :for="`${id}-discount`"
          >{{ ui.discount }}<output>{{ discount }} %</output></label
        >
        <input
          :id="`${id}-discount`"
          type="range"
          :min="lesson.explore.min"
          :max="lesson.explore.max"
          :step="lesson.explore.step"
          :value="discount"
          :disabled="disabled"
          @input="update({ discount: Number(($event.target as HTMLInputElement).value) })"
        />
        <div class="range-ends" aria-hidden="true">
          <span>{{ lesson.explore.min }} %</span><span>{{ lesson.explore.max }} %</span>
        </div>
      </div>
      <p class="explanation">{{ lesson.explanation }}</p>
      <div class="step-actions">
        <button type="button" class="action" :disabled="disabled" @click="goTo(1)">
          {{ ui.try }}<span aria-hidden="true">→</span>
        </button>
      </div>
    </template>

    <form v-else class="answer-form" @submit.prevent="checkAnswer">
      <div class="offer" aria-hidden="true">
        <strong>{{ money(lesson.price) }}</strong
        ><span>−{{ lesson.discount }} %</span>
      </div>
      <label :for="`${id}-answer`">{{ ui.finalPrice }}</label>
      <div class="answer-input">
        <input
          :id="`${id}-answer`"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          :value="answer"
          :disabled="disabled"
          :aria-describedby="checked ? `${id}-feedback` : undefined"
          @input="update({ answer: ($event.target as HTMLInputElement).value, checked: false })"
        />
        <span>{{ lesson.currency }}</span>
      </div>
      <button
        type="button"
        class="text-action"
        :disabled="disabled"
        :aria-expanded="hintOpen"
        @click="update({ hintOpen: !hintOpen })"
      >
        {{ hintOpen ? ui.hideHint : ui.hint }}
      </button>
      <p v-if="hintOpen" class="hint">{{ lesson.hint }}</p>
      <p v-if="checked" :id="`${id}-feedback`" class="feedback" role="status">
        {{ lesson.tryAgain }}
      </p>
      <div class="step-actions">
        <button type="button" class="text-action" :disabled="disabled" @click="goTo(0)">
          ← {{ ui.back }}
        </button>
        <button type="submit" class="action" :disabled="disabled || !validAmount">
          {{ ui.check }}<span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId } from "vue";

type PercentageContent = {
  title: string;
  intro: string;
  price: number;
  currency: string;
  explore: { min: number; max: number; step: number; initial: number };
  explanation: string;
  questionTitle: string;
  discount: number;
  question: string;
  hint: string;
  tryAgain: string;
  closing: string;
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
const lesson = computed(() => props.content as unknown as PercentageContent);
const ui = computed(() =>
  props.locale.startsWith("en")
    ? {
        step: "Step",
        original: "Original price",
        youPay: "You pay",
        discount: "Discount",
        try: "Try it yourself",
        finalPrice: "Your price after the discount",
        check: "Check answer",
        hint: "Give me a hint",
        hideHint: "Hide hint",
        back: "Back",
      }
    : {
        step: "Schritt",
        original: "Ursprünglicher Preis",
        youPay: "Du bezahlst",
        discount: "Rabatt",
        try: "Selbst ausprobieren",
        finalPrice: "Dein Preis nach dem Rabatt",
        check: "Antwort prüfen",
        hint: "Gib mir einen Tipp",
        hideHint: "Tipp ausblenden",
        back: "Zurück",
      }
);
const answering = computed(() => props.state.stage === 1);
const discount = computed(() =>
  typeof props.state.discount === "number" && Number.isFinite(props.state.discount)
    ? Math.min(lesson.value.explore.max, Math.max(lesson.value.explore.min, props.state.discount))
    : lesson.value.explore.initial
);
const saving = computed(() => (lesson.value.price * discount.value) / 100);
const discountedPrice = computed(() => lesson.value.price - saving.value);
const answer = computed(() =>
  typeof props.state.answer === "string" || typeof props.state.answer === "number"
    ? String(props.state.answer)
    : ""
);
const validAmount = computed(() => /^\d+(?:[.,]\d{1,2})?$/.test(answer.value.trim()));
const checked = computed(() => props.state.checked === true);
const hintOpen = computed(() => props.state.hintOpen === true);
const money = (amount: number) =>
  new Intl.NumberFormat(props.locale, {
    style: "currency",
    currency: lesson.value.currency,
  }).format(amount);
function update(patch: Record<string, unknown>) {
  if (!props.disabled) emit("change", { ...props.state, ...patch });
}
async function goTo(stage: number) {
  update({ stage });
  await nextTick();
  heading.value?.focus({ preventScroll: true });
  heading.value?.scrollIntoView({ block: "nearest" });
}
function checkAnswer() {
  if (props.disabled || !validAmount.value) return;
  const amount = Number(answer.value.trim().replace(",", "."));
  const expectedCents = Math.round(lesson.value.price * (100 - lesson.value.discount));
  if (Math.round(amount * 100) !== expectedCents) update({ checked: true });
  else emit("complete", { answer: amount });
}
</script>

<style scoped>
.percentage-explorer {
  max-width: 700px;
  margin: auto;
  color: #edf3fb;
}
.chapter-track {
  display: flex;
  gap: 7px;
  margin-bottom: 18px;
}
.chapter-track span {
  flex: 1;
  height: 4px;
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
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
p {
  color: inherit;
  line-height: 1.6;
}
.introduction {
  color: #c6d5e2;
  max-width: 65ch;
}
.price-experiment {
  padding: 25px;
  margin-top: 26px;
  border: 1px solid #2f5164;
  border-radius: 16px;
  background: #102737;
}
.price-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.price-heading strong {
  font-size: 1.6rem;
  font-weight: 600;
}
.price-bar {
  display: flex;
  height: 32px;
  border-radius: 7px;
  overflow: hidden;
  margin-top: 24px;
}
.remaining {
  background: #0cc9ab;
}
.saving {
  background: repeating-linear-gradient(135deg, #dfb96f 0 5px, #b18d48 5px 7px);
}
.price-parts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 7rem), 1fr));
  gap: 16px;
  margin-top: 18px;
}
dt {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #c6d5e2;
  font-size: 0.85rem;
}
dd {
  margin: 6px 0 0;
  font-size: 1.4rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.legend {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 2px;
}
.paid {
  background: #0cc9ab;
}
.saved {
  background: #dfb96f;
}
.price-experiment label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-weight: 550;
  margin-top: 26px;
}
output {
  color: #87e8d4;
}
input[type="range"] {
  width: 100%;
  height: 44px;
  padding: 0;
  margin: 2px 0;
  accent-color: #0cc9ab;
  cursor: pointer;
}
.range-ends {
  display: flex;
  justify-content: space-between;
  color: #9fb3c7;
  font-size: 0.8rem;
}
.explanation {
  color: #c6d5e2;
  margin-top: 20px;
}
.action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 46px;
  padding: 11px 17px;
  border: 1px solid #0cc9ab;
  border-radius: 9px;
  background: #0cc9ab;
  color: #07312c;
  font: inherit;
  font-weight: 650;
  line-height: 1.4;
  cursor: pointer;
}
.action:hover:not(:disabled) {
  background: #64e2c9;
}
.step-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-top: 1px solid #294256;
  padding-top: 22px;
  margin-top: 30px;
}
.step-actions .action {
  margin-left: auto;
}
.offer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin: 25px 0;
}
.offer strong {
  color: #c6d5e2;
  font-size: 1.3rem;
  font-weight: 550;
}
.offer span {
  border: 1px solid #467264;
  border-radius: 8px;
  padding: 5px 10px;
  color: #96e8c4;
  background: #173c37;
  font-size: 1.15rem;
  font-weight: 650;
}
.answer-form > label {
  display: block;
  font-weight: 550;
  line-height: 1.55;
}
.answer-input {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.answer-input input {
  width: 150px;
  max-width: calc(100% - 60px);
  min-height: 46px;
  padding: 10px 13px;
  border: 1px solid #527087;
  border-radius: 9px;
  color: #edf3fb;
  background: #101f32;
  font: inherit;
}
.answer-input > span {
  color: #a8bfd0;
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
.answer-form > .text-action {
  margin-top: 12px;
}
.hint,
.feedback {
  margin-top: 12px;
  border-left: 3px solid #7194ad;
  padding: 9px 14px;
  color: #c6d5e2;
}
button:disabled,
input:disabled {
  opacity: 0.5;
  cursor: default;
}
:is(button, input):focus-visible {
  outline: 2px solid #b5efdf;
  outline-offset: 4px;
}
h2:focus {
  outline: none;
}
@media (max-width: 420px) {
  .price-experiment {
    padding: 20px 16px;
  }
  .price-parts {
    gap: 12px;
  }
  .price-parts dt {
    align-items: baseline;
  }
  .step-actions .action {
    max-width: 100%;
  }
}
</style>
