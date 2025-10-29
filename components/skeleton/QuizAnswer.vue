<template>
  <div>
    <SkeletonText class="h-5 w-full" />
    <SkeletonText class="mt-2 h-5 w-2/3" />
    <SkeletonText class="my-4 h-5 w-2/3" />
    <div class="grid gap-6">
      <SkeletonText class="mt-1 h-14 w-full rounded-md" />
      <SkeletonText class="h-14 w-full rounded-md" />
      <SkeletonText class="h-14 w-full rounded-md" />

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
