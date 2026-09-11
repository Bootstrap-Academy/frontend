// Runs the built frontend and Chromium in fresh owned local fixtures. All API,
// media and YouTube responses are synthetic; external page traffic is denied.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";

const evidence = process.env.TEST_EVIDENCE;
const cfb1Mode = !!process.env.TEST_CFB1_SCENARIOS;
const premiumMode = process.env.TEST_PREMIUM_CONTINUATION_SCENARIOS === "1";
const premiumExportMode = process.env.TEST_PREMIUM_EXPORT_SCENARIOS === "1";
assert(!premiumExportMode || premiumMode, "Export checks extend the bounded Premium mode");
const originalsMode = process.env.TEST_ORIGINAL_DOCUMENT_SCENARIOS === "1";
const openMode = process.env.TEST_CASE_OPEN_SCENARIOS === "1" || originalsMode;
const startMode = process.env.TEST_LEARNING_START_SCENARIOS === "1";
const routeMode = process.env.TEST_ACCESS_ROUTE_SCENARIOS === "1";
const importMode = process.env.TEST_COURSE_FILE_IMPORT_SCENARIOS === "1";
const continuationMode = process.env.TEST_COURSE_CONTINUATION_SCENARIOS === "1" || importMode;
assert(
  [startMode, routeMode, continuationMode, openMode, premiumMode].filter(Boolean).length <= 1,
  "Select one bounded browser mode"
);
assert(evidence, "Set TEST_EVIDENCE to a new evidence directory");
await mkdir(evidence, { recursive: false });
const fixture = await mkdtemp(join(tmpdir(), "retained-courses-browser-"));
if (cfb1Mode) {
  const stage = process.env.CFB1_STAGE;
  assert(stage && resolve(stage) === stage);
  const owner = JSON.parse(await readFile(join(stage, "OWNER.json"), "utf8"));
  assert.equal(owner.canonical_root, stage);
  assert.equal(owner.unit, "L3-customer-commercial-fetch-correction-1");
  assert.equal(owner.owner, "/root/learning_source_review");
  assert.equal(resolve(process.env.TEST_BUILD_ROOT), join(stage, "app"));
}
const appUrl = "http://127.0.0.1:56840",
  apiUrl = "http://127.0.0.1:56841";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function free(port) {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => server.close(resolve));
}
await free(56840);
await free(56841);
const mediaPath = join(fixture, "arithmetic.mp4");
const mediaBuild = spawnSync(
  "/home/morpheus/.nix-profile/bin/ffmpeg",
  [
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=c=blue:s=160x90:d=2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    mediaPath,
  ],
  { encoding: "utf8" }
);
await writeFile(join(evidence, "ffmpeg.log"), mediaBuild.stderr ?? "");
assert.equal(mediaBuild.status, 0);
const media = await readFile(mediaPath);
await writeFile(join(evidence, "synthetic-arithmetic.mp4"), media);
const runtime = [];
function owned(command, args, env = process.env) {
  const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  runtime.push({ child, command, args, log: () => log });
  return child;
}
let ws,
  passed = false;
const calls = [],
  exceptions = [],
  scenarios = [],
  blocked = [],
  contrastChecks = [],
  panelChecks = [];
const directRequests = [];
let directPlan = null,
  apiServer;
function planDenial(path, header, proof) {
  assert(cfb1Mode && !directPlan);
  assert(
    ["/shop/claims/documents/invoice/10000000/original", "/skills/learning/course_access"].includes(
      path
    )
  );
  directPlan = { path, header, proof, started: false, flush: null, record: null };
}
async function flushPlannedDenial() {
  for (let i = 0; !directPlan?.flush; i++) {
    assert(i < 500);
    await delay(10);
  }
  directPlan.flush();
}
async function finishPlannedDenial() {
  for (let i = 0; !directPlan.record.closed; i++) {
    assert(i < 200);
    await delay(10);
  }
  assert.equal(directPlan.record.bodyBytes, 0);
  directPlan = null;
}
const panelMeasured = new Set();
let routeHeldPassword = null,
  routeHeldRecovery = null;
let seq = 0;
const pending = new Map();
function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cmd("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  const deadline = Date.now() + 15000;
  while (!(await evaluate(expression))) {
    assert(Date.now() < deadline, `Timed out: ${expression}`);
    await delay(30);
  }
}
const buttons = (selector) =>
  `[...document.querySelectorAll(${JSON.stringify(selector + " button")})]`;
const click = async (selector, label) => {
  const expression = `${buttons(selector)}.find(b=>b.textContent.trim()===${JSON.stringify(label)})`;
  await until(`${expression} && !${expression}.disabled`);
  await evaluate(`${expression}.click()`);
};
const rights = '[aria-labelledby="claim-access-title"]',
  records = '[aria-labelledby="commercial-status-title"]',
  learning = '[aria-labelledby="learning-access-title"]',
  continuation = '[aria-labelledby="course-continuation-title"]',
  premium = '[aria-labelledby="premium-continuation-title"]',
  courses = '[aria-labelledby="retained-courses-title"]';
const subject = "10000000-0000-4000-8000-000000000001",
  learner = "10000000-0000-4000-8000-000000000002",
  caseId = "20000000-0000-4000-8000-000000000001",
  claim = "c".repeat(43);
const openProof = "p".repeat(64);
let openCaseExists = false,
  openIntake = false,
  openHidden = false,
  openLost = false;
let releaseOpening = null;
let holdOpening = false;
const openingJournal = new Map();
function openingEnvelope() {
  const value = {
    ...Object.fromEntries(
      [
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
      ].map((k) => [k, []])
    ),
    retention_reviews: {
      statement_reviews: [],
      archive_work: [],
      history: [],
      owner_associations: [{ subject }],
      scope:
        "Existing number-linked records with established owner authority; unknown historical ownership is not inferred",
    },
  };
  if (openCaseExists)
    return {
      ...value,
      case: { id: caseId, subject, access_epoch: accessEpoch },
      ...Object.fromEntries(
        [
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
        ].map((k) => [k, k === "journal" && !openHidden ? [...openingJournal.values()] : []])
      ),
    };
  return {
    ...value,
    ...(openIntake
      ? {
          case: null,
          financial_inventory: "pending",
          erasure_intake: {
            id: subject,
            subject,
            received_at: "2026-09-10T08:00:00Z",
            recorded_at: "2026-09-10T08:00:01Z",
            source: "authenticated_service_receipt",
            declaration: {},
          },
        }
      : {}),
  };
}
let learningKey = null,
  receipt = null,
  deny = false,
  loseCompletion = false,
  foreignProof = false;
let activeClaim = claim,
  accessEpoch = 1,
  loseRotation = true;
const rotations = new Map();
const starts = new Map(),
  historicalLearners = new Set(startMode ? [] : [learner]);
let activeLearner = startMode ? null : learner,
  loseStart = false,
  loseRefresh = false;
const courseRightId = "61000000-0000-4000-8000-000000000001";
const originalCourse = {
  id: courseRightId,
  source_user_id: subject,
  course_id: "arithmetic",
  observed_at: "2026-09-10T08:00:00Z",
  original: {
    source_user_id: subject,
    course_id: "arithmetic",
    observed_course_access: false,
    observed_started_course_access: true,
    purchase_ids: [],
    viewing_history_retained: false,
    scope:
      "Existing course admission at erasure; no original payment, performance, duration or new terms inferred",
  },
};
const courseGrants = new Map(),
  courseReceipts = [];
let courseFault = "",
  courseAvailable = false;
const courseDelivery = (grant) => ({
  grant_id: grant.id,
  right_id: courseRightId,
  subject: grant.successor,
  state: grant.state === "withdrawn" ? "withdrawn" : "granted",
  new_purchase: false,
  original_result: {
    course_id: "arithmetic",
    access_granted: true,
    new_purchase: false,
    new_terms_accepted: false,
    original_performance_inferred: false,
    original_scope: originalCourse,
  },
});
function courseObservation(grant, value) {
  if (
    !courseReceipts.some(
      (r) => r.grant_id === grant.id && JSON.stringify(r.receipt) === JSON.stringify(value)
    )
  )
    courseReceipts.push({
      id: randomUUID(),
      grant_id: grant.id,
      received_at: new Date().toISOString(),
      receipt_hash: createHash("sha256").update(JSON.stringify(value)).digest("hex"),
      receipt: structuredClone(value),
    });
}
const premiumEvidenceId = "81000000-0000-4000-8000-000000000001",
  originalPeriodId = "82000000-0000-4000-8000-000000000001",
  erasureId = "83000000-0000-4000-8000-000000000001";
let premiumObservation,
  currentPremium,
  premiumFault = "",
  premiumHidden = false;
const premiumRows = [],
  premiumJournal = [],
  premiumErasures = [];
const premiumSubjects = new Map();
let premiumSplit = "",
  premiumHeldExport = null,
  premiumHeldSummary = null,
  premiumOldExport = null,
  premiumOldSummary = null,
  premiumOldRights = null;
const premiumExtraObservations = [];
function resetPremium() {
  const at = (n) => new Date(Date.now() + n).toISOString();
  premiumObservation = {
    id: premiumEvidenceId,
    case_id: caseId,
    category: "premium_right",
    source_key: originalPeriodId,
    recorded_at: at(-5000),
    evidence: {
      id: originalPeriodId,
      user_id: subject,
      subject,
      since: at(-3600000),
      until: at(3600000),
      observed_at: at(-5000),
      request_id: erasureId,
      scope: "Existing original Premium period; no new purchase or renewal inferred",
    },
  };
  currentPremium = {
    period_id: randomUUID(),
    since: at(-7200000),
    until: at(7200000),
    active: true,
  };
  premiumRows.length = premiumJournal.length = premiumErasures.length = 0;
  premiumErasures.push({
    subject,
    case_id: caseId,
    request_id: erasureId,
    erased_at: at(-5000),
    scope: "ordinary_account",
  });
  premiumSubjects.clear();
  premiumSubjects.set(learner, {
    subject: learner,
    case_id: caseId,
    created_at: at(-3000),
    erased_at: null,
    authority_epoch: 1,
    election_id: randomUUID(),
    election: { command_id: randomUUID() },
    contract_permissions: { scope: "No financial authority" },
  });
  premiumFault = "";
  premiumHidden = false;
  premiumSplit = "";
  premiumHeldExport = null;
  premiumHeldSummary = null;
  premiumExtraObservations.length = 0;
}

const data = {
  id: "arithmetic",
  title: "Synthetic arithmetic",
  description: null,
  sections: [
    {
      id: "intro",
      title: "Introduction",
      lectures: [
        { id: "local", title: "Local lecture", description: null, type: "mp4", completed: false },
        {
          id: "youtube",
          title: "YouTube lecture",
          description: "A synthetic YouTube lesson.",
          type: "youtube",
          video_id: "abcdefghijk",
          completed: false,
        },
      ],
    },
  ],
};
async function checkControl(label, name) {
  const button = `${buttons(courses)}.find(b=>b.textContent.trim()===${JSON.stringify(label)})`;
  await until(`${button} && !${button}.disabled`);
  // Establish keyboard modality, then inspect the actual focused rendered button.
  await cmd("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  await cmd("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  await evaluate(
    `${button}.focus({preventScroll:true});${button}.scrollIntoView({block:'center',behavior:'instant'})`
  );
  await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
  const sample = await evaluate(`(()=>{
    const button=${button}, style=getComputedStyle(button);
    let ancestor=button, background='rgb(255, 255, 255)';
    while(ancestor){const color=getComputedStyle(ancestor).backgroundColor;
      if(color!=='rgba(0, 0, 0, 0)' && color!=='transparent'){background=color;break;}ancestor=ancestor.parentElement;}
    const bounds=button.getBoundingClientRect();
    return {label:button.textContent.trim(),foreground:style.color,background,opacity:style.opacity,
      visibleInViewport:bounds.top>=6 && bounds.bottom<=innerHeight-6 && bounds.left>=6 && bounds.right<=innerWidth-6,
      bounds:{top:bounds.top,bottom:bounds.bottom,left:bounds.left,right:bounds.right},
      outlineColor:style.outlineColor,outlineStyle:style.outlineStyle,outlineWidth:style.outlineWidth,
      outlineOffset:style.outlineOffset,focusVisible:button.matches(':focus-visible')};
  })()`);
  const luminance = (color) => {
    const values = color
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number)
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
  };
  const ratio = (a, b) => {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  sample.textContrast = ratio(sample.foreground, sample.background);
  sample.focusContrast = ratio(sample.outlineColor, sample.background);
  contrastChecks.push(sample);
  const shot = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(evidence, `focus-${name}.png`), Buffer.from(shot.data, "base64"));
  assert.equal(sample.opacity, "1");
  assert(sample.visibleInViewport, `${label}: focused control and outline fit captured viewport`);
  assert(sample.textContrast >= 4.5, `${label}: measured text contrast ${sample.textContrast}`);
  assert(sample.focusVisible, `${label}: keyboard focus is visible`);
  assert.equal(sample.outlineStyle, "solid");
  assert(parseFloat(sample.outlineWidth) >= 3);
  assert(sample.focusContrast >= 3, `${label}: measured focus contrast ${sample.focusContrast}`);
}
async function inspectPanel(selector, stage, route = false) {
  await until(
    route
      ? `!!document.querySelector(${JSON.stringify(selector)})`
      : `${buttons(selector)}.some(el=>!el.disabled&&el.closest('section[aria-labelledby]')===document.querySelector(${JSON.stringify(selector)}))`
  );
  await evaluate(
    `window.__accessPanelTargets=[...document.querySelector(${JSON.stringify(selector)}).querySelectorAll(${JSON.stringify(route ? 'button,label,input,select,a,[role="status"],h1,h2,p' : "button,label,summary,input,textarea,a")})]`
  );
  const elements = () => "window.__accessPanelTargets";
  const visible = await evaluate(
    `${elements()}.map((el,index)=>({index,visible:!!el.getClientRects().length && (!el.closest('details:not([open])') || el.tagName==='SUMMARY') && ${route ? "!el.closest('section[aria-labelledby=claim-access-title]')" : `el.closest('section[aria-labelledby]')===document.querySelector(${JSON.stringify(selector)})`}})).filter(x=>x.visible).map(x=>x.index)`
  );
  for (const index of visible) {
    const expression = `${elements()}[${index}]`;
    assert(await evaluate(`${expression}.isConnected`), "Measured control is still mounted");
    const identity = await evaluate(
      `(()=>{const el=${expression};return [el.tagName,el.id||el.textContent.trim(),${route ? "el.matches(':disabled')" : "!!el.disabled"}${route ? `,${index}` : ""}]})()`
    );
    const key = JSON.stringify([selector, ...(route ? [stage.split(":")[0]] : []), ...identity]);
    if (panelMeasured.has(key)) continue;
    panelMeasured.add(key);
    await cmd("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
    });
    await cmd("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
    });
    await evaluate(
      `${expression}.focus({preventScroll:true});${expression}.scrollIntoView({block:'center',behavior:'instant'})`
    );
    await evaluate(
      "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))"
    );
    const sample = await evaluate(`(()=>{
      const el=${expression}, style=getComputedStyle(el), bounds=el.getBoundingClientRect();
      const opaque=(start)=>{for(let p=start;p;p=p.parentElement){const c=getComputedStyle(p).backgroundColor;if(c!=='transparent'&&c!=='rgba(0, 0, 0, 0)')return c;}return 'rgb(255, 255, 255)';};
      return {tag:el.tagName,type:el.type,label:el.id||el.textContent.trim(),disabled:${route ? "el.matches(':disabled')" : "!!el.disabled"},foreground:style.color,
        background:opaque(el),surrounding:opaque(el.parentElement),opacity:style.opacity,
        focusVisible:el.matches(':focus-visible'),focused:document.activeElement===el,
        outlineColor:style.outlineColor,outlineStyle:style.outlineStyle,outlineWidth:style.outlineWidth,
        visibleInViewport:bounds.top>=6&&bounds.bottom<=innerHeight-6&&bounds.left>=6&&bounds.right<=innerWidth-6};
    })()`);
    const rgb = (color) =>
      color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number);
    const luminance = (values) =>
      values
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) =>
      (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
    const alpha = Number(sample.opacity),
      bg = rgb(sample.background);
    sample.textContrast = ratio(
      rgb(sample.foreground).map((v, i) => alpha * v + (1 - alpha) * bg[i]),
      bg
    );
    sample.focusContrast = ratio(rgb(sample.outlineColor), rgb(sample.surrounding));
    sample.stage = stage;
    sample.valid =
      sample.visibleInViewport &&
      (sample.disabled
        ? !sample.focused
        : (sample.type === "checkbox" || sample.textContrast >= 4.5) &&
          ((route ? ["LABEL", "P", "H1", "H2"] : ["LABEL"]).includes(sample.tag) ||
            (sample.focusVisible &&
              sample.outlineStyle === "solid" &&
              parseFloat(sample.outlineWidth) >= 3 &&
              sample.focusContrast >= 3)));
    panelChecks.push(sample);
    const shot = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(
      join(evidence, `panel-${String(panelChecks.length).padStart(2, "0")}.png`),
      Buffer.from(shot.data, "base64")
    );
  }
}
async function enter(selector, text) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await cmd("Input.insertText", { text });
}
async function savedDownload(name) {
  for (let i = 0; i < 100; i++) {
    try {
      const text = await readFile(join(fixture, "downloads", name), "utf8");
      await writeFile(join(evidence, name), text);
      return text;
    } catch {
      await delay(30);
    }
  }
  throw Error(`Download missing: ${name}`);
}
async function fulfill(requestId, data, status = 200, type = "application/json", extra = []) {
  return cmd("Fetch.fulfillRequest", {
    requestId,
    responseCode: status,
    responseHeaders: [
      { name: "Content-Type", value: type },
      { name: "Access-Control-Allow-Origin", value: appUrl },
      { name: "Access-Control-Allow-Headers", value: "*" },
      { name: "Access-Control-Allow-Methods", value: "*" },
      { name: "Cache-Control", value: "no-store" },
      ...extra,
    ],
    body: (Buffer.isBuffer(data)
      ? data
      : Buffer.from(typeof data === "string" ? data : JSON.stringify(data))
    ).toString("base64"),
  });
}
const originalPanel = '[aria-labelledby="original-documents-title"]';
const originalOrder = "61000000-0000-4000-8000-000000000001";
const originalVariants = [
  "terms",
  "withdrawal",
  "confirmation",
  "timing",
  "timing-original",
  "fulfillment",
  "fulfillment-original",
];
const when = "2026-09-10T10:00:00Z";
const originalOwner = () => (openCaseExists ? learner : subject);
const originalBearer = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.synthetic`;
let originalOrdinary = false;
let originalFault = "",
  originalHeld = null;
function originalInventoryFixture() {
  return {
    protocol: 1,
    claimant_subject: subject,
    observed_at: when,
    scope: {
      finance: "claimant_only",
      purchases: "claimant_and_same_case_learning_subjects",
      archives_scanned: false,
      remote_sources_queried: false,
      catalog_complete: false,
      historical_owner_inventory_complete: true,
      known_local_enumeration_complete: true,
    },
    records: [
      {
        family: "purchase",
        kind: "purchase",
        source_service: "backend",
        source_subject: originalOwner(),
        owner_relation: openCaseExists ? "same_case_learning_subject" : "claimant",
        purchase_source: "skills",
        offer_id: originalOrder,
        printed_number: null,
        record_basis: "original_offer",
        reader_state: "candidate",
        reason: null,
        selector: null,
        artifacts: originalVariants.map((variant) => ({
          variant,
          selection_source: "stored",
          observation: "nonempty",
          reader_state: "candidate",
          reason: null,
          selector: { kind: "purchase", id: originalOrder, variant },
        })),
      },
      {
        family: "finance",
        kind: "invoice",
        source_service: "backend",
        source_subject: subject,
        owner_relation: "claimant",
        purchase_source: null,
        offer_id: null,
        printed_number: "R10000000",
        record_basis: "own_invoice_reference",
        reader_state: "candidate",
        reason: null,
        selector: { kind: "invoice", id: "10000000", variant: "original" },
        artifacts: [
          {
            variant: "original",
            selection_source: "database_original",
            observation: "nonempty",
            reader_state: "candidate",
            reason: null,
            selector: { kind: "invoice", id: "10000000", variant: "original" },
          },
        ],
      },
    ],
  };
}
function originalStatusFixture() {
  return {
    offer: {
      id: originalOrder,
      user_id: originalOwner(),
      source: "skills",
      created_at: when,
      expires_at: when,
      recipient: "original synthetic recipient",
      product: {
        kind: "course",
        reference: "original-course",
        title: "Original course",
        description: "Original description",
        coins: 3,
        facts: { access: "original" },
        revision: "original",
        service_starts_at: null,
      },
      document_hash: "stored-documents",
      hash: "stored-offer",
      text: "<img src=x onerror=bad()> original offer",
      declaration: "Original declaration",
    },
    state: "fulfilled",
    accepted_at: when,
    confirmation_smtp_accepted_at: null,
    fulfillment: { kind: "course_access_provided" },
    financial_evidence: null,
    review_reason: null,
    provision_deadline: null,
    provision_timing: null,
    document_corrections: [],
  };
}

async function intercept({ requestId, request }) {
  const url = new URL(request.url);
  if (url.origin === appUrl) return cmd("Fetch.continueRequest", { requestId });
  if (url.origin === "https://www.youtube-nocookie.com") {
    calls.push({ path: url.pathname, method: request.method, kind: "youtube" });
    return fulfill(
      requestId,
      "<!doctype html><title>Synthetic YouTube</title><p>Intercepted synthetic player</p>",
      200,
      "text/html"
    );
  }
  if (url.origin !== apiUrl) {
    blocked.push(request.url);
    return cmd("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
  }
  const headers = Object.fromEntries(
    Object.entries(request.headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  const body = request.postData ? JSON.parse(request.postData) : undefined;
  if (cfb1Mode && directPlan && request.method === "GET" && url.pathname === directPlan.path) {
    assert.equal(headers[directPlan.header], directPlan.proof);
    assert(!headers.cookie && !body);
    assert.equal(
      [
        "authorization",
        "x-commercial-claim-key",
        "x-moderation-capability",
        "x-learning-key",
      ].filter((name) => headers[name]).length,
      1
    );
    assert(!directPlan.started);
    directPlan.started = true;
    return cmd("Fetch.continueRequest", { requestId });
  }
  calls.push({ path: url.pathname, method: request.method, headers, body });
  if (request.method === "OPTIONS") return fulfill(requestId, "");
  if (
    originalsMode &&
    (url.pathname.startsWith("/shop/claims/documents") ||
      url.pathname.startsWith("/shop/claims/purchases/"))
  ) {
    assert.equal(request.method, "GET");
    assert.equal(body, undefined);
    assert(!headers.cookie && !headers["x-learning-key"]);
    assert.equal(
      [
        headers["x-commercial-claim-key"],
        headers["x-moderation-capability"],
        headers.authorization,
      ].filter(Boolean).length,
      1
    );
    if (originalFault === "401") return fulfill(requestId, {}, 401);
    if (url.pathname === "/shop/claims/documents") {
      if (originalFault === "inventory503") return fulfill(requestId, {}, 503);
      const value = originalInventoryFixture();
      value.records[0].artifacts[1] = {
        ...value.records[0].artifacts[1],
        observation: "empty",
        reader_state: "unavailable",
        reason: "empty_selected_artifact",
        selector: null,
      };
      return fulfill(requestId, value);
    }
    if (url.pathname.endsWith("/status")) return fulfill(requestId, originalStatusFixture());
    if (originalFault === "held") {
      originalHeld = requestId;
      return;
    }
    if (originalFault === "document503") return fulfill(requestId, {}, 503);
    const pdf = !url.pathname.includes("/purchase/") || /\/(terms|withdrawal)$/.test(url.pathname);
    return fulfill(
      requestId,
      pdf ? "%PDF exact synthetic original bytes" : "original\r\nconfirmation",
      200,
      pdf ? "application/pdf" : "text/plain; charset=utf-8"
    );
  }

  if (url.pathname.startsWith("/skills/learning/lectures/")) {
    assert(!headers["x-learning-key"]);
    assert(!headers.authorization);
    assert(!headers.cookie);
    assert(!headers.referer || headers.referer === appUrl + "/");
    const match = /bytes=(\d+)-(\d*)/.exec(headers.range ?? "bytes=0-");
    const start = Number(match[1]),
      end = match[2] ? Math.min(Number(match[2]), media.length - 1) : media.length - 1;
    return fulfill(requestId, media.subarray(start, end + 1), 206, "video/mp4", [
      { name: "Content-Range", value: `bytes ${start}-${end}/${media.length}` },
      { name: "Accept-Ranges", value: "bytes" },
    ]);
  }
  if (url.pathname.startsWith("/skills/learning/") || url.pathname === "/shop/learning/resources") {
    assert.equal(headers["x-learning-key"], learningKey);
    assert(!headers.authorization);
    assert(!headers.cookie);
    assert(!headers["x-commercial-claim-key"]);
    if (
      deny ||
      ((startMode || continuationMode || premiumMode) && receipt?.subject !== activeLearner)
    )
      return fulfill(requestId, { detail: "Synthetic revoked learning key" }, 401);
    if (
      continuationMode &&
      !courseAvailable &&
      url.pathname.startsWith("/skills/learning/courses/")
    )
      return fulfill(requestId, { detail: "Synthetic course access not currently available" }, 403);
  }
  if (url.pathname === "/auth/oauth/providers")
    return fulfill(
      requestId,
      routeMode ? [{ id: "synthetic-route-provider", name: "Synthetic linked provider" }] : []
    );
  if (routeMode && url.pathname.startsWith("/auth/moderation/access/")) {
    assert(!headers.cookie && !headers.authorization && !headers["x-moderation-capability"]);
    assert.equal(request.method, "POST");
    if (url.pathname === "/auth/moderation/access/password") {
      assert.deepEqual(Object.keys(body).sort(), [
        "mfa_code",
        "name_or_email",
        "password",
        "recaptcha_response",
        "recovery_code",
      ]);
      assert.equal(body.password, "synthetic route password");
      assert.equal(body.mfa_code, "123456");
      assert.equal(body.recovery_code, "synthetic-route-recovery");
      assert.equal(body.recaptcha_response, "");
      routeHeldPassword = requestId;
      return;
    }
    if (url.pathname === "/auth/moderation/access/recovery") {
      assert.deepEqual(Object.keys(body).sort(), ["case_id", "contact", "source"]);
      assert.equal(body.case_id, "70000000-0000-4000-8000-000000000001");
      assert.equal(body.contact, "synthetic-route@example.invalid");
      assert(["backend", "challenges"].includes(body.source));
      routeHeldRecovery = requestId;
      return;
    }
    throw Error(`Unexpected route proof request ${url.pathname}`);
  }
  if (openMode && url.pathname === "/auth/moderation/access/password") {
    assert(!headers.cookie && !headers.authorization && !headers["x-moderation-capability"]);
    assert.equal(body.password, "synthetic case password");
    assert.equal(body.mfa_code, "123456");
    assert.deepEqual(Object.keys(body).sort(), [
      "mfa_code",
      "name_or_email",
      "password",
      "recaptcha_response",
      "recovery_code",
    ]);
    return fulfill(requestId, { capability: openProof });
  }
  if (originalsMode && url.pathname === "/auth/users/me") {
    assert.equal(headers.authorization, `Bearer ${originalBearer}`);
    return fulfill(requestId, {
      id: subject,
      name: "synthetic-original-owner",
      display_name: "Synthetic original owner",
      email_verified: true,
      terms_version: "2026-09-r1",
      terms_accepted_at: 1,
      tags: [],
      admin: false,
      email: "synthetic@example.invalid",
    });
  }
  if (openMode && url.pathname === "/auth/moderation/inbox") {
    if (originalsMode && originalOrdinary)
      assert.equal(headers.authorization, `Bearer ${originalBearer}`);
    else {
      assert.equal(headers["x-moderation-capability"], openProof);
      assert(!headers.authorization);
    }
    assert(!headers.cookie);
    return fulfill(requestId, {
      backend: [],
      challenges: [],
      challenges_available: true,
      scope: "rights",
      recipient_id: subject,
    });
  }
  if (openMode && url.pathname === "/shop/claims/recipient/open") {
    assert.equal(headers["x-moderation-capability"], openProof);
    assert(!headers.authorization && !headers.cookie && !headers["x-commercial-claim-key"]);
    assert.deepEqual(Object.keys(body), ["command_id"]);
    const saved = JSON.parse(
      await evaluate("sessionStorage.getItem('commercial-case-opening-v1')")
    );
    assert(
      saved.some(
        (row) =>
          row.record.subject === subject && JSON.stringify(row.record.body) === JSON.stringify(body)
      ),
      "exact opening request saved before HTTP"
    );
    if (holdOpening) {
      holdOpening = false;
      await new Promise((resolve) => {
        releaseOpening = resolve;
      });
      releaseOpening = null;
    }
    if (!openingJournal.has(body.command_id))
      openingJournal.set(body.command_id, {
        command_id: body.command_id,
        actor: subject,
        kind: "open",
        case_id: caseId,
        request: structuredClone(body),
        result: { case_id: caseId, status: "inventory_pending" },
      });
    else assert.deepEqual(openingJournal.get(body.command_id).request, body);
    openCaseExists = true;
    if (openLost) {
      openLost = false;
      openHidden = true;
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    openHidden = false;
    return fulfill(requestId, openingJournal.get(body.command_id).result);
  }
  if (url.pathname === "/shop/claims/recipient/export") {
    if (openMode) {
      assert(
        headers["x-moderation-capability"] === openProof ||
          headers["x-commercial-claim-key"] === activeClaim
      );
      assert(!headers.authorization && !headers.cookie);
      return fulfill(requestId, openingEnvelope());
    }
    if (headers["x-commercial-claim-key"] !== activeClaim || foreignProof)
      return fulfill(requestId, {}, 401);
    if (premiumMode && premiumSplit === "summary") {
      premiumHeldExport = requestId;
      return;
    }
    if (premiumMode && premiumSplit === "rights") return fulfill(requestId, premiumOldExport);
    if (premiumMode && premiumSplit === "foreign-export")
      return fulfill(requestId, {
        ...premiumOldExport,
        case: { id: randomUUID(), subject },
        subject_erasures: premiumErasures,
        resource_continuations: premiumRows,
      });
    return fulfill(requestId, {
      case: { id: caseId, subject, access_epoch: accessEpoch },
      obligations: [],
      ...(premiumMode
        ? {
            evidence: [premiumObservation, ...premiumExtraObservations],
            subject_erasures:
              premiumSplit === "export-withdrawn"
                ? premiumOldExport.subject_erasures
                : premiumErasures,
            resource_continuations: premiumHidden
              ? []
              : premiumSplit === "export-erasure"
                ? premiumOldExport.resource_continuations
                : premiumRows,
            journal: premiumHidden ? [] : premiumJournal,
          }
        : {}),
      ...(continuationMode
        ? {
            subject_erasures: [
              {
                subject,
                case_id: caseId,
                request_id: subject,
                erased_at: "2026-09-10T08:00:00Z",
                scope: "ordinary_account",
              },
            ],
            course_successor_grants: [...courseGrants.values()],
            course_successor_receipts: courseReceipts,
          }
        : {}),
    });
  }
  if (
    premiumMode &&
    ["/shop/claims/recipient/resource_rights", "/shop/claims/recipient/premium_continue"].includes(
      url.pathname
    )
  ) {
    assert.equal(headers["x-commercial-claim-key"], activeClaim);
    assert(!headers.authorization && !headers.cookie && !headers["x-learning-key"]);
    assert.equal(request.method, "POST");
    if (url.pathname.endsWith("/resource_rights")) {
      assert.deepEqual(body, {});
      if (["summary", "export-erasure", "foreign-export"].includes(premiumSplit))
        return fulfill(requestId, premiumOldRights);
      if (premiumSplit === "export-withdrawn")
        return fulfill(requestId, { detail: "Synthetic unrelated rights unavailable" }, 503);
      return fulfill(requestId, {
        observations: [
          premiumObservation,
          ...premiumExtraObservations,
          {
            id: randomUUID(),
            case_id: caseId,
            category: "heart_balance_at_erasure",
            source_key: subject,
            evidence: { hearts: 3 },
            recorded_at: new Date().toISOString(),
          },
        ],
        continuations: premiumHidden ? [] : premiumRows,
        paid_allocation_inferred: false,
      });
    }
    assert.deepEqual(Object.keys(body).sort(), [
      "command_id",
      "continue_existing_right",
      "evidence_id",
      "successor",
    ]);
    assert.equal(body.continue_existing_right, true);
    const saved = JSON.parse(
      await evaluate("sessionStorage.getItem('commercial-premium-continuation-v1')")
    );
    assert(
      saved.some(
        (r) =>
          r.record.operation === "premium_continue" &&
          r.record.uncertain_attempt === true &&
          JSON.stringify(r.record.body) === JSON.stringify(body)
      ),
      "exact uncertain Premium request saved before dispatch"
    );
    if (premiumFault === "409")
      return fulfill(requestId, { detail: "Synthetic current continuation conflict" }, 409);
    let row = premiumRows.find((r) => r.command_id === body.command_id);
    if (row) assert.deepEqual(row.election, body);
    else {
      assert.equal(body.evidence_id, premiumEvidenceId);
      assert.equal(body.successor, activeLearner);
      assert(
        !premiumRows.some(
          (r) => r.source_evidence === body.evidence_id && r.subject === body.successor
        )
      );
      row = {
        id: randomUUID(),
        case_id: caseId,
        kind: "premium",
        source_evidence: premiumEvidenceId,
        source_subject: subject,
        subject: body.successor,
        command_id: body.command_id,
        original: structuredClone(premiumObservation.evidence),
        election: structuredClone(body),
        created_at: new Date().toISOString(),
        state: "active",
        result: {
          period_id: randomUUID(),
          since: premiumObservation.evidence.since,
          until: premiumObservation.evidence.until,
          new_purchase: false,
          renewal_activated: false,
          original_period_id: originalPeriodId,
          current_access_granted: true,
        },
      };
      premiumRows.push(row);
      premiumJournal.push({
        id: "9007199254740999",
        command_id: body.command_id,
        case_id: caseId,
        actor: subject,
        kind: "premium_continue",
        request: structuredClone(body),
        result: structuredClone(row),
      });
    }
    if (premiumFault === "after-hidden") {
      premiumFault = "";
      premiumHidden = true;
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    return fulfill(requestId, row);
  }
  if (continuationMode && url.pathname === "/shop/claims/recipient/course_rights") {
    assert.deepEqual(body, { source_subject: subject });
    assert.deepEqual(
      Object.keys(headers).filter(
        (k) => k.startsWith("x-") || k === "authorization" || k === "cookie"
      ),
      ["x-commercial-claim-key"]
    );
    assert.equal(headers["x-commercial-claim-key"], activeClaim);
    return fulfill(requestId, [
      {
        ...originalCourse,
        current_subject: courseAvailable ? learner : null,
        generation: activeLearner ? 0 : 1,
      },
    ]);
  }
  if (continuationMode && url.pathname === "/shop/claims/recipient/course_successor") {
    assert.equal(headers["x-commercial-claim-key"], activeClaim);
    assert(!headers["x-learning-key"] && !headers.authorization && !headers.cookie);
    assert.deepEqual(Object.keys(body).sort(), [
      "command_id",
      "continue_existing_right",
      "right_id",
      "source_subject",
      "successor",
    ]);
    assert.equal(body.source_subject, subject);
    assert.equal(body.right_id, courseRightId);
    assert.equal(body.successor, learner);
    assert.equal(body.continue_existing_right, true);
    const saved = await evaluate(
      "JSON.parse(sessionStorage.getItem('commercial-course-continuation-v1'))"
    );
    assert(
      saved.some(
        (r) =>
          r.record.operation === "course_successor" &&
          JSON.stringify(r.record.body) === JSON.stringify(body)
      )
    );
    if (courseFault === "before") {
      courseFault = "";
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    if (courseFault === "refuse") {
      courseFault = "";
      return fulfill(requestId, { detail: "Synthetic exact-command refusal" }, 409);
    }
    let grant = courseGrants.get(body.command_id);
    if (grant)
      assert.deepEqual(grant.claimant_authorization, { ...body, original_scope: originalCourse });
    else {
      assert.equal(activeLearner, learner);
      grant = {
        id: body.command_id,
        command_id: body.command_id,
        case_id: caseId,
        source: "skills",
        original_contract: courseRightId,
        successor: learner,
        original_scope: originalCourse,
        claimant_authorization: { ...body, original_scope: originalCourse },
        created_at: new Date().toISOString(),
        state: "uncertain",
        result: {
          grant_id: body.command_id,
          right_id: courseRightId,
          subject: learner,
          state: "uncertain",
          reason: "Synthetic lost delivery reply",
          new_purchase: false,
        },
      };
      courseGrants.set(grant.id, grant);
      courseObservation(grant, grant.result);
      courseAvailable = true;
    }
    if (grant.state === "withdrawn") courseObservation(grant, courseDelivery(grant));
    if (courseFault === "after") {
      courseFault = "";
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    return fulfill(requestId, grant);
  }
  if (url.pathname === "/shop/claims/recipient/access") {
    if (openMode) assert.equal(headers["x-moderation-capability"], openProof);
    else assert.equal(headers["x-commercial-claim-key"], activeClaim);
    assert.equal(body.case_id, caseId);
    const saved = JSON.parse(
      await evaluate('sessionStorage.getItem("commercial-access-rotations-v1")')
    );
    assert(saved.some((row) => JSON.stringify(row.rotation.body) === JSON.stringify(body)));
    if (rotations.has(body.command_id)) assert.deepEqual(rotations.get(body.command_id), body);
    else {
      rotations.set(body.command_id, body);
      activeClaim = body.key;
      accessEpoch++;
    }
    if (loseRotation) {
      loseRotation = false;
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    return fulfill(requestId, { case_id: caseId, claim_value_expires: false });
  }
  if (url.pathname === "/shop/claims/documents/final-statement/123/original") {
    assert.equal(headers["x-commercial-claim-key"], activeClaim);
    assert.equal(request.method, "GET");
    return fulfill(
      requestId,
      "%PDF-1.4\n% Synthetic original statement fixture\n%%EOF",
      200,
      "application/pdf"
    );
  }
  if (premiumMode && url.pathname === "/shop/claims/recipient/learning_summary") {
    assert.equal(headers["x-commercial-claim-key"], activeClaim);
    assert.deepEqual(body, {});
    if (["rights", "export-withdrawn", "foreign-export"].includes(premiumSplit))
      return fulfill(requestId, premiumOldSummary);
    if (premiumSplit === "export-erasure") {
      premiumHeldSummary = requestId;
      return;
    }
    return fulfill(requestId, {
      subjects: [...premiumSubjects.values()],
      scope: "Limited learning identity; no financial authority",
    });
  }
  if (url.pathname === "/shop/claims/recipient/learning_summary")
    return fulfill(requestId, {
      subjects: [...historicalLearners].map((subject) => ({
        case_id: caseId,
        subject,
        erased_at: subject === activeLearner ? null : "2026-09-09T00:00:00Z",
      })),
    });
  if (url.pathname === "/shop/claims/recipient/learning_start") {
    assert.equal(headers["x-commercial-claim-key"], activeClaim);
    assert(!headers.authorization && !headers.cookie && !headers["x-learning-key"]);
    assert.equal(body.case_id, caseId);
    assert.equal(body.expected_no_active_subject, true);
    assert.equal(body.use_retained_value, true);
    assert.equal(body.expected_subject, undefined);
    const saved = JSON.parse(
      await evaluate('sessionStorage.getItem("commercial-learning-start-v1")')
    );
    assert(
      saved.some(
        (row) =>
          row.record.operation === "learning_start" &&
          JSON.stringify(row.record.body) === JSON.stringify(body)
      )
    );
    let original = starts.get(body.command_id);
    if (original) assert.deepEqual(original.body, body);
    else {
      if (activeLearner)
        return fulfill(requestId, { detail: "Synthetic intervening active learning access" }, 409);
      activeLearner = randomUUID();
      historicalLearners.add(activeLearner);
      original = {
        body: structuredClone(body),
        receipt: {
          subject: activeLearner,
          expires_at: new Date(Date.now() + 600000).toISOString(),
          purpose: "retained_learning",
          ordinary_authority: false,
          financial_authority: false,
          claims_satisfied: false,
        },
      };
      starts.set(body.command_id, original);
    }
    learningKey = body.key;
    receipt = original.receipt;
    if (loseStart) {
      loseStart = false;
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    return fulfill(requestId, receipt);
  }
  if (url.pathname === "/shop/claims/recipient/learning_access") {
    assert.equal(headers["x-commercial-claim-key"], activeClaim);
    const saved = JSON.parse(
      await evaluate('sessionStorage.getItem("commercial-learning-refresh-v1")')
    );
    assert(saved.some((row) => JSON.stringify(row.record.body) === JSON.stringify(body)));
    if (startMode && loseRefresh) {
      loseRefresh = false;
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    if (startMode && body.expected_subject !== activeLearner)
      return fulfill(requestId, { detail: "Synthetic original refresh target was erased" }, 409);
    assert.equal(body.expected_subject, activeLearner);
    if (learningKey !== body.key) {
      learningKey = body.key;
      receipt = {
        subject: activeLearner,
        expires_at: new Date(Date.now() + 600000).toISOString(),
        purpose: "retained_learning",
        ordinary_authority: false,
        financial_authority: false,
        claims_satisfied: false,
      };
    }
    return fulfill(requestId, receipt);
  }
  if (url.pathname === "/shop/learning/resources")
    return fulfill(requestId, {
      subject: activeLearner,
      purpose: "retained_learning",
      ordinary_authority: false,
      coins: 17,
      withheld_coins: 2,
      hearts: 3,
      hearts_max: 5,
      premium: premiumMode
        ? currentPremium
        : {
            period_id: "30000000-0000-4000-8000-000000000001",
            since: "2026-01-01T00:00:00Z",
            until: "2027-01-01T00:00:00Z",
            active: true,
          },
      renewal_activated: false,
      purchase_performed: false,
    });
  if (url.pathname === "/skills/learning/course_access")
    return fulfill(
      requestId,
      continuationMode && !courseAvailable ? [] : [{ id: data.id, title: data.title }]
    );
  if (url.pathname === "/skills/learning/courses/arithmetic") return fulfill(requestId, data);
  if (url.pathname.endsWith("/watch")) return fulfill(requestId, true);
  if (url.pathname.endsWith("/lectures/local"))
    return fulfill(
      requestId,
      `${apiUrl}/skills/learning/lectures/synthetic-token/arithmetic_local.mp4`
    );
  if (url.pathname.endsWith("/complete")) {
    data.sections[0].lectures.find((l) =>
      url.pathname.endsWith(`/lectures/${l.id}/complete`)
    ).completed = true;
    if (loseCompletion) {
      loseCompletion = false;
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    return fulfill(requestId, true);
  }
  throw Error(`Unexpected synthetic API request ${request.method} ${url.pathname}`);
}

async function premiumContinuationJourneys() {
  await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
  await until('!!document.querySelector("#commercial-current-key")');
  for (const language of ["en-US", "de"]) {
    const texts = JSON.parse(
      await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")
    );
    const t = texts.PremiumContinuation,
      learn = texts.LearningAccess,
      viewer = texts.RetainedCourses;
    resetPremium();
    activeLearner = learner;
    learningKey = receipt = null;
    deny = false;
    activeClaim = claim;
    await evaluate("sessionStorage.clear()");
    await cmd("Network.setCookie", { name: "locale", value: language, url: appUrl, path: "/" });
    await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
    await until('!!document.querySelector("#commercial-current-key")');
    await enter("#commercial-current-key", claim);
    await click(rights, texts.ClaimAccess.ImportKey);
    await until(`!!document.querySelector(${JSON.stringify(premium)})`);
    await click(learning, learn.Find);
    await click(learning, learn.Prepare);
    await rm(join(fixture, "downloads", "bootstrap-learning-access.json"), { force: true });
    await click(learning, learn.Save);
    const learningFile = await savedDownload("bootstrap-learning-access.json");
    await evaluate(
      `document.querySelector(${JSON.stringify(learning + ' > label input[type="checkbox"]')}).click()`
    );
    await click(learning, learn.Issue);
    await until(`!!document.querySelector(${JSON.stringify(courses)})`);
    const savedLearning = await evaluate(
      "sessionStorage.getItem('commercial-learning-refresh-v1')"
    );
    const posts = () =>
      calls.filter(
        (c) => c.method === "POST" && c.path === "/shop/claims/recipient/premium_continue"
      );
    const beforePosts = posts().length;
    await click(premium, t.Load);
    await click(premium, t.Review);
    await until("!!sessionStorage.getItem('commercial-premium-continuation-v1')");
    const prepared = await evaluate(
      "JSON.parse(sessionStorage.getItem('commercial-premium-continuation-v1')).at(-1).record"
    );
    assert.equal(prepared.operation, "premium_continue");
    assert.equal(prepared.body.successor, learner);
    assert.equal(prepared.body.evidence_id, premiumEvidenceId);
    assert.equal(posts().length, beforePosts);
    assert.equal(
      await evaluate(
        `document.querySelectorAll(${JSON.stringify(premium + ' input[type="checkbox"]')}).length`
      ),
      0
    );
    assert.equal(
      await evaluate("sessionStorage.getItem('commercial-learning-refresh-v1')"),
      savedLearning
    );
    const visible = await evaluate(
      `document.querySelector(${JSON.stringify(premium)}).textContent`
    );
    assert(visible.includes(premiumObservation.evidence.until));
    assert(visible.includes(currentPremium.until));
    assert.notEqual(premiumObservation.evidence.until, currentPremium.until);
    await evaluate(
      `[...document.querySelectorAll(${JSON.stringify(premium + " details")})].find(d=>d.querySelector('summary').textContent.trim()===${JSON.stringify(t.Restore)}).open=true`
    );
    await inspectPanel(premium, `${language}-premium-prepared`);
    await rm(join(fixture, "downloads", "bootstrap-premium-continuation.json"), { force: true });
    await click(premium, t.Save);
    const file = await savedDownload("bootstrap-premium-continuation.json");
    await writeFile(join(evidence, `${language}-premium-predispatch.json`), file);
    assert.deepEqual(JSON.parse(file).body, prepared.body);
    assert.equal(JSON.parse(file).uncertain_attempt, false);
    premiumFault = "after-hidden";
    await click(premium, t.Continue);
    await until(
      `${buttons(premium)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Retry)}&&!b.disabled)`
    );
    assert.equal(premiumRows.length, 1);
    assert.equal(premiumJournal.length, 1);
    await evaluate("sessionStorage.clear()");
    await cmd("Page.reload", {});
    await until('!!document.querySelector("#commercial-current-key")');
    await enter("#commercial-current-key", claim);
    await click(rights, texts.ClaimAccess.ImportKey);
    await until(`!!document.querySelector(${JSON.stringify(premium)})`);
    assert.equal(
      await evaluate("sessionStorage.getItem('commercial-premium-continuation-v1')"),
      null
    );
    await evaluate(
      `[...document.querySelectorAll(${JSON.stringify(premium + " details")})].find(d=>d.querySelector('summary').textContent.trim()===${JSON.stringify(t.Restore)}).open=true`
    );
    await enter("#premium-continuation-recovery", file);
    await click(premium, t.Import);
    await until(
      `${buttons(premium)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Retry)}&&!b.disabled)`
    );
    premiumFault = "409";
    await click(premium, t.Retry);
    await until(
      `${buttons(premium)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Retry)}&&!b.disabled)`
    );
    const uncertain = await evaluate(
      "JSON.parse(sessionStorage.getItem('commercial-premium-continuation-v1')).at(-1).record"
    );
    assert.equal(uncertain.state, "unconfirmed");
    assert.equal(uncertain.uncertain_attempt, true);
    assert.deepEqual(uncertain.body, prepared.body);
    assert.equal(
      await evaluate(
        `${buttons(premium)}.find(b=>b.textContent.trim()===${JSON.stringify(t.Review)}).disabled`
      ),
      true
    );
    await inspectPanel(premium, `${language}-premium-import-uncertain`);
    premiumHidden = false;
    premiumFault = "";
    await click(premium, t.Retry);
    await until(
      `document.querySelector(${JSON.stringify(premium)}).textContent.includes(${JSON.stringify(t.State.active)})`
    );
    assert.equal(premiumRows.length, 1);
    assert.equal(premiumJournal.length, 1);
    assert.equal(
      new Set([premiumRows[0].id, premiumRows[0].command_id, premiumRows[0].result.period_id]).size,
      3
    );
    assert.equal(premiumRows[0].result.until, premiumObservation.evidence.until);
    const originalPosts = posts().slice(beforePosts);
    assert.equal(originalPosts.length, 3);
    for (const p of originalPosts) assert.deepEqual(p.body, prepared.body);
    // The personal continuation does not restore the separate learning key.
    assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(courses)})`), false);
    await evaluate(`document.querySelector(${JSON.stringify(learning + " details")}).open=true`);
    await enter("#learning-recovery", learningFile);
    await click(learning, learn.Restore);
    await until(
      `!!document.querySelector(${JSON.stringify(learning + ' > label input[type="checkbox"]')})`
    );
    await evaluate(
      `document.querySelector(${JSON.stringify(learning + ' > label input[type="checkbox"]')}).click()`
    );
    await click(learning, learn.Issue);
    await until(`!!document.querySelector(${JSON.stringify(courses)})`);
    await click(premium, t.CheckResources);
    await until(
      `document.querySelector(${JSON.stringify(premium)}).textContent.includes(${JSON.stringify(currentPremium.until)})`
    );
    const restoredLearning = await evaluate(
      "sessionStorage.getItem('commercial-learning-refresh-v1')"
    );
    // Real MP4 playback in the existing independent course, before a short synthetic current period expires.
    currentPremium = { ...currentPremium, until: new Date(Date.now() + 4000).toISOString() };
    await click(premium, t.CheckResources);
    await click(courses, viewer.List);
    await click(courses, "Synthetic arithmetic");
    await click(courses, "Local lecture");
    await until(
      "!!document.querySelector('video') && document.querySelector('video').readyState>=2"
    );
    await evaluate("document.querySelector('video').play()");
    await until("document.querySelector('video').currentTime>0");
    await until(
      `document.querySelector(${JSON.stringify(premium)}).textContent.includes(${JSON.stringify(t.CurrentNotActive)})`
    );
    assert(
      await evaluate(
        `!!document.querySelector(${JSON.stringify(courses)}) && !!document.querySelector('video')`
      )
    );
    assert.equal(
      await evaluate("sessionStorage.getItem('commercial-learning-refresh-v1')"),
      restoredLearning
    );
    const expiryShot = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(
      join(evidence, `${language}-premium-expiry-course.png`),
      Buffer.from(expiryShot.data, "base64")
    );
    // Preserve a still-mounted real player before independently qualified split feeds.
    await evaluate(
      "document.querySelector('video').scrollIntoView({block:'center',behavior:'instant'})"
    );
    const playingShot = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(
      join(evidence, `${language}-pc1-player-before.png`),
      Buffer.from(playingShot.data, "base64")
    );
    premiumOldExport = structuredClone({
      case: { id: caseId, subject, access_epoch: accessEpoch },
      obligations: [],
      evidence: [premiumObservation],
      subject_erasures: premiumErasures,
      resource_continuations: premiumRows,
      journal: premiumJournal,
    });
    premiumOldSummary = structuredClone({
      subjects: [...premiumSubjects.values()],
      scope: "Limited learning identity; no financial authority",
    });
    premiumOldRights = structuredClone({
      observations: [premiumObservation],
      continuations: premiumRows,
      paid_allocation_inferred: false,
    });
    // Owned exact-S erasure, with a distinct current S2, withdraws S1 without retargeting its original command.
    const erasedAt = new Date().toISOString();
    premiumSubjects.get(learner).erased_at = erasedAt;
    activeLearner = randomUUID();
    premiumSubjects.set(activeLearner, {
      ...premiumSubjects.get(learner),
      subject: activeLearner,
      erased_at: null,
      election_id: randomUUID(),
    });
    premiumErasures.push({
      subject: learner,
      case_id: caseId,
      request_id: randomUUID(),
      erased_at: erasedAt,
      scope: "learning_data",
    });
    premiumRows[0].state = "withdrawn";
    if (premiumExportMode) {
      premiumSplit = "foreign-export";
      await click(premium, t.Load);
      await until(
        `${buttons(premium)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Load)}&&!b.disabled)`
      );
      assert(
        await evaluate("!!document.querySelector('video')"),
        "foreign export cannot erase current media"
      );
      assert(
        await evaluate(
          `document.querySelector(${JSON.stringify(premium)}).textContent.includes(${JSON.stringify(t.Failed)})`
        )
      );
      const historical = await evaluate(
        "JSON.parse(sessionStorage.getItem('commercial-premium-continuation-v1')).at(-1).record"
      );
      historical.last.state = "withdrawn";
      await evaluate(
        `[...document.querySelectorAll(${JSON.stringify(premium + " details")})].find(d=>d.querySelector('summary').textContent.trim()===${JSON.stringify(t.Restore)}).open=true`
      );
      await enter("#premium-continuation-recovery", JSON.stringify(historical));
      const beforeImport = calls.length;
      await click(premium, t.Import);
      await until(
        `${buttons(premium)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Retry)}&&!b.disabled)`
      );
      assert(
        await evaluate("!!document.querySelector('video')"),
        "file-only withdrawn history cannot erase current media"
      );
      assert.equal(calls.length, beforeImport, "historical import does not request new authority");
      scenarios.push(
        `${language}: foreign-case live export and file-only withdrawn history preserve mounted media`
      );
    }
    premiumSplit = premiumExportMode
      ? language === "en-US"
        ? "export-erasure"
        : "export-withdrawn"
      : language === "en-US"
        ? "summary"
        : "rights";
    if (["rights", "export-erasure"].includes(premiumSplit)) {
      const extra = structuredClone(premiumObservation);
      extra.id = randomUUID();
      extra.source_key = randomUUID();
      extra.evidence = {
        ...extra.evidence,
        id: extra.source_key,
        user_id: learner,
        subject: learner,
        request_id: premiumErasures.at(-1).request_id,
        observed_at: erasedAt,
      };
      extra.recorded_at = erasedAt;
      premiumExtraObservations.push(extra);
    }
    await click(premium, t.Load);
    await until("!document.querySelector('video')");
    if (premiumSplit === "summary") {
      assert(
        premiumHeldExport,
        "unrelated export remains intercepted and held when media disappears"
      );
      assert(
        await evaluate(
          `${buttons(premium)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Load)}&&b.disabled)`
        )
      );
      await fulfill(premiumHeldExport, { detail: "Synthetic unrelated export unavailable" }, 503);
      premiumHeldExport = null;
    }
    if (premiumSplit === "export-erasure") {
      assert(
        premiumHeldSummary,
        "summary remains held after canonical export removes mounted media"
      );
      assert(
        await evaluate(
          `${buttons(premium)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Load)}&&b.disabled)`
        )
      );
      await fulfill(premiumHeldSummary, { detail: "Synthetic unrelated summary unavailable" }, 503);
      premiumHeldSummary = null;
    }
    await until(
      `${buttons(premium)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Load)}&&!b.disabled)`
    );
    assert(
      await evaluate(
        `document.querySelector(${JSON.stringify(premium)}).textContent.includes(${JSON.stringify(t.Failed)})`
      )
    );
    assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(courses)})`), false);
    assert.equal(
      await evaluate("sessionStorage.getItem('commercial-learning-refresh-v1')"),
      restoredLearning
    );
    await evaluate(
      `document.querySelector(${JSON.stringify(premium)}).scrollIntoView({block:'center',behavior:'instant'})`
    );
    const splitShot = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(
      join(evidence, `${language}-pc1-split-unavailable.png`),
      Buffer.from(splitShot.data, "base64")
    );
    scenarios.push(
      `${language}: PC1 ${
        premiumSplit === "export-erasure"
          ? "canonical export erasure and new observation remove mounted media before held summary503 and despite older rights/active exported row"
          : premiumSplit === "export-withdrawn"
            ? "exported withdrawn row with matched original removes mounted media despite older erasure subsection/summary and failed rights503"
            : premiumSplit === "summary"
              ? "fresh same-S summary removes mounted media while unrelated export held, then503"
              : "fresh withdrawn rights plus new erasure observation removes mounted media despite stale export/summary and aggregate mismatch"
      }`
    );
    premiumSplit = "";
    await click(premium, t.Load);
    await until(
      `document.querySelector(${JSON.stringify(premium)}).textContent.includes(${JSON.stringify(t.State.withdrawn)})`
    );
    assert.equal(await evaluate("!!document.querySelector('video')"), false);
    assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(courses)})`), false);
    assert.equal(
      await evaluate("sessionStorage.getItem('commercial-learning-refresh-v1')"),
      restoredLearning
    );
    assert.equal(premiumJournal[0].result.state, "active");
    assert.equal(premiumRows[0].result.current_access_granted, true);
    await click(premium, t.Retry);
    await until(
      `${buttons(premium)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Retry)}&&!b.disabled)`
    );
    assert.deepEqual(posts().at(-1).body, prepared.body);
    assert.equal(premiumRows.length, 1);
    await inspectPanel(premium, `${language}-premium-withdrawn`);
    const savedFinal = await evaluate(
      "JSON.parse(sessionStorage.getItem('commercial-premium-continuation-v1')).at(-1).record"
    );
    assert.equal(savedFinal.last.state, "withdrawn");
    assert.equal(savedFinal.receipt.state, "active");
    assert.equal(savedFinal.body.successor, learner);
    await writeFile(
      join(evidence, `${language}-premium-final.json`),
      JSON.stringify(
        {
          prepared,
          uncertain,
          savedFinal,
          premiumRows,
          premiumJournal,
          premiumExtraObservations,
          originalCurrentDates: visible,
        },
        null,
        2
      )
    );
    scenarios.push(
      `${language}: optional predispatched file; exact saved continuation; fresh-storage uncertain import with409 and empty records; original-row/journal recovery; distinct longer current period; real protected MP4 remains after Premium expiry; exact-S withdrawal removes media without retarget or resurrection`
    );
  }
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
  assert.deepEqual(
    panelChecks.filter((s) => !s.valid),
    [],
    "Premium actions, optional file fields and keyboard focus remain readable"
  );
  assert(
    !calls.some((c) =>
      /offer|purchase_authorize|\/accept|learning_start|course_successor|resource_continue/.test(
        c.path
      )
    )
  );
}

async function caseOpeningJourneys() {
  await cmd("Network.setCookie", { name: "locale", value: "en-US", url: appUrl, path: "/" });
  await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
  await until('!!document.querySelector("#commercial-current-key")');
  for (const language of ["en-US", "de"]) {
    const texts = JSON.parse(
      await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")
    );
    openCaseExists = false;
    openIntake = language === "de";
    openHidden = false;
    openLost = language === "en-US";
    openingJournal.clear();
    rotations.clear();
    activeClaim = claim;
    accessEpoch = 1;
    loseRotation = false;
    await evaluate("sessionStorage.clear()");
    await cmd("Network.setCookie", { name: "locale", value: language, url: appUrl, path: "/" });
    await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
    await until('!!document.querySelector("#commercial-current-key")');
    const passwordForm = "main > form:first-of-type",
      before = calls.length;
    assert.equal(
      await evaluate(
        `${buttons(rights)}.some(b=>b.textContent.trim()===${JSON.stringify(texts.ClaimAccess.UseProof)})`
      ),
      false
    );
    await enter(passwordForm + " input[autocomplete=username]", "synthetic-case-user");
    await enter(passwordForm + " input[type=password]", "synthetic case password");
    await enter(passwordForm + " input[autocomplete=one-time-code]", "123456");
    await click(passwordForm, texts.Moderation.Prove);
    await until(
      `location.pathname==='/moderation' && ${buttons(rights)}.some(b=>b.textContent.trim()===${JSON.stringify(texts.ClaimAccess.UseProof)}&&!b.disabled)`
    );
    assert.equal(calls.slice(before).filter((c) => c.path.endsWith("/open")).length, 0);
    await click(rights, texts.ClaimAccess.UseProof);
    await until(
      `${buttons(rights)}.some(b=>b.textContent.trim()===${JSON.stringify(texts.CaseOpen.Open)}&&!b.disabled)`
    );
    assert.equal(calls.slice(before).filter((c) => c.path.endsWith("/open")).length, 0);
    assert.equal(
      await evaluate(
        `document.querySelector(${JSON.stringify(rights)}).querySelectorAll('input[type=checkbox]').length`
      ),
      0
    );
    await inspectPanel(rights, `${language}:case-open-available`);
    await inspectPanel('[aria-labelledby="case-open-title"]', `${language}:explicit-open-action`);
    holdOpening = true;
    await click(rights, texts.CaseOpen.Open);
    await until(
      `${buttons(rights)}.find(b=>b.textContent.trim()===${JSON.stringify(texts.CaseOpen.Open)}).disabled`
    );
    for (let attempts = 0; !releaseOpening; attempts++) {
      assert(attempts < 500, "Held exact opening request reached intercepted API");
      await delay(10);
    }
    assert(releaseOpening, "Synthetic request remains held while duplicate controls are disabled");
    releaseOpening();
    await until(
      `${buttons(rights)}.some(b=>b.textContent.trim()===${JSON.stringify(texts.ClaimAccess.Prepare)}&&!b.disabled)`
    );
    const current = JSON.parse(
      await evaluate("sessionStorage.getItem('commercial-case-opening-v1')")
    )[0].record;
    assert.equal(current.state, language === "en-US" ? "unconfirmed" : "recorded");
    assert.equal(openingJournal.size, 1);
    await evaluate(
      `[...document.querySelectorAll(${JSON.stringify(rights + " details")})].find(d=>d.querySelector('summary').textContent.trim()===${JSON.stringify(texts.CaseOpen.Recovery)}).open=true`
    );
    await inspectPanel(rights, `${language}:case-open-recovery`);
    await rm(join(fixture, "downloads", "bootstrap-case-opening.json"), { force: true });
    await click(rights, texts.CaseOpen.Save);
    const file = await savedDownload("bootstrap-case-opening.json");
    assert.deepEqual(JSON.parse(file).body, current.body);
    assert(!file.includes(openProof));
    if (language === "en-US") {
      await click(rights, texts.ClaimAccess.UseProof);
      await until(
        `${buttons(rights)}.some(b=>b.textContent.trim()===${JSON.stringify(texts.ClaimAccess.Prepare)}&&!b.disabled)`
      );
      assert.equal(
        JSON.parse(await evaluate("sessionStorage.getItem('commercial-case-opening-v1')"))[0].record
          .state,
        "unconfirmed"
      );
      await click(rights, texts.CaseOpen.Retry);
      await until(
        `document.querySelector(${JSON.stringify(rights)}).textContent.includes(${JSON.stringify(texts.CaseOpen.State.recorded)})`
      );
    }
    assert.equal(openingJournal.size, 1);
    const requests = calls
      .slice(before)
      .filter((c) => c.path === "/shop/claims/recipient/open" && c.method === "POST");
    assert.equal(requests.length, language === "en-US" ? 2 : 1);
    requests.forEach((c) => assert.deepEqual(c.body, current.body));
    // Recovery is an explicit personal-proof read; its file never substitutes authority.
    await enter("#commercial-case-opening-recovery", file);
    await click(rights, texts.CaseOpen.Import);
    await until(
      `document.querySelector(${JSON.stringify(rights)}).textContent.includes(${JSON.stringify(texts.CaseOpen.State.recorded)})`
    );
    assert.equal(
      calls
        .slice(before)
        .filter((c) => c.path === "/shop/claims/recipient/open" && c.method === "POST").length,
      requests.length
    );
    await click(rights, texts.ClaimAccess.Prepare);
    assert.equal(
      calls.slice(before).filter((c) => c.path.endsWith("/access") && c.method === "POST").length,
      0
    );
    await rm(join(fixture, "downloads", "bootstrap-commercial-access.json"), { force: true });
    await click(rights, texts.ClaimAccess.Save);
    const keyFile = JSON.parse(await savedDownload("bootstrap-commercial-access.json"));
    assert.equal(keyFile.owner.case_id, caseId);
    await evaluate(
      `document.querySelector(${JSON.stringify(rights + ' input[type="checkbox"]')}).click()`
    );
    await click(rights, texts.ClaimAccess.Replace);
    await until(
      `document.querySelector(${JSON.stringify(rights)}).textContent.includes(${JSON.stringify(texts.ClaimAccess.State.active)})`
    );
    assert.equal(rotations.size, 1);
    assert.equal(openingJournal.size, 1);
    assert(
      !calls.slice(before).some((c) => /learning|course_continue|purchase|recovery$/.test(c.path))
    );
    assert.equal(await evaluate('document.cookie.includes("accessToken")'), false);
    await inspectPanel(rights, `${language}:case-open-and-separate-key-confirmed`);
    const shot = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(join(evidence, `case-open-${language}.png`), Buffer.from(shot.data, "base64"));
    scenarios.push(
      `${language}: actual password/MFA → rights inbox → explicit ${openIntake ? "intake-only" : "omitted-case"} opening, presaved exact command; ${language === "en-US" ? "lost response plus independent current case remains pending until same-command replay" : "direct reply requires fresh owned export"}; optional file/import and a separate acknowledged key rotation; no learning/purchase action`
    );
  }
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
  assert.deepEqual(
    panelChecks.filter((s) => !s.valid),
    []
  );
}

async function courseContinuationJourneys() {
  await cmd("Network.setCookie", { name: "locale", value: "en-US", url: appUrl, path: "/" });
  await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
  await until('!!document.querySelector("#commercial-current-key")');
  for (const language of importMode ? ["en-US"] : ["en-US", "de"]) {
    const texts = JSON.parse(
      await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")
    );
    const t = texts.CourseContinuation,
      learn = texts.LearningAccess,
      viewer = texts.RetainedCourses;
    courseGrants.clear();
    courseReceipts.length = 0;
    courseAvailable = false;
    courseFault = "";
    historicalLearners.clear();
    historicalLearners.add(learner);
    activeLearner = learner;
    learningKey = receipt = null;
    deny = false;
    data.sections[0].lectures.forEach((l) => (l.completed = false));
    await evaluate("sessionStorage.clear()");
    await cmd("Network.setCookie", { name: "locale", value: language, url: appUrl, path: "/" });
    await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
    await until('!!document.querySelector("#commercial-current-key")');
    await enter("#commercial-current-key", claim);
    await click(rights, texts.ClaimAccess.ImportKey);
    await until(`!!document.querySelector(${JSON.stringify(continuation)})`);
    await click(learning, learn.Find);
    await click(learning, learn.Prepare);
    await rm(join(fixture, "downloads", "bootstrap-learning-access.json"), { force: true });
    await click(learning, learn.Save);
    const learningFile = await savedDownload("bootstrap-learning-access.json");
    await evaluate(
      `document.querySelector(${JSON.stringify(learning + ' > label input[type="checkbox"]')}).click()`
    );
    await click(learning, learn.Issue);
    await until(`!!document.querySelector(${JSON.stringify(courses)})`);
    const expectedHearts = language === "de" ? "1,5 / 2,5" : "1.5 / 2.5";
    assert(
      (
        await evaluate(
          `document.querySelector(${JSON.stringify(learning)}).textContent.replace(/\\s+/g,' ')`
        )
      ).includes(`${learn.Hearts}: ${expectedHearts}`)
    );
    await click(courses, viewer.List);
    await until(
      `document.querySelector(${JSON.stringify(courses)}).textContent.includes(${JSON.stringify(viewer.Empty)})`
    );
    let learningSaved = await evaluate("sessionStorage.getItem('commercial-learning-refresh-v1')");
    const resourcesBefore = calls.filter((c) => c.path === "/shop/learning/resources").length;
    await click(continuation, t.Load);
    await click(continuation, t.LoadRights);
    await until(
      `document.querySelector(${JSON.stringify(continuation)}).textContent.includes(${JSON.stringify(t.StartedAccess)})`
    );
    assert.equal(courseGrants.size, 0);
    await click(continuation, t.Prepare);
    await inspectPanel(continuation, `${language}-continuation-prepared`);
    const prepared = await evaluate(
      "JSON.parse(sessionStorage.getItem('commercial-course-continuation-v1')).at(-1).record"
    );
    assert.equal(prepared.operation, "course_successor");
    assert.equal(prepared.body.successor, learner);
    assert.equal(prepared.original.original.observed_course_access, false);
    assert.equal(prepared.original.original.observed_started_course_access, true);
    assert.deepEqual(prepared.original.original.purchase_ids, []);
    assert.equal(
      await evaluate("sessionStorage.getItem('commercial-learning-refresh-v1')"),
      learningSaved
    );
    assert.equal(
      calls.filter((c) => c.path === "/shop/learning/resources").length,
      resourcesBefore
    );
    await rm(join(fixture, "downloads", "bootstrap-course-continuation.json"), { force: true });
    await click(continuation, t.Save);
    const courseFile = await savedDownload("bootstrap-course-continuation.json");
    await writeFile(join(evidence, `${language}-prepared-course.json`), courseFile);
    assert.deepEqual(JSON.parse(courseFile).body, prepared.body);
    assert.equal(JSON.parse(courseFile).uncertain_attempt, false);
    await evaluate(
      `document.querySelector(${JSON.stringify(continuation + ' input[type="checkbox"]')}).click()`
    );
    if (language === "en-US") {
      courseFault = "before";
      await click(continuation, t.Continue);
      await until(
        `${buttons(continuation)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Retry)}&&!b.disabled)`
      );
      await click(continuation, t.Load);
      assert.equal(courseGrants.size, 0);
      assert.equal(
        await evaluate(
          "JSON.parse(sessionStorage.getItem('commercial-course-continuation-v1')).at(-1).record.state"
        ),
        "unconfirmed"
      );
      assert.equal(
        await evaluate(
          `${buttons(continuation)}.find(b=>b.textContent.trim()===${JSON.stringify(t.Prepare)}).disabled`
        ),
        true
      );
      await evaluate("sessionStorage.clear()");
      await cmd("Page.reload", {});
      await until('!!document.querySelector("#commercial-current-key")');
      await enter("#commercial-current-key", activeClaim);
      await click(rights, texts.ClaimAccess.ImportKey);
      await until(`!!document.querySelector(${JSON.stringify(continuation)})`);
      assert.equal(
        await evaluate("sessionStorage.getItem('commercial-course-continuation-v1')"),
        null
      );
      assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(courses)})`), false);
      const importResourcesBefore = calls.filter(
        (c) => c.path === "/shop/learning/resources"
      ).length;
      await evaluate(
        `document.querySelector('#course-continuation-recovery').closest('details').open=true`
      );
      await enter("#course-continuation-recovery", courseFile);
      await click(continuation, t.Restore);
      assert.deepEqual(
        await evaluate(
          "JSON.parse(sessionStorage.getItem('commercial-course-continuation-v1')).at(-1).record.body"
        ),
        prepared.body
      );
      await evaluate(
        `document.querySelector(${JSON.stringify(continuation + ' input[type="checkbox"]')}).click()`
      );
      courseFault = "refuse";
      await click(continuation, t.Retry);
      await until(
        `${buttons(continuation)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Retry)}&&!b.disabled)`
      );
      const imported = await evaluate(
        "JSON.parse(sessionStorage.getItem('commercial-course-continuation-v1')).at(-1).record"
      );
      await writeFile(
        join(evidence, "fresh-storage-after409.json"),
        JSON.stringify(
          { imported, grants: [...courseGrants.values()], receipts: courseReceipts },
          null,
          2
        )
      );
      assert.equal(courseGrants.size, 0);
      assert.equal(courseReceipts.length, 0);
      assert.equal(imported.state, "unconfirmed");
      assert.equal(imported.uncertain_attempt, true);
      assert.deepEqual(imported.body, prepared.body);
      assert.deepEqual(imported.original, prepared.original);
      assert.deepEqual(imported.owner, prepared.owner);
      await click(continuation, t.Load);
      await click(continuation, t.LoadRights);
      await until(
        `${buttons(continuation)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Prepare)})`
      );
      assert.equal(
        await evaluate(
          `${buttons(continuation)}.find(b=>b.textContent.trim()===${JSON.stringify(t.Prepare)}).disabled`
        ),
        true
      );
      assert.equal(
        calls.filter((c) => c.path === "/shop/learning/resources").length,
        importResourcesBefore
      );
      await inspectPanel(continuation, "en-US-fresh-import-still-pending");
      scenarios.push(
        "en-US: actual pre-dispatch download imported after clearing all session storage and re-proving the owner; exact409 plus empty export preserves the original pending command and blocks a new preparation"
      );
      await evaluate("document.querySelector('#learning-recovery').closest('details').open=true");
      await enter("#learning-recovery", learningFile);
      await click(learning, learn.Restore);
      await evaluate(
        `document.querySelector(${JSON.stringify(learning + ' > label input[type="checkbox"]')}).click()`
      );
      await click(learning, learn.Issue);
      await until(`!!document.querySelector(${JSON.stringify(courses)})`);
      assert.deepEqual(
        JSON.parse(learningFile).body,
        (
          await evaluate(
            "JSON.parse(sessionStorage.getItem('commercial-learning-refresh-v1')).at(-1).record"
          )
        ).body
      );
      learningSaved = await evaluate("sessionStorage.getItem('commercial-learning-refresh-v1')");
      await evaluate(
        `(() => { const box = document.querySelector(${JSON.stringify(continuation + ' input[type="checkbox"]')}); if (!box.checked) box.click(); })()`
      );
      courseFault = "after";
      await click(continuation, t.Retry);
      scenarios.push(
        "en-US: the same original command recovers a later lost committed synthetic delivery reply; the separate learning request is explicitly restored unchanged"
      );
    } else await click(continuation, t.Continue);
    await until(
      `document.querySelector(${JSON.stringify(continuation)}).textContent.includes(${JSON.stringify(t.State.uncertain)})`
    );
    assert.equal(courseGrants.size, 1);
    assert.equal(courseReceipts.length, 1);
    assert.equal(
      await evaluate("sessionStorage.getItem('commercial-learning-refresh-v1')"),
      learningSaved
    );
    const grant = courseGrants.get(prepared.body.command_id);
    assert(grant);
    assert.equal(grant.state, "uncertain");
    if (importMode) {
      assert.deepEqual(
        calls
          .filter(
            (c) => c.path === "/shop/claims/recipient/course_successor" && c.method === "POST"
          )
          .map((c) => c.body),
        [prepared.body, prepared.body, prepared.body]
      );
      assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
      assert.deepEqual(blocked, []);
      assert.equal(await evaluate('document.cookie.includes("accessToken")'), false);
      await inspectPanel(continuation, "en-US-fresh-import-original-recovered");
      return;
    }
    await inspectPanel(continuation, `${language}-continuation-recorded`);
    await click(continuation, t.RefreshCourses);
    assert.equal(
      await evaluate("sessionStorage.getItem('commercial-learning-refresh-v1')"),
      learningSaved
    );
    await click(courses, viewer.List);
    await click(courses, data.title);
    await click(courses, "Local lecture");
    await until(`document.querySelector(${JSON.stringify(courses + " video")})?.readyState >= 2`);
    await evaluate(`document.querySelector(${JSON.stringify(courses + " video")}).play()`);
    await until(`document.querySelector(${JSON.stringify(courses + " video")})?.currentTime > .1`);
    const shot = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    await writeFile(
      join(evidence, `${language}-continued-course-playing.png`),
      Buffer.from(shot.data, "base64")
    );
    const puts = calls.filter((c) => c.method === "PUT").length;
    await click(courses, viewer.Complete);
    await until(
      `document.querySelector(${JSON.stringify(courses)}).textContent.includes(${JSON.stringify(viewer.Completed)})`
    );
    assert.equal(calls.filter((c) => c.method === "PUT").length, puts + 1);
    await click(courses, viewer.RefreshProgress);
    await click(courses, `Local lecture — ${viewer.Completed}`);
    await until(`!!document.querySelector(${JSON.stringify(courses + " video")})`);
    scenarios.push(
      `${language}: LastWatch-only original right is explicitly selected and saved; separate learning receipt survives preparation/reconciliation; protected list/details/valid MP4/progress are checked after synthetic delivery`
    );
    activeLearner = null;
    courseAvailable = false;
    grant.state = "withdrawn";
    await click(continuation, t.Load);
    await until(`!document.querySelector(${JSON.stringify(courses + " video")})`);
    assert.equal(
      await evaluate("sessionStorage.getItem('commercial-learning-refresh-v1')"),
      learningSaved
    );
    await click(continuation, t.Retry);
    await until(
      `document.querySelector(${JSON.stringify(continuation)}).textContent.includes(${JSON.stringify(t.HistoricalSuccess)})`
    );
    await evaluate(
      `[...document.querySelectorAll(${JSON.stringify(continuation + " details")})].find(d=>d.querySelector('summary')?.textContent.trim()===${JSON.stringify(t.Receipts)}).open=true`
    );
    await inspectPanel(continuation, `${language}-withdrawn-historical-receipts`);
    const withdrawnShot = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    await writeFile(
      join(evidence, `${language}-withdrawn-historical-receipts.png`),
      Buffer.from(withdrawnShot.data, "base64")
    );
    assert.equal(grant.state, "withdrawn");
    assert.equal(grant.result.state, "uncertain");
    assert.equal(courseReceipts.length, 2);
    assert.equal(courseReceipts.at(-1).receipt.state, "withdrawn");
    assert.equal(courseReceipts.at(-1).receipt.original_result.access_granted, true);
    await writeFile(
      join(evidence, `${language}-withdrawn-recovery.json`),
      JSON.stringify(
        await evaluate(
          "JSON.parse(sessionStorage.getItem('commercial-course-continuation-v1')).at(-1).record"
        ),
        null,
        2
      )
    );
    await click(courses, viewer.List);
    await until(`!document.querySelector(${JSON.stringify(courses)})`);
    assert(await evaluate(`!!document.querySelector(${JSON.stringify(continuation)})`));
    assert(
      await evaluate(
        `${buttons(continuation)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Retry)}&&!b.disabled)`
      )
    );
    assert.equal(await evaluate('document.querySelectorAll("video,iframe").length'), 0);
    assert.equal(courseGrants.size, 1);
    assert.equal(courseAvailable, false);
    const sent = calls.filter(
      (c) =>
        c.path === "/shop/claims/recipient/course_successor" &&
        c.method === "POST" &&
        c.body.command_id === prepared.body.command_id
    );
    assert(sent.every((c) => JSON.stringify(c.body) === JSON.stringify(prepared.body)));
    scenarios.push(
      `${language}: current withdrawal closes old media while preserving learning bytes; exact old-target replay retains uncertain grant result and separate late historical success; revoked learning401 removes resources without removing personal course recovery`
    );
  }
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
  assert.deepEqual(blocked, []);
  assert(!calls.some((c) => /purchase|offer|renewal|\/accept|\/auth\/users/.test(c.path)));
  assert.deepEqual(
    panelChecks.filter((s) => !s.valid),
    [],
    "Course actions and recovery fields retain readable keyboard focus"
  );
}

async function accessRouteJourneys() {
  const page = "main.moderation-page",
    passwordForm = page + " > form:first-of-type",
    caseForm = page + " > form:nth-of-type(2)";
  for (const language of ["en-US", "de"]) {
    const texts = JSON.parse(
      await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")
    );
    await cmd("Network.setCookie", { name: "locale", value: language, url: appUrl, path: "/" });
    await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
    await until(
      `document.querySelector(${JSON.stringify(page + " > h1")})?.textContent.trim()===${JSON.stringify(texts.Moderation.Title)}`
    );
    await until(`${buttons(page)}.some(el=>el.textContent.trim()==='Synthetic linked provider')`);
    assert.equal(
      await evaluate(
        `document.querySelectorAll(${JSON.stringify(page + " > section:not([aria-labelledby])")}).length`
      ),
      0
    );
    await inspectPanel(page, `${language}:normal`, true);
    await enter(passwordForm + " input[autocomplete=username]", "synthetic-route-user");
    await enter(passwordForm + " input[type=password]", "synthetic route password");
    await enter(passwordForm + " input[autocomplete=one-time-code]", "123456");
    await enter(passwordForm + " input[autocomplete=off]", "synthetic-route-recovery");
    await click(passwordForm, texts.Moderation.Prove);
    await until(`document.querySelector(${JSON.stringify(passwordForm + " fieldset")}).disabled`);
    assert(routeHeldPassword, "Real password handler reached the held synthetic API");
    assert.equal(
      await evaluate(`document.querySelector(${JSON.stringify(passwordForm + " input")}).disabled`),
      false
    );
    assert.equal(
      await evaluate(
        `document.querySelector(${JSON.stringify(passwordForm + " input")}).matches(':disabled')`
      ),
      true
    );
    await inspectPanel(page, `${language}:password-pending`, true);
    await fulfill(routeHeldPassword, { detail: "CaptchaRequired" }, 403);
    routeHeldPassword = null;
    await until(
      `${buttons(page)}.some(el=>el.textContent.trim()===${JSON.stringify(texts.Moderation.CaptchaProof)}&&!el.disabled)`
    );
    await until(
      `document.querySelector(${JSON.stringify(page + ' > p[role="status"]')})?.textContent===${JSON.stringify(texts.Moderation.ProofFailed)}`
    );
    await inspectPanel(page, `${language}:conditional-proof`, true);
    assert.equal(
      await evaluate("[...document.scripts].some(s=>s.src.includes('recaptcha'))"),
      false
    );
    scenarios.push(
      `${language}: password/MFA/recovery inputs reach unchanged handler; pending fieldset disables controls; synthetic403 reveals readable CAPTCHA notice/privacy link/action without external script`
    );
    if (language === "de") {
      await evaluate(`document.querySelector(${JSON.stringify(caseForm + " select")}).focus()`);
      await cmd("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "ArrowDown",
        code: "ArrowDown",
        windowsVirtualKeyCode: 40,
      });
      await cmd("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "ArrowDown",
        code: "ArrowDown",
        windowsVirtualKeyCode: 40,
      });
    }
    const source = language === "de" ? "challenges" : "backend";
    assert.equal(
      await evaluate(`document.querySelector(${JSON.stringify(caseForm + " select")}).value`),
      source
    );
    await enter(caseForm + " input:not([type=email])", "70000000-0000-4000-8000-000000000001");
    await enter(caseForm + " input[type=email]", "synthetic-route@example.invalid");
    await click(caseForm, texts.Moderation.RequestAccess);
    await until(`document.querySelector(${JSON.stringify(caseForm + " button")}).disabled`);
    assert(routeHeldRecovery, "Real case-recovery handler reached the held synthetic API");
    assert.equal(
      calls.filter((c) => c.path === "/auth/moderation/access/recovery").at(-1).body.source,
      source
    );
    await inspectPanel(page, `${language}:case-recovery-pending`, true);
    await fulfill(routeHeldRecovery, { received: true });
    routeHeldRecovery = null;
    await until(
      `document.querySelector(${JSON.stringify(page + ' > p[role="status"]')})?.textContent===${JSON.stringify(texts.Moderation.RecoveryReceived)}`
    );
    await inspectPanel(page, `${language}:case-recovery-confirmed`, true);
    assert.equal(
      await evaluate(
        `document.querySelector(${JSON.stringify(caseForm + " input[type=email]")}).value`
      ),
      "synthetic-route@example.invalid"
    );
    scenarios.push(
      `${language}: case source selection and original recovery body reach the unchanged handler; conditional OAuth action, links, enabled/disabled states and white fields measured`
    );
  }
  assert.equal(
    calls.filter((c) => c.path === "/auth/moderation/access/password" && c.method === "POST")
      .length,
    2
  );
  assert.equal(
    calls.filter((c) => c.path === "/auth/moderation/access/recovery" && c.method === "POST")
      .length,
    2
  );
  assert(
    calls.every((c) =>
      [
        "/auth/oauth/providers",
        "/auth/moderation/access/password",
        "/auth/moderation/access/recovery",
      ].includes(c.path)
    )
  );
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
  assert.equal(blocked.length, 0, JSON.stringify(blocked));
  assert.deepEqual(
    panelChecks.filter((sample) => !sample.valid),
    [],
    "Route text, enabled controls and keyboard focus must be readable; inherited disabled controls remain unavailable"
  );
}

async function guardedStartJourneys() {
  await cmd("Network.setCookie", { name: "locale", value: "en-US", url: appUrl, path: "/" });
  await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
  await until('!!document.querySelector("#commercial-current-key")');
  for (const language of ["en-US", "de"]) {
    const texts = JSON.parse(
      await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")
    );
    const access = texts.ClaimAccess,
      learn = texts.LearningAccess;
    activeLearner = null;
    historicalLearners.clear();
    starts.clear();
    learningKey = null;
    receipt = null;
    activeClaim = claim;
    foreignProof = false;
    deny = false;
    await evaluate("sessionStorage.clear()");
    await cmd("Network.setCookie", { name: "locale", value: language, url: appUrl, path: "/" });
    await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
    await until('!!document.querySelector("#commercial-current-key")');
    await until(
      `${buttons(rights)}.some(el=>el.textContent.trim()===${JSON.stringify(access.ImportKey)}&&!el.disabled)`
    );
    await inspectPanel(rights, `${language}-creation-key-entry`);
    await evaluate(`document.querySelector(${JSON.stringify(rights + " > details")}).open=true`);
    await inspectPanel(rights, `${language}-commercial-white-recovery`);
    await evaluate(`document.querySelector(${JSON.stringify(rights + " > details")}).open=false`);
    await enter("#commercial-current-key", claim);
    await click(rights, access.ImportKey);
    await until(`!!document.querySelector(${JSON.stringify(learning)})`);
    assert.equal(starts.size, 0);
    assert.equal(
      await evaluate(
        `${buttons(learning)}.some(el=>el.textContent.trim()===${JSON.stringify(learn.PrepareStart)})`
      ),
      false
    );
    await inspectPanel(records, `${language}-original-statement-white-input`);
    await click(learning, learn.Find);
    assert.equal(starts.size, 0);
    await click(learning, learn.PrepareStart);
    await inspectPanel(learning, `${language}-creation-prepared`);
    assert(
      await evaluate(
        `${buttons(learning)}.find(el=>el.textContent.trim()===${JSON.stringify(learn.Create)}).disabled`
      )
    );
    await rm(join(fixture, "downloads", "bootstrap-learning-access.json"), { force: true });
    await click(learning, learn.Save);
    const saved = JSON.parse(await savedDownload("bootstrap-learning-access.json"));
    await writeFile(
      join(evidence, `${language}-prepared-start.json`),
      JSON.stringify(saved, null, 2)
    );
    assert.equal(saved.version, 2);
    assert.equal(saved.operation, "learning_start");
    assert.equal(saved.body.expected_no_active_subject, true);
    assert.equal(starts.size, 0);
    await evaluate(
      `document.querySelector(${JSON.stringify(learning + ' input[type="checkbox"]')}).click()`
    );
    await inspectPanel(learning, `${language}-creation-enabled`);
    loseStart = language === "en-US";
    await click(learning, learn.Create);
    if (language === "en-US") {
      await until(
        `${buttons(learning)}.some(el=>el.textContent.trim()===${JSON.stringify(learn.Retry)}&&!el.disabled)`
      );
      assert.equal(starts.size, 1);
      await cmd("Page.reload", { ignoreCache: true });
      await until(`!!document.querySelector(${JSON.stringify(learning)})`);
      await until(
        `${buttons(learning)}.some(el=>el.textContent.trim()===${JSON.stringify(learn.Retry)})`
      );
      assert(!(await evaluate(`!!document.querySelector(${JSON.stringify(courses)})`)));
      await evaluate(
        `document.querySelector(${JSON.stringify(learning + " > details")}).open=true`
      );
      await inspectPanel(learning, `${language}-creation-recovery-white-input`);
      await enter("#learning-recovery", JSON.stringify(saved));
      await click(learning, learn.Restore);
      await evaluate(
        `document.querySelector(${JSON.stringify(learning + ' input[type="checkbox"]')}).click()`
      );
      // Imported prepared bytes keep their creation operation and exact key/body.
      await click(learning, learn.Create);
      scenarios.push(
        `${language}: lost committed synthetic creation reply, actual reload and saved-file import, exact original operation/key retry`
      );
    }
    await until(`!!document.querySelector(${JSON.stringify(courses)})`);
    await inspectPanel(learning, `${language}-creation-current-resources`);
    assert.equal(starts.size, 1);
    const original = structuredClone(receipt);
    assert.equal(receipt.subject, activeLearner);
    await click(courses, texts.RetainedCourses.List);
    await click(courses, "Synthetic arithmetic");
    await click(courses, "Local lecture");
    await until(`document.querySelector(${JSON.stringify(courses + " video")})?.readyState>=2`);
    await evaluate(`document.querySelector(${JSON.stringify(courses + " video")}).play()`);
    await until(`document.querySelector(${JSON.stringify(courses + " video")})?.currentTime>.1`);
    const shot = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    await writeFile(
      join(evidence, `${language}-created-access-player.png`),
      Buffer.from(shot.data, "base64")
    );
    scenarios.push(
      `${language}: explicit empty-summary choice, actual recovery download and acknowledgment, guarded synthetic creation, current resources and existing protected viewer/MP4`
    );
    activeLearner = randomUUID();
    historicalLearners.add(activeLearner);
    await click(learning, learn.Find);
    await until(`!document.querySelector(${JSON.stringify(courses)})`);
    assert.equal(await evaluate('document.querySelectorAll("video,iframe").length'), 0);
    await click(learning, learn.Retry);
    await until(`!document.querySelector(${JSON.stringify(courses)})`);
    await until(
      `document.querySelector(${JSON.stringify(learning)}).textContent.includes(${JSON.stringify(learn.Expired)})`
    );
    assert.equal(await evaluate('document.querySelectorAll("video,iframe").length'), 0);
    assert.deepEqual(receipt, original);
    assert.equal(starts.size, 1);
    scenarios.push(
      `${language}: exact historical start receipt after erased/replaced access keeps original subject/expiry and removes current media`
    );
    activeLearner = null;
    await click(learning, learn.Find);
    await click(learning, learn.PrepareStart);
    await rm(join(fixture, "downloads", "bootstrap-learning-access.json"), { force: true });
    await click(learning, learn.Save);
    const refused = JSON.parse(await savedDownload("bootstrap-learning-access.json"));
    await writeFile(
      join(evidence, `${language}-refused-start.json`),
      JSON.stringify(refused, null, 2)
    );
    const intervening = randomUUID();
    activeLearner = intervening;
    historicalLearners.add(intervening);
    await evaluate(
      `document.querySelector(${JSON.stringify(learning + ' input[type="checkbox"]')}).click()`
    );
    await click(learning, learn.Create);
    await until(
      `document.querySelector(${JSON.stringify(learning)}).textContent.includes(${JSON.stringify(learn.StartRefused)})`
    );
    assert.equal(starts.size, 1);
    assert(!(await evaluate(`!!document.querySelector(${JSON.stringify(courses)})`)));
    const old = await evaluate(
      `JSON.parse(sessionStorage.getItem('commercial-learning-start-v1')).find(row=>row.record.body.command_id===${JSON.stringify(refused.body.command_id)}).record`
    );
    assert.equal(old.state, "refused");
    assert.deepEqual(old.body, refused.body);
    const priorRefreshes = calls.filter(
      (call) => call.path.endsWith("/learning_access") && call.method === "POST"
    ).length;
    await click(learning, learn.Find);
    await click(learning, learn.Prepare);
    assert.equal(
      calls.filter((call) => call.path.endsWith("/learning_access") && call.method === "POST")
        .length,
      priorRefreshes
    );
    await rm(join(fixture, "downloads", "bootstrap-learning-access.json"), { force: true });
    await click(learning, learn.Save);
    const refresh = JSON.parse(await savedDownload("bootstrap-learning-access.json"));
    await writeFile(
      join(evidence, `${language}-explicit-v1-refresh.json`),
      JSON.stringify(refresh, null, 2)
    );
    assert.equal(refresh.version, 1);
    assert.equal(refresh.body.expected_subject, intervening);
    assert.notEqual(refresh.body.command_id, refused.body.command_id);
    await evaluate(
      `document.querySelector(${JSON.stringify(learning + ' input[type="checkbox"]')}).click()`
    );
    await click(learning, learn.Issue);
    await until(`!!document.querySelector(${JSON.stringify(courses)})`);
    assert.equal(receipt.subject, intervening);
    scenarios.push(
      `${language}: intervening active access refuses unchanged saved start; only explicit separate selection prepares and submits a v1 same-subject refresh`
    );
    await click(learning, learn.Prepare);
    await rm(join(fixture, "downloads", "bootstrap-learning-access.json"), { force: true });
    await click(learning, learn.Save);
    const obsolete = JSON.parse(await savedDownload("bootstrap-learning-access.json"));
    await writeFile(
      join(evidence, `${language}-obsolete-v1-refresh.json`),
      JSON.stringify(obsolete, null, 2)
    );
    activeLearner = null;
    loseRefresh = true;
    await evaluate(
      `document.querySelector(${JSON.stringify(learning + ' input[type="checkbox"]')}).click()`
    );
    await click(learning, learn.Issue);
    await until(
      `${buttons(learning)}.some(el=>el.textContent.trim()===${JSON.stringify(learn.Retry)}&&!el.disabled)`
    );
    await click(learning, learn.Find);
    assert.equal(
      await evaluate(
        `${buttons(learning)}.some(el=>el.textContent.trim()===${JSON.stringify(learn.PrepareStart)})`
      ),
      false
    );
    await click(learning, learn.Retry);
    await until(
      `document.querySelector(${JSON.stringify(learning)}).textContent.includes(${JSON.stringify(learn.RefreshRefused)})`
    );
    const retainedV1 = await evaluate(
      `JSON.parse(sessionStorage.getItem('commercial-learning-refresh-v1')).find(row=>row.record.body.command_id===${JSON.stringify(obsolete.body.command_id)}).record`
    );
    assert.equal(retainedV1.version, 1);
    assert.equal(retainedV1.state, "refused");
    assert.deepEqual(retainedV1.body, obsolete.body);
    await click(learning, learn.Find);
    await click(learning, learn.PrepareStart);
    await rm(join(fixture, "downloads", "bootstrap-learning-access.json"), { force: true });
    await click(learning, learn.Save);
    const separate = JSON.parse(await savedDownload("bootstrap-learning-access.json"));
    await writeFile(
      join(evidence, `${language}-explicit-start-after-v1-refusal.json`),
      JSON.stringify(separate, null, 2)
    );
    assert.equal(separate.operation, "learning_start");
    assert.notEqual(separate.body.command_id, obsolete.body.command_id);
    await evaluate(
      `document.querySelector(${JSON.stringify(learning + ' input[type="checkbox"]')}).click()`
    );
    await click(learning, learn.Create);
    await until(`!!document.querySelector(${JSON.stringify(courses)})`);
    assert.equal(starts.size, 2);
    scenarios.push(
      `${language}: unknown v1 refresh outcome blocks creation; exact retry refuses erased target, preserves old v1 body, and explicit new guarded creation succeeds`
    );
    assert.equal(await evaluate('document.cookie.includes("accessToken")'), false);
  }
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
  assert(
    !calls.some((call) =>
      /offer|purchase_authorize|\/accept|\/auth\/users|\/recipient\/elect|learning_revoke/.test(
        call.path
      )
    )
  );
  assert.deepEqual(
    panelChecks.filter((sample) => !sample.valid),
    []
  );
}

async function originalDocumentJourneys() {
  await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
  await until('!!document.querySelector("#commercial-current-key")');
  const pick = async (id, value) => {
    await evaluate(
      `(()=>{const el=document.getElementById(${JSON.stringify(id)});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`
    );
  };
  for (const language of ["en-US", "de"]) {
    const texts = JSON.parse(
        await readFile(new URL(`../locales/${language}.json`, import.meta.url), "utf8")
      ),
      t = texts.Originals;
    openCaseExists = false;
    originalOrdinary = false;
    for (const name of [
      `bootstrap-purchase-${originalOrder}-confirmation.txt`,
      "bootstrap-invoice-10000000-original.pdf",
    ])
      await rm(join(fixture, "downloads", name), { force: true });
    await cmd("Network.deleteCookies", { name: "accessToken", url: appUrl });
    await cmd("Network.deleteCookies", { name: "user", url: appUrl });
    originalFault = "";
    activeClaim = claim;
    accessEpoch = 1;
    loseRotation = false;
    rotations.clear();
    await evaluate("sessionStorage.clear()");
    await cmd("Network.setCookie", { name: "locale", value: language, url: appUrl, path: "/" });
    await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
    await until('!!document.querySelector("#commercial-current-key")');
    assert.equal(
      await evaluate(
        `${buttons(originalPanel)}.some(b=>b.textContent.trim()===${JSON.stringify(t.Ordinary)})`
      ),
      false
    );
    const form = "main > form:first-of-type";
    await enter(form + " input[autocomplete=username]", "synthetic-original-user");
    await enter(form + " input[type=password]", "synthetic case password");
    await enter(form + " input[autocomplete=one-time-code]", "123456");
    await click(form, texts.Moderation.Prove);
    await until(
      `location.pathname==='/moderation' && !!document.querySelector(${JSON.stringify(originalPanel)})`
    );
    await until(
      `${buttons(rights)}.some(b=>b.textContent.trim()===${JSON.stringify(texts.ClaimAccess.UseProof)})`
    );
    assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(records)}).length`), 1);
    const before = calls.length,
      storage = await evaluate("JSON.stringify(Object.entries(sessionStorage).sort())");
    await click(originalPanel, t.Load);
    await until('!!document.querySelector("#original-document-record")');
    assert.equal(await evaluate("JSON.stringify(Object.entries(sessionStorage).sort())"), storage);
    assert(!calls.slice(before).some((c) => c.method === "POST"));
    assert(!calls.slice(before).some((c) => c.path.endsWith("/export")));
    await pick("original-document-record", "0");
    await click(originalPanel, t.Status);
    await until('!!document.querySelector("#original-order-status-title")');
    assert(
      (
        await evaluate(`document.querySelector(${JSON.stringify(originalPanel)}).textContent`)
      ).includes(subject)
    );
    await pick("original-document-artifact", "withdrawal");
    assert.equal(
      await evaluate(
        `${buttons(originalPanel)}.find(b=>b.textContent.trim()===${JSON.stringify(t.Download)}).disabled`
      ),
      true
    );
    await pick("original-document-artifact", "confirmation");
    await click(originalPanel, t.Download);
    const textName = `bootstrap-purchase-${originalOrder}-confirmation.txt`;
    assert.equal(
      await savedDownload(textName),
      "original\r\nconfirmation".replaceAll("\\r", "\r").replaceAll("\\n", "\n")
    );
    await inspectPanel(originalPanel, `${language}:no-case-originals`);
    scenarios.push(
      `${language}: actual password/MFA proof to no-case rights entry, one originals panel despite showRecords=false; explicit GET-only read without case binding/storage change, nullable status, unavailable artifact and exact text download`
    );
    // An existing case/erased original learning owner is separately supplied by
    // this intercepted fixture; no creation mutation is used by the reader.
    openCaseExists = true;
    await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
    await until('!!document.querySelector("#commercial-current-key")');
    await enter("#commercial-current-key", claim);
    await click(rights, texts.ClaimAccess.ImportKey);
    await until(`!!document.querySelector(${JSON.stringify(learning)})`);
    await click(originalPanel, t.Load);
    await until('!!document.querySelector("#original-document-record")');
    await pick("original-document-record", "0");
    await click(originalPanel, t.Status);
    await until('!!document.querySelector("#original-order-status-title")');
    assert(
      (
        await evaluate(`document.querySelector(${JSON.stringify(originalPanel)}).textContent`)
      ).includes(learner)
    );
    await pick("original-document-record", "1");
    await pick("original-document-artifact", "original");
    await click(originalPanel, t.Download);
    assert.equal(
      await savedDownload("bootstrap-invoice-10000000-original.pdf"),
      "%PDF exact synthetic original bytes"
    );
    // A late selected document cannot click a newly selected tuple.
    originalFault = "held";
    await click(originalPanel, t.Download);
    for (let i = 0; !originalHeld; i++) {
      assert(i < 500);
      await delay(10);
    }
    await pick("original-document-artifact", "");
    await pick("original-document-artifact", "original");
    const downloadsBefore = await evaluate("window.__originalDownloads||0");
    await fulfill(originalHeld, "%PDF stale", 200, "application/pdf");
    originalHeld = null;
    originalFault = "";
    await delay(80);
    assert.equal(await evaluate("window.__originalDownloads||0"), downloadsBefore);
    originalFault = "document503";
    await click(originalPanel, t.Download);
    await until(
      `document.querySelector(${JSON.stringify(originalPanel)}).textContent.includes(${JSON.stringify(t.DocumentFailed)})`
    );
    assert(await evaluate(`!!document.querySelector(${JSON.stringify(learning)})`));
    originalFault = "inventory503";
    await click(originalPanel, t.Load);
    await until(
      `document.querySelector(${JSON.stringify(originalPanel)}).textContent.includes(${JSON.stringify(t.ReadFailed)})`
    );
    await enter("#original-order-id", originalOrder);
    await click(originalPanel, t.Status);
    await until('!!document.querySelector("#original-order-status-title")');
    originalFault = "";
    await click(originalPanel, t.Load);
    await until('!!document.querySelector("#original-document-record")');
    // Existing key rotation remains a deliberate separate action. Preserve its
    // exact saved command when the read credential is subsequently rejected.
    await click(rights, texts.ClaimAccess.Prepare);
    await until("!!sessionStorage.getItem('commercial-access-rotations-v1')");
    const saved = await evaluate("sessionStorage.getItem('commercial-access-rotations-v1')");
    assert(saved);
    await pick("original-document-record", "1");
    await pick("original-document-artifact", "original");
    originalFault = cfb1Mode ? "native-held" : "held";
    if (cfb1Mode)
      planDenial(
        "/shop/claims/documents/invoice/10000000/original",
        "x-commercial-claim-key",
        claim
      );
    await click(originalPanel, t.Download);
    for (let i = 0; cfb1Mode ? !directPlan.flush : !originalHeld; i++) {
      assert(i < 500);
      await delay(10);
    }
    await pick("original-document-artifact", "");
    if (cfb1Mode) await flushPlannedDenial();
    else await fulfill(originalHeld, {}, 401);
    originalHeld = null;
    await until(`!document.querySelector(${JSON.stringify(learning)})`);
    if (cfb1Mode) {
      await finishPlannedDenial();
      scenarios.push(
        `${language}: native original-document401 headers clear matching parent after selection change before any response body bytes`
      );
    }
    assert.equal(await evaluate("sessionStorage.getItem('commercial-access-rotations-v1')"), saved);
    assert.equal(await evaluate('!!document.querySelector("#original-order-status-title")'), false);
    scenarios.push(
      `${language}: public claim entry reads exact erased-S order and long invoice, suppresses held selection changes, preserves parent on503 and permits known-UUID recovery; matched401 removes parent learning/status while original saved rotation bytes survive`
    );
    const shot = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(join(evidence, `originals-${language}.png`), Buffer.from(shot.data, "base64"));
    // Explicit compatibility reads use the real session-cookie bootstrap, with
    // an intercepted synthetic current profile and rights inbox.
    originalFault = "";
    originalOrdinary = true;
    await evaluate("sessionStorage.clear()");
    await cmd("Network.setCookie", {
      name: "accessToken",
      value: originalBearer,
      url: appUrl,
      path: "/",
    });
    await cmd("Network.setCookie", {
      name: "user",
      value: encodeURIComponent(
        JSON.stringify({
          id: subject,
          name: "synthetic-original-owner",
          display_name: "Synthetic original owner",
        })
      ),
      url: appUrl,
      path: "/",
    });
    await cmd("Page.navigate", { url: appUrl + "/moderation" });
    await until(`!!document.querySelector(${JSON.stringify(originalPanel)})`);
    const ordinaryBefore = calls.length;
    await click(originalPanel, t.Load);
    await until(
      `document.querySelector(${JSON.stringify(originalPanel)}).textContent.includes(${JSON.stringify(t.ProofRequired)})`
    );
    assert.equal(
      calls.slice(ordinaryBefore).filter((c) => c.path === "/shop/claims/documents").length,
      0
    );
    await click(originalPanel, t.Ordinary);
    await until('!!document.querySelector("#original-document-record")');
    assert.equal(
      calls.findLast((c) => c.path === "/shop/claims/documents").headers.authorization,
      `Bearer ${originalBearer}`
    );
    originalFault = "401";
    await click(originalPanel, t.Ordinary);
    await until(`!document.querySelector(${JSON.stringify(originalPanel)})`);
    assert.equal(
      await evaluate(
        `document.cookie.includes(${JSON.stringify("accessToken=" + originalBearer)})`
      ),
      true
    );
    scenarios.push(
      `${language}: actual ordinary session bootstrap requires explicit read choice; selected401 clears rights views without ordinary logout or credential fallback`
    );
    await cmd("Network.deleteCookies", { name: "accessToken", url: appUrl });
    await cmd("Network.deleteCookies", { name: "user", url: appUrl });
  }
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
  assert.deepEqual(
    panelChecks.filter((s) => !s.valid),
    []
  );
}

try {
  if (cfb1Mode) {
    apiServer = createHttpServer((request, response) => {
      const plan = directPlan;
      if (
        !plan ||
        request.method !== "GET" ||
        request.url !== plan.path ||
        request.headers[plan.header] !== plan.proof
      ) {
        blocked.push(`unexpected direct fixture ${request.method} ${request.url}`);
        response.writeHead(599);
        response.end();
        return;
      }
      const record = {
        method: request.method,
        path: request.url,
        status: 401,
        headersFlushed: false,
        bodyBytes: 0,
        closed: false,
      };
      directRequests.push(record);
      plan.record = record;
      response.once("close", () => {
        record.closed = true;
      });
      plan.flush = () => {
        response.writeHead(401, {
          "Access-Control-Allow-Origin": appUrl,
          "Content-Type": "application/json",
          "Content-Length": "1000000",
          "Cache-Control": "no-store",
        });
        response.flushHeaders();
        record.headersFlushed = true;
      };
    });
    await new Promise((resolve, reject) => {
      apiServer.once("error", reject);
      apiServer.listen(56841, "127.0.0.1", resolve);
    });
  }
  const server = owned(
    process.execPath,
    [
      cfb1Mode
        ? join(process.env.TEST_BUILD_ROOT, ".output/server/index.mjs")
        : ".output/server/index.mjs",
    ],
    {
      ...process.env,
      NITRO_HOST: "127.0.0.1",
      NITRO_PORT: "56840",
      NUXT_PUBLIC_BASE_API_URL: apiUrl,
      NUXT_PUBLIC_BASE_WEB_URL: appUrl,
    }
  );
  const profile = join(fixture, "chrome");
  await mkdir(profile);
  const browser = owned("/run/current-system/sw/bin/chromium", [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-domain-reliability",
    "--disable-sync",
    "--no-first-run",
    "--no-default-browser-check",
    "--metrics-recording-only",
    "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ]);
  await writeFile(
    join(evidence, "ownership.json"),
    JSON.stringify(
      {
        fixture,
        appUrl,
        apiUrl,
        server: server.pid,
        browser: browser.pid,
        profile,
        media_sha256: createHash("sha256").update(media).digest("hex"),
      },
      null,
      2
    )
  );
  let port;
  for (let i = 0; i < 300; i++) {
    try {
      port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]);
      break;
    } catch {
      assert.equal(browser.exitCode, null, "Chromium exited");
      await delay(30);
    }
  }
  assert(port);
  let ready = false;
  for (let i = 0; i < 300; i++) {
    try {
      ready = (await fetch(appUrl)).ok;
      if (ready) break;
    } catch {}
    assert.equal(server.exitCode, null, "Frontend exited");
    await delay(30);
  }
  assert(ready);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter?.reject(message.error);
      else waiter?.resolve(message.result);
    } else if (message.method === "Fetch.requestPaused")
      intercept(message.params).catch((error) => {
        exceptions.push(String(error));
        cmd("Fetch.failRequest", {
          requestId: message.params.requestId,
          errorReason: "Failed",
        }).catch(() => {});
      });
    else if (message.method === "Runtime.exceptionThrown")
      exceptions.push(message.params.exceptionDetails);
  };
  await cmd("Runtime.enable");
  await cmd("Network.enable");
  await cmd("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  await cmd("Page.enable");
  await mkdir(join(fixture, "downloads"));
  await cmd("Page.addScriptToEvaluateOnNewDocument", {
    source:
      "(()=>{const original=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download)window.__originalDownloads=(window.__originalDownloads||0)+1;return original.call(this)}})()",
  });
  await cmd("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: join(fixture, "downloads"),
  });
  if (originalsMode) {
    await originalDocumentJourneys();
  } else if (premiumMode) {
    await premiumContinuationJourneys();
  } else if (openMode) {
    await caseOpeningJourneys();
  } else if (continuationMode) {
    await courseContinuationJourneys();
  } else if (routeMode) {
    await accessRouteJourneys();
  } else if (startMode) {
    await guardedStartJourneys();
  } else {
    await cmd("Network.setCookie", { name: "locale", value: "en-US", url: appUrl, path: "/" });
    await cmd("Page.navigate", { url: appUrl + "/moderation/access" });
    await until('!!document.querySelector("#commercial-current-key")');
    assert.equal(await evaluate('document.cookie.includes("accessToken")'), false);
    await until(`${buttons(rights)}.some(b=>b.textContent.trim()==='Use key'&&!b.disabled)`);
    await inspectPanel(rights, "key-entry");
    await enter("#commercial-current-key", claim);
    await click(rights, "Use key");
    await until(
      `${buttons(rights)}.some(b=>b.textContent.trim()==='Prepare a new key'&&!b.disabled)`
    );
    await inspectPanel(rights, "owner-bound");
    await click(rights, "Prepare a new key");
    await inspectPanel(rights, "rotation-prepared");
    await click(rights, "Save key and recovery material");
    const rotationFile = await savedDownload("bootstrap-commercial-access.json");
    const originalRotation = JSON.parse(rotationFile);
    await evaluate(
      `document.querySelector(${JSON.stringify(rights + ' > div input[type="checkbox"]')}).click()`
    );
    await inspectPanel(rights, "rotation-enabled");
    await click(rights, "Replace key now");
    await until(
      `${buttons(rights)}.some(b=>b.textContent.trim()==='Check this replacement again'&&!b.disabled)`
    );
    await inspectPanel(rights, "rotation-uncertain");
    await click(rights, "Close view");
    await evaluate(`document.querySelector(${JSON.stringify(rights + " > details")}).open=true`);
    await inspectPanel(rights, "rotation-import");
    await enter("#commercial-recovery", rotationFile);
    await click(rights, "Open saved recovery material");
    await until(
      `${buttons(rights)}.some(b=>b.textContent.trim()==='Check this replacement again')`
    );
    await evaluate(
      `document.querySelector(${JSON.stringify(rights + ' > div input[type="checkbox"]')}).click()`
    );
    await until(
      `${buttons(rights)}.some(b=>b.textContent.trim()==='Check this replacement again'&&!b.disabled)`
    );
    await click(rights, "Check this replacement again");
    await until(
      `document.querySelector(${JSON.stringify(rights)}).textContent.includes('The new key was checked and is currently valid')`
    );
    assert.equal(rotations.size, 1);
    const rotationCalls = calls.filter(
      (c) => c.path === "/shop/claims/recipient/access" && c.method === "POST"
    );
    assert.equal(rotationCalls.length, 2);
    assert.deepEqual(
      rotationCalls.map((c) => c.body),
      [originalRotation.body, originalRotation.body]
    );
    scenarios.push(
      "Typed claim key; actual recovery download; lost synthetic rotation reply; imported saved material and exact replacement retry"
    );
    await inspectPanel(records, "records-empty-number");
    await click(records, "Load recorded information");
    await enter("#commercial-statement-number", "S123");
    await inspectPanel(records, "records-valid-number");
    await click(records, "Download the original final statement");
    assert.match(await savedDownload("final-statement-S123.pdf"), /^%PDF-1.4/);
    scenarios.push(
      "Recorded information and valid statement number retrieve the intercepted original PDF with current claim proof"
    );
    await inspectPanel(learning, "learning-summary");
    await click(learning, "Show existing learning space");
    await inspectPanel(learning, "learning-selected");
    await click(learning, "Prepare learning key");
    await inspectPanel(learning, "learning-prepared");
    await click(learning, "Save learning key and request");
    const learningFile = await savedDownload("bootstrap-learning-access.json");
    await evaluate(`document.querySelector(${JSON.stringify(learning + " > details")}).open=true`);
    await inspectPanel(learning, "learning-import");
    await enter("#learning-recovery", learningFile);
    await click(learning, "Open saved learning request");
    await evaluate(
      `document.querySelector(${JSON.stringify(learning + ' input[type="checkbox"]')}).click()`
    );
    await inspectPanel(learning, "learning-enabled");
    await click(learning, "Refresh this learning access");
    await until(`!!document.querySelector(${JSON.stringify(courses)})`);
    await inspectPanel(learning, "learning-available");
    await click(learning, "Check resources again");
    const originalExpiry = receipt.expires_at;
    await click(learning, "Continue the saved learning request");
    await until(`!!document.querySelector(${JSON.stringify(courses)})`);
    assert.equal(receipt.expires_at, originalExpiry);
    const refreshCalls = calls.filter(
      (c) => c.path === "/shop/claims/recipient/learning_access" && c.method === "POST"
    );
    assert.deepEqual(
      refreshCalls.map((c) => c.body),
      [JSON.parse(learningFile).body, JSON.parse(learningFile).body]
    );
    scenarios.push(
      "Saved learning file imports and repeats its exact refresh request; resources are reread without changing the fixture's original expiration"
    );
    assert.match(
      await evaluate(`document.querySelector(${JSON.stringify(learning)}).textContent`),
      /Paid premium period active:\s*Yes/
    );
    scenarios.push(
      "No ordinary account; actual rights/learning UI refresh and non-null active Premium resource period"
    );
    await checkControl("Show available courses", "list");
    await click(courses, "Show available courses");
    await click(courses, "Synthetic arithmetic");
    // Native keyboard activation of the selected lesson button.
    await until(
      `${buttons(courses)}.some(b=>b.textContent.trim()==='Local lecture' && !b.disabled)`
    );
    assert.equal(
      await evaluate(
        'document.querySelectorAll("[aria-labelledby=retained-course-title] > p").length'
      ),
      0
    );
    await evaluate(`${buttons(courses)}.find(b=>b.textContent.trim()==='Local lecture').focus()`);
    assert.equal(await evaluate("document.activeElement.textContent.trim()"), "Local lecture");
    await cmd("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Enter",
      code: "Enter",
      text: "\r",
      windowsVirtualKeyCode: 13,
    });
    await cmd("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
    });
    await until(`document.querySelector(${JSON.stringify(courses + " video")})?.readyState >= 2`);
    await evaluate(`document.querySelector(${JSON.stringify(courses + " video")}).play()`);
    await until(`document.querySelector(${JSON.stringify(courses + " video")})?.currentTime > .1`);
    const playing = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    await writeFile(join(evidence, "course-playing.png"), Buffer.from(playing.data, "base64"));
    scenarios.push(
      "Protected course read; keyboard lecture opening; intercepted valid MP4 loads and plays"
    );
    await checkControl("Mark this lecture as completed", "completion");
    await checkControl("Check lecture progress again", "progress");
    await click(courses, "Check lecture progress again");
    await checkControl("Reload video", "reload");
    await click(courses, "Reload video");
    const puts = calls.filter((c) => c.method === "PUT").length;
    loseCompletion = true;
    await click(courses, "Mark this lecture as completed");
    await until(
      `document.querySelector(${JSON.stringify(courses)}).textContent.includes('Completed') && !document.querySelector(${JSON.stringify(courses + " video")})`
    );
    assert.equal(calls.filter((c) => c.method === "PUT").length, puts + 1);
    scenarios.push(
      "Lost committed completion response recovered by authoritative reread, exactly one PUT"
    );
    assert.equal(
      await evaluate(
        'document.querySelectorAll("[aria-labelledby=retained-course-title] > p").length'
      ),
      0
    );
    scenarios.push(
      "RC1 null description omitted through protected lecture selection and authoritative completion/progress rereads"
    );
    await click(courses, "YouTube lecture");
    assert.equal(
      await evaluate(`!!document.querySelector(${JSON.stringify(courses + " iframe")})`),
      false
    );
    assert.equal(calls.filter((c) => c.kind === "youtube").length, 0);
    const reads = calls.filter((c) => c.path === "/skills/learning/courses/arithmetic").length;
    await checkControl("Load video", "youtube");
    scenarios.push(
      "RC2 five standalone actions have measured readable text and visible contrasting keyboard focus"
    );
    await click(courses, "Load video");
    await until(`!!document.querySelector(${JSON.stringify(courses + " iframe")})`);
    assert.equal(
      calls.filter((c) => c.path === "/skills/learning/courses/arithmetic").length,
      reads + 1
    );
    scenarios.push(
      "YouTube stays unmounted until explicit click and renewed course-authority read; external player intercepted"
    );
    deny = true;
    if (cfb1Mode) planDenial("/skills/learning/course_access", "x-learning-key", learningKey);
    await click(courses, "Show available courses");
    if (cfb1Mode) {
      // The public list action already clears media. The denied status must
      // still remove the entire current course/resource view before body data.
      await until(`!!document.querySelector(${JSON.stringify(courses)})`);
      await flushPlannedDenial();
    }
    await until(`!document.querySelector(${JSON.stringify(courses)})`);
    if (cfb1Mode) {
      await finishPlannedDenial();
      scenarios.push(
        "Native learning401 headers remove the course/resource view before body data; the list action had already cleared media"
      );
    }
    assert.equal(await evaluate('document.querySelectorAll("video,iframe").length'), 0);
    assert(await evaluate('sessionStorage.getItem("commercial-learning-refresh-v1")'));
    assert(
      await evaluate(`!!${buttons(rights)}.find(b=>b.textContent.trim()==='Prepare a new key')`)
    );
    scenarios.push(
      "Learning 401 removes course/media while personal commercial proof and saved recovery remain"
    );
    deny = false;
    await click(learning, "Show existing learning space");
    await click(learning, "Prepare learning key");
    await evaluate(
      `document.querySelector(${JSON.stringify(learning + ' input[type="checkbox"]')}).click()`
    );
    await click(learning, "Refresh this learning access");
    await click(courses, "Show available courses");
    await click(courses, "Synthetic arithmetic");
    await click(courses, "Local lecture — Completed");
    await until(`!!document.querySelector(${JSON.stringify(courses + " video")})`);
    await click(rights, "Close view");
    await until(`!document.querySelector(${JSON.stringify(courses)})`);
    assert.equal(await evaluate('document.querySelectorAll("video,iframe").length'), 0);
    scenarios.push("Closing personal access disposes nested course player");
    assert.equal(await evaluate('document.cookie.includes("accessToken")'), false);
    assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
    assert(!calls.some((c) => /offer|purchase_authorize|\/accept|\/auth\/users/.test(c.path)));
    assert.deepEqual(
      panelChecks.filter((sample) => !sample.valid),
      [],
      "All measured access-panel labels, enabled controls and focus indicators must be readable"
    );
    scenarios.push(
      "Access-panel labels and enabled controls have measured contrast and keyboard focus; disabled controls remain unavailable and white inputs remain readable"
    );
  }
  passed = true;
  console.log(
    JSON.stringify(
      { passed, scenarios, contrastChecks, panelChecks, requests: calls.length, blocked },
      null,
      2
    )
  );
} finally {
  if (ws?.readyState === 1) {
    try {
      await writeFile(
        join(evidence, "final-dom.json"),
        JSON.stringify(
          await evaluate(
            '({text:document.body.innerText,active:document.activeElement?.outerHTML,media:[...document.querySelectorAll("video")].map(v=>({src:v.src,error:v.error?.message,readyState:v.readyState,currentTime:v.currentTime}))})'
          ),
          null,
          2
        )
      );
      const shot = await cmd("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      await writeFile(join(evidence, "browser.png"), Buffer.from(shot.data, "base64"));
    } catch (error) {
      await writeFile(join(evidence, "diagnostic-error.txt"), String(error));
    }
  }
  ws?.close();
  if (apiServer) {
    apiServer.closeAllConnections();
    await new Promise((resolve) => apiServer.close(resolve));
  }
  const cleanup = [];
  for (const entry of runtime.reverse()) {
    if (entry.child.exitCode === null) {
      entry.child.kill("SIGTERM");
      await Promise.race([once(entry.child, "exit"), delay(5000)]);
      if (entry.child.exitCode === null) {
        entry.child.kill("SIGKILL");
        await once(entry.child, "exit");
      }
    }
    cleanup.push({
      pid: entry.child.pid,
      exitCode: entry.child.exitCode,
      signal: entry.child.signalCode,
      command: entry.command,
      args: entry.args,
    });
    await writeFile(
      join(evidence, entry.command === process.execPath ? "frontend.log" : "chromium.log"),
      entry.log()
    );
  }
  await rm(fixture, { recursive: true, force: true });
  let portFree = false;
  try {
    await free(56840);
    if (cfb1Mode) await free(56841);
    portFree = true;
  } catch {}
  await writeFile(
    join(evidence, "results.json"),
    JSON.stringify(
      {
        passed,
        scenarios,
        calls,
        directRequests,
        contrastChecks,
        panelChecks,
        exceptions,
        blocked,
        cleanup,
        fixtureRemoved: true,
        portFree,
      },
      null,
      2
    )
  );
}
