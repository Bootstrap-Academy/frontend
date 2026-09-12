<template>
  <div>
    <aside class="mt-main container" aria-label="Historische Vertragsfassung">
      <h1 class="text-heading-1">Historische AGB – Fassung 2026-09-r2</h1>
      <p class="mt-card">
        Dies ist die unveränderte frühere Fassung zur Einsicht in bestehende Vertragsunterlagen. Der
        Aufruf dieser Seite ist keine Annahme einer Vertragsänderung.
      </p>
      <p class="mt-card">
        <a class="underline" href="/docs/terms-and-conditions">Aktuelle AGB-Fassung</a>
      </p>
    </aside>
    <TermsAndConditionsR2 />
  </div>
</template>

<script setup lang="ts">
import TermsAndConditionsR2 from "../../components/legal/TermsAndConditionsR2.vue";
</script>
