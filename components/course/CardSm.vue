<template>
  <article
    class="relative flex h-full min-h-[175px] min-w-[175px] max-w-[150px] items-end overflow-hidden rounded-lg bg-secondary shadow-lg md:min-w-[150px] md:max-w-none"
  >
    <img
      v-if="image"
      :src="image"
      alt=""
      class="absolute left-0 top-0 h-full w-full object-cover"
    />
    <div
      class="bg-primary/10 relative h-fit w-full overflow-hidden rounded-lg px-4 py-3 backdrop-blur-xl"
    >
      <h3 class="clamp tight line-3 text-heading-2 font-semibold">
        {{ title }}
      </h3>
      <p class="clamp line-1 text-body-1 mt-1">{{ description }}</p>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();
    const { localizeCourse } = useCourseExperienceCopy();
    const translated = computed(() => (props.data ? localizeCourse(props.data) : null));

    const image = computed(() => {
      return props.data?.image || "";
    });

    const title = computed(() => {
      return translated.value?.title || "";
    });

    const description = computed(() => {
      return translated.value?.description || "";
    });

    return { t, image, title, description };
  },
});
</script>

<style scoped></style>
