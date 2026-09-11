/**
 * Real Nuxt route regression with intercepted synthetic APIs; no backend required.
 * Start Nuxt on 3175 (API URL http://127.0.0.1:3198) and a fresh headless Chromium
 * on CDP port 9229. Run: T5_EVIDENCE_DIR=/absolute/output node tests/public-declarations.mjs
 * The runner blocks every origin except the local app and its intercepted API.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const appUrl = process.env.T5_APP_URL ?? "http://127.0.0.1:3175";
const cdpUrl = process.env.T5_CDP_URL ?? "http://127.0.0.1:9229";
const evidence = process.env.T5_EVIDENCE_DIR;
const targets = await (await fetch(cdpUrl + "/json/list")).json();
const ws = new WebSocket(targets.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let sequence = 0,
  ratingCount = 0,
  ratingDelay = 0,
  refreshStatus = 401,
  refreshHeld = false;
let declarationHeld = false,
  declarationStatus = 200,
  profileStatus = 200;
const pending = new Map(),
  requests = [],
  exceptions = [],
  consoleMessages = [],
  blocked = [];
const heldRefreshes = [],
  heldDeclarations = [];
const profile = {
  id: "t5-user",
  name: "T5",
  display_name: "T5 Browser User",
  email: "t5@example.invalid",
  email_verified: true,
  terms_version: "2025-01",
  age_confirmed: true,
  business: false,
  country: "DE",
  admin: false,
  avatar_url: null,
};
const state = `document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$nuxt`;
const apiWrites = () => requests.filter((r) => !["GET", "OPTIONS"].includes(r.method));
const posts = () => requests.filter((r) => r.method === "POST" && r.path.startsWith("/contracts/"));
const refreshes = () => requests.filter((r) => r.method === "PUT" && r.path === "/auth/session");
const ratings = () => requests.filter((r) => r.path === "/events/unrated");
function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function fulfill(requestId, status, data) {
  await cmd("Fetch.fulfillRequest", {
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
async function mock({ request, requestId }) {
  const url = new URL(request.url);
  if (url.origin === appUrl || url.protocol === "data:")
    return cmd("Fetch.continueRequest", { requestId });
  if (url.origin !== "http://127.0.0.1:3198") {
    blocked.push(request.url);
    return cmd("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
  }
  const entry = {
    path: url.pathname,
    method: request.method,
    body: request.postData,
    headers: request.headers,
  };
  requests.push(entry);
  let data = {},
    status = 200;
  if (request.method === "OPTIONS") data = "";
  else if (url.pathname === "/auth/session" && request.method === "PUT") {
    status = refreshStatus;
    data = { detail: "Invalid refresh token", error: "invalid_token" };
    if (refreshHeld) return heldRefreshes.push(() => fulfill(requestId, status, data));
  } else if (url.pathname === "/contracts/receipts" && request.method === "POST") {
    const submitted = JSON.parse(
      posts()
        .filter((p) => p.path !== "/contracts/receipts")
        .at(-1).body
    );
    data = {
      declaration: {
        ...submitted,
        id: "recovered-receipt",
        kind: "CANCELLATION",
        received_at: "2026-09-07T14:00:00Z",
        user_id: "PRIVATE-ACCOUNT",
        effective_end: "2099-01-01T00:00:00Z",
        processing_note: "PRIVATE-NOTE",
      },
      confirmation_email_sent: true,
    };
  } else if (url.pathname.startsWith("/contracts/") && request.method === "POST") {
    status = declarationStatus;
    data =
      status === 200
        ? {
            declaration: {
              ...JSON.parse(request.postData),
              id: "receipt-" + posts().length,
              received_at: "2026-09-07T14:00:00Z",
              effective_end: null,
            },
            confirmation_email_sent: false,
          }
        : { detail: "Synthetic declaration outage", error: "unavailable" };
    if (declarationHeld) return heldDeclarations.push(() => fulfill(requestId, status, data));
  } else if (request.method !== "GET") {
    status = 503;
    data = { detail: "Synthetic rating outage", error: "unavailable" };
  } else if (url.pathname === "/auth/users/me") {
    status = profileStatus;
    data = status === 200 ? profile : { detail: "Invalid token", error: "invalid_token" };
  } else if (url.pathname === "/events/unrated") {
    data = Array.from({ length: ratingCount }, (_, i) => ({
      id: "t5-rating-" + i,
      webinar_name: "T5 Rating " + i,
      instructor: { display_name: "T5 Instructor" },
    }));
    if (ratingDelay) await new Promise((r) => setTimeout(r, ratingDelay));
  } else if (url.pathname === "/auth/oauth/providers") data = [];
  else if (url.pathname === "/shop/coins/config") data = { coins_per_euro: 100, vat_percent: 19 };
  else if (url.pathname === "/shop/hearts/config")
    data = { hearts_max: 6, hearts_refill_price: 50 };
  else if (url.pathname === "/shop/premium_plans")
    data = { MONTHLY: { price: 1000, months: 1 }, YEARLY: { price: 10000, months: 12 } };
  else if (url.pathname === "/shop/coins/t5-user") data = { coins: 50000 };
  else if (url.pathname === "/shop/hearts/t5-user")
    data = { hearts: 0, next_refill: Math.floor(Date.now() / 1000) + 3600 };
  else if (url.pathname === "/shop/premium/t5-user")
    data = { premium: false, autopay: null, renewal: null };
  await fulfill(requestId, status, data);
}
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p?.reject(m.error) : p?.resolve(m.result);
  } else if (m.method === "Fetch.requestPaused")
    mock(m.params).catch((e) => exceptions.push(String(e)));
  else if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails);
  else if (m.method === "Runtime.consoleAPICalled") consoleMessages.push(m.params);
};
async function ev(expression) {
  const r = await cmd("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(expression) {
  const deadline = Date.now() + 20000;
  while (!(await ev(`!!(${expression})`))) {
    assert(Date.now() < deadline, expression);
    await pause(70);
  }
}
async function untilLocal(predicate, label) {
  const deadline = Date.now() + 20000;
  while (!predicate()) {
    assert(Date.now() < deadline, label);
    await pause(70);
  }
}
async function click(expression) {
  await ev(`(${expression}).scrollIntoView({block:'center',behavior:'instant'})`);
  await pause(100);
  const r = await ev(`(${expression}).getBoundingClientRect().toJSON()`);
  const x = r.x + r.width / 2,
    y = r.y + r.height / 2;
  assert(
    await ev(
      `(()=>{const e=(${expression});return e.contains(document.elementFromPoint(${x},${y}));})()`
    ),
    "pointer hit-testing " + expression
  );
  await cmd("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
  await cmd("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
  await pause(100);
}
async function key(key, code = key) {
  await cmd("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: key === "Tab" ? 9 : 13,
    nativeVirtualKeyCode: key === "Tab" ? 9 : 13,
    ...(key === "Enter" ? { text: "\r" } : {}),
  });
  await cmd("Input.dispatchKeyEvent", { type: "keyUp", key, code });
  await pause(100);
}
function token(expiry) {
  return (
    "eyJhbGciOiJub25lIn0." +
    Buffer.from(JSON.stringify({ exp: expiry })).toString("base64url") +
    ".x"
  );
}
async function cookie(name, value) {
  await cmd("Network.setCookie", {
    name,
    value: encodeURIComponent(value),
    url: appUrl,
    path: "/",
  });
}
async function setup(auth = "valid") {
  ratingDelay = 0;
  profileStatus = 200;
  declarationStatus = 200;
  declarationHeld = false;
  refreshHeld = false;
  refreshStatus = 401;
  await cmd("Network.clearBrowserCookies");
  await ev("sessionStorage.clear()").catch(() => {});
  await cookie("locale", "de");
  if (auth !== "anonymous") {
    await cookie("user", JSON.stringify(profile));
    await cookie(
      "accessToken",
      token(Math.floor(Date.now() / 1000) + (auth === "expired" ? -3600 : 100000))
    );
    await cookie("refreshToken", "t5-invalid-refresh");
  }
}
async function navigate(route) {
  await cmd("Page.navigate", { url: appUrl + route });
  await until(`document.querySelector('#__nuxt')?.__vue_app__`);
  await pause(1000);
}
async function routeTo(route) {
  await ev(`${state}.$router.push(${JSON.stringify(route)})`);
  await until(`location.pathname===${JSON.stringify(route.split("?")[0])}`);
  await pause(700);
}
async function expire() {
  await cookie("accessToken", token(Math.floor(Date.now() / 1000) - 3600));
}
async function backgroundProfile() {
  await ev(
    `import('/_nuxt/composables/user.ts').then(m => {${state}.runWithContext(() => {m.getUser();});});`
  );
}
async function assertPublic(route) {
  assert.equal(await ev("location.pathname"), route.split("?")[0]);
  assert.equal(
    await ev(`document.querySelectorAll('[role=dialog]').length`),
    0,
    "no terms/rating/global dialog"
  );
  assert(
    await ev(
      `!document.querySelector('#__nuxt[inert]') && getComputedStyle(document.documentElement).overflow!=='hidden'`
    ),
    "page released"
  );
}
async function fillForm() {
  await until(`document.querySelector('main form input[type=email]')`);
  for (const [selector, value] of [
    [`main form input[autocomplete=name]`, "T5 Browser Consumer"],
    ["main form input[type=email]", "consumer@example.invalid"],
  ]) {
    await click(`document.querySelector(${JSON.stringify(selector)})`);
    await ev(`document.querySelector(${JSON.stringify(selector)}).value=''`);
    await cmd("Input.insertText", { text: value });
    await key("Tab");
  }
}
const submit = `document.querySelector('main form button[type=submit]')`;
async function submitAndDuplicate() {
  await click(submit);
  // Enter/form requestSubmit racing with the pointer action must share the guard.
  await ev(
    `document.querySelector('main form')?.requestSubmit();document.querySelector('main form')?.requestSubmit()`
  );
}
async function receipt(route, expectedId) {
  await until(`document.querySelector('.declaration-record')`);
  await assertPublic(route);
  const text = await ev(`document.querySelector('.declaration-record').innerText`);
  assert(
    text.includes(expectedId) &&
      text.includes("consumer@example.invalid") &&
      text.includes("07.09.2026") &&
      text.includes("16:00:00"),
    text
  );
  assert(!(await ev(`document.querySelector('main form')`)));
  await ev(`window.__printCount=0;window.print=()=>window.__printCount++`);
  await click(`document.querySelector('.declaration-record button')`);
  assert.equal(await ev("window.__printCount"), 1);
  await cmd("Emulation.setEmulatedMedia", { media: "print" });
  assert(
    await ev(
      `(()=>{const r=document.querySelector('.declaration-record');return getComputedStyle(r).display!=='none' && getComputedStyle(r.querySelector('button')).display==='none';})()`
    )
  );
  await cmd("Emulation.setEmulatedMedia", { media: "" });
  if (evidence)
    await fs.writeFile(
      path.join(
        evidence,
        route.toLowerCase().includes("kuendigen")
          ? `cancellation-receipt-${sequence}.png`
          : `withdrawal-receipt-${sequence}.png`
      ),
      Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")
    );
}
try {
  await cmd("Page.enable");
  await cmd("Runtime.enable");
  await cmd("Network.enable");
  await cmd("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  await cmd("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  // Direct legal entry: old terms and pending ratings must neither mount nor fetch.
  for (const route of [
    "/vertrag-kuendigen",
    "/VERTRAG-KUENDIGEN",
    "/vertrag-widerrufen/",
    "/Vertrag-Widerrufen",
    "/docs/privacy",
    "/DoCs/Privacy/?source=footer#record",
    "/docs/terms-and-conditions",
  ]) {
    await setup();
    ratingCount = 2;
    const before = ratings().length;
    await navigate(route);
    await assertPublic(route);
    assert.equal(
      await ev(`${state}.$router.currentRoute.value.name`),
      route.split("?")[0].replace(/^\//, "").replace(/\/$/, "").toLowerCase().replaceAll("/", "-")
    );
    assert.equal(ratings().length, before);
    console.log("PASS direct public route", route, "old terms, zero rating reads/writes");
  }
  // Existing ratings are hidden when the user follows the real declaration link.
  await setup();
  ratingCount = 2;
  await navigate("/subscription");
  await until(`document.querySelectorAll('[role=dialog]').length===3`);
  assert(
    await ev(`document.activeElement.closest('[role=dialog]')?.innerText.includes('Neue AGB')`)
  );
  await ev(`${state}.$router.push('/vertrag-kuendigen')`);
  await pause(900);
  await assertPublic("/vertrag-kuendigen");
  const cached = await ev(`${state}.payload.state['$sunratedWebinars']?.length`);
  assert.equal(cached, 2);
  const beforeCached = ratings().length;
  await routeTo("/vertrag-widerrufen");
  await assertPublic("/vertrag-widerrufen");
  assert.equal(ratings().length, beforeCached);
  await routeTo("/subscription");
  await until(`document.querySelectorAll('[role=dialog]').length===3`);
  assert(
    await ev(`document.activeElement.closest('[role=dialog]')?.innerText.includes('Neue AGB')`)
  );
  console.log(
    "PASS cached ratings and terms hide on forms and restore coordinated focus on ordinary route"
  );
  // Optional Cancel works without the rating API. Explicit non-participation still reports errors.
  profile.terms_version = "2026-09";
  await setup();
  ratingCount = 2;
  await navigate("/subscription");
  await until(`document.querySelectorAll('[role=dialog]').length===2`);
  const beforeCancel = apiWrites().length;
  await click(
    `[...document.querySelector('[role=dialog]:not([inert])').querySelectorAll('button')].find(b=>b.innerText==='ABBRECHEN')`
  );
  await until(`document.querySelectorAll('[role=dialog]').length===1`);
  assert.equal(apiWrites().length, beforeCancel);
  await click(`document.querySelector('[role=dialog]:not([inert]) button')`);
  await pause(300);
  assert.equal(await ev(`document.querySelectorAll('[role=dialog]').length`), 1);
  await click(
    `[...document.querySelector('[role=dialog]:not([inert])').querySelectorAll('button')].find(b=>b.innerText==='ABBRECHEN')`
  );
  await until(`!document.querySelector('[role=dialog]')`);
  await click(`document.querySelector('nav[aria-label] a[href="/vertrag-kuendigen"] button')`);
  await until(`location.pathname==='/vertrag-kuendigen'`);
  await pause(800);
  await assertPublic("/vertrag-kuendigen");
  console.log(
    "PASS local Cancel releases both ratings despite API outage; real public link reachable"
  );
  // A response begun on an ordinary page arrives after navigation to a declaration.
  await setup();
  ratingCount = 2;
  ratingDelay = 2500;
  await navigate("/subscription");
  await routeTo("/vertrag-widerrufen");
  await pause(2200);
  await assertPublic("/vertrag-widerrufen");
  assert.equal(await ev(`${state}.payload.state['$sunratedWebinars'].length`), 2);
  console.log("PASS late rating response cannot cover public declaration");
  profile.terms_version = "2025-01";
  ratingCount = 2;
  for (const route of ["/vertrag-kuendigen", "/vertrag-widerrufen"]) {
    // Reproduce the exact reported mid-form expiry, with a hung/revoked refresh available.
    await setup();
    await navigate(route);
    await fillForm();
    await expire();
    refreshHeld = true;
    declarationHeld = true;
    const beforeRefresh = refreshes().length,
      beforePost = posts().length;
    await submitAndDuplicate();
    await untilLocal(() => heldDeclarations.length === 1, "one held declaration");
    assert.equal(refreshes().length, beforeRefresh, "public POST does not refresh");
    assert.equal(posts().length, beforePost + 1);
    assert.equal(await ev(`${submit}.disabled`), true);
    await heldDeclarations.shift()();
    await receipt(route, "receipt-" + (beforePost + 1));
    assert.equal(posts().length, beforePost + 1);
    console.log(
      "PASS",
      route,
      "mid-form expiry: accepted printable receipt, zero refresh, one POST"
    );
    // Use valid case variants for both refresh races without duplicating the full form matrix.
    const refreshRoute =
      route === "/vertrag-kuendigen" ? "/VERTRAG-KUENDIGEN" : "/Vertrag-Widerrufen/";
    for (const order of ["refresh-first", "receipt-first"]) {
      await setup();
      await navigate(refreshRoute);
      await fillForm();
      refreshHeld = true;
      refreshStatus = order === "refresh-first" ? 401 : 503;
      declarationHeld = true;
      if (order === "refresh-first") {
        await expire();
        await backgroundProfile();
        await untilLocal(() => heldRefreshes.length === 1, "held real shared refresh");
      }
      const before = posts().length;
      await submitAndDuplicate();
      await untilLocal(
        () => heldDeclarations.length === 1,
        "public request independent of refresh mutex"
      );
      if (order === "refresh-first") {
        await heldRefreshes.shift()();
        await until(`${state}.payload.state['$saccessToken']==null`);
        await assertPublic(refreshRoute);
        await heldDeclarations.shift()();
      } else {
        await heldDeclarations.shift()();
        await receipt(refreshRoute, "receipt-" + (before + 1));
        await expire();
        await backgroundProfile();
        await untilLocal(() => heldRefreshes.length === 1, "refresh after accepted receipt");
        await heldRefreshes.shift()();
        await until(`${state}.payload.state['$saccessToken']==null`);
      }
      await receipt(refreshRoute, "receipt-" + (before + 1));
      assert.equal(posts().length, before + 1);
      const cookies = (await cmd("Network.getCookies", { urls: [appUrl] })).cookies;
      assert(!cookies.some((c) => ["accessToken", "refreshToken"].includes(c.name)));
      console.log(
        "PASS",
        refreshRoute,
        order,
        "background refresh 401/503 clears credentials; receipt survives, one POST"
      );
    }
    // Expired cookie on initial load follows the same public policy before initial routing completes.
    await setup("expired");
    await navigate(refreshRoute);
    await assertPublic(refreshRoute);
    await fillForm();
    const before = posts().length;
    await click(submit);
    await receipt(refreshRoute, "receipt-" + (before + 1));
    assert.equal(posts().length, before + 1);
    console.log("PASS", refreshRoute, "initial expired session and anonymous receipt");
    // Failed public writes do not retry; a later explicit user retry remains possible.
    await setup("anonymous");
    await navigate(route);
    await fillForm();
    declarationStatus = 503;
    let prior = posts().length;
    await click(submit);
    await pause(500);
    assert.equal(posts().length, prior + 1);
    await assertPublic(route);
    assert(await ev(`!!document.querySelector('main form')`));
    declarationStatus = 200;
    await click(submit);
    await receipt(route, "receipt-" + (prior + 2));
    assert.equal(posts().length, prior + 2);
    assert.deepEqual(
      JSON.parse(posts().at(-1).body).request_key,
      JSON.parse(posts().at(-2).body).request_key,
      "explicit unchanged retry retains declaration capability"
    );
    console.log(
      "PASS",
      route,
      "503 makes one attempt, retains editable form, explicit retry succeeds"
    );
  }
  // A lost submit response is recovered explicitly by capability; reload never replays a write.
  await setup("anonymous");
  await navigate("/vertrag-kuendigen");
  await fillForm();
  declarationStatus = 503;
  await click(submit);
  await pause(300);
  const beforeRecovery = posts().length;
  await navigate("/vertrag-kuendigen");
  assert.equal(posts().length, beforeRecovery);
  await click(
    `Array.from(document.querySelectorAll('main button')).find(b=>b.innerText.toLowerCase().includes('beleg abrufen'))`
  );
  await receipt("/vertrag-kuendigen", "recovered-receipt");
  assert.equal(posts().length, beforeRecovery + 1);
  assert.equal(posts().at(-1).path, "/contracts/receipts");
  assert.deepEqual(JSON.parse(posts().at(-1).body), JSON.parse(posts().at(-2).body).request_key);
  assert(!(await ev(`document.querySelector('main').innerText`)).includes("PRIVATE-"));
  // Also whitelist historical cached responses: neither account data nor capability is returned.
  await ev(
    `(()=>{const key='public-declaration-v1:/contracts/cancellations';const old=JSON.parse(sessionStorage.getItem(key));old.receipt.declaration.user_id='PRIVATE-ACCOUNT';old.receipt.declaration.effective_end='2099-01-01T00:00:00Z';old.receipt.declaration.processing_note='PRIVATE-NOTE';sessionStorage.setItem(key,JSON.stringify(old));})()`
  );
  await navigate("/vertrag-kuendigen");
  await click(
    `Array.from(document.querySelectorAll('main button')).find(b=>b.innerText.toLowerCase().includes('beleg abrufen'))`
  );
  await receipt("/vertrag-kuendigen", "recovered-receipt");
  const recovered = await ev(
    `import('/_nuxt/composables/contracts.ts').then(m=>m.recoverDeclarationReceipt('/contracts/cancellations'))`
  );
  assert.deepEqual(
    Object.keys(recovered[0].declaration).sort(),
    [
      "id",
      "kind",
      "received_at",
      "name",
      "email",
      "contract",
      "contract_designation",
      "cancellation_type",
      "details",
      "requested_end",
    ]
      .filter((k) => recovered[0].declaration[k] !== undefined)
      .sort()
  );
  assert.equal(posts().length, beforeRecovery + 1, "cached receipt recovery is read only");
  console.log(
    "PASS T12 same-capability explicit retry, lost-response reload and read-only recovery, legacy-cache public whitelist"
  );
  // Server-side invalid_token path (rather than preflight expiry) must also preserve a receipt.
  await setup();
  await navigate("/vertrag-kuendigen");
  await fillForm();
  await click(submit);
  await until(`document.querySelector('.declaration-record')`);
  profileStatus = 401;
  await backgroundProfile();
  await until(`${state}.payload.state['$saccessToken']==null`);
  await pause(500);
  await assertPublic("/vertrag-kuendigen");
  assert(await ev(`!!document.querySelector('.declaration-record')`));
  console.log("PASS reactive invalid-token/logout path preserves accepted receipt");
  // Ordinary private routes still clear invalid credentials and go to login.
  profile.terms_version = "2026-09";
  ratingCount = 0;
  for (const [route, account] of [
    ["/subscription", "/account"],
    ["/SuBsCrIpTiOn", "/AcCoUnT"],
  ]) {
    await setup();
    await navigate(route);
    await expire();
    await backgroundProfile();
    await until(`location.pathname==='/auth/login'`);
    assert.equal(await ev(`${state}.payload.state['$saccessToken']`), null);
    await ev(`${state}.$router.push(${JSON.stringify(account)})`);
    await until(`location.pathname==='/auth/login'`);
    console.log(
      "PASS",
      route,
      account,
      "private refresh failure and auth middleware still redirect"
    );
  }
  for (const request of posts()) {
    assert(
      !Object.keys(request.headers).some((k) =>
        ["authorization", "cookie"].includes(k.toLowerCase())
      ),
      JSON.stringify(request)
    );
  }
  assert.deepEqual(exceptions, []);
  console.log(
    "PASS all public declaration regressions; public POSTs have no credentials; zero browser exceptions"
  );
} finally {
  if (evidence) {
    await fs.mkdir(evidence, { recursive: true });
    await fs.writeFile(
      path.join(evidence, "browser-details.json"),
      JSON.stringify({ requests, exceptions, consoleMessages, blocked }, null, 2)
    );
  }
  ws.close();
}
