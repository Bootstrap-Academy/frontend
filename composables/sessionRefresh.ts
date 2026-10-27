import { renewSession, withSessionRefreshLock, type SessionSnapshot } from "~/utils/sessionRefresh";

/** Read the shared cookie pair, rather than an old tab's token refs. */
export function getSessionSnapshot(): SessionSnapshot {
  syncSessionCookies();
  const userId = useUser().value?.id || "";
  const sessionId = (useSession().value as any)?.id || "";
  return {
    identity: userId && sessionId ? `${userId}:${sessionId}` : null,
    generation: readSessionCookie("authGeneration") || "",
    userId,
    sessionId,
    accessToken: useAccessToken().value || "",
    refreshToken: useRefreshToken().value || "",
  };
}

/** Set when renewing the session stopped helping and it ended; the login page says so. */
export const useSessionRenewalStopped = () => useState("sessionRenewalStopped", () => false);

export async function refreshSession(expected = getSessionSnapshot(), clearOnInvalid = true) {
  const config = useRuntimeConfig().public;
  const app = useNuxtApp();
  return renewSession({
    expected,
    // With ssr:false, Nuxt runs this synchronous callback immediately in Vue's context.
    snapshot: () => app.runWithContext(getSessionSnapshot) as SessionSnapshot,
    lock: withSessionRefreshLock,
    raw: (token) =>
      $fetch(`${config.BASE_API_URL}/auth/session`, {
        method: "PUT",
        body: { refresh_token: token },
        retry: 0,
        timeout: 20000,
      }),
    apply: (response) => app.runWithContext(() => setStates(response, true)),
    discard: (response, original) =>
      $fetch(`${config.BASE_API_URL}/auth/sessions/${original.userId}/${original.sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${response.access_token}` },
        retry: 0,
        timeout: 20000,
      }),
    refused: () => {
      if (clearOnInvalid) app.runWithContext(() => setStates(null));
    },
    // A learning room (clearOnInvalid false) asks for a new login itself and keeps its draft.
    halted: () => {
      if (!clearOnInvalid) return;
      app.runWithContext(() => {
        // A public legal page stays open (setStates does not redirect there), so no note waits
        // for a later visit to the log-in page.
        if (!isOnPublicLegalRoute()) useSessionRenewalStopped().value = true;
        setStates(null);
      });
    },
    fallback: typeof navigator === "undefined" || !navigator.locks,
  });
}
