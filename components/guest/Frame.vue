<template>
  <div class="guest-frame">
    <header>
      <NuxtLink to="/" :aria-label="copy.home" class="brand">Bootstrap Academy</NuxtLink>
      <nav :aria-label="copy.language">
        <button type="button" :aria-pressed="locale === 'de'" lang="de" @click="choose('de')">
          Deutsch
        </button>
        <button
          type="button"
          :aria-pressed="locale.startsWith('en')"
          lang="en"
          @click="choose('en-US')"
        >
          English
        </button>
        <NuxtLink v-if="authenticated" to="/dashboard">{{ copy.account }}</NuxtLink>
        <NuxtLink v-else v-slot="{ href, navigate }" to="/auth/login" custom>
          <a :href="href || undefined" @click="login($event, navigate)">{{ copy.login }}</a>
        </NuxtLink>
      </nav>
    </header>
    <slot />
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { guestCopy } from "~/utils/guest/copy";
const emit = defineEmits<{ login: [event: MouseEvent] }>();
const { locale } = useI18n();
const copy = computed(() => guestCopy(locale.value));
const token = useAccessToken();
const authenticated = computed(() => !!token.value);
const languageCookie = useAppCookie("locale");
function login(event: MouseEvent, navigate: (event: MouseEvent) => unknown) {
  emit("login", event);
  if (!event.defaultPrevented) void navigate(event);
}
function choose(value: string) {
  locale.value = value;
  languageCookie.value = value;
}
</script>
<style scoped>
.guest-frame {
  color: #edf3fb;
  background: #0c1829;
  min-height: 85vh;
}
header {
  max-width: 1100px;
  padding: 1rem clamp(1rem, 4vw, 2rem);
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.brand {
  font-weight: 700;
  font-size: 1.1rem;
}
nav {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}
nav :is(button, a) {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0.35rem;
  color: #bfd4e3;
}
button[aria-pressed="true"] {
  color: #85e4d2;
  text-decoration: underline;
  text-underline-offset: 0.3em;
}
:is(a, button):focus-visible {
  outline: 2px solid #85e4d2;
  outline-offset: 3px;
  border-radius: 4px;
}
</style>
