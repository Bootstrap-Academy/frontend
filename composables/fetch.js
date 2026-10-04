import { jwtDecode } from "jwt-decode";
import { decodeApiError } from "~/utils/apiError";
import {
  sessionRefreshMutex,
  sameSession,
  sameSessionContext,
  sameSessionPair,
} from "~/utils/sessionRefresh";

export const mutex = sessionRefreshMutex;

export function GET(url, query) {
  return createApiFetch(url, "GET", null, query);
}

/** @param {unknown} body */
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
  const snapshot = getSessionSnapshot();
  const accessToken = snapshot.accessToken;

  const requestOptions = {
    baseURL: config.BASE_API_URL,
    method: method,
    body: body,
    query: query,
    _session: snapshot,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    onRequest,
    onResponse,
    onResponseError,
  };

  try {
    return await $fetch(url, requestOptions);
  } catch (error) {
    const retryResult = await attemptAuthRetry(error, url, error?.options ?? requestOptions);
    if (retryResult.handled) {
      if (retryResult.success) {
        return retryResult.data;
      }
      throw retryResult.error ?? error;
    }
    throw error;
  }
}

const onRequest = async ({ options }) => {
  if (options._session && !sameSessionContext(options._session, getSessionSnapshot()))
    throw { statusCode: 401, data: { error: "session_changed" } };
  if (isAccessTokenExpired()) {
    const [success, error] = await refresh(options._session);
    if (!success) throw error;
  }
  if (options._session && !sameSessionContext(options._session, getSessionSnapshot()))
    throw { statusCode: 401, data: { error: "session_changed" } };
  options._session = getSessionSnapshot();
  options.headers = normalizeHeaders(options.headers);
  options.headers.set("Authorization", `Bearer ${getAccessToken()}`);
};

const onResponse = async ({ request, options, response }) => {
  if (options._session && !sameSessionContext(options._session, getSessionSnapshot()))
    throw { statusCode: 401, data: { error: "session_changed" } };
  let status = response?.ok ?? null;
  const config = useRuntimeConfig().public;
  if (config.NODE_ENV == "development" && status == true) {
    console.log("success", response._data);
  }
};

const onResponseError = async (context) => {
  const { options } = context;
  const response = context.response;
  if (options._session && !sameSessionContext(options._session, getSessionSnapshot())) return;
  const decoded = decodeApiError(response);
  const details =
    typeof response?._data?.detail === "string" ? response._data.detail.toLowerCase() : "";
  const code = decoded.code?.toLowerCase() || "";
  if (
    response?.status === 401 &&
    !options._retry &&
    (details.includes("invalid token") ||
      details.includes("invalid refresh token") ||
      code === "invalid_token")
  ) {
    options._shouldRetry = true;
    return;
  }
  if (details.includes("invalid token") || details.includes("invalid refresh token"))
    logoutAfterInvalidToken(options._session);

  const payload = response?._data;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
  // Keep structured refusals/receipts intact for learning and committed operations.
  if (payload.detail && typeof payload.detail === "object") return;
  payload.detail = decoded.messageKey;
  if (decoded.messageKey === "Error.TooManyFailedLoginAttempts")
    payload.retry_after = decoded.retryAfter || 0;
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

async function attemptAuthRetry(error, url, options) {
  const response = error?.response;
  if (!response || response.status !== 401 || !options._shouldRetry) {
    return { handled: false };
  }
  options._shouldRetry = false;
  const expected = options._session;
  if (!expected?.identity || !sameSession(expected, getSessionSnapshot()))
    return { handled: true, success: false, error };
  const [data, retryError, attempted] = await retryRequestWithFreshToken(url, options);
  if (data !== null) return { handled: true, success: true, data };
  if (retryError?.response?.status === 401) logoutAfterInvalidToken(attempted);
  return { handled: true, success: false, error: retryError ?? error };
}

async function retryRequestWithFreshToken(request, options) {
  const expected = options._session;
  const [success, refreshError] = await refresh(expected);
  if (!success) return [null, refreshError, null];
  if (!sameSession(expected, getSessionSnapshot()))
    return [null, { statusCode: 401, data: { error: "session_changed" } }, null];
  const retryOptions = cloneRequestOptions(options);
  retryOptions._retry = true;
  retryOptions._session = getSessionSnapshot();
  try {
    const data = await $fetch(request, retryOptions);
    return [data, null, retryOptions._session];
  } catch (error) {
    return [null, error, retryOptions._session];
  }
}

function cloneRequestOptions(options) {
  const baseOptions = options ? { ...options } : {};
  const headers = normalizeHeaders(baseOptions.headers);
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  baseOptions.headers = headers;
  return baseOptions;
}

function logoutAfterInvalidToken(expected) {
  if (!expected || !sameSessionPair(expected, getSessionSnapshot())) return;
  const router = useRouter();
  const route = useRoute();

  setStates(null);

  if (
    isOnPublicLegalRoute() ||
    route.fullPath.includes("/auth") ||
    route.fullPath === "/" ||
    route.fullPath === "/contact" ||
    route.fullPath === "/skill-tree"
  ) {
    return;
  }

  router.push(`/auth/login?redirect=${route.fullPath}`);
}

function normalizeHeaders(headers) {
  return new Headers(headers ?? {});
}
