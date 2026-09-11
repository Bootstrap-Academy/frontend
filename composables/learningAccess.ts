import { ref } from "vue";

type Owner = { case_id: string; subject: string };
export type LearningRefreshBody = {
  case_id: string;
  expected_subject: string;
  command_id: string;
  key: string;
};
export type LearningStartBody = {
  case_id: string;
  command_id: string;
  key: string;
  use_retained_value: true;
  expected_no_active_subject: true;
};
type Receipt = {
  subject: string;
  expires_at: string;
  purpose: "retained_learning";
  ordinary_authority: false;
  financial_authority: false;
  claims_satisfied: false;
};
type Record = {
  owner: Owner;
  state: "prepared" | "unconfirmed" | "recorded" | "refused";
  receipt?: Receipt;
} & (
  | { version: 1; body: LearningRefreshBody }
  | { version: 2; operation: "learning_start"; body: LearningStartBody }
);
type SavedRecord = { ambient: string; sequence: number; record: Record };
type Options = {
  owner: () => Owner | null;
  identity: () => string;
  ambient: () => string;
  storage: Storage;
  summary: () => Promise<any>;
  refresh: (body: LearningRefreshBody) => Promise<any>;
  start?: (body: LearningStartBody) => Promise<any>;
  fetch: (path: string, options: any) => Promise<any>;
};
export type LearningCourseOperation =
  | { kind: "list" }
  | { kind: "details" | "watch"; course: string }
  | { kind: "media" | "complete"; course: string; lecture: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const secret = /^[A-Za-z0-9_-]{43,256}$/;
const storageKey = "commercial-learning-refresh-v1";
const startStorageKey = "commercial-learning-start-v1";
const fail = (kind: string) => new Error(kind);
const equalId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const sameOwner = (a: Owner, b: Owner) =>
  equalId(a.case_id, b.case_id) && equalId(a.subject, b.subject);
function receiptFrom(value: any, subject?: string): Receipt {
  if (
    !value ||
    !uuid.test(value.subject) ||
    (subject !== undefined && !equalId(value.subject, subject)) ||
    value.purpose !== "retained_learning" ||
    value.ordinary_authority !== false ||
    value.financial_authority !== false ||
    value.claims_satisfied !== false ||
    typeof value.expires_at !== "string" ||
    !Number.isFinite(Date.parse(value.expires_at))
  )
    throw fail("invalid_response");
  return {
    subject: value.subject,
    expires_at: value.expires_at,
    purpose: "retained_learning",
    ordinary_authority: false,
    financial_authority: false,
    claims_satisfied: false,
  };
}
function recordFrom(value: any): Record {
  const body = value?.body,
    owner = value?.owner,
    start = value?.version === 2 && value?.operation === "learning_start";
  if (
    !(value?.version === 1 || start) ||
    !uuid.test(owner?.case_id) ||
    !uuid.test(owner?.subject) ||
    !body ||
    Object.keys(body).sort().join() !==
      (start
        ? "case_id,command_id,expected_no_active_subject,key,use_retained_value"
        : "case_id,command_id,expected_subject,key") ||
    !uuid.test(body.command_id) ||
    (start
      ? body.expected_no_active_subject !== true || body.use_retained_value !== true
      : !uuid.test(body.expected_subject)) ||
    body.case_id !== owner.case_id ||
    !secret.test(body.key) ||
    !["prepared", "unconfirmed", "recorded", "refused"].includes(value.state)
  )
    throw fail("invalid_recovery");
  const receipt = value.receipt
    ? receiptFrom(value.receipt, start ? undefined : body.expected_subject)
    : undefined;
  if (value.state === "recorded" && !receipt) throw fail("invalid_recovery");
  return {
    ...(start
      ? { version: 2 as const, operation: "learning_start" as const }
      : { version: 1 as const }),
    owner: { case_id: owner.case_id, subject: owner.subject },
    body: { ...body },
    state: value.state,
    ...(receipt ? { receipt } : {}),
  };
}

/** Learning proof is separate from personal commercial proof. Saved receipts
 * describe past issuance; only a current, exact learning-resource read is usable.
 */
export function createLearningAccess(options: Options) {
  const subjects = ref<string[]>([]),
    knownSubjects = ref<string[]>([]),
    summaryLoaded = ref(false),
    pending = ref<Record | null>(null),
    resources = ref<any>(null);
  const error = ref(""),
    generation = ref(0);
  const erasedSubjects = new Set<string>();
  let alive = true,
    timer: ReturnType<typeof setTimeout> | undefined,
    confirmed: string | null = null;
  function invalidate() {
    generation.value++;
    resources.value = null;
    if (timer) clearTimeout(timer);
    timer = undefined;
  }
  function clear() {
    invalidate();
    confirmed = null;
    erasedSubjects.clear();
    subjects.value = [];
    knownSubjects.value = [];
    summaryLoaded.value = false;
    pending.value = null;
    error.value = "";
  }
  function owner() {
    const value = options.owner();
    if (!alive || !value || !uuid.test(value.case_id) || !uuid.test(value.subject)) {
      clear();
      throw fail("proof_required");
    }
    return { case_id: value.case_id, subject: value.subject };
  }
  function guard() {
    const current = owner(),
      identity = options.identity(),
      ambient = options.ambient(),
      epoch = generation.value;
    return () =>
      alive &&
      !!options.owner() &&
      sameOwner(current, options.owner()!) &&
      identity === options.identity() &&
      ambient === options.ambient() &&
      epoch === generation.value;
  }
  function saved(): SavedRecord[] {
    return [storageKey, startStorageKey]
      .flatMap((key) => {
        const value = JSON.parse(options.storage.getItem(key) || "[]");
        if (!Array.isArray(value)) throw fail("invalid_recovery");
        return value.map((row) => {
          if (
            typeof row.ambient !== "string" ||
            (row.sequence !== undefined &&
              (!Number.isSafeInteger(row.sequence) || row.sequence < 0))
          )
            throw fail("invalid_recovery");
          const record = recordFrom(row.record);
          if ((record.version === 1) !== (key === storageKey)) throw fail("invalid_recovery");
          return { ambient: row.ambient, sequence: row.sequence ?? 0, record };
        });
      })
      .sort((a, b) => a.sequence - b.sequence);
  }
  function save(value: Record) {
    const current = owner();
    if (!sameOwner(current, value.owner)) throw fail("owner_changed");
    const rows = saved(),
      index = rows.findIndex((r) => r.record.body.command_id === value.body.command_id);
    if (
      index >= 0 &&
      (JSON.stringify(rows[index].record.body) !== JSON.stringify(value.body) ||
        JSON.stringify(rows[index].record.owner) !== JSON.stringify(value.owner) ||
        rows[index].record.version !== value.version ||
        (rows[index].record.receipt &&
          JSON.stringify(rows[index].record.receipt) !== JSON.stringify(value.receipt)))
    )
      throw fail("invalid_recovery");
    const sequence = Math.max(0, ...rows.map((row) => row.sequence)) + 1;
    if (!Number.isSafeInteger(sequence)) throw fail("invalid_recovery");
    const row = { ambient: options.ambient(), sequence, record: value };
    if (index >= 0) rows[index] = row;
    else rows.push(row);
    options.storage.setItem(
      value.version === 1 ? storageKey : startStorageKey,
      JSON.stringify(rows.filter((entry) => entry.record.version === value.version))
    );
  }
  function restore() {
    clear();
    const current = owner();
    pending.value =
      saved()
        .filter((r) => r.ambient === options.ambient() && sameOwner(r.record.owner, current))
        .at(-1)?.record ?? null;
    // Restoring bytes never restores current usability.
  }
  function selected() {
    const current = owner(),
      value = pending.value;
    if (!value || !sameOwner(current, value.owner)) throw fail("proof_required");
    return recordFrom(JSON.parse(JSON.stringify(value)));
  }
  async function loadSubjects() {
    const current = owner(),
      valid = guard();
    summaryLoaded.value = false;
    const result = await options.summary();
    if (!valid()) throw fail("stale_view");
    if (
      !Array.isArray(result?.subjects) ||
      result.subjects.some(
        (s: any) =>
          !uuid.test(s.subject) ||
          !uuid.test(s.case_id) ||
          !equalId(s.case_id, current.case_id) ||
          !(
            s.erased_at === null ||
            (typeof s.erased_at === "string" && Number.isFinite(Date.parse(s.erased_at)))
          )
      )
    )
      throw fail("invalid_response");
    subjects.value = result.subjects
      .filter((s: any) => s.erased_at === null)
      .map((s: any) => s.subject);
    if (subjects.value.length > 1) {
      subjects.value = [];
      throw fail("invalid_response");
    }
    knownSubjects.value = result.subjects.map((s: any) => s.subject);
    summaryLoaded.value = true;
    if (
      resources.value &&
      !subjects.value.some((subject) => equalId(subject, resources.value.subject))
    ) {
      invalidate();
      error.value = "learning_inactive";
    }
  }
  async function prepare(subject: string) {
    const current = owner();
    if (pending.value && !["recorded", "refused"].includes(pending.value.state))
      throw fail("pending_request");
    const valid = guard();
    await loadSubjects();
    if (!valid()) throw fail("stale_view");
    if (!uuid.test(subject) || !subjects.value.some((s) => equalId(s, subject)))
      throw fail("subject_changed");
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const key = btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    const value: Record = {
      version: 1,
      owner: current,
      body: {
        case_id: current.case_id,
        expected_subject: subject,
        command_id: crypto.randomUUID(),
        key,
      },
      state: "prepared",
    };
    save(value);
    invalidate();
    confirmed = null;
    pending.value = value;
    error.value = "";
  }
  async function prepareStart() {
    const current = owner();
    if (!options.start) throw fail("start_unavailable");
    if (pending.value && !["recorded", "refused"].includes(pending.value.state))
      throw fail("pending_request");
    const valid = guard();
    await loadSubjects();
    if (!valid()) throw fail("stale_view");
    if (subjects.value.length) throw fail("subject_changed");
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const key = btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    const value: Record = {
      version: 2,
      operation: "learning_start",
      owner: current,
      body: {
        case_id: current.case_id,
        command_id: crypto.randomUUID(),
        key,
        use_retained_value: true,
        expected_no_active_subject: true,
      },
      state: "prepared",
    };
    save(value);
    invalidate();
    confirmed = null;
    pending.value = value;
    error.value = "";
  }
  async function verify() {
    const value = selected();
    invalidate();
    error.value = "";
    const valid = guard();
    if (confirmed !== value.body.command_id) throw fail("receipt_unconfirmed");
    if (
      !value.receipt ||
      erasedSubjects.has(value.receipt.subject) ||
      Date.parse(value.receipt.expires_at) <= Date.now()
    ) {
      error.value = "learning_inactive";
      throw fail("learning_inactive");
    }
    if (value.version === 2) {
      await loadSubjects();
      if (!valid()) throw fail("stale_view");
      if (!subjects.value.some((subject) => equalId(subject, value.receipt!.subject))) {
        error.value = "learning_inactive";
        throw fail("learning_inactive");
      }
    }
    let result;
    try {
      result = await options.fetch("/shop/learning/resources", {
        method: "POST",
        body: {},
        credentials: "omit",
        retry: 0,
        timeout: 20000,
        headers: { "x-learning-key": value.body.key },
      });
    } catch (cause: any) {
      if (valid() && (cause?.response?.status ?? cause?.statusCode) === 401) {
        invalidate();
        error.value = "learning_inactive";
      }
      throw cause;
    }
    if (!valid()) throw fail("stale_view");
    if (Date.parse(value.receipt.expires_at) <= Date.now()) {
      error.value = "learning_inactive";
      throw fail("learning_inactive");
    }
    if (
      !uuid.test(result?.subject) ||
      !equalId(result.subject, value.receipt.subject) ||
      result.purpose !== "retained_learning" ||
      result.ordinary_authority !== false ||
      result.renewal_activated !== false ||
      result.purchase_performed !== false ||
      ["coins", "withheld_coins", "hearts", "hearts_max"].some(
        (k) => !Number.isSafeInteger(result[k]) || result[k] < 0
      ) ||
      !(
        result.premium === null ||
        (uuid.test(result.premium?.period_id) &&
          typeof result.premium.active === "boolean" &&
          Number.isFinite(Date.parse(result.premium.since)) &&
          Number.isFinite(Date.parse(result.premium.until)))
      )
    )
      throw fail("invalid_response");
    resources.value = result;
    timer = setTimeout(
      () => {
        invalidate();
        error.value = "learning_inactive";
      },
      Math.min(2147483647, Date.parse(value.receipt.expires_at) - Date.now())
    );
  }
  async function submit() {
    const value = selected();
    invalidate();
    error.value = "";
    const valid = guard();
    if (!value.receipt) value.state = "unconfirmed";
    save(value);
    pending.value = value;
    // The parent supplies current personal proof. The learning key is never
    // offered as issuance/replay authority, including after a lost response.
    let result;
    try {
      result =
        value.version === 1
          ? await options.refresh({ ...value.body })
          : await options.start!({ ...value.body });
    } catch (cause: any) {
      if (valid() && !value.receipt && (cause?.response?.status ?? cause?.statusCode) === 409) {
        value.state = "refused";
        save(value);
        pending.value = value;
      }
      throw cause;
    }
    if (!valid()) throw fail("stale_view");
    const receipt = receiptFrom(
      result,
      value.version === 1 ? value.body.expected_subject : undefined
    );
    if (value.version === 2) {
      await loadSubjects();
      if (!valid()) throw fail("stale_view");
      if (!knownSubjects.value.some((subject) => equalId(subject, receipt.subject)))
        throw fail("invalid_response");
    }
    value.receipt = receipt;
    value.state = "recorded";
    save(value);
    pending.value = value;
    confirmed = value.body.command_id;
    await verify();
  }
  async function courseRequest(operation: LearningCourseOperation): Promise<unknown> {
    const value = selected();
    const usable = () =>
      confirmed === value.body.command_id &&
      !!resources.value &&
      !!value.receipt &&
      Date.parse(value.receipt.expires_at) > Date.now();
    if (!usable()) {
      invalidate();
      error.value = "learning_inactive";
      throw fail("learning_inactive");
    }
    const valid = guard();
    const segment = (id: string) => {
      if (typeof id !== "string" || !id || id.length > 256 || [".", ".."].includes(id))
        throw fail("invalid_resource");
      return encodeURIComponent(id);
    };
    let path = "/skills/learning/course_access",
      method = "GET";
    if (operation.kind !== "list") {
      path = `/skills/learning/courses/${segment(operation.course)}`;
      if (operation.kind === "watch") {
        path += "/watch";
        method = "POST";
      } else if (operation.kind === "media" || operation.kind === "complete") {
        path += `/lectures/${segment(operation.lecture)}`;
        if (operation.kind === "complete") {
          path += "/complete";
          method = "PUT";
        }
      } else if (operation.kind !== "details") throw fail("invalid_resource");
    }
    try {
      const result = await options.fetch(path, {
        method,
        credentials: "omit",
        retry: 0,
        timeout: 20000,
        headers: { "x-learning-key": value.body.key },
      });
      if (!valid()) throw fail("stale_view");
      if (!usable()) {
        invalidate();
        error.value = "learning_inactive";
        throw fail("learning_inactive");
      }
      return result;
    } catch (cause: any) {
      if (valid() && (cause?.response?.status ?? cause?.statusCode) === 401) {
        invalidate();
        error.value = "learning_inactive";
      }
      throw cause;
    }
  }
  function recoveryText() {
    return JSON.stringify(selected(), null, 2);
  }
  function importRecovery(text: string) {
    const value = recordFrom(JSON.parse(text));
    if (!sameOwner(owner(), value.owner)) throw fail("owner_changed");
    // Keep all original records. Importing a past request does not authenticate it.
    save(value);
    invalidate();
    confirmed = null;
    pending.value = value;
    error.value = "";
  }
  function observeErasedSubject(subject: string) {
    // Called only with an exact subject from freshly qualified owned erasure evidence.
    if (pending.value?.receipt?.subject !== subject) return;
    erasedSubjects.add(subject);
    subjects.value = subjects.value.filter((value) => value !== subject);
    invalidate();
    error.value = "learning_inactive";
  }
  return {
    subjects,
    summaryLoaded,
    pending,
    resources,
    error,
    generation,
    restore,
    loadSubjects,
    prepare,
    prepareStart,
    submit,
    verify,
    courseRequest,
    observeErasedSubject,
    recoveryText,
    importRecovery,
    clear,
    dispose() {
      clear();
      alive = false;
    },
  };
}
