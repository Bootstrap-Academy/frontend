<template>
  <section class="relative overflow-hidden shadow-lg">
    <SvgDownload />
    <section
      class="container-fluid relative z-10 flex min-h-[10rem] flex-col items-center justify-center gap-5 py-[5vw] sm:py-6 md:flex-row md:justify-between md:py-8 md:gap-container"
    >
      <h2 class="text-heading-1 text-center text-white">
        {{ t("Body.ComingSoon") }}
      </h2>
      <article class="flex gap-3 md:gap-4 xl:gap-5">
        <div class="w-32 md:w-40 xl:w-48"><SvgBtnApple /></div>
        <div class="w-32 md:w-40 xl:w-48"><SvgBtnGoogle /></div>
      </article>
    </section>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  setup() {
    const { t } = useI18n();

    return { t };
  },
});
</script>

<style scoped></style>
