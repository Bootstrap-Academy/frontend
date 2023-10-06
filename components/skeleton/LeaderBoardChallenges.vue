<template>
  <div v-for="i of 18" :key="i">
    <section
      class="group cursor-pointer hover:scale-105 border border-accent transition-all my-3 p-3 sm:p-5 rounded-md flex flex-col sm:flex-row items-start justify-between gap-4 sm:items-center"
    >
      <SkeletonText class="max-w-[200px]" />
      <ArrowRightIcon
        class="h-7 w-7 scale-75 text-white group-hover:scale-100"
      />
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
