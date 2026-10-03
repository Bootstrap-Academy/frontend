<template>
  <article class="p-box flex min-w-0 items-center rounded-lg border border-light gap-box">
    <Avatar :name="profile.display_name" class="h-16 w-16 flex-shrink-0" />
    <div class="min-w-0">
      <p class="text-heading-3 break-words text-heading">{{ profile.display_name }}</p>
      <p>{{ t("ProfilePublication.TotalXP", { xp: profile.total_xp.toLocaleString(locale) }) }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { PublicationCard } from "~/types/publicationTypes";
defineProps<{ profile: PublicationCard }>();
const { t, locale } = useI18n();
</script>
