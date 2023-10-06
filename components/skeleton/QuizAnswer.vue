<template>
  <div>
    <SkeletonText class="w-full h-5" />
    <SkeletonText class="w-2/3 mt-2 h-5" />
    <p class="text-accent mt-5" v-if="!subtask?.solved">
      {{ t("Headings.ChooseCorrectOption") }}
    </p>
    <div class="grid gap-6">
      <SkeletonText class="w-full h-14 mt-1 rounded-md" />
      <SkeletonText class="w-full h-14 rounded-md" />
      <SkeletonText class="w-full h-14 rounded-md" />

      <InputBtn full mt>
        {{ t("Buttons.SubmitAnswer") }}
      </InputBtn>
    </div>
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
