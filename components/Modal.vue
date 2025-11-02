<!-- Modal.vue is the centre for accessibility of modal dialogs (invisible container for ARIA attributes and keyboard control). -->
<template>
  <section
    class="pb-container fixed z-50 left-0 top-0 w-screen h-screen overflow-hidden bg-[#0b192edd]"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="labelId"
    :aria-describedby="descriptionId ?? undefined"
    @click.self="$emit('backdrop', true)"
  >
    <Language class="h-[33px]" />
    <div
      ref="panel"
      class="modal-content container-fluid pt-card pb-card grid place-items-center"
      tabindex="-1"
    >
      <slot />
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import Language from '@/components/Language.vue';
import { useFocusTrap } from '../composables/useFocusTrap';

export default defineComponent({
// Component can emit two events:
// - 'backdrop': When user clicks on the backdrop.
// - 'close': When user presses the Escape key.	
  emit: ['backdrop', 'close'],
  props: {
    // `labelId` links the dialog to its title for screen readers.
    labelId: {
	  type: String,
	  required: true,
    },
    // `descriptionId` links the dialog to a longer description and is optional.
    descriptionId: {
	  type: String,
	  required: false,
	  default: null,
    },
  },
  setup(props, { emit }) {
    // reference to main dialog content div.
    const panel = ref<HTMLElement | null>(null);
    const { trapFocus, untrapFocus } = useFocusTrap(panel);

    // Composable handles the focus trap logic.
    // ref is passed to it so it can work with the correct element.

    // This function handles the Escape key press.
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        emit('close');
      }
    };

    onMounted(() => {
      // When the modal is mounted, focus is set to it. => Crucial for keyboard users and screen readers.
      if (panel.value) {
        panel.value.focus();
      }
      // Event listeners handle the Escape key and trap the focus.
      document.addEventListener('keydown', handleEscape);
      trapFocus();
      // Prevents the body from scrolling.
      document.body.style.overflow = 'hidden';
    });

    onBeforeUnmount(() => {
      // When modal is removed, event listeners get cleaned up and the body's scrollability is restored.
      document.removeEventListener('keydown', handleEscape);
      untrapFocus();
      document.body.style.overflow = '';
    });

    // Returns the `panel` ref so the template can bind to it.
    return { emit, panel };
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
