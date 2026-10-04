<template>
  <section
    ref="container"
    class="protocol-activity"
    :data-display-mode="mode"
    :aria-label="copy.scene"
  >
    <div class="protocol-world">
      <p v-if="phase === 'loading' || phase === 'negotiating'" role="status">{{ copy.loading }}</p>
      <div v-if="phase === 'recoverable-error'" class="protocol-error" role="alert">
        <p>{{ copy.error }}</p>
        <button type="button" :disabled="retrying || disabled" @click="retry">
          {{ copy.retry }}
        </button>
        <button type="button" @click="close">{{ copy.back }}</button>
      </div>
      <div
        ref="surface"
        class="protocol-surface"
        :aria-busy="phase === 'loading' || phase === 'negotiating'"
      />
    </div>
    <nav class="protocol-controls" :aria-label="copy.navigation" @keydown="navigationKey">
      <p class="protocol-title">{{ copy.scene }}</p>
      <progress :value="fraction" max="1" :aria-label="copy.progress" />
      <p v-if="landscapeStage && portraitViewport" class="rotation-hint">{{ copy.rotate }}</p>
      <div class="protocol-buttons">
        <button
          type="button"
          :disabled="disabled || navigating || !protocol?.previous"
          @click="navigate('previous')"
        >
          {{ copy.previous }}
        </button>
        <button type="button" :disabled="disabled || navigating" @click="navigate('next')">
          {{ copy.next }}
        </button>
        <button
          type="button"
          :disabled="disabled || navigating || !allowSkip"
          @click="navigate('skip')"
        >
          {{ copy.skip }}
        </button>
        <button ref="closeButton" type="button" :disabled="navigating" @click="close">
          {{ copy.close }}
        </button>
      </div>
      <button
        v-if="fullscreenAvailable && mode === 'page'"
        type="button"
        :class="{ 'fullscreen-requested': offerFullscreen }"
        @click="enterFullscreen"
      >
        {{ copy.fullscreen }}
      </button>
      <button v-if="mode === 'browser-fullscreen'" type="button" @click="display?.request(false)">
        {{ copy.exitFullscreen }}
      </button>
      <p v-if="navigationMessage" role="status">{{ navigationMessage }}</p>
    </nav>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { LearningModuleV2Descriptor } from "~/types/learningModule";
import type { JsonObject, Phase } from "~/lesson-protocol/types";
import { calculateSurface } from "~/lesson-protocol/surface";
import { LessonDisplay, observeLessonSurface, type DisplayMode } from "~/lesson-protocol/display";
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
useHead({
  meta: [{ name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" }],
});
const router = useRouter();
const session = useSession();
const surface = ref<HTMLElement | null>(null);
const container = ref<HTMLElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
const mode = ref<DisplayMode>("page");
const offerFullscreen = ref(false);
const fullscreenAvailable = ref(false);
const navigating = ref(false);
const navigationMessage = ref("");
const landscapeStage = ref(false);
const portraitViewport = ref(false);
const allowSkip = computed(() => !!props.protocol?.data.protocolSnapshot().room?.unit.skip_allowed);
let display: LessonDisplay | undefined;
let stopSurface: (() => void) | undefined;
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
        scene: "Lernszene",
        navigation: "Lektion steuern",
        previous: "Zurück",
        next: "Weiter",
        skip: "Überspringen",
        close: "Schließen",
        fullscreen: "Vollbild",
        exitFullscreen: "Vollbild verlassen",
        fullscreenDenied: "Vollbild ging nicht auf. Du kannst hier weitermachen.",
        rotate: "Wenn du magst, dreh dein Handy für mehr Platz.",
        retained:
          "Du bleibst hier. Speichere deine Arbeit und schließe die Szene ab, bevor du weitergehst.",
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
        scene: "Lesson scene",
        navigation: "Lesson controls",
        previous: "Previous",
        next: "Next",
        skip: "Skip",
        close: "Close",
        fullscreen: "Fullscreen",
        exitFullscreen: "Exit fullscreen",
        fullscreenDenied: "Fullscreen didn't open. You can keep going here.",
        rotate: "If you like, turn your phone for more space.",
        retained: "You're staying here. Save your work and finish the scene before continuing.",
        reset: "Reset your work?",
        discard: "Your latest changes might not be saved yet. Leave the scene anyway?",
      }
);
function dispose() {
  stopSurface?.();
  stopSurface = undefined;
  display?.dispose();
  display = undefined;
  abort.abort();
  host?.dispose();
  frame?.dispose();
  host = undefined;
  frame = undefined;
  emit("posting", false);
}
async function close() {
  if (phase.value === "recoverable-error") {
    if (!(await prepareNavigation())) return;
    await router.push("/");
    return;
  }
  await navigate("close");
}
async function navigate(direction: "next" | "previous" | "skip" | "close") {
  if (navigating.value) return;
  navigating.value = true;
  navigationMessage.value = "";
  try {
    if (!(await host?.navigate(direction))) navigationMessage.value = copy.value.retained;
  } catch {
    navigationMessage.value = copy.value.error;
  } finally {
    navigating.value = false;
  }
}
function enterFullscreen() {
  // Keep the request in the host's actual button activation.
  void display?.enter().then((success) => {
    if (!success) navigationMessage.value = copy.value.fullscreenDenied;
  });
}
function navigationKey(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
  if (event.key === "Escape") {
    closeButton.value?.focus();
    return;
  }
  if (!(event.target instanceof HTMLButtonElement)) return;
  if (["ArrowRight", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    void navigate("next");
  }
  if (["ArrowLeft", "ArrowUp"].includes(event.key) && props.protocol?.previous) {
    event.preventDefault();
    void navigate("previous");
  }
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
    landscapeStage.value = verified.manifest.stage.orientation === "landscape";
    // No package migration is silently applied to existing private work.
    const introduction = props.protocol.data.protocolSnapshot().room?.unit.content
      .protocolIntroduction as { ref?: string; match: JsonObject; answer: JsonObject } | undefined;
    const source = props.protocol;
    const actions = createRoomProtocolBinding(source.data, source.owner).bind({
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
        // A confirmed skip removes this child before continuation. The room binding
        // checks owner/unit/review first; its parent owns the surviving navigation.
        if ((direction === "next" || direction === "skip") && source.advance)
          return source.advance();
        if (!current()) return false;
        if (direction === "close") {
          // The room operation completes before the router's save guard runs.
          void router.push("/");
          return true;
        }
        if (direction === "previous") return source.previous?.() ?? false;
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
    display = new LessonDisplay(container.value!, (value, offer) => {
      const changed = value !== mode.value;
      const restoreFocus =
        container.value?.contains(document.activeElement) &&
        document.activeElement instanceof HTMLButtonElement;
      mode.value = value;
      offerFullscreen.value = offer;
      if (changed && restoreFocus)
        void nextTick(() => {
          if (current() && document.activeElement === document.body) closeButton.value?.focus();
        });
    });
    fullscreenAvailable.value = display.available;
    actions.display = (requested) => display!.request(requested);
    frame = createLessonFrame(surface.value, verified, () => {
      if (current()) host?.fail();
    });
    const boundFrame = frame;
    boundFrame.element.title = copy.value.scene;
    host = new LessonHost({
      manifest: verified.manifest,
      manifestHash: verified.descriptor.manifest_hash,
      transport: boundFrame.transport,
      actions,
      context: {
        locale: props.locale.startsWith("de") ? "de" : "en",
        content: props.content,
        disabled: props.disabled,
        surface: calculateSurface({
          width: surface.value.clientWidth,
          height: surface.value.clientHeight,
          orientation: verified.manifest.stage.orientation,
          margin: verified.manifest.stage.safeMargin,
          dpr: window.devicePixelRatio,
          reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
          displayMode: display.mode,
        }),
      },
      validateState: verified.validateState,
      status: (value) => {
        if (current()) phase.value = value;
      },
    });
    const boundHost = host;
    stopSurface = observeLessonSurface(
      surface.value,
      verified.manifest.stage.orientation,
      () => display!.mode,
      (value) => {
        if (current()) boundHost.surface(value);
      },
      verified.manifest.stage.safeMargin
    );
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
function viewport() {
  const value = window.visualViewport;
  portraitViewport.value =
    (value?.width ?? window.innerWidth) < (value?.height ?? window.innerHeight);
  container.value?.style.setProperty(
    "--lesson-viewport-height",
    `${value?.height ?? window.innerHeight}px`
  );
  container.value?.style.setProperty("--lesson-viewport-top", `${value?.offsetTop ?? 0}px`);
  container.value?.style.setProperty("--lesson-viewport-left", `${value?.offsetLeft ?? 0}px`);
  container.value?.style.setProperty(
    "--lesson-viewport-width",
    `${value?.width ?? window.innerWidth}px`
  );
}
onMounted(() => {
  viewport();
  window.visualViewport?.addEventListener("resize", viewport);
  window.visualViewport?.addEventListener("scroll", viewport);
  window.addEventListener("resize", viewport);
  void start();
});
function visibility() {
  void host?.visibility(document.hidden);
}
onMounted(() => document.addEventListener("visibilitychange", visibility));
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", visibility);
  window.visualViewport?.removeEventListener("resize", viewport);
  window.visualViewport?.removeEventListener("scroll", viewport);
  window.removeEventListener("resize", viewport);
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
  position: fixed;
  z-index: 50;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: min(1056px, calc(100% - 48px));
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  height: min(720px, calc(var(--lesson-viewport-height, 100dvh) - 48px));
  min-height: 0;
  min-width: 0;
  background: #111827;
  color: #e8efff;
  border-radius: 12px;
  overflow: hidden;
}
.protocol-world {
  position: relative;
  min-width: 0;
  min-height: 0;
}
.protocol-surface {
  position: absolute;
  inset: 0;
}
.protocol-world > [role="status"],
.protocol-error {
  position: absolute;
  z-index: 1;
  padding: 16px;
  background: #111827;
}
.protocol-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
  border-left: 1px solid #334155;
}
.protocol-title {
  font-weight: 600;
}
.protocol-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
progress {
  width: 100%;
  height: 8px;
}
button {
  min-height: 44px;
  min-width: 44px;
  padding: 8px 12px;
  border: 1px solid #64748b;
  border-radius: 8px;
  color: #e8efff;
  background: #1e293b;
}
button:disabled {
  opacity: 0.5;
}
button:focus-visible {
  outline: 3px solid #67e8f9;
  outline-offset: 2px;
}
.fullscreen-requested {
  border-color: #67e8f9;
}
.protocol-activity:fullscreen {
  top: 0;
  left: 0;
  transform: none;
  height: 100%;
  width: 100%;
  border-radius: 0;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
}
@media (max-width: 1023px) {
  .protocol-activity {
    position: fixed;
    z-index: 50;
    top: var(--lesson-viewport-top, 0px);
    left: var(--lesson-viewport-left, 0px);
    transform: none;
    width: var(--lesson-viewport-width, 100%);
    height: var(--lesson-viewport-height, 100dvh);
    min-height: 0;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    border-radius: 0;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
      env(safe-area-inset-left);
  }
  .protocol-controls {
    gap: 6px;
    padding: 8px 12px;
    border-left: 0;
    border-top: 1px solid #334155;
    max-height: 40vh;
  }
  .protocol-title {
    display: none;
  }
  .protocol-controls > button {
    align-self: flex-start;
  }
}
</style>
