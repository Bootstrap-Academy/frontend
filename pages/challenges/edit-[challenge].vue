<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: (to) =>
    navigateTo(
      {
        path: "/challenges/all",
        query: {
          category: typeof to.query.category === "string" ? to.query.category : "",
          challenge: String(to.params.challenge || ""),
        },
      },
      { replace: true }
    ),
});
</script>
