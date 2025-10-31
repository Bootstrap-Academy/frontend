<template>
  <section
    class="h-screen-inner min container-fluid grid place-items-center pt-container pb-container"
  >
    <section class="container-form max-w-3xl">
      <SectionTitle center heading="Headings.CreateChallenge" size="sm" class="mx-auto mb-card" />
      <FormChallenge />
    </section>
  </section>
</template>

<script lang="ts">
definePageMeta({
  layout: "inner",
  middleware: ["auth"],
});

export default {
  head: {
    title: "Create Challenge",
  },
  setup() {
    onMounted(() => {
      console.log("in create page");
    });
    return {};
  },
};
</script>

<style scoped></style>
