<template>
  <section class="h-7.5 relative w-screen overflow-clip" :class="color">
    <article class="container-fluid flex h-fit justify-end gap-3 py-1.5">
      <img
        @click="locale = 'en-US'"
        src="/images/en.webp"
        :alt="t('AltAttributes.EnglishTranslation')"
        class="h-4 w-4 cursor-pointer rounded-3xl object-cover transition duration-200 ease-out"
        :class="locale == 'en-US' ? 'opacity-100' : 'opacity-60'"
      />

      <img
        @click="locale = 'de'"
        src="/images/de.webp"
        :alt="t('AltAttributes.GermanTranslation')"
        class="h-4 w-4 cursor-pointer rounded-3xl object-cover transition duration-200 ease-out"
        :class="locale == 'de' ? 'opacity-100' : 'opacity-60'"
      />
    </article>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

export default {
  props: {
    color: { type: String, default: "bg-tertiary" },
  },
  setup() {
    const { t, locale } = useI18n();

    const cookie_locale = useAppCookie("locale");

    // Only store the language once the user picks one, never on page load.
    watch(
      () => locale.value,
      (newValue, oldValue) => {
        if (newValue === oldValue) return;
        cookie_locale.value = newValue;
      },
      { deep: true }
    );

    return { locale, t };
  },
};
</script>

<style scoped></style>
