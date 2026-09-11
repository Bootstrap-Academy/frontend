import { ref } from "vue";
import type {
  CancellationAttempt,
  CancellationKind,
  CancellationReceipt,
  CancellationScope,
  CancellationTarget,
} from "../types/eventCancellation";

/** One owner and exact scope per attempt, preserved before the first declaration POST. */
export function createEventCancellation(options: {
  owner: () => string;
  event: string;
  kind: CancellationKind;
  scope: CancellationScope;
  post: (path: string, body: unknown) => Promise<any>;
  get: (path: string) => Promise<any>;
  read: (key: string) => CancellationAttempt | null;
  save: (key: string, attempt: CancellationAttempt) => void;
  uuid: () => string;
}) {
  const target = ref<CancellationTarget | null>(null);
  const attempt = ref<CancellationAttempt | null>(null);
  const busy = ref(false);
  const failed = ref(false);
  let generation = 0;
  let boundOwner = "";
  const key = (owner: string) =>
    JSON.stringify([owner, options.kind, options.event, options.scope]);
  const current = (owner: string, epoch: number) =>
    owner === options.owner() && epoch === generation;
  const reset = () => {
    generation++;
    boundOwner = "";
    target.value = null;
    attempt.value = null;
    busy.value = false;
    failed.value = false;
  };
  async function open(fresh = false) {
    reset();
    const owner = options.owner(),
      epoch = generation;
    if (!owner) return;
    boundOwner = owner;
    const saved = options.read(key(owner));
    // An unanswered declaration cannot be replaced by a fresh current booking.
    if (saved && (!fresh || !saved.receipt || saved.receipt.state === "received")) {
      attempt.value = saved;
      target.value = saved.target;
      return;
    }
    busy.value = true;
    try {
      const prepared = await options.post(`/events/calendar/${options.event}/cancellation-target`, {
        kind: options.kind,
        scope: options.scope,
      });
      if (current(owner, epoch)) target.value = prepared;
    } catch {
      if (current(owner, epoch)) failed.value = true;
    } finally {
      if (current(owner, epoch)) busy.value = false;
    }
  }
  async function submit(text?: string, reason: string | null = null) {
    const owner = options.owner(),
      epoch = generation;
    if (!owner || owner !== boundOwner || busy.value || !target.value) return;
    if (!attempt.value) {
      if (!text?.trim() || (target.value.role === "administrator" && !reason?.trim())) return;
      attempt.value = {
        command: options.uuid(),
        target: target.value,
        receipt: null,
        statement: {
          target_id: target.value.id,
          cancel_selected_scope: true,
          original_text: text,
          administration_reason: reason,
        },
      };
      options.save(key(owner), attempt.value);
    }
    const original = attempt.value;
    busy.value = true;
    failed.value = false;
    try {
      const receipt: CancellationReceipt = await options.post(
        `/events/calendar/cancellations/${original.command}`,
        original.statement
      );
      if (current(owner, epoch)) {
        attempt.value = { ...original, receipt };
        options.save(key(owner), attempt.value);
      }
    } catch {
      if (current(owner, epoch)) failed.value = true;
    } finally {
      if (current(owner, epoch)) busy.value = false;
    }
  }
  async function refresh() {
    const owner = options.owner(),
      epoch = generation,
      original = attempt.value;
    if (!owner || owner !== boundOwner || !original || busy.value) return;
    busy.value = true;
    failed.value = false;
    try {
      const receipt = await options.get(`/events/calendar/cancellations/${original.command}`);
      if (current(owner, epoch)) {
        attempt.value = { ...original, receipt };
        options.save(key(owner), attempt.value);
      }
    } catch {
      if (current(owner, epoch)) failed.value = true;
    } finally {
      if (current(owner, epoch)) busy.value = false;
    }
  }
  return { target, attempt, busy, failed, open, submit, refresh, reset };
}

export function useEventCancellation(
  event: string,
  kind: CancellationKind,
  scope: CancellationScope
) {
  const user = useUser();
  const attempts = useState<Record<string, CancellationAttempt>>(
    "ordinary-cancellation-attempts",
    () => ({})
  );
  return createEventCancellation({
    owner: () => user.value?.id ?? "",
    event,
    kind,
    scope,
    post: POST,
    get: GET,
    uuid: () => crypto.randomUUID(),
    read: (key) => {
      if (attempts.value[key]) return attempts.value[key];
      try {
        const saved = JSON.parse(sessionStorage.getItem(`event-cancellation:${key}`) ?? "null");
        if (saved?.command && saved?.target?.id && saved?.statement?.target_id === saved.target.id)
          return saved;
      } catch {
        /* The current session still retains the original attempt. */
      }
      return null;
    },
    save: (key, attempt) => {
      attempts.value[key] = attempt;
      try {
        sessionStorage.setItem(`event-cancellation:${key}`, JSON.stringify(attempt));
      } catch {
        /* Memory retry remains available. */
      }
    },
  });
}
