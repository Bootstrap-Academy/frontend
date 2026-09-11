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
            ? "Nutze den Feedback-Button unten rechts. Deine Meldung wird öffentlich auf GitHub veröffentlicht; ein Konto ist nicht erforderlich. Technische Angaben und ein bearbeitetes Bild kannst du freiwillig ergänzen. Text allein genügt."
            : "Use the feedback button in the bottom-right corner. Your report is published publicly on GitHub; no account is needed. Technical details and an edited image are optional. Text alone is enough."
        }}
      </p>
      <p>
        {{
          de
            ? "Bitte keine persönlichen Daten oder Zugangsdaten veröffentlichen. Eine persönliche Antwort oder Umsetzung können wir nicht zusagen."
            : "Please do not publish personal information or credentials. We cannot promise a personal reply or implementation."
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
            ? "Für direkten Kontakt, Fragen zu deinem Konto, Löschanliegen und Sicherheitslücken nutze bitte die E-Mail-Adresse im Impressum. Diese Angaben gehören nicht in eine öffentliche GitHub-Meldung."
            : "For direct contact, account questions, deletion requests and security vulnerabilities, please use the email address in our legal notice. These details do not belong in a public GitHub report."
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
