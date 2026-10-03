export interface DailyLearning {
  mode: "legacy" | "shadow" | "daily";
  limit: number;
  used: number;
  remaining: number | null;
  resets_at: string;
  timezone: string;
  unlimited: boolean;
  enforced?: boolean;
  started?: boolean;
  can_start?: boolean;
  exempt?: string | null;
}
