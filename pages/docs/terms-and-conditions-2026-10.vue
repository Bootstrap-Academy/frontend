<!--
  Terms 2026-10 under their own address (`composables/terms.ts`). While no start is configured
  the page does not exist. From the announcement until the start it says that the version does
  not apply yet and leads to the version in force; from the start it shows the text alone.
-->
<template>
  <div>
    <aside v-if="!terms.inForce" class="mt-main container" aria-label="Angekündigte Fassung">
      <h1 class="text-heading-1">AGB – Fassung 2026-10</h1>
      <p class="mt-card">
        Diese Fassung haben wir angekündigt, sie gilt noch nicht. Bis zu ihrem Stichtag gilt die
        <a class="underline" href="/docs/terms-and-conditions">aktuelle AGB-Fassung</a>.
      </p>
      <p class="mt-card">
        Ab demselben Tag gilt die neue
        <a class="underline" href="/docs/right-of-withdrawal-2026-10"
          >Widerrufsbelehrung, Fassung 2026-10</a
        >.
      </p>
    </aside>
    <TermsAndConditions202610 :effective-date="terms.date" />
  </div>
</template>

<script setup lang="ts">
import TermsAndConditions202610 from "../../components/legal/TermsAndConditions202610.vue";

const terms = terms202610();
if (!terms.published)
  throw createError({ statusCode: 404, statusMessage: "Not Found", fatal: true });
</script>
