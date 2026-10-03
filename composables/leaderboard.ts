import {
  clearLeaderboardPage,
  createLeaderboardPager,
  emptyLeaderboardPage,
} from "~/utils/leaderboardPage";
import type { LeaderboardEntry } from "~/utils/leaderboardPage";
import type { SessionSnapshot } from "~/utils/sessionRefresh";

export const useLanguageLeaderboardList = () =>
  useState<LeaderboardEntry[]>("languageLeaderboardList", () => []);
export const useCodingChallengeLeaderboardList = () =>
  useState<LeaderboardEntry[]>("codingChallengeLeaderboardList", () => []);
export const useOverAllLeaderboardList = () =>
  useState<LeaderboardEntry[]>("overAllLeaderboardList", () => []);
export const useTotalLeaderboardUsers = () => useState("totalLeaderboardUsers", () => 0);
export const useLeaderboardLimit = () => useState("leaderboardLimit", () => 10);
export const useLeaderboardOffset = () => useState("leaderboardOffset", () => 0);
export const useLeaderboardPage = () => useState("leaderboardPage", emptyLeaderboardPage);
export const useLeaderboardInvalidation = () => useState("leaderboardInvalidation", () => 0);

export function invalidatePublicationViews(broadcast = false, settings = true) {
  clearLeaderboardPage(useLeaderboardPage().value);
  useLanguageLeaderboardList().value = [];
  useCodingChallengeLeaderboardList().value = [];
  useOverAllLeaderboardList().value = [];
  useTotalLeaderboardUsers().value = useLeaderboardOffset().value = 0;
  useLeaderboardInvalidation().value++;
  // Close a task ranking dialog along with the old people it displayed.
  useDialogLeaderBoardChallengeBased().value = false;
  if (settings) usePublicationInvalidation().value++;
  if (broadcast && typeof window !== "undefined") {
    try {
      // The signal carries no owner, consent choice, profile or credential.
      localStorage.setItem("academy-publication-invalidated", crypto.randomUUID());
    } catch {
      // Focus/navigation still reread the authority when storage is unavailable.
    }
  }
}

async function getLeaderboard(
  kind: "overall" | "language" | "task",
  target: string,
  offset: number
) {
  const app = useNuxtApp();
  const request = usePublicationRequest();
  const state = useLeaderboardPage();
  const limit = useLeaderboardLimit();
  const total = useTotalLeaderboardUsers();
  const position = useLeaderboardOffset();
  const lists = {
    overall: useOverAllLeaderboardList(),
    language: useLanguageLeaderboardList(),
    task: useCodingChallengeLeaderboardList(),
  };
  const base = "/challenges/leaderboard";
  const path = kind === "overall" ? base : `${base}/by-${kind}/${encodeURIComponent(target)}`;
  const owner = () => {
    const value = app.runWithContext(getSessionSnapshot) as SessionSnapshot;
    return value.identity ? `${value.identity}:${value.generation}` : "";
  };
  const pager = createLeaderboardPager({
    state: state.value,
    owner,
    get: (path) => request(path),
    commit: () => {
      for (const key of ["overall", "language", "task"] as const)
        lists[key].value = key === kind ? state.value.entries : [];
      total.value = state.value.total;
      position.value = state.value.offset;
    },
  });
  return pager.load(path, offset, limit.value);
}

export const getLanguageLeaderboard = (language: string, offset: number) =>
  getLeaderboard("language", language, offset);
export const getCodingChallengeLeaderboard = (task: string, offset: number) =>
  getLeaderboard("task", task, offset);
export const getOverAllLeaderBoard = (offset: number) => getLeaderboard("overall", "", offset);
