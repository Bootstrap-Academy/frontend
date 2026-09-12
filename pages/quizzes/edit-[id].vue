<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: () => navigateTo("/skill-tree", { replace: true }),
});
</script>
