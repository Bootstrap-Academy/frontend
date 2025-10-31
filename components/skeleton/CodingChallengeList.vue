<template>
  <section v-for="i of 6" :key="i" class="group mb-4 cursor-pointer bg-primary p-2">
    <article class="flex justify-between gap-3">
      <SkeletonText sm class="clamp tight line-1 text-accent sm:w-3/4" />

      <ArrowRightIcon
        class="h-6 w-6 text-accent transition-all duration-500 group-hover:scale-125"
      />
    </article>

    <article class="mt-4 flex flex-wrap justify-between gap-x-5 gap-y-2">
      <div class="flex gap-3">
        <p class="flex text-sm">{{ t("Headings.Time") }}: <SkeletonText class="max-w-[40px]" /></p>
        <p class="flex text-sm">
          {{ t("Headings.Memory") }}: <SkeletonText class="max-w-[50px]" />
        </p>
      </div>
      <div class="flex gap-3">
        <p class="flex text-sm">
          {{ t("Headings.XP") }}:
          <SkeletonText class="max-w-[40px]" />
        </p>
        <p class="flex text-sm">{{ t("Headings.Coins") }}: <SkeletonText class="max-w-[50px]" /></p>
      </div>
    </article>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { ArrowRightIcon } from "@heroicons/vue/24/outline";
export default defineComponent({
  setup() {
    const { t } = useI18n();

    return { t };
  },
  components: { ArrowRightIcon },
});
</script>

<style scoped></style>
