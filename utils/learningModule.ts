import type {
  LearningModuleContext,
  LearningModuleAssessmentActions,
  LearningModuleData,
  LearningModuleDescriptor,
  LearningModuleExports,
  LearningModuleHost,
  LearningModuleInstance,
} from "~/types/learningModule";

export type LearningModuleStatus = "loading" | "ready" | "error" | "disposed";

const snapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function dataSnapshot(value: LearningModuleData): LearningModuleData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Module data must be an object");
  }
  return snapshot(value);
}

/** Registry descriptors are server-issued. Never accept a URL from route/query input. */
export function learningModuleUrl(descriptor: LearningModuleDescriptor, origin: string): string {
  if (descriptor.api_version !== 1 || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(descriptor.id)) {
    throw new Error("Unsupported learning module");
  }
  const url = new URL(descriptor.entry_url);
  const local = new URL(origin);
  const development =
    url.protocol === "http:" &&
    url.origin === local.origin &&
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !development) || url.username || url.password || url.hash) {
    throw new Error("Invalid learning module URL");
  }
  return url.href;
}

/** One mounted activity. Imported code is cached by the browser; instances are always disposed. */
export function createLearningModuleSession(options: {
  descriptor: LearningModuleDescriptor;
  element: HTMLElement;
  origin: string;
  context: LearningModuleContext;
  change: (state: LearningModuleData) => void;
  save: () => Promise<boolean>;
  complete: (answer: LearningModuleData) => void;
  assessment?: LearningModuleAssessmentActions;
  busy: (busy: boolean) => void;
  status: (status: LearningModuleStatus) => void;
  load?: (url: string) => Promise<LearningModuleExports>;
}) {
  let context = snapshot(options.context);
  let instance: LearningModuleInstance | undefined;
  let closed = false;
  let started = false;
  // An async old mount can finish after a retry. It must never own the new mount's DOM.
  const surface = options.element.ownerDocument.createElement("div");
  const abort = new AbortController();
  const load = options.load || ((url: string) => import(/* @vite-ignore */ url));

  function cleanup() {
    abort.abort();
    const previous = instance;
    instance = undefined;
    try {
      previous?.dispose();
    } catch {
      // A faulty module must not prevent navigation or cleanup of the shared player.
    } finally {
      surface.remove();
      options.busy(false);
    }
  }

  function fail() {
    if (closed) return;
    closed = true;
    try {
      cleanup();
    } finally {
      options.status("error");
    }
  }

  const host: LearningModuleHost = {
    get context() {
      return snapshot(context);
    },
    signal: abort.signal,
    assessment: options.assessment && {
      async submit(answer) {
        if (closed || context.disabled) return false;
        const submitted = await options.assessment!.submit(snapshot(answer));
        return !closed && submitted;
      },
      async check() {
        if (!closed && !context.disabled) await options.assessment!.check();
      },
      async newAttempt() {
        if (!closed && !context.disabled) await options.assessment!.newAttempt();
      },
    },
    change(state) {
      if (closed || context.disabled) return;
      const next = dataSnapshot(state);
      context = { ...context, state: next };
      options.change(snapshot(next));
    },
    async save() {
      if (closed) return false;
      const saved = await options.save();
      return !closed && saved;
    },
    complete(answer) {
      if (!closed && !context.disabled) options.complete(dataSnapshot(answer));
    },
    setBusy(busy) {
      if (!closed) options.busy(!!busy);
    },
  };

  return {
    async start() {
      if (started || closed) return;
      started = true;
      options.status("loading");
      try {
        const module = await load(learningModuleUrl(options.descriptor, options.origin));
        if (closed) return;
        if (module.apiVersion !== 1 || typeof module.mount !== "function") {
          throw new Error("Incompatible learning module exports");
        }
        options.element.replaceChildren(surface);
        const mounted = await module.mount(surface, host);
        if (closed) {
          mounted?.dispose?.();
          return;
        }
        instance = mounted;
        if (
          !instance ||
          typeof instance.update !== "function" ||
          typeof instance.dispose !== "function"
        ) {
          throw new Error("Invalid learning module instance");
        }
        instance.update(snapshot(context));
        options.status("ready");
      } catch {
        fail();
      }
    },
    update(next: LearningModuleContext) {
      if (closed) return;
      // Identity changes require a new session, never an in-place reassignment of private work.
      if (next.activityId !== context.activityId || next.reviewId !== context.reviewId) {
        this.dispose();
        return;
      }
      context = snapshot(next);
      try {
        instance?.update(snapshot(context));
      } catch {
        fail();
      }
    },
    cancelPreparation() {
      if (closed) return;
      try {
        instance?.cancelPreparation?.();
      } catch {
        fail();
      }
    },
    dispose() {
      if (closed) return;
      closed = true;
      try {
        cleanup();
      } finally {
        options.status("disposed");
      }
    },
  };
}
