<template>
  <section
    class="border-b border-accent border-t border-t-transparent border-x border-x-transparent hover:border hover:border-accent hover:shadow-sm hover:shadow-accent hover:scale-105 duration-300 transition-all my-5 p-3 sm:p-5 rounded-md flex flex-col sm:flex-row items-start justify-between gap-4 sm:items-center"
  >
    <article class="flex gap-2 items-center">
      <p>{{ item.rank }})</p>
      <SvgLevel1Icon v-if="item.rank == 0" />
      <SvgLevel2Icon v-else-if="item.rank == 1" />
      <SvgLevel3Icon v-else-if="item.rank == 2" />
      <SvgLevel4Icon v-else-if="item.rank == 3" />
      <SvgLevel5Icon v-else-if="item.rank == 4" />
      <SvgLevel6Icon v-else-if="item.rank == 5" />
      <SvgLevel7Icon v-else-if="item.rank == 6" />
      <SvgLevel8Icon v-else-if="item.rank == 7" />
      <SvgLevel9Icon v-else />
      <p
        :class="[
          {
            'animate-pulse text-white text-xl font-medium': item.rank < 4,
          },
        ]"
      >
        {{ item.username }}
      </p>
    </article>

    <article class="flex gap-4 sm:gap-7 items-center">
      <p class="text-sm">
        <span class="font-medium text-base">{{ t("Headings.XP") }}:</span
        >{{ item.xp }}
      </p>
      <p class="text-sm">
        <span class="font-medium text-base"> {{ t("Headings.Level") }}: </span
        >{{ item.level }}
      </p>
    </article>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
export default {
  props: { item: { type: Object, default: {} } },
  setup() {
    const { t } = useI18n();
    return { t };
  },
};
</script>

<style scoped></style>
