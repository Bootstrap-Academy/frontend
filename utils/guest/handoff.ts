type TabStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const GUEST_RETURN_KEY = "academy-guest-return:1";
function readHandoff(storage: TabStorage) {
  const value = JSON.parse(storage.getItem(GUEST_RETURN_KEY) || "null");
  const valid =
    typeof value?.id === "string" &&
    /^[0-9a-f-]{36}$/i.test(value.id) &&
    typeof value.expires === "number" &&
    value.expires > Date.now();
  if (!valid && value) storage.removeItem(GUEST_RETURN_KEY);
  return valid ? value : null;
}
/** This is only a return hint. It cannot authorize a server completion. */
export function guestReturnPath(storage?: TabStorage | null): string | null {
  try {
    const store = storage === undefined ? window.sessionStorage : storage;
    return store && readHandoff(store) ? "/start" : null;
  } catch {
    return null;
  }
}
/** Called only by a successful explicit login/signup/OAuth login in this tab. */
export function authorizeGuestHandoff(userId: string, storage?: TabStorage): boolean {
  try {
    const store = storage || window.sessionStorage;
    const intent = readHandoff(store);
    if (!userId || !intent || (intent.owner && intent.owner !== userId)) return false;
    store.setItem(
      GUEST_RETURN_KEY,
      JSON.stringify({ ...intent, owner: userId, authorizedFor: userId })
    );
    return true;
  } catch {
    return false;
  }
}
/** Consume before the request: failures need a deliberate retry, including after reload. */
export function takeGuestAuthorization(
  userId: string,
  draftId: string,
  storage?: TabStorage
): boolean {
  try {
    const store = storage || window.sessionStorage;
    const intent = readHandoff(store);
    if (
      !intent ||
      intent.id !== draftId ||
      intent.owner !== userId ||
      intent.authorizedFor !== userId
    )
      return false;
    store.setItem(GUEST_RETURN_KEY, JSON.stringify({ ...intent, authorizedFor: null }));
    return true;
  } catch {
    return false;
  }
}
