import { calculateSurface, type Surface } from "./surface";

export type DisplayMode = "page" | "browser-fullscreen" | "standalone";
export function displayMode(element: HTMLElement): DisplayMode {
  const document = element.ownerDocument;
  if (document.fullscreenElement === element) return "browser-fullscreen";
  const win = document.defaultView!;
  if (
    win.matchMedia("(display-mode: standalone)").matches ||
    (win.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
    return "standalone";
  return "page";
}

/** An RPC only requests a host affordance. enter() must be called directly in a host click. */
export class LessonDisplay {
  private win: Window;
  private requested = false;
  private changed = () => this.update();
  private standalone: MediaQueryList;
  private disposed = false;
  constructor(
    private element: HTMLElement,
    private notify: (mode: DisplayMode, offer: boolean) => void
  ) {
    this.win = element.ownerDocument.defaultView!;
    this.standalone = this.win.matchMedia("(display-mode: standalone)");
    element.ownerDocument.addEventListener("fullscreenchange", this.changed);
    this.standalone.addEventListener("change", this.changed);
    this.update();
  }
  get mode() {
    return displayMode(this.element);
  }
  get available() {
    return (
      this.element.ownerDocument.fullscreenEnabled === true &&
      typeof this.element.requestFullscreen === "function"
    );
  }
  private update() {
    if (!this.disposed)
      this.notify(this.mode, this.requested && this.available && this.mode === "page");
  }
  async request(requested: boolean) {
    this.requested = requested;
    if (!requested && this.mode === "browser-fullscreen") {
      try {
        await this.element.ownerDocument.exitFullscreen();
      } catch {
        /* The actual mode is authoritative. */
      }
    }
    this.update();
    return {
      mode: this.mode,
      needsHostGesture: requested && this.available && this.mode === "page",
    };
  }
  enter(): Promise<boolean> {
    if (this.disposed || !this.available || this.mode !== "page") return Promise.resolve(false);
    // Invoke before yielding: MessagePort traffic cannot supply user activation.
    let operation: Promise<void>;
    try {
      operation = this.element.requestFullscreen();
    } catch {
      return Promise.resolve(false);
    }
    return operation
      .then(
        () => this.mode === "browser-fullscreen",
        () => false
      )
      .finally(() => this.update());
  }
  dispose() {
    this.disposed = true;
    this.element.ownerDocument.removeEventListener("fullscreenchange", this.changed);
    this.standalone.removeEventListener("change", this.changed);
    if (this.mode === "browser-fullscreen")
      void this.element.ownerDocument.exitFullscreen().catch(() => {});
  }
}

/** Observe CSS pixels only. Device insets are reserved by the container's CSS once. */
export function observeLessonSurface(
  element: HTMLElement,
  orientation: string,
  mode: () => DisplayMode,
  notify: (surface: Surface) => void,
  margin = 24
) {
  const win = element.ownerDocument.defaultView!;
  const motion = win.matchMedia("(prefers-reduced-motion: reduce)");
  let revision = 0;
  let last = "";
  let scheduled = 0;
  const measure = () => {
    scheduled = 0;
    const box = element.getBoundingClientRect();
    const viewport = win.visualViewport;
    const left = viewport?.offsetLeft ?? 0,
      top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? win.innerWidth,
      height = viewport?.height ?? win.innerHeight;
    const edges = {
      left: 24 + Math.max(0, left - box.left),
      top: 24 + Math.max(0, top - box.top),
      right: 24 + Math.max(0, box.right - left - width),
      bottom: 24 + Math.max(0, box.bottom - top - height),
    };
    const value = calculateSurface({
      width: element.clientWidth,
      height: element.clientHeight,
      orientation,
      margin,
      edges,
      dpr: win.devicePixelRatio,
      reducedMotion: motion.matches,
      displayMode: mode(),
      visualScale: viewport?.scale ?? 1,
    });
    const signature = JSON.stringify(value);
    if (signature === last) return;
    last = signature;
    value.revision = ++revision;
    notify(value);
  };
  const schedule = () => {
    if (!scheduled) scheduled = win.requestAnimationFrame(measure);
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(element);
  win.addEventListener("resize", schedule);
  win.addEventListener("scroll", schedule, { passive: true });
  win.visualViewport?.addEventListener("resize", schedule);
  win.visualViewport?.addEventListener("scroll", schedule);
  motion.addEventListener("change", schedule);
  element.ownerDocument.addEventListener("fullscreenchange", schedule);
  measure();
  return () => {
    observer.disconnect();
    win.cancelAnimationFrame(scheduled);
    win.removeEventListener("resize", schedule);
    win.removeEventListener("scroll", schedule);
    win.visualViewport?.removeEventListener("resize", schedule);
    win.visualViewport?.removeEventListener("scroll", schedule);
    motion.removeEventListener("change", schedule);
    element.ownerDocument.removeEventListener("fullscreenchange", schedule);
  };
}
