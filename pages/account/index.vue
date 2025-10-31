<!--
✅ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
✅ Tested on android mobile
✅ Tested on apple mobile

✅ Display data

✅ Api implemented
✅ Form Submission Process
✅ Form Post Api Error Handling + ✅ Translation
✅ Form Post Api Success Handling + ✅ Translation
-->

<template>
  <main class="mt-main mb-main container grid gap-container">
    <h1 class="text-heading-1 text-center">{{ t("Headings.MyAccount") }}</h1>
    <AccountVerifyEmail />
    <div class="justify-between max-md:space-y-6 md:flex md:space-x-12">
      <AccountNewsletter class="md:w-1/2" />
      <AccountMFA class="md:w-1/2" />
    </div>
    <div class="mb-16 justify-between max-md:space-y-6 md:flex md:space-x-12">
      <AccountChangePassword class="md:w-1/2" />
      <AccountDelete class="md:w-1/2" />
    </div>
  </main>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";

definePageMeta({
  middleware: ["auth"],
});

export default {
  head: {
    title: "Account Settings",
  },
  setup() {
    const { t } = useI18n();

    return { t };
  },
};
</script>
