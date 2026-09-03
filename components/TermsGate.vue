<!--
  AGB 20.2 promises that a new version of the terms is presented at the next
  login and that silence is not acceptance, and it lets the user reject the new
  version: the version they accepted before keeps applying and we may then
  terminate ordinarily under AGB 4.3. The gate therefore offers exactly two
  explicit actions - accept, or "decide later" - and nothing else closes it:
  there is no backdrop click handler and no escape handler, so the modal cannot
  be dismissed by accident.

  It is rendered from `app.vue` into the slot of whichever layout is active, so
  it reaches every route.

  Nothing is remembered on the client beyond this app session. Whether the gate
  shows is derived from the `terms_version` on the profile that the API returns;
  both actions write the row on the server and reload the profile.
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
        {{ bodyParts[0]
        }}<NuxtLink
          to="/docs/terms-and-conditions"
          target="_blank"
          class="text-accent hover:underline"
          >{{ t("Links.TermsAndConditions") }}</NuxtLink
        >{{ bodyParts[1] }}
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
          :show-error="attempted"
          v-model="termsAndConditions"
        />

        <InputCheckbox
          label="Links.MinimumAge"
          id="TermsGateMinimumAge"
          required
          :show-error="attempted"
          v-model="ageConfirmed"
        />
      </div>

      <div class="flex flex-col items-center gap-box mt-card">
        <InputBtn :loading="submitting" @click="onclickAccept()">
          {{ t("Buttons.AcceptTermsAndConditions") }}
        </InputBtn>

        <InputBtn secondary :loading="declining" @click="onclickDecline()">
          {{ t("Buttons.DecideLater") }}
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
    const dismissed = useTermsGateDismissed();

    const termsAndConditions = ref(false);
    const ageConfirmed = ref(false);
    const submitting = ref(false);
    const declining = ref(false);

    // Set once acceptance has been attempted, so an unticked box is pointed
    // out next to itself and not only in the snackbar.
    const attempted = ref(false);

    const show = computed(() => needsTermsAcceptance(route.path));
    const valid = computed(() => termsAndConditions.value && ageConfirmed.value);

    // The link to the terms replaces the `%%%` placeholder in the sentence.
    const bodyParts = computed(() => {
      const [before, after = ""] = t("Body.NewTermsAndConditions").split("%%%");
      return [before, after];
    });

    // A user who logs out and back in as somebody else has to tick both boxes
    // again and is asked again, even if the previous user postponed.
    watch(
      () => user.value?.id,
      () => {
        termsAndConditions.value = false;
        ageConfirmed.value = false;
        dismissed.value = false;
      }
    );

    async function onclickAccept() {
      attempted.value = true;

      if (!!!valid.value) {
        openSnackbar("error", "Error.InvalidForm");
        return;
      }

      submitting.value = true;
      const [success, error] = await acceptTerms();
      submitting.value = false;

      if (!!!success) openSnackbar("error", error?.detail ?? "");
    }

    // Postponing needs no checkbox: the user agrees to nothing. The refusal is
    // recorded on the server and the gate is closed until the app is loaded
    // again.
    async function onclickDecline() {
      declining.value = true;
      const [success, error] = await declineTerms();
      declining.value = false;

      if (!!!success) {
        openSnackbar("error", error?.detail ?? "");
        return;
      }

      dismissed.value = true;
    }

    return {
      t,
      show,
      bodyParts,
      submitting,
      declining,
      attempted,
      termsAndConditions,
      ageConfirmed,
      onclickAccept,
      onclickDecline,
    };
  },
});
</script>

<style scoped></style>
