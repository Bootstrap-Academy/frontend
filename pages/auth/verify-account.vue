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
    <Transition mode="out-in" name="slide-up-down">
      <article
        v-if="status == 'success'"
        class="card grid max-w-lg place-items-center bg-secondary style-card"
      >
        <SvgVerifyAccount class="max-h-[30vh]" />

        <SectionTitle
          center
          full
          subheading="Headings.WelcomeTo"
          heading="Headings.BootstrapAcademy"
          body="Success.VerifyAccount"
          class="mb-7 mt-10 md:mb-10 md:mt-14"
        />

        <NuxtLink to="/profile">
          <Btn>{{ $t("Links.GoToProfile") }}</Btn>
        </NuxtLink>
      </article>

      <section class="container-form" v-else>
        <SectionTitle
          center
          heading="Headings.VerifyAccount"
          body="Body.VerifyAccount"
          size="sm"
          class="mb-card"
        />
        <FormVerifyAccount @status="status = $event" />
      </section>
    </Transition>
  </section>
</template>

<script>
definePageMeta({
  layout: "inner",
});

export default {
  head: {
    title: "Verify Account",
  },
  setup() {
    const status = ref("");

    return { status };
  },
};
</script>

<style scoped></style>
