<template>
  <div>
    <p class="mb-4 mt-8">{{ t("Headings.DragAndDropToMatchMatchings") }}</p>

    <section class="grid grid-cols-2 gap-x-1 sm:gap-x-3">
      <div>
        <article class="flex w-full items-center gap-1 sm:gap-3" v-for="i of 4" :key="i">
          <div class="my-2 w-full rounded-md border-4 border-tertiary px-2 py-4 sm:px-4">
            <SkeletonText class="max-w-[80%]" />
          </div>
          <ArrowRightIcon class="h-8 w-8 text-accent" />
        </article>
      </div>

      <div>
        <div>
          <article class="flex w-full items-center gap-1 sm:gap-3" v-for="i of 4">
            <div class="my-2 w-full rounded-md border-4 border-tertiary px-2 py-4 sm:px-4">
              <SkeletonText class="max-w-[80%]" />
            </div>
            <Bars3Icon class="handler h-7 w-7 cursor-pointer text-accent" />
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
