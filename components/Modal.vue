<template>
  <section
    class="fixed left-0 top-0 z-50 h-screen w-screen overflow-hidden bg-[#0b192edd] pb-container"
  >
    <Language class="h-[33px]" />

    <div
      class="modal-content container-fluid grid place-items-center pt-card pb-card"
      @click.self="emit('backdrop', true)"
    >
      <slot></slot>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  emit: ["backdrop"],
  setup(props, { emit }) {
    return { emit };
  },
});
</script>

<style scoped>
.modal-content {
  animation: modalContent 0.75s ease-out forwards;
  height: calc(100vh - 33px);
}

@keyframes modalContent {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
