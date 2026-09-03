<!--
  § 312k Abs. 2 BGB requires the cancellation button to be permanently
  available, and § 356a BGB the same for the withdrawal button. The bar is
  rendered from `app.vue` into the slot of whichever layout is active, so it
  reaches every route no matter which layout the page asks for.

  It is hidden while printing, because the printed sheet has to show the
  declaration record only.
-->
<template>
  <nav
    class="container-fluid flex flex-wrap items-center justify-center gap-4 border-t border-tertiary bg-secondary py-4 print:hidden"
    :aria-label="t('Headings.ContractTermination')"
  >
    <NuxtLink to="/vertrag-kuendigen">
      <Btn class="!normal-case">{{ t("Buttons.CancelContractsHere") }}</Btn>
    </NuxtLink>

    <NuxtLink to="/vertrag-widerrufen">
      <Btn class="!normal-case">{{ t("Buttons.WithdrawFromContract") }}</Btn>
    </NuxtLink>
  </nav>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  setup() {
    const { t } = useI18n();

    return { t };
  },
});
</script>

<style scoped></style>
