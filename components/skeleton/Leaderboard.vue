<template>
  <section>
    <div class="m-10 mt-20 flex flex-col flex-wrap items-center justify-center gap-6 sm:flex-row">
      <section :class="[{ 'sm:-mt-10': i == 2 }]" v-for="i of 3" :key="i" class="topUserCard">
        <div class="h-20 w-20">
          <SkeletonText class="h-full w-full rounded-full" />
        </div>

        <div class="w-28">
          <SkeletonText class="my-2 max-w-[120px]" />
        </div>

        <div class="flex items-center gap-1">
          <p class="text-sm">{{ t("Headings.Score") }}:</p>
          <div class="w-12">
            <SkeletonText class="my-2 max-w-[50px]" />
          </div>
        </div>

        <SvgLevel1Icon v-if="i == 1" class="absolute right-0 top-1 h-8 w-8" />
        <SvgLevel2Icon v-if="i == 2" class="absolute right-0 top-1 h-8 w-8" />
        <SvgLevel3Icon v-if="i == 3" class="absolute right-0 top-1 h-8 w-8" />
      </section>
    </div>
    <div v-for="i of 12" :key="i">
      <section
        class="my-5 flex flex-col items-start justify-between gap-4 rounded-md border-x border-b border-t border-accent border-x-transparent border-t-transparent p-3 transition-all duration-300 hover:scale-105 hover:border hover:border-accent hover:shadow-sm hover:shadow-accent sm:flex-row sm:items-center sm:p-5"
      >
        <article class="flex items-center gap-2">
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
          <div class="h-20 w-20">
            <SkeletonText class="h-full w-full rounded-full" />
          </div>

          <SkeletonText class="max-w[200px]" />
        </article>

        <section class="flex items-center gap-3 px-7 sm:px-10">
          <div class="flex items-center gap-1">
            <p class="text-sm">{{ t("Headings.Score") }}:</p>
            <div class="w-12">
              <SkeletonText class="my-2 max-w-[50px]" />
            </div>
          </div>
          <div class="flex items-center gap-1">
            <p class="text-sm">{{ t("Headings.Rank") }}:</p>
            <div class="w-12">
              <SkeletonText class="my-2 max-w-[50px]" />
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
  @apply relative flex min-w-[180px] flex-col items-center rounded-md border border-light px-6 py-10 transition-all duration-300 hover:-translate-y-2;
}
</style>
