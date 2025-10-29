<template>
  <article class="grid w-fit grid-cols-2 gap-x-card">
    <h4 class="text-heading-3 col-span-2 mb-3">{{ t("Headings.Duration") }}</h4>

    <div class="w-fit border border-success px-4 py-2 bg-success-light style-box">
      <h5 class="text-body">{{ t("Headings.Start") }}</h5>
      <p class="text-heading">{{ data?.start }}</p>
    </div>

    <div class="w-fit border border-error px-4 py-2 bg-error-light style-box">
      <h5 class="text-body">{{ t("Headings.End") }}</h5>
      <p class="text-heading">{{ data?.end }}</p>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import type { PropType } from "vue";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();

    return { t };
  },
});
</script>

<style scoped></style>
