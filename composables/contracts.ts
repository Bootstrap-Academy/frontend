/**
 * Declarations a consumer can hand in without an account:
 *
 * - the cancellation of a contract (§ 312k BGB) and
 * - the withdrawal from a contract (§ 356a BGB).
 *
 * Both endpoints are public. The contract is identified by the e-mail address
 * it is held under, so no session is required.
 */

export async function declareCancellation(body: any) {
  try {
    const response = await POST(`/contracts/cancellations`, body);

    return [response, null];
  } catch (error: any) {
    return [null, error?.data ?? null];
  }
}

export async function declareWithdrawal(body: any) {
  try {
    const response = await POST(`/contracts/withdrawals`, body);

    return [response, null];
  } catch (error: any) {
    return [null, error?.data ?? null];
  }
}

/**
 * The receipt of a declaration is documented in Europe/Berlin time so that the
 * record on screen carries the same moment as the confirmation e-mail, no
 * matter which time zone the browser is set to.
 */
export const DECLARATION_TIME_ZONE = "Europe/Berlin";

/** `2026-09-03T12:12:05Z` -> `03.09.2026, 14:12:05` (de) */
export function formatDeclarationDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (!!!value || Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: DECLARATION_TIME_ZONE,
  }).format(date);
}

/** `2026-10-01T00:00:00Z` -> `01.10.2026` (de) */
export function formatDeclarationDate(value: string, locale: string) {
  const date = new Date(value);
  if (!!!value || Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: DECLARATION_TIME_ZONE,
  }).format(date);
}

/**
 * The date picked in a `type="date"` input (`2026-12-31`) as the ISO-8601 UTC
 * timestamp the API expects, or `null` for "at the earliest possible date".
 */
export function toRequestedEnd(date: string) {
  return !!date ? `${date}T00:00:00Z` : null;
}

/** The contract options offered on the two declaration pages. */
export const CONTRACT_LABELS: Record<string, string> = {
  COINS: "Inputs.ContractCoins",
  PREMIUM: "Inputs.ContractPremium",
  OTHER: "Inputs.ContractOther",
};

/** The kinds of cancellation offered on the cancellation page. */
export const CANCELLATION_TYPE_LABELS: Record<string, string> = {
  ORDINARY: "Inputs.OrdinaryCancellation",
  EXTRAORDINARY: "Inputs.ExtraordinaryCancellation",
};

/**
 * The locale key for the snackbar shown when a declaration could not be
 * handed in. The consumer must never be left without a way to declare, so
 * every unknown failure falls back to the message naming our e-mail address.
 */
export function declarationErrorKey(error: any) {
  const detail = error?.detail;

  return typeof detail === "string" && detail.startsWith("Error.")
    ? detail
    : "Error.DeclarationNotSubmitted";
}
