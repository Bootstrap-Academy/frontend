<template>
  <section>
    <div
      class="flex gap-6 flex-col sm:flex-row items-center justify-center m-10 mt-20 flex-wrap"
    >
      <section
        :class="[{ 'sm:-mt-10': i == 2 }]"
        v-for="i of 3"
        :key="i"
        class="topUserCard"
      >
        <div class="w-20 h-20">
          <SkeletonText class="w-full h-full rounded-full" />
        </div>

        <div class="w-28">
          <SkeletonText class="max-w-[120px] my-2" />
        </div>

        <div class="flex gap-1 items-center">
          <p class="text-sm">{{ t("Headings.Score") }}:</p>
          <div class="w-12">
            <SkeletonText class="max-w-[50px] my-2" />
          </div>
        </div>

        <SvgLevel1Icon v-if="i == 1" class="absolute top-1 right-0 h-8 w-8" />
        <SvgLevel2Icon v-if="i == 2" class="absolute top-1 right-0 h-8 w-8" />
        <SvgLevel3Icon v-if="i == 3" class="absolute top-1 right-0 h-8 w-8" />
      </section>
    </div>
    <div v-for="i of 12" :key="i">
      <section
        class="border-b border-accent border-t border-t-transparent border-x border-x-transparent hover:border hover:border-accent hover:shadow-sm hover:shadow-accent hover:scale-105 duration-300 transition-all my-5 p-3 sm:p-5 rounded-md flex flex-col sm:flex-row items-start justify-between gap-4 sm:items-center"
      >
        <article class="flex gap-2 items-center">
          <p>{{ i }})</p>
          <SvgLevel1Icon v-if="i == 1" />
          <SvgLevel2Icon v-else-if="i == 2" />
          <SvgLevel3Icon v-else-if="i == 3" />
          <SvgLevel4Icon v-else-if="i == 4" />
          <SvgLevel5Icon v-else-if="i == 5" />
          <SvgLevel6Icon v-else-if="i == 6" />
          <SvgLevel7Icon v-else-if="i == 7" />
          <SvgLevel8Icon v-else-if="i == 8" />
          <SvgLevel9Icon v-else />
          <div class="w-20 h-20">
            <SkeletonText class="w-full h-full rounded-full" />
          </div>

          <SkeletonText class="max-w[200px]" />
        </article>

        <section class="flex gap-3 items-center px-7 sm:px-10">
          <div class="flex gap-1 items-center">
            <p class="text-sm">{{ t("Headings.Score") }}:</p>
            <div class="w-12">
              <SkeletonText class="max-w-[50px] my-2" />
            </div>
          </div>
          <div class="flex gap-1 items-center">
            <p class="text-sm">{{ t("Headings.Rank") }}:</p>
            <div class="w-12">
              <SkeletonText class="max-w-[50px] my-2" />
            </div>
          </div>
        </section>
      </section>
    </div>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
export default {
  setup() {
    const { t } = useI18n();
    return { t };
  },
};
</script>

<style scoped>
.topUserCard {
  @apply border border-light rounded-md min-w-[180px] flex flex-col items-center px-6 py-10 relative hover:-translate-y-2 transition-all duration-300;
}
</style>
