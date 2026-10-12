/**
 * An account whose e-mail address is not confirmed is refused by the learning
 * services and gets no purchase offer. Its pages therefore lead to the
 * confirmation (`middleware/unverified.global.ts`), which sends one code by
 * itself and remembers that it did.
 */

type Account = { id?: string; email_verified?: boolean; admin?: boolean } | null | undefined;
type MailStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const VERIFY_PATH = "/auth/verify-account";
const MAIL_KEY = "verification-mail";

/**
 * The API keeps a code for four hours (the default of its `verification_code_ttl`),
 * and a later code does not end an earlier one.
 */
export const VERIFICATION_CODE_LIFETIME = 4 * 60 * 60 * 1000;

/**
 * Only a loaded profile says whether the address is confirmed: the `user`
 * cookie does not carry the field, so a missing value says nothing.
 */
export function needsEmailVerification(user: Account, profileLoaded: boolean): boolean {
  return !!profileLoaded && !!user?.id && user.email_verified === false;
}

/**
 * What an unconfirmed account still reaches: the public pages, the way into
 * and out of the account, the place to correct the address, its orders and
 * contract documents, and the two pages that handle the case themselves
 * (the guest handoff and the coin order).
 */
export function openToUnverified(path: string): boolean {
  const pathname = (path.split(/[?#]/, 1)[0] ?? "").toLowerCase().replace(/\/+$/, "") || "/";

  return (
    isPublicLegalRoute(pathname) ||
    /^\/(auth|account)(\/|$)/.test(pathname) ||
    ["/", "/start", "/contact", "/orders", "/profile/edit", "/morphcoins/paypal"].includes(pathname)
  );
}

/** The confirmation, with the way back to `target` unless that is the default. */
export function emailVerificationRoute(target: unknown = "") {
  const redirect = verifiedDestination(target);

  return redirect === "/dashboard"
    ? { path: VERIFY_PATH }
    : { path: VERIFY_PATH, query: { redirect } };
}

/** Where a confirmed account goes on: a page of this site that is not a login page. */
export function verifiedDestination(target: unknown): string {
  const path = internalPath(target);

  return path && !/^\/auth(\/|$|[?#])/i.test(path) ? path : "/dashboard";
}

/**
 * Where a navigation of an unconfirmed account leads instead, or nothing. The
 * services let administrators through, so they are not held up here either.
 */
export function emailVerificationRedirect(
  user: Account,
  profileLoaded: boolean,
  to: { path: string; fullPath: string }
) {
  if (!needsEmailVerification(user, profileLoaded) || user?.admin || openToUnverified(to.path))
    return;

  return emailVerificationRoute(to.fullPath);
}

function mailStorage(): MailStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Whether this browser asked for a code for this account that still works.
 * The note is shared by all tabs, so the link in the mail, which opens a new
 * tab, does not send a second one. A note past its time is removed.
 */
export function verificationMailNoted(
  userId: string | undefined,
  storage: MailStorage | null = mailStorage(),
  now = Date.now()
): boolean {
  try {
    const note = JSON.parse(storage?.getItem(MAIL_KEY) || "null");
    const current =
      typeof note?.at === "number" && note.at <= now && now - note.at < VERIFICATION_CODE_LIFETIME;
    if (note !== null && !current) storage?.removeItem(MAIL_KEY);

    return current && !!userId && note.id === userId;
  } catch {
    return false;
  }
}

/** False when the note cannot be kept; nothing is then sent without being asked for. */
export function noteVerificationMail(
  userId: string | undefined,
  storage: MailStorage | null = mailStorage(),
  now = Date.now()
): boolean {
  try {
    if (!userId || !storage) return false;
    storage.setItem(MAIL_KEY, JSON.stringify({ id: userId, at: now }));

    return verificationMailNoted(userId, storage, now);
  } catch {
    return false;
  }
}

/** After a refused request and after the confirmation there is nothing left to remember. */
export function forgetVerificationMail(
  userId: string | undefined,
  storage: MailStorage | null = mailStorage()
) {
  try {
    if (JSON.parse(storage?.getItem(MAIL_KEY) || "null")?.id === userId)
      storage?.removeItem(MAIL_KEY);
  } catch {
    /* A note that cannot be read is replaced by the next one. */
  }
}
