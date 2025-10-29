<template>
  <article class="card flex flex-col items-center justify-center bg-secondary style-card">
    <ShieldCheckIcon class="mb-4 h-10 w-10 max-w-xl text-accent" />

    <h2 class="text-heading-2">{{ show ? t("Headings.DisableMFA") : t("Headings.EnableMFA") }}</h2>

    <p v-if="show" class="mb-4 text-warning">
      {{ t("Body.NotRecommended") }}
    </p>

    <div class="mb-8 mt-2 flex items-center space-x-4">
      <ShieldExclamationIcon v-if="show" class="h-8 w-8 max-w-xl text-accent" />
      <CheckCircleIcon v-else class="h-8 w-8 max-w-xl text-accent" />

      <div class="flex flex-col items-center">
        <p class="text-center">
          {{ show ? t("Body.NoMoreIncreaseSecurity") : t("Body.IncreasedSecurity") }}
        </p>
        <Tooltip heading="Body.MFATooltipTitle" content="Body.MFATooltipBody">
          <span class="font-mono text-accent">{{ t("Buttons.LearnMore") }}</span>
        </Tooltip>
      </div>
    </div>

    <NuxtLink :to="show ? '/account/mfa/disable' : '/account/mfa/initialize'">
      <Btn>{{ show ? t("Buttons.DisableMFA") : t("Buttons.EnableMFA") }}</Btn>
    </NuxtLink>
  </article>
</template>

<script lang="ts">
import { CheckCircleIcon, ShieldExclamationIcon } from "@heroicons/vue/24/outline";
import { ShieldCheckIcon } from "@heroicons/vue/24/solid";
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  components: {
    ShieldCheckIcon,
    ShieldExclamationIcon,
    CheckCircleIcon,
  },
  setup() {
    const { t } = useI18n();
    const user = <any>useUser();

    const show = computed(() => {
      return user.value?.mfa_enabled ?? false;
    });

    return { t, show };
  },
});
</script>
