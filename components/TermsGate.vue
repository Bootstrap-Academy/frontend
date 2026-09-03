<!--
  AGB 20.2 promises that a new version of the terms is presented at the next
  login and that silence is not acceptance, so the gate blocks the interface
  until the user either accepts or deletes the account. It is rendered from
  `app.vue` into the slot of whichever layout is active, so it reaches every
  route.

  Nothing is remembered on the client. Whether the gate shows is derived from
  the `terms_version` on the profile that the API returns, and accepting writes
  the row on the server and reloads the profile.
-->
<template>
  <section
    v-if="show"
    class="fixed left-0 top-0 z-[100] flex h-screen w-screen items-center justify-center overflow-y-auto bg-[#0b192edd] p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="t('Headings.NewTermsAndConditions')"
  >
    <article class="card w-full max-w-xl bg-secondary style-card">
      <h2 class="text-heading-2 text-heading font-heading">
        {{ t("Headings.NewTermsAndConditions") }}
      </h2>

      <p class="text-body-1 text-body font-body mt-box">
        {{ t("Body.NewTermsAndConditions") }}
      </p>

      <div class="flex flex-col gap-box mt-box">
        <InputCheckbox
          label="Links.IAgreeTo"
          id="TermsGateTermsAndConditions"
          :link="{
            to: '/docs/terms-and-conditions',
            label: 'Links.TermsAndConditions',
          }"
          target="_blank"
          required
          v-model="termsAndConditions"
        />

        <InputCheckbox
          label="Links.MinimumAge"
          id="TermsGateMinimumAge"
          required
          v-model="ageConfirmed"
        />
      </div>

      <div class="flex flex-col items-center gap-box mt-card">
        <InputBtn :loading="submitting" @click="onclickAccept()">
          {{ t("Buttons.AcceptTermsAndConditions") }}
        </InputBtn>

        <NuxtLink to="/account" class="text-body-1 text-accent hover:underline">
          {{ t("Headings.DeleteAccount") }}
        </NuxtLink>
      </div>
    </article>
  </section>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const user = <any>useUser();

    const termsAndConditions = ref(false);
    const ageConfirmed = ref(false);
    const submitting = ref(false);

    const show = computed(() => needsTermsAcceptance(route.path));
    const valid = computed(() => termsAndConditions.value && ageConfirmed.value);

    // A user who logs out and back in as somebody else has to tick both boxes
    // again.
    watch(
      () => user.value?.id,
      () => {
        termsAndConditions.value = false;
        ageConfirmed.value = false;
      }
    );

    async function onclickAccept() {
      if (!!!valid.value) {
        openSnackbar("error", "Error.InvalidForm");
        return;
      }

      submitting.value = true;
      const [success, error] = await acceptTerms();
      submitting.value = false;

      if (!!!success) openSnackbar("error", error?.detail ?? "");
    }

    return {
      t,
      show,
      submitting,
      termsAndConditions,
      ageConfirmed,
      onclickAccept,
    };
  },
});
</script>

<style scoped></style>
