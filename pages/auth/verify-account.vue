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
    class="container-fluid pt-container pb-container h-screen-inner min grid place-items-center"
  >
    <Transition mode="out-in" name="slide-up-down">
      <article
        v-if="status == 'success'"
        class="card style-card bg-secondary grid place-items-center max-w-lg"
      >
        <SvgVerifyAccount class="max-h-[30vh]" />

        <SectionTitle
          center
          full
          subheading="Headings.WelcomeTo"
          heading="Headings.BootstrapAcademy"
          body="Success.VerifyAccount"
          class="mt-10 md:mt-14 mb-7 md:mb-10"
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
