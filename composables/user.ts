import { useState } from "#app";
import { User } from "~/types/userTypes";
import { clearLearningStorage } from "~/utils/learningStorage";
import { broadcastLearningLogout } from "~/utils/learningLogoutSync";

export const useUser = () => useState<User>("user", () => new User());
export const useSession = () => useState<{ id: string } | null>("session", () => null);
export const useAccessToken = () => useState("accessToken", () => "");
export const useRefreshToken = () => useState("refreshToken", () => "");
export const useShowConfetti = () => useState("showConfetti", () => false);

/**
 * Whether the full profile has been loaded from the API in this app session.
 *
 * The `user` cookie only carries the id and the two names, so anything that
 * depends on another field - the e-mail address, the invoice address, the
 * accepted version of the terms - has to wait for `GET /auth/users/me` instead
 * of treating the missing field as "not set".
 */
export const useProfileLoaded = () => useState("profileLoaded", () => false);

/**
 * The `user` cookie only carries what the interface needs before the profile
 * has been loaded from the API: the id and the two names. Everything else
 * (e-mail address, invoice address, VAT id, ...) stays on the server and is
 * loaded with `GET /auth/users/me`.
 */
function toCookieUser(user: any) {
  if (!!!user) return null;

  return {
    id: user.id ?? null,
    name: user.name ?? null,
    display_name: user.display_name ?? null,
  };
}

export function setUser(value: any, writeCookie = true) {
  const user = <any>useUser();

  moderationAmbientChanged(value?.id);
  user.value = value ?? null;
  if (writeCookie) useAppCookie<any>("user").value = toCookieUser(value);
}

/** Nuxt's useCookie installs a listener; request snapshots only need a read. */
export function readSessionCookie(name: string): any {
  if (typeof document === "undefined" || typeof document.cookie !== "string")
    return useAppCookie<any>(name, { readonly: true, watch: false }).value;
  const entry = document.cookie.split(";").find((value) => value.trim().startsWith(`${name}=`));
  if (!entry) return null;
  try {
    const value = decodeURIComponent(entry.trim().slice(name.length + 1));
    if (value === "undefined") return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch {
    return null;
  }
}

export function getAccessToken() {
  const accessToken: any = useAccessToken();
  const current = readSessionCookie("accessToken");
  if (current != accessToken.value) {
    accessToken.value = current;
  }

  return accessToken.value;
}

export function getRefreshToken() {
  const refreshToken: any = useRefreshToken();
  const current = readSessionCookie("refreshToken");
  if (current != refreshToken.value) {
    refreshToken.value = current;
  }

  return refreshToken.value;
}

/**
 * Restore the session from the cookies into the application state. Called once
 * while the application starts up (`plugins/session.client.ts`).
 */
export function restoreStates() {
  const user = <any>useUser();
  const cookie_user = <any>useAppCookie("user");
  user.value = cookie_user.value ?? null;
  moderationAmbientChanged(user.value?.id);
  // The cookie is not the profile; the plugin loads that right afterwards.
  useProfileLoaded().value = false;

  const session = <any>useSession();
  const cookie_session = <any>useAppCookie("session");
  session.value = cookie_session.value ?? null;

  const accessToken = useAccessToken();
  const cookie_accessToken = <any>useAppCookie("accessToken");
  accessToken.value = cookie_accessToken.value ?? "";

  const refreshToken = useRefreshToken();
  const cookie_refreshToken = <any>useAppCookie("refreshToken");
  refreshToken.value = cookie_refreshToken.value ?? "";
}

export function syncSessionCookies() {
  const user = useUser();
  const session = useSession();
  const cookieUser = readSessionCookie("user");
  const cookieSession = readSessionCookie("session");
  if (user.value?.id !== cookieUser?.id) {
    user.value = cookieUser ?? null;
    useProfileLoaded().value = false;
    moderationAmbientChanged(user.value?.id);
  }
  if ((session.value as any)?.id !== cookieSession?.id) session.value = cookieSession ?? null;
  getAccessToken();
  getRefreshToken();
}

export function setStates(response: any, renewing = false, redirect = true) {
  // Publish synchronously before releasing the origin refresh lock. Nuxt's
  // default cookie watcher writes on the next tick and can expose the old pair.
  const written: string[] = [];
  const write = (name: string, value: any) => {
    if (typeof document !== "undefined" && typeof document.cookie === "string") {
      document.cookie = `${name}=${value == null ? "" : encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value))}; Path=/; Secure; SameSite=Lax${value == null ? "; Max-Age=0" : ""}`;
      written.push(name);
    } else useAppCookie<any>(name, { watch: false }).value = value;
  };
  if (!renewing) write("authGeneration", crypto.randomUUID());
  write(
    "user",
    response?.user
      ? {
          id: response.user.id ?? null,
          name: response.user.name ?? null,
          display_name: response.user.display_name ?? null,
        }
      : null
  );
  // Publish the complete cookie pair before reactive owner watchers can read it.
  write("session", response?.session ? { id: response.session.id ?? null } : null);
  write("accessToken", response?.access_token ?? null);
  write("refreshToken", response?.refresh_token ?? null);
  for (const name of written) refreshCookie(name);
  setUser(response?.user ?? null, false);
  // Login, signup and refresh answer with the full profile.
  useProfileLoaded().value = !!response?.user;

  const session = <any>useSession();
  session.value = response?.session ?? null;

  const accessToken = useAccessToken();
  accessToken.value = response?.access_token ?? null;

  const refreshToken = useRefreshToken();
  refreshToken.value = response?.refresh_token ?? null;

  const hideAnimation: any = useAppCookie("hideAnimationNextTime");
  if (hideAnimation.value == undefined) hideAnimation.value = false;

  // const showFreeQuizzesOnly: any = useAppCookie("showFreeQuizzesOnly");
  // if (showFreeQuizzesOnly.value == undefined) showFreeQuizzesOnly.value = false

  const lastViewCourse: any = useAppCookie("lastViewCourse");
  if (lastViewCourse.value == undefined) lastViewCourse.value = null;

  if (response == null && redirect && !isOnPublicLegalRoute()) {
    const router = useRouter();
    router.push("/auth/login");
  }
}

export const isAuth = computed((): boolean => {
  const accessToken = useAccessToken();
  return !!accessToken.value;
});

export const hasEmail = computed((): boolean => {
  const user = <any>useUser();
  return !!(user.value?.email ?? "");
});

export async function getUser() {
  try {
    if (!!!getAccessToken()) {
      throw { data: "Invalid Access Token" };
    }

    const response = await GET(`/auth/users/me`);

    setUser(response);
    useProfileLoaded().value = true;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function editUser(body: any) {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;

  try {
    if (!!!user_id) {
      throw { data: "Invalid User Id" };
    }

    const response = await PATCH(`/auth/users/${user_id}`, body);

    setUser(response);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

/**
 * Download everything the platform has stored about the authenticated user
 * (Art. 15 and 20 GDPR). The endpoint is rate limited, so a second call within
 * a few minutes answers with 429; that case gets its own translated message
 * because the backend detail is not translatable.
 */
export async function exportUserData() {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;

  try {
    if (!!!user_id) {
      throw { data: { detail: "Error.DownloadMyDataFailed" } };
    }

    const response = await GET(`/auth/users/${user_id}/export`);

    return [response, null];
  } catch (error: any) {
    const status = error?.status ?? error?.statusCode ?? null;

    if (status == 429) {
      return [null, { detail: "Error.DownloadMyDataRateLimit" }];
    }

    return [null, error?.data ?? { detail: "Error.DownloadMyDataFailed" }];
  }
}

export async function deleteUser() {
  const expected = getSessionSnapshot();
  const user_id = expected.userId;

  try {
    if (!!!user_id) {
      throw { data: "Invalid User Id" };
    }

    const response = await DELETE(`/auth/users/${user_id}`);

    const current = getSessionSnapshot();
    if (current.identity === expected.identity && current.generation === expected.generation)
      setStates(null);
    clearLearningStorage(user_id);
    broadcastLearningLogout(expected);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
