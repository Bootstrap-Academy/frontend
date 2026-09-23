<template>
  <div class="custom-activity">
    <p v-if="status === 'loading'" role="status">{{ t("LearningRooms.Loading") }}</p>
    <section v-else-if="status === 'error'" role="alert">
      <p>{{ t("LearningRooms.LoadError") }}</p>
      <p v-if="retryError">{{ t("LearningRooms.SaveError") }}</p>
      <button type="button" :disabled="disabled || retrying || assessmentBusy" @click="retry">
        {{ t("LearningRooms.Retry") }}
      </button>
    </section>
    <div ref="surface" class="module-surface" :aria-busy="status === 'loading'" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import type {
  LearningModuleContext,
  LearningModuleAssessmentContext,
  LearningModuleData,
  LearningModuleDescriptor,
} from "~/types/learningModule";
import type { ExerciseReference, LearningRequest } from "~/types/learningRooms";
import {
  createLearningModuleSession,
  learningModuleIdentity,
  type LearningModuleStatus,
} from "~/utils/learningModule";
import {
  createLearningModuleAssessment,
  learningModuleState,
} from "~/utils/learningModuleAssessment";
import { createLearningLlm } from "~/utils/learningLlm";
import { createLearningProject } from "~/utils/learningProject";

const props = defineProps<{
  module: LearningModuleDescriptor;
  activityId: string;
  reviewId?: string;
  content: LearningModuleData;
  state: LearningModuleData;
  locale: string;
  disabled: boolean;
  save?: () => Promise<boolean>;
  exercise?: ExerciseReference;
  request?: LearningRequest;
  userId?: string;
  /** Room unit of a lesson activity; enables `host.llm`. */
  unitId?: string;
  /** Enables `host.project` and binds LLM grants to this course. */
  courseId?: string;
}>();
const emit = defineEmits<{
  change: [state: LearningModuleData];
  complete: [answer: LearningModuleData, attemptId?: string, verdict?: string];
  posting: [busy: boolean];
}>();
const { t } = useI18n();
const surface = ref<HTMLElement | null>(null);
const status = ref<LearningModuleStatus>("loading");
const retrying = ref(false);
const retryError = ref(false);
const assessmentContext = shallowRef<LearningModuleAssessmentContext>();
const moduleState = ref(learningModuleState(props.state));
const heartInfo = useHeartInfo();
const gateway = useLearningGateway();
let session: ReturnType<typeof createLearningModuleSession> | undefined;
let assessment: ReturnType<typeof createLearningModuleAssessment> | undefined;
const moduleBusy = ref(false);
const assessmentBusy = ref(false);
let alive = true;
const publishBusy = () => emit("posting", moduleBusy.value || assessmentBusy.value);
const context = computed<LearningModuleContext>(() => ({
  activityId: props.activityId,
  reviewId: props.reviewId,
  content: props.content,
  state: moduleState.value,
  locale: props.locale,
  disabled: props.disabled,
  assessment: assessmentContext.value,
}));

function start() {
  session?.dispose();
  if (!surface.value) return;
  const boundAssessment = assessment;
  // Grants, tokens and verdicts live here, per mount; a new session starts clean.
  const lifetime = new AbortController();
  const llm =
    props.unitId && props.request
      ? createLearningLlm({
          unitId: props.unitId,
          courseId: props.courseId,
          locale: () => props.locale,
          request: props.request,
          send: gateway.send,
          signal: lifetime.signal,
          document: surface.value.ownerDocument,
        })
      : undefined;
  const project =
    props.courseId && props.request
      ? createLearningProject({ courseId: props.courseId, request: props.request })
      : undefined;
  session = createLearningModuleSession({
    descriptor: props.module,
    element: surface.value,
    origin: window.location.origin,
    context: context.value,
    change: (state) => {
      moduleState.value = learningModuleState(state);
      if (boundAssessment) boundAssessment.changeModuleState(state);
      else emit("change", moduleState.value);
    },
    save: () => props.save?.() ?? Promise.resolve(false),
    complete: (answer) => {
      if (!boundAssessment) {
        if (props.exercise) return;
        // A counting grade completes with exactly the graded text and its signed verdict.
        const proof = llm?.takeProof();
        if (proof) emit("complete", { text: proof.text }, undefined, proof.verdict);
        else emit("complete", answer);
        return;
      }
      const proof = boundAssessment.completion();
      if (proof) emit("complete", answer, proof.attemptId);
    },
    assessment: boundAssessment,
    llm,
    project,
    busy: (busy) => {
      moduleBusy.value = busy;
      publishBusy();
    },
    status: (next) => {
      status.value = next;
      if (next === "disposed" || next === "error") lifetime.abort();
    },
  });
  void session.start();
}

async function retry() {
  if (retrying.value || props.disabled || assessmentBusy.value) return;
  retrying.value = true;
  retryError.value = false;
  assessment?.cancelPreparation();
  session?.cancelPreparation();
  try {
    const saved = props.save ? await props.save() : true;
    if (!alive) return;
    if (!saved) throw new Error("Work was not saved");
    // Browsers cache failed ESM imports, including transitive failures. A fresh
    // page retries the immutable URL without inventing another module identity.
    window.location.reload();
  } catch {
    if (alive) retryError.value = true;
  } finally {
    if (alive) retrying.value = false;
  }
}

function initialize() {
  session?.dispose();
  assessment?.dispose();
  assessment = undefined;
  assessmentContext.value = undefined;
  moduleState.value = learningModuleState(props.state);
  if (props.exercise && props.request && props.userId) {
    assessment = createLearningModuleAssessment({
      activityId: props.activityId,
      reference: props.exercise,
      userId: props.userId,
      reviewId: props.reviewId,
      state: props.state,
      request: props.request,
      disabled: () => props.disabled,
      save: () => props.save?.() ?? Promise.resolve(false),
      changed: (state) => emit("change", state),
      updated: (next) => (assessmentContext.value = next),
      busy: (busy) => {
        assessmentBusy.value = busy;
        if (alive) publishBusy();
      },
      heartsChanged: (info) => (heartInfo.value = info),
    });
    void assessment.load();
  }
  start();
}

watch(
  [
    () => learningModuleIdentity(props.module),
    () => props.activityId,
    () => props.reviewId,
    () => props.userId,
    () => props.exercise?.type,
    () => props.exercise?.task_id,
    () => props.exercise?.subtask_id,
    () => props.request,
    () => props.unitId,
    () => props.courseId,
  ],
  initialize,
  { flush: "sync" }
);
watch(
  () => props.state,
  (next) => {
    moduleState.value = learningModuleState(next);
    assessment?.updateState(next);
  },
  { deep: true }
);
watch(context, (next) => session?.update(next), { deep: true });
onMounted(initialize);
onBeforeUnmount(() => {
  alive = false;
  session?.dispose();
  assessment?.dispose();
});
defineExpose({
  cancelPreparation: () => {
    assessment?.cancelPreparation();
    session?.cancelPreparation();
  },
});
</script>

<style scoped>
.module-surface {
  min-width: 0;
  width: 100%;
  font: inherit;
  color: inherit;
}
</style>
