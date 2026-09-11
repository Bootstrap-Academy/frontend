import { ref } from "vue";

export type CommercialRecord = Record<string, unknown>;
export type CommercialSnapshot = {
  case: CommercialRecord | null;
  erasure_intake: CommercialRecord | null;
  obligations: CommercialRecord[];
  reservations: CommercialRecord[];
  cash_payments: CommercialRecord[];
  cash_allocations: CommercialRecord[];
};

function record(value: unknown): value is CommercialRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function commercialSnapshot(value: unknown): CommercialSnapshot {
  if (!record(value)) throw new Error("Unavailable commercial snapshot");
  const rows = (key: string) => {
    const data = value[key];
    if (data === undefined) return [];
    if (!Array.isArray(data) || !data.every(record)) throw new Error("Incomplete record format");
    return data;
  };
  if (value.case != null && !record(value.case)) throw new Error("Incomplete case format");
  if (value.erasure_intake != null && !record(value.erasure_intake))
    throw new Error("Incomplete receipt format");
  return {
    case: record(value.case) ? value.case : null,
    erasure_intake: record(value.erasure_intake) ? value.erasure_intake : null,
    obligations: rows("obligations"),
    reservations: rows("reservations"),
    cash_payments: rows("cash_payments"),
    cash_allocations: rows("cash_allocations"),
  };
}

/** Read-only presentation state. Neither recorded totals nor completion imply payment. */
export function createCommercialReader(read: () => Promise<unknown>, identity: () => string) {
  const state = ref<"idle" | "loading" | "ready" | "error">("idle");
  const data = ref<CommercialSnapshot | null>(null);
  let generation = 0;
  function clear() {
    generation++;
    data.value = null;
    state.value = "idle";
  }
  async function load() {
    const attempt = ++generation,
      owner = identity();
    data.value = null;
    state.value = "loading";
    const current = () => attempt === generation && owner === identity();
    try {
      const response = await read();
      if (current()) {
        data.value = commercialSnapshot(response);
        state.value = "ready";
      }
    } catch {
      if (current()) state.value = "error";
    }
  }
  return { state, data, clear, load };
}

export function commercialUnits(value: unknown): string | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? String(value)
    : null;
}

export function commercialState(value: unknown): string {
  return typeof value === "string" &&
    [
      "pending_evidence",
      "established",
      "historical_wallet_application",
      "rejected",
      "reserved",
      "uncertain",
      "completed",
      "failed",
      "split",
    ].includes(value)
    ? value
    : "unknown";
}

/** Finance prints S{u64}; its existing original-only API takes the numeric suffix. */
export function commercialStatementPath(number: string): string | null {
  const match = /^S(0|[1-9][0-9]{0,19})$/.exec(number);
  if (!match || BigInt(match[1]) > 18446744073709551615n) return null;
  return `/documents/final-statement/${match[1]}/original`;
}
