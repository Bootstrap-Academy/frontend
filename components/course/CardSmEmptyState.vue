<template>
  <div class="hide-scrollbar flex snap-x snap-mandatory overflow-x-scroll gap-card-sm">
    <CourseCardSmSkeleton class="child opacity-60" no-animate />
    <CourseCardSmSkeleton class="child opacity-40" no-animate />
    <CourseCardSmSkeleton class="child opacity-20" no-animate />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    return {};
  },
});
</script>

<style scoped>
.child {
  @apply h-[175px] w-[250px] flex-shrink-0 snap-center;
}
</style>
