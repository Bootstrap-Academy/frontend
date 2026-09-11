import { ref } from "vue";
import type { PremiumContinuationBody } from "./premiumContinuation";
import type { CourseContinuationBody } from "./courseContinuation";
import { commercialStatementPath } from "./commercialStatus";
import type { LearningStartBody } from "./learningAccess";
import type { OriginalReadContext } from "./originalDocuments";

export type CommercialProof = { kind: "claim" | "moderation"; secret: string; subject?: string };
type Owner = { case_id: string; subject: string; access_epoch: number };
type Rotation = {
  version: 1;
  owner: Owner;
  body: { command_id: string; case_id: string; key: string };
  state: "prepared" | "unconfirmed" | "recorded" | "active" | "inactive";
};
type SavedRotation = { ambient: string; rotation: Rotation };
type Options = {
  fetch: (path: string, options: any) => Promise<any>;
  storage: Storage;
  ambient: () => string;
  identity: () => string;
  personalProof: () => CommercialProof | null;
  personalReadContext?: () => OriginalReadContext | null;
  ordinaryReadContext?: () => OriginalReadContext | null;
};
const rotationsKey = "commercial-access-rotations-v1";
const currentKey = "commercial-current-proof-v1";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keyFormat = /^[A-Za-z0-9_-]{43,256}$/;
const sameOwner = (a: Owner, b: Owner) =>
  a.case_id.toLowerCase() === b.case_id.toLowerCase() &&
  a.subject.toLowerCase() === b.subject.toLowerCase();
const failure = (kind: string) => new Error(kind);
const unauthorized = (error: any) => (error?.response?.status ?? error?.statusCode) === 401;

type OpenReceipt = { case_id: string; status: "inventory_pending" };
type CaseOpening = {
  version: 1;
  operation: "open";
  subject: string;
  body: { command_id: string };
  state: "unconfirmed" | "recorded";
  receipt?: OpenReceipt;
};
const openingKey = "commercial-case-opening-v1";
const object = (v: any) => v !== null && typeof v === "object" && !Array.isArray(v);
const date = (v: any) => typeof v === "string" && Number.isFinite(Date.parse(v));
const same = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
function openingReceipt(v: any): OpenReceipt {
  if (
    !object(v) ||
    Object.keys(v).sort().join() !== "case_id,status" ||
    !uuid.test(v.case_id) ||
    v.status !== "inventory_pending"
  )
    throw failure("invalid_response");
  return { case_id: v.case_id, status: v.status };
}
function openingFrom(v: any): CaseOpening {
  if (
    v?.version !== 1 ||
    v?.operation !== "open" ||
    !uuid.test(v.subject) ||
    !object(v.body) ||
    Object.keys(v.body).join() !== "command_id" ||
    !uuid.test(v.body.command_id) ||
    !["unconfirmed", "recorded"].includes(v.state)
  )
    throw failure("invalid_recovery");
  return {
    version: 1,
    operation: "open",
    subject: v.subject,
    body: { command_id: v.body.command_id },
    state: v.state,
    ...(v.receipt === undefined ? {} : { receipt: openingReceipt(v.receipt) }),
  };
}
// Actual additive SQL export families are present even without a case or intake.
// Their absence is unavailable data, not permission to create a case.
function openingExport(v: any, subject: string): Owner | null {
  const families = [
    "reservation_splits",
    "cash_payments",
    "cash_allocations",
    "subject_erasures",
    "service_erasure_intakes",
    "course_successor_grants",
    "course_successor_receipts",
    "resource_continuations",
    "event_successor_grants",
    "event_successor_receipts",
    "event_cancellation_declarations",
    "event_cancellation_observations",
  ];
  if (
    !object(v) ||
    !object(v.retention_reviews) ||
    typeof v.retention_reviews.scope !== "string" ||
    !v.retention_reviews.scope ||
    ![
      ...families.map((k) => v[k]),
      ...["statement_reviews", "archive_work", "history", "owner_associations"].map(
        (k) => v.retention_reviews[k]
      ),
    ].every((rows) => Array.isArray(rows) && rows.every(object))
  )
    throw failure("invalid_response");
  const intake = v.erasure_intake;
  if (
    intake != null &&
    (!object(intake) ||
      !uuid.test(intake.id) ||
      intake.subject !== subject ||
      !date(intake.received_at) ||
      !date(intake.recorded_at) ||
      intake.source !== "authenticated_service_receipt" ||
      !object(intake.declaration))
  )
    throw failure("invalid_response");
  if (object(v.case)) {
    const found = ownerFrom(v);
    if (found.subject.toLowerCase() !== subject.toLowerCase()) throw failure("owner_changed");
    if (
      ![
        "requests",
        "obligations",
        "evidence",
        "journal",
        "reservations",
        "document_holds",
        "contract_holds",
        "renewal_holds",
        "legacy_renewal_holds",
        "disposals",
      ].every((k) => Array.isArray(v[k]) && v[k].every(object))
    )
      throw failure("invalid_response");
    return found;
  }
  if (families.some((k) => v[k].length !== 0)) throw failure("invalid_response");
  if (Object.hasOwn(v, "case")) {
    if (v.case !== null || !intake || v.financial_inventory !== "pending")
      throw failure("invalid_response");
  } else if (Object.hasOwn(v, "erasure_intake") || Object.hasOwn(v, "financial_inventory"))
    throw failure("invalid_response");
  return null;
}

function ownerFrom(value: any): Owner {
  const c = value?.case;
  if (c == null) throw failure("no_case");
  if (
    !uuid.test(c.id) ||
    !uuid.test(c.subject) ||
    !Number.isSafeInteger(c.access_epoch) ||
    c.access_epoch < 1
  )
    throw failure("invalid_response");
  return { case_id: c.id, subject: c.subject, access_epoch: c.access_epoch };
}
function rotationFrom(value: any): Rotation {
  const owner = ownerFrom({ case: { id: value?.owner?.case_id, ...value?.owner } });
  const body = value?.body;
  if (
    value?.version !== 1 ||
    !body ||
    Object.keys(body).sort().join() !== "case_id,command_id,key" ||
    !uuid.test(body.command_id) ||
    body.case_id !== owner.case_id ||
    !keyFormat.test(body.key) ||
    !["prepared", "unconfirmed", "recorded", "active", "inactive"].includes(value.state)
  )
    throw failure("invalid_recovery");
  return { version: 1, owner, body: { ...body }, state: value.state };
}

/** Personal commercial proof is independent of the ordinary session and inbox.
 * Browser records preserve an exact request; only an owned server export proves
 * that a credential is current. Secrets never enter Nuxt's serialized state.
 */
export function createCommercialAccess(options: Options) {
  const owner = ref<Owner | null>(null);
  const pending = ref<Rotation | null>(null);
  const state = ref<"idle" | "loading" | "ready" | "working" | "error">("idle");
  const error = ref("");
  const generation = ref(0);
  const caseOpening = ref<CaseOpening | null>(null),
    canOpenCase = ref(false),
    openingProofUnavailable = ref(false);
  let openingGeneration = 0;
  let proof: CommercialProof | null = null;
  let alive = true;
  let boundIdentity = "",
    boundAmbient = "";
  function guard() {
    const view = options.identity(),
      ambient = options.ambient(),
      epoch = generation.value;
    return () =>
      alive &&
      view === options.identity() &&
      ambient === options.ambient() &&
      epoch === generation.value;
  }
  function clear() {
    generation.value++;
    openingGeneration++;
    caseOpening.value = null;
    canOpenCase.value = openingProofUnavailable.value = false;
    proof = null;
    owner.value = pending.value = null;
    state.value = "idle";
    error.value = "";
  }
  function requireOwner() {
    if (
      !owner.value ||
      boundIdentity !== options.identity() ||
      boundAmbient !== options.ambient()
    ) {
      clear();
      throw failure("proof_required");
    }
    return owner.value;
  }
  function saved(): SavedRotation[] {
    const raw = options.storage.getItem(rotationsKey);
    if (!raw) return [];
    const values = JSON.parse(raw);
    if (!Array.isArray(values)) throw failure("invalid_recovery");
    return values.map((v) => {
      if (typeof v.ambient !== "string") throw failure("invalid_recovery");
      return { ambient: v.ambient, rotation: rotationFrom(v.rotation) };
    });
  }
  function save(value: Rotation) {
    const rows = saved(),
      index = rows.findIndex((r) => r.rotation.body.command_id === value.body.command_id);
    if (
      index >= 0 &&
      (JSON.stringify(rows[index].rotation.body) !== JSON.stringify(value.body) ||
        JSON.stringify(rows[index].rotation.owner) !== JSON.stringify(value.owner))
    )
      throw failure("invalid_recovery");
    const entry = { ambient: options.ambient(), rotation: value };
    if (index >= 0) rows[index] = entry;
    else rows.push(entry);
    // This must succeed before dispatch. Never silently fall back to memory.
    options.storage.setItem(rotationsKey, JSON.stringify(rows));
  }
  function selectPending(selected: Owner, currentProof: CommercialProof) {
    const rows = saved().filter(
      (r) => r.ambient === options.ambient() && sameOwner(r.rotation.owner, selected)
    );
    const recorded =
      rows.findLast((r) => !["active", "inactive"].includes(r.rotation.state))?.rotation ??
      rows.at(-1)?.rotation ??
      null;
    // A saved success describes its earlier check. Another current credential
    // for the same owner cannot establish that this exact replacement is live.
    const exactCurrentKey =
      recorded &&
      currentProof.kind === "claim" &&
      currentProof.secret === recorded.body.key &&
      selected.access_epoch > recorded.owner.access_epoch;
    pending.value =
      recorded?.state === "active" && !exactCurrentKey
        ? { ...recorded, state: "unconfirmed" }
        : recorded;
  }
  async function request(path: string, selected: CommercialProof, body?: any, blob = false) {
    if (!keyFormat.test(selected.secret) && selected.kind === "claim")
      throw failure("proof_required");
    const valid = guard();
    let result: any;
    try {
      result = await options.fetch(`/shop/claims${path}`, {
        method: blob ? "GET" : "POST",
        ...(blob ? { responseType: "blob" } : { body: body ?? {} }),
        credentials: "omit",
        retry: 0,
        timeout: 20000,
        headers:
          selected.kind === "claim"
            ? { "x-commercial-claim-key": selected.secret }
            : { "x-moderation-capability": selected.secret },
      });
    } catch (cause) {
      if (
        valid() &&
        unauthorized(cause) &&
        proof?.kind === selected.kind &&
        proof.secret === selected.secret
      ) {
        // Invalidate every older read/download and unmount owned records. Keep
        // the original request in storage for a deliberate valid reconnect.
        clear();
        state.value = "error";
        error.value = "proof_required";
      }
      throw cause;
    }
    if (!valid()) throw failure("stale_view");
    return result;
  }
  async function inspect(selected: CommercialProof, expected?: Owner) {
    const result = await request("/recipient/export", selected);
    const found = ownerFrom(result);
    if (
      (expected && !sameOwner(expected, found)) ||
      (selected.subject && selected.subject.toLowerCase() !== found.subject.toLowerCase())
    )
      throw failure("owner_changed");
    return found;
  }
  function bind(selected: CommercialProof, found: Owner) {
    if (selected.kind === "claim")
      options.storage.setItem(
        currentKey,
        JSON.stringify({ ambient: options.ambient(), owner: found, key: selected.secret })
      );
    proof = selected;
    generation.value++;
    boundIdentity = options.identity();
    boundAmbient = options.ambient();
    owner.value = found;
    selectPending(found, selected);
    selectOpening(found.subject);
    canOpenCase.value = false;
    state.value = "ready";
    error.value = "";
  }
  async function connect(selected: CommercialProof, expected?: Owner) {
    clear();
    state.value = "loading";
    const valid = guard();
    try {
      const found = await inspect(selected, expected);
      if (!valid()) throw failure("stale_view");
      bind(selected, found);
    } catch (cause: any) {
      if (valid()) {
        state.value = "error";
        error.value = unauthorized(cause) ? "proof_required" : cause.message || "request_failed";
      }
      throw cause;
    }
  }
  async function connectKey(key: string) {
    await connect({ kind: "claim", secret: key.trim() });
  }
  function personalOpeningProof() {
    const selected = options.personalProof();
    if (
      !selected ||
      selected.kind !== "moderation" ||
      typeof selected.secret !== "string" ||
      !selected.secret ||
      typeof selected.subject !== "string" ||
      !uuid.test(selected.subject)
    )
      throw failure("proof_required");
    return { ...selected, subject: selected.subject };
  }
  function openingRows(): { ambient: string; record: CaseOpening }[] {
    const value = JSON.parse(options.storage.getItem(openingKey) || "[]");
    if (!Array.isArray(value)) throw failure("invalid_recovery");
    return value.map((row) => {
      if (typeof row?.ambient !== "string") throw failure("invalid_recovery");
      return { ambient: row.ambient, record: openingFrom(row.record) };
    });
  }
  function selectOpening(subject: string) {
    const rows = openingRows().filter(
      (r) => r.ambient === options.ambient() && r.record.subject === subject
    );
    caseOpening.value =
      rows.findLast((r) => r.record.state === "unconfirmed")?.record ?? rows.at(-1)?.record ?? null;
  }
  function saveOpening(value: CaseOpening) {
    const rows = openingRows(),
      prior = rows.find((r) => r.record.body.command_id === value.body.command_id)?.record;
    if (prior) {
      if (
        prior.subject !== value.subject ||
        !same(prior.body, value.body) ||
        (prior.receipt && value.receipt && !same(prior.receipt, value.receipt))
      )
        throw failure("invalid_recovery");
      value.receipt ??= prior.receipt;
    }
    options.storage.setItem(
      openingKey,
      JSON.stringify([
        ...rows.filter((r) => r.record.body.command_id !== value.body.command_id),
        { ambient: options.ambient(), record: value },
      ])
    );
  }
  function openingGuard(selected: CommercialProof) {
    const valid = guard(),
      epoch = ++openingGeneration;
    return () => {
      const current = options.personalProof();
      return (
        valid() &&
        epoch === openingGeneration &&
        current?.kind === "moderation" &&
        current.secret === selected.secret &&
        current.subject === selected.subject
      );
    };
  }
  async function openingCall(
    operation: "export" | "open",
    selected: CommercialProof,
    valid: () => boolean,
    body: any = {}
  ) {
    if (!valid()) throw failure("stale_view");
    let result;
    try {
      result = await options.fetch(`/shop/claims/recipient/${operation}`, {
        method: "POST",
        body,
        credentials: "omit",
        retry: 0,
        timeout: 20000,
        headers: { "x-moderation-capability": selected.secret },
      });
    } catch (cause) {
      if (valid() && unauthorized(cause)) {
        const original = caseOpening.value;
        clear();
        caseOpening.value = original;
        openingProofUnavailable.value = true;
        error.value = "proof_required";
        state.value = "error";
      }
      throw cause;
    }
    if (!valid()) throw failure("stale_view");
    return result;
  }
  function reconcileOpening(value: any, found: Owner | null, reply?: OpenReceipt) {
    if (!caseOpening.value) return;
    const record = openingFrom(caseOpening.value);
    if (record.receipt && found && record.receipt.case_id !== found.case_id)
      throw failure("owner_changed");
    let receipt = reply;
    if (found) {
      if (!Array.isArray(value.journal)) throw failure("invalid_response");
      const rows = value.journal.filter((row: any) => row?.command_id === record.body.command_id);
      if (rows.length > 1) throw failure("invalid_response");
      const row = rows[0];
      if (row) {
        if (
          row.actor !== record.subject ||
          row.kind !== "open" ||
          row.case_id !== found.case_id ||
          !object(row.request) ||
          Object.keys(row.request).join() !== "command_id" ||
          row.request.command_id !== record.body.command_id
        )
          throw failure("invalid_response");
        const journalReceipt = openingReceipt(row.result);
        if (receipt && !same(receipt, journalReceipt)) throw failure("invalid_response");
        receipt = journalReceipt;
      }
    }
    if (receipt) {
      if (
        !found ||
        receipt.case_id !== found.case_id ||
        (record.receipt && !same(record.receipt, receipt))
      )
        throw failure("owner_changed");
      record.receipt = receipt;
      record.state = "recorded";
      saveOpening(record);
      caseOpening.value = record;
    }
  }
  function bindOpening(
    selected: CommercialProof,
    value: any,
    found: Owner | null,
    reply?: OpenReceipt
  ) {
    reconcileOpening(value, found, reply);
    if (found) bind(selected, found);
    else {
      canOpenCase.value = true;
      state.value = "ready";
    }
  }
  async function connectPersonal() {
    const selected = personalOpeningProof();
    clear();
    state.value = "loading";
    selectOpening(selected.subject);
    const valid = openingGuard(selected);
    try {
      const value = await openingCall("export", selected, valid);
      // Existing case readers retain their established contract. The stricter
      // complete envelope is needed for absence or an exact opening record.
      const found =
        object(value?.case) && !caseOpening.value
          ? ownerFrom(value)
          : openingExport(value, selected.subject);
      if (found && found.subject.toLowerCase() !== selected.subject.toLowerCase())
        throw failure("owner_changed");
      bindOpening(selected, value, found);
    } catch (cause: any) {
      if (valid()) {
        state.value = "error";
        error.value = cause.message || "request_failed";
      }
      throw cause;
    }
  }
  async function openCase(retry = false) {
    const selected = personalOpeningProof(),
      valid = openingGuard(selected);
    openingProofUnavailable.value = false;
    if (!caseOpening.value) selectOpening(selected.subject);
    if (caseOpening.value && caseOpening.value.subject !== selected.subject)
      throw failure("owner_changed");
    if (retry && !caseOpening.value) throw failure("invalid_recovery");
    state.value = "working";
    try {
      const before = await openingCall("export", selected, valid),
        found = openingExport(before, selected.subject);
      reconcileOpening(before, found);
      if (found && (!retry || caseOpening.value?.state === "recorded")) {
        bind(selected, found);
        return;
      }
      if (!retry) {
        if (caseOpening.value) throw failure("pending_request");
        const record: CaseOpening = {
          version: 1,
          operation: "open",
          subject: selected.subject,
          body: { command_id: crypto.randomUUID() },
          state: "unconfirmed",
        };
        saveOpening(record);
        caseOpening.value = record;
      }
      const record = openingFrom(caseOpening.value);
      // An explicit retry preserves any original receipt; no new command or body.
      saveOpening(record);
      let result;
      try {
        result = await openingCall("open", selected, valid, { ...record.body });
      } catch (cause) {
        if (!valid()) throw cause;
        const observed = await openingCall("export", selected, valid),
          current = openingExport(observed, selected.subject);
        bindOpening(selected, observed, current);
        if (caseOpening.value?.state === "recorded") return;
        throw cause;
      }
      const receipt = openingReceipt(result);
      if (record.receipt && !same(record.receipt, receipt)) throw failure("invalid_response");
      record.receipt = receipt;
      // A reply is retained, but binding still needs a fresh owned export.
      record.state = "unconfirmed";
      saveOpening(record);
      caseOpening.value = record;
      const after = await openingCall("export", selected, valid),
        current = openingExport(after, selected.subject);
      bindOpening(selected, after, current, receipt);
    } catch (cause: any) {
      if (valid()) {
        state.value = "error";
        error.value = cause.message || "request_failed";
      }
      throw cause;
    }
  }
  async function importCaseOpening(text: string) {
    const selected = personalOpeningProof(),
      record = openingFrom(JSON.parse(text));
    if (record.subject !== selected.subject) throw failure("owner_changed");
    selectOpening(selected.subject);
    if (
      caseOpening.value?.state === "unconfirmed" &&
      caseOpening.value.body.command_id !== record.body.command_id
    )
      throw failure("pending_request");
    openingGeneration++;
    // Imported state/history is not current confirmation of the command.
    record.state = "unconfirmed";
    saveOpening(record);
    caseOpening.value = record;
    await connectPersonal();
  }
  async function restore() {
    clear();
    const view = options.identity(),
      ambient = options.ambient();
    const active = JSON.parse(options.storage.getItem(currentKey) || "null");
    const rows = saved().filter((r) => r.ambient === options.ambient());
    const candidates: { key: string; owner: Owner }[] = [];
    if (active?.ambient === options.ambient()) candidates.push(active);
    // A staged key is only a candidate: a never-committed key fails this read.
    for (const row of rows.toReversed())
      candidates.push({ key: row.rotation.body.key, owner: row.rotation.owner });
    for (const candidate of candidates) {
      if (!alive || view !== options.identity() || ambient !== options.ambient()) return;
      try {
        await connect({ kind: "claim", secret: candidate.key }, candidate.owner);
        return;
      } catch (cause) {
        if (!alive || view !== options.identity() || ambient !== options.ambient()) return;
        if (!unauthorized(cause)) throw cause;
      }
    }
    state.value = candidates.length ? "error" : "idle";
    error.value = candidates.length ? "proof_required" : "";
  }
  async function importRecovery(text: string) {
    const value = rotationFrom(JSON.parse(text));
    // Imported state is a local assertion, never a server receipt or authority.
    value.state = "unconfirmed";
    save(value);
    const view = options.identity(),
      ambient = options.ambient();
    const original = proof,
      personal = options.personalProof();
    const candidates = [
      { kind: "claim", secret: value.body.key } as CommercialProof,
      original,
      personal,
    ].filter((p): p is CommercialProof => p !== null);
    for (const candidate of candidates) {
      if (!alive || view !== options.identity() || ambient !== options.ambient())
        throw failure("stale_view");
      try {
        await connect(candidate, value.owner);
        return;
      } catch (cause) {
        if (!unauthorized(cause)) throw cause;
      }
    }
    throw failure("proof_required");
  }
  async function prepare() {
    const expected = requireOwner();
    if (!proof) throw failure("proof_required");
    if (pending.value && !["active", "inactive"].includes(pending.value.state))
      throw failure("pending_request");
    const selected = proof,
      valid = guard();
    const found = await inspect(selected, expected);
    if (!valid()) throw failure("stale_view");
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const key = btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    const value: Rotation = {
      version: 1,
      owner: found,
      body: { command_id: crypto.randomUUID(), case_id: found.case_id, key },
      state: "prepared",
    };
    save(value);
    pending.value = value;
    owner.value = found;
  }
  async function submit() {
    const bound = requireOwner();
    if (!pending.value || !sameOwner(pending.value.owner, bound)) throw failure("proof_required");
    const value = rotationFrom(pending.value),
      original = proof;
    const valid = guard();
    const replacement: CommercialProof = { kind: "claim", secret: value.body.key };
    const personal = options.personalProof();
    const candidates = (value.state === "prepared" ? [original] : [replacement, original, personal])
      .filter((p): p is CommercialProof => p !== null)
      .filter((p) => !p.subject || p.subject.toLowerCase() === value.owner.subject.toLowerCase())
      .filter(
        (p, i, all) => all.findIndex((x) => x.kind === p.kind && x.secret === p.secret) === i
      );
    if (!candidates.length) throw failure("proof_required");
    value.state = "unconfirmed";
    save(value);
    pending.value = value;
    state.value = "working";
    error.value = "";
    try {
      let result: any;
      for (const candidate of candidates) {
        if (!valid()) throw failure("stale_view");
        try {
          result = await request("/recipient/access", candidate, { ...value.body });
          break;
        } catch (cause) {
          if (!unauthorized(cause)) throw cause;
        }
      }
      if (!result) throw failure("proof_required");
      if (!valid()) throw failure("stale_view");
      if (result.case_id !== value.owner.case_id || result.claim_value_expires !== false)
        throw failure("invalid_response");
      value.state = "recorded";
      save(value);
      pending.value = { ...value };
      let found: Owner;
      try {
        found = await inspect(replacement, value.owner);
      } catch (cause) {
        if (!valid()) throw failure("stale_view");
        if (unauthorized(cause)) {
          value.state = "inactive";
          save(value);
          pending.value = { ...value };
          throw failure("replacement_inactive");
        }
        throw cause;
      }
      if (!valid()) throw failure("stale_view");
      value.state = "active";
      save(value);
      bind(replacement, found);
    } catch (cause: any) {
      if (valid()) {
        state.value = "error";
        error.value = ["proof_required", "replacement_inactive", "invalid_response"].includes(
          cause.message
        )
          ? cause.message
          : "request_failed";
      }
      throw cause;
    }
  }
  function recoveryText() {
    const bound = requireOwner();
    if (!pending.value || !sameOwner(pending.value.owner, bound)) throw failure("proof_required");
    return JSON.stringify(pending.value, null, 2);
  }
  async function snapshot() {
    const bound = requireOwner();
    if (!proof) throw failure("proof_required");
    const value = await request("/recipient/export", proof);
    if (!sameOwner(ownerFrom(value), bound)) throw failure("owner_changed");
    return value;
  }
  async function statement(number: string) {
    requireOwner();
    const path = commercialStatementPath(number);
    if (!proof || !owner.value || !path) throw failure("proof_required");
    return (await request(path, proof, undefined, true)) as Blob;
  }
  async function learningSummary() {
    requireOwner();
    if (!proof) throw failure("proof_required");
    return request("/recipient/learning_summary", proof);
  }
  async function refreshLearning(body: {
    case_id: string;
    expected_subject: string;
    command_id: string;
    key: string;
  }) {
    const bound = requireOwner();
    if (!proof || body.case_id.toLowerCase() !== bound.case_id.toLowerCase())
      throw failure("proof_required");
    return request("/recipient/learning_access", proof, body);
  }
  async function startLearning(body: LearningStartBody) {
    const bound = requireOwner();
    if (
      !proof ||
      body.case_id.toLowerCase() !== bound.case_id.toLowerCase() ||
      body.expected_no_active_subject !== true ||
      body.use_retained_value !== true
    )
      throw failure("proof_required");
    return request("/recipient/learning_start", proof, body);
  }
  async function resourceRights() {
    requireOwner();
    if (!proof) throw failure("proof_required");
    return request("/recipient/resource_rights", proof, {});
  }
  async function continuePremium(body: PremiumContinuationBody) {
    requireOwner();
    if (
      !proof ||
      Object.keys(body).sort().join() !==
        "command_id,continue_existing_right,evidence_id,successor" ||
      ![body.command_id, body.evidence_id, body.successor].every((value) => uuid.test(value)) ||
      body.continue_existing_right !== true
    )
      throw failure("invalid_request");
    return request("/recipient/premium_continue", proof, body);
  }
  async function courseRights(source: string) {
    requireOwner();
    if (!proof || !uuid.test(source)) throw failure("proof_required");
    return request("/recipient/course_rights", proof, { source_subject: source });
  }
  async function continueCourse(body: CourseContinuationBody) {
    requireOwner();
    if (
      !proof ||
      Object.keys(body).sort().join() !==
        "command_id,continue_existing_right,right_id,source_subject,successor" ||
      ![body.command_id, body.source_subject, body.right_id, body.successor].every((value) =>
        uuid.test(value)
      ) ||
      body.continue_existing_right !== true
    )
      throw failure("invalid_request");
    return request("/recipient/course_successor", proof, body);
  }
  function originalReadContext(ordinary = false): OriginalReadContext | null {
    // A read does not bind/create a case or touch recovery storage. In
    // particular, a personal capability can read originals before case opening.
    const valid = guard(),
      selected = proof;
    if (selected) {
      if (
        ordinary ||
        !owner.value ||
        boundIdentity !== options.identity() ||
        boundAmbient !== options.ambient()
      )
        return null;
      const personal = selected.kind === "moderation" ? options.personalReadContext?.() : null;
      if (selected.kind === "moderation" && (!personal || personal.secret !== selected.secret))
        return null;
      const current = () => valid() && proof === selected && (!personal || personal.current());
      return {
        kind: selected.kind,
        secret: selected.secret,
        subject: owner.value.subject,
        current,
        invalidate() {
          if (!current()) return;
          clear();
          personal?.invalidate();
          state.value = "error";
          error.value = "proof_required";
        },
      };
    }
    if (openingProofUnavailable.value) return null;
    // An explicitly selected but restricted/expired capability never falls
    // through to the ordinary session, including before a case is bound.
    const personal = options.personalReadContext?.();
    const parent = ordinary
      ? personal || options.personalProof()
        ? null
        : options.ordinaryReadContext?.()
      : personal;
    if (!parent || (ordinary ? parent.kind !== "ordinary" : parent.kind !== "moderation"))
      return null;
    const current = () => valid() && proof === null && parent.current();
    return {
      ...parent,
      current,
      invalidate() {
        if (!current()) return;
        clear();
        parent.invalidate();
        openingProofUnavailable.value = true;
        state.value = "error";
        error.value = "proof_required";
      },
    };
  }
  return {
    owner,
    pending,
    state,
    error,
    generation,
    clear,
    restore,
    connectKey,
    connectPersonal,
    caseOpening,
    canOpenCase,
    openingProofUnavailable,
    openCase,
    importCaseOpening,
    caseOpeningText: () => JSON.stringify(openingFrom(caseOpening.value), null, 2),
    importRecovery,
    prepare,
    submit,
    recoveryText,
    snapshot,
    statement,
    learningSummary,
    refreshLearning,
    startLearning,
    resourceRights,
    continuePremium,
    courseRights,
    continueCourse,
    originalReadContext,
    dispose() {
      clear();
      alive = false;
    },
  };
}
