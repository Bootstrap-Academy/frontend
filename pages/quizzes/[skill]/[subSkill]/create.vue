<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({
  middleware: (to) => {
    const course = typeof to.query.course === "string" ? to.query.course : "";
    return navigateTo(
      course
        ? `/courses/${encodeURIComponent(course)}`
        : `/skill-tree/${encodeURIComponent(String(to.params.skill || ""))}/${encodeURIComponent(String(to.params.subSkill || ""))}`,
      { replace: true }
    );
  },
});
</script>
