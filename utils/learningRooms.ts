import type { LearningRequest, LearningRoomsView, RoomEnvelope } from "../types/learningRooms";

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function envelope(value: any): RoomEnvelope {
  if (
    !value?.unit?.id ||
    !["loop-explorer", "percentage-explorer", "exercise"].includes(value.unit.room) ||
    !Number.isInteger(value?.progress?.revision) ||
    !value?.progress?.state ||
    typeof value.progress.state !== "object"
  )
    throw new Error("Invalid learning room");
  return value;
}
function errorKey(error: any) {
  const status = error?.statusCode || error?.status || error?.response?.status;
  return status === 409
    ? "Conflict"
    : status === 401
      ? "Session"
      : status === 422
        ? "CheckIntroduction"
        : "SaveError";
}
export function createLearningRooms(options: {
  request: LearningRequest;
  changed: (view: LearningRoomsView) => void;
  id?: () => string;
}) {
  const empty = (): LearningRoomsView => ({
    status: "idle",
    paths: [],
    path: null,
    room: null,
    draft: {},
    dirty: false,
    saving: false,
    completing: false,
    completionPending: false,
    conflict: false,
    error: "",
    emptyReason: null,
  });
  let view = empty();
  let generation = 0;
  let alive = true;
  let editVersion = 0;
  let savePromise: Promise<boolean> | null = null;
  let pendingSave: any = null;
  let pendingComplete: any = null;
  let completionRequested = false;
  const id = options.id || (() => crypto.randomUUID());
  const publish = () => options.changed({ ...view, draft: copy(view.draft) });
  const current = (ticket: number) => alive && ticket === generation;

  async function save(): Promise<boolean> {
    if (!alive || view.conflict || !view.room || view.status !== "ready") return false;
    if (savePromise) return savePromise;
    if (!view.dirty && !pendingSave) return true;
    const ticket = generation;
    const unitId = view.room.unit.id;
    view.saving = true;
    publish();
    const operation = (async () => {
      try {
        while (current(ticket) && (view.dirty || pendingSave)) {
          const version = pendingSave?.version ?? editVersion;
          pendingSave ||= {
            body: {
              request_id: id(),
              expected_revision: view.room!.progress.revision,
              state: copy(view.draft),
            },
            version,
          };
          const response = envelope(
            await options.request(
              `/skills/rooms/${encodeURIComponent(unitId)}/state`,
              "PUT",
              pendingSave.body
            )
          );
          if (!current(ticket)) return false;
          view.room = response;
          view.dirty = editVersion !== version;
          pendingSave = null;
          view.error = "";
        }
        return current(ticket);
      } catch (error) {
        if (current(ticket)) {
          view.error = errorKey(error);
          view.conflict = view.error === "Conflict";
        }
        return false;
      } finally {
        if (current(ticket)) {
          view.saving = false;
          savePromise = null;
          publish();
        }
      }
    })();
    savePromise = operation;
    return operation;
  }

  async function next(path?: string, after?: string) {
    if (!alive || view.saving || view.completing || view.completionPending || view.conflict)
      return false;
    if (view.dirty && !(await save())) return false;
    const ticket = ++generation;
    view.status = "loading";
    view.error = "";
    publish();
    const query = new URLSearchParams();
    if (path) query.set("path", path);
    if (after) query.set("after", after);
    try {
      const response = await options.request(`/skills/rooms${query.size ? `?${query}` : ""}`);
      if (!current(ticket)) return false;
      if (!Array.isArray(response?.paths) || !response?.path?.id)
        throw new Error("Invalid learning paths");
      view.paths = response.paths;
      view.path = response.path;
      view.room = response.next === null ? null : envelope(response.next);
      view.emptyReason = response.next === null ? response.empty_reason || "unavailable" : null;
      view.draft = copy(view.room?.progress.state || {});
      view.dirty = false;
      view.conflict = false;
      view.status = "ready";
      pendingSave = null;
      pendingComplete = null;
      editVersion = 0;
      publish();
      return true;
    } catch {
      if (current(ticket)) {
        view.status = "error";
        view.error = "LoadError";
        publish();
      }
      return false;
    }
  }

  return {
    recovery() {
      if (
        !view.room ||
        !(view.dirty || view.saving || view.completing || pendingSave || pendingComplete)
      )
        return null;
      return copy({
        unitId: view.room.unit.id,
        pathId: view.room.unit.path_id,
        revision: view.room.progress.revision,
        draft: view.draft,
        dirty: view.dirty,
        editVersion,
        pendingSave,
        pendingComplete,
      });
    },
    async restore(recovery: any) {
      if (
        !alive ||
        !recovery?.unitId ||
        !Number.isInteger(recovery.revision) ||
        !recovery.draft ||
        typeof recovery.draft !== "object"
      )
        return false;
      const ticket = generation;
      try {
        const response = envelope(
          await options.request(`/skills/rooms/${encodeURIComponent(recovery.unitId)}`)
        );
        if (!current(ticket)) return false;
        view.room = response;
        view.path = view.paths.find((path) => path.id === response.unit.path_id) || view.path;
        if (!["completed", "skipped"].includes(response.progress.status)) {
          view.room = {
            ...response,
            progress: { ...response.progress, revision: recovery.revision },
          };
          view.draft = copy(recovery.draft);
          view.dirty = recovery.dirty === true;
          editVersion = Number.isInteger(recovery.editVersion) ? recovery.editVersion : 0;
          pendingSave = recovery.pendingSave ? copy(recovery.pendingSave) : null;
          pendingComplete = recovery.pendingComplete ? copy(recovery.pendingComplete) : null;
          view.completionPending = !!pendingComplete;
        } else {
          view.draft = copy(response.progress.state);
          view.dirty = false;
        }
        view.status = "ready";
        view.error = "";
        view.conflict = false;
        publish();
        return true;
      } catch {
        if (current(ticket)) {
          view.error = "RecoveryError";
          publish();
        }
        return false;
      }
    },
    reset() {
      generation++;
      editVersion = 0;
      pendingSave = null;
      pendingComplete = null;
      savePromise = null;
      completionRequested = false;
      view = empty();
      publish();
    },
    async start(enabled: boolean, path?: string) {
      const ticket = generation;
      if (!enabled) {
        view.status = "disabled";
        publish();
        return;
      }
      view.status = "loading";
      publish();
      try {
        const capability = await options.request("/skills/rooms/capabilities");
        if (!current(ticket)) return;
        if (capability?.enabled !== true) {
          view.status = "disabled";
          publish();
          return;
        }
        await next(path);
      } catch (error: any) {
        if (current(ticket)) {
          view.status =
            (error?.statusCode || error?.status || error?.response?.status) === 404
              ? "disabled"
              : "error";
          view.error = "LoadError";
          publish();
        }
      }
    },
    edit(state: Record<string, any>) {
      if (
        !alive ||
        !view.room ||
        view.completing ||
        pendingComplete ||
        ["completed", "skipped"].includes(view.room.progress.status)
      )
        return;
      view.draft = copy(state);
      editVersion++;
      view.dirty = true;
      publish();
    },
    save,
    next,
    async complete(action: "complete" | "skip", answer?: Record<string, any>) {
      if (!alive || !view.room || completionRequested || view.conflict || view.completing)
        return false;
      if (["completed", "skipped"].includes(view.room.progress.status)) return true;
      if (action === "skip" && view.room.unit.room === "exercise") return false;
      const ticket = generation;
      completionRequested = true;
      try {
        if (!(await save()) || !current(ticket)) return false;
        view.completing = true;
        view.error = "";
        pendingComplete ||= {
          request_id: id(),
          expected_revision: view.room.progress.revision,
          action,
          ...(answer ? { answer: copy(answer) } : {}),
        };
        view.completionPending = true;
        publish();
        const response = envelope(
          await options.request(
            `/skills/rooms/${encodeURIComponent(view.room.unit.id)}/complete`,
            "POST",
            pendingComplete
          )
        );
        if (!current(ticket)) return false;
        view.room = response;
        view.draft = copy(response.progress.state);
        pendingComplete = null;
        view.completionPending = false;
        view.dirty = false;
        return true;
      } catch (error) {
        if (current(ticket)) {
          view.error = errorKey(error);
          view.conflict = view.error === "Conflict";
          const status =
            (error as any)?.statusCode ||
            (error as any)?.status ||
            (error as any)?.response?.status;
          if (status >= 400 && status < 500 && status !== 409) {
            pendingComplete = null;
            view.completionPending = false;
          }
        }
        return false;
      } finally {
        if (current(ticket)) {
          completionRequested = false;
          view.completing = false;
          publish();
        }
      }
    },
    async resolveConflict(keepDraft: boolean) {
      if (!view.room || !view.conflict) return;
      const ticket = generation;
      try {
        const response = envelope(
          await options.request(`/skills/rooms/${encodeURIComponent(view.room.unit.id)}`)
        );
        if (!current(ticket)) return;
        view.room = response;
        view.conflict = false;
        view.error = "";
        pendingSave = null;
        pendingComplete = null;
        view.completionPending = false;
        if (!keepDraft || ["completed", "skipped"].includes(response.progress.status)) {
          view.draft = copy(response.progress.state);
          view.dirty = false;
        } else view.dirty = true;
        publish();
        if (view.dirty) await save();
      } catch {
        if (current(ticket)) {
          view.error = "LoadError";
          publish();
        }
      }
    },
    dispose() {
      alive = false;
      generation++;
      view = empty();
      publish();
    },
  };
}
