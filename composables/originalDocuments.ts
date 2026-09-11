import { ref, shallowRef } from "vue";

/** Captured personal READ authority. Never accepted by a mutation adapter. */
export type OriginalReadContext = {
  kind: "claim" | "moderation" | "ordinary";
  secret: string;
  subject?: string;
  current: () => boolean;
  invalidate: () => void;
};
export type OriginalSelector = { kind: string; id: string; variant: string };
export type OriginalArtifact = {
  variant: string;
  selection_source: string;
  observation: string;
  reader_state: string;
  reason: string | null;
  selector: OriginalSelector | null;
};
export type OriginalRecord = {
  family: "purchase" | "finance";
  kind: string;
  source_service: "backend";
  source_subject: string;
  owner_relation: string;
  purchase_source: string | null;
  offer_id: string | null;
  printed_number: string | null;
  record_basis: string;
  reader_state: string;
  reason: string | null;
  selector: OriginalSelector | null;
  artifacts: OriginalArtifact[];
};
export type OriginalInventory = {
  protocol: 1;
  claimant_subject: string;
  observed_at: string;
  scope: {
    finance: string;
    purchases: string;
    archives_scanned: boolean;
    remote_sources_queried: boolean;
    catalog_complete: boolean;
    historical_owner_inventory_complete: boolean;
    known_local_enumeration_complete: boolean;
  };
  records: OriginalRecord[];
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sources = ["backend", "skills", "events", "paypal"];
export const originalVariants = [
  "terms",
  "withdrawal",
  "confirmation",
  "timing",
  "timing-original",
  "fulfillment",
  "fulfillment-original",
];
const reasons = [
  "missing_progress",
  "original_identity_mismatch",
  "unsupported_identifier",
  "original_reader_not_admitted",
  "identity_pending_review",
  "retired_recorded",
  "ambiguous_period",
  "empty_selected_artifact",
  "absent_selected_artifact",
];
const object = (v: any) => v !== null && typeof v === "object" && !Array.isArray(v);
const date = (v: any) => typeof v === "string" && Number.isFinite(Date.parse(v));
const id = (v: any): v is string => typeof v === "string" && uuid.test(v);
const sameId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function need(value: unknown): asserts value {
  if (!value) throw new Error("invalid_response");
}
function decimal(value: unknown, max: bigint): value is string {
  return typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value) && BigInt(value) <= max;
}
export function originalDocumentPath(value: OriginalSelector): string {
  need(object(value) && typeof value.variant === "string");
  switch (value.kind) {
    case "purchase":
      need(id(value.id) && originalVariants.includes(value.variant));
      break;
    case "invoice":
      need(decimal(value.id, 9223372036854775807n) && value.variant === "original");
      break;
    case "final-statement":
      need(decimal(value.id, 18446744073709551615n) && value.variant === "original");
      break;
    case "credit-note":
      // The original reader accepts chrono years, including minimum-width years
      // longer than four digits. IDs stay decimal strings throughout.
      need(decimal(value.id, 262142n) && decimal(value.variant, 12n) && value.variant !== "0");
      break;
    default:
      throw new Error("invalid_response");
  }
  return `/shop/claims/documents/${value.kind}/${value.id}/${value.variant}`;
}
function selector(v: any): OriginalSelector | null {
  if (v === null) return null;
  need(object(v) && Object.keys(v).sort().join() === "id,kind,variant");
  originalDocumentPath(v);
  return { kind: v.kind, id: v.id, variant: v.variant };
}
function availability(v: any) {
  need(["candidate", "unavailable", "archive_unchecked"].includes(v.reader_state));
  need(v.reason === null || reasons.includes(v.reason));
  need((v.reader_state === "unavailable") === (v.reason !== null));
}
export function originalInventory(value: unknown, expected?: string): OriginalInventory {
  const v: any = value;
  need(object(v) && v.protocol === 1 && id(v.claimant_subject) && date(v.observed_at));
  if (expected) need(sameId(v.claimant_subject, expected));
  need(
    object(v.scope) && typeof v.scope.finance === "string" && typeof v.scope.purchases === "string"
  );
  for (const k of [
    "archives_scanned",
    "remote_sources_queried",
    "catalog_complete",
    "historical_owner_inventory_complete",
    "known_local_enumeration_complete",
  ])
    need(typeof v.scope[k] === "boolean");
  need(
    v.scope.finance === "claimant_only" &&
      v.scope.purchases === "claimant_and_same_case_learning_subjects"
  );
  need(
    !v.scope.archives_scanned &&
      !v.scope.remote_sources_queried &&
      !v.scope.catalog_complete &&
      v.scope.known_local_enumeration_complete
  );
  need(Array.isArray(v.records));
  const seen = new Set<string>();
  const records: OriginalRecord[] = v.records.map((r: any) => {
    need(object(r) && r.source_service === "backend" && id(r.source_subject));
    need(["claimant", "same_case_learning_subject"].includes(r.owner_relation));
    need((r.owner_relation === "claimant") === sameId(r.source_subject, v.claimant_subject));
    availability(r);
    const selected = selector(r.selector);
    need(Array.isArray(r.artifacts));
    const artifacts: OriginalArtifact[] = r.artifacts.map((a: any) => {
      need(object(a) && typeof a.variant === "string");
      availability(a);
      need(
        [
          "stored",
          "original",
          "original_v2",
          "correction",
          "database_original",
          "archive_unchecked",
          "none",
        ].includes(a.selection_source)
      );
      need(["nonempty", "empty", "absent", "unchecked"].includes(a.observation));
      const pick = selector(a.selector);
      need((a.reader_state === "unavailable") === (pick === null));
      if (pick) need(pick.kind === r.kind);
      return {
        variant: a.variant,
        selection_source: a.selection_source,
        observation: a.observation,
        reader_state: a.reader_state,
        reason: a.reason,
        selector: pick,
      };
    });
    if (r.family === "purchase") {
      need(r.kind === "purchase" && id(r.offer_id) && sources.includes(r.purchase_source));
      need(r.printed_number === null && selected === null && r.record_basis === "original_offer");
      need(r.reader_state !== "archive_unchecked" && artifacts.length === originalVariants.length);
      need(same(artifacts.map((a) => a.variant).sort(), [...originalVariants].sort()));
      for (const a of artifacts) {
        if (a.selector) need(sameId(a.selector.id, r.offer_id) && a.selector.variant === a.variant);
        if (r.reader_state === "unavailable") need(a.selector === null && a.reason === r.reason);
      }
    } else {
      need(
        r.family === "finance" && ["invoice", "credit-note", "final-statement"].includes(r.kind)
      );
      need(r.owner_relation === "claimant" && r.offer_id === null && r.purchase_source === null);
      need(typeof r.printed_number === "string" && r.printed_number.length > 0);
      need(
        ["owned_document", "own_invoice_reference", "qualified_retention_reference"].includes(
          r.record_basis
        )
      );
      need(artifacts.length === 1 && artifacts[0].variant === "original");
      need(
        same(selected, artifacts[0].selector) &&
          r.reader_state === artifacts[0].reader_state &&
          r.reason === artifacts[0].reason
      );
      if (selected) {
        if (r.kind === "invoice") need(r.printed_number === `R${selected.id.padStart(7, "0")}`);
        if (r.kind === "final-statement") need(r.printed_number === `S${selected.id}`);
        if (r.kind === "credit-note")
          need(
            new RegExp(
              `^G${selected.id.padStart(4, "0")}${selected.variant.padStart(2, "0")}-[0-9]+$`
            ).test(r.printed_number)
          );
      }
    }
    const key = `${r.kind}:${r.offer_id ?? r.printed_number}`;
    need(!seen.has(key));
    seen.add(key);
    return {
      family: r.family,
      kind: r.kind,
      source_service: "backend",
      source_subject: r.source_subject,
      owner_relation: r.owner_relation,
      purchase_source: r.purchase_source,
      offer_id: r.offer_id,
      printed_number: r.printed_number,
      record_basis: r.record_basis,
      reader_state: r.reader_state,
      reason: r.reason,
      selector: selected,
      artifacts,
    };
  });
  return {
    protocol: 1,
    claimant_subject: v.claimant_subject,
    observed_at: v.observed_at,
    scope: { ...v.scope },
    records,
  };
}
export type OriginalOrderSelection = {
  offer_id: string;
  source_subject?: string;
  purchase_source?: string;
};
export function originalPurchaseStatus(value: unknown, selected: OriginalOrderSelection) {
  const v: any = value,
    o = v?.offer,
    p = o?.product;
  need(
    object(v) &&
      object(o) &&
      object(p) &&
      id(o.id) &&
      id(o.user_id) &&
      sameId(o.id, selected.offer_id)
  );
  need(sources.includes(o.source));
  if (selected.source_subject) need(sameId(o.user_id, selected.source_subject));
  if (selected.purchase_source) need(o.source === selected.purchase_source);
  for (const k of ["recipient", "document_hash", "hash", "text", "declaration"])
    need(typeof o[k] === "string");
  for (const k of ["kind", "reference", "title", "description", "revision"])
    need(typeof p[k] === "string");
  need(date(o.created_at) && date(o.expires_at));
  need(p.service_starts_at === null || date(p.service_starts_at));
  need(
    typeof p.coins === "number" &&
      Number.isInteger(p.coins) &&
      p.coins >= 0 &&
      Object.hasOwn(p, "facts")
  );
  need(
    o.provision_window_seconds === undefined ||
      (typeof o.provision_window_seconds === "number" &&
        Number.isInteger(o.provision_window_seconds) &&
        o.provision_window_seconds >= 0)
  );
  need(
    ["offered", "accepted", "awaiting_payment", "paid", "fulfilled", "failed", "review"].includes(
      v.state
    )
  );
  for (const k of ["accepted_at", "confirmation_smtp_accepted_at", "provision_deadline"])
    need(v[k] === null || date(v[k]));
  need(v.review_reason === null || typeof v.review_reason === "string");
  for (const k of ["fulfillment", "financial_evidence", "provision_timing"])
    need(Object.hasOwn(v, k));
  need(
    Array.isArray(v.document_corrections) &&
      v.document_corrections.every((k: any) => ["timing", "fulfillment"].includes(k))
  );
  // Oversized JSON integer observations cannot be reconstructed from a parsed
  // number. Display unknown rather than a rounded price/window.
  return {
    ...v,
    offer: {
      ...o,
      product: { ...p, coins: Number.isSafeInteger(p.coins) ? p.coins : null },
      provision_window_seconds: Number.isSafeInteger(o.provision_window_seconds)
        ? o.provision_window_seconds
        : null,
    },
  };
}

export function createOriginalDocuments(options: {
  capture: (ordinary?: boolean) => OriginalReadContext | null;
  identity: () => string;
  fetch: (path: string, options: any) => Promise<any>;
  deliver: (blob: Blob, selector: OriginalSelector) => void;
  revoke: () => void;
}) {
  const inventory = shallowRef<OriginalInventory | null>(null),
    status = shallowRef<ReturnType<typeof originalPurchaseStatus> | null>(null);
  const state = ref("idle"),
    statusState = ref("idle"),
    downloadState = ref("idle");
  const selected = shallowRef<OriginalRecord | null>(null),
    artifact = shallowRef<OriginalArtifact | null>(null),
    order = ref("");
  const proofRevision = ref(0);
  let context: OriginalReadContext | null = null,
    alive = true,
    epoch = 0,
    inventoryGeneration = 0,
    statusGeneration = 0,
    downloadGeneration = 0;
  function clearSelection() {
    statusGeneration++;
    downloadGeneration++;
    options.revoke();
    selected.value = null;
    artifact.value = null;
    order.value = "";
    status.value = null;
    statusState.value = downloadState.value = "idle";
  }
  function clear() {
    epoch++;
    inventoryGeneration++;
    context = null;
    proofRevision.value++;
    inventory.value = null;
    state.value = "idle";
    clearSelection();
  }
  function guard() {
    const c = context,
      e = epoch,
      identity = options.identity();
    return () =>
      alive &&
      !!c &&
      c === context &&
      e === epoch &&
      identity === options.identity() &&
      c.current();
  }
  async function read(path: string, valid: () => boolean, blob = false) {
    const c = context,
      identity = options.identity();
    if (!c || !valid()) throw new Error("proof_required");
    try {
      const value = await options.fetch(path, {
        method: "GET",
        credentials: "omit",
        retry: 0,
        timeout: 20000,
        ...(blob ? { responseType: "blob" } : {}),
        headers:
          c.kind === "claim"
            ? { "x-commercial-claim-key": c.secret }
            : c.kind === "moderation"
              ? { "x-moderation-capability": c.secret }
              : { Authorization: `Bearer ${c.secret}` },
      });
      if (!valid()) throw new Error("stale_view");
      return value;
    } catch (error: any) {
      // Selection changes suppress a late document/status, but do not make a
      // still-current rejected credential valid. A replaced proof is protected
      // by the captured parent's exact credential/lifetime check instead.
      if (
        alive &&
        identity === options.identity() &&
        c.current() &&
        (error?.response?.status ?? error?.statusCode) === 401
      ) {
        c.invalidate();
        clear();
        state.value = "proof_required";
      }
      throw error;
    }
  }
  async function load(ordinary = false) {
    clear();
    try {
      context = options.capture(ordinary);
    } catch {
      state.value = "proof_required";
      return;
    }
    proofRevision.value++;
    if (!context || !context.current()) {
      state.value = "proof_required";
      return;
    }
    const active = guard(),
      n = ++inventoryGeneration,
      valid = () => active() && n === inventoryGeneration;
    state.value = "loading";
    try {
      const value = originalInventory(await read("/shop/claims/documents", valid), context.subject);
      if (!valid()) return;
      context.subject ??= value.claimant_subject;
      inventory.value = value;
      state.value = "ready";
    } catch {
      if (valid()) state.value = "error";
    }
  }
  function choose(row: OriginalRecord | null) {
    clearSelection();
    if (row && inventory.value?.records.includes(row)) {
      selected.value = row;
      order.value = row.offer_id ?? "";
    }
  }
  function chooseArtifact(value: OriginalArtifact | null) {
    downloadGeneration++;
    options.revoke();
    downloadState.value = "idle";
    artifact.value = value && selected.value?.artifacts.includes(value) ? value : null;
  }
  function chooseOrder(value: string) {
    clearSelection();
    order.value = value;
    selected.value =
      inventory.value?.records.find((r) => r.offer_id && sameId(r.offer_id, value)) ?? null;
  }
  async function loadStatus() {
    if (!context) {
      try {
        context = options.capture();
      } catch {
        statusState.value = "error";
        return;
      }
      proofRevision.value++;
    }
    const tuple = () =>
      JSON.stringify([
        order.value,
        selected.value?.offer_id,
        selected.value?.source_subject,
        selected.value?.purchase_source,
      ]);
    const active = guard(),
      n = ++statusGeneration,
      selectedOrder = order.value,
      captured = tuple();
    const valid = () => active() && n === statusGeneration && captured === tuple();
    if (!valid() || !id(selectedOrder)) {
      statusState.value = "error";
      return;
    }
    const row = selected.value;
    const selection: OriginalOrderSelection = {
      offer_id: selectedOrder,
      ...(row?.family === "purchase"
        ? { source_subject: row.source_subject, purchase_source: row.purchase_source! }
        : {}),
    };
    status.value = null;
    statusState.value = "loading";
    try {
      const value = originalPurchaseStatus(
        await read(`/shop/claims/purchases/${selectedOrder}/status`, valid),
        selection
      );
      if (valid()) {
        status.value = value;
        statusState.value = "ready";
      }
    } catch {
      if (valid()) statusState.value = "error";
    }
  }
  async function download() {
    const tuple = () =>
      JSON.stringify([
        selected.value?.family,
        selected.value?.kind,
        selected.value?.source_service,
        selected.value?.source_subject,
        selected.value?.owner_relation,
        selected.value?.purchase_source,
        selected.value?.offer_id,
        selected.value?.printed_number,
        artifact.value?.selector,
      ]);
    const active = guard(),
      n = ++downloadGeneration,
      captured = tuple();
    const currentSelector = artifact.value?.selector;
    const pick = currentSelector ? { ...currentSelector } : null;
    const valid = () => active() && n === downloadGeneration && captured === tuple();
    if (!pick || !valid()) return;
    downloadState.value = "loading";
    try {
      const value = await read(originalDocumentPath(pick), valid, true);
      if (!valid()) return;
      const pdf = pick.kind !== "purchase" || ["terms", "withdrawal"].includes(pick.variant);
      need(
        value instanceof Blob &&
          value.size > 0 &&
          value.type.split(";", 1)[0] === (pdf ? "application/pdf" : "text/plain")
      );
      options.deliver(value, pick);
      downloadState.value = "ready";
    } catch {
      if (valid()) downloadState.value = "error";
    }
  }
  return {
    inventory,
    status,
    state,
    statusState,
    downloadState,
    selected,
    artifact,
    order,
    load,
    choose,
    chooseArtifact,
    chooseOrder,
    loadStatus,
    download,
    clear,
    proofCurrent() {
      proofRevision.value;
      return !context || context.current();
    },
    dispose() {
      clear();
      alive = false;
    },
  };
}
