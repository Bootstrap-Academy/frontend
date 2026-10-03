<template>
  <section class="relative w-full print:hidden" :class="color">
    <article class="container-fluid flex h-fit justify-end gap-3 py-1.5">
      <button
        type="button"
        @click="locale = 'en-US'"
        lang="en"
        :aria-pressed="locale === 'en-US'"
        class="rounded px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        :class="
          color === 'bg-accent'
            ? 'text-primary focus-visible:outline-primary'
            : 'text-heading focus-visible:outline-heading'
        "
      >
        English
      </button>
      <button
        type="button"
        @click="locale = 'de'"
        lang="de"
        :aria-pressed="locale === 'de'"
        class="rounded px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        :class="
          color === 'bg-accent'
            ? 'text-primary focus-visible:outline-primary'
            : 'text-heading focus-visible:outline-heading'
        "
      >
        Deutsch
      </button>
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
    const { locale } = useI18n();

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

    return { locale };
  },
};
</script>

<style scoped></style>
