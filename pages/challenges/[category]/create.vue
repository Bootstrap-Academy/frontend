<template>
  <section
    class="container-fluid pt-container pb-container h-screen-inner min grid place-items-center"
  >
    <section class="container-form max-w-3xl">
      <SectionTitle
        center
        heading="Headings.CreateChallenge"
        size="sm"
        class="mb-card mx-auto"
      />
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
