<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: () => navigateTo("/morphcoins/buy", { replace: true }),
});
</script>
