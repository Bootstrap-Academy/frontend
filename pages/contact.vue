<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
const { locale } = useI18n();
const de = computed(() => locale.value.startsWith("de"));
useHead({ title: computed(() => (de.value ? "Feedback und Kontakt" : "Feedback and contact")) });
</script>

<template>
  <main class="my-container space-y-card container-fluid mx-auto max-w-3xl">
    <h1 class="text-heading-1">{{ de ? "Feedback und Kontakt" : "Feedback and contact" }}</h1>
    <section class="border-accent/40 p-card space-y-3 rounded-lg border bg-secondary">
      <h2 class="text-heading-3">
        {{ de ? "Fehler melden oder Idee vorschlagen" : "Report a bug or suggest an idea" }}
      </h2>
      <p>
        {{
          de
            ? "Nutze den Feedback-Button unten rechts. Dort kannst du uns einen Fehler oder eine Idee schicken – auch ohne Konto."
            : "Use the feedback button in the bottom-right corner to share a bug or idea. You don’t need an account."
        }}
      </p>
      <p>
        {{
          de
            ? "Dein Feedback ist öffentlich auf GitHub zu sehen. Wir nutzen es für die Entwicklung und antworten dort nicht persönlich."
            : "Your feedback is public on GitHub. We use it to improve the platform and don’t send personal replies there."
        }}
      </p>
    </section>
    <section class="space-y-3">
      <h2 class="text-heading-3">
        {{
          de
            ? "Persönliches Anliegen oder Sicherheitslücke"
            : "Personal request or security vulnerability"
        }}
      </h2>
      <p>
        {{
          de
            ? "Bei Fragen zu deinem Konto, Löschwünschen oder Sicherheitslücken schreib uns bitte per Mail."
            : "For account questions, deletion requests or security vulnerabilities, please email us."
        }}
      </p>
      <NuxtLink
        to="/docs/imprint"
        class="inline-flex min-h-12 items-center text-accent underline"
        >{{ de ? "Zum Impressum und E-Mail-Kontakt" : "Legal notice and email contact" }}</NuxtLink
      >
      <p>
        <NuxtLink to="/docs/privacy#kommunikation" class="underline">{{
          de ? "Datenschutzhinweise" : "Privacy information"
        }}</NuxtLink>
      </p>
    </section>
  </main>
</template>
