<template>
  <article
    class="relative flex min-h-[175px] min-w-[175px] items-end overflow-clip rounded-lg bg-secondary shadow-lg md:min-w-[150px]"
  >
    <div class="relative h-fit w-full p-4">
      <SkeletonText :noAnimate="noAnimate" lg class="max-w-[70%]" />
      <SkeletonText :noAnimate="noAnimate" body class="mt-3" />
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: { noAnimate: { type: Boolean, default: false } },
  setup() {
    return {};
  },
});
</script>

<style scoped></style>
