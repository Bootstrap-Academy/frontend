import { DELETE, GET, POST } from "./fetch";

/**
 * Where the browser keeps the `state` of a running authorization flow. The
 * backend issues it, the provider hands it back in the callback URL, and only
 * the browser that started the flow can produce the matching value - which is
 * what makes a callback that some other page triggered fail.
 *
 * `sessionStorage` and not a cookie: it is per tab, dies with the tab, and is
 * never sent anywhere on its own.
 */
const FLOW_KEY = "oauth_flow";

/**
 * Where the registration token from an OAuth signup waits until the signup
 * form picks it up. It used to travel in the address bar, which put a 64
 * character secret into the browser history and into every outgoing
 * `Referer`.
 */
const REGISTER_TOKEN_KEY = "oauth_register_token";

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function oauthRedirectUri() {
  const config = useRuntimeConfig().public;
  return `${config.BASE_WEB_URL}/oauth/callback`;
}

/**
 * What the round trip through the provider is for. A flow started on the login
 * page signs the visitor in (or hands out a registration token); a flow started
 * on the account page adds the provider to the account that is already signed
 * in. The callback page needs to know which of the two it is completing.
 */
export type OAuthPurpose = "login" | "link" | "moderation";

/**
 * Ask the backend for the authorize URL of the given provider and remember the
 * `state` it issued for this browser.
 */
export async function startOAuthFlow(
  provider_id: string,
  purpose: OAuthPurpose = "login",
  valid: () => boolean = () => true
) {
  const ambient = moderationAmbientIdentity();
  try {
    const response = <any>(purpose === "moderation"
      ? await $fetch("/auth/moderation/access/oauth/begin", {
          baseURL: useRuntimeConfig().public.BASE_API_URL,
          credentials: "omit",
          retry: 0,
          timeout: 20000,
          method: "POST",
          body: { provider: provider_id, redirect_uri: oauthRedirectUri() },
        })
      : await POST("/auth/oauth/authorize", { provider_id, redirect_uri: oauthRedirectUri() }));

    if (!valid() || (purpose === "moderation" && ambient !== moderationAmbientIdentity()))
      throw new Error("OAuth owner or view changed");
    storage()?.setItem(
      FLOW_KEY,
      JSON.stringify({ state: response?.state ?? "", provider_id, purpose, ambient })
    );

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

/**
 * Take the `state` of the running flow out of the storage, so it cannot be
 * used a second time even if the callback page is reloaded.
 */
export function takeOAuthFlow(): {
  state: string;
  provider_id: string;
  purpose: OAuthPurpose;
  ambient?: string;
} | null {
  const raw = storage()?.getItem(FLOW_KEY);
  storage()?.removeItem(FLOW_KEY);

  if (!!!raw) return null;

  try {
    const flow = JSON.parse(raw);
    return ["login", "link", "moderation"].includes(flow?.purpose) ? flow : null;
  } catch {
    return null;
  }
}

export function saveRegisterToken(token: string) {
  storage()?.setItem(REGISTER_TOKEN_KEY, token);
}

export function getRegisterToken() {
  return storage()?.getItem(REGISTER_TOKEN_KEY) ?? "";
}

export function clearRegisterToken() {
  storage()?.removeItem(REGISTER_TOKEN_KEY);
}

/** All OAuth2 providers the account can currently be signed in with. */
export async function getOAuthLinks() {
  try {
    const response = await GET("/auth/oauth/links/me");

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

/**
 * Add the provider account the finished authorization flow belongs to to the
 * signed-in account.
 */
export async function createOAuthLink(body: { state: string; code: string }) {
  try {
    const response = await POST("/auth/oauth/links/me", body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

/**
 * Remove one linked provider account. The backend refuses to remove the last
 * remaining login method, so an account can never lock itself out.
 */
export async function deleteOAuthLink(link_id: string) {
  try {
    const response = await DELETE(`/auth/oauth/links/me/${link_id}`);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
