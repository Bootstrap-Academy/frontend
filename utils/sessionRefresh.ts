import { Mutex } from "async-mutex";

export const sessionRefreshMutex = new Mutex();
const LOCK = "academy-session-refresh";
const TIMEOUT = 20000;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SessionSnapshot {
  identity: string | null;
  generation: string;
  userId: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
}

export function sameSession(a: SessionSnapshot, b: SessionSnapshot) {
  return !!a.identity && sameSessionContext(a, b);
}

export function sameSessionContext(a: SessionSnapshot, b: SessionSnapshot) {
  return a.identity === b.identity && a.generation === b.generation;
}

export function sameSessionPair(a: SessionSnapshot, b: SessionSnapshot) {
  return sameSession(a, b) && a.accessToken === b.accessToken && a.refreshToken === b.refreshToken;
}

export function accessTokenExpired(token: string, margin = 100) {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return false;
    const payload = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now() + margin * 1000;
  } catch {
    return false;
  }
}

/** Storage only carries a short lived lock identifier, never credentials. */
async function fallbackLock<T>(action: () => Promise<T>): Promise<T> {
  let storage: Storage;
  try {
    storage = localStorage;
    storage.getItem(LOCK);
  } catch {
    return action();
  }
  const id = crypto.randomUUID();
  const started = Date.now();
  const read = () => {
    try {
      return JSON.parse(storage.getItem(LOCK) || "null");
    } catch {
      return null;
    }
  };
  while (Date.now() - started <= TIMEOUT + 10000) {
    const held = read();
    if (!held || held.expires <= Date.now()) {
      try {
        storage.setItem(LOCK, JSON.stringify({ id, expires: Date.now() + TIMEOUT + 5000 }));
      } catch {
        return action();
      }
      // Storage has no compare-and-swap. Confirm ownership after competitors
      // have had a turn; strict backend rotation also fences any remaining race.
      await delay(30);
      if (read()?.id === id) {
        try {
          return await action();
        } finally {
          if (read()?.id === id) {
            try {
              storage.removeItem(LOCK);
            } catch {
              /* An expired lease can be recovered by the next request. */
            }
          }
        }
      }
    }
    await delay(50);
  }
  throw { statusCode: 503, data: { error: "session_refresh_busy" } };
}

export async function withSessionRefreshLock<T>(action: (exclusive?: boolean) => Promise<T>) {
  const release = await sessionRefreshMutex.acquire();
  try {
    if (typeof navigator !== "undefined" && navigator.locks) {
      let started = false;
      try {
        return await navigator.locks.request(LOCK, () => {
          started = true;
          return action(true);
        });
      } catch (error) {
        if (started) throw error;
        // A browser policy can deny the API despite exposing it. An operation
        // that actually started must never be executed again by this fallback.
      }
    }
    return await fallbackLock(() => action(false));
  } finally {
    release();
  }
}

const stale = () => ({ statusCode: 401, data: { error: "session_changed" } });
const status = (error: any) => error?.statusCode || error?.status || error?.response?.status;

/** A logout may renew its captured pair solely to revoke that same session. */
export async function revokeSession(options: {
  expected: SessionSnapshot;
  lock: (action: (exclusive?: boolean) => Promise<any>) => Promise<any>;
  raw: (path: string, method: "PUT" | "DELETE", body?: unknown, token?: string) => Promise<any>;
}) {
  return options.lock(async () => {
    const expected = options.expected;
    let token = expected.accessToken;
    let renewed = false;
    const renew = async () => {
      if (!expected.refreshToken) throw stale();
      const response = await options.raw("/auth/session", "PUT", {
        refresh_token: expected.refreshToken,
      });
      if (
        response?.user?.id !== expected.userId ||
        response?.session?.id !== expected.sessionId ||
        typeof response?.access_token !== "string" ||
        !response.access_token
      )
        throw { statusCode: 502, data: { error: "invalid_session_response" } };
      token = response.access_token;
      renewed = true;
    };
    if (!token || accessTokenExpired(token, 0)) await renew();
    const path = `/auth/sessions/${expected.userId}/${expected.sessionId}`;
    try {
      return await options.raw(path, "DELETE", undefined, token);
    } catch (error) {
      if (renewed || status(error) !== 401) throw error;
      await renew();
      return options.raw(path, "DELETE", undefined, token);
    }
  });
}

/** Every caller reads the shared cookie pair after acquiring the origin lock. */
export async function renewSession(options: {
  expected: SessionSnapshot;
  snapshot: () => SessionSnapshot;
  lock: (action: (exclusive?: boolean) => Promise<any>) => Promise<any>;
  raw: (token: string) => Promise<any>;
  apply: (response: any) => void;
  discard?: (response: any, expected: SessionSnapshot) => Promise<unknown>;
  refused: () => void;
  fallback?: boolean;
  wait?: (ms: number) => Promise<unknown>;
}) {
  return options.lock(async (exclusive) => {
    const fallback = options.fallback || exclusive === false;
    const before = options.snapshot();
    if (!sameSession(before, options.expected)) throw stale();
    if (!sameSessionPair(before, options.expected) && !accessTokenExpired(before.accessToken))
      return before;
    if (!before.refreshToken) throw stale();
    let response;
    try {
      response = await options.raw(before.refreshToken);
    } catch (error) {
      let after = options.snapshot();
      // Without Web Locks a suspended tab or disabled storage can overlap a
      // request. Wait for the backend winner's cookie write before treating the
      // consumed original as invalid. No grace rule or token replay is needed.
      if (status(error) === 401 && fallback && sameSessionPair(after, before)) {
        const until = Date.now() + TIMEOUT;
        while (Date.now() < until && sameSessionPair(after, before)) {
          await (options.wait || delay)(50);
          after = options.snapshot();
        }
      }
      if (!sameSession(after, before)) throw stale();
      if (!sameSessionPair(after, before)) return after;
      // Without a native origin lock, an unseen winner can still be delivering
      // its response. Uncertainty must never turn into a destructive logout.
      if (!fallback && [400, 401, 403].includes(status(error))) options.refused();
      throw error;
    }
    const valid =
      response?.user?.id === before.userId &&
      response?.session?.id === before.sessionId &&
      typeof response?.access_token === "string" &&
      !!response.access_token &&
      typeof response?.refresh_token === "string" &&
      !!response.refresh_token;
    const after = options.snapshot();
    if (!sameSession(after, before)) {
      // A logout can consume R0 while its R1 response is still in flight. Only
      // this discarded result can revoke the old session; never touch a newer
      // pair belonging to the same current generation.
      if (valid && options.discard) await options.discard(response, before).catch(() => {});
      throw stale();
    }
    if (!sameSessionPair(after, before)) return after;
    if (!valid) throw { statusCode: 502, data: { error: "invalid_session_response" } };
    options.apply(response);
    return response;
  });
}
