import type { LessonSDK } from "./sdk";
import type { Surface } from "./surface";
import { minimumHitSize, stageSize } from "./surface";

type Point = { id: number; x: number; y: number };
type Policy = { epoch: number; swipe: { forward: boolean; back: boolean } };
type Candidate = Point & {
  owner: "scene" | "navigation";
  epoch: number;
  invalid: boolean;
  announced: boolean;
};
type GestureSDK = Pick<LessonSDK, "gesture" | "pointer" | "navigationPolicy" | "phase">;

/** Ownership and epoch are frozen at begin. A policy update never steals a drag. */
export class LessonPointers {
  private pointers = new Map<number, Candidate>();
  constructor(
    private sdk: GestureSDK,
    private failure: (error: unknown) => void = () => {}
  ) {}
  begin(point: Point, options: { scene: boolean; blocked: boolean; edge: boolean }) {
    const policy: Policy = this.sdk.navigationPolicy;
    const owner =
      options.scene ||
      options.blocked ||
      options.edge ||
      !(policy.swipe.forward || policy.swipe.back)
        ? "scene"
        : "navigation";
    const candidate: Candidate = {
      ...point,
      owner,
      epoch: policy.epoch,
      invalid: options.blocked || options.edge || this.sdk.phase !== "running",
      announced: !options.edge && this.sdk.phase === "running",
    };
    this.pointers.set(point.id, candidate);
    if (candidate.announced) this.sdk.pointer(point.id, owner, "begin", policy.epoch);
    if (this.pointers.size > 1) this.invalidate();
    return owner;
  }
  invalidate() {
    for (const pointer of this.pointers.values()) pointer.invalid = true;
  }
  async end(point: Point, cancelled = false, blocked = false) {
    const start = this.pointers.get(point.id);
    if (!start) return;
    this.pointers.delete(point.id);
    if (start.announced && this.sdk.phase === "running")
      this.sdk.pointer(
        point.id,
        start.owner,
        cancelled || start.invalid || blocked ? "cancel" : "end",
        start.epoch
      );
    const distanceCss = point.y - start.y,
      crossDistanceCss = point.x - start.x;
    if (
      cancelled ||
      blocked ||
      start.invalid ||
      start.owner !== "navigation" ||
      this.sdk.phase !== "running" ||
      start.epoch !== this.sdk.navigationPolicy.epoch ||
      Math.abs(distanceCss) < 64 ||
      Math.abs(distanceCss) < 1.5 * Math.abs(crossDistanceCss)
    )
      return;
    const direction = distanceCss < 0 ? "next" : "previous";
    if (!this.sdk.navigationPolicy.swipe[direction === "next" ? "forward" : "back"]) return;
    try {
      await this.sdk.gesture({
        direction,
        epoch: start.epoch,
        distanceCss,
        crossDistanceCss,
        owner: start.owner,
        completed: true,
      });
    } catch (error) {
      this.failure(error);
    }
  }
  cancel() {
    for (const point of [...this.pointers.values()]) void this.end(point, true);
  }
}

const editable = (target: Element | null) =>
  !!target?.closest("input,textarea,select,[contenteditable]:not([contenteditable='false'])");

/** Call after init and before ready. Mark navigation background and scene handles explicitly. */
export function bindLessonPointers(
  sdk: LessonSDK,
  root: HTMLElement,
  onError?: (error: unknown) => void
) {
  const doc = root.ownerDocument,
    win = doc.defaultView!;
  const pointers = new LessonPointers(sdk, onError);
  const blocked = () =>
    editable(doc.activeElement) ||
    !!doc.getSelection()?.toString() ||
    (win.visualViewport?.scale ?? 1) > 1.01 ||
    Number(sdk.context?.surface.visualScale ?? 1) > 1.01;
  const point = (event: PointerEvent) => ({
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  });
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || sdk.phase !== "running") return;
    const target = event.target instanceof win.Element ? (event.target as Element) : null;
    const rect = root.getBoundingClientRect();
    const edges = sdk.context?.surface.edgeExclusions as Surface["edgeExclusions"] | undefined;
    const edge =
      event.clientX - rect.left < (edges?.left ?? 24) ||
      rect.right - event.clientX < (edges?.right ?? 24) ||
      event.clientY - rect.top < (edges?.top ?? 24) ||
      rect.bottom - event.clientY < (edges?.bottom ?? 24);
    const navigation = !!target?.closest("[data-lesson-navigation]") && root.contains(target);
    const scene =
      !navigation ||
      !!target?.closest(
        "[data-lesson-scene],button,a,input,textarea,select,[role='button'],[contenteditable]"
      );
    const owner = pointers.begin(point(event), { scene, blocked: blocked(), edge });
    if (owner === "navigation") {
      try {
        root.setPointerCapture(event.pointerId);
      } catch {
        pointers.invalidate();
      }
    }
  };
  const up = (event: PointerEvent) => {
    void pointers.end(point(event), false, blocked());
  };
  const cancel = (event: PointerEvent) => {
    void pointers.end(point(event), true);
  };
  const invalidate = () => pointers.invalidate();
  const reset = () => pointers.cancel();
  // Predeclare touch-action. Other targets retain native scrolling, text selection and zoom.
  const navigationAreas = [...root.querySelectorAll<HTMLElement>("[data-lesson-navigation]")];
  if (root.matches("[data-lesson-navigation]")) navigationAreas.push(root);
  const styles = navigationAreas.map((element) => ({ element, value: element.style.touchAction }));
  for (const { element } of styles) element.style.touchAction = "pan-x pinch-zoom";
  win.addEventListener("pointerdown", down, true);
  win.addEventListener("pointerup", up, true);
  win.addEventListener("pointercancel", cancel, true);
  root.addEventListener("lostpointercapture", cancel);
  win.addEventListener("blur", reset);
  doc.addEventListener("selectionchange", invalidate);
  doc.addEventListener("focusin", invalidate);
  win.visualViewport?.addEventListener("resize", invalidate);
  const unlisten = sdk.on("host.lifecycle", (payload) => {
    if (payload.phase !== "running") reset();
  });
  const unsurface = sdk.on("host.surface", invalidate);
  let closed = false;
  const dispose = () => {
    if (closed) return;
    closed = true;
    reset();
    unlisten();
    unsurface();
    win.removeEventListener("pointerdown", down, true);
    win.removeEventListener("pointerup", up, true);
    win.removeEventListener("pointercancel", cancel, true);
    root.removeEventListener("lostpointercapture", cancel);
    win.removeEventListener("blur", reset);
    doc.removeEventListener("selectionchange", invalidate);
    doc.removeEventListener("focusin", invalidate);
    win.visualViewport?.removeEventListener("resize", invalidate);
    for (const { element, value } of styles) element.style.touchAction = value;
  };
  sdk.onDispose(dispose);
  return dispose;
}

/** Logical drawing can scale; its semantic companion remains in CSS pixels and can reflow. */
export function bindLessonStage(sdk: LessonSDK, stage: HTMLElement) {
  const size = stageSize(sdk.manifest.stage.orientation);
  const previous = stage.getAttribute("style");
  const apply = () => {
    const surface = sdk.context?.surface as Surface | undefined;
    if (!surface) return;
    Object.assign(stage.style, {
      position: "absolute",
      width: `${size.width}px`,
      height: `${size.height}px`,
      transformOrigin: "0 0",
      transform: `translate(${surface.offset.x}px,${surface.offset.y}px) scale(${surface.scale})`,
    });
    stage.style.setProperty("--lesson-hit-size", `${minimumHitSize(surface)}px`);
    stage.dataset.reducedMotion = String(surface.reducedMotion);
    stage.dataset.compact = String(surface.scale < 0.6);
  };
  const unsubscribe = sdk.on("host.surface", apply);
  apply();
  const dispose = () => {
    unsubscribe();
    if (previous === null) stage.removeAttribute("style");
    else stage.setAttribute("style", previous);
  };
  sdk.onDispose(dispose);
  return dispose;
}

/** Handles scene keys only at its own focus target. Tab and text fields retain browser behavior. */
export function bindSceneKeyboard(
  element: HTMLElement,
  actions: {
    move(x: number, y: number): void;
    activate(): void;
    cancel(): boolean;
  }
) {
  const listener = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.target !== element ||
      editable(element) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const movement = delta[event.key];
    if (movement) actions.move(...movement);
    else if (event.key === "Enter" || event.key === " ") actions.activate();
    else if (event.key === "Escape") {
      if (!actions.cancel()) return;
    } else return;
    event.preventDefault();
  };
  element.addEventListener("keydown", listener);
  return () => element.removeEventListener("keydown", listener);
}
