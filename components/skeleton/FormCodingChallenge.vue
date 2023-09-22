<template>
  <div>
    <p>{{ t("Inputs.Description") }}</p>
    <SkeletonText class="h-64 w-full rounded-md" />

    <p class="mb-2 ml-1 mt-8">{{ t("Headings.EvaluatorCode") }}</p>
    <SkeletonText class="h-64 w-full rounded-md" />
    <div class="flex flex-col justify-end items-end mt-10">
      <p class="mb-2 ml-1">{{ t("Inputs.SolutionEnvironment") }}</p>
      <SkeletonText class="h-14 w-56 rounded-md" />
    </div>

    <p class="mb-2 ml-1">{{ t("Headings.SolutionCode") }}</p>
    <SkeletonText class="h-64 w-full rounded-md" />

    <div
      class="text-xs text-accent justify-end mt-2 cursor-pointer flex gap-2 items-center"
    >
      {{ t("Headings.ClickForExampleCode") }}
      <CodeBracketIcon class="h-5 w-5" />
    </div>

    <article class="flex justify-end mt-10">
      <div
        class="flex items-center gap-2 group cursor-pointer px-3 py-1 rounded-full w-fit bg-[#6448e433] hover:bg-[#5e41de4d]"
      >
        <Cog6ToothIcon class="text-white h-7 w-7 group-hover:animate-spin" />
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
