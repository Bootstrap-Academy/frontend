<template>
  <article v-if="videoSRC && activeLecture">
    <iframe
      v-if="activeLecture.type == 'youtube'"
      :src="videoSRC"
      title="YouTube player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      :key="`youtube-${activeLecture.id}`"
    ></iframe>

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
        To view this video please enable JavaScript, and consider upgrading to a
        web browser that
        <a
          sveltekit:prefetch
          href="https://videojs.com/html5-video-support/"
          target="_blank"
        >
          supports HTML5 video
        </a>
      </p>
    </video>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";

export default defineComponent({
  props: {
    course: { type: Object as PropType<any>, default: null },
    activeSection: { type: Object as PropType<any>, default: null },
    activeLecture: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const videoSRC = useVideoSRC();

    let videoInterval: any;
    const video = ref<HTMLVideoElement | null>(null); 
    const refSource = ref<HTMLSourceElement | any>(null);

    watch(
      () => props.activeLecture,
      async (newValue, oldValue) => {
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
            };
            // refSource.value.setAttribute('src', videoSRC.value);
            refSource.value.src = videoSRC.value;
          }, 28800000); //8 hours
        }
      },
      { deep: true, immediate: true }
    );


    function onTimeUpdate(videoID: string, event: any) {
      const videoCookie = useCookie("currentVideo");
      const timeCookie = useCookie("currentVideoTime");
    
      const currentVideoTime = event.target.currentTime;
      timeCookie.value = currentVideoTime;
    
      if (currentVideoTime < 1) videoCookie.value = videoID;
    }
    
    function onVideoLoad(videoID: string, event: any) {
      const videoCookie = useCookie("currentVideo");
      const timeCookie = useCookie("currentVideoTime");
    
      if (!videoCookie || videoCookie.value === "" || !timeCookie || timeCookie.value === "") return;
    
      if (videoCookie.value !== videoID) {
        // Reset the time cookie to start the new video from the beginning
        timeCookie.value = "";
        videoCookie.value = videoID;
      } else {
        // Set the current video time to the saved cookie value
        event.target.currentTime = timeCookie.value;
      }
    }
    
    return { videoSRC, refSource, onTimeUpdate, onVideoLoad };
  },
});
</script>

<style scoped>
video,
iframe {
  @apply w-full min-w-[50vw] max-w-full  h-fit lg:h-auto md:min-h-[60vh] style-card;
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
    @apply w-full h-[90vh] max-w-full;
  }
}
</style>
