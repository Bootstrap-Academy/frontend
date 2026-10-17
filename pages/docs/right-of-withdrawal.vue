<!--
  The withdrawal instruction in force: the one of September 2026 until terms 2026-10 take
  effect, from then on 2026-10 (`composables/terms.ts`). Each version also keeps a page of its
  own, /docs/right-of-withdrawal-2026-09 and /docs/right-of-withdrawal-2026-10.
-->
<template>
  <RightOfWithdrawal202610
    v-if="terms.inForce"
    :effective-date="terms.date"
    :effective-date-en="terms.dateEn"
  />
  <RightOfWithdrawal202609 v-else />
</template>

<script setup lang="ts">
import RightOfWithdrawal202609 from "../../components/legal/RightOfWithdrawal202609.vue";
import RightOfWithdrawal202610 from "../../components/legal/RightOfWithdrawal202610.vue";

const terms = terms202610();
</script>
