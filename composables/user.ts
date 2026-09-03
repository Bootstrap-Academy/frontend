import { useState } from "#app";
import { User } from "~/types/userTypes";

export const useUser = () => useState<User>("user", () => new User());
export const useSession = () => useState("session", () => null);
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

export function setUser(value: any) {
  const user = <any>useUser();
  const cookie_user = <any>useAppCookie("user");

  user.value = value ?? null;
  cookie_user.value = toCookieUser(value);
}

export function getAccessToken() {
  const accessToken: any = useAccessToken();

  if (!!!accessToken.value) return null;

  const cookie_accessToken = useAppCookie("accessToken");
  if (cookie_accessToken.value != accessToken.value) {
    accessToken.value = cookie_accessToken.value;
  }

  return accessToken.value;
}

export function getRefreshToken() {
  const refreshToken: any = useRefreshToken();

  if (!!!refreshToken.value) return null;

  const cookie_refreshToken = useAppCookie("refreshToken");
  if (cookie_refreshToken.value != refreshToken.value) {
    refreshToken.value = cookie_refreshToken.value;
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

export function setStates(response: any) {
  setUser(response?.user ?? null);
  // Login, signup and refresh answer with the full profile.
  useProfileLoaded().value = !!response?.user;

  const session = <any>useSession();
  const cookie_session = <any>useAppCookie("session");
  session.value = response?.session ?? null;
  // Only the identifier of the session belongs in the cookie.
  cookie_session.value = session.value ? { id: session.value.id ?? null } : null;

  const accessToken = useAccessToken();
  const cookie_accessToken = useAppCookie("accessToken");
  accessToken.value = response?.access_token ?? null;
  cookie_accessToken.value = accessToken.value;

  const refreshToken = useRefreshToken();
  const cookie_refreshToken = useAppCookie("refreshToken");
  refreshToken.value = response?.refresh_token ?? null;
  cookie_refreshToken.value = refreshToken.value;

  const hideAnimation: any = useAppCookie("hideAnimationNextTime");
  if (hideAnimation.value == undefined) hideAnimation.value = false;

  // const showFreeQuizzesOnly: any = useAppCookie("showFreeQuizzesOnly");
  // if (showFreeQuizzesOnly.value == undefined) showFreeQuizzesOnly.value = false

  const lastViewCourse: any = useAppCookie("lastViewCourse");
  if (lastViewCourse.value == undefined) lastViewCourse.value = null;

  if (response == null) {
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

export async function deleteUser() {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;

  try {
    if (!!!user_id) {
      throw { data: "Invalid User Id" };
    }

    const response = await DELETE(`/auth/users/${user_id}`);

    setStates(null);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
