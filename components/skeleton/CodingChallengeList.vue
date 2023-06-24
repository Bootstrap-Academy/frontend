<template>
  <section
    v-for="i of 6"
    :key="i"
    class="bg-primary mb-4 p-2 group cursor-pointer"
  >
    <article class="flex gap-3 justify-between">
      <SkeletonText sm class="sm:w-3/4 clamp tight line-1 text-accent" />

      <ArrowRightIcon
        class="h-6 w-6 text-accent transition-all duration-500 group-hover:scale-125"
      />
    </article>

    <article class="flex flex-wrap gap-x-5 gap-y-2 justify-between mt-4">
      <div class="flex gap-3">
        <p class="text-sm flex">
          {{ t("Headings.Time") }}: <SkeletonText class="max-w-[40px]" />
        </p>
        <p class="text-sm flex">
          {{ t("Headings.Memory") }}: <SkeletonText class="max-w-[50px]" />
        </p>
      </div>
      <div class="flex gap-3">
        <p class="text-sm flex">
          {{ t("Headings.XP") }}:
          <SkeletonText class="max-w-[40px]" />
        </p>
        <p class="text-sm flex">
          {{ t("Headings.Coins") }}: <SkeletonText class="max-w-[50px]" />
        </p>
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
