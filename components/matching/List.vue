<template>
  <div class="w-full px-1">
    <MatchingCard
      v-for="(matching, i) of matchings"
      :key="i"
      :data="matching"
      class="my-3"
    />
  </div>
</template>

<script lang="ts" setup>

const props = defineProps({
  quizId: { type: String, default: "" },
});
const matchings = useMatchings();

</script>

<style scoped></style>
