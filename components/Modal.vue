<template>
  <StackedDialog
    :initial-focus="content"
    class="fixed inset-x-0 top-0 z-50 h-screen overflow-hidden bg-[#0b192edd] pb-[env(safe-area-inset-bottom)] supports-[height:100dvh]:h-dvh"
    @close="emit('backdrop', true)"
  >
    <DialogPanel class="flex h-full flex-col">
      <Language class="h-[33px] shrink-0" />
      <div
        ref="content"
        tabindex="-1"
        class="modal-content min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-wrap:anywhere] focus:outline-none"
      >
        <div
          class="modal-layout container-fluid grid min-h-full grid-cols-1 place-items-center pt-card pb-card"
          @click.self="emit('backdrop', true)"
        >
          <slot></slot>
        </div>
      </div>
    </DialogPanel>
  </StackedDialog>
</template>

<script setup lang="ts">
import { DialogPanel } from "@headlessui/vue";

const emit = defineEmits(["backdrop"]);
// Start at the top of long information, before tabbing through its controls.
const content = ref<HTMLElement | null>(null);
</script>

<style scoped>
.modal-layout {
  animation: modalContent 0.75s ease-out forwards;
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

@media (prefers-reduced-motion: reduce) {
  .modal-layout {
    animation: none;
  }
}
</style>
