<!--
  A way to the learning journey inside text that stands anyway, like the line above the
  title of the character page: a link with an arrow where skills-ms offers learning paths,
  the plain text where it does not.
-->
<template>
  <NuxtLink v-if="available" to="/path"><slot /><ArrowRightIcon aria-hidden="true" /></NuxtLink>
  <p v-else><slot /></p>
</template>

<script setup lang="ts">
import { ArrowRightIcon } from "@heroicons/vue/24/outline";
import { useLearningPathsAvailable } from "~/composables/learningPlan";

const available = useLearningPathsAvailable();
</script>

<style scoped>
a {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
}
svg {
  width: 1.15em;
  height: 1.15em;
  flex-shrink: 0;
}
</style>
