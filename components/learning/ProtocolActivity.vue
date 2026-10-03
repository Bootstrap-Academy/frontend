<template>
  <section class="protocol-activity">
    <p v-if="phase === 'loading' || phase === 'negotiating'" role="status">{{ copy.loading }}</p>
    <div v-if="phase === 'recoverable-error'" role="alert">
      <p>{{ copy.error }}</p>
      <button type="button" :disabled="retrying || disabled" @click="retry">
        {{ copy.retry }}
      </button>
      <button type="button" @click="close">{{ copy.back }}</button>
    </div>
    <div ref="surface" :aria-busy="phase === 'loading' || phase === 'negotiating'" />
    <progress v-if="fraction > 0" :value="fraction" max="1" :aria-label="copy.progress" />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { LearningModuleV2Descriptor } from "~/types/learningModule";
import type { JsonObject, Phase } from "~/lesson-protocol/types";
import type { RoomProtocolSource } from "~/utils/lessonProtocolRooms";
import { createLessonFrame, verifyLessonPackage } from "~/lesson-protocol/browser";
import { createRoomProtocolBinding } from "~/lesson-protocol/rooms";
import { LessonHost } from "~/lesson-protocol/host";

const props = defineProps<{
  module: LearningModuleV2Descriptor;
  protocol?: RoomProtocolSource;
  activityId: string;
  userId?: string;
  reviewId?: string;
  content: JsonObject;
  state: JsonObject;
  locale: string;
  disabled: boolean;
  save?: () => Promise<boolean>;
}>();
const emit = defineEmits<{ posting: [busy: boolean]; skip: [] }>();
const config = useRuntimeConfig().public;
const router = useRouter();
const session = useSession();
const surface = ref<HTMLElement | null>(null);
const phase = ref<Phase>("loading");
const retrying = ref(false);
const fraction = ref(0);
let host: LessonHost | undefined;
let frame: ReturnType<typeof createLessonFrame> | undefined;
let abort = new AbortController();
let generation = 0;
let alive = true;
const copy = computed(() =>
  props.locale.startsWith("de")
    ? {
        loading: "Wird geladen …",
        error: "Das hat gerade nicht geklappt. Dein bestätigter Stand bleibt erhalten.",
        retry: "Nochmal versuchen",
        back: "Zurück",
        progress: "Fortschritt in der Szene",
        reset: "Deinen Stand zurücksetzen?",
        discard:
          "Deine letzten Änderungen sind vielleicht noch nicht gespeichert. Willst du die Szene trotzdem verlassen?",
      }
    : {
        loading: "Loading …",
        error: "This didn't work just now. Your confirmed work is kept.",
        retry: "Try again",
        back: "Back",
        progress: "Scene progress",
        reset: "Reset your work?",
        discard: "Your latest changes might not be saved yet. Leave the scene anyway?",
      }
);
function dispose() {
  abort.abort();
  host?.dispose();
  frame?.dispose();
  host = undefined;
  frame = undefined;
  emit("posting", false);
}
async function close() {
  if (!(await prepareNavigation())) return;
  if (props.save && !(await props.save())) return;
  await router.push("/");
}
async function prepareNavigation() {
  if (phase.value === "recoverable-error") {
    // A failed frame may contain work the native room has never received.
    if (frame && !window.confirm(copy.value.discard)) return false;
    return !props.save || (await props.save());
  }
  return host?.prepareNavigation() ?? false;
}
async function start() {
  dispose();
  abort = new AbortController();
  const ticket = ++generation;
  const current = () => alive && ticket === generation;
  phase.value = "loading";
  fraction.value = 0;
  try {
    if (
      String(config.lessonProtocolV2) !== "true" ||
      !props.protocol ||
      !props.userId ||
      !surface.value
    )
      throw new Error("Unavailable");
    const verification = abort;
    const verifyTimer = setTimeout(() => verification.abort(), 10000);
    let verified: Awaited<ReturnType<typeof verifyLessonPackage>>;
    try {
      verified = await verifyLessonPackage(
        props.module,
        String(config.lessonContentOrigin),
        window.location.origin,
        verification.signal
      );
    } finally {
      clearTimeout(verifyTimer);
    }
    if (!current()) return;
    // No package migration is silently applied to existing private work.
    const introduction = props.protocol.data.protocolSnapshot().room?.unit.content
      .protocolIntroduction as { ref?: string; match: JsonObject; answer: JsonObject } | undefined;
    const actions = createRoomProtocolBinding(props.protocol.data, props.protocol.owner).bind({
      unitId: props.activityId,
      schemaVersion: verified.manifest.state.schemaVersion,
      initialState: {},
      introduction: verified.manifest.goals.every(
        (goal) => goal.assessment.kind === "introduced" && goal.assessment.ref === introduction?.ref
      )
        ? introduction
        : undefined,
      resetConfirm: async () => window.confirm(copy.value.reset),
      navigate: async (direction) => {
        if (!current()) return false;
        if (direction === "close") {
          // The room operation completes before the router's save guard runs.
          void router.push("/");
          return true;
        }
        if (direction === "next" || direction === "skip") {
          emit("skip");
          return true;
        }
        return false;
      },
      progress: (_goal, value) => {
        if (current()) fraction.value = value;
      },
      busy: (value) => {
        if (current()) emit("posting", value);
      },
    });
    frame = createLessonFrame(surface.value, verified, () => {
      if (current()) host?.fail();
    });
    const boundFrame = frame;
    host = new LessonHost({
      manifest: verified.manifest,
      manifestHash: verified.descriptor.manifest_hash,
      transport: boundFrame.transport,
      actions,
      context: {
        locale: props.locale.startsWith("de") ? "de" : "en",
        content: props.content,
        disabled: props.disabled,
        surface: {
          revision: 0,
          css: { width: surface.value.clientWidth, height: 540 },
          scale: 1,
          offset: { x: 0, y: 0 },
          safeRect: { x: 0, y: 0, width: 360, height: 640 },
          occlusions: [],
          edgeExclusions: { top: 0, right: 0, bottom: 0, left: 0 },
          dpr: window.devicePixelRatio,
          reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
          displayMode: "page",
        },
      },
      validateState: verified.validateState,
      status: (value) => {
        if (current()) phase.value = value;
      },
    });
    const boundHost = host;
    // A document that never loads is recoverable; it cannot hold the player indefinitely.
    const timer = setTimeout(() => {
      if (current()) boundHost.fail();
    }, 10000);
    try {
      await boundFrame.load;
      if (current() && boundHost.phase === "loading") boundHost.start();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    if (current()) {
      dispose();
      phase.value = "recoverable-error";
    }
  }
}
async function retry() {
  if (retrying.value) return;
  if (frame && !window.confirm(copy.value.discard)) return;
  const ticket = generation;
  retrying.value = true;
  try {
    if ((!props.save || (await props.save())) && alive && ticket === generation) await start();
  } finally {
    retrying.value = false;
  }
}
watch(
  [
    () => props.module.entry_url,
    () => props.module.manifest_hash,
    () => props.module.package_hash,
    () => props.userId,
    () => session.value?.id,
    () => props.activityId,
    () => props.reviewId,
  ],
  () => {
    generation++;
    dispose();
    if (alive && surface.value) void start();
  },
  { flush: "sync" }
);
watch([() => props.locale, () => props.disabled], () =>
  host?.context(props.locale.startsWith("de") ? "de" : "en", props.disabled)
);
onMounted(start);
function visibility() {
  void host?.visibility(document.hidden);
}
onMounted(() => document.addEventListener("visibilitychange", visibility));
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", visibility);
  alive = false;
  generation++;
  dispose();
});
defineExpose({
  prepareNavigation,
  cancelPreparation: () => {
    void host?.visibility(false);
  },
});
</script>

<style scoped>
.protocol-activity {
  min-width: 0;
}
button {
  min-height: 44px;
  padding: 0.5rem 1rem;
  color: var(--color-accent);
}
</style>
