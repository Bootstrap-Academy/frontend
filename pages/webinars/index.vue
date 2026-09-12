<template>
  <div />
</template>

<script setup lang="ts">
// Keep old bookmarks useful after events are removed from the learning offer.
definePageMeta({
  middleware: () => navigateTo("/profile/courses", { replace: true }),
});
</script>
