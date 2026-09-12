/** Mounted UI regression checks with synthetic accounts/API. Blocks external traffic. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const app = process.env.ACCOUNT_TEST_APP || "http://127.0.0.1:56721";
const api = process.env.ACCOUNT_TEST_API || "http://127.0.0.1:56723";
const cdp = process.env.ACCOUNT_TEST_CDP || "http://127.0.0.1:56722";
const evidence = process.env.ACCOUNT_TEST_EVIDENCE;
const targets = await (await fetch(cdp + "/json/list")).json();
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let sequence = 0,
  recoveryFails = false,
  complaintPending = true;
const waiting = new Map(),
  requests = [],
  exceptions = [];
const uid = "11000000-0000-4000-8000-000000000001";
const token =
  "e30." +
  Buffer.from(JSON.stringify({ sub: uid, exp: 4102444800 })).toString("base64url") +
  ".synthetic";
const profile = {
  id: uid,
  name: "synthetic",
  display_name: "Synthetic",
  email: "synthetic@example.invalid",
  email_verified: true,
  enabled: true,
  admin: false,
  terms_version: "2026-09-r1",
  age_confirmed: true,
  mfa_enabled: false,
};
const message = {
  id: "22000000-0000-4000-8000-000000000001",
  case_id: "33000000-0000-4000-8000-000000000001",
  decision_id: "44000000-0000-4000-8000-000000000001",
  audience: "author",
  statement: {
    outcome: "restrict",
    target_kind: "account",
    rationale: "Synthetic reason for the notice",
    scope: "Synthetic task",
    redress: "Human review available",
  },
  effective: { enabled: false, withdrawn: false },
  current: true,
  available_at: "2026-09-12T00:00:00Z",
  informed_at: null,
  complaint_until: null,
};
const order = {
  offer: {
    id: "55000000-0000-4000-8000-000000000001",
    user_id: uid,
    product: { title: "Synthetic Premium" },
    text: "Unchanged synthetic offer",
    declaration: "Unchanged synthetic declaration",
  },
  state: "fulfilled",
  accepted_at: "2026-09-01T00:00:00Z",
  fulfillment: { purchased_since: "2026-09-01", purchased_until: "2026-10-01" },
  provision_timing: { committed_before_deadline_proven: true },
  document_corrections: [],
};
function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    waiting.set(id, { resolve, reject });
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
      { name: "Access-Control-Allow-Methods", value: "*" },
      { name: "Access-Control-Allow-Headers", value: "*" },
    ],
    body: Buffer.from(JSON.stringify(data)).toString("base64"),
  });
}
async function intercept({ request, requestId }) {
  const u = new URL(request.url);
  if (u.origin === app || ["data:", "blob:"].includes(u.protocol))
    return cmd("Fetch.continueRequest", { requestId });
  if (u.origin !== api)
    return cmd("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
  if (request.method === "OPTIONS") return fulfill(requestId, 200, {});
  const body = request.postData ? JSON.parse(request.postData) : {};
  requests.push({ path: u.pathname, method: request.method, body });
  if (u.pathname === "/auth/moderation/access/recovery")
    return fulfill(requestId, recoveryFails ? 503 : 200, {});
  if (u.pathname === "/auth/moderation/inbox")
    return fulfill(requestId, 200, {
      backend: [message],
      challenges: [],
      challenges_available: true,
      scope: "rights",
      recipient_id: uid,
    });
  if (u.pathname.includes("/opened/")) {
    message.informed_at = "2026-09-12T00:00:00Z";
    return fulfill(requestId, 200, true);
  }
  if (u.pathname.includes("/complaints/")) {
    if (complaintPending)
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    return fulfill(requestId, 200, { receipt: body.id, status: "pending_human_review" });
  }
  if (u.pathname === "/auth/users/me") return fulfill(requestId, 200, profile);
  if (u.pathname === "/shop/purchases") return fulfill(requestId, 200, [order]);
  if (u.pathname.includes("/documents/"))
    return fulfill(requestId, 200, "Synthetic original document");
  if (u.pathname === "/auth/oauth/providers") return fulfill(requestId, 200, []);
  if (u.pathname === "/shop/coins/config")
    return fulfill(requestId, 200, { coins_per_euro: 100, vat_percent: 19 });
  if (u.pathname.includes("/shop/coins/")) return fulfill(requestId, 200, { coins: 5000 });
  if (u.pathname.includes("/shop/hearts/"))
    return fulfill(requestId, 200, { hearts: 6, hearts_max: 6, hearts_refill_price: 50 });
  if (u.pathname.includes("/shop/premium"))
    return fulfill(requestId, 200, { premium: false, autopay: null, renewal: null });
  if (u.pathname === "/auth/session")
    return fulfill(requestId, 200, {
      user: profile,
      access_token: token,
      refresh_token: "synthetic",
    });
  return fulfill(requestId, 200, []);
}
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) {
    const p = waiting.get(m.id);
    waiting.delete(m.id);
    m.error ? p?.reject(m.error) : p?.resolve(m.result);
  } else if (m.method === "Fetch.requestPaused")
    intercept(m.params).catch((e) =>
      exceptions.push(JSON.stringify({ phase: "intercept", url: m.params.request.url, error: e }))
    );
  else if (m.method === "Runtime.exceptionThrown")
    exceptions.push(JSON.stringify({ phase: "runtime", detail: m.params.exceptionDetails }));
};
async function ev(expression) {
  const r = await cmd("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function until(expression) {
  const end = Date.now() + 25000;
  while (!(await ev(expression))) {
    assert(Date.now() < end, expression + "\n" + exceptions.join("\n"));
    await new Promise((r) => setTimeout(r, 60));
  }
}
async function nav(path) {
  await cmd("Page.navigate", { url: app + path });
  await until(
    `location.pathname===${JSON.stringify(path.split("#")[0])} && (!!document.querySelector('main') || location.pathname==='/subscription') && !!document.querySelector('footer')`
  );
}
async function fill(selector, value) {
  await ev(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`
  );
}
async function click(selector) {
  await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
}
async function footer() {
  assert.deepEqual(
    await ev(
      `({footer:document.querySelectorAll('footer').length,cancel:[...document.querySelectorAll('a[href="/vertrag-kuendigen"]')].filter(a=>a.closest('footer')).length,withdraw:[...document.querySelectorAll('a[href="/vertrag-widerrufen"]')].filter(a=>a.closest('footer')).length,allCancel:document.querySelectorAll('a[href="/vertrag-kuendigen"]').length,allWithdraw:document.querySelectorAll('a[href="/vertrag-widerrufen"]').length})`
    ),
    { footer: 1, cancel: 1, withdraw: 1, allCancel: 1, allWithdraw: 1 }
  );
}
function luminance(rgb) {
  const a = rgb
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number)
    .map((n) => {
      n /= 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
async function contrast() {
  const rows = await ev(
    `Array.from(document.querySelectorAll('main input:not([type=checkbox]):not([type=radio]),main select,main textarea,main option')).map(e=>({tag:e.tagName,color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}))`
  );
  assert(rows.length);
  for (const row of rows) {
    const a = luminance(row.color),
      b = luminance(row.background);
    assert((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, JSON.stringify(row));
  }
  return rows.length;
}
async function shot(name) {
  if (!evidence) return;
  await mkdir(evidence, { recursive: true });
  const r = await cmd("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(evidence + "/" + name + ".png", Buffer.from(r.data, "base64"));
}
try {
  await cmd("Runtime.enable");
  await cmd("Page.enable");
  await cmd("Page.bringToFront");
  await cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await cmd("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  await cmd("Network.clearBrowserCookies");
  await cmd("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await nav("/moderation/access");
  await ev("sessionStorage.clear(); localStorage.clear()");
  await nav("/moderation/access");
  await until(`!!document.querySelector('input[autocomplete=username]')`);
  await footer();
  assert.equal(await ev(`document.querySelector('details.case-recovery').open`), false);
  assert.equal(await ev(`document.querySelector('details.retained-access').open`), false);
  const controlCount = await contrast();
  await click(".case-recovery summary");
  await fill(".case-recovery input[autocomplete=off]", message.case_id);
  await fill(".case-recovery input[type=email]", "synthetic@example.invalid");
  recoveryFails = true;
  await ev(`document.querySelector('.case-recovery form').requestSubmit()`);
  await until(`!!document.querySelector('.case-recovery [role=alert]')`);
  recoveryFails = false;
  await ev(`document.querySelector('.case-recovery form').requestSubmit()`);
  await until(`!!document.querySelector('.case-recovery [role=status]')`);
  assert.equal(await ev(`!!document.querySelector('.case-recovery [role=alert]')`), false);
  await shot("access-mobile");
  await click(".retained-access summary");
  await contrast();
  await ev(`document.querySelector('img[src="/images/en.webp"]').click()`);
  await until(`document.querySelector('h1').textContent.includes('Decisions')`);
  assert.equal(await ev(`document.querySelector('main').innerText.includes('Moderation.')`), false);
  await nav("/moderation#capability=" + "S".repeat(64));
  await until(`document.querySelectorAll('main nav button').length===1`);
  assert.equal(await ev("location.hash"), "");
  await footer();
  assert.equal(await ev(`document.querySelector('.account-rights').open`), false);
  await click("main nav button");
  await until(`!!document.querySelector('article[data-message] textarea')`);
  assert.equal(
    await ev(`document.querySelector('article[data-message] h2').textContent.includes('Account')`),
    true
  );
  assert.equal(
    await ev(
      `document.querySelector('article[data-message]').innerText.includes(${JSON.stringify(message.case_id)})`
    ),
    false
  );
  assert.equal(
    await ev(
      `document.querySelector('article[data-message]').innerText.includes(${JSON.stringify(message.statement.rationale)})`
    ),
    true
  );
  await click("article[data-message] details summary");
  assert.equal(
    await ev(
      `document.querySelector('article[data-message] details').innerText.includes(${JSON.stringify(message.case_id)})`
    ),
    true
  );
  await click("article[data-message] details summary");
  await contrast();
  await fill("article textarea", "Synthetic complaint with new information.");
  await ev(`document.querySelector('article form').requestSubmit()`);
  await until(
    `document.querySelector('article textarea').disabled && !!document.querySelector('article form [role=status]')`
  );
  const first = requests.filter((r) => r.path.includes("/complaints/")).at(-1);
  complaintPending = false;
  await ev(`document.querySelector('article form').requestSubmit()`);
  await until(`!!document.querySelector('article .support-success')`);
  const second = requests.filter((r) => r.path.includes("/complaints/")).at(-1);
  assert.deepEqual(first.body, second.body);
  await click(".account-rights summary");
  await contrast();
  await shot("case-mobile");
  await ev(`document.querySelector('img[src="/images/de.webp"]').click()`);
  await until(`document.querySelector('article[data-message] h2').textContent.includes('Konto')`);
  await ev(`document.querySelector('article[data-message]').scrollIntoView({block:'start'})`);
  await shot("case-mobile-de");
  await nav("/auth/login");
  assert.equal(await ev(`!!document.querySelector('a[href="/moderation/access"]')`), false);
  await footer();
  await ev(
    `document.cookie='accessToken=${token}; path=/';document.cookie='user='+encodeURIComponent(${JSON.stringify(JSON.stringify(profile))})+'; path=/'`
  );
  await nav("/account");
  await until(`!!document.querySelector('main a[href="/moderation"]')`);
  assert.equal(await ev(`document.querySelectorAll('main a[href="/moderation"]').length`), 1);
  assert.equal(await ev(`document.querySelectorAll('main a[href="/orders"]').length`), 1);
  await footer();
  await ev(
    `(()=>{const e=document.querySelector('button.justify-self-end');e.__vueParentComponent.setupState.show=true})()`
  );
  await until(`!!document.querySelector('a[href="/subscription"]')`);
  assert.equal(await ev(`!!document.querySelector('nav a[href="/moderation"]')`), false);
  await nav("/orders");
  await until(`document.querySelectorAll('main article').length===1`);
  assert.equal(await ev(`document.querySelector('.order-documents').open`), false);
  assert.equal(
    await ev(
      `document.querySelector('main').innerText.includes(${JSON.stringify(order.offer.id)})`
    ),
    false
  );
  await click(".order-documents summary");
  await click("[data-purchase-original] summary");
  assert.equal(
    await ev(
      `document.querySelector('[data-purchase-original]').innerText.includes(${JSON.stringify(order.offer.text)})`
    ),
    true
  );
  assert.equal(
    await ev(
      `document.querySelector('[data-purchase-original]').innerText.includes(${JSON.stringify(order.offer.declaration)})`
    ),
    true
  );
  await shot("orders-original-de");
  assert.equal(
    await ev(`document.querySelector('main').innerText.includes('Body.PurchaseDocument_')`),
    false
  );
  await footer();
  await cmd("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 950,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await nav("/subscription");
  await until(`!!document.querySelector('footer') && !!document.querySelector('h2')`);
  if (evidence) {
    await mkdir(evidence, { recursive: true });
    await writeFile(evidence + "/subscription-rendered.txt", await ev("document.body.innerText"));
  }
  await shot("subscription-desktop");
  assert.equal(await ev(`document.querySelectorAll('a[href="/orders"]').length`), 0);
  await footer();
  await nav("/missing-account-hotfix-test");
  await footer();
  await nav("/moderation/access");
  await cmd("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 640,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await click(".case-recovery summary");
  const geometry = await ev(
    `({scroll:document.documentElement.scrollWidth,viewport:innerWidth,main:document.querySelector('main').getBoundingClientRect().width})`
  );
  assert(geometry.main <= geometry.viewport);
  assert(geometry.scroll <= geometry.viewport + 1, JSON.stringify(geometry));
  await ev(`document.documentElement.style.fontSize='200%'`);
  const enlarged = await ev(
    `({scroll:document.querySelector('main').scrollWidth,width:document.querySelector('main').clientWidth})`
  );
  assert(enlarged.scroll <= enlarged.width + 1, JSON.stringify(enlarged));
  await shot("access-320-text200");
  await ev(`document.querySelector('.case-recovery summary').focus()`);
  await cmd("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  });
  await cmd("Input.dispatchKeyEvent", {
    type: "char",
    text: "\r",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  });
  await cmd("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  });
  await until(`!document.querySelector('.case-recovery').open`);
  assert.equal(exceptions.length, 0, exceptions.join("\n"));
  const result = {
    passed: true,
    synthetic: true,
    external_network_blocked: true,
    footer_once: true,
    error_footer_once: true,
    account_destinations_once: true,
    generic_login_shortcut_absent: true,
    subscription_duplicate_links_absent: true,
    closed_rare_flows: true,
    controls_with_verified_contrast: controlCount,
    recovery_error_success: true,
    exact_complaint_retry: true,
    meaningful_case_heading: true,
    original_reason_retained: true,
    unchanged_order_original_retained: true,
    reference_only_in_expandable_details: true,
    deep_link_preserved: true,
    english: true,
    mobile320: geometry,
    text200: enlarged,
    keyboard_details: true,
  };
  if (evidence) await writeFile(evidence + "/result.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await cmd("Fetch.disable").catch(() => {});
  ws.close();
}
