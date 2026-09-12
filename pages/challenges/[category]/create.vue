<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: (to) =>
    navigateTo(
      { path: "/challenges/all", query: { category: String(to.params.category || "") } },
      { replace: true }
    ),
});
</script>
