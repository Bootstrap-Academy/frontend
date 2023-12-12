<template>
  <div>
    <p class="mb-4 mt-8">{{ t("Headings.DragAndDropToMatchMatchings") }}</p>

    <section class="grid grid-cols-2 gap-x-1 sm:gap-x-3">
      <div>
        <article
          class="flex items-center w-full gap-1 sm:gap-3"
          v-for="i of 4"
          :key="i"
        >
          <div
            class="px-2 sm:px-4 py-4 rounded-md my-2 border-4 border-tertiary w-full"
          >
            <SkeletonText class="max-w-[80%]" />
          </div>
          <ArrowRightIcon class="w-8 h-8 text-accent" />
        </article>
      </div>

      <div>
        <div>
          <article
            class="flex items-center w-full gap-1 sm:gap-3"
            v-for="i of 4"
          >
            <div
              class="px-2 sm:px-4 py-4 rounded-md my-2 border-4 border-tertiary w-full"
            >
              <SkeletonText class="max-w-[80%]" />
            </div>
            <Bars3Icon class="h-7 w-7 text-accent cursor-pointer handler" />
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ArrowRightIcon, Bars3Icon } from "@heroicons/vue/24/outline";

const { t } = useI18n();
</script>

<style scoped></style>
