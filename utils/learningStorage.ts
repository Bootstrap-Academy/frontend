import { GUEST_KEY } from "./guest/learning";
import { GUEST_RETURN_KEY } from "./guest/handoff";

type LearningStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;
type Stores = { local: LearningStorage | null; tab: LearningStorage | null };
type Guard = {
  user: () => string | null;
  prepare: () => Promise<boolean> | boolean;
  unsaved: () => boolean;
  clear?: (user: string) => void;
};
const guards = new Set<Guard>();

/** Mounted learners checkpoint before explicit logout, using their existing retry UI. */
export function registerLearningLogout(guard: Guard) {
  guards.add(guard);
  return () => guards.delete(guard);
}

export function browserLearningStorage(): Stores {
  const stores: Stores = { local: null, tab: null };
  try {
    stores.local = window.localStorage;
  } catch {
    /* Mounted guards still protect in-memory work when storage is blocked. */
  }
  try {
    stores.tab = window.sessionStorage;
  } catch {
    /* Likewise for tab storage. */
  }
  return stores;
}
function accountKeys(storage: LearningStorage | null, user: string) {
  const keys: string[] = [];
  for (let i = 0; storage && i < storage.length; i++) {
    const key = storage.key(i);
    if (
      key?.startsWith(`academy-challenge-draft:${user}:`) ||
      (key?.startsWith("academy-learning-recovery:") && key.endsWith(`:${user}`))
    )
      keys.push(key);
  }
  return keys;
}
function guestStore(storage: LearningStorage | null) {
  const text = storage?.getItem(GUEST_KEY);
  try {
    return JSON.parse(text || "null");
  } catch {
    return null;
  }
}

export async function prepareLearningLogout(
  user: string,
  confirmLoss: () => boolean,
  stores = browserLearningStorage()
) {
  if (!user) return true;
  const active = [...guards].filter((guard) => guard.user() === user);
  for (const guard of active) {
    if (!(await guard.prepare())) return false;
  }
  let unsaved = active.some((guard) => guard.unsaved());
  try {
    const own = guestStore(stores.local)?.accounts?.[user];
    unsaved ||= !!own && own.saved !== true;
    unsaved ||= accountKeys(stores.tab, user).length > 0;
  } catch {
    // An unreadable checkpoint cannot be treated as confirmed server work.
    unsaved = true;
  }
  return !unsaved || confirmLoss();
}

/** Call after the synchronous session reset, so watchers cannot recreate removed copies. */
export function clearLearningStorage(user: string, stores = browserLearningStorage()) {
  if (!user) return;
  for (const guard of guards) guard.clear?.(user);
  const store = guestStore(stores.local);
  if (store?.accounts && Object.hasOwn(store.accounts, user)) {
    delete store.accounts[user];
    if (!store.guest && !Object.keys(store.accounts).length) stores.local?.removeItem(GUEST_KEY);
    else stores.local?.setItem(GUEST_KEY, JSON.stringify(store));
  }
  for (const key of accountKeys(stores.tab, user)) stores.tab?.removeItem(key);
  let intent;
  try {
    intent = JSON.parse(stores.tab?.getItem(GUEST_RETURN_KEY) || "null");
  } catch {
    stores.tab?.removeItem(GUEST_RETURN_KEY);
  }
  if (intent?.owner === user || intent?.authorizedFor === user)
    stores.tab?.removeItem(GUEST_RETURN_KEY);
}
