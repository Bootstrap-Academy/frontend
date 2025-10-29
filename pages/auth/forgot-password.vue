<!--
❌ Responsive UI
✅ Page Title
✅ Translation
❌ Animation

✅ Tested on chrome
✅ Tested on firefox
✅ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Recaptcha
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
    <section class="container-form">
      <SectionTitle
        center
        subheading="Links.ForgotPassword"
        heading="Forms.ForgotPassword"
        body="Body.ForgotPassword"
        size="sm"
        class="mb-card"
      />
      <FormForgotPassword />
    </section>
  </section>
</template>

<script>
definePageMeta({
  layout: "inner",
});

export default {
  head: {
    title: "Forgot Password",
  },
  setup() {
    return {};
  },
};
</script>

<style scoped></style>
