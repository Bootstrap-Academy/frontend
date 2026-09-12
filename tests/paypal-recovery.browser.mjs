/** Actual Nuxt checkout + actual local backend/provider/PG. Start the synthetic
 * T7 browser-services.py fixture, Nuxt (:3177, API :3198), and Chromium CDP :9237.
 * All nonlocal network is blocked; the PayPal SDK alone is a synthetic boundary.
 * T7_EVIDENCE_DIR retains screenshots and the exact payment request trace. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const app = process.env.T7_APP_URL ?? "http://127.0.0.1:3177";
const control = process.env.T7_CONTROL_URL ?? "http://127.0.0.1:3197";
const apiOrigin = process.env.T7_API_ORIGIN ?? "http://127.0.0.1:3198";
const evidence = process.env.T7_EVIDENCE_DIR;
if (evidence) await fs.mkdir(evidence, { recursive: true });
const credentials = await (await fetch(control + "/credentials")).json();
const targets = await (
  await fetch(process.env.T7_CDP_URL ?? "http://127.0.0.1:9237/json/list")
).json();
const ws = new WebSocket(targets.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let sequence = 0,
  dropCapture = false,
  dropCreate = false,
  holdCapture = false,
  holdClientId = false,
  createFailure = false;
const pending = new Map(),
  requests = [],
  exceptions = [],
  held = [];
const state = `document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$nuxt`;
let profile = {
  id: credentials.uid,
  name: "foo",
  display_name: "Synthetic T7",
  email: "foo@example.invalid",
  email_verified: true,
  terms_version: "2026-09",
  age_confirmed: true,
  business: false,
  country: "DE",
  admin: false,
  avatar_url: null,
};
function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function fulfill(requestId, status, data, type = "application/json") {
  await cmd("Fetch.fulfillRequest", {
    requestId,
    responseCode: status,
    responseHeaders: [
      { name: "Content-Type", value: type },
      { name: "Access-Control-Allow-Origin", value: "*" },
      { name: "Access-Control-Allow-Headers", value: "*" },
      { name: "Access-Control-Allow-Methods", value: "*" },
    ],
    body: Buffer.from(type === "application/json" ? JSON.stringify(data) : data).toString("base64"),
  });
}
const sdk = `window.paypal_sdk={Buttons(callbacks){window.__paypalCallbacks=callbacks;return {async render(element){const b=document.createElement('button');b.id='synthetic-paypal';b.textContent='Synthetic PayPal';b.onclick=async()=>{try{window.__paypalOrderId=await callbacks.createOrder();}catch(e){callbacks.onError(e);}};element.append(b);}}}};`;
async function intercept({ request, requestId }) {
  const url = new URL(request.url);
  if (url.origin === app || url.protocol === "data:")
    return cmd("Fetch.continueRequest", { requestId });
  if (url.origin === "https://www.paypal.com" && url.pathname === "/sdk/js")
    return fulfill(requestId, 200, sdk, "application/javascript");
  if (url.origin !== apiOrigin)
    return cmd("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
  if (request.method === "OPTIONS") return fulfill(requestId, 200, {});
  if (url.pathname.startsWith("/shop/")) {
    const entry = { path: url.pathname, method: request.method, body: request.postData };
    requests.push(entry);
    const body =
      createFailure && url.pathname === "/shop/coins/paypal/orders"
        ? JSON.stringify({ ...JSON.parse(request.postData), coins: 1 })
        : request.postData;
    entry.sentBody = body;
    const response = await fetch(credentials.base + url.pathname, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.Authorization ?? request.headers.authorization,
      },
      body,
    });
    entry.status = response.status;
    if (url.pathname.includes("/documents/")) {
      const bytes = Buffer.from(await response.arrayBuffer());
      return cmd("Fetch.fulfillRequest", {
        requestId,
        responseCode: response.status,
        responseHeaders: [
          {
            name: "Content-Type",
            value: response.headers.get("content-type") ?? "application/octet-stream",
          },
          { name: "Access-Control-Allow-Origin", value: "*" },
        ],
        body: bytes.toString("base64"),
      });
    }
    entry.result = await response.json();
    if (url.pathname === "/shop/coins/paypal" && holdClientId) {
      holdClientId = false;
      held.push(() => fulfill(requestId, response.status, entry.result));
      return;
    }
    if (url.pathname === "/shop/coins/paypal/orders" && dropCreate) {
      dropCreate = false;
      entry.lost = true;
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    if (url.pathname.endsWith("/capture") && dropCapture) {
      dropCapture = false;
      entry.lost = true;
      return cmd("Fetch.failRequest", { requestId, errorReason: "ConnectionClosed" });
    }
    if (url.pathname.endsWith("/capture") && holdCapture) {
      held.push(() => fulfill(requestId, response.status, entry.result));
      return;
    }
    return fulfill(requestId, response.status, entry.result);
  }
  let data = {};
  if (url.pathname === "/auth/users/me") data = profile;
  else if (["/events/unrated", "/auth/oauth/providers"].includes(url.pathname)) data = [];
  else if (url.pathname === "/shop/coins/config") data = { coins_per_euro: 100, vat_percent: 19 };
  else if (url.pathname.includes("/shop/coins/")) data = { coins: 5000 };
  else if (url.pathname.includes("/shop/hearts/"))
    data = { hearts: 6, hearts_max: 6, hearts_refill_price: 50 };
  else if (url.pathname.includes("/shop/premium"))
    data = { premium: false, autopay: null, renewal: null };
  else if (url.pathname === "/auth/session")
    return fulfill(requestId, 401, { detail: "Invalid refresh token" });
  return fulfill(requestId, 200, data);
}
ws.onmessage = (event) => {
  const m = JSON.parse(event.data);
  if (m.id) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p?.reject(m.error) : p?.resolve(m.result);
  } else if (m.method === "Fetch.requestPaused")
    intercept(m.params).catch((e) => exceptions.push(String(e)));
  else if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails);
};
async function ev(expression) {
  const r = await cmd("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(expression) {
  const deadline = Date.now() + 25000;
  while (!(await ev(`!!(${expression})`))) {
    assert(Date.now() < deadline, expression);
    await pause(80);
  }
}
async function click(expression) {
  await ev(`(${expression}).scrollIntoView({block:'center',behavior:'instant'})`);
  await pause(120);
  const r = await ev(`(${expression}).getBoundingClientRect().toJSON()`),
    x = r.x + r.width / 2,
    y = r.y + r.height / 2;
  assert(
    await ev(`(${expression}).contains(document.elementFromPoint(${x},${y}))`),
    "visible click: " + expression
  );
  for (const type of ["mousePressed", "mouseReleased"])
    await cmd("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await pause(120);
}
const button = (text) =>
  `[...document.querySelectorAll('button')].find(x=>x.textContent.includes(${JSON.stringify(text)}))`;
async function navigate(path, reload = false) {
  if (reload) await cmd("Page.navigate", { url: app + path });
  else await ev(`${state}.$router.push(${JSON.stringify(path)})`);
  await until(
    `location.pathname === ${JSON.stringify(path.split("?")[0])} && document.querySelector('main,section') && !document.body.innerText.includes('Loading application')`
  );
  await pause(650);
}
async function api(path, data) {
  return (
    await fetch(control + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
  ).json();
}
const records = async () => (await fetch(control + "/records")).json();
const saved = () => ev(`JSON.parse(localStorage.getItem('paypal-checkout:${credentials.uid}'))`);
async function begin() {
  await navigate("/morphcoins/paypal?coins=1337", true);
  await until(`document.querySelector('[data-purchase-acceptance]')`);
  await click(`document.querySelector('[data-purchase-acceptance]')`);
  await click(`document.querySelector('[data-purchase-early]')`);
  await click(button("Zahlungspflichtig bestellen"));
  await until(`document.querySelector('#synthetic-paypal')`);
  const accepted = requests.filter((r) => r.path === "/shop/coins/paypal/orders").at(-1);
  assert(accepted && accepted.status === 200);
  assert.equal((await saved()).orderId, accepted.result);
  const declaration = JSON.parse(accepted.body);
  assert(
    declaration.accepted &&
      declaration.early_performance_requested &&
      declaration.order_id &&
      declaration.offer_hash
  );
  assert.equal((await records())[accepted.result].charges, 0);
  await click(`document.querySelector('#synthetic-paypal')`);
  await until(`window.__paypalOrderId`);
  return ev(`window.__paypalOrderId`);
}
async function approve(oid) {
  await ev(`window.__paypalCallbacks.onApprove({orderID:${JSON.stringify(oid)}})`);
}
async function pendingUI(oid) {
  await until(
    `document.querySelector('[data-paypal-recovery]')?.innerText.includes('Deine Zahlung wird noch geprüft')`
  );
  assert.equal((await saved()).orderId, oid);
  const text = await ev(`document.querySelector('[data-paypal-recovery]').innerText`);
  assert(text.includes("Gib keine weitere Bestellung auf"));
  assert(!(await ev(`!!document.querySelector('#synthetic-paypal, [data-purchase-acceptance]')`)));
  assert(!(await ev(`!!${button("Zahlungspflichtig bestellen")}`)));
}
async function complete(oid) {
  await until(
    `document.querySelector('[data-paypal-recovery]')?.innerText.includes('Dein Kauf ist abgeschlossen')`
  );
  const r = (await records())[oid];
  assert.equal(r.charges, 1);
  assert.equal(r.ledger, 1);
  assert.equal(new Set(r.calls).size, 1);
  assert.equal((await saved()).orderId, oid);
}
async function done() {
  await click(button("Okay"));
  await until(`!document.querySelector('[data-paypal-recovery]')`);
}
async function screenshot(name) {
  if (evidence) {
    const r = await cmd("Page.captureScreenshot");
    await fs.writeFile(`${evidence}/${name}.png`, Buffer.from(r.data, "base64"));
  }
}
await cmd("Page.enable");
await cmd("Runtime.enable");
await cmd("Network.enable");
await cmd("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
await cmd("Network.clearBrowserCookies");
for (const [name, value] of Object.entries({
  locale: "de",
  user: JSON.stringify(profile),
  accessToken: credentials.token,
  refreshToken: "synthetic-invalid-refresh",
}))
  await cmd("Network.setCookie", { name, value: encodeURIComponent(value), url: app, path: "/" });
try {
  // A binding action must remain attached to the actual clicked offer and
  // declarations across client-ID loading and both real Web Locks.
  for (const boundary of [
    "history",
    "consent",
    "owner",
    "unmount",
    "recovery-lock",
    "provider-lock",
  ]) {
    await navigate("/morphcoins/paypal?coins=2000", true);
    await ev("localStorage.clear()");
    await navigate("/morphcoins/paypal?coins=1337");
    await until(
      `document.querySelector('[data-purchase-acceptance]') && document.body.innerText.includes('1.337')`
    );
    await click(`document.querySelector('[data-purchase-acceptance]')`);
    await click(`document.querySelector('[data-purchase-early]')`);
    const before = requests.filter((r) => r.path === "/shop/coins/paypal/orders").length;
    const originalProfile = profile;
    if (boundary.endsWith("lock")) {
      const key =
        boundary === "recovery-lock"
          ? `purchase-checkout:${credentials.uid}:paypal:coins`
          : `paypal-checkout:${credentials.uid}`;
      await ev(
        `window.__lockHeld=false; navigator.locks.request(${JSON.stringify(key)},()=>new Promise(resolve=>{window.__releasePurchaseLock=resolve;window.__lockHeld=true})); undefined`
      );
      await until("window.__lockHeld");
    } else holdClientId = true;
    await click(button("Zahlungspflichtig bestellen"));
    if (!boundary.endsWith("lock")) {
      for (let i = 0; i < 100 && !held.length; i++) await pause(30);
      assert(held.length, "client-ID boundary reached");
    } else await pause(350);
    if (boundary === "consent") {
      // A focused checkbox's actual keyboard change must invalidate the click,
      // even if the customer checks it again before the old response resumes.
      await ev("document.querySelector('[data-purchase-early]').focus()");
      for (let i = 0; i < 2; i++) {
        await cmd("Input.dispatchKeyEvent", {
          type: "keyDown",
          key: " ",
          code: "Space",
          windowsVirtualKeyCode: 32,
        });
        await cmd("Input.dispatchKeyEvent", {
          type: "keyUp",
          key: " ",
          code: "Space",
          windowsVirtualKeyCode: 32,
        });
        await pause(80);
      }
    } else if (boundary === "owner") {
      const otherId = JSON.parse(Buffer.from(credentials.other.split(".")[1], "base64url")).uid;
      profile = { ...profile, id: otherId, name: "bar" };
      await ev(`${state}.payload.state['$suser'] = ${JSON.stringify(profile)}`);
    } else if (boundary === "unmount") await navigate("/contact");
    else {
      await ev("history.back()");
      await until(
        "location.search === '?coins=2000' && document.querySelector('[data-purchase-acceptance]') && !document.querySelector('[data-purchase-acceptance]').checked && !document.querySelector('[data-purchase-early]').checked"
      );
      assert.equal(await ev("document.querySelector('[data-purchase-acceptance]').checked"), false);
      assert.equal(await ev("document.querySelector('[data-purchase-early]').checked"), false);
    }
    await screenshot("binding-" + boundary + "-before-resume");
    if (boundary.endsWith("lock")) await ev("window.__releasePurchaseLock()");
    else await held.shift()();
    await pause(650);
    assert.equal(requests.filter((r) => r.path === "/shop/coins/paypal/orders").length, before);
    assert.equal(Object.keys(await records()).length, 0);
    if (boundary === "owner") {
      profile = originalProfile;
      await ev(`${state}.payload.state['$suser'] = ${JSON.stringify(profile)}`);
    }
    console.log(
      "PASS stale binding action at",
      boundary,
      "cannot create an acceptance or provider order"
    );
  }
  await navigate("/morphcoins/buy", true);
  await ev("localStorage.clear()");
  // The actual accepted/provider creation response is lost before the browser
  // knows its provider ID. Reload with another amount must restore the exact
  // acceptance, then obtain the same committed provider order.
  await navigate("/morphcoins/paypal?coins=1337", true);
  await until(`document.querySelector('[data-purchase-acceptance]')`);
  await click(`document.querySelector('[data-purchase-acceptance]')`);
  await click(`document.querySelector('[data-purchase-early]')`);
  const beforeLostCreate = Object.keys(await records()).length;
  dropCreate = true;
  await click(button("Zahlungspflichtig bestellen"));
  await until(`document.body.innerText.includes('Die PayPal-Zahlung hat nicht geklappt')`);
  const lostCreate = requests.filter((r) => r.path === "/shop/coins/paypal/orders").at(-1);
  assert(lostCreate.lost && lostCreate.status === 200);
  assert.equal(await saved(), null);
  await navigate("/morphcoins/paypal?coins=9999", true);
  await until(`document.querySelector('[data-purchase-acceptance]')`);
  assert((await ev("document.body.innerText")).includes("1.337"));
  await click(`document.querySelector('[data-purchase-acceptance]')`);
  await click(`document.querySelector('[data-purchase-early]')`);
  await click(button("Zahlungspflichtig bestellen"));
  await until(`document.querySelector('#synthetic-paypal')`);
  const restoredCreate = requests.filter((r) => r.path === "/shop/coins/paypal/orders").at(-1);
  assert.equal(restoredCreate.result, lostCreate.result);
  assert.deepEqual(JSON.parse(restoredCreate.body), JSON.parse(lostCreate.body));
  assert.equal(Object.keys(await records()).length, beforeLostCreate + 1);
  await click(`document.querySelector('#synthetic-paypal')`);
  await api("/prepare", { oid: lostCreate.result });
  await approve(lostCreate.result);
  await complete(lostCreate.result);
  await done();
  console.log(
    "PASS actual binding-button creation precedes SDK payment; lost committed creation response and changed route amount recover the same exact acceptance/provider order"
  );

  await cmd("Page.navigate", { url: app + "/morphcoins/buy" });
  await until(`document.querySelector('#__nuxt')?.__vue_app__`);
  await ev("localStorage.clear()");
  for (const scenario of [
    { name: "provider-response-loss", mode: "lost_unknown" },
    { name: "fulfillment-commit-fault", fault: "fulfilled_at" },
    { name: "customer-response-loss", drop: true },
  ]) {
    const before = Object.keys(await records()).length;
    const oid = await begin();
    await api("/prepare", { oid, ...scenario });
    dropCapture = !!scenario.drop;
    await approve(oid);
    await pendingUI(oid);
    if (!scenario.drop) {
      assert.equal((await records())[oid].ledger, 0);
      assert.equal((await records())[oid].charges, 1);
    }
    await screenshot(scenario.name + "-pending");
    if (!scenario.drop) {
      await click(button("Diese Bestellung erneut prüfen"));
      await pendingUI(oid);
    }
    await navigate("/morphcoins/paypal?coins=9999", true);
    await pendingUI(oid);
    await navigate("/contact");
    await navigate("/morphcoins/buy");
    await pendingUI(oid);
    await navigate("/morphcoins/error?msg=Unable%20to%20approve%20order");
    await pendingUI(oid);
    await navigate("/morphcoins/success?coins=9999");
    await pendingUI(oid);
    await api("/recover", { oid, ...scenario });
    await click(button("Diese Bestellung erneut prüfen"));
    await complete(oid);
    assert.equal(Object.keys(await records()).length, before + 1);
    await screenshot(scenario.name + "-complete");
    await navigate("/morphcoins/buy", true);
    await complete(oid);
    await done();
    console.log(
      "PASS",
      scenario.name,
      "same order through retry, refresh, navigation, generic error entry; one charge/credit",
      oid
    );
  }
  // Successful response arriving after navigation must not replace the new page.
  const ordinary = await begin();
  await api("/prepare", { oid: ordinary });
  holdCapture = true;
  await ev(`window.__paypalCallbacks.onApprove({orderID:${JSON.stringify(ordinary)}}); undefined`);
  while (!held.length) await pause(80);
  await navigate("/contact");
  holdCapture = false;
  await held.shift()();
  await pause(400);
  assert.equal(await ev("location.pathname"), "/contact");
  await navigate("/morphcoins/buy");
  await complete(ordinary);
  await done();
  console.log(
    "PASS ordinary committed success after navigation retains destination and recovered result"
  );
  const cancelled = await begin();
  await ev("window.__paypalCallbacks.onCancel()");
  await until(`localStorage.getItem('paypal-checkout:${credentials.uid}') === null`);
  assert.equal(await saved(), null);
  assert.equal((await records())[cancelled].charges, 0);
  await approve(cancelled);
  assert.equal((await records())[cancelled].charges, 0);
  console.log("PASS pre-capture cancellation and late approval cannot charge cancelled order");
  createFailure = true;
  await navigate("/morphcoins/paypal?coins=1337", true);
  await click(`document.querySelector('[data-purchase-acceptance]')`);
  await click(`document.querySelector('[data-purchase-early]')`);
  await click(button("Zahlungspflichtig bestellen"));
  await until(`document.body.innerText.includes('Die PayPal-Zahlung hat nicht geklappt')`);
  assert.equal(await saved(), null);
  createFailure = false;
  console.log("PASS genuine pre-capture validation error stays retryable without pending payment");

  // Resume an approved-order checkout after reload, then overlap callbacks.
  const resumed = await begin();
  const beforeResume = Object.keys(await records()).length;
  const wrongOwner = await fetch(
    credentials.base + `/shop/coins/paypal/orders/${resumed}/capture`,
    { method: "POST", headers: { Authorization: `Bearer ${credentials.other}` } }
  );
  assert.equal(wrongOwner.status, 404);
  assert.equal((await records())[resumed].charges, 0);
  await navigate("/morphcoins/buy", true);
  await until(`document.body.innerText.includes('PayPal-Bestellung fortsetzen')`);
  await click(button("Mit PayPal fortsetzen"));
  await until(`document.querySelector('#synthetic-paypal')`);
  await click(`document.querySelector('#synthetic-paypal')`);
  assert.equal(await ev("window.__paypalOrderId"), resumed);
  assert.equal(Object.keys(await records()).length, beforeResume);
  await api("/prepare", { oid: resumed });
  holdCapture = true;
  const capturesBefore = requests.filter((r) => r.path.endsWith("/capture")).length;
  await ev(
    `Promise.all([window.__paypalCallbacks.onApprove({orderID:${JSON.stringify(resumed)}}), window.__paypalCallbacks.onApprove({orderID:${JSON.stringify(resumed)}})]); undefined`
  );
  while (!held.length) await pause(80);
  await ev(
    "window.__paypalCallbacks.onCancel(); window.__paypalCallbacks.onError(new Error('late SDK error'))"
  );
  await pendingUI(resumed);
  assert.equal(requests.filter((r) => r.path.endsWith("/capture")).length, capturesBefore + 1);
  const originalProfile = profile;
  const otherId = JSON.parse(
    Buffer.from(credentials.other.split(".")[1], "base64url").toString()
  ).uid;
  profile = { ...profile, id: otherId, name: "bar" };
  await ev(
    `${state}.payload.state['$suser'] = ${JSON.stringify(profile)}; ${state}.payload.state['$scoins'] = 777`
  );
  await pause(150);
  assert(!(await ev(`document.body.innerText.includes(${JSON.stringify(resumed)})`)));
  holdCapture = false;
  await held.shift()();
  await pause(300);
  assert.equal(await ev(`${state}.payload.state['$scoins']`), 777);
  assert(!(await ev(`document.body.innerText.includes(${JSON.stringify(resumed)})`)));
  profile = originalProfile;
  await ev(`${state}.payload.state['$suser'] = ${JSON.stringify(profile)}`);
  await complete(resumed);
  await done();
  console.log(
    "PASS approval reentry uses same order; overlapping approve/cancel/error callbacks preserve capture; late success cannot expose order or change another account balance"
  );

  await ev(`localStorage.setItem('paypal-checkout:${credentials.uid}', '{broken')`);
  await navigate("/morphcoins/buy", true);
  await until(
    `document.body.innerText.includes('Deine gespeicherte Zahlung konnte nicht gelesen')`
  );
  assert(!(await ev(`!!document.querySelector('[data-purchase-acceptance]')`)));
  assert(await ev(`!!document.querySelector('[data-paypal-recovery] a[href="/contact"]')`));
  await screenshot("unreadable-storage");
  await cmd("Network.clearBrowserCookies");
  await cmd("Page.navigate", { url: app + "/morphcoins/paypal?coins=1337" });
  await until(`location.pathname === '/auth/login'`);
  assert(!(await ev(`document.body.innerText.includes(${JSON.stringify(resumed)})`)));
  console.log(
    "PASS corrupt storage blocks new purchase with support path; anonymous private checkout redirects to login without payment details"
  );
  assert.deepEqual(exceptions, []);
  console.log("PASS browser exceptions: 0; durable records:", Object.keys(await records()).length);
} finally {
  if (evidence) {
    await fs.writeFile(
      `${evidence}/browser-requests.json`,
      JSON.stringify({ requests, exceptions, records: await records() }, null, 2)
    );
  }
  ws.close();
}
