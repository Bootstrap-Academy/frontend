<template>
  <section class="it-lab">
    <template v-if="lesson">
      <p class="lab-intro">{{ lesson.intro }}</p>
      <p
        v-if="lesson.scenario.startsWith('project-') || lesson.scenario === 'input-output'"
        class="lab-world"
      >
        {{ lesson.worldNote }}
      </p>
      <h2 ref="workspaceHeading" tabindex="-1">{{ ui.experiment }}</h2>
      <p>{{ lesson.task }}</p>
      <p v-if="invalid" role="alert">{{ ui.invalid }}</p>
      <ItMachine
        v-if="lab.model.machine"
        :scenario="lesson.scenario"
        :model="lab.model.machine"
        :locale="locale"
        :disabled="disabled || invalid"
        @action="act"
      />
      <ItBitLab
        v-else-if="lab.model.bits"
        :scenario="lesson.scenario"
        :model="lab.model.bits"
        :locale="locale"
        :disabled="disabled || invalid"
        @action="act"
      />
      <ItWorkspace
        v-else-if="lab.model.workspace"
        :scenario="lesson.scenario"
        :model="lab.model.workspace"
        :locale="locale"
        :disabled="disabled || invalid"
        @action="act"
      />
      <ItNetwork
        v-else-if="lab.model.network"
        :scenario="lesson.scenario"
        :model="lab.model.network"
        :locale="locale"
        :disabled="disabled || invalid"
        @action="act"
      />
      <p v-if="actionError" role="status">{{ ui.limit }}</p>
      <button type="button" class="lab-reset" :disabled="disabled" @click="reset">
        {{ ui.reset }}
      </button>
      <aside class="lab-observation">
        <h3>{{ ui.observation }}</h3>
        <p>{{ lesson.observe }}</p>
      </aside>
      <form @submit.prevent="check">
        <fieldset v-for="q in lesson.checks" :key="q.id" :disabled="disabled || invalid">
          <legend>{{ q.question }}</legend>
          <label v-for="option in q.options" :key="option.id" class="lab-option"
            ><input
              type="radio"
              :name="`${id}-${q.id}`"
              :value="option.id"
              :checked="answers[q.id] === option.id"
              @change="choose(q.id, option.id)"
            /><span>{{ option.text }}</span></label
          >
          <p v-if="draft.checked" class="lab-feedback" role="status">
            {{ answers[q.id] === q.answer ? ui.correct : ui.retry }} {{ q.explanation }}
          </p>
        </fieldset>
        <p v-if="needsExperiment" role="status">{{ ui.tryFirst }}</p>
        <button
          v-if="!passed"
          class="lab-primary"
          type="submit"
          :disabled="disabled || invalid || !allAnswered"
        >
          {{ ui.check }}
        </button>
        <button v-else class="lab-primary" type="button" :disabled="disabled" @click="complete">
          {{ ui.finish }}
        </button>
      </form>
    </template>
    <p v-else role="alert">{{ ui.unavailable }}</p>
  </section>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from "vue";
import ItMachine from "./ItMachine.vue";
import ItBitLab from "./ItBitLab.vue";
import ItWorkspace from "./ItWorkspace.vue";
import ItNetwork from "./ItNetwork.vue";
import {
  parseLabContent,
  readLab,
  editLab,
  labAnswers,
  type LabAction,
  type LabModel,
} from "~/utils/itLabModels";
import { itLabCopy } from "~/utils/itLabCopy";
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
const id = useId(),
  workspaceHeading = ref<HTMLElement | null>(null);
const lesson = computed(() => parseLabContent(props.content)),
  ui = computed(() => itLabCopy(props.locale));
const draft = ref<Record<string, unknown>>({ ...props.state });
watch(
  () => props.state,
  (state) => {
    draft.value = { ...state };
  },
  { flush: "sync" }
);
const actionError = ref(false),
  needsExperiment = ref(false);
const lab = computed(() =>
  lesson.value
    ? readLab(lesson.value.scenario, draft.value.model)
    : { model: {} as LabModel, tape: [], invalid: true }
);
const invalid = computed(
  () =>
    lab.value.invalid ||
    (draft.value.schema !== undefined && draft.value.schema !== "it-lab-state/1") ||
    (draft.value.scenario !== undefined && draft.value.scenario !== lesson.value?.scenario)
);
const answers = computed<Record<string, string>>(() => {
  const raw = draft.value.answers;
  const result: Record<string, string> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw))
    for (const q of lesson.value?.checks || []) {
      const v = (raw as Record<string, unknown>)[q.id];
      if (typeof v === "string" && q.options.some((o) => o.id === v)) result[q.id] = v;
    }
  return result;
});
const allAnswered = computed(() => lesson.value?.checks.every((q) => answers.value[q.id]));
const passed = computed(
  () =>
    !!lesson.value &&
    draft.value.checked === true &&
    lab.value.tape.length > 0 &&
    !invalid.value &&
    !!labAnswers(lesson.value, answers.value)
);
function update(patch: Record<string, unknown>) {
  if (props.disabled || !lesson.value) return;
  draft.value = {
    schema: "it-lab-state/1",
    scenario: lesson.value.scenario,
    model: { tape: lab.value.tape },
    answers: answers.value,
    checked: draft.value.checked === true,
    ...patch,
  };
  emit("change", draft.value);
}
function act(action: LabAction) {
  if (props.disabled || !lesson.value || invalid.value) return;
  const model = editLab(lesson.value.scenario, draft.value.model, action);
  if (!model) {
    actionError.value = true;
    return;
  }
  actionError.value = false;
  needsExperiment.value = false;
  update({ model, checked: false });
}
function choose(q: string, value: string) {
  update({ answers: { ...answers.value, [q]: value }, checked: false });
}
function check() {
  if (props.disabled || invalid.value || !allAnswered.value) return;
  if (!lab.value.tape.length) {
    needsExperiment.value = true;
    return;
  }
  update({ checked: true });
}
function complete() {
  if (props.disabled || !passed.value || !lesson.value) return;
  const answer = labAnswers(lesson.value, answers.value);
  if (answer) emit("complete", answer);
}
async function reset() {
  if (props.disabled) return;
  actionError.value = false;
  needsExperiment.value = false;
  update({ model: { tape: [] }, answers: {}, checked: false });
  await nextTick();
  workspaceHeading.value?.focus({ preventScroll: true });
}
</script>
<style scoped>
.it-lab {
  display: grid;
  gap: 1.25rem;
  min-width: 0;
  max-width: 760px;
  margin-inline: auto;
  color: #e8f0f8;
  line-height: 1.65;
}
.it-lab :deep(*) {
  box-sizing: border-box;
  min-width: 0;
}
.it-lab h2 {
  font-size: 1.45rem;
  font-weight: 700;
}
.it-lab :deep(h3) {
  font-size: 1.05rem;
  font-weight: 650;
}
.it-lab :deep(h4) {
  font-size: 1.35rem;
  font-weight: 700;
}
.lab-intro {
  font-size: 1.05rem;
}
.lab-world {
  font-size: 0.85rem;
  color: #b3c5d8;
}
.it-lab :deep(.lab-workspace) {
  display: grid;
  gap: 1rem;
  padding: clamp(0.75rem, 3vw, 1.5rem);
  background: #10243a;
  border: 1px solid #3e5771;
  border-radius: 1rem;
}
.it-lab :deep(label) {
  display: grid;
  gap: 0.4rem;
}
.it-lab :deep(input:not([type="radio"])),
.it-lab :deep(select),
.it-lab :deep(textarea) {
  width: 100%;
  min-height: 44px;
  border: 1px solid #607a92;
  border-radius: 0.5rem;
  padding: 0.55rem 0.65rem;
  background: #0c1b2a;
  color: #f0f5fa;
  font: inherit;
}
.it-lab :deep(textarea) {
  resize: vertical;
}
.it-lab :deep(button) {
  min-height: 44px;
  border: 1px solid #62859a;
  padding: 0.55rem 0.8rem;
  border-radius: 0.5rem;
  color: #d8f9ef;
  text-align: left;
  overflow-wrap: anywhere;
}
.it-lab :deep(button:hover:enabled) {
  background: #24475b;
}
.it-lab :deep(button:disabled),
.it-lab :deep(input:disabled),
.it-lab :deep(select:disabled) {
  opacity: 0.55;
  cursor: default;
}
.it-lab :deep(.lab-actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.it-lab :deep(.lab-primary) {
  background: #39dfbc;
  color: #082b26;
  font-weight: 700;
  border-color: #39dfbc;
  justify-self: start;
}
.it-lab :deep(.lab-observation),
.it-lab :deep(.lab-preview) {
  border-left: 3px solid #63d5bd;
  padding: 0.85rem 1rem;
  background: #152f43;
  overflow-wrap: anywhere;
}
.it-lab :deep(.lab-feedback) {
  color: #d6f4e8;
  padding: 0.5rem 0;
}
.it-lab :deep(pre),
.it-lab :deep(code),
.it-lab :deep(.lab-bytes) {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: monospace;
}
.it-lab :deep(dt) {
  color: #b4c7d8;
}
.it-lab :deep(dd) {
  font-weight: 650;
  margin-bottom: 0.5rem;
}
.it-lab form {
  display: grid;
  gap: 1.25rem;
}
.it-lab fieldset {
  display: grid;
  gap: 0.6rem;
}
.it-lab legend {
  margin-bottom: 0.75rem;
  font-weight: 650;
}
.it-lab .lab-option {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  border: 1px solid #4b647d;
  border-radius: 0.5rem;
  padding: 0.75rem;
  min-height: 48px;
  cursor: pointer;
}
.lab-option input {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  accent-color: #39dfbc;
}
.it-lab :deep(.lab-bits) {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
}
.it-lab :deep(.lab-bits button) {
  display: grid;
  text-align: center;
}
.it-lab :deep(.lab-bits strong) {
  font-size: 1.5rem;
}
.it-lab :deep(.lab-pixels) {
  display: grid;
  grid-template-columns: repeat(4, 44px);
  gap: 3px;
  max-width: 100%;
}
.it-lab :deep(.lab-pixels button),
.it-lab :deep(.lab-pixels span) {
  width: 44px;
  height: 44px;
  padding: 0;
  text-align: center;
  border: 1px solid #8294a3;
}
.it-lab :deep(.lab-sequence) {
  display: grid;
  gap: 0.6rem;
}
.it-lab :deep(.lab-sequence li) {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}
.it-lab :deep(ul),
.it-lab :deep(ol) {
  overflow-wrap: anywhere;
}
.it-lab :deep(:is(button, input, select, textarea):focus-visible) {
  outline: 3px solid #ffd080;
  outline-offset: 3px;
}
.it-lab h2:focus {
  outline: none;
}
@media (max-width: 390px) {
  .it-lab :deep(.lab-actions) {
    display: grid;
  }
  .it-lab :deep(.lab-observation),
  .it-lab :deep(.lab-preview) {
    padding: 0.65rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .it-lab :deep(*) {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
</style>
