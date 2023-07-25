<template>
  <div v-for="i of 18" :key="i">
    <section
      class="border-b border-accent border-t border-t-transparent border-x border-x-transparent hover:border hover:border-accent hover:shadow-sm hover:shadow-accent hover:scale-105 duration-300 transition-all my-5 p-3 sm:p-5 rounded-md flex flex-col sm:flex-row items-start justify-between gap-4 sm:items-center"
    >
      <SkeletonText class="max-w-[200px]" />
      <section class="flex gap-3 items-center px-7 sm:px-10">
        <div class="flex gap-1 items-center">
          <p class="text-sm">{{ t("Headings.XP") }}:</p>
          <div class="w-12">
            <SkeletonText class="max-w-[50px] my-2" />
          </div>
        </div>
        <div class="flex gap-1 items-center">
          <p class="text-sm">{{ t("Headings.Level") }}:</p>
          <div class="w-12">
            <SkeletonText class="max-w-[50px] my-2" />
          </div>
        </div>
      </section>
    </section>
  </div>
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

<style scoped></style>
