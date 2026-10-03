<template>
  <GuestFrame>
    <main class="guest-landing">
      <p class="eyebrow">{{ copy.eyebrow }}</p>
      <h1>{{ copy.title }}</h1>
      <p class="intro">{{ copy.intro }}</p>
      <NuxtLink to="/start" class="start"
        >{{ copy.start }} <span aria-hidden="true">→</span></NuxtLink
      >
      <p class="note">{{ copy.noAccount }}</p>
    </main>
  </GuestFrame>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { guestCopy } from "~/utils/guest/copy";
definePageMeta({ layout: false, middleware: ["redirect-authenticated"] });
const { locale } = useI18n();
const copy = computed(() => guestCopy(locale.value));
useHead({ title: "Bootstrap Academy" });
</script>
<style scoped>
.guest-landing {
  max-width: 850px;
  margin: auto;
  padding: clamp(3rem, 10vh, 7rem) 1.5rem 6rem;
}
.eyebrow {
  color: #85e4d2;
  margin-bottom: 1rem;
}
h1 {
  font-size: clamp(2.25rem, 6vw, 4.5rem);
  font-weight: 700;
  line-height: 1.1;
  max-width: 16ch;
}
.intro {
  color: #c6d5e2;
  max-width: 48ch;
  font-size: 1.2rem;
  line-height: 1.65;
  margin: 1.75rem 0;
}
.start {
  display: inline-flex;
  gap: 2rem;
  padding: 1rem 1.3rem;
  border-radius: 0.6rem;
  background: #0cc9ab;
  color: #07312c;
  font-weight: 700;
  min-height: 48px;
}
.start:focus-visible {
  outline: 3px solid #b5efdf;
  outline-offset: 4px;
}
.note {
  color: #a8bfd0;
  margin-top: 1rem;
}
</style>
