<template>
  <article class="mt-card" aria-labelledby="publication-heading" :aria-busy="view.busy">
    <h2 id="publication-heading" class="text-heading-2 font-black mb-box">
      {{ t("Headings.Visibility") }}
    </h2>
    <p role="status" aria-live="polite" class="mb-box">
      {{
        t(
          `ProfilePublication.${view.settings ? (view.settings.profile_visibility === "shared" ? "SharedStatus" : "Private") : view.busy ? "Loading" : "Unknown"}`
        )
      }}
    </p>
    <p v-if="view.error" role="alert" class="mb-box">
      {{ t(`ProfilePublication.${view.error}`) }}
    </p>
    <p v-if="view.success" role="status" class="text-accent mb-box">
      {{ t(`ProfilePublication.${view.success}`) }}
    </p>

    <div v-if="view.preview" class="flex flex-col gap-box mb-box" data-publication-preview>
      <h3 class="text-heading-3">{{ t("ProfilePublication.Preview") }}</h3>
      <ProfilePublicationCard :profile="view.preview.card" />
      <p>{{ t("ProfilePublication.RankingPreview") }}</p>
      <p>{{ t("ProfilePublication.Notice") }}</p>
      <button
        type="button"
        class="publication-button"
        :disabled="view.busy"
        @click="choose('shared')"
      >
        {{ t("ProfilePublication.Share") }}
      </button>
    </div>

    <div class="flex flex-wrap gap-box">
      <button
        v-if="view.settings && !view.preview && !view.uncertain"
        type="button"
        class="publication-button"
        :disabled="view.busy"
        @click="preview"
      >
        {{ t("ProfilePublication.ShowPreview") }}
      </button>
      <button
        v-if="view.settings?.profile_visibility === 'shared' && !view.uncertain"
        type="button"
        class="publication-button"
        :disabled="view.busy"
        @click="choose('private')"
      >
        {{ t("ProfilePublication.Withdraw") }}
      </button>
      <button
        v-if="view.uncertain"
        type="button"
        class="publication-button"
        :disabled="view.busy"
        @click="retry"
      >
        {{ t("ProfilePublication.CheckAgain") }}
      </button>
      <button
        v-else-if="view.error"
        type="button"
        class="publication-button"
        :disabled="view.busy"
        @click="reload"
      >
        {{ t("ProfilePublication.Reload") }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const { view, preview, choose, retry, reload } = useProfilePublication();
</script>

<style scoped>
.publication-button {
  @apply min-h-[44px] rounded border border-accent px-4 py-2 text-heading;
}
.publication-button:focus-visible {
  @apply outline outline-2 outline-offset-4 outline-accent;
}
.publication-button:disabled {
  @apply cursor-wait opacity-60;
}
</style>
