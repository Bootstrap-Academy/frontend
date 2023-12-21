import { useState } from '#app';
import { User } from '~/types/userTypes';

export const useUser = () => useState<User>('user', () => new User());
export const useSession = () => useState('session', () => null);
export const useAccessToken = () => useState('accessToken', () => '');
export const useRefreshToken = () => useState('refreshToken', () => '');
export const useShowConfetti = () => useState('showConfetti', () => false);


export function getAccessToken() {
  const accessToken: any = useAccessToken();

  if (!!!accessToken.value) return null;

  const cookie_accessToken = useCookie("accessToken");
  if (cookie_accessToken.value != accessToken.value) {
    accessToken.value = cookie_accessToken.value;
  }

  return accessToken.value;
}

export function getRefreshToken() {
  const refreshToken: any = useRefreshToken();

  if (!!!refreshToken.value) return null;

  const cookie_refreshToken = useCookie("refreshToken");
  if (cookie_refreshToken.value != refreshToken.value) {
    refreshToken.value = cookie_refreshToken.value;
  }

  return refreshToken.value;
}

export function setStates(response: any) {
  const user = useUser();
  const cookie_user = <any>useCookie("user");
  user.value = response?.user ?? null;
  cookie_user.value = user.value;

  const session = useSession();
  const cookie_session = <any>useCookie("session");
  session.value = response?.session ?? null;
  cookie_session.value = session.value;

  const accessToken = useAccessToken();
  const cookie_accessToken = useCookie("accessToken");
  accessToken.value = response?.access_token ?? null;
  cookie_accessToken.value = accessToken.value;

  const refreshToken = useRefreshToken();
  const cookie_refreshToken = useCookie("refreshToken");
  refreshToken.value = response?.refresh_token ?? null;
  cookie_refreshToken.value = refreshToken.value;

  const hideAnimation: any = useCookie("hideAnimationNextTime");
  if (hideAnimation.value == undefined) hideAnimation.value = false;

  // const showFreeQuizzesOnly: any = useCookie("showFreeQuizzesOnly");
  // if (showFreeQuizzesOnly.value == undefined) showFreeQuizzesOnly.value = false

  const lastViewCourse: any = useCookie("lastViewCourse");
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
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;

  try {
    if (!!!user_id) {
      throw { data: "Invalid User Id" };
    }
    const response = await GET(`/auth/users/${user_id}`);

    const user = useUser();
    const cookie_user = <any>useCookie("user");
    user.value = response ?? null;
    cookie_user.value = user.value;

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

    const user = useUser();
    const cookie_user = <any>useCookie("user");
    user.value = response ?? null;
    cookie_user.value = user.value;

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
