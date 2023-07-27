<template>
  <div class="sm:container-fluid">
    <section class="rounded-md card-sm">
      <SubscriptionCard />
    </section>
  </div>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
export default {
  setup() {
    const { t } = useI18n();
    return { t };
  },
};
</script>

<style scoped></style>
