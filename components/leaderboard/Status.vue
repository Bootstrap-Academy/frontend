<template>
  <section role="alert" class="flex flex-wrap items-center gap-box">
    <p>{{ t(message) }}</p>
    <button
      type="button"
      class="min-h-[44px] rounded border border-accent px-4 py-2 text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      @click="$emit('reload')"
    >
      {{ t("ProfilePublication.Reload") }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
const props = defineProps<{ error: string }>();
defineEmits<{ reload: [] }>();
const { t } = useI18n();
// Signing in again and a verified email address are what reading a leaderboard needs;
// sharing your own profile is a separate choice on the profile page.
const message = computed(() =>
  props.error === "SignIn" || props.error === "Verify"
    ? `ProfilePublication.Ranking${props.error}`
    : "ProfilePublication.RankingUnavailable"
);
</script>
