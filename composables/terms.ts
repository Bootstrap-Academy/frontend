/** Version of the terms and conditions the platform currently asks for. */
export const TERMS_VERSION = "2026-09";

/**
 * Routes on which the re-acceptance gate stays hidden: the documents the gate
 * links to, and the account page the user needs in order to delete the account
 * instead of accepting.
 */
const TERMS_GATE_EXEMPT_PREFIXES = ["/docs", "/account"];

/**
 * Whether the logged in user still has to accept the current version of the
 * terms and conditions. Accounts created before the acceptance was recorded
 * have no `terms_version` at all and are asked as well.
 *
 * Nothing is kept on the client: the answer is derived from the user profile
 * that `GET /auth/users/me` returns, so the server row is the only record.
 */
export function needsTermsAcceptance(path: string) {
  const user = <any>useUser();

  if (!!!isAuth.value || !!!user.value?.id) return false;
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
