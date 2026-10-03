import { GET, POST } from "./fetch";
import { revokeSession, withSessionRefreshLock } from "~/utils/sessionRefresh";
import { clearLearningStorage, prepareLearningLogout } from "~/utils/learningStorage";

export const useOauthProviders = () => useState("oauthProviders", () => []);

export async function getOAuthProviders() {
  try {
    const response = await GET("/auth/oauth/providers");

    const oauthProviders = useOauthProviders();
    oauthProviders.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function loginViaOAuthProvider(body: any) {
  try {
    const response = await POST(`/auth/sessions/oauth`, body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function refresh(expected = getSessionSnapshot(), clearOnInvalid = true) {
  try {
    const response = await refreshSession(expected, clearOnInvalid);
    return [response, null];
  } catch (error: any) {
    return [null, error];
  }
}

export async function logout() {
  const expected = getSessionSnapshot();
  const config = useRuntimeConfig().public;

  try {
    const userId = useUser().value?.id || "";
    if (
      !(await prepareLearningLogout(userId, () =>
        window.confirm(
          String(readSessionCookie("locale") || "de").startsWith("en")
            ? "Logging out removes the copy of your work from this browser. Any work that isn't saved in your account may be lost. Log out anyway?"
            : "Beim Abmelden löschen wir die Kopie deiner Arbeit aus diesem Browser. Was noch nicht im Konto gespeichert ist, kann dabei verloren gehen. Trotzdem abmelden?"
        )
      ))
    )
      return [false, null];
    // Preparation may await a save or a dialog; never clear a subsequent login.
    const current = getSessionSnapshot();
    if (current.identity !== expected.identity || current.generation !== expected.generation)
      return [false, null];
    // The explicit action ends this browser session immediately, including
    // when its refresh token has already been revoked or the API is offline.
    setStates(null);
    try {
      clearLearningStorage(userId);
    } catch {
      // Browser cleanup must never prevent revoking this session on the server.
    }

    // Calendar Composable
    const calendar = useCalendar();
    calendar.value = null;
    const ics = useICS();
    ics.value = "";
    const events = useEvents();
    events.value = [];
    const eventFilter = useEventFilter();
    eventFilter.value = "all";

    // Coaching Composable
    const coachings = useCoachings();
    coachings.value = [];

    // Coins Composable
    const coins = useCoins();
    coins.value = 0;
    const paypalClientID = usePaypalClientID();
    paypalClientID.value = "";

    // Course Composable
    const myCourses = useMyCourses();
    myCourses.value = [];
    const courses = useCourses();
    courses.value = [];
    const course = useCourse();
    course.value = null;
    const videoSRC = useVideoSRC();
    videoSRC.value = "";

    // Ratings Composable
    const unratedWebinars = useUnratedWebinars();
    unratedWebinars.value = [];

    // Webinars Composable
    const webinar = useWebinar();
    webinar.value = null;
    const webinars = useWebinars();
    webinars.value = [];
    const myWebinars = useMyWebinars();
    myWebinars.value = [];

    // XP Composable
    const xp = useXP();
    xp.value = 0;

    if (!expected.identity || (!expected.accessToken && !expected.refreshToken))
      return [true, null];
    const response = await revokeSession({
      expected,
      lock: withSessionRefreshLock,
      raw: (path, method, body, token) =>
        $fetch(`${config.BASE_API_URL}${path}`, {
          method,
          body: body as any,
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
          retry: 0,
          timeout: 20000,
        }),
    });
    // A late result never changes state belonging to a subsequent login.
    return [response, null];
  } catch (error) {
    return [null, error];
  }
}

export async function login(body: any) {
  try {
    const response = await POST("/auth/sessions", body);
    setStates(response);
    // await getPremiumStatus()
    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function signup(body: any) {
  try {
    const response = await POST("/auth/users", body);

    setStates(response);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function requestEmailVerification() {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;
  let user_email = user?.value?.email ?? null;
  let isAccountVerified = user?.value?.email_verified ?? false;

  if (isAccountVerified) return [true, null];

  try {
    if (!!!user_id) {
      throw { data: { detail: "Invalid User Id" } };
    }
    if (!!!user_email) {
      throw { data: { detail: "User does not have email" } };
    }

    const response = await POST(`/auth/users/${user_id}/email`);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function verifyAccount(body: any) {
  try {
    const response = await PUT(`/auth/users/me/email`, body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function forgotPassword(body: any) {
  try {
    const response = await POST("/auth/password_reset", body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function resetPassword(body: any) {
  try {
    const response = await PUT("/auth/password_reset", body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
