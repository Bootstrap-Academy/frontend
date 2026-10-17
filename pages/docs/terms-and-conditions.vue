<!--
  The terms in force: 2026-09-r4 until terms 2026-10 take effect, from then on 2026-10
  (`composables/terms.ts`). Each version also keeps a page of its own,
  /docs/terms-and-conditions-2026-09-r4 and /docs/terms-and-conditions-2026-10.
-->
<template>
  <TermsAndConditions202610 v-if="terms.inForce" :effective-date="terms.date" />
  <TermsAndConditionsR4 v-else />
</template>

<script setup lang="ts">
import TermsAndConditionsR4 from "../../components/legal/TermsAndConditionsR4.vue";
import TermsAndConditions202610 from "../../components/legal/TermsAndConditions202610.vue";

const terms = terms202610();
</script>
