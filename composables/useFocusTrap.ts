// src/composables/useFocusTrap.ts

import { ref, onMounted, onBeforeUnmount } from 'vue';

// The function takes a reference to the element it should trap the focus within.
export function useFocusTrap(panelRef: any) {
  const isEnabled = ref(false);

  // Selector finds all focusable elements within the component.
  const focusableSelectors = 'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';

  const getFocusableElements = (): HTMLElement[] => {  
    if (!panelRef.value) {
      return [];
    }

    // Get nodeList from query selector
    const nodeList = panelRef.value.querySelectorAll(focusableSelectors) as NodeListOf<HTMLElement>;
    
    // Convert nodeList into Array.
    const focusableEls = Array.from(nodeList);

    // Filters out disabled or hidden elements.
    return focusableEls.filter(el =>
      !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
    );
  };

  const handleFocus = (event: KeyboardEvent) => {
    // Only handle keyboard events if the focus trap is active.
    if (!isEnabled.value) return;

    const focusableEls = getFocusableElements();
    if (focusableEls.length === 0) return;

    const firstEl: HTMLElement = focusableEls[0];
    const lastEl: HTMLElement = focusableEls[focusableEls.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) { // Handle reverse tabbing (Shift + Tab)
        if (document.activeElement === firstEl) {
          lastEl.focus();
          event.preventDefault(); // Prevents the focus from leaving the modal.
        }
      } else { // Handle forward tabbing (Tab)
        if (document.activeElement === lastEl) {
          firstEl.focus();
          event.preventDefault(); // Prevents the focus from leaving the modal.
        }
      }
    }
  };

  const trapFocus = () => {
    if (isEnabled.value) return;
    document.addEventListener('keydown', handleFocus);
    isEnabled.value = true;
  };

  const untrapFocus = () => {
    if (!isEnabled.value) return;
    document.removeEventListener('keydown', handleFocus);
    isEnabled.value = false;
  };

  onMounted(() => {
    // We could set the focus here, but we do it in Modal.vue to be explicit.
    trapFocus();
  });

  onBeforeUnmount(() => {
    untrapFocus();
  });

  return { trapFocus, untrapFocus };
}