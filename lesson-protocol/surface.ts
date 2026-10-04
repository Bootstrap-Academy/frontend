import type { JsonObject } from "./types";

export type Insets = { top: number; right: number; bottom: number; left: number };
export type Rect = { x: number; y: number; width: number; height: number };
export interface Surface extends JsonObject {
  revision: number;
  css: { width: number; height: number };
  scale: number;
  offset: { x: number; y: number };
  safeRect: Rect;
  occlusions: Rect[];
  edgeExclusions: Insets;
  dpr: number;
  reducedMotion: boolean;
  displayMode: string;
  visualScale: number;
}
export const stageSize = (orientation: string) =>
  orientation === "landscape" ? { width: 640, height: 360 } : { width: 360, height: 640 };

/** Inputs are the frame's content box, after the host has reserved its toolbar/insets. */
export function calculateSurface(input: {
  width: number;
  height: number;
  orientation: string;
  revision?: number;
  margin?: number;
  edges?: Insets;
  occlusions?: Rect[];
  dpr?: number;
  reducedMotion?: boolean;
  displayMode?: string;
  visualScale?: number;
}): Surface {
  const width = Math.max(1, input.width);
  const height = Math.max(1, input.height);
  const stage = stageSize(input.orientation);
  const scale = Math.min(width / stage.width, height / stage.height);
  const offset = { x: (width - stage.width * scale) / 2, y: (height - stage.height * scale) / 2 };
  const edges = input.edges ?? { top: 24, right: 24, bottom: 24, left: 24 };
  const margin = Math.min(32, Math.max(16, input.margin ?? 24));
  let left = Math.max(margin, (edges.left - offset.x) / scale);
  let top = Math.max(margin, (edges.top - offset.y) / scale);
  let right = Math.min(stage.width - margin, (width - edges.right - offset.x) / scale);
  let bottom = Math.min(stage.height - margin, (height - edges.bottom - offset.y) / scale);
  // Edge occlusions shrink the safe rectangle; interior occlusions remain explicit holes.
  for (const rect of input.occlusions ?? []) {
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (rect.width >= width) {
      if (rect.y <= 0) top = Math.max(top, (rect.y + rect.height - offset.y) / scale);
      if (rect.y + rect.height >= height) bottom = Math.min(bottom, (rect.y - offset.y) / scale);
    }
    if (rect.height >= height) {
      if (rect.x <= 0) left = Math.max(left, (rect.x + rect.width - offset.x) / scale);
      if (rect.x + rect.width >= width) right = Math.min(right, (rect.x - offset.x) / scale);
    }
  }
  left = Math.min(stage.width, Math.max(0, left));
  top = Math.min(stage.height, Math.max(0, top));
  right = Math.max(left, right);
  bottom = Math.max(top, bottom);
  return {
    revision: input.revision ?? 0,
    css: { width, height },
    scale,
    offset,
    safeRect: { x: left, y: top, width: right - left, height: bottom - top },
    occlusions: input.occlusions ?? [],
    edgeExclusions: edges,
    dpr: input.dpr ?? 1,
    reducedMotion: input.reducedMotion ?? false,
    displayMode: input.displayMode ?? "page",
    visualScale: input.visualScale ?? 1,
  };
}

export function stagePoint(
  surface: Surface,
  client: { x: number; y: number },
  frame: { left: number; top: number }
) {
  return {
    x: (client.x - frame.left - surface.offset.x) / surface.scale,
    y: (client.y - frame.top - surface.offset.y) / surface.scale,
  };
}
export const minimumHitSize = (surface: Surface) => 44 / surface.scale;
