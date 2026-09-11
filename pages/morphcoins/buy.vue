<template>
  <main class="mt-main mb-main container">
    <section class="container-form mx-auto max-w-3xl">
      <PaypalCheckoutStatus v-if="checkout || error" />
      <FormBuyCoins v-else />
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
    const { checkout, error } = usePaypalCheckout();
    return { checkout, error };
  },
};
</script>

<style scoped></style>
