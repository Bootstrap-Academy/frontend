<template>
  <section
    class="lg:h-screen-main container-fluid relative flex w-screen items-center justify-center overflow-hidden pt-container pb-container lg:py-0"
  >
    <SvgHero />
    <article class="relative z-20 flex max-w-5xl flex-col items-center justify-center text-center">
      <strong class="text-heading-2 text-accent font-heading">
        {{ t("Subheadings.Hero") }}
      </strong>

      <h1 class="text-display-1 font-heading mb-box">
        {{ t("Headings.Hero") }}
      </h1>
      <p class="text-heading-4 font-body mb-card">{{ t("Body.Hero") }}</p>

      <NuxtLink :to="!!user ? '/profile' : '/auth/signup'">
        <Btn :icon="ArrowRightIcon" icon-right secondary>
          {{ t("Buttons.GetStarted") }}
        </Btn>
      </NuxtLink>
    </article>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ArrowRightIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

export default defineComponent({
  components: { ArrowRightIcon },
  setup() {
    const { t } = useI18n();

    const user = useUser();

    return { ArrowRightIcon, t, user };
  },
});
</script>

<style scoped></style>
