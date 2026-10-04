import type { SessionSnapshot } from "./sessionRefresh";

export const LEARNING_LOGOUT_SIGNAL = "academy-learning-logout:1";
export const LEARNING_LOGOUT_CHANNEL = "academy-learning-logout";
type EndedSession = Pick<SessionSnapshot, "userId" | "sessionId" | "generation">;
type Signal = EndedSession & { version: 1 };

export function learningLogoutSignal(value: unknown): Signal | null {
  const signal = value as Signal | null;
  return signal?.version === 1 &&
    typeof signal.userId === "string" &&
    signal.userId.length > 0 &&
    signal.userId.length <= 128 &&
    typeof signal.sessionId === "string" &&
    typeof signal.generation === "string"
    ? signal
    : null;
}

/** A delayed logout must never discard work from a subsequent login to the same account. */
export function acceptLearningLogout(signal: Signal, current: EndedSession) {
  return (
    current.userId !== signal.userId ||
    (current.sessionId === signal.sessionId && current.generation === signal.generation)
  );
}

/** No credentials or work leave the tab; the fallback signal is removed immediately. */
export function broadcastLearningLogout(ended: EndedSession) {
  if (!ended.userId) return;
  const signal: Signal = {
    version: 1,
    userId: ended.userId,
    sessionId: ended.sessionId,
    generation: ended.generation,
  };
  try {
    const channel = new BroadcastChannel(LEARNING_LOGOUT_CHANNEL);
    try {
      channel.postMessage(signal);
    } finally {
      channel.close();
    }
  } catch {
    /* The storage event also reaches browsers that block BroadcastChannel. */
  }
  try {
    window.localStorage.setItem(LEARNING_LOGOUT_SIGNAL, JSON.stringify(signal));
  } catch {
    /* BroadcastChannel remains available when local storage is blocked. */
  } finally {
    try {
      window.localStorage.removeItem(LEARNING_LOGOUT_SIGNAL);
    } catch {
      /* Startup also removes a signal left behind by a blocked removal. */
    }
  }
}
