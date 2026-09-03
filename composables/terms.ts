/** Version of the terms and conditions the platform currently asks for. */
export const TERMS_VERSION = "2026-09";

/**
 * Routes on which the re-acceptance gate stays hidden: the documents the gate
 * links to, the account page the user needs in order to delete the account
 * instead of accepting, and the two declaration pages. § 312k Abs. 2 BGB and
 * § 356a BGB want the cancellation and the withdrawal to be reachable
 * directly, so nothing may be put in front of them - least of all a dialog
 * about the very terms the user is about to leave behind.
 */
const TERMS_GATE_EXEMPT_PREFIXES = [
  "/docs",
  "/account",
  "/vertrag-kuendigen",
  "/vertrag-widerrufen",
];

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
  if (TERMS_GATE_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;

  return user.value.terms_version != TERMS_VERSION;
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
