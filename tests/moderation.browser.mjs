/** Actual mounted Nuxt recipient/admin pages; explicitly synthetic API boundary.
 * All external network is blocked. No production credentials or customer data. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const app = "http://127.0.0.1:55909",
  admin = "http://127.0.0.1:55910",
  api = "http://127.0.0.1:55912";
const targets = await (await fetch("http://127.0.0.1:55911/json/list")).json();
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pending = new Map(),
  exceptions = [],
  requests = [],
  held = [];
const uid = "11000000-0000-4000-8000-000000000001",
  otherUid = "11000000-0000-4000-8000-000000000002";
const caseA = "22000000-0000-4000-8000-000000000001",
  caseB = "22000000-0000-4000-8000-000000000002";
const messages = [caseA, caseB].map((id, i) => ({
  id: `33000000-0000-4000-8000-00000000000${i + 1}`,
  case_id: id,
  decision_id: `44000000-0000-4000-8000-00000000000${i + 1}`,
  audience: "author",
  statement: {
    outcome: "restrict",
    rationale: `Synthetic reason ${i ? "B" : "A"}`,
    ground: "Synthetic verified ground",
    rule_version: "Synthetic immutable version",
    scope: "Synthetic exact task scope",
    automation: "Human synthetic decision",
    redress: "Six calendar months human review",
  },
  effective: { enabled: false, withdrawn: false },
  content: { text: "Synthetic task" },
  current: true,
  available_at: "2026-09-08T00:00:00Z",
  informed_at: null,
  complaint_until: null,
}));
const user = {
  id: otherUid,
  name: "browser_b",
  display_name: "Synthetic B",
  email: "browser-b@example.invalid",
  email_verified: true,
  admin: true,
  enabled: true,
  terms_version: "2026-09-r1",
  age_confirmed: true,
};
let dropReport = false;
let holdOAuth = false,
  captchaRequired = false,
  captchaLoads = 0;
let holdComplaint = false,
  dropComplaint = false,
  holdPassword = false,
  failInbox = false,
  holdChallengeCase = false,
  holdChallengeQueue = false;
function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function fulfill(requestId, status, data) {
  return cmd("Fetch.fulfillRequest", {
    requestId,
    responseCode: status,
    responseHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "Access-Control-Allow-Origin", value: "*" },
      { name: "Access-Control-Allow-Headers", value: "*" },
      { name: "Access-Control-Allow-Methods", value: "*" },
    ],
    body: Buffer.from(JSON.stringify(data)).toString("base64"),
  });
}
function record(id, owner) {
  return {
    id,
    target_kind: owner === "backend" ? "account" : "subtask",
    target_id: owner === "backend" ? otherUid : uid,
    subject: owner === "backend" ? otherUid : uid,
    source: "own_review",
    revision: 0,
    private_evidence: {},
    decisions: [],
    complaints: [],
    escalations: [],
    effective: { enabled: false, holds: [] },
    review_target:
      owner === "backend"
        ? null
        : { revision: 7, withdrawn: false, content: { question: "Exact synthetic A content" } },
  };
}
async function intercept({ request, requestId }) {
  const u = new URL(request.url);
  if ([app, admin].includes(u.origin) || u.protocol === "data:")
    return cmd("Fetch.continueRequest", { requestId });
  if (u.origin === "https://www.google.com" && u.pathname === "/recaptcha/api.js") {
    captchaLoads++;
    return cmd("Fetch.fulfillRequest", {
      requestId,
      responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "application/javascript" }],
      body: Buffer.from(
        "window.grecaptcha={ready:cb=>cb(),execute:async(key,options)=>{window.__captchaAttempt={key,options};return 'synthetic-single-attempt-captcha'}}"
      ).toString("base64"),
    });
  }
  if (u.origin !== api)
    return cmd("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
  if (request.method === "OPTIONS") return fulfill(requestId, 200, {});
  const body = request.postData ? JSON.parse(request.postData) : {};
  const entry = { path: u.pathname, method: request.method, body };
  requests.push(entry);
  if (u.pathname.startsWith("/challenges/tasks/" + caseA + "/multiple_choice")) {
    const quizzes = messages.map((m, i) => ({
      id: m.id,
      task_id: caseA,
      creator: uid,
      enabled: true,
      retired: false,
      solved: false,
      rated: false,
      creation_timestamp: "2026-09-08T00:00:00Z",
      xp: 0,
      coins: 0,
      question: "Synthetic quiz " + (i ? "B" : "A"),
      answers: ["First", "Second"],
      single_choice: true,
    }));
    return fulfill(
      requestId,
      200,
      u.pathname.endsWith("/multiple_choice")
        ? quizzes
        : quizzes.find((q) => q.id === u.pathname.split("/").at(-1))
    );
  }
  if (u.pathname === "/challenges/subtask_reports") {
    if (dropReport) {
      dropReport = false;
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    return fulfill(requestId, 201, {
      id: body.request_id,
      task_id: body.task_id,
      subtask_id: body.subtask_id,
      reason: body.reason,
      comment: body.comment,
      timestamp: "2026-09-08T15:00:00Z",
      user_id: otherUid,
    });
  }
  if (u.pathname === "/auth/moderation/inbox")
    return fulfill(
      requestId,
      failInbox ? 503 : 200,
      failInbox
        ? { detail: "Synthetic database unavailable" }
        : {
            backend: messages,
            challenges: [],
            challenges_available: true,
            scope: "rights",
            recipient_id: uid,
          }
    );
  if (u.pathname.includes("/opened/")) {
    messages.find((m) => m.id === body.id).informed_at = "2026-09-08T15:00:00Z";
    return fulfill(requestId, 200, true);
  }
  if (u.pathname.includes("/complaints/")) {
    if (holdComplaint) {
      held.push({
        kind: "complaint",
        entry,
        release: () =>
          fulfill(requestId, 200, { receipt: body.id, status: "pending_human_review" }),
      });
      return;
    }
    if (dropComplaint) {
      dropComplaint = false;
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    return fulfill(requestId, 200, { receipt: body.id, status: "pending_human_review" });
  }
  if (u.pathname === "/auth/recaptcha") return fulfill(requestId, 200, "synthetic-site-key");
  if (u.pathname === "/auth/moderation/access/oauth/finish") {
    if (holdOAuth) {
      held.push({
        kind: "oauth",
        entry,
        release: () => fulfill(requestId, 200, { capability: "O".repeat(64) }),
      });
      return;
    }
    return fulfill(requestId, 200, { capability: "O".repeat(64) });
  }
  if (u.pathname === "/auth/moderation/access/password") {
    if (captchaRequired && !body.recaptcha_response)
      return fulfill(requestId, 403, { detail: "CaptchaRequired" });
    if (holdPassword) {
      held.push({
        kind: "password",
        entry,
        release: () => fulfill(requestId, 200, { capability: "A".repeat(64) }),
      });
      return;
    }
    return fulfill(requestId, 200, { capability: "S".repeat(64) });
  }
  if (u.pathname === "/auth/sessions")
    return fulfill(requestId, 200, {
      user,
      session: { id: "55000000-0000-4000-8000-000000000001", mfa_verified: true },
      access_token: "synthetic-ordinary-B",
      refresh_token: "synthetic-refresh-B",
    });
  if (u.pathname === "/challenges/moderation/cases") {
    if (holdChallengeQueue) {
      held.push({
        kind: "queue",
        entry,
        release: () => fulfill(requestId, 200, [record(caseA, "challenges")]),
      });
      return;
    }
    return fulfill(requestId, 200, [record(caseA, "challenges")]);
  }
  if (u.pathname.startsWith("/challenges/moderation/cases/")) {
    const r = record(u.pathname.split("/").at(-1), "challenges");
    if (holdChallengeCase) {
      held.push({ kind: "case", entry, release: () => fulfill(requestId, 200, r) });
      return;
    }
    return fulfill(requestId, 200, r);
  }
  if (u.pathname === "/auth/moderation/admin/case")
    return fulfill(requestId, 200, record(body.id, "backend"));
  if (u.pathname === "/auth/moderation/admin/queue")
    return fulfill(requestId, 200, [record(caseB, "backend")]);
  if (u.pathname.includes("/moderation/") && ["POST", "GET"].includes(request.method))
    return fulfill(requestId, 200, u.pathname.endsWith("delivery_queue") ? [] : { ok: true });
  if (u.pathname.startsWith("/auth/users/")) return fulfill(requestId, 200, user);
  if (u.pathname === "/auth/session")
    return fulfill(requestId, 200, {
      user,
      session: { mfa_verified: true },
      access_token: "synthetic-ordinary-B",
    });
  if (u.pathname.includes("/shop/premium"))
    return fulfill(requestId, 200, { premium: false, renewal: null, autopay: null });
  if (u.pathname.includes("/shop/coins")) return fulfill(requestId, 200, { coins: 0 });
  if (u.pathname.includes("/shop/hearts"))
    return fulfill(requestId, 200, { hearts: 6, hearts_max: 6 });
  return fulfill(requestId, 200, []);
}
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p?.reject(m.error) : p?.resolve(m.result);
  } else if (m.method === "Fetch.requestPaused")
    intercept(m.params).catch((e) => exceptions.push(String(e)));
  else if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails);
};
const state = "document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$nuxt";
async function ev(expression) {
  const r = await cmd("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(expression) {
  const end = Date.now() + 20000;
  while (!(await ev(`!!(${expression})`))) {
    assert(Date.now() < end, expression);
    await pause(70);
  }
}
async function nav(path, origin = app, hard = false) {
  if (hard) await cmd("Page.navigate", { url: origin + path });
  else await ev(`${state}.$router.push(${JSON.stringify(path)})`);
  await until(
    `location.pathname===${JSON.stringify(path.split("?")[0])} && document.querySelector('main')`
  );
  await pause(600);
}
async function input(selector, value) {
  await ev(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`
  );
}
async function selectRow(which) {
  await ev(`document.querySelectorAll('main.moderation-page nav button')[${which}].click()`);
  await until(
    `document.querySelector('article[data-message]')?.dataset.message==='backend:${messages[which].id}'`
  );
}
async function submit() {
  await ev(`document.querySelector('article[data-message] form').requestSubmit()`);
}
await cmd("Runtime.enable");
await cmd("Page.enable");
await cmd("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
try {
  await nav("/moderation/access", app, true);
  await until('document.querySelector("input[autocomplete=username]")');
  await ev(
    `sessionStorage.setItem('moderation-recipient-access',JSON.stringify({secret:'S'.repeat(64),owner:''}))`
  );
  await nav("/moderation", app, true);
  await until('document.querySelectorAll("main.moderation-page nav button").length===2');
  // Gate the actual browser presentation continuation, then replace A with B.
  await ev(
    `window.__raf=requestAnimationFrame;window.__frames=[];window.requestAnimationFrame=cb=>{window.__frames.push(cb);return window.__frames.length}`
  );
  await selectRow(0);
  await ev(
    `document.querySelector('article[data-message]').scrollIntoView({block:'center',behavior:'instant'})`
  );
  await pause(80);
  await selectRow(1);
  await ev(
    `document.querySelector('article[data-message]').scrollIntoView({block:'center',behavior:'instant'});window.requestAnimationFrame=window.__raf;window.__frames.splice(0).forEach(cb=>requestAnimationFrame(cb))`
  );
  await pause(400);
  assert(
    !requests.some((r) => r.path.includes("/opened/") && r.body.id === messages[0].id),
    "replaced A was stamped opened"
  );
  assert(
    requests.some((r) => r.path.includes("/opened/") && r.body.id === messages[1].id),
    "positive painted B opening missing"
  );
  console.log(
    "PASS mounted foreground exact message presentation; A replaced before paint keeps unknown, B positive opens"
  );
  await selectRow(0);
  await input("article textarea", "Exact complaint A");
  holdComplaint = true;
  await submit();
  await until('document.querySelector("article textarea").disabled');
  await pause(120);
  const a = held.find((x) => x.kind === "complaint");
  assert(a);
  await selectRow(1);
  holdComplaint = false;
  await a.release();
  await pause(500);
  assert(
    !(await ev(`!!document.querySelector('article .support-success')`)),
    "B falsely acknowledged A"
  );
  assert(
    !(await ev(`document.querySelector('article textarea').disabled`)),
    "B falsely disabled by A receipt"
  );
  await selectRow(0);
  assert(await ev(`!!document.querySelector('article .support-success')`));
  assert(
    await ev(
      `[...document.querySelectorAll('article details')].some(e=>e.textContent.includes(${JSON.stringify(a.entry.body.id)}))`
    ),
    "the exact complaint reference remains available in details"
  );
  await selectRow(1);
  await input("article textarea", "Exact complaint B survives navigation");
  dropComplaint = true;
  await submit();
  await pause(300);
  const b = requests.filter((r) => r.path.includes("/complaints/")).at(-1).body;
  await nav("/docs/privacy");
  await nav("/moderation", app, true);
  await until('document.querySelectorAll("main.moderation-page nav button").length===2');
  await selectRow(1);
  assert.equal(await ev(`document.querySelector('article textarea').value`), b.text);
  await submit();
  await pause(300);
  assert.deepEqual(requests.filter((r) => r.path.includes("/complaints/")).at(-1).body, b);
  console.log(
    "PASS delayed A receipt stays A; B remains usable; lost response/navigation/reload replays exact B UUID and text"
  );
  failInbox = true;
  await nav("/moderation", app, true);
  await pause(500);
  assert(await ev(`!!sessionStorage.getItem('moderation-recipient-access')`));
  failInbox = false;
  await nav("/moderation", app, true);
  await until('document.querySelectorAll("main.moderation-page nav button").length===2');
  console.log(
    "PASS actual recipient page retains credential on503 and recovers without another proof"
  );
  await nav("/moderation/access");
  await input("input[autocomplete=username]", "proof_a");
  await input("input[autocomplete=current-password]", "synthetic password");
  holdPassword = true;
  await ev(`document.querySelector('main form').requestSubmit()`);
  await pause(200);
  const proof = held.find((x) => x.kind === "password");
  assert(proof);
  await nav("/auth/login");
  await until('document.querySelector("input[type=password]")');
  await ev(
    `(()=>{const inputs=[...document.querySelectorAll('input')];const name=inputs.find(e=>e.type!=='password'&&e.type!=='checkbox'&&e.type!=='hidden');name.value='browser_b';name.dispatchEvent(new Event('input',{bubbles:true}));const password=inputs.find(e=>e.type==='password');password.value='synthetic B password';password.dispatchEvent(new Event('input',{bubbles:true}));})()`
  );
  await ev(`document.querySelector('form').requestSubmit()`);
  await pause(600);
  await proof.release();
  await pause(500);
  assert(
    !(await ev(`!!sessionStorage.getItem('moderation-recipient-access')`)),
    "departed A proof installed after B login"
  );
  assert.notEqual(await ev("location.pathname"), "/moderation");
  console.log(
    "PASS departed password proof cannot install or navigate after ordinary B login through real session setter"
  );
  // Dedicated callback: a departed proof cannot install or redirect; a new
  // matching, current callback positively installs only recipient authority.
  await nav("/moderation/access");
  const seedFlow = async (stateValue) =>
    ev(
      `sessionStorage.setItem('oauth_flow',JSON.stringify({state:${JSON.stringify(stateValue)},purpose:'moderation',provider_id:'synthetic',ambient:sessionStorage.getItem('moderation-ambient-owner')+':'+sessionStorage.getItem('moderation-owner-generation')}))`
    );
  await seedFlow("synthetic-delayed-state");
  holdOAuth = true;
  await nav("/oauth/callback?state=synthetic-delayed-state&code=synthetic-code");
  await pause(100);
  const oldOAuth = held.find((h) => h.kind === "oauth");
  assert(oldOAuth, "callback did not reach synthetic finish boundary");
  assert.equal(await ev("location.search"), "");
  await nav("/docs/privacy");
  await oldOAuth.release();
  await pause(250);
  assert.equal(await ev("location.pathname"), "/docs/privacy");
  assert(!(await ev(`!!sessionStorage.getItem('moderation-recipient-access')`)));
  holdOAuth = false;
  await nav("/moderation/access");
  await seedFlow("synthetic-current-state");
  await ev(
    `${state}.$router.push('/oauth/callback?state=synthetic-current-state&code=synthetic-code')`
  );
  await until(
    `location.pathname==='/moderation'&&document.querySelectorAll('main.moderation-page nav button').length===2`
  );
  assert.equal(
    await ev(`JSON.parse(sessionStorage.getItem('moderation-recipient-access')).secret`),
    "O".repeat(64)
  );
  assert(
    !(await ev(
      `!!sessionStorage.getItem('oauth_flow')||!!sessionStorage.getItem('oauth_register_token')`
    ))
  );
  console.log(
    "PASS mounted dedicated OAuth callback clears code URL, fences departed completion, and current positive callback installs recipient access without registration flow"
  );
  await nav("/moderation/access");
  await input("input[autocomplete=username]", "synthetic-captcha-user");
  await input("input[autocomplete=current-password]", "synthetic password");
  holdPassword = false;
  captchaRequired = true;
  const beforeCaptcha = captchaLoads;
  await ev(`document.querySelector('main form').requestSubmit()`);
  await until(
    `[...document.querySelectorAll('main button')].some(b=>b.textContent.includes('Google-Prüfung'))`
  );
  assert.equal(captchaLoads, beforeCaptcha, "CAPTCHA contacted before explicit action");
  await ev(
    `[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('Google-Prüfung')).click()`
  );
  await until(
    `location.pathname==='/moderation'&&document.querySelectorAll('main.moderation-page nav button').length===2`
  );
  assert.equal(captchaLoads, beforeCaptcha + 1);
  const attempt = requests.filter((r) => r.path === "/auth/moderation/access/password").at(-1);
  assert.equal(attempt.body.recaptcha_response, "synthetic-single-attempt-captcha");
  assert.equal(await ev("window.__captchaAttempt.options.action"), "login");
  captchaRequired = false;
  console.log(
    "PASS mounted CAPTCHA-required recovery waits for explicit activation and submits fresh one-attempt login proof through synthetic script boundary; no real Google request"
  );
  await nav(`/quizzes/solve-${caseA}?quizzesFrom=quiz`);
  await until("document.querySelector('main form article.sticky svg')");
  await ev(
    `document.querySelector('main form article.sticky svg').dispatchEvent(new MouseEvent('click',{bubbles:true}))`
  );
  await until("document.querySelector('[role=dialog] textarea')");
  await input("[role=dialog] textarea", "Exact private report survives lost response");
  await ev(
    `[...document.querySelectorAll('[role=dialog] .cursor-pointer')].find(e=>e.textContent.trim()==='Andere').click()`
  );
  dropReport = true;
  await ev(
    `[...document.querySelectorAll('[role=dialog] button')].find(e=>e.textContent.trim()==='Meldung senden').click()`
  );
  await pause(400);
  const reportIntent = requests
    .filter((r) => r.path === "/challenges/subtask_reports")
    .at(-1)?.body;
  assert(reportIntent, "actual report form did not submit");
  assert.equal(reportIntent.task_id, caseA);
  assert.equal(reportIntent.subtask_id, messages[0].id);
  assert(
    await ev(
      `document.querySelector('[role=dialog] [role=status]').innerText.includes('Der Eingang konnte noch nicht bestätigt werden.')`
    ),
    JSON.stringify(await ev(`[...document.querySelectorAll('[role=dialog]')].map(e=>e.innerText)`))
  );
  await ev(
    `[...document.querySelectorAll('[role=dialog] button')].find(e=>e.textContent.trim()==='Abbrechen').click()`
  );
  await nav("/docs/privacy");
  await nav(`/quizzes/solve-${caseA}?quizzesFrom=quiz`, app, true);
  await until("document.querySelector('main form article.sticky svg')");
  await ev(
    `document.querySelector('main form article.sticky svg').dispatchEvent(new MouseEvent('click',{bubbles:true}))`
  );
  await until("document.querySelector('[role=dialog]')");
  assert(
    await ev(
      `document.querySelector('[role=dialog]').innerText.includes(${JSON.stringify(reportIntent.comment)})`
    )
  );
  await ev(
    `[...document.querySelectorAll('[role=dialog] button')].find(e=>e.textContent.trim()==='Status prüfen').click()`
  );
  await pause(400);
  assert.deepEqual(
    requests.filter((r) => r.path === "/challenges/subtask_reports").at(-1).body,
    reportIntent
  );
  assert(
    await ev(
      `document.querySelector('[role=dialog] [role=status]').innerText.includes('Deine Meldung ist eingegangen.')`
    )
  );
  assert(
    !(await ev(
      `[...document.querySelectorAll('[role=dialog] button')].some(e=>['Meldung senden','Status prüfen'].includes(e.textContent.trim()))`
    ))
  );
  console.log(
    "PASS actual quiz report modal lost response survives close/navigation/reload and replays exact task/subtask/UUID/private text, with receipt only for acknowledged intent"
  );
  await nav("/dashboard/moderation", admin, true);
  await ev(
    `document.cookie='accessToken=synthetic-admin; path=/';${state}.payload.state.$saccessToken='synthetic-admin';${state}.payload.state.$suser=${JSON.stringify(user)}`
  );
  holdChallengeQueue = true;
  await ev(
    `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Aktuellen Stand')).click()`
  );
  await pause(100);
  await ev(
    `(()=>{const e=document.querySelector('main select');e.value='backend';e.dispatchEvent(new Event('change',{bubbles:true}));})()`
  );
  await pause(200);
  holdChallengeQueue = false;
  for (const h of held.filter((x) => x.kind === "queue")) await h.release();
  await pause(150);
  assert(
    !(await ev(`document.querySelector('main').innerText.includes(${JSON.stringify(caseA)})`)),
    "late Challenges queue installed under backend"
  );
  holdChallengeCase = true;
  await nav(`/dashboard/moderation/${caseA}?owner=challenges`, admin);
  await pause(100);
  await nav(`/dashboard/moderation/${caseA}?owner=backend`, admin);
  await until(`document.querySelector('main').innerText.includes('account ${otherUid}')`);
  holdChallengeCase = false;
  for (const h of held.filter((x) => x.kind === "case")) await h.release();
  await pause(250);
  assert(
    await ev(`document.querySelector('main').innerText.includes('account ${otherUid}')`),
    "late exact-case response crossed owner"
  );
  assert(
    !(await ev(`document.querySelector('main').innerText.includes('Exact synthetic A content')`))
  );
  console.log(
    "PASS mounted admin owner queue/detail late responses fenced; current resource remains backend B"
  );
  // Equal revisions and target kinds cannot transfer an A preview into B.
  await nav(`/dashboard/moderation/${caseA}?owner=backend`, admin);
  await until(`document.querySelector('main').innerText.includes('account ${otherUid}')`);
  await ev(
    `(()=>{const fields=[...document.querySelectorAll('main form:first-of-type textarea')];for(const e of fields){e.value='Synthetic reviewed A facts';e.dispatchEvent(new Event('input',{bubbles:true}));}})()`
  );
  await ev(
    `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Empfängertexte prüfen')).click()`
  );
  await until("document.querySelector('article button[type=submit]')");
  await nav(`/dashboard/moderation/${caseB}?owner=backend`, admin);
  await until(
    `document.querySelector('main').innerText.includes(${JSON.stringify(caseB)}) && document.querySelector('main form')`
  );
  assert(
    !(await ev("!!document.querySelector('article button[type=submit]')")),
    "A preview survived equal-revision B route"
  );
  assert(
    !(await ev("document.querySelector('main form textarea').value")),
    "A private form survived B route"
  );
  await ev(
    `document.querySelector('main form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`
  );
  await pause(150);
  assert(
    !requests.some((r) => r.path === "/auth/moderation/admin/decide"),
    "unpreviewed B sent a decision"
  );
  await ev(
    `(()=>{const fields=[...document.querySelectorAll('main form:first-of-type textarea')];for(const e of fields){e.value='Synthetic reviewed B facts';e.dispatchEvent(new Event('input',{bubbles:true}));}})()`
  );
  await ev(
    `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Empfängertexte prüfen')).click()`
  );
  await until("document.querySelector('article button[type=submit]')");
  await ev(`document.querySelector('main form').requestSubmit()`);
  await pause(300);
  const decision = requests.find((r) => r.path === "/auth/moderation/admin/decide");
  assert(decision, "positive B decision missing");
  assert.equal(decision.body.case_id, caseB);
  assert.equal(decision.body.expected_revision, 0);
  assert.equal(decision.body.rationale, "Synthetic reviewed B facts");
  assert.equal(
    decision.body.scope,
    "Allgemeiner Kontozugang auf Bootstrap Academy; Rechtezugang bleibt erhalten"
  );
  console.log(
    "PASS actual admin equal-revision A→B clears preview/facts, rejects unreviewed submission, and explicit B review sends exact B case/source/scope"
  );

  await fs.writeFile(
    "/tmp/bootstrap-l2-implementation/browser-network.json",
    JSON.stringify(requests, null, 2)
  );
  await fs.writeFile(
    "/tmp/bootstrap-l2-implementation/browser-exceptions.json",
    JSON.stringify(exceptions, null, 2)
  );
  const shot = await cmd("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(
    "/tmp/bootstrap-l2-implementation/browser-admin.png",
    Buffer.from(shot.data, "base64")
  );
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
} finally {
  await fs.writeFile(
    "/tmp/bootstrap-l2-implementation/browser-last-debug.json",
    JSON.stringify(
      { requests, exceptions, body: await ev("document.body.innerText").catch(() => null) },
      null,
      2
    )
  );
  ws.close();
}
