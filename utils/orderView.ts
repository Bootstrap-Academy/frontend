import { cancelPageTop, pageTopPending } from "./pageTop";

type Viewport = { innerHeight: number; scrollY: number };
type PageTop = { pending: () => boolean; cancel: () => boolean };

/**
 * The coin order page scrolls inside its own `main`, and while the notice about privacy
 * stands above the page the window scrolls as well. On a phone, or with that notice, the
 * order button lies below the first screen. Once the offer stands, this brings the order
 * summary to the top of the window, moving both levels, so that the price, the
 * declarations and the order button are in view without the buyer scrolling. A page whose
 * order button is in view anyway keeps its heading, and a page the buyer has scrolled on
 * either level stays where it is. Returns whether it scrolled.
 *
 * Right after a change of page the window still stands where the previous page left it,
 * and the move to the top is pending (`utils/pageTop.ts`). That position is not the
 * buyer's; the button is judged where it will stand at the top, and when the page scrolls
 * itself it cancels the pending move, which would undo it.
 */
export function showOrderSummary(
  area: HTMLElement | null,
  summary: HTMLElement | null,
  view: Viewport = window,
  pageTop: PageTop = { pending: pageTopPending, cancel: cancelPageTop }
): boolean {
  if (!area || !summary || area.scrollTop > 0) return false;
  const changing = pageTop.pending();
  if (view.scrollY > 0 && !changing) return false;
  const end = summary.querySelector<HTMLElement>("[data-order-actions]") ?? summary;
  const bottom = end.getBoundingClientRect().bottom + (changing ? view.scrollY : 0);
  if (bottom <= view.innerHeight) return false;
  pageTop.cancel();
  summary.scrollIntoView({ block: "start", behavior: "instant" });
  return true;
}
