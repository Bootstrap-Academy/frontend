import type {
  LearningModuleCapability,
  LearningModuleContext,
  LearningModuleAssessmentActions,
  LearningModuleData,
  LearningModuleDescriptor,
  LearningModuleExports,
  LearningModuleHost,
  LearningModuleInstance,
  LearningModuleLlm,
  LearningModuleProject,
} from "~/types/learningModule";

export type LearningModuleStatus = "loading" | "ready" | "error" | "disposed";

const snapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value));
/** A module's request copy; anything unserializable becomes an invalid request, never a throw. */
function requestSnapshot<T>(value: T): T {
  try {
    return snapshot(value) ?? (null as T);
  } catch {
    return null as T;
  }
}

function dataSnapshot(value: LearningModuleData): LearningModuleData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Module data must be an object");
  }
  return snapshot(value);
}

/** A private asset grant authorizes transport; it does not identify different module code. */
export function learningModuleIdentity(descriptor?: LearningModuleDescriptor): string {
  if (!descriptor) return "";
  let entry: string | string[] = descriptor.entry_url;
  try {
    const url = new URL(descriptor.entry_url);
    const match = url.pathname.match(
      /^\/skills\/lesson-assets\/[A-Za-z0-9_-]{43}\/([a-f0-9]{64})\/(.+)$/
    );
    if (
      url.protocol === "https:" &&
      url.href === descriptor.entry_url &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      match &&
      match[2].split("/").every((part) => {
        const decoded = decodeURIComponent(part);
        return decoded && !decoded.startsWith(".") && !/[\\/\u0000-\u001f\u007f]/.test(decoded);
      })
    ) {
      entry = [url.origin, match[1], match[2]];
    }
  } catch {
    // Unrecognized URLs retain their existing exact identity and loader validation.
  }
  return JSON.stringify([descriptor.id, descriptor.api_version, entry]);
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
  llm?: LearningModuleLlm;
  project?: LearningModuleProject;
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
  const capabilities = Object.freeze(
    (["llm", "project"] as LearningModuleCapability[]).filter((name) => options[name])
  );
  const cancelled = (locale: string) => ({
    ok: false as const,
    error: {
      code: "cancelled",
      fallback: false,
      retryable: true,
      message: locale.startsWith("de") ? "Abgebrochen." : "Cancelled.",
    },
  });
  const llm = options.llm;
  const project = options.project;

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
    capabilities,
    // Late answers after navigation or an account switch never reach a closed module.
    llm: llm && {
      async info(profile) {
        if (closed) return null;
        const value = await llm.info(profile);
        return closed || !value ? null : snapshot(value);
      },
      async respond(request, respondOptions = {}) {
        if (closed) return cancelled(context.locale);
        const onDelta = respondOptions.onDelta;
        const result = await llm.respond(requestSnapshot(request), {
          signal: respondOptions.signal,
          ...(typeof onDelta === "function"
            ? { onDelta: (delta) => (closed ? undefined : onDelta({ ...delta })) }
            : {}),
        });
        return closed ? cancelled(context.locale) : snapshot(result);
      },
      async grade(answer, gradeOptions = {}) {
        if (closed || context.disabled) return cancelled(context.locale);
        const result = await llm.grade(answer, gradeOptions);
        return closed ? cancelled(context.locale) : snapshot(result);
      },
      label(kind) {
        return llm.label(kind);
      },
    },
    project: project && {
      async get() {
        if (closed) throw { code: "offline" };
        const value = await project.get();
        if (closed) throw { code: "offline" };
        return snapshot(value);
      },
      async save(state, expectedRevision) {
        if (closed || context.disabled) throw { code: "offline" };
        const value = await project.save(dataSnapshot(state), expectedRevision);
        if (closed) throw { code: "offline" };
        return snapshot(value);
      },
    },
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
