import { computed, ref } from "vue";

type Owner = { case_id: string; subject: string };
export type PremiumContinuationBody = {
  command_id: string;
  successor: string;
  evidence_id: string;
  continue_existing_right: true;
};
type Original = {
  id: string;
  user_id: string;
  since: string;
  until: string;
  observed_at: string;
  subject: string;
  request_id: string;
  scope: string;
};
type Observation = {
  id: string;
  case_id: string;
  category: "premium_right";
  source_key: string;
  evidence: Original;
  recorded_at: string;
};
type Continuation = {
  id: string;
  case_id: string;
  kind: "premium";
  source_evidence: string;
  source_subject: string;
  subject: string;
  command_id: string;
  original: Original;
  election: PremiumContinuationBody;
  result: {
    period_id: string;
    since: string;
    until: string;
    new_purchase: false;
    renewal_activated: false;
    original_period_id: string;
    current_access_granted: true;
  };
  created_at: string;
  state: "active" | "withdrawn";
};
type Saved = {
  version: 1;
  operation: "premium_continue";
  owner: Owner;
  body: PremiumContinuationBody;
  observation: Observation;
  state: "prepared" | "unconfirmed" | "observed" | "refused";
  uncertain_attempt?: boolean;
  receipt?: Continuation;
  last?: Continuation;
};
type Snapshot = {
  observations: Observation[];
  continuations: Continuation[];
  targets: string[];
  withdrawnSubjects: string[];
  journal: Map<string, Continuation>;
};
type Options = {
  owner: () => Owner | null;
  identity: () => string;
  ambient: () => string;
  storage: Storage;
  snapshot: () => Promise<unknown>;
  summary: () => Promise<unknown>;
  rights: () => Promise<unknown>;
  continuePremium: (body: PremiumContinuationBody) => Promise<unknown>;
  now?: () => number;
  onErasedSubject?: (subject: string) => void;
};
const key = "commercial-premium-continuation-v1";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object = (v: any) => v !== null && typeof v === "object" && !Array.isArray(v);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const canonical = (v: any): string =>
  JSON.stringify(v, (_k, x) =>
    object(x)
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((k) => [k, x[k]])
        )
      : x
  );
const equal = (a: any, b: any) => canonical(a) === canonical(b);
const sameOwner = (a: Owner, b: Owner) => a.case_id === b.case_id && a.subject === b.subject;
const fail = (kind: string) => new Error(kind);
// Preserve original strings; compare instants including PostgreSQL microseconds.
function instant(v: any): bigint | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(
    v
  );
  if (!m || +m[2] > 23 || +m[3] > 59 || +m[4] > 59) return null;
  const day = new Date(m[1] + "T00:00:00Z"),
    millis = Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}${m[6]}`);
  if (
    !Number.isFinite(millis) ||
    !Number.isFinite(day.getTime()) ||
    day.toISOString().slice(0, 10) !== m[1]
  )
    return null;
  return BigInt(millis) * 1000000n + BigInt((m[5] || "").padEnd(9, "0"));
}
const date = (v: any) => instant(v) !== null;
export function premiumPeriodState(period: { since: string; until: string }, now = Date.now()) {
  const since = instant(period.since),
    until = instant(period.until);
  if (since === null || until === null || since >= until || !Number.isFinite(now))
    return "unavailable";
  const current = BigInt(Math.trunc(now)) * 1000000n;
  return current < since ? "future" : current >= until ? "expired" : "current";
}
function bodyFrom(v: any): PremiumContinuationBody {
  if (
    !object(v) ||
    Object.keys(v).sort().join() !== "command_id,continue_existing_right,evidence_id,successor" ||
    ![v.command_id, v.successor, v.evidence_id].every((x) => uuid.test(x)) ||
    v.continue_existing_right !== true
  )
    throw fail("invalid_recovery");
  return clone(v);
}
function originalFrom(v: any): Original {
  if (
    !object(v) ||
    ![v.id, v.user_id, v.subject, v.request_id].every((x) => uuid.test(x)) ||
    v.user_id !== v.subject ||
    ![v.since, v.until, v.observed_at].every(date) ||
    instant(v.since)! >= instant(v.until)! ||
    typeof v.scope !== "string" ||
    !v.scope
  )
    throw fail("invalid_response");
  return clone(v);
}
function observationFrom(v: any, owner: Owner): Observation {
  const original = originalFrom(v?.evidence);
  if (
    !uuid.test(v?.id) ||
    v.case_id !== owner.case_id ||
    v.category !== "premium_right" ||
    v.source_key !== original.id ||
    !date(v.recorded_at)
  )
    throw fail("invalid_response");
  return clone(v);
}
function continuationFrom(v: any, owner: Owner): Continuation {
  const original = originalFrom(v?.original),
    body = bodyFrom(v?.election),
    result = v?.result;
  if (
    !object(v) ||
    ![v.id, v.source_evidence, v.source_subject, v.subject, v.command_id].every((x) =>
      uuid.test(x)
    ) ||
    v.case_id !== owner.case_id ||
    v.kind !== "premium" ||
    v.source_subject !== original.subject ||
    body.command_id !== v.command_id ||
    body.evidence_id !== v.source_evidence ||
    body.successor !== v.subject ||
    !date(v.created_at) ||
    !["active", "withdrawn"].includes(v.state) ||
    !object(result) ||
    !uuid.test(result.period_id) ||
    result.original_period_id !== original.id ||
    !date(result.since) ||
    !date(result.until) ||
    instant(result.since) !== instant(original.since) ||
    instant(result.until) !== instant(original.until) ||
    result.new_purchase !== false ||
    result.renewal_activated !== false ||
    result.current_access_granted !== true
  )
    throw fail("invalid_response");
  return clone(v);
}
function immutable(row: Continuation) {
  const { state, ...rest } = row;
  return rest;
}
function match(row: Continuation, record: Saved) {
  if (
    !equal(row.election, record.body) ||
    row.source_evidence !== record.observation.id ||
    !equal(row.original, record.observation.evidence)
  )
    throw fail("conflicting_record");
}
function savedFrom(v: any): Saved {
  if (
    v?.version !== 1 ||
    v.operation !== "premium_continue" ||
    !uuid.test(v.owner?.case_id) ||
    !uuid.test(v.owner?.subject) ||
    !["prepared", "unconfirmed", "observed", "refused"].includes(v.state) ||
    (v.uncertain_attempt !== undefined && typeof v.uncertain_attempt !== "boolean")
  )
    throw fail("invalid_recovery");
  const body = bodyFrom(v.body),
    observation = observationFrom(v.observation, v.owner);
  if (body.evidence_id !== observation.id) throw fail("invalid_recovery");
  const record: Saved = { ...clone(v), body, observation };
  record.uncertain_attempt ??= record.state !== "prepared" && !record.receipt;
  for (const r of [record.receipt, record.last])
    if (r) match(continuationFrom(r, record.owner), record);
  if (record.receipt && record.last && !equal(immutable(record.receipt), immutable(record.last)))
    throw fail("conflicting_record");
  return record;
}

/** Exact personal continuation is history; it never supplies learning credentials. */
export function createPremiumContinuation(options: Options) {
  const observations = ref<Observation[]>([]),
    continuations = ref<Continuation[]>([]),
    targets = ref<string[]>([]),
    withdrawnSubjects = ref<string[]>([]),
    pending = ref<Saved | null>(null),
    current = ref<Continuation | null>(null),
    loaded = ref(false);
  let alive = true,
    generation = 0,
    liveScope = "";
  const blocked = computed(
    () =>
      !!pending.value &&
      (!["observed", "refused"].includes(pending.value.state) ||
        (pending.value.state === "observed" && !current.value))
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
    const scope = canonical([bound, identity, ambient]);
    if (scope !== liveScope) {
      withdrawnSubjects.value = [];
      liveScope = scope;
    }
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
    const values = JSON.parse(options.storage.getItem(key) || "[]");
    if (!Array.isArray(values)) throw fail("invalid_recovery");
    return values.map((row) => {
      if (typeof row?.ambient !== "string") throw fail("invalid_recovery");
      return { ambient: row.ambient, record: savedFrom(row.record) };
    });
  }
  function merge(row: Continuation, old?: Continuation) {
    if (!old) return row;
    if (!equal(immutable(old), immutable(row))) throw fail("conflicting_record");
    return old.state === "withdrawn" ? old : row;
  }
  function save(value: Saved) {
    if (!sameOwner(owner(), value.owner)) throw fail("owner_changed");
    const all = rows(),
      old = all.find((r) => r.record.body.command_id === value.body.command_id)?.record;
    if (old) {
      if (
        !sameOwner(old.owner, value.owner) ||
        !equal(old.body, value.body) ||
        !equal(old.observation, value.observation)
      )
        throw fail("conflicting_record");
      if (old.receipt && value.receipt && !equal(immutable(old.receipt), immutable(value.receipt)))
        throw fail("conflicting_record");
      value.receipt = old.receipt ?? value.receipt;
      value.last = value.last ? merge(value.last, old.last) : old.last;
    }
    options.storage.setItem(
      key,
      JSON.stringify([
        ...all.filter((r) => r.record.body.command_id !== value.body.command_id),
        { ambient: options.ambient(), record: value },
      ])
    );
  }
  function selected() {
    const value = pending.value;
    if (!value || !sameOwner(owner(), value.owner)) throw fail("proof_required");
    return savedFrom(value);
  }
  function clear() {
    generation++;
    observations.value = [];
    continuations.value = [];
    targets.value = [];
    withdrawnSubjects.value = [];
    pending.value = current.value = null;
    loaded.value = false;
  }
  function restore() {
    clear();
    const bound = owner(),
      all = rows().filter(
        (r) => r.ambient === options.ambient() && sameOwner(r.record.owner, bound)
      );
    const record =
      all.findLast((r) => ["prepared", "unconfirmed"].includes(r.record.state))?.record ??
      all.at(-1)?.record;
    if (record)
      pending.value = {
        ...record,
        state: record.state === "prepared" ? "prepared" : "unconfirmed",
      };
  }
  function summarySubjects(summary: any, bound: Owner): any[] {
    if (!Array.isArray(summary?.subjects) || typeof summary.scope !== "string" || !summary.scope)
      throw fail("unavailable_records");
    const subjects = summary.subjects;
    if (
      subjects.some(
        (s: any) =>
          !uuid.test(s.subject) ||
          s.case_id !== bound.case_id ||
          !date(s.created_at) ||
          !(s.erased_at === null || date(s.erased_at)) ||
          !Number.isSafeInteger(s.authority_epoch) ||
          s.authority_epoch < 1 ||
          !uuid.test(s.election_id) ||
          !object(s.election) ||
          !object(s.contract_permissions)
      ) ||
      new Set(subjects.map((s: any) => s.subject)).size !== subjects.length
    )
      throw fail("invalid_response");
    if (subjects.filter((s: any) => s.erased_at === null).length > 1)
      throw fail("invalid_response");
    return subjects;
  }
  function publishErased(subject: string, valid: () => boolean) {
    if (!valid() || withdrawnSubjects.value.includes(subject)) return;
    withdrawnSubjects.value = [...withdrawnSubjects.value, subject];
    targets.value = targets.value.filter((target) => target !== subject);
    options.onErasedSubject?.(subject);
  }
  function withdrawnRows(
    observations: any,
    allContinuations: any,
    bound: Owner,
    strictObservations: boolean
  ): string[] {
    if (!Array.isArray(observations) || !Array.isArray(allContinuations))
      throw fail("unavailable_records");
    const originals = observations.flatMap((v: any) => {
      if (!object(v)) throw fail("invalid_response");
      if (
        v.category !== "premium_right" &&
        (!strictObservations ||
          (v.category === "heart_balance_at_erasure" && v.case_id === bound.case_id))
      )
        return [];
      return [observationFrom(v, bound)];
    });
    const rows = allContinuations.flatMap((v: any) => {
      if (v?.kind === "heart_counter" && v.case_id === bound.case_id) return [];
      const row = continuationFrom(v, bound);
      const original = originals.find((o: Observation) => o.id === row.source_evidence);
      if (!original || !equal(row.original, original.evidence)) throw fail("invalid_response");
      const prior = continuations.value.find((r) => r.id === row.id);
      if (prior) merge(row, prior);
      return [row];
    });
    if (
      new Set(originals.map((o: Observation) => o.id)).size !== originals.length ||
      new Set(rows.map((r: Continuation) => r.id)).size !== rows.length ||
      new Set(rows.map((r: Continuation) => r.command_id)).size !== rows.length ||
      new Set(rows.map((r: Continuation) => r.source_evidence + ":" + r.subject)).size !==
        rows.length
    )
      throw fail("invalid_response");
    return rows
      .filter((r: Continuation) => r.state === "withdrawn")
      .map((r: Continuation) => r.subject);
  }
  function withdrawnRights(rights: any, bound: Owner): string[] {
    if (rights?.paid_allocation_inferred !== false) throw fail("unavailable_records");
    return withdrawnRows(rights.observations, rights.continuations, bound, true);
  }
  function exportedErasures(v: any, bound: Owner): string[] {
    if (!Array.isArray(v.subject_erasures)) throw fail("unavailable_records");
    const rows = v.subject_erasures;
    if (
      rows.some(
        (s: any) =>
          !uuid.test(s?.subject) ||
          s.case_id !== bound.case_id ||
          !uuid.test(s.request_id) ||
          !date(s.erased_at) ||
          !(
            s.scope === "learning_data" ||
            (s.scope === "ordinary_account" && s.subject === bound.subject)
          )
      ) ||
      new Set(rows.map((s: any) => s.subject)).size !== rows.length
    )
      throw fail("invalid_response");
    return rows.map((s: any) => s.subject);
  }
  function publishExport(v: any, bound: Owner, valid: () => boolean) {
    if (v?.case?.id !== bound.case_id || v?.case?.subject !== bound.subject)
      throw fail("owner_changed");
    // Each live, owned export section can establish exact-subject erasure.
    // A missing/stale sibling cannot retract that evidence; the strict aggregate
    // below still controls command history and never grants access from it.
    for (const qualify of [
      () => exportedErasures(v, bound),
      () => withdrawnRows(v.evidence, v.resource_continuations, bound, false),
    ]) {
      let subjects: string[];
      try {
        subjects = qualify();
      } catch {
        continue;
      }
      for (const subject of subjects) publishErased(subject, valid);
    }
  }
  async function snapshot(bound: Owner, valid: () => boolean): Promise<Snapshot> {
    const [v, summary, rights]: any[] = await Promise.all([
      options.snapshot().then((value) => {
        if (!valid()) throw fail("stale_view");
        publishExport(value, bound, valid);
        return value;
      }),
      options.summary().then((value) => {
        if (!valid()) throw fail("stale_view");
        for (const subject of summarySubjects(value, bound))
          if (subject.erased_at !== null) publishErased(subject.subject, valid);
        return value;
      }),
      options.rights().then((value) => {
        if (!valid()) throw fail("stale_view");
        for (const subject of withdrawnRights(value, bound)) publishErased(subject, valid);
        return value;
      }),
    ]);
    if (v?.case?.id !== bound.case_id || v?.case?.subject !== bound.subject)
      throw fail("owner_changed");
    if (
      ![
        v.evidence,
        v.subject_erasures,
        v.resource_continuations,
        v.journal,
        summary?.subjects,
        rights?.observations,
        rights?.continuations,
      ].every(Array.isArray) ||
      typeof summary.scope !== "string" ||
      !summary.scope ||
      rights.paid_allocation_inferred !== false
    )
      throw fail("unavailable_records");
    const subjects = summarySubjects(summary, bound);
    const active = subjects.filter((s: any) => s.erased_at === null).map((s: any) => s.subject);
    if (active.length > 1) throw fail("invalid_response");
    const erased = v.subject_erasures;
    if (
      erased.some(
        (s: any) =>
          !uuid.test(s.subject) ||
          s.case_id !== bound.case_id ||
          !uuid.test(s.request_id) ||
          !date(s.erased_at) ||
          !(s.scope === "ordinary_account"
            ? s.subject === bound.subject
            : s.scope === "learning_data" &&
              subjects.some((l: any) => l.subject === s.subject && l.erased_at !== null))
      ) ||
      new Set(erased.map((s: any) => s.subject)).size !== erased.length
    )
      throw fail("invalid_response");
    const parseObservations = (all: any[], strict: boolean) =>
      all.flatMap((e) => {
        if (!object(e)) throw fail("invalid_response");
        if (e.category !== "premium_right") {
          if (strict && (e.category !== "heart_balance_at_erasure" || e.case_id !== bound.case_id))
            throw fail("invalid_response");
          return [];
        }
        const row = observationFrom(e, bound);
        if (
          !erased.some(
            (s: any) =>
              s.subject === row.evidence.subject && s.request_id === row.evidence.request_id
          )
        )
          throw fail("invalid_response");
        return [row];
      });
    const originals = parseObservations(rights.observations, true),
      exported = parseObservations(v.evidence, false);
    if (
      new Set(originals.map((e) => e.id)).size !== originals.length ||
      new Set(exported.map((e) => e.id)).size !== exported.length ||
      originals.length !== exported.length ||
      originals.some((e) => !exported.some((o) => o.id === e.id && equal(o, e)))
    )
      throw fail("invalid_response");
    const parseContinuations = (all: any[]) =>
      all.flatMap((r) => {
        if (
          !object(r) ||
          !["premium", "heart_counter"].includes(r.kind) ||
          r.case_id !== bound.case_id
        )
          throw fail("invalid_response");
        if (r.kind === "heart_counter") return [];
        const row = continuationFrom(r, bound),
          original = originals.find((e) => e.id === row.source_evidence);
        if (
          !original ||
          !equal(row.original, original.evidence) ||
          !subjects.some((s: any) => s.subject === row.subject) ||
          (erased.some((s: any) => s.subject === row.subject) && row.state !== "withdrawn")
        )
          throw fail("invalid_response");
        return [row];
      });
    const found = parseContinuations(rights.continuations),
      inExport = parseContinuations(v.resource_continuations);
    if (
      new Set(found.map((r) => r.id)).size !== found.length ||
      new Set(found.map((r) => r.command_id)).size !== found.length ||
      new Set(found.map((r) => r.source_evidence + ":" + r.subject)).size !== found.length ||
      new Set(inExport.map((r) => r.id)).size !== inExport.length ||
      found.length !== inExport.length
    )
      throw fail("invalid_response");
    const joined = found.map((r) => {
      const other = inExport.find((x) => x.id === r.id);
      if (!other) throw fail("invalid_response");
      return merge(r, other);
    });
    const journal = new Map<string, Continuation>();
    if (
      v.journal.some(
        (j: any) =>
          j?.kind === "premium_continue" && !joined.some((row) => row.command_id === j.command_id)
      )
    )
      throw fail("unavailable_records");
    for (const row of joined) {
      const entries = v.journal.filter((j: any) => j?.command_id === row.command_id);
      if (entries.length !== 1) throw fail("invalid_response");
      const j = entries[0];
      if (
        j.actor !== bound.subject ||
        j.case_id !== bound.case_id ||
        j.kind !== "premium_continue" ||
        !equal(bodyFrom(j.request), row.election)
      )
        throw fail("invalid_response");
      const receipt = continuationFrom(j.result, bound);
      if (!equal(immutable(receipt), immutable(row))) throw fail("conflicting_record");
      journal.set(row.command_id, receipt);
    }
    for (const subject of erased) publishErased(subject.subject, valid);
    return {
      observations: originals,
      continuations: joined,
      targets: active,
      withdrawnSubjects: erased.map((s: any) => s.subject),
      journal,
    };
  }
  function apply(v: Snapshot) {
    const old = new Map(continuations.value.map((r) => [r.id, r]));
    observations.value = v.observations;
    continuations.value = v.continuations.map((r) => merge(r, old.get(r.id)));
    withdrawnSubjects.value = [...new Set([...withdrawnSubjects.value, ...v.withdrawnSubjects])];
    targets.value = v.targets.filter((target) => !withdrawnSubjects.value.includes(target));
    loaded.value = true;
  }
  function observe(v: Snapshot, value: Saved, refused = false) {
    const row = v.continuations.find((r) => r.command_id === value.body.command_id);
    if (row) {
      match(row, value);
      value.last = merge(row, value.last);
      value.receipt ??= v.journal.get(row.command_id);
      value.uncertain_attempt = false;
      value.state = "observed";
    } else if ((refused || value.state === "refused") && !value.receipt && !value.last)
      value.state = "refused";
    else if (value.state !== "prepared") value.state = "unconfirmed";
    save(value);
    pending.value = value;
    current.value = row ? value.last! : null;
    apply(v);
  }
  async function load() {
    const { bound, valid } = begin();
    loaded.value = false;
    current.value = null;
    const v = await snapshot(bound, valid);
    if (!valid()) throw fail("stale_view");
    if (pending.value) observe(v, selected());
    else apply(v);
  }
  async function prepare(evidence: string, target: string) {
    if (blocked.value) throw fail("pending_request");
    const previous = observations.value.find((e) => e.id === evidence);
    if (!previous) throw fail("right_changed");
    const { bound, valid } = begin(),
      v = await snapshot(bound, valid);
    if (!valid()) throw fail("stale_view");
    const row = v.observations.find((e) => e.id === evidence);
    if (!row || !equal(row, previous)) throw fail("right_changed");
    apply(v);
    if (!targets.value.includes(target)) throw fail("target_changed");
    if (v.continuations.some((r) => r.source_evidence === evidence && r.subject === target))
      throw fail("existing_request");
    if (premiumPeriodState(row.evidence, options.now?.() ?? Date.now()) !== "current")
      throw fail("period_unavailable");
    const value: Saved = {
      version: 1,
      operation: "premium_continue",
      owner: bound,
      body: {
        command_id: crypto.randomUUID(),
        successor: target,
        evidence_id: evidence,
        continue_existing_right: true,
      },
      observation: row,
      state: "prepared",
      uncertain_attempt: false,
    };
    save(value);
    pending.value = value;
    current.value = null;
  }
  async function recoverContinuation(id: string) {
    const prior = continuations.value.find((r) => r.id === id);
    if (!prior) throw fail("unavailable_records");
    if (blocked.value && pending.value?.body.command_id !== prior.command_id)
      throw fail("pending_request");
    const { bound, valid } = begin(),
      v = await snapshot(bound, valid);
    if (!valid()) throw fail("stale_view");
    const row = v.continuations.find((r) => r.id === id);
    if (!row || !equal(immutable(row), immutable(prior))) throw fail("conflicting_record");
    const observation = v.observations.find((e) => e.id === row.source_evidence)!;
    observe(v, {
      version: 1,
      operation: "premium_continue",
      owner: bound,
      body: row.election,
      observation,
      state: "unconfirmed",
      uncertain_attempt: true,
    });
  }
  async function submit() {
    const value = selected(),
      { bound, valid } = begin(),
      priorUnknown = value.uncertain_attempt === true;
    value.state = "unconfirmed";
    value.uncertain_attempt = true;
    save(value);
    pending.value = value;
    current.value = null;
    loaded.value = false;
    let refused = false;
    try {
      const row = continuationFrom(await options.continuePremium(clone(value.body)), bound);
      if (!valid()) throw fail("stale_view");
      match(row, value);
      value.receipt ??= row;
      value.last = merge(row, value.last);
      if (row.state === "withdrawn") publishErased(row.subject, valid);
      save(value);
      pending.value = value;
    } catch (cause: any) {
      if (!valid()) throw cause;
      refused =
        !priorUnknown &&
        !value.receipt &&
        !value.last &&
        (cause?.response?.status ?? cause?.statusCode) === 409;
      if (refused) value.uncertain_attempt = false;
      const v = await snapshot(bound, valid);
      if (!valid()) throw fail("stale_view");
      observe(v, value, refused);
      throw cause;
    }
    const v = await snapshot(bound, valid);
    if (!valid()) throw fail("stale_view");
    observe(v, value);
  }
  function importRecovery(text: string) {
    const value = savedFrom(JSON.parse(text));
    if (!sameOwner(owner(), value.owner)) throw fail("owner_changed");
    if (blocked.value && pending.value?.body.command_id !== value.body.command_id)
      throw fail("pending_request");
    generation++;
    value.state = "unconfirmed";
    value.uncertain_attempt = true;
    save(value);
    pending.value = value;
    current.value = null;
    loaded.value = false;
  }
  return {
    observations,
    continuations,
    targets,
    withdrawnSubjects,
    pending,
    current,
    loaded,
    blocked,
    load,
    prepare,
    recoverContinuation,
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
