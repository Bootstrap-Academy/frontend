export type ApiErrorKind =
  | "daily_limit"
  | "hearts"
  | "session"
  | "conflict"
  | "throttle"
  | "access"
  | "unavailable"
  | "request";

export interface ApiError {
  kind: ApiErrorKind;
  status: number | null;
  code: string | null;
  messageKey: string;
  daily: unknown;
  retryAfter: number | null;
}

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown) => (typeof value === "string" ? value : "");

// Compatibility for the older services that send prose in detail instead of a code.
const legacyMessages: [string, string][] = [
  ["user already exists", "NicknameAlreadyExists"],
  ["email already exists", "EmailAlreadyExists"],
  ["invalid email", "InvalidEmail"],
  ["invalid oauth token", "InvalidOAuthToken"],
  ["invalid state", "InvalidOAuthState"],
  ["cannot delete last login method", "CannotDeleteLastLoginMethod"],
  ["connection not found", "LinkedLoginNotFound"],
  ["remote already linked", "RemoteAlreadyLinked"],
  ["registration disabled", "RegistrationDisabled"],
  ["no login method", "NoLoginMethod"],
  ["invalid credentials", "InvalidCredentials"],
  ["user disabled", "UserDisabled"],
  ["could not send message", "MessageNotSubmitted"],
  ["user not found", "UserNotFound"],
  ["permission denied", "PermissionDenied"],
  ["invalid verification code", "InvalidVerificationCode"],
  ["email already verified", "EmailAlreadyVerified"],
  ["mfa already enabled", "MFAAlreadyEnabled"],
  ["mfa not initialized", "MFANotInitialized"],
  ["mfa not enabled", "MFANotEnabled"],
  ["password reset failed", "PasswordResetFailed"],
  ["invalid code", "InvalidCode"],
  ["provider not found", "ProviderNotFound"],
  ["insufficient rating", "WebinarPrice"],
  ["skills_not_found", "SkillNotFound"],
  ["no course access", "NoCourseAccess"],
  ["not enough coins", "NotEnoughCoins"],
  ["withdrawal consent missing", "WithdrawalConsentMissing"],
  ["cannot start in the past", "CannotStartInPast"],
  ["too many failed login attempts", "TooManyFailedLoginAttempts"],
  ["too many requests", "TooManyRequests"],
  ["email not verified", "AccountNotVerified"],
];
const codeMessages: Record<string, string> = {
  forbidden: "NotAllowed",
  invalid_single_choice: "SelectAtLeastOneOption",
  skills_not_found: "SkillNotFound",
  category_not_found: "CategoryNotFound",
  evaluator_failed: "EvaluatorFailed",
  testcase_failed: "SolutionCodeFailed",
  challenge_not_found: "ChallengeNotFound",
  subtask_not_found: "QuizOrCodingChallengeNotFound",
  not_enough_coins: "NotEnoughCoins",
  banned: "UserIsBanned",
  unverified: "AccountNotVerified",
};

const translatedKeys = new Set([
  ...legacyMessages.map(([, key]) => `Error.${key}`),
  ...Object.values(codeMessages).map((key) => `Error.${key}`),
  "Error.TryAgainLater",
  "Error.LearningUnavailable",
  "Error.LearningSession",
  "Error.LearningConflict",
  "Error.DailyLimitReached",
  "Error.NotEnoughHearts",
]);

/** Decode server errors for presentation only. This never grants access or creates a verdict. */
export function decodeApiError(error: unknown): ApiError {
  const source = object(error);
  const response = object(source.response);
  const body = object(source.data ?? response._data ?? source._data ?? error);
  const detail = object(body.detail);
  const validation = Array.isArray(body.detail) ? object(body.detail[0]) : {};
  const code =
    text(body.code) || text(body.error) || text(detail.code) || text(detail.error) || null;
  const description = text(body.detail) || text(detail.msg) || text(validation.msg) || text(error);
  const rawStatus = source.statusCode ?? source.status ?? response.status;
  const status =
    typeof rawStatus === "number" &&
    Number.isInteger(rawStatus) &&
    rawStatus >= 400 &&
    rawStatus <= 599
      ? rawStatus
      : null;
  const headerSource = (source.headers ?? response.headers) as
    | { get?: (name: string) => string | null }
    | undefined;
  const retry =
    body.retry_after ??
    (typeof headerSource?.get === "function" ? headerSource.get("retry-after") : null);
  const retryNumber =
    typeof retry === "number" ? retry : /^\d+$/.test(text(retry)) ? Number(retry) : NaN;
  const retryAfter = Number.isSafeInteger(retryNumber) && retryNumber > 0 ? retryNumber : null;
  let kind: ApiErrorKind = "request";
  let messageKey = "Error.TryAgainLater";

  // A transport/server failure cannot become a limit or a wrong answer from its body.
  if (status === 408 || (status !== null && status >= 500)) {
    kind = "unavailable";
    messageKey = "Error.LearningUnavailable";
  } else if (
    status === 401 ||
    ["session_changed", "learning_session_required"].includes(code || "")
  ) {
    kind = "session";
    messageKey = "Error.LearningSession";
  } else if (status === 409) {
    kind = "conflict";
    messageKey = "Error.LearningConflict";
  } else if (code === "daily_limit_reached") {
    kind = "daily_limit";
    messageKey = "Error.DailyLimitReached";
  } else if (code === "not_enough_hearts" || description.startsWith("Error.NotEnoughHearts")) {
    kind = "hearts";
    messageKey = "Error.NotEnoughHearts";
  } else if (status === 429 || code === "too_many_requests") {
    kind = "throttle";
    messageKey = "Error.TooManyRequests";
  } else if (
    ["not_enough_coins", "permission_denied", "subtask_access_denied", "forbidden"].includes(
      code || ""
    )
  ) {
    kind = "access";
    messageKey = "Error.NoCourseAccess";
  }

  if (
    kind === "request" ||
    kind === "access" ||
    kind === "throttle" ||
    kind === "session" ||
    kind === "conflict"
  ) {
    const legacy = legacyMessages.find(([fragment]) =>
      description.toLowerCase().includes(fragment)
    );
    if (legacy) messageKey = `Error.${legacy[1]}`;
    else if (code && Object.hasOwn(codeMessages, code)) messageKey = `Error.${codeMessages[code]}`;
    else if (translatedKeys.has(description)) messageKey = description;
  }
  return {
    kind,
    status,
    code,
    messageKey,
    daily: body.daily ?? detail.daily,
    retryAfter,
  };
}
