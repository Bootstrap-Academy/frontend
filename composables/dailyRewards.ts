import { refreshNuxtData, useAsyncData, useState } from "#app";
import { useIntervalFn, useEventListener, useNow } from "@vueuse/core";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { GET, POST } from "./fetch";

const DAILY_REWARDS_KEY = "daily-rewards";
const TEN_MINUTES_MS = 10 * 60 * 1000;

export type RewardCategory = "arrival" | "lecture" | "practice" | "lab";
export type RewardStatus = "pending" | "ready" | "claimed" | "unavailable";

export interface DailyReward {
  category: RewardCategory;
  coins: number;
  status: RewardStatus;
  claimable_since: string | null;
  last_detected_at: string | null;
  claimed_at: string | null;
  activity_sample?: Record<string, unknown> | null;
  unavailable_reason?: string | null;
}

export interface DailyRewardsPayload {
  date_utc: string;
  feature_enabled: boolean;
  rewards: DailyReward[];
  claim_totals?: {
    available_coins: number;
    claimed_today: number;
  };
}

export interface ClaimSuccess {
  category: RewardCategory;
  coins: number;
  claimed_at: string;
}

export interface ClaimAllResponse {
  status: "ok";
  claimed: ClaimSuccess[];
  skipped_categories: { category: RewardCategory; reason: string }[];
}

interface ClaimOutcome {
  ok: boolean;
  category: RewardCategory;
  error?: string;
}

interface ClaimAllOutcome {
  ok: boolean;
  claimed: ClaimSuccess[];
  totalClaimedCoins: number;
  skipped: { category: RewardCategory; reason: string }[];
  error?: string;
}

const categories: RewardCategory[] = ["arrival", "lecture", "practice", "lab"];

export function useDailyRewards() {
  const ariaAnnouncement = useState<string | null>("daily-rewards-aria-announcement", () => null);

  const claimBusy = ref<Record<RewardCategory, boolean>>(
    categories.reduce(
      (acc, category) => {
        acc[category] = false;
        return acc;
      },
      {} as Record<RewardCategory, boolean>
    )
  );

  const claimAllBusy = ref(false);

  const { data, pending, error, refresh } = useAsyncData<DailyRewardsPayload>(
    DAILY_REWARDS_KEY,
    async () => {
      const response = await GET("/daily-rewards");
      return response as DailyRewardsPayload;
    },
    {
      server: true,
      watch: [],
    }
  );

  const rewards = computed(() => data.value?.rewards ?? []);

  const availableCoins = computed(() =>
    rewards.value
      .filter((reward) => reward.status === "ready")
      .reduce((total, reward) => total + (reward.coins ?? 0), 0)
  );

  const claimedToday = computed(() => data.value?.claim_totals?.claimed_today ?? 0);

  const isClient = typeof window !== "undefined";
  const currentTime = isClient ? useNow({ interval: 60_000 }) : ref(new Date());

  const needsResetRefresh = computed(() => {
    const snapshotDay = data.value?.date_utc;
    if (!snapshotDay) return true;
    const dayStart = new Date(`${snapshotDay}T00:00:00Z`);
    if (Number.isNaN(dayStart.getTime())) return true;
    const nextDay = new Date(dayStart);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return currentTime.value.getTime() >= nextDay.getTime();
  });

  const shouldPoll = computed(
    () => needsResetRefresh.value || rewards.value.some((reward) => reward.status !== "claimed")
  );

  const countdownLabel = computed(() =>
    formatResetCountdown(data.value?.date_utc, currentTime.value)
  );

  const { pause: pausePolling, resume: resumePolling } = useIntervalFn(
    () => refreshNuxtData(DAILY_REWARDS_KEY),
    TEN_MINUTES_MS,
    {
      immediate: false,
      immediateCallback: false,
    }
  );

  if (!isClient) {
    pausePolling();
  }

  if (isClient) {
    watch(
      shouldPoll,
      (active) => {
        if (active && !document.hidden) {
          resumePolling();
        } else {
          pausePolling();
        }
      },
      { immediate: true }
    );

    useEventListener(
      () => document,
      "visibilitychange",
      () => {
        if (document.hidden) {
          pausePolling();
          return;
        }
        if (shouldPoll.value) {
          resumePolling();
        }
      }
    );
  }

  onBeforeUnmount(() => {
    if (isClient) {
      pausePolling();
    }
  });

  const mutateReward = (
    category: RewardCategory,
    updater: (reward: DailyReward) => DailyReward
  ) => {
    if (!data.value) return;
    data.value = {
      ...data.value,
      rewards: data.value.rewards.map((reward) =>
        reward.category === category ? updater({ ...reward }) : reward
      ),
    };
  };

  const resetAnnouncement = () => {
    ariaAnnouncement.value = "";
  };

  const claimCategory = async (category: RewardCategory): Promise<ClaimOutcome> => {
    if (claimBusy.value[category]) {
      return { ok: false, category, error: "busy" };
    }

    claimBusy.value = { ...claimBusy.value, [category]: true };

    const originalReward = rewards.value.find((reward) => reward.category === category);
    const optimisticTimestamp = new Date().toISOString();

    if (originalReward && originalReward.status === "ready") {
      mutateReward(category, (reward) => ({
        ...reward,
        status: "claimed",
        claimed_at: optimisticTimestamp,
      }));
    }

    try {
      await POST(`/daily-rewards/${category}/claim`);
      resetAnnouncement();
      ariaAnnouncement.value = buildClaimAnnouncement(category, originalReward?.coins ?? 0);
      await refreshNuxtData(DAILY_REWARDS_KEY);
      return { ok: true, category };
    } catch (err: any) {
      if (originalReward) {
        mutateReward(category, () => ({ ...originalReward }));
      }
      return {
        ok: false,
        category,
        error: normalizeError(err),
      };
    } finally {
      claimBusy.value = { ...claimBusy.value, [category]: false };
    }
  };

  const claimAll = async (): Promise<ClaimAllOutcome> => {
    if (claimAllBusy.value) {
      return { ok: false, claimed: [], totalClaimedCoins: 0, skipped: [], error: "busy" };
    }

    claimAllBusy.value = true;
    const readyRewards = rewards.value.filter((reward) => reward.status === "ready");
    const optimisticTimestamp = new Date().toISOString();
    const snapshot = data.value ? structuredClone(data.value) : null;

    if (readyRewards.length > 0) {
      data.value = {
        ...(data.value as DailyRewardsPayload),
        rewards: rewards.value.map((reward) =>
          reward.status === "ready"
            ? { ...reward, status: "claimed", claimed_at: optimisticTimestamp }
            : reward
        ),
      };
    }

    try {
      const response = (await POST("/daily-rewards/claim-all")) as ClaimAllResponse;
      const claimedCategories = response.claimed.map((item) => item.category);
      const totalCoins = response.claimed.reduce((sum, item) => sum + item.coins, 0);
      if (claimedCategories.length) {
        resetAnnouncement();
        ariaAnnouncement.value = buildClaimAllAnnouncement(claimedCategories, totalCoins);
      }
      await refreshNuxtData(DAILY_REWARDS_KEY);
      return {
        ok: true,
        claimed: response.claimed,
        totalClaimedCoins: totalCoins,
        skipped: response?.skipped_categories ?? [],
      };
    } catch (err: any) {
      if (snapshot) {
        data.value = snapshot;
      }
      return {
        ok: false,
        claimed: [],
        totalClaimedCoins: 0,
        skipped: [],
        error: normalizeError(err),
      };
    } finally {
      claimAllBusy.value = false;
    }
  };

  return {
    data,
    rewards,
    availableCoins,
    claimedToday,
    countdownLabel,
    featureEnabled: computed(() => !!data.value?.feature_enabled),
    pending,
    error,
    refresh: () => refreshNuxtData(DAILY_REWARDS_KEY),
    claimCategory,
    claimAll,
    claimBusy,
    claimAllBusy,
    ariaAnnouncement,
    resetAnnouncement,
  };
}

function formatResetCountdown(dateIso?: string | null, nowReference?: Date) {
  if (!dateIso) return "";
  const start = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return "";

  const nextDay = new Date(start);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const reference = nowReference ?? new Date();
  const diffMs = nextDay.getTime() - reference.getTime();
  if (diffMs <= 0) return "";

  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes >= 60) {
    const hours = Math.round(diffMinutes / 60);
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(hours, "hour");
  }

  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    diffMinutes || 1,
    "minute"
  );
}

function buildClaimAnnouncement(category: RewardCategory, coins: number) {
  return `${capitalize(category)} reward claimed for ${coins} coins.`;
}

function buildClaimAllAnnouncement(categories: RewardCategory[], coins: number) {
  if (!categories.length) return "";
  return `Claimed ${categories.length} rewards for ${coins} coins.`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeError(error: any) {
  if (!error) return "unknown";
  const detail =
    error?.data?.detail ?? error?.response?._data?.detail ?? error?.message ?? error?.toString();
  return typeof detail === "string" ? detail : "unknown";
}
