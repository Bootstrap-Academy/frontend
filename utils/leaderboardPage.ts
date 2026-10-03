import { PUBLICATION_SCOPE } from "~/utils/profilePublication";

export interface LeaderboardEntry {
  user: { id: string; display_name: string; avatar_url: null };
  rank: number;
  score: number;
}

export function emptyLeaderboardPage() {
  return {
    query: "",
    generation: 0,
    epoch: null as string | null,
    revision: -1,
    policySeen: false,
    offset: 0,
    total: 0,
    entries: [] as LeaderboardEntry[],
    loading: false,
    error: "",
  };
}

export type LeaderboardPageState = ReturnType<typeof emptyLeaderboardPage>;

export function clearLeaderboardPage(state: LeaderboardPageState) {
  state.generation++;
  state.query = "";
  state.epoch = null;
  state.offset = state.total = 0;
  state.entries = [];
  state.loading = false;
  state.error = "";
  // A browser that saw the active policy never accepts an old public DTO again.
}

export function normalizeLeaderboardPage(value: any, policySeen = false) {
  const active = ["scope_version", "publication_epoch", "epoch_revision"].some(
    (key) => value?.[key] !== undefined
  );
  if (
    !Number.isSafeInteger(value?.total) ||
    value.total < 0 ||
    !Array.isArray(value?.leaderboard) ||
    (policySeen && !active) ||
    (active &&
      (value.scope_version !== PUBLICATION_SCOPE ||
        typeof value.publication_epoch !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(value.publication_epoch) ||
        !Number.isSafeInteger(value.epoch_revision) ||
        value.epoch_revision < 0))
  )
    throw { statusCode: 503 };
  const leaderboard: LeaderboardEntry[] = value.leaderboard.flatMap((item: any) => {
    // The old DTO permits an unresolved account. Keep its pagination contract,
    // while displaying no anonymous person/score as a substitute for identity.
    if (!active && item?.user == null) return [];
    if (
      typeof item?.user?.id !== "string" ||
      typeof item?.user?.display_name !== "string" ||
      !Number.isSafeInteger(item.rank) ||
      item.rank < 1 ||
      !Number.isFinite(item.score) ||
      item.score < 0 ||
      (active && item.user.avatar_url !== null)
    )
      throw { statusCode: 503 };
    return [
      {
        user: { id: item.user.id, display_name: item.user.display_name, avatar_url: null },
        rank: item.rank,
        score: item.score,
      },
    ];
  });
  return {
    leaderboard,
    total: value.total as number,
    epoch: active ? (value.publication_epoch as string) : null,
    revision: active ? (value.epoch_revision as number) : -1,
  };
}

export function createLeaderboardPager(options: {
  state: LeaderboardPageState;
  owner: () => string;
  get: (path: string) => Promise<any>;
  commit: () => void;
}) {
  const state = options.state;
  const clear = () => {
    clearLeaderboardPage(state);
    options.commit();
  };

  async function load(
    query: string,
    offset: number,
    limit: number,
    canRestart = true
  ): Promise<any> {
    if (!options.owner()) {
      clear();
      return [null, { statusCode: 401 }];
    }
    if (offset === 0 || query !== state.query) {
      clear();
      state.query = query;
      offset = 0;
    } else if (state.loading || offset !== state.offset + limit) return [null, null];
    const generation = state.generation;
    const owner = options.owner();
    const current = () => generation === state.generation && owner === options.owner();
    const epoch = state.epoch;
    state.loading = true;
    try {
      const path = `${query}?limit=${limit}&offset=${offset}${epoch ? `&publication_epoch=${encodeURIComponent(epoch)}` : ""}`;
      const page = normalizeLeaderboardPage(await options.get(path), state.policySeen);
      if (!current()) return [null, null];
      if (page.revision < state.revision) throw { statusCode: 409 };
      if (offset > 0 && page.epoch !== epoch) throw { statusCode: 409 };
      if (page.epoch) {
        state.policySeen = true;
        state.revision = page.revision;
      }
      state.epoch = page.epoch;
      state.entries = offset === 0 ? page.leaderboard : [...state.entries, ...page.leaderboard];
      state.total = page.total;
      state.offset = offset;
      state.error = "";
      options.commit();
      return [page, null];
    } catch (error: any) {
      if (!current()) return [null, null];
      const status = error?.statusCode ?? error?.status ?? error?.response?.status;
      clear();
      if (status === 409 && canRestart) return load(query, 0, limit, false);
      state.error = status === 401 ? "SignIn" : status === 403 ? "Verify" : "Unavailable";
      return [null, error];
    } finally {
      if (current()) state.loading = false;
    }
  }

  return { load, clear };
}
