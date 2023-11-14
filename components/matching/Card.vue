<template>
  <div>
    <article
      class="flex justify-between gap-4 bg-secondary mb-4 rounded-md cursor-pointer py-5 px-3"
    >
      <p class="clamp line-1 tight sm:pr-3 md:pr-5 md:w-4/5 lg:w-2/3">
        {{ t("Headings.Matching") }} {{ subtask?.left?.length ?? "" }} x
        {{ subtask?.left?.length ?? "" }}
        <span class="clamp inline">
          {{ subtask?.left[0] }}
        </span>
      </p>
    </article>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const props = defineProps({
  subtask: { type: Object, default: null },
});

const { t } = useI18n();
</script>

<style scoped></style>
