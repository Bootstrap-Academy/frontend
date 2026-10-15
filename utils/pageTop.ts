/**
 * After a change of page the window goes back to the top once the new page has settled
 * (450 ms, `middleware/route.global.ts`). A page that brings its own content into view in
 * that time cancels the pending move, so that it is not undone (the coin order page).
 */
let pending: ReturnType<typeof setTimeout> | null = null;

export function schedulePageTop(delay = 450): void {
  cancelPageTop();
  pending = setTimeout(() => {
    pending = null;
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, delay);
}

/** Whether the move to the top is still to come: the window still stands where the previous page left it. */
export function pageTopPending(): boolean {
  return pending !== null;
}

/** Cancels a pending move to the top and says whether there was one. */
export function cancelPageTop(): boolean {
  if (pending === null) return false;
  clearTimeout(pending);
  pending = null;
  return true;
}
