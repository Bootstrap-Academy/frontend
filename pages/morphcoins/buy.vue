<template>
  <main class="container mt-main mb-main">
    <section class="container-form mx-auto max-w-3xl">
      <FormBuyCoins />
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
