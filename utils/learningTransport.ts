export interface LearningSessionSnapshot {
  identity: string | null;
  epoch: number;
  generation: string;
  userId: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
}

function expired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now() + 60000;
  } catch {
    return false;
  }
}
const status = (error: any) => error?.statusCode || error?.status || error?.response?.status;
const sessionError = () => ({ statusCode: 401, data: { error: "learning_session_required" } });

/** Refresh is coordinated with the existing client, but cannot clear a draft on failure. */
export function createLearningTransport(options: {
  snapshot: () => LearningSessionSnapshot;
  renew: (expected: LearningSessionSnapshot) => Promise<unknown>;
  raw: (
    path: string,
    method: "GET" | "POST" | "PUT",
    body?: unknown,
    token?: string
  ) => Promise<any>;
  expired: (required: boolean) => void;
}) {
  let renewing: { snapshot: LearningSessionSnapshot; promise: Promise<void> } | null = null;
  let refused: LearningSessionSnapshot | null = null;
  function current(expected: LearningSessionSnapshot) {
    const actual = options.snapshot();
    return (
      !!actual.identity &&
      actual.identity === expected.identity &&
      actual.epoch === expected.epoch &&
      actual.generation === expected.generation
    );
  }
  async function renew(expected: LearningSessionSnapshot) {
    if (renewing) {
      if (
        renewing.snapshot.identity === expected.identity &&
        renewing.snapshot.epoch === expected.epoch &&
        renewing.snapshot.generation === expected.generation
      ) {
        await renewing.promise;
        if (!current(expected)) throw sessionError();
        return;
      }
      await renewing.promise.catch(() => {});
      if (!current(expected)) throw sessionError();
      return renew(expected);
    }
    const operation = (async () => {
      if (!current(expected)) throw sessionError();
      const before = options.snapshot();
      try {
        await options.renew(expected);
      } catch (error) {
        const after = options.snapshot();
        if (
          current(expected) &&
          before.accessToken === after.accessToken &&
          before.refreshToken === after.refreshToken &&
          [400, 401, 403].includes(status(error))
        ) {
          refused = before;
          options.expired(true);
          throw sessionError();
        }
        throw error;
      }
      if (!current(expected)) throw sessionError();
      refused = null;
      options.expired(false);
    })();
    renewing = { snapshot: expected, promise: operation };
    try {
      await operation;
    } finally {
      if (renewing?.promise === operation) renewing = null;
    }
  }

  return async function request(
    path: string,
    method: "GET" | "POST" | "PUT" = "GET",
    body?: unknown
  ) {
    const expected = options.snapshot();
    if (!expected.identity || !expected.accessToken) throw sessionError();
    if (
      refused &&
      current(refused) &&
      refused.accessToken === expected.accessToken &&
      refused.refreshToken === expected.refreshToken
    )
      throw sessionError();
    if (refused) {
      refused = null;
      options.expired(false);
    }
    if (expired(expected.accessToken)) await renew(expected);
    if (!current(expected)) throw sessionError();
    const attempted = options.snapshot();
    try {
      const response = await options.raw(path, method, body, attempted.accessToken);
      if (!current(expected)) throw sessionError();
      return response;
    } catch (error) {
      if (!current(expected) || status(error) !== 401) throw error;
      await renew(attempted);
      if (!current(expected)) throw sessionError();
      // Never replay a challenge attempt. Room mutations have a server-enforced
      // request id; their retry keeps the exact original id, revision and body.
      const idempotentRoomWrite =
        path.startsWith("/skills/rooms/") &&
        (method === "PUT" || method === "POST") &&
        typeof (body as any)?.request_id === "string";
      if (method !== "GET" && !idempotentRoomWrite) throw error;
      const response = await options.raw(path, method, body, options.snapshot().accessToken);
      if (!current(expected)) throw sessionError();
      return response;
    }
  };
}

export function createLearningRecovery(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  namespace = ""
) {
  const key = (user: string) =>
    `academy-learning-recovery:${namespace ? `${namespace}:` : ""}${user}`;
  return {
    save(user: string, state: unknown) {
      if (!user) throw new Error("Missing recovery owner");
      storage.setItem(key(user), JSON.stringify({ user, state }));
    },
    read(user: string) {
      if (!user) return null;
      try {
        const stored = JSON.parse(storage.getItem(key(user)) || "null");
        return stored?.user === user ? stored.state : null;
      } catch {
        return null;
      }
    },
    clear(user: string) {
      if (user) storage.removeItem(key(user));
    },
  };
}
