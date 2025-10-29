<template>
  <main class="mt-main mb-main container">
    <section class="container-form mx-auto max-w-3xl">
      <FormBuyHearts />
    </section>
  </main>
</template>

<script lang="ts">
definePageMeta({
  middleware: ["auth"],
});

export default {
  head: {
    title: "Buy Morphcoins",
  },
  setup() {
    return {};
  },
};
</script>

<style scoped></style>
