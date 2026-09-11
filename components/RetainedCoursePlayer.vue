<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{ source: string; type: "mp4" | "youtube"; title: string }>();
const emit = defineEmits<{ unavailable: [] }>();
const { t } = useI18n();
const video = ref<HTMLVideoElement | null>(null);
function stop() {
  if (!video.value) return;
  video.value.pause();
  video.value.removeAttribute("src");
  video.value.load();
}
watch(() => props.source, stop, { flush: "pre" });
onBeforeUnmount(stop);
</script>

<template>
  <video
    v-if="type === 'mp4' && source"
    :key="source"
    ref="video"
    :src="source"
    :title="title"
    controls
    playsinline
    preload="metadata"
    crossorigin="anonymous"
    class="w-full"
    @error="emit('unavailable')"
  >
    {{ t("RetainedCourses.MediaUnavailable") }}
  </video>
  <iframe
    v-else-if="type === 'youtube' && source"
    :key="source"
    :src="source"
    :title="title"
    referrerpolicy="no-referrer"
    allow="encrypted-media; picture-in-picture"
    allowfullscreen
    class="aspect-video w-full"
  />
</template>
