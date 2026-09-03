import type { Ref } from "vue";

/**
 * Keeps the keyboard inside a modal for as long as it is on screen.
 *
 * A dialog that carries `aria-modal="true"` tells assistive technology that
 * everything behind it is unreachable. Without this the promise is only half
 * true: the tab order still walks through the page underneath, so a keyboard
 * user reaches the navigation and the buttons the dialog is covering.
 *
 * The trap moves the focus into the dialog when it opens, cycles `Tab` and
 * `Shift+Tab` at its two ends, pulls the focus back if it escaped, and returns
 * it to the element that was focused before when the dialog closes. It only
 * acts at the ends of the ring, so anything inside that handles `Tab` itself -
 * a code editor, for example - keeps working; a `Tab` another handler has
 * already dealt with is left alone.
 */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getClientRects().length > 0
  );
}

export function useFocusTrap(container: Ref<HTMLElement | null>, active: Ref<boolean>) {
  let previous: HTMLElement | null = null;
  let listening = false;
  let moved = false;

  function onkeydown(event: KeyboardEvent) {
    if (event.key !== "Tab" || event.defaultPrevented) return;

    const element = container.value;
    if (!!!element) return;

    const elements = focusable(element);
    if (!elements.length) {
      event.preventDefault();
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    const current = document.activeElement as HTMLElement | null;

    if (!!!current || !element.contains(current)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }

    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function release() {
    if (!!!listening) return;
    listening = false;
    moved = false;
    document.removeEventListener("keydown", onkeydown);
    previous?.focus?.();
    previous = null;
  }

  // The element is watched along with the flag: the dialog is often already
  // open when the component first renders, so the element appears only after
  // the layout around it has been resolved.
  watch(
    [active, container] as const,
    ([open, element]) => {
      if (!!!open) return release();

      if (!!!listening) {
        listening = true;
        previous = (document.activeElement as HTMLElement | null) ?? null;
        document.addEventListener("keydown", onkeydown);
      }

      if (!!!element || moved) return;
      moved = true;

      const [target] = focusable(element);
      if (target) {
        target.focus();
      } else {
        element.setAttribute("tabindex", "-1");
        element.focus();
      }
    },
    { immediate: true, flush: "post" }
  );

  onUnmounted(() => document.removeEventListener("keydown", onkeydown));
}
