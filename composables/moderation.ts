import type { OriginalReadContext } from "./originalDocuments";
export type ModerationSource = "backend" | "challenges";
export type ModerationMessage = {
  source: ModerationSource;
  id: string;
  case_id: string;
  decision_id: string | null;
  audience: "author" | "notifier";
  statement: Record<string, any>;
  effective: Record<string, any> | null;
  content: unknown;
  current: boolean;
  available_at: string;
  informed_at: string | null;
  complaint_until: string | null;
};
const key = "moderation-recipient-access",
  ambientKey = "moderation-ambient-owner";
function storedAccess(): { secret: string; owner: string } | null {
  if (!import.meta.client) return null;
  try {
    const v = JSON.parse(sessionStorage.getItem(key) || "null");
    return v && typeof v.secret === "string" ? v : null;
  } catch {
    return null;
  }
}
/** Called by the central session setters even while no moderation page exists. */
export function moderationAmbientChanged(nextOwner: string | null | undefined) {
  if (!import.meta.client) return;
  const owner = nextOwner || "",
    previous = sessionStorage.getItem(ambientKey);
  if (previous !== owner || (storedAccess() && storedAccess()?.owner !== owner)) {
    sessionStorage.setItem(ambientKey, owner);
    sessionStorage.setItem("moderation-owner-generation", crypto.randomUUID());
    sessionStorage.removeItem(key);
    useState<number>("moderation-identity", () => 0).value++;
    useState<ModerationMessage[]>("moderation-messages", () => []).value = [];
    useState("moderation-recipient", () => "").value = "";
    useState("moderation-scope", () => "").value = "";
  }
}
export function moderationAmbientIdentity() {
  if (!import.meta.client) return "";
  moderationAmbientChanged(useUser().value?.id);
  return `${sessionStorage.getItem(ambientKey)}:${sessionStorage.getItem("moderation-owner-generation")}`;
}

/** Independent recipient authority: never normal session cookies or refresh. */
export function useModeration() {
  const epoch = useState("moderation-identity", () => 0);
  const rows = useState<ModerationMessage[]>("moderation-messages", () => []);
  const scope = useState("moderation-scope", () => ""),
    recipient = useState("moderation-recipient", () => "");
  const available = useState("moderation-challenges-available", () => false);
  let alive = true,
    loadGeneration = 0,
    proofGeneration = 0;
  onScopeDispose(() => {
    alive = false;
    loadGeneration++;
    proofGeneration++;
  });
  const active = computed(() => {
    epoch.value;
    return !!storedAccess() || !!getAccessToken();
  });
  function clear() {
    if (import.meta.client) sessionStorage.removeItem(key);
    epoch.value++;
    rows.value = [];
    scope.value = recipient.value = "";
  }
  function install(value: string) {
    if (!alive || !/^[A-Za-z0-9_-]{32,256}$/.test(value)) throw new Error("Invalid access");
    moderationAmbientIdentity();
    clear();
    sessionStorage.setItem(
      key,
      JSON.stringify({ secret: value, owner: useUser().value?.id || "" })
    );
    epoch.value++;
  }
  function guard() {
    const identity = moderationAmbientIdentity(),
      generation = epoch.value;
    return () => alive && identity === moderationAmbientIdentity() && generation === epoch.value;
  }
  async function requestAt<T = any>(
    prefix: "/auth/moderation" | "/shop/claims",
    path: string,
    options: any = {},
    anonymous = false
  ): Promise<T> {
    const valid = guard(),
      generation = epoch.value,
      capability = anonymous ? null : storedAccess()?.secret;
    const ordinary = anonymous || capability ? null : getAccessToken();
    if (!anonymous && !capability && !ordinary) throw new Error("Recipient proof required");
    try {
      const value = await $fetch<T>(`${prefix}${path}`, {
        ...options,
        baseURL: useRuntimeConfig().public.BASE_API_URL,
        credentials: "omit",
        retry: 0,
        timeout: 20000,
        headers: capability
          ? { "x-moderation-capability": capability }
          : ordinary
            ? { Authorization: `Bearer ${ordinary}` }
            : {},
      });
      if (
        !valid() ||
        (!anonymous &&
          (capability ? capability !== storedAccess()?.secret : ordinary !== getAccessToken()))
      )
        throw new Error("Recipient changed or view closed; outcome unconfirmed");
      return value;
    } catch (error: any) {
      if (alive && generation === epoch.value && !anonymous && error?.response?.status === 401)
        clear();
      throw error;
    }
  }
  function request<T = any>(path: string, options: any = {}, anonymous = false): Promise<T> {
    return requestAt<T>("/auth/moderation", path, options, anonymous);
  }
  async function load() {
    const generation = ++loadGeneration,
      value = await request("/inbox");
    if (!alive || generation !== loadGeneration) return;
    rows.value = [
      ...value.backend.map((m: any) => ({ ...m, source: "backend" })),
      ...value.challenges.map((m: any) => ({ ...m, source: "challenges" })),
    ];
    available.value = value.challenges_available;
    scope.value = value.scope;
    recipient.value = value.recipient_id;
  }
  async function prove(path: string, body: any) {
    clear();
    const valid = guard(),
      generation = ++proofGeneration;
    const response = await request(path, { method: "POST", body }, true);
    if (!valid() || generation !== proofGeneration)
      throw new Error("Proof view or account changed");
    install(response.capability);
  }
  function importFragment() {
    const value = new URLSearchParams(location.hash.slice(1)).get("capability");
    if (!value) return false;
    history.replaceState(history.state, "", location.pathname + location.search);
    install(value);
    return true;
  }
  async function download(path: string, name: string) {
    const blob = await request<Blob>(path, { responseType: "blob" });
    const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function originalReadContext(ordinary = false): OriginalReadContext | null {
    const valid = guard(),
      generation = epoch.value,
      subject = recipient.value;
    const capability = storedAccess()?.secret;
    if (scope.value !== "rights" || !subject) return null;
    if (ordinary && capability) return null;
    const secret = ordinary ? getAccessToken() : capability;
    if (!secret) return null;
    const current = () =>
      valid() &&
      generation === epoch.value &&
      recipient.value === subject &&
      scope.value === "rights" &&
      (ordinary
        ? !storedAccess() && getAccessToken() === secret
        : storedAccess()?.secret === secret);
    return {
      kind: ordinary ? "ordinary" : "moderation",
      secret,
      subject,
      current,
      invalidate() {
        if (current()) clear();
      },
    };
  }
  return {
    epoch,
    rows,
    scope,
    recipient,
    available,
    active,
    clear,
    install,
    request,
    commercialSnapshot: () =>
      requestAt<unknown>("/shop/claims", "/recipient/export", { method: "POST", body: {} }),
    commercialPersonalProof: () => {
      moderationAmbientIdentity();
      const capability = storedAccess()?.secret;
      return capability && scope.value === "rights" && recipient.value
        ? { kind: "moderation" as const, secret: capability, subject: recipient.value }
        : null;
    },
    commercialOriginalRead: () => originalReadContext(),
    commercialOrdinaryRead: () => originalReadContext(true),
    commercialStatement: (number: string) => {
      const path = commercialStatementPath(number);
      if (!path) throw new Error("Expected the original S-prefixed final-statement number");
      return requestAt<Blob>("/shop/claims", path, { responseType: "blob" });
    },
    load,
    guard,
    password: (body: any) => prove("/access/password", body),
    finishOAuth: (body: any) => prove("/access/oauth/finish", body),
    importFragment,
    download,
    async revoke() {
      await request("/access/revoke", { method: "POST" });
      clear();
    },
    opened: (row: ModerationMessage) =>
      request(`/opened/${row.source}`, { method: "POST", body: { id: row.id } }),
  };
}
import { commercialStatementPath } from "./commercialStatus";
