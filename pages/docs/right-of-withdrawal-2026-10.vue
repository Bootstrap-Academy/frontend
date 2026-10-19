<!--
  The withdrawal instruction 2026-10 under its own address (`composables/terms.ts`). While no
  start is configured the page does not exist. From the announcement until the start it says
  that the version does not apply yet and leads to the version in force; from the start it
  shows the text alone. The start date stands once, in the closing line of the instructions.
  Wording: draft v3, `seitenkaesten.md`.
-->
<template>
  <div>
    <aside v-if="!terms.inForce" class="mt-main container" aria-label="Angekündigte Fassung">
      <h1 class="text-heading-1">Widerrufsbelehrung – Fassung 2026-10</h1>
      <p class="mt-card">
        Diese Fassung haben wir angekündigt. Bis zu ihrem Beginn gilt die
        <a class="underline" href="/docs/right-of-withdrawal">aktuelle Widerrufsbelehrung</a>.
      </p>
      <p class="mt-card">
        Ab demselben Tag gelten die neuen
        <a class="underline" href="/docs/terms-and-conditions-2026-10">AGB, Fassung 2026-10</a>.
      </p>
    </aside>
    <RightOfWithdrawal202610 :effective-date="terms.date" :effective-date-en="terms.dateEn" />
  </div>
</template>

<script setup lang="ts">
import RightOfWithdrawal202610 from "../../components/legal/RightOfWithdrawal202610.vue";

const terms = terms202610();
if (!terms.published)
  throw createError({ statusCode: 404, statusMessage: "Not Found", fatal: true });
</script>
