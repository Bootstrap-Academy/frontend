/**
 * Declarations a consumer can hand in without an account:
 *
 * - the cancellation of a contract (§ 312k BGB) and
 * - the withdrawal from a contract (§ 356a BGB).
 *
 * Both endpoints accept declarations without a session. An optional opaque
 * renewal reference supports safe agreement-specific processing; email alone
 * is only a candidate for operational identity review.
 */

export async function declareCancellation(body: any) {
  return submitPublicDeclaration("/contracts/cancellations", body);
}

export async function declareWithdrawal(body: any) {
  return submitPublicDeclaration("/contracts/withdrawals", body);
}

const pendingDeclarations = new Map<string, any>();
const storageName = (path: string) => `public-declaration-v1:${path}`;
function storedDeclaration(path: string) {
  const memory = pendingDeclarations.get(path);
  if (memory && Date.now() - memory.created < 24 * 60 * 60 * 1000) return memory;
  pendingDeclarations.delete(path);
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageName(path)) || "null");
    if (saved && Date.now() - saved.created < 24 * 60 * 60 * 1000) return saved;
    sessionStorage.removeItem(storageName(path));
  } catch {
    /* Receipt transport works when browser storage is unavailable. */
  }
  return null;
}
function retainDeclaration(path: string, value: any) {
  pendingDeclarations.set(path, value);
  try {
    sessionStorage.setItem(storageName(path), JSON.stringify(value));
  } catch {
    /* Print remains available. */
  }
}
export function hasRetainedDeclaration(path: string) {
  return !!storedDeclaration(path);
}
export function forgetRetainedDeclaration(path: string) {
  pendingDeclarations.delete(path);
  try {
    sessionStorage.removeItem(storageName(path));
  } catch {
    /* Optional storage. */
  }
}
function publicDeclarationResponse(response: any) {
  const source = response?.declaration;
  if (!source) return null;
  const declaration = Object.fromEntries(
    [
      "id",
      "kind",
      "received_at",
      "name",
      "email",
      "contract",
      "contract_designation",
      "cancellation_type",
      "details",
      "requested_end",
    ].map((key) => [key, source[key]])
  );
  return { declaration, confirmation_email_sent: response.confirmation_email_sent === true };
}
async function publicDeclarationRequest(path: string, body: any) {
  try {
    const response = await $fetch(path, {
      baseURL: useRuntimeConfig().public.BASE_API_URL,
      method: "POST",
      body,
      credentials: "omit",
      retry: 0,
    });
    return [publicDeclarationResponse(response), null];
  } catch (error: any) {
    return [null, error?.data ?? null];
  }
}
async function submitPublicDeclaration(path: string, body: any) {
  // Explicit retries of unchanged content keep the same capability. An accepted
  // receipt is never resubmitted, including after a lost response or reload.
  let saved = storedDeclaration(path);
  if (!saved || JSON.stringify(saved.body) !== JSON.stringify(body)) {
    saved = {
      created: Date.now(),
      body,
      key: { id: crypto.randomUUID(), secret: crypto.randomUUID() },
    };
    retainDeclaration(path, saved);
  }
  if (saved.receipt) return [publicDeclarationResponse(saved.receipt), null];
  const result = await publicDeclarationRequest(path, { ...body, request_key: saved.key });
  if (result[0]) retainDeclaration(path, { ...saved, receipt: result[0] });
  return result;
}
/** Explicit read-only recovery; never replays a declaration or requires a session. */
export async function recoverDeclarationReceipt(path: string) {
  const saved = storedDeclaration(path);
  if (!saved) return [null, null];
  if (saved.receipt) return [publicDeclarationResponse(saved.receipt), null];
  const result = await publicDeclarationRequest("/contracts/receipts", saved.key);
  if (result[0]) retainDeclaration(path, { ...saved, receipt: result[0] });
  return result;
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
  if (!date) return null;
  const offset =
    new Intl.DateTimeFormat("en", { timeZone: DECLARATION_TIME_ZONE, timeZoneName: "longOffset" })
      .formatToParts(new Date(`${date}T00:00:00Z`))
      .find((part) => part.type === "timeZoneName")
      ?.value.replace("GMT", "") || "+00:00";
  return `${date}T00:00:00${offset}`;
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
