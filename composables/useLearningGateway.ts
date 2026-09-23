import type { LlmSend } from "~/utils/learningLlm";
import { createLearningTransport } from "~/utils/learningTransport";
import { mutex } from "~/composables/fetch";

/** Direct calls to the LLM gateway with the learner's session; only the host uses this. */
export function useLearningGateway() {
  const config = useRuntimeConfig().public;
  const user = useUser();
  const session = useSession();
  const accessToken = useAccessToken();
  const refreshToken = useRefreshToken();
  const owner = computed(() =>
    user.value?.id && session.value?.id ? `${user.value.id}:${session.value.id}` : null
  );
  const transport = createLearningTransport({
    snapshot: () => ({
      identity: owner.value,
      epoch: 0,
      userId: user.value?.id || "",
      sessionId: session.value?.id || "",
      accessToken: accessToken.value || "",
      refreshToken: refreshToken.value || "",
    }),
    lock: () => mutex.acquire(),
    raw: (path, method, body, token) =>
      $fetch(path, {
        baseURL: config.BASE_API_URL,
        method,
        body: body as any,
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        retry: 0,
        timeout: 20000,
      }),
    apply: (response) => setStates(response),
    // The lesson page shows the sign-in prompt; a module only gets its fallback.
    expired: () => {},
  });
  let lastToken = "";
  const send: LlmSend = async (path, init, renew) => {
    const token = await transport.authorize(renew ? lastToken : undefined);
    lastToken = token;
    return await fetch(`${String(config.BASE_API_URL).replace(/\/$/, "")}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  };
  return { send, owner };
}
