<template>
  <div v-if="error" class="activity-load-state" role="alert">
    <p>{{ copy.error }}</p>
    <p v-if="retryError">{{ copy.saveError }}</p>
    <button type="button" :disabled="disabled || retrying" @click="retry">{{ copy.retry }}</button>
  </div>
  <p v-else-if="!renderer" class="activity-load-state" role="status">{{ copy.loading }}</p>
  <component
    :is="renderer"
    v-else
    :key="generation"
    ref="instance"
    v-bind="rendererProps"
    v-on="listeners"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onErrorCaptured, ref, shallowRef, watch } from "vue";
import type {
  LearningActivity,
  LearningActivityCompletion,
  LearningActivityHandle,
  LegacyVideoContext,
} from "~/types/learningActivities";
import type { LearningRequest } from "~/types/learningRooms";
import { activityContent, activityRenderer } from "~/utils/learningActivityAdapters";
import { learningModuleIdentity } from "~/utils/learningModule";
import { loadActivityRenderer } from "./activityRegistry";

const props = defineProps<{
  activity: LearningActivity;
  state: Record<string, any>;
  locale: string;
  disabled?: boolean;
  request?: LearningRequest;
  save?: () => Promise<boolean>;
  userId?: string;
  reviewId?: string;
  legacyVideo?: LegacyVideoContext;
  /** The course a lesson activity belongs to; binds LLM grants and the project state. */
  courseId?: string | null;
}>();
const emit = defineEmits<{
  change: [state: Record<string, any>];
  complete: [result: LearningActivityCompletion];
  posting: [active: boolean];
  skip: [];
}>();
const instance = ref<LearningActivityHandle | null>(null);
const renderer = shallowRef<Awaited<ReturnType<typeof loadActivityRenderer>> | null>(null);
const error = ref(false);
const retrying = ref(false);
const retryError = ref(false);
const generation = ref(0);
const listeners = shallowRef<Record<string, (...args: any[]) => void>>({});
let alive = true;
const copy = computed(() =>
  props.locale.startsWith("de")
    ? {
        loading: "Wird geladen …",
        error: "Das Laden hat nicht geklappt.",
        retry: "Nochmal versuchen",
        saveError: "Dein Stand konnte nicht gespeichert werden. Versuch es nochmal.",
      }
    : {
        loading: "Loading …",
        error: "This couldn't be loaded.",
        retry: "Try again",
        saveError: "Your work couldn't be saved. Try again.",
      }
);
const kind = computed(() => activityRenderer(props.activity));
const rendererProps = computed(() => {
  const shared = {
    content: activityContent(props.activity, props.locale),
    state: props.state,
    locale: props.locale,
    disabled: !!props.disabled,
  };
  if (kind.value === "exercise")
    return {
      ...shared,
      reference: props.activity.exercise,
      request: props.request,
      save: props.save,
      userId: props.userId || "",
      reviewId: props.reviewId,
    };
  if (kind.value === "custom")
    return {
      ...shared,
      module: props.activity.module,
      activityId: props.activity.id,
      exercise: props.activity.exercise,
      request: props.request,
      userId: props.userId || "",
      save: props.save,
      reviewId: props.reviewId,
      unitId: props.activity.source.kind === "room" ? props.activity.source.unit_id : undefined,
      courseId: props.courseId || undefined,
    };
  if (kind.value === "video")
    return {
      ...shared,
      exercise: props.activity.exercise,
      request: props.request,
      save: props.save,
      userId: props.userId || "",
      reviewId: props.reviewId,
    };
  if (kind.value === "legacy-video")
    return {
      course: props.legacyVideo?.course,
      activeLecture: props.legacyVideo?.lecture,
      activeSection: props.legacyVideo?.section,
    };
  return shared;
});
async function load() {
  instance.value?.cancelPreparation?.();
  const ticket = ++generation.value;
  const current = () => alive && ticket === generation.value;
  listeners.value = {
    change: (state) => {
      if (current()) change(state);
    },
    complete: (result, attemptId, verdict) => {
      if (current()) complete(result, attemptId, verdict);
    },
    posting: (active) => {
      if (current()) posting(active);
    },
    skip: () => {
      if (current() && !props.disabled) emit("skip");
    },
  };
  renderer.value = null;
  error.value = false;
  emit("posting", false);
  try {
    if (!kind.value) throw new Error("Unsupported learning activity");
    const loaded = await loadActivityRenderer(kind.value);
    if (alive && ticket === generation.value) renderer.value = loaded;
  } catch {
    if (alive && ticket === generation.value) error.value = true;
  }
}
function change(state: Record<string, any>) {
  if (alive && !error.value && !props.disabled) emit("change", state);
}
function complete(result?: Record<string, any> | string, attemptId?: string, verdict?: string) {
  if (!alive || error.value || props.disabled) return;
  emit(
    "complete",
    kind.value === "exercise"
      ? { attempt_id: typeof result === "string" ? result : undefined }
      : props.activity.exercise
        ? { attempt_id: typeof attemptId === "string" ? attemptId : undefined }
        : {
            answer: typeof result === "object" ? result : {},
            ...(kind.value === "custom" && typeof verdict === "string" ? { verdict } : {}),
          }
  );
}
function posting(active: boolean) {
  if (alive && !error.value) emit("posting", active);
}
function cancelPreparation() {
  instance.value?.cancelPreparation?.();
}
async function retry() {
  if (retrying.value || props.disabled) return;
  retrying.value = true;
  retryError.value = false;
  cancelPreparation();
  try {
    const saved = props.save ? await props.save() : true;
    if (!alive) return;
    if (!saved) throw new Error("Work was not saved");
    window.location.reload();
  } catch {
    if (alive) retryError.value = true;
  } finally {
    if (alive) retrying.value = false;
  }
}
defineExpose({ cancelPreparation });
watch(
  [
    () => props.activity.id,
    () => kind.value,
    () => learningModuleIdentity(props.activity.module),
    () => props.userId,
    () => props.reviewId,
  ],
  load,
  { immediate: true, flush: "sync" }
);
onErrorCaptured(() => {
  error.value = true;
  cancelPreparation();
  emit("posting", false);
  return false;
});
onBeforeUnmount(() => {
  alive = false;
  generation.value++;
  cancelPreparation();
});
</script>

<style scoped>
.activity-load-state {
  padding: 1rem 0;
  color: inherit;
}
button {
  color: var(--color-accent);
  min-height: 44px;
}
</style>
