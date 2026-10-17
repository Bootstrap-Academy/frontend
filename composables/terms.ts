import { englishDate, germanDate, parseEffectiveStart } from "~/utils/legalEffectiveDate";

/**
 * Terms offered at signup until terms 2026-10 take effect, and the version the gate for
 * existing accounts asks for. Existing accounts and stored contracts are not migrated.
 */
export const TERMS_VERSION = "2026-09-r4";

/**
 * Terms and withdrawal instruction 2026-10. They take effect at `TERMS_2026_10_FROM` of the
 * public runtime config (`NUXT_PUBLIC_TERMS_2026_10_FROM`, rules in
 * `utils/legalEffectiveDate.ts`). While it is unset their pages do not exist. Once it is set,
 * the pages of 2026-10 say until that moment that the version does not apply yet, and from that
 * moment the main pages show it and signup offers it. Nobody with an account is asked to
 * accept it. The site is generated statically, so the moment is compared with the clock of the
 * browser when a page or form is set up.
 */
export const TERMS_2026_10 = "2026-10";

export function terms202610(now = Date.now()) {
  const from = parseEffectiveStart(String(useRuntimeConfig().public.TERMS_2026_10_FROM || ""));
  return {
    published: !!from,
    inForce: !!from && now >= from.getTime(),
    date: from ? germanDate(from) : "",
    dateEn: from ? englishDate(from) : "",
  };
}

/** The page that shows exactly this version of the terms: the main page while it is in force. */
export function termsDocumentUrl(version: string) {
  const current = terms202610().inForce ? TERMS_2026_10 : TERMS_VERSION;
  return version === current
    ? "/docs/terms-and-conditions"
    : `/docs/terms-and-conditions-${version}`;
}

/** New signup can offer a separate approved version without migrating old accounts. */
export function registrationTerms() {
  if (terms202610().inForce)
    return { version: TERMS_2026_10, url: `/docs/terms-and-conditions-${TERMS_2026_10}` };
  const config = useRuntimeConfig().public;
  const version = String(config.registrationTermsVersion || "");
  const url = String(config.registrationTermsUrl || "");
  if (!version && !url) return { version: TERMS_VERSION, url: "/docs/terms-and-conditions" };
  if (!version || url !== `/docs/terms-and-conditions-${version}`)
    throw new Error("Registration terms configuration is incomplete");
  return { version, url };
}

/**
 * The version signup offers after the server refused `refused`: the other side of the start
 * of terms 2026-10. The server decides by its own clock, so the browser's clock is not asked
 * again; a clock that is off around the start would otherwise send the refused version again.
 */
export function registrationTermsAfterRefusal(refused: string) {
  if (!terms202610().published) return registrationTerms();
  return refused === TERMS_2026_10
    ? { version: TERMS_VERSION, url: termsDocumentUrl(TERMS_VERSION) }
    : { version: TERMS_2026_10, url: `/docs/terms-and-conditions-${TERMS_2026_10}` };
}

/**
 * Routes on which the re-acceptance gate stays hidden: the documents the gate
 * links to, the account page the user needs in order to delete the account
 * instead of accepting, and the two declaration pages. § 312k Abs. 2 BGB and
 * § 356a BGB want the cancellation and the withdrawal to be reachable
 * directly, so nothing may be put in front of them - least of all a dialog
 * about the very terms the user is about to leave behind.
 */
function isTermsGateExemptRoute(path: string) {
  return isPublicLegalRoute(path) || path === "/account" || path.startsWith("/account/");
}

/**
 * Whether the gate has been dismissed with "decide later" since the app was
 * loaded. This lives in the Nuxt state and nowhere else: no cookie, no storage,
 * so the gate is shown again on the next app start as long as the user has not
 * accepted. The refusal itself is recorded on the server.
 */
export const useTermsGateDismissed = () => useState("termsGateDismissed", () => false);

/**
 * Whether the logged in user still has to accept the current version of the
 * terms and conditions. Accounts created before the acceptance was recorded
 * have no `terms_version` at all and are asked as well.
 *
 * Nothing is kept on the client: the answer is derived from the user profile
 * that `GET /auth/users/me` returns, so the server row is the only record.
 * As long as that profile has not arrived - a slow or unreachable API - the
 * gate stays closed: the `user` cookie carries no `terms_version`, and asking
 * again would let a user who has long accepted record a refusal by mistake.
 */
export function needsTermsAcceptance(path: string) {
  const user = <any>useUser();

  if (!!!isAuth.value || !!!user.value?.id) return false;
  if (!!!useProfileLoaded().value) return false;
  if (useTermsGateDismissed().value) return false;
  if (isTermsGateExemptRoute(path)) return false;
  // Once terms 2026-10 apply, the gate would offer r4, a version no new contract gets any more.
  // Accounts below r4 keep their version (AGB 20.3); every order binds its own version anyway.
  if (terms202610().inForce) return false;

  // A registration-only version does not ask valid existing accounts to migrate,
  // and a new account must never be prompted to accept an older legacy version.
  // An account that signed up on 2026-10 is never asked to go back to r4.
  const accepted = [TERMS_VERSION, registrationTerms().version];
  if (terms202610().published) accepted.push(TERMS_2026_10);
  return !accepted.includes(user.value.terms_version);
}

/**
 * Record the acceptance of the current version of the terms and conditions and
 * refresh the profile, so the gate closes with the state the server has.
 */
export async function acceptTerms() {
  try {
    const response = await POST(`/auth/users/me/terms`, {
      terms_version: TERMS_VERSION,
      age_confirmed: true,
    });

    await getUser();

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

/**
 * Record that the user does not accept the current version and refresh the
 * profile. AGB 20.2: the version the user accepted before keeps applying, so
 * the profile still carries the old `terms_version` afterwards and the gate
 * would show again - the caller dismisses it for the rest of this app session.
 */
export async function declineTerms() {
  try {
    const response = await POST(`/auth/users/me/terms/decline`);

    await getUser();

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
