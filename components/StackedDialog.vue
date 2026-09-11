<template>
  <HeadlessDialog
    static
    :open="activeBranch"
    :initial-focus="initialFocus"
    :data-dialog-stack-id="id"
    :inert="!topmost"
    :aria-hidden="topmost ? undefined : true"
    :style="{ zIndex, pointerEvents: open ? undefined : 'none' }"
    @close="topmost && emit('close')"
  >
    <slot />
  </HeadlessDialog>
</template>

<script setup lang="ts">
import { Dialog as HeadlessDialog } from "@headlessui/vue";
import type { PropType } from "vue";
import { dialogParentKey } from "~/composables/dialogStack";

const props = defineProps({
  open: { type: Boolean, default: true },
  initialFocus: { type: Object as PropType<HTMLElement | null>, default: null },
  priority: { type: Number, default: 0 },
});
const emit = defineEmits(["close"]);
const id = useId();
const parentId = inject(dialogParentKey, null);
provide(dialogParentKey, id);
const stack = useDialogStack();
const position = computed(() => stack.value.findIndex((entry) => entry.id === id));
const zIndex = computed(
  () =>
    50 +
    (stack.value[position.value]?.priority ?? props.priority) * 50 +
    Math.max(0, position.value)
);
const topmost = computed(() => stack.value.at(-1)?.id === id);
// Headless UI still needs open ancestors to manage nested portals, page inertness
// and scroll locking. Independent siblings must relinquish their focus traps.
const activeBranch = computed(() => {
  let entry = stack.value.at(-1);
  while (entry) {
    if (entry.id === id) return true;
    entry = stack.value.find((candidate) => candidate.id === entry?.parentId);
  }
  return false;
});
let opener: HTMLElement | null = null;

async function unregister() {
  const restore = topmost.value;
  stack.value = stack.value.filter((entry) => entry.id !== id);
  if (!restore) return;
  // Wait for the remaining dialog (or page) to stop being inert. In particular,
  // never restore to a page opener while another sibling still covers the page.
  await nextTick();
  const remaining = stack.value.at(-1)?.id;
  const owner = opener?.closest("[data-dialog-stack-id]")?.getAttribute("data-dialog-stack-id");
  if (
    opener?.isConnected &&
    opener !== document.body &&
    !opener.closest("[inert]") &&
    (!remaining || owner === remaining)
  ) {
    opener.focus({ preventScroll: true });
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      opener = import.meta.client ? (document.activeElement as HTMLElement | null) : null;
      // Gates keep their existing precedence even when an ordinary dialog
      // arrives later. Nested dialogs inherit their parent's priority.
      const priority = Math.max(
        props.priority,
        stack.value.find((entry) => entry.id === parentId)?.priority ?? 0
      );
      stack.value = [...stack.value, { id, parentId, priority }].sort(
        (a, b) => a.priority - b.priority
      );
    } else {
      unregister();
    }
  },
  { immediate: true, flush: "sync" }
);
onBeforeUnmount(unregister);
</script>
