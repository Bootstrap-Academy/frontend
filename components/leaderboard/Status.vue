<template>
  <section role="alert" class="flex flex-wrap items-center gap-box">
    <p>
      {{
        t(
          `ProfilePublication.${error === "SignIn" || error === "Verify" ? error : "RankingUnavailable"}`
        )
      }}
    </p>
    <button
      type="button"
      class="min-h-[44px] rounded border border-accent px-4 py-2"
      @click="$emit('reload')"
    >
      {{ t("ProfilePublication.Reload") }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
defineProps<{ error: string }>();
defineEmits<{ reload: [] }>();
const { t } = useI18n();
</script>
