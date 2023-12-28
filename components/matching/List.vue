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
import { getMatchingsInTask } from "~~/composables/matching";

const props = defineProps({
  quizId: { type: String, default: "" },
});
const matchings: any = ref([]);
onMounted(async () => {
  const [success, error] = await getMatchingsInTask(props?.quizId);
  if (success) matchings.value = success ?? [];
});
watch(
  () => props.quizId,
  async () => {
    const [success, error] = await getMatchingsInTask(props?.quizId);
    if (success) matchings.value = success ?? [];
  }
);
</script>

<style scoped></style>
