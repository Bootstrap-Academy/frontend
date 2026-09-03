import type { CookieOptions, CookieRef } from "#app";

/**
 * `useCookie` with the flags every cookie of this application has to carry:
 * `secure` (only sent over HTTPS) and `sameSite: "lax"` (not sent on
 * cross-site requests).
 *
 * All of our cookies are first party and strictly necessary, so they stay
 * session cookies: never pass `maxAge` or `expires` here — the privacy notice
 * states that they are deleted when the browser is closed.
 */
export function useAppCookie<T = string | null | undefined>(
  name: string,
  options: CookieOptions<T> = {}
): CookieRef<T> {
  return useCookie<T>(name, { ...options, secure: true, sameSite: "lax" } as CookieOptions<T> & {
    readonly?: false;
  });
}
