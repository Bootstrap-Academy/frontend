import type { DailyLearning } from "../types/dailyLearning";
import { decodeApiError } from "./apiError";

export function dailyLearning(value: any): DailyLearning | null {
  if (
    !value ||
    !["legacy", "shadow", "daily"].includes(value.mode) ||
    !Number.isSafeInteger(value.limit) ||
    value.limit < 0 ||
    !Number.isSafeInteger(value.used) ||
    value.used < 0 ||
    !(
      value.remaining === null ||
      (Number.isSafeInteger(value.remaining) && value.remaining >= 0)
    ) ||
    typeof value.unlimited !== "boolean" ||
    typeof value.resets_at !== "string" ||
    !Number.isFinite(Date.parse(value.resets_at))
  )
    return null;
  return value;
}
export function dailyBlocked(value?: DailyLearning | null) {
  return (
    value?.mode === "daily" &&
    value.enforced !== false &&
    !value.unlimited &&
    value.started !== true &&
    !value.exempt &&
    value.can_start === false
  );
}
export function dailyError(error: unknown): DailyLearning | null {
  const decoded = decodeApiError(error);
  return decoded.kind === "daily_limit" ? dailyLearning(decoded.daily) : null;
}

export function dailyResetTime(value: DailyLearning, locale: string) {
  return new Intl.DateTimeFormat(locale.startsWith("de") ? "de-DE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value.resets_at));
}
