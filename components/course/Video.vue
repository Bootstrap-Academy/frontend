<template>
  <article v-if="videoSRC && activeLecture">
    <template v-if="activeLecture.type == 'youtube'">
      <iframe
        v-if="youtubeLoaded"
        :src="youtubeEmbedSRC"
        title="YouTube player"
        frameborder="0"
        allow="
          accelerometer;
          autoplay;
          clipboard-write;
          encrypted-media;
          gyroscope;
          picture-in-picture;
        "
        allowfullscreen
        :key="`youtube-${activeLecture.id}`"
      ></iframe>

      <div v-else :key="`youtube-placeholder-${activeLecture.id}`">
        <div
          class="video-placeholder card flex flex-col items-center justify-center bg-secondary text-center gap-card"
        >
          <PlayCircleIcon class="h-16 w-16 text-accent" />
          <p class="text-heading-4 max-w-full break-words">{{ activeLecture.title ?? "" }}</p>
          <Btn :icon="PlayIcon" @click="loadYoutubeVideo">{{ t("Buttons.LoadVideo") }}</Btn>
        </div>

        <p class="text-body-2 text-body mt-box">
          {{ t("Links.VideoPrivacyHint") }}
          <NuxtLink to="/docs/privacy" target="_blank" class="text-accent hover:underline">{{
            t("Links.PrivacyNoticeLinkText")
          }}</NuxtLink
          >{{ t("Links.PrivacyNoticeHintEnd") }}
        </p>
      </div>
    </template>

    <video
      ref="video"
      v-else-if="activeLecture.type == 'mp4'"
      :poster="course.image"
      controls
      playsInline
      title="video player"
      allowfullscreen
      controlsList="nodownload"
      oncontextmenu="return false;"
      :key="`video-${videoSRC}`"
      @timeupdate="onTimeUpdate(activeLecture.id, $event)"
      @loadstart="onVideoLoad(activeLecture.id, $event)"
    >
      <track kind="captions" />
      <source ref="refSource" :src="videoSRC" type="video/mp4" />
      <p class="vjs-no-js">
        To view this video please enable JavaScript, and consider upgrading to a web browser that
        <a sveltekit:prefetch href="https://videojs.com/html5-video-support/" target="_blank">
          supports HTML5 video
        </a>
      </p>
    </video>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";
import { PlayCircleIcon, PlayIcon } from "@heroicons/vue/24/solid";

export default defineComponent({
  props: {
    course: { type: Object as PropType<any>, default: null },
    activeSection: { type: Object as PropType<any>, default: null },
    activeLecture: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const videoSRC = useVideoSRC();
    const { t } = useI18n();

    let videoInterval: any;
    const video = ref<HTMLVideoElement | null>(null);
    const refSource = ref<HTMLSourceElement | any>(null);

    // YouTube embeds are only mounted after an explicit click, so that no request
    // reaches Google before the user asks for it. The choice is deliberately not
    // persisted anywhere: it is asked again for every lecture and every visit.
    const youtubeLoaded = ref(false);

    const youtubeEmbedSRC = computed(() => {
      if (!!!videoSRC.value) return "";
      return `${videoSRC.value}${videoSRC.value.includes("?") ? "&" : "?"}autoplay=1`;
    });

    function loadYoutubeVideo() {
      youtubeLoaded.value = true;
    }

    watch(
      () => props.activeLecture,
      async (newValue, oldValue) => {
        youtubeLoaded.value = false;

        if (!!!newValue) return;

        const courseID = props.course?.id ?? "";

        if (!!!courseID) return;

        await getLectureVideoSRC(courseID, newValue);

        if ((props.activeLecture?.type ?? "") == "mp4") {
          clearInterval(videoInterval);

          refSource.value.setAttribute("src", videoSRC.value);
          videoInterval = setInterval(async () => {
            await getLectureVideoSRC(courseID, newValue);
            if (video.value) {
              video.value.pause();
              refSource.value.src = videoSRC.value;
              video.value.load();
              video.value.play();
            }
            // refSource.value.setAttribute('src', videoSRC.value);
            refSource.value.src = videoSRC.value;
          }, 28800000); //8 hours
        }
      },
      { deep: true, immediate: true }
    );

    function onTimeUpdate(videoID: string, event: any) {
      const videoCookie = useAppCookie("currentVideo");
      const timeCookie = useAppCookie("currentVideoTime");

      const currentVideoTime = event.target.currentTime;
      timeCookie.value = currentVideoTime;

      if (currentVideoTime < 1) videoCookie.value = videoID;
    }

    function onVideoLoad(videoID: string, event: any) {
      const videoCookie = useAppCookie("currentVideo");
      const timeCookie = useAppCookie("currentVideoTime");

      if (!videoCookie || videoCookie.value === "" || !timeCookie || timeCookie.value === "")
        return;

      if (videoCookie.value !== videoID) {
        // Reset the time cookie to start the new video from the beginning
        timeCookie.value = "";
        videoCookie.value = videoID;
      } else {
        // Set the current video time to the saved cookie value
        event.target.currentTime = timeCookie.value;
      }
    }

    return {
      t,
      videoSRC,
      refSource,
      onTimeUpdate,
      onVideoLoad,
      youtubeLoaded,
      youtubeEmbedSRC,
      loadYoutubeVideo,
      PlayCircleIcon,
      PlayIcon,
    };
  },
});
</script>

<style scoped>
video,
iframe {
  @apply h-fit w-full min-w-[50vw] max-w-full style-card md:min-h-[60vh] lg:h-auto;
}
/* portrait */
@media only screen and (max-width: 768px) and (max-aspect-ratio: 1/1) {
  video,
  iframe {
    @apply w-full max-w-full;
    height: calc(100vw * 0.5);
  }
}

/* horizontal */
@media only screen and (max-width: 768px) and (min-aspect-ratio: 1/1) {
  video,
  iframe {
    @apply h-[90vh] w-full max-w-full;
  }
}

/* The placeholder mirrors the player box, but grows instead of clipping its content. */
.video-placeholder {
  @apply h-fit w-full min-w-[50vw] max-w-full style-card md:min-h-[60vh];
}
@media only screen and (max-width: 768px) and (max-aspect-ratio: 1/1) {
  .video-placeholder {
    @apply w-full max-w-full;
    min-height: calc(100vw * 0.5);
  }
}
@media only screen and (max-width: 768px) and (min-aspect-ratio: 1/1) {
  .video-placeholder {
    @apply min-h-[90vh] w-full max-w-full;
  }
}
</style>
