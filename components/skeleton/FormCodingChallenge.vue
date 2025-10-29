<template>
  <div>
    <p>{{ t("Inputs.Description") }}</p>
    <SkeletonText class="h-64 w-full rounded-md" />

    <p class="mb-2 ml-1 mt-8">{{ t("Headings.EvaluatorCode") }}</p>
    <SkeletonText class="h-64 w-full rounded-md" />
    <div class="mt-10 flex flex-col items-end justify-end">
      <p class="mb-2 ml-1">{{ t("Inputs.SolutionEnvironment") }}</p>
      <SkeletonText class="h-14 w-56 rounded-md" />
    </div>

    <p class="mb-2 ml-1">{{ t("Headings.SolutionCode") }}</p>
    <SkeletonText class="h-64 w-full rounded-md" />

    <div class="mt-2 flex cursor-pointer items-center justify-end gap-2 text-xs text-accent">
      {{ t("Headings.ClickForExampleCode") }}
      <CodeBracketIcon class="h-5 w-5" />
    </div>

    <article class="mt-10 flex justify-end">
      <div
        class="group flex w-fit cursor-pointer items-center gap-2 rounded-full bg-[#6448e433] px-3 py-1 hover:bg-[#5e41de4d]"
      >
        <Cog6ToothIcon class="h-7 w-7 text-white group-hover:animate-spin" />
        <p class="text-[#afa7dd]">
          {{ advanceSettings ? "Hide Settings" : "Advance Settings" }}
        </p>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { Cog6ToothIcon } from "@heroicons/vue/24/outline";
import { CodeBracketIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";
const { t } = useI18n();
</script>

<style scoped></style>
