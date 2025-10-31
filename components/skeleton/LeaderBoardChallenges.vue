<template>
  <div v-for="i of 18" :key="i">
    <section
      class="group my-3 flex cursor-pointer flex-col items-start justify-between gap-4 rounded-md border border-accent p-3 transition-all hover:scale-105 sm:flex-row sm:items-center sm:p-5"
    >
      <SkeletonText class="max-w-[200px]" />
      <ArrowRightIcon class="h-7 w-7 scale-75 text-white group-hover:scale-100" />
    </section>
  </div>
</template>

<script lang="ts">
import { ArrowRightIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
export default {
  setup() {
    const { t } = useI18n();
    return { t, ArrowRightIcon };
  },
  components: { ArrowRightIcon },
};
</script>

<style scoped></style>
