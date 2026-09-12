<template>
  <article v-if="activeLecture" class="course-video">
    <template v-if="activeLecture.type === 'youtube' && activeLecture.video_id">
      <iframe
        v-if="youtubeLoaded"
        :src="youtubeSource"
        :title="activeLecture.title"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowfullscreen
      />
      <div v-else>
        <div class="video-placeholder">
          <PlayCircleIcon class="h-14 w-14 text-accent" aria-hidden="true" />
          <button type="button" @click="youtubeLoaded = true">{{ t("Buttons.LoadVideo") }}</button>
        </div>
        <p class="video-privacy">
          {{ t("Links.VideoPrivacyHint") }}
          <NuxtLink to="/docs/privacy" target="_blank" class="text-accent hover:underline">{{
            t("Links.PrivacyNoticeLinkText")
          }}</NuxtLink
          >{{ t("Links.PrivacyNoticeHintEnd") }}
        </p>
      </div>
    </template>
    <template v-else-if="activeLecture.type === 'mp4'">
      <p v-if="loading" role="status">{{ copy.loading }}</p>
      <div v-else-if="error" role="alert">
        <p>{{ copy.loadError }}</p>
        <button type="button" @click="load()">{{ copy.retry }}</button>
      </div>
      <video
        v-else-if="source"
        ref="video"
        :key="activeLecture.id"
        :src="source"
        :poster="course?.image || undefined"
        controls
        playsinline
        preload="metadata"
        @timeupdate="rememberPosition"
        @loadedmetadata="restorePosition"
      >
        <track kind="captions" />
      </video>
    </template>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { PlayCircleIcon } from "@heroicons/vue/24/solid";
import type { Course, Lecture, Section } from "~/types/courseTypes";
const props = defineProps<{
  course: Course | null;
  activeLecture: Lecture | null;
  activeSection?: Section | null;
}>();
const { t } = useI18n();
const { copy } = useCourseExperienceCopy();
const user = useUser();
const session = useSession();
const video = ref<HTMLVideoElement | null>(null);
const source = ref("");
const loading = ref(false);
const error = ref(false);
const youtubeLoaded = ref(false);
const videoCookie = useAppCookie<string>("currentVideo");
const timeCookie = useAppCookie<number | string>("currentVideoTime");
const youtubeSource = computed(
  () =>
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(props.activeLecture?.video_id || "")}?rel=0&autoplay=1`
);
let generation = 0;
let alive = true;
let refreshTimer: ReturnType<typeof setInterval> | undefined;
let pendingPosition: { lecture: string; position: number; playing: boolean } | null = null;
async function load(refresh = false) {
  const ticket = ++generation;
  const courseId = props.course?.id;
  const lectureId = props.activeLecture?.id;
  const owner = `${user.value?.id || ""}:${session.value?.id || ""}`;
  const current = () =>
    alive &&
    ticket === generation &&
    owner === `${user.value?.id || ""}:${session.value?.id || ""}`;
  error.value = false;
  if (!refresh) {
    // Browsers can emit timeupdate(0) while loading a new source. Keep the
    // saved position separate until metadata is available for this lecture.
    pendingPosition = {
      lecture: lectureId || "",
      position: videoCookie.value === lectureId ? Number(timeCookie.value) : 0,
      playing: false,
    };
    source.value = "";
    loading.value = false;
    youtubeLoaded.value = false;
  }
  if (!courseId || !lectureId || props.activeLecture?.type !== "mp4") return;
  loading.value = !refresh;
  try {
    const result = await GET(
      `/skills/courses/${encodeURIComponent(courseId)}/lectures/${encodeURIComponent(lectureId)}`
    );
    if (!current()) return;
    if (typeof result !== "string" || !result) throw new Error("Missing video");
    if (refresh && result !== source.value && video.value) {
      // Capture at URL replacement, not request start: playback may have moved
      // or the learner may have paused while the signed URL was being fetched.
      pendingPosition = {
        lecture: lectureId,
        position: video.value.currentTime,
        playing: !video.value.paused,
      };
    }
    source.value = result;
  } catch {
    if (current() && !source.value) error.value = true;
  } finally {
    if (current()) loading.value = false;
  }
}
function rememberPosition(event: Event) {
  if (!alive || !props.activeLecture) return;
  const media = event.target as HTMLVideoElement;
  if (media !== video.value || pendingPosition?.lecture === props.activeLecture.id) return;
  videoCookie.value = props.activeLecture.id;
  timeCookie.value = media.currentTime;
}
function restorePosition(event: Event) {
  const media = event.target as HTMLVideoElement;
  if (!alive || media !== video.value || pendingPosition?.lecture !== props.activeLecture?.id)
    return;
  const { position, playing } = pendingPosition;
  pendingPosition = null;
  if (
    Number.isFinite(position) &&
    position >= 0 &&
    position < media.duration &&
    position !== media.currentTime
  )
    media.currentTime = position;
  // A URL renewal preserves the current playback choice. Opening/reloading a
  // lesson stays paused; browsers may also decline a background play request.
  if (playing) void media.play().catch(() => {});
}
onMounted(() => {
  load();
  refreshTimer = setInterval(
    () => {
      if (props.activeLecture?.type === "mp4") void load(true);
    },
    7 * 60 * 60 * 1000
  );
});
watch([() => props.activeLecture?.id, () => user.value?.id, () => session.value?.id], () => load());
onBeforeUnmount(() => {
  alive = false;
  generation++;
  clearInterval(refreshTimer);
});
</script>

<style scoped>
.course-video {
  min-width: 0;
  width: 100%;
}
video,
iframe {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 0;
  border-radius: 1rem;
  background: #061c27;
}
.video-placeholder {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid var(--color-tertiary);
  border-radius: 1rem;
  background: var(--color-secondary);
}
button {
  padding: 0.75rem 1.1rem;
  border-radius: 0.65rem;
  background: var(--color-accent);
  color: var(--color-primary);
}
.video-privacy {
  font-size: 0.8rem;
  line-height: 1.6;
  margin: 0.75rem 0 0;
}
button:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 4px;
}
</style>
