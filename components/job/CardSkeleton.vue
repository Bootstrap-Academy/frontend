<template>
  <article class="card flex w-full flex-col bg-secondary gap-box style-card md:card-sm">
    <div class="flex items-center justify-between">
      <SkeletonText sm class="flex-shrink-0" color="bg-accent" />
      <div class="w-[50px] animate-pulse rounded-3xl bg-[#42546e] p-2 transition-basic"></div>
    </div>
    <SkeletonText class="flex-shrink-0" />

    <article class="mt-1 flex flex-wrap items-center gap-y-2 gap-x-card">
      <IconText v-for="(stat, i) of stats" :key="i" :icon="stat.icon" sm>
        <div class="w-[50px] animate-pulse rounded-3xl bg-[#42546e] p-1 transition-basic"></div>
      </IconText>
    </article>

    <div>
      <SkeletonText class="flex-shrink-0" sm body />
      <SkeletonText class="my-2 flex-shrink-0" sm body />
      <SkeletonText class="flex-shrink-0" sm body />
    </div>

    <Btn sm class="h-fit self-end mt-box">
      <span class="text-accent">View Details</span>
    </Btn>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { BriefcaseIcon, CurrencyDollarIcon, MapPinIcon } from "@heroicons/vue/24/solid";

export default defineComponent({
  components: { BriefcaseIcon, CurrencyDollarIcon, MapPinIcon },
  setup(props) {
    const stats = computed(() => {
      return [
        {
          icon: CurrencyDollarIcon,
        },
        {
          icon: BriefcaseIcon,
        },
        {
          icon: MapPinIcon,
        },
      ];
    });

    return { stats };
  },
});
</script>

<style scoped></style>
