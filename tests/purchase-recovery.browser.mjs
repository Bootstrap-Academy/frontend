/** Actual Nuxt checkout + actual local backend/provider/PG. Start the synthetic
 * T7 browser-services.py fixture, Nuxt (:3177, API :3198), and Chromium CDP :9237.
 * All nonlocal network is blocked; the PayPal SDK alone is a synthetic boundary.
 * T7_EVIDENCE_DIR retains screenshots and the exact payment request trace. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const app = process.env.T7_APP_URL ?? "http://127.0.0.1:55877";
const control = process.env.T7_CONTROL_URL ?? "http://127.0.0.1:55876";
const evidence = process.env.T7_EVIDENCE_DIR;
if (evidence) await fs.mkdir(evidence, { recursive: true });
const credentials = await (await fetch(control + "/credentials")).json();
const targets = await (
  await fetch(process.env.T7_CDP_URL ?? "http://127.0.0.1:55878/json/list")
).json();
const ws = new WebSocket(targets.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let sequence = 0,
  dropCapture = false,
  dropPurchase = false,
  holdCapture = false,
  holdOrderList = false,
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
  if (url.origin !== "http://127.0.0.1:55872")
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
      entry.result = { bytes: bytes.length, contentType: response.headers.get("content-type") };
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
    if (url.pathname === "/shop/purchases" && holdOrderList) {
      holdOrderList = false;
      held.push(() => fulfill(requestId, response.status, entry.result));
      return;
    }
    if (url.pathname === "/shop/purchases/accept" && dropPurchase) {
      dropPurchase = false;
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
const modal = 'document.querySelector(".modal-content")';
const buttons = '[...document.querySelectorAll("button")]';
const order = `[...${modal}.querySelectorAll('button')].find(b=>b.innerText.includes('ZAHLUNGSPFLICHTIG'))`;
async function openKind(kind) {
  await navigate("/subscription", true);
  const expr =
    kind === "premium"
      ? `${buttons}.find(b=>b.innerText.includes('Morphcoins')&&b.querySelector('img'))`
      : `${buttons}.find(b=>b.innerText==='JETZT NACHFÜLLEN')`;
  await until(`${expr} && !${expr}.disabled`);
  await click(expr);
  await until(modal);
  await pause(400);
}
async function accept() {
  await click('document.querySelector("[data-purchase-acceptance]")');
  await click('document.querySelector("[data-purchase-early]")');
  await until(`${order}.getAttribute('aria-disabled')==='false'`);
  await click(order);
}
const results = {};
try {
  await cmd("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const primaryProfile = profile;
  const heartId = JSON.parse(
    Buffer.from(credentials.other.split(".")[1], "base64url").toString()
  ).uid;
  profile = { ...profile, id: heartId, name: "bar" };
  for (const [name, value] of Object.entries({
    accessToken: credentials.other,
    user: JSON.stringify(profile),
  }))
    await cmd("Network.setCookie", { name, value: encodeURIComponent(value), url: app, path: "/" });
  await navigate("/subscription", true);
  await ev("localStorage.clear()");
  await openKind("hearts");
  results.hearts_dialog = await ev(`${modal}.innerText`);
  await screenshot("hearts-partial-dialog");
  assert(results.hearts_dialog.includes("2,5"));
  assert(results.hearts_dialog.includes("3 Herzen"));
  assert(!results.hearts_dialog.includes("5 zusätzlichen Versuchen"));
  await click(
    `[...${modal}.querySelectorAll('button')].find(b=>b.innerText.includes('ABBRECHEN'))`
  );
  profile = primaryProfile;
  for (const [name, value] of Object.entries({
    accessToken: credentials.token,
    user: JSON.stringify(profile),
  }))
    await cmd("Network.setCookie", { name, value: encodeURIComponent(value), url: app, path: "/" });
  await api("/smtp", { reject: true });
  dropPurchase = true;
  await openKind("premium");
  await accept();
  await pause(1200);
  const first = requests.filter((r) => r.path === "/shop/purchases/accept").at(-1);
  assert(first.lost);
  assert.equal(first.result.state, "paid");
  results.first = first;
  results.after_lost = await ev("document.body.innerText");
  await screenshot("premium-response-lost");
  await until(`${modal} && ${order}.getAttribute('aria-disabled')==='false'`);
  await click(
    `[...${modal}.querySelectorAll('button')].find(b=>b.innerText.includes('ABBRECHEN'))`
  );
  await navigate("/subscription", true);
  const buy = `${buttons}.filter(b=>b.innerText.includes('Morphcoins')&&b.querySelector('img')).at(-1)`;
  await until(`${buy} && !${buy}.disabled`);
  await click(buy);
  await until(`location.pathname==='/orders'`);
  assert.equal(requests.filter((r) => r.path === "/shop/purchases/accept").length, 1);
  results.orders = await (
    await fetch(credentials.base + "/shop/purchases", {
      headers: { Authorization: "Bearer " + credentials.token },
    })
  ).json();
  const original = results.orders.find((x) => x.offer.id === first.result.offer.id);
  assert.equal(original.state, "paid");
  assert.equal(original.confirmation_smtp_accepted_at, null);
  assert.equal(
    results.orders.filter((x) => x.offer.product.kind.startsWith("premium_") && x.state === "paid")
      .length,
    1
  );
  const recoveredArticle = `[...document.querySelectorAll('main article')].find(a=>a.innerText.includes(${JSON.stringify(first.result.offer.id)}))`;
  await ev(`${recoveredArticle}.querySelector('details').open=true`);
  const recoveredText = await ev(`${recoveredArticle}.innerText`);
  assert(recoveredText.includes(first.result.offer.product.title));
  assert(recoveredText.includes(first.result.offer.text));
  assert(recoveredText.includes(first.result.offer.declaration));
  assert(first.result.offer.product.kind === "premium_monthly");
  results.recovered_offer_text = recoveredText;
  await screenshot("original-paid-order-recovered");
  // Hold a real old-owner list response over the account switch.
  holdOrderList = true;
  await click(button("Status aktualisieren"));
  while (!held.length) await pause(30);
  // Account-scoped marker cannot be interpreted as another user's order.
  const originalProfile = profile;
  const otherId = JSON.parse(
    Buffer.from(credentials.other.split(".")[1], "base64url").toString()
  ).uid;
  profile = { ...profile, id: otherId, name: "bar" };
  await cmd("Network.setCookie", {
    name: "accessToken",
    value: encodeURIComponent(credentials.other),
    url: app,
    path: "/",
  });
  await ev(`${state}.payload.state['$suser']=${JSON.stringify(profile)}`);
  await pause(200);
  assert(!(await ev(`document.body.innerText.includes(${JSON.stringify(first.result.offer.id)})`)));
  await held.shift()();
  await pause(150);
  assert(!(await ev(`document.body.innerText.includes(${JSON.stringify(first.result.offer.id)})`)));
  await navigate("/orders", true);
  await pause(300);
  assert(!(await ev(`document.body.innerText.includes(${JSON.stringify(first.result.offer.id)})`)));
  // Two same-owner refreshes complete out of order. The second contains an
  // actually issued new offer; releasing the old real list must not erase it.
  holdOrderList = true;
  await click(button("Status aktualisieren"));
  while (!held.length) await pause(30);
  const quoteResponse = await fetch(credentials.base + "/shop/purchases/offers/hearts", {
    method: "POST",
    headers: { Authorization: "Bearer " + credentials.other },
  });
  assert.equal(quoteResponse.status, 200);
  const fresh = (await quoteResponse.json()).offer;
  await click(button("Status aktualisieren"));
  await until(`document.body.innerText.includes(${JSON.stringify(fresh.id)})`);
  await held.shift()();
  await pause(150);
  assert(await ev(`document.body.innerText.includes(${JSON.stringify(fresh.id)})`));
  results.owner_and_generation_ordering = true;
  profile = originalProfile;
  console.log(
    "PASS exact half-heart display; actual lost committed response followed by close/reload/reopen recovers one pending Premium order; another owner cannot see that order"
  );
  assert.deepEqual(exceptions, []);
} finally {
  await fs.writeFile(
    `${evidence}/browser-core-results.json`,
    JSON.stringify({ results, requests, exceptions }, null, 2)
  );
  ws.close();
}
