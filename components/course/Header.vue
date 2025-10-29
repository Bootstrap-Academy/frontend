<template>
  <header
    class="grid h-fit grid-cols-1 gap-5 md:grid-cols-[200px_1fr] md:gap-x-10 lg:grid-cols-[300px_1fr_auto]"
  >
    <img
      :src="image"
      :alt="t('AltAttributes.CourseCover')"
      class="h-[200px] w-full rounded-md object-cover shadow-xl sm:h-[250px] md:row-span-2 lg:row-span-1"
    />

    <div>
      <SectionTitle full size="xl" :subheading="category" :heading="title" />
      <p>
        {{ t("Body.CreatedBy") }}
        <span v-if="authors.length === 1">
          <a class="text-accent" :href="authors[0].url">{{ authors[0].name }}</a>
        </span>
        <span v-else-if="authors.length === 2">
          <a class="text-accent" :href="authors[0].url">{{ authors[0].name }}</a>
          {{ t("Body.And") }}
          <a class="text-accent" :href="authors[1].url">{{ authors[1].name }}</a>
        </span>
        <span v-else>
          <template v-for="(author, index) in authors">
            <template v-if="index !== authors.length - 1">
              <span>
                <a class="text-accent" :href="author.url">{{ author.name }}</a
                >,
              </span>
            </template>
            <template v-else>
              {{ t("Body.And") }}
              <a class="text-accent" :href="author.url">{{ author.name }}</a>
            </template>
          </template>
        </span>
      </p>
    </div>

    <p class="-mt-2 text-sm text-subheading md:mt-2">
      {{ t("Body.LastUpdated") }}
      <span class="text-body">{{ lastUpdated }}</span>
    </p>
  </header>
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

    const image = computed(() => {
      return props.data?.image ?? `/images/about-${getRandomNumber(1, 5)}.webp`;
    });

    const category = computed(() => {
      return (props.data?.category ?? props.data?.id ?? "").replace(/_/g, " ");
    });

    const title = computed(() => {
      return props.data?.title ?? "";
    });

    const authors = computed(() => {
      return props.data?.authors ?? "";
    });

    const lastUpdated = computed(() => {
      let timestamp = props.data?.last_update ?? "";
      if (!!!timestamp) return ``;

      let { month, year } = convertTimestampToDate(timestamp);
      return `${t(month.string).substring(0, 3)}, ${year}`;
    });

    return { image, title, category, authors, lastUpdated, t };
  },
});
</script>

<style scoped></style>
