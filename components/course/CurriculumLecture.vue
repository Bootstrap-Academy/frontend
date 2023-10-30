<template>
  <article
    v-if="data"
    class="lecture-box group cursor-pointer grid grid-cols-[auto_minmax(0,1fr)_auto] gap-box items-center"
    :id="id"
  >
    <CheckCircleIcon
      v-if="completed"
      class="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 transition-basic icon fill-info group-hover:fill-info"
      :class="[isActive ? 'opacity-100' : 'opacity-50']"
    />
    <PlayCircleIcon
      v-else
      class="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 transition-basic icon"
      :class="[
        isActive
          ? 'fill-accent group-hover:fill-accent'
          : 'fill-subheading group-hover:fill-white',
      ]"
    />

    <p
      class="text-body-1 clamp line-1 transition-basic text-body"
      :title="title"
    >
      {{ title }}
    </p>
    <p class="text-body-2 text-subheading flex-shrink-0 w-fit">
      {{ t("Headings.Mins", { n: duration }, duration) }}
    </p>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType, Ref } from "vue";
import { useI18n } from "vue-i18n";
import { PlayCircleIcon, CheckCircleIcon } from "@heroicons/vue/24/solid";
import { useListOfCompletedCourses } from "../../composables/courses";
export default defineComponent({
  components: { PlayCircleIcon, CheckCircleIcon },
  props: {
    data: { type: Object as PropType<any>, default: null },
    activeSection: { type: String, default: "" },
    activeLecture: { type: String, default: "" },
  },
  emits: ["id"],
  setup(props, { emit }) {
    const { t } = useI18n();

    const listOfCompletedCourses = useListOfCompletedCourses();

    const id = computed(() => {
      return props.data?.id ?? "";
    });

    const completed = computed(() => {
      let isCompleted = props.data?.completed ?? false;

      if (isCompleted == false) {
        isCompleted = !!listOfCompletedCourses.value.find(
          (itemID) => itemID == id.value
        );
      }
      return isCompleted;
    });

    const title = computed(() => {
      return props.data?.title ?? false;
    });

    const isActive = computed(() => {
      return props.activeLecture == props.data?.id ?? "";
    });

    const duration = computed(() => {
      return Math.round(
        convertTimestampToDate(props.data?.duration ?? 0).minutes
      );
    });

    return { t, id, completed, title, duration, isActive };
  },
});
</script>

<style scoped></style>
