<template>
  <div>
    <aside class="mt-main container" aria-label="Historische Vertragsfassung">
      <h1 class="text-heading-1">Historische AGB – Fassung 2026-09-r1</h1>
      <p class="mt-card">
        Dies ist die unveränderte frühere Fassung zur Einsicht in bestehende Vertragsunterlagen. Der
        Aufruf dieser Seite ist keine Annahme einer Vertragsänderung.
      </p>
      <p class="mt-card">
        <a class="underline" href="/docs/terms-and-conditions">Aktuelle AGB-Fassung 2026-09-r2</a>
      </p>
    </aside>
    <TermsAndConditionsR1 />
  </div>
</template>

<script setup lang="ts">
import TermsAndConditionsR1 from "../../components/legal/TermsAndConditionsR1.vue";
</script>
