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
        subheading="Buttons.ResetPassword"
        heading="Forms.ResetPassword"
        body="Body.ResetPassword"
        size="sm"
        class="mb-card"
      />
      <FormResetPassword />
    </section>
  </section>
</template>

<script>
definePageMeta({
  layout: "inner",
});

export default {
  head: {
    title: "Reset Password",
  },
  setup() {
    return {};
  },
};
</script>

<style scoped></style>
