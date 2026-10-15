/**
 * The coin order page scrolls inside its own `main`. On a phone its heading and the
 * profile block push the order summary below the first screen. Once the offer stands,
 * this brings the summary up to the top of the scrolling area, so that the price, the
 * declarations and the order button are in view without the buyer scrolling. An area
 * the buyer has already scrolled stays where it is, and so does one that shows the
 * whole summary anyway. Returns whether it scrolled.
 */
export function showOrderSummary(area: HTMLElement | null, summary: HTMLElement | null): boolean {
  if (!area || !summary || area.scrollTop > 0) return false;
  const view = area.getBoundingClientRect();
  const box = summary.getBoundingClientRect();
  if (box.bottom <= view.bottom) return false;
  area.scrollTo({ top: box.top - view.top, behavior: "instant" });
  return true;
}
