<template>
  <article class="overflow-hidden bg-secondary style-card">
    <img v-if="image" :src="image" alt="" class="h-32 w-full object-cover" />
    <div class="card-sm">
      <h3 class="clamp tight line-2 text-heading-3">{{ title }}</h3>
      <p class="clamp line-2 text-body-2 mt-2">{{ description }}</p>
    </div>
    <hr />
    <div
      class="card-sm flex h-fit justify-between"
      :class="{ 'card-sm items-center lg:pt-box lg:pb-box': price.value <= 0 }"
    >
      <IconText v-if="price.value > 0" :highlightIcon="false" sm :icon="price.icon">
        <Price :coins="price.value" />
      </IconText>
      <Chip v-else-if="completed" xs color="bg-success">
        {{ t("Headings.Completed") }}
      </Chip>
      <Chip v-else xs color="bg-info">{{ t("Headings.Free") }}</Chip>

      <span v-if="data?.learning_path_id" class="text-body-2 text-subheading">{{
        copy.course
      }}</span>
      <IconText v-else-if="lectures.value > 0" :highlightIcon="false" sm :icon="lectures.icon">
        {{ lectures.value }} {{ copy.lessons }}
      </IconText>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { PlayIcon } from "@heroicons/vue/24/outline";
import IconMorphcoin from "~/components/icon/Morphcoin.vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  components: { PlayIcon, IconMorphcoin },
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();
    const { copy, localizeCourse } = useCourseExperienceCopy();
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

    const price = computed(() => {
      return {
        value: props.data?.price ?? 0,
        icon: IconMorphcoin,
      };
    });

    const totalLectures = computed(() => {
      let lectures = props.data?.lectures ?? null;

      if (typeof lectures != "number") {
        let sections: any[] = props.data?.sections ?? [];

        let allLectures: any[] = [];

        sections.forEach((section) => {
          allLectures = [...allLectures, ...section.lectures];
        });

        return allLectures.length;
      } else {
        return lectures;
      }
    });

    const lectures = computed(() => {
      return {
        value: totalLectures.value ?? 0,
        icon: PlayIcon,
      };
    });

    const completed = computed(() => {
      return props.data?.completed ?? false;
    });

    return { image, title, description, price, lectures, completed, t, copy };
  },
});
</script>

<style scoped></style>
