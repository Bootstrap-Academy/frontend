import type { Component } from "vue";

/** Keep only renderer identifiers here. Lesson code and data are resolved on demand. */
const renderers: Record<string, () => Promise<{ default: Component }>> = {
  "loop-explorer": () => import("./LoopExplorer.vue"),
  "guided-lesson": () => import("./GuidedLesson.vue"),
  "io-machine": () => import("./ItLabRoom.vue"),
  "bit-lab": () => import("./ItLabRoom.vue"),
  "file-workspace": () => import("./ItLabRoom.vue"),
  "step-machine": () => import("./ItLabRoom.vue"),
  "network-lab": () => import("./ItLabRoom.vue"),
  exercise: () => import("./ExerciseRoom.vue"),
  "legacy-video": () => import("../course/Video.vue"),
  video: () => import("./VideoActivity.vue"),
  "protocol-v2": () => import("./ProtocolActivity.vue"),
  custom: () => import("./CustomActivity.vue"),
};

export async function loadActivityRenderer(renderer: string) {
  const load = Object.hasOwn(renderers, renderer) ? renderers[renderer] : undefined;
  if (!load) throw new Error("Unknown learning activity renderer");
  return (await load()).default;
}
