/**
 * The app renders in the browser. When an address with an anchor is opened directly,
 * the section does not exist yet at the moment the browser and the router look for
 * it, and neither looks again. Go there once the first page stands.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter();
  nuxtApp.hooks.hookOnce("page:finish", () => {
    const { hash } = router.currentRoute.value;
    const section = hash ? document.getElementById(hash.slice(1)) : null;
    if (!section) return;
    let top = 0;
    const go = () => {
      section.scrollIntoView({ behavior: "instant" });
      top = section.getBoundingClientRect().top;
    };
    // The footer and the fonts arrive a moment later and move the section once more.
    // Stay with it until the reader moves the page or leaves it.
    const follow = new ResizeObserver(() => (section.isConnected ? go() : stop()));
    const moved = () => {
      if (!section.isConnected || Math.abs(section.getBoundingClientRect().top - top) > 1) stop();
    };
    const stop = () => {
      follow.disconnect();
      window.removeEventListener("scroll", moved);
    };
    go();
    follow.observe(document.body);
    window.addEventListener("scroll", moved, { passive: true });
  });
});
