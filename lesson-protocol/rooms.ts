import type { RoomEnvelope } from "../types/learningRooms";
import { canonicalJson, cloneJson } from "./schema";
import { ProtocolError, type JsonObject, type StateSnapshot } from "./types";
import type { HostActions } from "./host";

export interface RoomController {
  protocolSnapshot(): { room: RoomEnvelope | null; error: string; conflict: boolean };
  protocolRead(): Promise<RoomEnvelope>;
  edit(state: Record<string, unknown>): void;
  save(operationId?: string): Promise<boolean>;
  complete(
    action: "complete" | "skip",
    answer?: Record<string, unknown>,
    attemptId?: string,
    operationId?: string
  ): Promise<boolean>;
}
export interface RoomProtocolSource {
  data: RoomController;
  owner(): string | null;
  previous?: () => Promise<boolean>;
  /** Parent-owned continuation survives a successful completion removing the frame. */
  advance?: () => Promise<boolean>;
}
export interface RoomProtocolBinding {
  bind(options: {
    unitId: string;
    schemaVersion: number;
    initialState: JsonObject;
    introduction?: { match: JsonObject; answer: JsonObject };
    resetConfirm(): Promise<boolean>;
    navigate(direction: string): Promise<boolean>;
    progress(goal: string, fraction: number): void;
    busy(value: boolean): void;
  }): HostActions;
}
export function createRoomProtocolBinding(
  data: RoomController,
  owner: () => string | null
): RoomProtocolBinding {
  return {
    bind(options) {
      const initial = data.protocolSnapshot().room;
      const identity = owner();
      const review = initial?.progress.review_id || null;
      const course = initial?.course_id || null;
      const current = () => {
        const room = data.protocolSnapshot().room;
        return (
          !!identity &&
          identity === owner() &&
          room?.unit.id === options.unitId &&
          (room.progress.review_id || null) === review &&
          (room.course_id || null) === course
        );
      };
      const assertCurrent = () => {
        if (!current()) throw new ProtocolError("cancelled", "Learning room changed.");
      };
      if (!initial || initial.unit.id !== options.unitId || options.schemaVersion !== 1)
        throw new ProtocolError("unsupported", "Unsupported room state.");
      const snapshot = (room: RoomEnvelope): StateSnapshot => ({
        revision: room.progress.revision,
        schemaVersion: 1,
        value: cloneJson(room.progress.state) as JsonObject,
      });
      const failure = () => {
        const view = data.protocolSnapshot();
        return new ProtocolError(
          view.conflict
            ? "conflict"
            : view.error === "Session"
              ? "no_access"
              : view.error === "CheckIntroduction"
                ? "invalid_receipt"
                : "offline",
          "Your work is kept; confirmation is unavailable.",
          !view.conflict && view.error !== "CheckIntroduction"
        );
      };
      const checkRevision = (revision: number) => {
        assertCurrent();
        if (data.protocolSnapshot().room!.progress.revision !== revision)
          throw new ProtocolError("conflict", "Saved work changed.", false, {
            revision: data.protocolSnapshot().room!.progress.revision,
          });
      };
      const save = async (state: JsonObject, revision: number, key: string) => {
        checkRevision(revision);
        if (["completed", "skipped"].includes(data.protocolSnapshot().room!.progress.status))
          throw new ProtocolError("locked", "Room completed.");
        // Replaying an uncertain PUT must retain the original edit version/body.
        const signature = canonicalJson({ state, revision });
        const previous = saves.get(key);
        if (previous && previous !== signature)
          throw new ProtocolError("operation_conflict", "Save operation changed.");
        if (!previous) {
          saves.set(key, signature);
          data.edit(cloneJson(state));
        }
        const success = await data.save(key);
        assertCurrent();
        if (!success) throw failure();
        const confirmed = data.protocolSnapshot().room!;
        if (canonicalJson(confirmed.progress.state) !== canonicalJson(state))
          throw new ProtocolError("conflict", "Saved state mismatch.");
        return snapshot(confirmed);
      };
      const saves = new Map<string, string>();
      return {
        current,
        async read() {
          assertCurrent();
          let room: RoomEnvelope;
          try {
            room = await data.protocolRead();
          } catch (error) {
            assertCurrent();
            throw error;
          }
          assertCurrent();
          return snapshot(room);
        },
        save,
        async reset(revision, key) {
          checkRevision(revision);
          if (!(await options.resetConfirm())) return null;
          assertCurrent();
          return save(cloneJson(options.initialState), revision, key);
        },
        async complete(_goals, revision, key) {
          checkRevision(revision);
          const state = data.protocolSnapshot().room!.progress.state;
          if (
            !options.introduction ||
            !Object.entries(options.introduction.match).every(
              ([key, value]) => canonicalJson(state[key] ?? null) === canonicalJson(value)
            )
          )
            throw new ProtocolError("invalid_receipt", "Introduction is not ready.");
          const answer = cloneJson(options.introduction.answer);
          const success = await data.complete("complete", answer, undefined, key);
          assertCurrent();
          if (!success) throw failure();
          const progress = data.protocolSnapshot().room!.progress;
          if (progress.status !== "completed" || progress.result?.kind !== "introduced")
            throw new ProtocolError("invalid_receipt", "No server introduction confirmation.");
          return { outcome: "introduced", persisted: true };
        },
        async navigate(direction) {
          assertCurrent();
          if (!(await data.save())) throw failure();
          assertCurrent();
          if (direction === "skip" && !(await data.complete("skip"))) throw failure();
          assertCurrent();
          if (
            direction === "next" &&
            !["completed", "skipped"].includes(data.protocolSnapshot().room!.progress.status)
          )
            return false;
          return options.navigate(direction);
        },
        progress: options.progress,
        busy: options.busy,
      };
    },
  };
}
