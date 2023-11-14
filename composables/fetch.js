import { jwtDecode } from "jwt-decode";
import { Mutex, Semaphore, withTimeout } from "async-mutex";

export const mutex = new Mutex();

export function GET(url, query) {
  return createApiFetch(url, "GET", null, query);
}

export function POST(url, body = null) {
  return createApiFetch(url, "POST", body);
}

export function PATCH(url, body = null) {
  return createApiFetch(url, "PATCH", body);
}

export function PUT(url, body = null) {
  return createApiFetch(url, "PUT", body);
}

export function DELETE(url, body = null) {
  return createApiFetch(url, "DELETE", body);
}

async function createApiFetch(url, method, body, query) {
  const config = useRuntimeConfig().public;
  const accessToken = getAccessToken();

  return $fetch(url, {
    baseURL: config.BASE_API_URL,
    method: method,
    body: body,
    query: query,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    onRequest,
    onResponse,
    onResponseError,
  });
}

const onRequest = async ({ request, options }) => {
  if (!isAccessTokenExpired(1)) return;

  if (mutex.isLocked()) {
    await mutex.waitForUnlock();
    const accessToken = getAccessToken();

    options.headers.Authorization = `Bearer ${accessToken}`;
  } else {
    const release = await mutex.acquire();
    const [success, error] = await refresh();
    release();
    if (success) {
      const accessToken = getAccessToken();

      options.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
};

const onResponse = async ({ request, options, response }) => {
  let status = response?.ok ?? null;
  const config = useRuntimeConfig().public;
  if (config.NODE_ENV == "development" && status == true) {
    console.log("success", response._data);
  }
};

const onResponseError = async ({ request, options, response }) => {
  // if (response.status == 403) {
  //   console.log("resoinse._Data", response._data.detail);
  //   openSnackbar("error", "Error.NotAllowed");
  //   return;
  // }

  let details = response?._data?.detail ?? "";
  if (typeof details == "object") {
    console.log("details error as object", details);
    let loc = details[0]?.loc ?? [];
    loc = loc.toString();
    loc = loc.replace(/_/g, " ");
    loc = loc.replace("body,", "");
    loc = loc.replace(/,/g, " ");
    let msg = details[0]?.msg ?? details?.msg ?? "";
    response._data.detail = `${loc} : ${msg}`;
    details = msg;
  } else if (details == "") {
    response._data.detail = "No error msg";
  } else {
    details = details.toLocaleLowerCase();
  }

  const config = useRuntimeConfig().public;
  if (config.NODE_ENV == "development") {
    // console.log("error", details);
  }

  if (
    details.toLocaleLowerCase().includes("invalid token") ||
    details.toLocaleLowerCase().includes("invalid refresh token")
  ) {
    const router = useRouter();
    const route = useRoute();
    if (
      route.fullPath.includes("/auth") ||
      route.fullPath == "/" ||
      route.fullPath == "/contact" ||
      route.fullPath == "/skill-tree"
    ) {
    } else {
      setStates(null);
      router.push(`/auth/login?redirect=${route.fullPath}`);
    }
  }

  if (details.includes("user already exists")) {
    return (response._data.detail = "Error.NicknameAlreadyExists");
  } else if (details.includes("email already exists")) {
    return (response._data.detail = "Error.EmailAlreadyExists");
  } else if (details.includes("invalid email")) {
    return (response._data.detail = "Error.InvalidEmail");
  } else if (details.includes("invalid OAuth token")) {
    return (response._data.detail = "Error.InvalidOAuthToken");
  } else if (details.includes("registration disabled")) {
    return (response._data.detail = "Error.RegistrationDisabled");
  } else if (details.includes("no login method")) {
    return (response._data.detail = "Error.NoLoginMethod");
  } else if (details.includes("invalid credentials")) {
    return (response._data.detail = "Error.InvalidCredentials");
  } else if (details.includes("user disabled")) {
    return (response._data.detail = "Error.UserDisabled");
  } else if (details.includes("recaptcha failed")) {
    return (response._data.detail = "Error.RecaptchaFailed");
  } else if (details.includes("could not send message")) {
    return (response._data.detail = "Error.MessageNotSubmitted");
  } else if (details.includes("user not found")) {
    return (response._data.detail = "Error.UserNotFound");
  } else if (details.includes("permission denied")) {
    return (response._data.detail = "Error.PermissionDenied");
  } else if (details.includes("invalid verification code")) {
    return (response._data.detail = "Error.InvalidVerificationCode");
  } else if (details.includes("email already verified")) {
    return (response._data.detail = "Error.EmailAlreadyVerified");
  } else if (details.includes("newsletter already subscribed")) {
    return (response._data.detail = "Error.NewsletterAlreadySubscribed");
  } else if (details.includes("mfa already enabled")) {
    return (response._data.detail = "Error.MFAAlreadyEnabled");
  } else if (details.includes("mfa not initialized")) {
    return (response._data.detail = "Error.MFANotInitialized");
  } else if (details.includes("mfa not enabled")) {
    return (response._data.detail = "Error.MFANotEnabled");
  } else if (details.includes("password reset failed")) {
    return (response._data.detail = "Error.PasswordResetFailed");
  } else if (details.includes("invalid code")) {
    return (response._data.detail = "Error.InvalidCode");
  } else if (details.includes("provider not found")) {
    return (response._data.detail = "Error.ProviderNotFound");
  } else if (details.includes("Insufficient rating")) {
    return (response._data.detail = "Error.WebinarPrice");
  } else if (details.includes("skills_not_found")) {
    return (response._data.detail = "Error.SkillNotFound");
  } else if (details.includes("no course access")) {
    return (response._data.detail = "Error.NoCourseAccess");
  } else if (details.includes("not enough coins")) {
    return (response._data.detail = "Error.NotEnoughCoins");
  } else if (details.includes("cannot start in the past")) {
    return (response._data.detail = "Error.CannotStartInPast");
  } else if (details.includes("email not verified")) {
    // return openSnackbar("error", "Error.AccountNotVerified");
    return (response._data.detail = "Error.AccountNotVerified");
  }

  // console.log("before details error", details);

  details = response?._data.error;
  console.log("details error", details);
  console.log("response from error", response);
  if (details.toLocaleLowerCase().includes("forbidden")) {
    response._data.detail = "Error.NotAllowed";
  } else if (details.toLocaleLowerCase().includes("too_many_requests")) {
    response._data.detail = "Error.TooManyAttemptsForQuiz";
  } else if (details.toLocaleLowerCase().includes("invalid_single_choice")) {
    response._data.detail = "Error.SelectAtLeastOneOption";
  } else if (details.toLocaleLowerCase().includes("skills_not_found")) {
    response._data.detail = "Error.SkillNotFound";
  } else if (details.toLocaleLowerCase().includes("category_not_found")) {
    response._data.detail = "Error.CategoryNotFound";
  } else if (details.toLocaleLowerCase().includes("evaluator_failed")) {
    response._data.detail = "Error.evaluatorFailed";
  } else if (details.toLocaleLowerCase().includes("testcase_failed")) {
    response._data.detail = "Error.SolutionCodeFailed";
  } else if (details.toLocaleLowerCase().includes("challenge_not_found")) {
    response._data.detail = "Error.ChallengeNotFound";
  } else if (details.toLocaleLowerCase().includes("not_enough_coins")) {
    response._data.detail = "Error.NotEnoughCoins";
  } else if (details.toLocaleLowerCase().includes("banned")) {
    response._data.detail = "Error.UserIsBanned";
  } else if (details.toLocaleLowerCase().includes("unverified")) {
    return (response._data.detail = "Error.AccountNotVerified");
  }
  console.log("end");
  return response;
};

function isAccessTokenExpired() {
  const accessToken = getAccessToken();

  try {
    if (!!!accessToken) {
      throw { data: "Invalid Access Token: " + accessToken };
    }

    let exp = jwtDecode(accessToken).exp;
    let time = parseInt(Math.round(new Date().getTime() / 1000));
    let difference = exp - time;
    let isTokenExpired = difference <= 100 ? true : false;

    return isTokenExpired;
  } catch (error) {
    return false;
  }
}
