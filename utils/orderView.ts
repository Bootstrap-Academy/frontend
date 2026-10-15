type Viewport = { innerHeight: number; scrollY: number };

/**
 * The coin order page scrolls inside its own `main`, and while the notice about privacy
 * stands above the page the window scrolls as well. On a phone, or with that notice, the
 * order button lies below the first screen. Once the offer stands, this brings the order
 * summary to the top of the window, moving both levels, so that the price, the
 * declarations and the order button are in view without the buyer scrolling. A page whose
 * order button is in view anyway keeps its heading, and a page the buyer has scrolled on
 * either level stays where it is. Returns whether it scrolled.
 */
export function showOrderSummary(
  area: HTMLElement | null,
  summary: HTMLElement | null,
  view: Viewport = window
): boolean {
  if (!area || !summary || area.scrollTop > 0 || view.scrollY > 0) return false;
  const end = summary.querySelector<HTMLElement>("[data-order-actions]") ?? summary;
  if (end.getBoundingClientRect().bottom <= view.innerHeight) return false;
  summary.scrollIntoView({ block: "start", behavior: "instant" });
  return true;
}
