<template>
  <article class="box cursor-pointer bg-secondary style-box">
    <SkeletonText :noAnimate="noAnimate" />
    <div class="flex items-center justify-between gap-box">
      <SkeletonText :noAnimate="noAnimate" body sm class="mt-box" />
      <Chip xs color="chip-color-6" class="w-fit text-transparent">Free</Chip>
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: { noAnimate: { type: Boolean, default: false } },
  setup() {},
});
</script>

<style scoped></style>
