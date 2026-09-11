import { computed, ref } from "vue";

type Owner = { case_id: string; subject: string };
export type CourseContinuationBody = {
  command_id: string;
  source_subject: string;
  right_id: string;
  successor: string;
  continue_existing_right: true;
};
type Original = {
  id: string;
  source_user_id: string;
  course_id: string;
  observed_at: string;
  original: {
    source_user_id: string;
    course_id: string;
    observed_course_access: boolean;
    observed_started_course_access: boolean;
    purchase_ids: string[];
    scope: string;
    viewing_history_retained: false;
  };
};
type Right = Original & { current_subject: string | null; generation: number };
type GrantState = "reserved" | "uncertain" | "granted" | "withdrawn" | "rejected";
type Delivery = {
  grant_id: string;
  right_id: string;
  subject: string;
  state: Exclude<GrantState, "reserved">;
  new_purchase: false;
  original_result?: {
    course_id: string;
    access_granted: true;
    new_purchase: false;
    new_terms_accepted: false;
    original_performance_inferred: false;
    original_scope: Original;
  };
};
type Grant = {
  id: string;
  command_id: string;
  case_id: string;
  source: "skills";
  original_contract: string;
  successor: string;
  original_scope: Original;
  claimant_authorization: CourseContinuationBody & { original_scope: Original };
  created_at: string;
  state: GrantState;
  result: Delivery | null;
};
type Receipt = {
  id: string;
  grant_id: string;
  received_at: string;
  receipt_hash: string;
  receipt: Delivery;
};
type Saved = {
  version: 1;
  operation: "course_successor";
  owner: Owner;
  body: CourseContinuationBody;
  original: Original;
  state: "prepared" | "unconfirmed" | "observed" | "refused";
  uncertain_attempt?: boolean;
  last_grant?: Grant;
  receipts: Receipt[];
};
type Snapshot = { sources: string[]; targets: string[]; grants: Grant[]; receipts: Receipt[] };
type Options = {
  owner: () => Owner | null;
  identity: () => string;
  ambient: () => string;
  storage: Storage;
  snapshot: () => Promise<unknown>;
  summary: () => Promise<unknown>;
  rights: (source: string) => Promise<unknown>;
  continueCourse: (body: CourseContinuationBody) => Promise<unknown>;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const storageKey = "commercial-course-continuation-v1";
const fail = (kind: string) => new Error(kind);
const object = (v: any) => v !== null && typeof v === "object" && !Array.isArray(v);
const date = (v: any) => typeof v === "string" && Number.isFinite(Date.parse(v));
const id = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const sameOwner = (a: Owner, b: Owner) => id(a.case_id, b.case_id) && id(a.subject, b.subject);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const canonical = (v: any): string =>
  JSON.stringify(v, (_key, value) =>
    object(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, value[k]])
        )
      : value
  );
const equal = (a: any, b: any) => canonical(a) === canonical(b);
function bodyFrom(v: any): CourseContinuationBody {
  if (
    !object(v) ||
    Object.keys(v).sort().join() !==
      "command_id,continue_existing_right,right_id,source_subject,successor" ||
    ![v.command_id, v.source_subject, v.right_id, v.successor].every((x) => uuid.test(x)) ||
    v.continue_existing_right !== true
  )
    throw fail("invalid_recovery");
  return clone(v);
}
function originalFrom(v: any): Original {
  const o = v?.original;
  if (
    !object(v) ||
    !uuid.test(v.id) ||
    !uuid.test(v.source_user_id) ||
    typeof v.course_id !== "string" ||
    !v.course_id ||
    v.course_id.length > 256 ||
    !date(v.observed_at) ||
    !object(o) ||
    o.source_user_id !== v.source_user_id ||
    o.course_id !== v.course_id ||
    typeof o.observed_course_access !== "boolean" ||
    typeof o.observed_started_course_access !== "boolean" ||
    !(o.observed_course_access || o.observed_started_course_access) ||
    o.viewing_history_retained !== false ||
    !Array.isArray(o.purchase_ids) ||
    !o.purchase_ids.every((x: any) => typeof x === "string" && x.length > 0 && x.length <= 36) ||
    typeof o.scope !== "string" ||
    !o.scope
  )
    throw fail("invalid_response");
  // Mutable current_subject/generation are never part of immutable original_scope.
  return {
    id: v.id,
    source_user_id: v.source_user_id,
    course_id: v.course_id,
    observed_at: v.observed_at,
    original: clone(o),
  };
}
function rightsFrom(v: any, source: string): Right[] {
  if (!Array.isArray(v)) throw fail("unavailable_records");
  const rows = v.map((row) => {
    const original = originalFrom(row);
    if (
      !id(original.source_user_id, source) ||
      !(row.current_subject === null || uuid.test(row.current_subject)) ||
      !Number.isSafeInteger(row.generation) ||
      row.generation < 0
    )
      throw fail("invalid_response");
    return { ...original, current_subject: row.current_subject, generation: row.generation };
  });
  if (new Set(rows.map((r) => r.id.toLowerCase())).size !== rows.length)
    throw fail("invalid_response");
  return rows;
}
function deliveryFrom(
  v: any,
  grant: Pick<Grant, "id" | "original_contract" | "successor" | "original_scope">
): Delivery {
  if (
    !object(v) ||
    v.grant_id !== grant.id ||
    v.right_id !== grant.original_contract ||
    v.subject !== grant.successor ||
    !["uncertain", "granted", "withdrawn", "rejected"].includes(v.state) ||
    v.new_purchase !== false
  )
    throw fail("invalid_response");
  if (v.original_result !== undefined) {
    const o = v.original_result;
    if (
      !object(o) ||
      o.course_id !== grant.original_scope.course_id ||
      o.access_granted !== true ||
      o.new_purchase !== false ||
      o.new_terms_accepted !== false ||
      o.original_performance_inferred !== false ||
      !equal(originalFrom(o.original_scope), grant.original_scope)
    )
      throw fail("invalid_response");
  }
  return clone(v);
}
function grantFrom(v: any, owner: Owner): Grant {
  const original = originalFrom(v?.original_scope),
    auth = v?.claimant_authorization;
  if (
    !object(v) ||
    !uuid.test(v.id) ||
    v.command_id !== v.id ||
    !uuid.test(v.case_id) ||
    !id(v.case_id, owner.case_id) ||
    v.source !== "skills" ||
    v.original_contract !== original.id ||
    !uuid.test(v.successor) ||
    !date(v.created_at) ||
    !["reserved", "uncertain", "granted", "withdrawn", "rejected"].includes(v.state) ||
    !object(auth) ||
    Object.keys(auth).sort().join() !==
      "command_id,continue_existing_right,original_scope,right_id,source_subject,successor"
  )
    throw fail("invalid_response");
  const { original_scope, ...body } = auth;
  bodyFrom(body);
  if (
    body.command_id !== v.id ||
    body.source_subject !== original.source_user_id ||
    body.right_id !== original.id ||
    body.successor !== v.successor ||
    !equal(originalFrom(original_scope), original)
  )
    throw fail("invalid_response");
  if (v.result !== null) deliveryFrom(v.result, v);
  return clone(v);
}
function receiptFrom(v: any, grants: Grant[]): Receipt {
  const grant = grants.find((g) => g.id === v?.grant_id);
  if (!grant || !uuid.test(v.id) || !date(v.received_at) || !/^[0-9a-f]{64}$/.test(v.receipt_hash))
    throw fail("invalid_response");
  deliveryFrom(v.receipt, grant);
  return clone(v);
}
function savedFrom(v: any): Saved {
  if (
    v?.version !== 1 ||
    v?.operation !== "course_successor" ||
    !uuid.test(v.owner?.case_id) ||
    !uuid.test(v.owner?.subject) ||
    !["prepared", "unconfirmed", "observed", "refused"].includes(v.state) ||
    !Array.isArray(v.receipts) ||
    (v.uncertain_attempt !== undefined && typeof v.uncertain_attempt !== "boolean")
  )
    throw fail("invalid_recovery");
  const body = bodyFrom(v.body),
    original = originalFrom(v.original);
  if (body.right_id !== original.id || body.source_subject !== original.source_user_id)
    throw fail("invalid_recovery");
  const value = { ...clone(v), owner: { ...v.owner }, body, original } as Saved;
  value.uncertain_attempt ??= v.state === "unconfirmed" && !v.last_grant;
  if (v.last_grant) matchGrant(grantFrom(v.last_grant, v.owner), value);
  if (v.receipts.length && !v.last_grant) throw fail("invalid_recovery");
  v.receipts.forEach((r: any) => receiptFrom(r, [v.last_grant]));
  return value;
}
function matchGrant(grant: Grant, record: Saved) {
  const { original_scope, ...body } = grant.claimant_authorization;
  if (
    !equal(body, record.body) ||
    !equal(original_scope, record.original) ||
    !equal(grant.original_scope, record.original)
  )
    throw fail("conflicting_record");
}

/** Personal continuation records never replace a learning receipt or authorize a
 * player. Exported grants describe current recorded state; receipts describe history.
 */
export function createCourseContinuation(options: Options) {
  const sources = ref<string[]>([]),
    targets = ref<string[]>([]),
    rights = ref<Right[]>([]),
    grants = ref<Grant[]>([]),
    receipts = ref<Receipt[]>([]),
    source = ref(""),
    pending = ref<Saved | null>(null),
    current = ref<Grant | null>(null),
    loaded = ref(false),
    rightsLoaded = ref(false),
    error = ref("");
  let alive = true,
    generation = 0;
  const blocked = computed(
    () =>
      !!pending.value &&
      (pending.value.state === "prepared" ||
        pending.value.state === "unconfirmed" ||
        (pending.value.state === "observed" &&
          (!current.value || ["reserved", "uncertain"].includes(current.value.state))))
  );
  function owner() {
    const v = options.owner();
    if (!alive || !v || !uuid.test(v.case_id) || !uuid.test(v.subject))
      throw fail("proof_required");
    return { ...v };
  }
  function begin() {
    const bound = owner(),
      identity = options.identity(),
      ambient = options.ambient(),
      epoch = ++generation;
    error.value = "";
    return {
      bound,
      valid: () =>
        alive &&
        generation === epoch &&
        !!options.owner() &&
        sameOwner(bound, options.owner()!) &&
        identity === options.identity() &&
        ambient === options.ambient(),
    };
  }
  function rows(): { ambient: string; record: Saved }[] {
    const v = JSON.parse(options.storage.getItem(storageKey) || "[]");
    if (!Array.isArray(v)) throw fail("invalid_recovery");
    return v.map((row) => {
      if (typeof row.ambient !== "string") throw fail("invalid_recovery");
      return { ambient: row.ambient, record: savedFrom(row.record) };
    });
  }
  function save(record: Saved) {
    if (!sameOwner(owner(), record.owner)) throw fail("owner_changed");
    const all = rows(),
      old = all.find((r) => r.record.body.command_id === record.body.command_id)?.record;
    if (
      old &&
      (!sameOwner(old.owner, record.owner) ||
        !equal(old.body, record.body) ||
        !equal(old.original, record.original))
    )
      throw fail("conflicting_record");
    if (old) {
      record.last_grant ??= old.last_grant;
      for (const receipt of old.receipts) {
        const incoming = record.receipts.find((r) => r.id === receipt.id);
        if (incoming && !equal(incoming, receipt)) throw fail("conflicting_record");
        if (!incoming) record.receipts.push(receipt);
      }
    }
    options.storage.setItem(
      storageKey,
      JSON.stringify([
        ...all.filter((r) => r.record.body.command_id !== record.body.command_id),
        { ambient: options.ambient(), record },
      ])
    );
  }
  function selected() {
    const value = pending.value;
    if (!value || !sameOwner(owner(), value.owner)) throw fail("proof_required");
    return savedFrom(clone(value));
  }
  function clear() {
    generation++;
    sources.value = [];
    targets.value = [];
    rights.value = [];
    grants.value = [];
    receipts.value = [];
    source.value = "";
    pending.value = current.value = null;
    loaded.value = false;
    rightsLoaded.value = false;
    error.value = "";
  }
  function restore() {
    clear();
    const bound = owner();
    const record = rows()
      .filter((r) => r.ambient === options.ambient() && sameOwner(bound, r.record.owner))
      .at(-1)?.record;
    if (record) pending.value = { ...record, state: "unconfirmed" };
  }
  async function snapshot(bound: Owner): Promise<Snapshot> {
    const [v, summary]: any[] = await Promise.all([options.snapshot(), options.summary()]);
    if (
      !uuid.test(v?.case?.id) ||
      !uuid.test(v?.case?.subject) ||
      !sameOwner(bound, { case_id: v.case.id, subject: v.case.subject })
    )
      throw fail("owner_changed");
    if (
      ![
        v.subject_erasures,
        v.course_successor_grants,
        v.course_successor_receipts,
        summary?.subjects,
      ].every(Array.isArray)
    )
      throw fail("unavailable_records");
    const subjects = summary.subjects;
    if (
      subjects.some(
        (s: any) =>
          !uuid.test(s.subject) ||
          !uuid.test(s.case_id) ||
          !id(s.case_id, bound.case_id) ||
          !(s.erased_at === null || date(s.erased_at))
      )
    )
      throw fail("invalid_response");
    const active = subjects.filter((s: any) => s.erased_at === null).map((s: any) => s.subject);
    if (active.length > 1) throw fail("invalid_response");
    const erased = v.subject_erasures.map((s: any) => {
      if (
        !uuid.test(s.subject) ||
        !uuid.test(s.case_id) ||
        !id(s.case_id, bound.case_id) ||
        !uuid.test(s.request_id) ||
        !date(s.erased_at) ||
        !(s.scope === "ordinary_account"
          ? id(s.subject, bound.subject)
          : s.scope === "learning_data" &&
            subjects.some((l: any) => id(l.subject, s.subject) && l.erased_at !== null))
      )
        throw fail("invalid_response");
      return s.subject;
    });
    if (new Set(erased).size !== erased.length) throw fail("invalid_response");
    const currentGrants = v.course_successor_grants.map((g: any) => grantFrom(g, bound));
    if (new Set(currentGrants.map((g: Grant) => g.id)).size !== currentGrants.length)
      throw fail("invalid_response");
    if (
      currentGrants.some(
        (g: Grant) =>
          !erased.includes(g.original_scope.source_user_id) ||
          !subjects.some((s: any) => s.subject === g.successor)
      )
    )
      throw fail("invalid_response");
    const history = v.course_successor_receipts.map((r: any) => receiptFrom(r, currentGrants));
    if (new Set(history.map((r: Receipt) => r.id)).size !== history.length)
      throw fail("invalid_response");
    return { sources: erased, targets: active, grants: currentGrants, receipts: history };
  }
  function apply(v: Snapshot) {
    sources.value = v.sources;
    targets.value = v.targets;
    grants.value = v.grants;
    receipts.value = v.receipts;
    loaded.value = true;
  }
  function observe(v: Snapshot, value: Saved, refused = false) {
    const found = v.grants.find((g) => g.id === value.body.command_id);
    if (found) {
      matchGrant(found, value);
      value.last_grant = found;
      value.uncertain_attempt = false;
      const combined = [...value.receipts];
      for (const receipt of v.receipts.filter((r) => r.grant_id === found.id)) {
        const prior = combined.find((r) => r.id === receipt.id);
        if (prior && !equal(prior, receipt)) throw fail("conflicting_record");
        if (!prior) combined.push(receipt);
      }
      value.receipts = combined;
      value.state = "observed";
    } else if ((refused || value.state === "refused") && !value.last_grant) value.state = "refused";
    else value.state = "unconfirmed";
    save(value);
    pending.value = value;
    current.value = found ?? null;
    apply(v);
  }
  async function load() {
    const { bound, valid } = begin();
    loaded.value = false;
    current.value = null;
    const v = await snapshot(bound);
    if (!valid()) throw fail("stale_view");
    if (pending.value) observe(v, selected());
    else apply(v);
  }
  async function loadRights(selectedSource: string) {
    const { bound, valid } = begin();
    rights.value = [];
    rightsLoaded.value = false;
    source.value = selectedSource;
    const v = await snapshot(bound);
    if (!valid()) throw fail("stale_view");
    if (!v.sources.some((s) => id(s, selectedSource))) throw fail("source_changed");
    const found = rightsFrom(await options.rights(selectedSource), selectedSource);
    if (!valid()) throw fail("stale_view");
    if (pending.value) observe(v, selected());
    else apply(v);
    rights.value = found;
    rightsLoaded.value = true;
  }
  async function prepare(rightId: string, target: string) {
    if (blocked.value) throw fail("pending_request");
    const old = rights.value.find((r) => r.id === rightId),
      selectedSource = source.value;
    if (!old) throw fail("right_changed");
    const { bound, valid } = begin(),
      v = await snapshot(bound);
    if (!valid()) throw fail("stale_view");
    if (!v.sources.includes(selectedSource) || !v.targets.includes(target))
      throw fail("target_changed");
    const found = rightsFrom(await options.rights(selectedSource), selectedSource).find(
      (r) => r.id === rightId
    );
    if (!valid()) throw fail("stale_view");
    if (
      !found ||
      !equal(originalFrom(found), originalFrom(old)) ||
      ![null, target].includes(found.current_subject)
    )
      throw fail("right_changed");
    apply(v);
    if (v.grants.some((g) => g.original_contract === rightId && g.successor === target))
      throw fail("existing_request");
    const value: Saved = {
      version: 1,
      operation: "course_successor",
      owner: bound,
      body: {
        command_id: crypto.randomUUID(),
        source_subject: selectedSource,
        right_id: rightId,
        successor: target,
        continue_existing_right: true,
      },
      original: originalFrom(found),
      state: "prepared",
      uncertain_attempt: false,
      receipts: [],
    };
    save(value);
    pending.value = value;
    current.value = null;
  }
  async function recoverGrant(grantId: string) {
    if (blocked.value && pending.value?.body.command_id !== grantId) throw fail("pending_request");
    const { bound, valid } = begin(),
      v = await snapshot(bound);
    if (!valid()) throw fail("stale_view");
    const grant = v.grants.find((g) => g.id === grantId);
    if (!grant) throw fail("unavailable_records");
    const { original_scope, ...body } = grant.claimant_authorization;
    const value: Saved = {
      version: 1,
      operation: "course_successor",
      owner: bound,
      body: bodyFrom(body),
      original: original_scope,
      state: "unconfirmed",
      receipts: [],
    };
    observe(v, value);
  }
  async function submit() {
    const value = selected(),
      { bound, valid } = begin();
    const priorUnknown = value.uncertain_attempt === true;
    value.state = "unconfirmed";
    // Persist before dispatch: closing/reloading while a request is in flight
    // cannot turn its still possible commitment into a definite refusal.
    value.uncertain_attempt = true;
    save(value);
    pending.value = value;
    current.value = null;
    let refused = false;
    try {
      const result = await options.continueCourse(clone(value.body));
      if (!valid()) throw fail("stale_view");
      const grant = grantFrom(result, bound);
      matchGrant(grant, value);
      value.last_grant = grant;
      value.uncertain_attempt = false;
      save(value);
      pending.value = value;
    } catch (cause: any) {
      if (!valid()) throw cause;
      refused = !priorUnknown && (cause?.response?.status ?? cause?.statusCode) === 409;
      if (refused) value.uncertain_attempt = false;
      // A409 can occur after reservation. Only a fresh matching export may
      // distinguish that case; an absent row after transport loss proves nothing.
      const v = await snapshot(bound);
      if (!valid()) throw fail("stale_view");
      observe(v, value, refused);
      throw cause;
    }
    const v = await snapshot(bound);
    if (!valid()) throw fail("stale_view");
    observe(v, value);
  }
  function importRecovery(text: string) {
    const value = savedFrom(JSON.parse(text));
    if (!sameOwner(owner(), value.owner)) throw fail("owner_changed");
    if (blocked.value && pending.value?.body.command_id !== value.body.command_id)
      throw fail("pending_request");
    generation++;
    // A saved file cannot establish whether this command was submitted after download.
    // Only a matching current server record can reconcile that missing history.
    value.uncertain_attempt = true;
    value.state = "unconfirmed";
    save(value);
    pending.value = value;
    current.value = null;
  }
  return {
    sources,
    targets,
    rights,
    grants,
    receipts,
    source,
    pending,
    current,
    loaded,
    rightsLoaded,
    blocked,
    error,
    load,
    loadRights,
    prepare,
    recoverGrant,
    submit,
    restore,
    importRecovery,
    clear,
    recoveryText: () => JSON.stringify(selected(), null, 2),
    dispose() {
      clear();
      alive = false;
    },
  };
}
