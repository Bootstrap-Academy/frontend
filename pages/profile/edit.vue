<!--
❌ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Preset Form
✅ Api implemented
✅ Form Client Side Error Handling
✅ Form Submission Process
✅ Form Post Api Error Handling + ✅ Translation
✅ Form Post Api Success Handling + ✅ Translation
-->

<template>
  <section
    class="h-screen-inner min container-fluid grid place-items-center pt-container pb-container"
  >
    <section class="container-form max-w-3xl">
      <SectionTitle center heading="Headings.EditProfile" size="sm" class="mx-auto mb-card" />

      <!--
        The session cookie only says who is signed in. The form saves every
        field, so it is shown once the profile has arrived.
      -->
      <p
        v-if="!profileLoaded && profileFailed"
        class="text-body-1 mx-auto flex w-fit flex-wrap items-center border border-dashed border-error px-3 py-1 text-error bg-error-light style-box gap-box mt-card mb-card"
        role="alert"
      >
        <ExclamationCircleIcon class="h-7 w-7" />

        {{ $t("Error.TryAgainLater") }}

        <button type="button" class="min-h-11 font-bold underline" @click="loadProfile">
          {{ $t("Buttons.TryAgain") }}
        </button>
      </p>

      <p
        v-else-if="!profileLoaded"
        class="text-body-1 text-center text-body mt-card mb-card"
        role="status"
      >
        {{ $t("Moderation.Loading") }}
      </p>

      <FormProfile v-else :data="user" />
    </section>
  </section>
</template>

<script lang="ts">
import { ExclamationCircleIcon } from "@heroicons/vue/24/outline";

definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  head: {
    title: "Edit Profile",
  },
  components: { ExclamationCircleIcon },
  setup() {
    const user = useUser();
    // The `user` cookie carries neither the e-mail address nor the invoice
    // data. The form and the notice about a missing address wait for the profile.
    const { profileLoaded, profileFailed, loadProfile } = useProfileLoad();

    onMounted(() =>
      watch(
        profileLoaded,
        (loaded) => {
          if (loaded && !hasEmail.value) {
            openDialog(
              "warning",
              "Headings.MissingEmail",
              "Body.MissingEmail",
              true,
              {
                label: "Buttons.Okay",
                onclick: () => {},
              },
              null
            );
          }
        },
        { immediate: true }
      )
    );

    return { user, profileLoaded, profileFailed, loadProfile };
  },
};
</script>

<style scoped></style>
