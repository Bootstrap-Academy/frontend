<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ["auth", () => navigateTo("/dashboard", { replace: true })],
});
</script>
