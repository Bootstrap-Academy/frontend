import { accessTokenExpired, sameSessionContext } from "~/utils/sessionRefresh";
import type { SessionSnapshot } from "~/utils/sessionRefresh";
import type { PublicationChoice } from "~/types/publicationTypes";

/** Personal answers never enter the legacy transport's development logs. */
export function usePublicationRequest() {
  const app = useNuxtApp();
  const baseURL = useRuntimeConfig().public.BASE_API_URL;
  const snapshot = (): SessionSnapshot => app.runWithContext(getSessionSnapshot) as SessionSnapshot;
  return async (path: string, method: "GET" | "PUT" = "GET", body?: PublicationChoice) => {
    const expected = snapshot();
    if (!expected.identity) throw { statusCode: 401 };
    if (accessTokenExpired(expected.accessToken))
      await app.runWithContext(() => refreshSession(expected, false));
    if (!sameSessionContext(expected, snapshot())) throw { statusCode: 401 };
    try {
      const result = await $fetch(path, {
        baseURL,
        method,
        body: method === "PUT" ? body : undefined,
        headers: { Authorization: `Bearer ${snapshot().accessToken}` },
        retry: 0,
        timeout: 20000,
        cache: "no-store",
      });
      if (!sameSessionContext(expected, snapshot())) throw { statusCode: 401 };
      return result;
    } catch (error) {
      if (!sameSessionContext(expected, snapshot())) throw { statusCode: 401 };
      throw error;
    }
  };
}
