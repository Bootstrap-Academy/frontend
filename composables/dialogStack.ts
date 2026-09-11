import type { InjectionKey } from "vue";

export const dialogParentKey: InjectionKey<string> = Symbol("dialogParent");

// Per-app state: visual order and focus order must agree even for dialogs that
// are siblings in the Vue tree (pending ratings, gates and global confirmations).
// Higher-priority gates stay above ordinary dialogs; equal priorities open in order.
export const useDialogStack = () =>
  useState<{ id: string; parentId: string | null; priority: number }[]>("dialogStack", () => []);
