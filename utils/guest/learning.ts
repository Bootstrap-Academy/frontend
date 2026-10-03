import exercise from "./loops-intro.json";
import { GUEST_RETURN_KEY } from "./handoff";
import type { LearningRequest } from "../../types/learningRooms";

export const guestExercise = exercise;
export const GUEST_KEY = "academy-guest-learning:1";
export const GUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const guestDestination =
  "/learn?path=python-loops&course=python-foundations&unit=loops-intro";
const roomUrl = "/skills/rooms/loops-intro";
const courseQuery = "?course=python-foundations";
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type State = Record<string, unknown>;
type Pending = { request_id: string; expected_revision: number; state: State };
export type GuestDraft = {
  version: 1;
  id: string;
  owner: string | null;
  state: State;
  finished: boolean;
  lastUsedAt?: number;
  pending?: Pending;
  saved?: boolean;
};
export type GuestError =
  | ""
  | "storage"
  | "browser"
  | "session"
  | "conflict"
  | "changed"
  | "limit"
  | "save";
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const object = (value: unknown): value is State =>
  !!value && typeof value === "object" && !Array.isArray(value);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => same(v, b[i]))
    );
  return (
    object(a) &&
    object(b) &&
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((key) => Object.hasOwn(b, key) && same(a[key], b[key]))
  );
}

/** Only renderer inputs can enter a guest draft, never server result/XP fields. */
export function guestState(raw: unknown): State {
  if (!object(raw)) return {};
  const state: State = {};
  for (const [key, min, max] of [
    ["stage", 0, 4],
    ["repetitions", 1, 6],
    ["practiceRepetitions", 1, 6],
  ] as const) {
    const value = raw[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= min && value <= max)
      state[key] = value;
  }
  for (const key of ["singleDone", "predictionChecked", "hintOpen"]) {
    if (typeof raw[key] === "boolean") state[key] = raw[key];
  }
  if (
    (typeof raw.prediction === "string" || typeof raw.prediction === "number") &&
    /^\d{0,4}$/.test(String(raw.prediction))
  )
    state.prediction = String(raw.prediction);
  return state;
}
export function guestFinished(state: State) {
  return (
    state.stage === 4 &&
    state.singleDone === true &&
    state.predictionChecked === true &&
    Number(state.prediction) === 6 &&
    state.practiceRepetitions === 4
  );
}
function decode(raw: string | null, owner: string | null): GuestDraft | null {
  try {
    const value = JSON.parse(raw || "null");
    if (value?.version !== 1 || !uuid(value.id) || value.owner !== owner || !object(value.state))
      return null;
    const state = guestState(value.state);
    const draft: GuestDraft = {
      version: 1,
      id: value.id,
      owner,
      state,
      finished: value.finished === true && guestFinished(state),
    };
    if (Number.isSafeInteger(value.lastUsedAt) && value.lastUsedAt >= 0)
      draft.lastUsedAt = value.lastUsedAt;
    if (owner && value.saved === true) draft.saved = true;
    if (
      owner &&
      value.pending &&
      uuid(value.pending.request_id) &&
      Number.isSafeInteger(value.pending.expected_revision) &&
      value.pending.expected_revision >= 0 &&
      same(guestState(value.pending.state), value.pending.state)
    )
      draft.pending = clone(value.pending);
    return draft;
  } catch {
    return null;
  }
}

export function createGuestLearning(options: {
  local: StorageLike | null;
  tab: StorageLike | null;
  user: () => string | null;
  request: LearningRequest;
  lock: <T>(run: () => Promise<T>) => Promise<T>;
  changed: (view: {
    draft: GuestDraft;
    busy: boolean;
    error: GuestError;
    persisted: boolean;
  }) => void;
  id?: () => string;
  now?: () => number;
}) {
  const id = options.id || (() => crypto.randomUUID());
  const now = options.now || Date.now;
  const fresh = (): GuestDraft => ({
    version: 1,
    id: id(),
    owner: null,
    state: {},
    finished: false,
    lastUsedAt: now(),
  });
  let draft = fresh(),
    busy = false,
    error: GuestError = "",
    persisted = false,
    generation = 0;
  const publish = () => options.changed({ draft: clone(draft), busy, error, persisted });
  function stored() {
    const text = options.local?.getItem(GUEST_KEY);
    let raw;
    try {
      raw = JSON.parse(text || "null");
    } catch {
      /* Ignore a corrupt local record. */
    }
    const store =
      raw?.version === 1 && object(raw.accounts)
        ? (raw as { version: 1; guest: unknown; accounts: Record<string, unknown> })
        : { version: 1 as const, guest: null as unknown, accounts: {} as Record<string, unknown> };
    let cleaned = false;
    const guest = readDraft(store.guest, null);
    if (guest && guest.lastUsedAt === undefined) {
      // Existing drafts get one migration grace period rather than losing work.
      store.guest = { ...guest, lastUsedAt: now() };
    } else if (guest && now() - guest.lastUsedAt! >= GUEST_TTL_MS) {
      store.guest = null;
      cleaned = true;
    }
    for (const [owner, value] of Object.entries(store.accounts)) {
      if (readDraft(value, owner)?.saved) {
        delete store.accounts[owner];
        cleaned = true;
      }
    }
    if (cleaned) writeStore(store);
    return store;
  }
  const readDraft = (value: unknown, user: string | null) =>
    decode(JSON.stringify(value ?? null), user);
  function writeStore(value: ReturnType<typeof stored>) {
    if (!options.local) throw { guest: "storage" };
    try {
      if (!value.guest && !Object.keys(value.accounts).length) options.local.removeItem(GUEST_KEY);
      else options.local.setItem(GUEST_KEY, JSON.stringify(value));
    } catch {
      throw { guest: "storage" };
    }
  }
  function load() {
    generation++;
    busy = false;
    error = "";
    const user = options.user();
    try {
      const store = stored();
      const own = user ? readDraft(store.accounts[user], user) : null;
      const guest = readDraft(store.guest, null);
      draft = own || guest || fresh();
      persisted = !!(own || guest);
      if (!own && guest) {
        draft.lastUsedAt = now();
        store.guest = draft;
        try {
          writeStore(store);
        } catch {
          persisted = false;
          error = "storage";
        }
      }
      if (!options.local) error = "storage";
    } catch {
      draft = fresh();
      persisted = false;
      error = "storage";
    }
    publish();
  }
  function persist() {
    try {
      const store = stored();
      // A different tab may already have handed this draft to an account.
      if (!draft.owner) {
        const current = readDraft(store.guest, null);
        if ((persisted && current?.id !== draft.id) || (current && current.id !== draft.id)) {
          load();
          return false;
        }
        store.guest = draft;
        draft.lastUsedAt = now();
      } else {
        if (readDraft(store.accounts[draft.owner], draft.owner)?.id !== draft.id)
          throw { guest: "conflict" };
        store.accounts = { ...store.accounts, [draft.owner]: draft };
      }
      writeStore(store);
      persisted = true;
      return true;
    } catch {
      persisted = false;
      error = "storage";
      publish();
      return false;
    }
  }
  function edit(state: State) {
    if (busy || draft.pending || draft.saved || (draft.owner && draft.owner !== options.user()))
      return;
    draft.state = guestState(state);
    draft.finished = false;
    error = "";
    persist();
    publish();
  }
  function finish() {
    if (busy || !guestFinished(draft.state)) return;
    draft.finished = true;
    persist();
    publish();
  }
  function beginHandoff() {
    if (!Object.keys(draft.state).length || !persist()) return false;
    try {
      if (!options.tab) throw new Error("Storage unavailable");
      let previous;
      try {
        previous = JSON.parse(options.tab.getItem(GUEST_RETURN_KEY) || "null");
      } catch {
        /* A new explicit handoff replaces corrupt tab data. */
      }
      const existing = previous?.id === draft.id && previous.expires > Date.now() ? previous : null;
      const owner = draft.owner || existing?.owner || options.user();
      options.tab.setItem(
        GUEST_RETURN_KEY,
        JSON.stringify({
          id: draft.id,
          owner,
          authorizedFor: existing?.owner === owner ? existing?.authorizedFor || null : null,
          expires: Date.now() + 24 * 60 * 60 * 1000,
        })
      );
      return true;
    } catch {
      error = "storage";
      publish();
      return false;
    }
  }
  async function transfer() {
    const user = options.user();
    if (draft.saved && draft.owner === user) return true;
    if (busy || !user || !Object.keys(draft.state).length || (draft.owner && draft.owner !== user))
      return false;
    const ticket = generation;
    const current = () => ticket === generation && options.user() === user;
    busy = true;
    error = "";
    publish();
    try {
      return await options.lock(async () => {
        if (!current()) return false;
        if (!options.local) throw { guest: "storage" };
        // Read inside a cross-tab lock. A second tab/account cannot claim the same draft.
        const store = stored();
        const own = readDraft(store.accounts[user], user);
        if (own?.id === draft.id) draft = own;
        else if (!draft.owner) {
          const unclaimed = readDraft(store.guest, null);
          if (!unclaimed || unclaimed.id !== draft.id || own) throw { guest: "conflict" };
          const claimed = { ...unclaimed, owner: user };
          // One atomic storage write claims the draft and keeps its recovery copy.
          writeStore({ ...store, guest: null, accounts: { ...store.accounts, [user]: claimed } });
          draft = claimed;
        } else throw { guest: "conflict" };
        if (draft.saved) return true;
        publish();
        const room = await options.request(roomUrl + courseQuery);
        if (!current()) return false;
        if (
          room?.unit?.id !== exercise.id ||
          room.unit.path_id !== exercise.path_id ||
          room.unit.room !== exercise.room ||
          !same(room.unit.content, exercise.content)
        )
          throw { guest: "changed" };
        if (!draft.pending) {
          if (
            room.progress?.status !== "new" ||
            room.progress.revision !== 0 ||
            !object(room.progress.state) ||
            Object.keys(room.progress.state).length ||
            room.progress.result ||
            room.progress.review_id
          )
            throw { guest: "conflict" };
          draft.pending = {
            request_id: id(),
            expected_revision: room.progress.revision,
            state: clone(draft.state),
          };
          if (!persist()) throw { guest: "storage" };
        }
        const pending = draft.pending;
        const result = await options.request(roomUrl + "/state" + courseQuery, "PUT", pending);
        if (!current()) return false;
        if (
          result?.unit?.id !== exercise.id ||
          result?.progress?.status !== "in_progress" ||
          result.progress.revision !== pending.expected_revision + 1 ||
          !same(result.progress.state, pending.state) ||
          result.progress.result ||
          result.progress.review_id
        )
          throw { guest: "save" };
        const latest = stored();
        if (readDraft(latest.accounts[user], user)?.id === draft.id) delete latest.accounts[user];
        if (readDraft(latest.guest, null)?.id === draft.id) latest.guest = null;
        // Keep the exact pending request if local cleanup fails; retry is idempotent.
        writeStore(latest);
        draft.saved = true;
        delete draft.pending;
        persisted = false;
        try {
          options.tab?.removeItem(GUEST_RETURN_KEY);
        } catch {
          /* Only a navigation hint. */
        }
        return true;
      });
    } catch (failure: any) {
      if (current()) {
        const status = failure?.statusCode || failure?.status || failure?.response?.status;
        error =
          failure?.guest ||
          (status === 401
            ? "session"
            : status === 409
              ? "conflict"
              : status === 429 &&
                  (failure?.data?.code === "daily_limit_reached" ||
                    failure?.data?.detail?.code === "daily_limit_reached")
                ? "limit"
                : "save");
      }
      return false;
    } finally {
      if (current()) {
        busy = false;
        publish();
      }
    }
  }
  function dispose() {
    generation++;
  }
  load();
  return { load, edit, finish, beginHandoff, transfer, dispose };
}
