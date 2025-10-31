<template>
  <Transition name="fade-in">
    <div
      v-if="loading"
      class="pointer-events-none fixed left-0 top-0 z-[9999999] h-screen w-screen bg-[#0b192edd]"
    >
      <div class="loader h-2 w-full"></div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    const loading = useLoading();

    return { loading };
  },
});
</script>

<style scoped>
.loader {
  background: repeating-linear-gradient(to right, #00dc82 0%, #34cdfe 50%, #0047e1 100%);
  background-size: 1000% 1000%;
  animation: gradient 2s ease-out infinite;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  25% {
    background-position: 25% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  75% {
    background-position: 25% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
