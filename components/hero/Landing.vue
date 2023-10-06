<template>
  <section
    class="relative flex items-center justify-center container-fluid pt-container pb-container lg:py-0 lg:h-screen-main overflow-hidden w-screen"
  >
    <SvgHero />
    <article
      class="max-w-5xl relative z-20 text-center flex flex-col justify-center items-center"
    >
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
