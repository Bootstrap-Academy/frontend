<template>
  <section class="video-activity">
    <p v-if="typeof content.body === 'string'">{{ content.body }}</p>
    <template v-if="youtubeId">
      <iframe
        v-if="youtubeLoaded"
        :src="`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&autoplay=1`"
        :title="typeof content.title === 'string' ? content.title : 'Video'"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowfullscreen
      />
      <button v-else type="button" @click="youtubeLoaded = true">{{ copy.load }}</button>
    </template>
    <video
      v-else-if="url"
      ref="video"
      :src="url"
      controls
      playsinline
      preload="metadata"
      @loadedmetadata="restore"
      @timeupdate="remember"
    >
      <track v-if="captionUrl" kind="captions" :src="captionUrl" :srclang="locale" default />
    </video>
    <p v-else role="alert">{{ copy.unavailable }}</p>
    <AsyncExerciseRoom
      v-if="exercise"
      :reference="exercise"
      :content="content"
      :state="state"
      :disabled="disabled"
      :request="request"
      :save="save"
      :user-id="userId || ''"
      :review-id="reviewId"
      @change="emit('change', $event)"
      @posting="emit('posting', $event)"
      @complete="emit('complete', {}, $event)"
      @skip="emit('skip')"
      ref="exerciseHandle"
    />
    <button
      v-else-if="youtubeId || url"
      type="button"
      :disabled="disabled"
      @click="emit('complete', { viewed: true })"
    >
      {{ copy.complete }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref } from "vue";
import type { ExerciseReference, LearningRequest } from "~/types/learningRooms";
const AsyncExerciseRoom = defineAsyncComponent(() => import("./ExerciseRoom.vue"));
const props = defineProps<{
  content: Record<string, any>;
  state: Record<string, any>;
  locale: string;
  disabled?: boolean;
  exercise?: ExerciseReference;
  request?: LearningRequest;
  save?: () => Promise<boolean>;
  userId?: string;
  reviewId?: string;
}>();
const emit = defineEmits<{
  change: [state: Record<string, any>];
  complete: [answer: Record<string, any>, attemptId?: string];
  posting: [active: boolean];
  skip: [];
}>();
const video = ref<HTMLVideoElement | null>(null);
const exerciseHandle = ref<{ cancelPreparation: () => void } | null>(null);
defineExpose({ cancelPreparation: () => exerciseHandle.value?.cancelPreparation() });
const youtubeLoaded = ref(false);
let restored = false;
let lastSavedSecond = -1;
function https(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.href : "";
  } catch {
    return "";
  }
}
const url = computed(() =>
  props.content.video?.type === "mp4" ? https(props.content.video.url) : ""
);
const captionUrl = computed(() => https(props.content.video?.captions_url));
const youtubeId = computed(() => {
  const source = props.content.video;
  return source?.type === "youtube" && /^[A-Za-z0-9_-]{11}$/.test(source.id) ? source.id : "";
});
const copy = computed(() =>
  props.locale.startsWith("de")
    ? {
        load: "Video laden",
        complete: "Fertig",
        unavailable: "Das Video ist gerade nicht verfügbar.",
      }
    : { load: "Load video", complete: "Done", unavailable: "The video isn't available right now." }
);
function restore() {
  if (!video.value || restored) return;
  restored = true;
  const position = props.state.position;
  if (
    typeof position === "number" &&
    Number.isFinite(position) &&
    position > 0 &&
    position < video.value.duration
  )
    video.value.currentTime = position;
}
function remember() {
  if (!restored || !video.value || props.disabled) return;
  const position = video.value.currentTime;
  if (Math.floor(position) === lastSavedSecond) return;
  lastSavedSecond = Math.floor(position);
  emit("change", { ...props.state, position });
}
onBeforeUnmount(() => video.value?.pause());
</script>

<style scoped>
.video-activity {
  display: grid;
  gap: 1rem;
}
video,
iframe {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 0;
  border-radius: 0.75rem;
}
button {
  width: fit-content;
  min-height: 44px;
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  background: var(--color-secondary);
  color: var(--color-heading);
}
</style>
