// Node 22+, local Nuxt app and a headless Chromium with remote debugging.
// Example:
// NUXT_PUBLIC_BASE_API_URL=http://127.0.0.1:3198 npm run dev -- --port 3174
// chromium --headless --no-sandbox --remote-debugging-port=9228 \
//   --user-data-dir=/tmp/premium-renewal-chrome about:blank
// node tests/premium-renewal.browser.mjs
// All API calls are mocked; non-local traffic is blocked. No live transactions.
import assert from "node:assert/strict";

const appUrl = process.env.TEST_APP_URL ?? "http://127.0.0.1:3174";
const debuggerUrl = process.env.TEST_DEBUGGER_URL ?? "http://127.0.0.1:9228";
const targets = await (await fetch(`${debuggerUrl}/json/list`)).json();
const ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
await new Promise((resolve) => (ws.onopen = resolve));
let sequence = 0;
const pending = new Map();
const exceptions = [];
const requests = [];
const profile = {
  id: "renewal-test-user",
  name: "RenewalTest",
  display_name: "Renewal Test",
  email: "renewal@example.invalid",
  email_verified: true,
  terms_version: "2026-09",
  age_confirmed: true,
  business: false,
  country: "DE",
  admin: false,
  avatar_url: null,
};
let renewalId = "11111111-1111-4111-8111-111111111111";
let confirmed = true;
let offerId = "test-current-offer";
let autopay = "MONTHLY";
let failRead = false;
let failWrite = false;
let loseWriteResponse = false;
let failPurchase = false;
let cancelDuringPurchase = false;
let holdWrite = null;

function cmd(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function mockRequest(params) {
  const { request, requestId } = params;
  const url = new URL(request.url);
  if (url.origin === appUrl || url.protocol === "data:") {
    return cmd("Fetch.continueRequest", { requestId });
  }
  // Support both the explicit local mock URL and the repo's default API URL.
  if (url.origin !== "http://127.0.0.1:3198" && !url.hostname.endsWith("bootstrap.academy")) {
    return cmd("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
  }

  const body = request.postData ? JSON.parse(request.postData) : null;
  const trace = { path: url.pathname, method: request.method, body };
  requests.push(trace);
  let status = 200;
  let data = {};
  if (request.method === "OPTIONS") data = "";
  else if (url.pathname === "/auth/users/me") data = profile;
  else if (url.pathname === "/auth/oauth/providers") data = [];
  else if (url.pathname === "/shop/coins/config") data = { coins_per_euro: 100, vat_percent: 19 };
  else if (url.pathname === "/shop/hearts/config")
    data = { hearts_max: 6, hearts_refill_price: 50 };
  else if (url.pathname === "/shop/premium/renewal-offer")
    data = {
      id: offerId,
      monthly_price: 1000,
      terms_version: "2026-09",
      text: "Monatliche automatische Verlängerung für 1000 MorphCoins (10,00 EUR) je Kalendermonat. Unbestimmte Zeit. Jederzeit zum Ende des bezahlten Zeitraums kündbar.",
    };
  else if (url.pathname === "/shop/premium_plans") {
    data = { MONTHLY: { price: 1000, months: 1 }, YEARLY: { price: 10000, months: 12 } };
  } else if (url.pathname === `/shop/coins/${profile.id}`) data = { coins: 50000 };
  else if (url.pathname === `/shop/hearts/${profile.id}`) data = { hearts: 6 };
  else if (url.pathname === `/shop/premium/${profile.id}`) {
    data = premiumStatus();
    if (failRead) status = 400;
  } else if (url.pathname === "/shop/premium/autopay") {
    trace.before = autopay;
    if (holdWrite) await holdWrite;
    if (!failWrite) {
      if (body.plan === "MONTHLY") {
        assert.equal(body.consent?.offer_id, offerId);
        assert.equal(body.consent?.accepted, true);
        assert.equal(body.consent?.withdrawal_consent, true);
        assert.match(body.consent?.request_id, /^[a-f0-9-]{36}$/);
        renewalId = body.consent.request_id;
      }
      autopay = body.plan;
    }
    data = { ok: true };
    trace.after = autopay;
    if (failWrite || loseWriteResponse) status = 400;
  } else if (url.pathname === "/shop/premium" && request.method === "POST") {
    trace.before = autopay;
    if (cancelDuringPurchase) autopay = null;
    // Matches PremiumFeatureServiceImpl::purchase: false preserves renewal.
    if (!failPurchase && body.autopay) autopay = body.plan;
    data = premiumStatus();
    trace.after = autopay;
    if (failPurchase) status = 400;
  } else if (url.pathname.includes("unrated")) data = [];
  if (status !== 200) data = { detail: "Test request failed", error: "test_failure" };
  trace.status = status;
  return cmd("Fetch.fulfillRequest", {
    requestId,
    responseCode: status,
    responseHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "Access-Control-Allow-Origin", value: "*" },
      { name: "Access-Control-Allow-Headers", value: "*" },
      { name: "Access-Control-Allow-Methods", value: "*" },
    ],
    body: Buffer.from(typeof data === "string" ? data : JSON.stringify(data)).toString("base64"),
  });
}

function premiumStatus() {
  const now = Math.floor(Date.now() / 1000);
  return {
    premium: true,
    autopay,
    renewal:
      autopay === "MONTHLY"
        ? { id: renewalId, monthly_price: 1000, confirmation_sent: confirmed }
        : null,
    since: now - 86400,
    until: now + 86400 * 30,
  };
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const handler = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handler?.reject(message.error);
    else handler?.resolve(message.result);
  } else if (message.method === "Fetch.requestPaused") {
    mockRequest(message.params).catch((error) => exceptions.push(error));
  } else if (message.method === "Runtime.exceptionThrown") {
    exceptions.push(message.params.exceptionDetails);
  }
};

async function evaluate(expression) {
  const result = await cmd("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function until(expression, label = expression) {
  const deadline = Date.now() + 20000;
  while (!(await evaluate(expression))) {
    assert(Date.now() < deadline, `Timed out: ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

const renewalButtons =
  '[...document.querySelectorAll("[aria-labelledby=premium-renewal-label] button")]';
const purchaseButton =
  '[...document.querySelectorAll("button")].find(b => b.innerText.includes("Morphcoins") && b.querySelector("img"))';
const orderButton =
  '[...document.querySelectorAll(".modal-content button")].find(b => b.innerText.includes("ZAHLUNGSPFLICHTIG"))';
const modalText = 'document.querySelector(".modal-content")?.innerText';
const selected = `${renewalButtons}.find(b => b.getAttribute("aria-pressed") === "true")?.innerText`;
const writes = () =>
  requests.filter((request) => request.method === "POST" && request.path === "/shop/premium");
const puts = () => requests.filter((request) => request.method === "PUT");

async function fresh(initial) {
  autopay = initial;
  confirmed = true;
  offerId = "test-current-offer";
  failRead = failWrite = loseWriteResponse = failPurchase = cancelDuringPurchase = false;
  holdWrite = null;
  await cmd("Page.navigate", { url: `${appUrl}/subscription` });
  await until(`${renewalButtons}.length === 2 && ${renewalButtons}.every(b => !b.disabled)`);
  await expectSelected(initial);
}

async function expectSelected(plan) {
  if (plan === "YEARLY") {
    await until(`${selected} === undefined`);
    return;
  }
  const label = plan === "MONTHLY" ? "Monatlich" : "Abschalten";
  await until(`${selected} === ${JSON.stringify(label)}`, `selected renewal ${label}`);
}

async function toggle(plan) {
  const index = plan === "MONTHLY" ? 0 : 1;
  const before = puts().length;
  await evaluate(`${renewalButtons}[${index}].click()`);
  if (plan === "MONTHLY") {
    await until('document.querySelector("#premium-renewal-order")');
    assert.equal(puts().length, before, "Opening offer must not activate renewal");
    assert(
      await evaluate(
        '[...document.querySelectorAll("#premium-renewal-order input[type=checkbox]")].every(b => !b.checked)'
      )
    );
    await evaluate(
      '[...document.querySelectorAll("#premium-renewal-order input[type=checkbox]")].forEach(b => b.click())'
    );
    await until(
      '[...document.querySelectorAll("#premium-renewal-order button")].find(b => b.innerText.includes("ZAHLUNGSPFLICHTIG"))?.getAttribute("aria-disabled") === "false"'
    );
    await evaluate(
      '[...document.querySelectorAll("#premium-renewal-order button")].find(b => b.innerText.includes("ZAHLUNGSPFLICHTIG")).click()'
    );
    await until('!document.querySelector("#premium-renewal-order")');
  }
  await until(`${renewalButtons}.every(b => !b.disabled)`);
}

async function prepare(yearly = false) {
  if (yearly) {
    await evaluate(
      '[...document.querySelectorAll("p")].find(p => p.innerText === "Jährlich").click()'
    );
    await until(`${purchaseButton}?.innerText.includes("10.000")`);
  }
  await evaluate(`${purchaseButton}.click()`);
  await until(`${modalText}`);
}

async function expectSummary(enabled) {
  const prefix = enabled
    ? autopay === "YEARLY"
      ? "bisherige Einstellung"
      : "Monatliche Verlängerung:"
    : "Aus –";
  await until(`${modalText}?.includes(${JSON.stringify(prefix)})`, `summary ${prefix}`);
}

async function consent() {
  await evaluate(
    '[...document.querySelectorAll(".modal-content input[type=checkbox]")].filter(b => !b.checked).forEach(b => b.click())'
  );
  await until(`${orderButton}?.getAttribute("aria-disabled") === "false"`);
}

async function confirm() {
  await evaluate(`${orderButton}.click()`);
}

async function purchase(expectedPlan, expectedRenewal) {
  const before = writes().length;
  await consent();
  await confirm();
  await until(`!${modalText}`);
  assert.equal(writes().length, before + 1);
  assert.deepEqual(writes().at(-1).body, {
    plan: expectedPlan,
    autopay: false,
    withdrawal_consent: true,
    withdrawal_text_version: "2026-09",
  });
  assert.equal(autopay, expectedRenewal);
  await expectSelected(expectedRenewal);
}

async function scenario(name, run) {
  const start = requests.length;
  await run();
  console.log(`PASS ${name}`);
  console.log(
    JSON.stringify(
      requests.slice(start).filter((request) => request.path.startsWith("/shop/premium"))
    )
  );
}

try {
  await cmd("Page.enable");
  await cmd("Runtime.enable");
  await cmd("Network.enable");
  await cmd("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  await cmd("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1500,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cmd("Network.clearBrowserCookies");
  const token = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 100000 })).toString("base64url")}.x`;
  for (const [name, value] of Object.entries({
    user: JSON.stringify(profile),
    accessToken: token,
    refreshToken: "test-refresh",
    locale: "de",
  })) {
    await cmd("Network.setCookie", {
      name,
      value: encodeURIComponent(value),
      url: appUrl,
      path: "/",
    });
  }

  for (const initial of ["MONTHLY", "YEARLY"]) {
    await scenario(`${initial} -> off -> monthly extension stays off`, async () => {
      await fresh(initial);
      await toggle(null);
      assert.equal(autopay, null);
      await expectSelected(null);
      await prepare();
      await expectSummary(false);
      await purchase("MONTHLY", null);
    });
  }
  await scenario(
    "off -> monthly renewal -> yearly extension preserves monthly renewal",
    async () => {
      await fresh(null);
      await toggle("MONTHLY");
      await expectSelected("MONTHLY");
      await prepare(true);
      await expectSummary(true);
      await purchase("YEARLY", "MONTHLY");
    }
  );
  await scenario("yearly renewal -> monthly extension preserves yearly setting", async () => {
    await fresh("YEARLY");
    await prepare();
    await expectSummary(true);
    await purchase("MONTHLY", "YEARLY");
  });
  await scenario("rejected toggle restores confirmed selection and reports failure", async () => {
    await fresh("MONTHLY");
    failWrite = true;
    await toggle(null);
    await expectSelected("MONTHLY");
    await until(
      'document.body.innerText.includes("Die Änderung der automatischen Verlängerung konnte nicht bestätigt werden")'
    );
    await prepare();
    await expectSummary(true);
    await purchase("MONTHLY", "MONTHLY");
  });
  await scenario("uncertain write response reloads the committed setting", async () => {
    await fresh("MONTHLY");
    loseWriteResponse = true;
    await toggle(null);
    await expectSelected(null);
    await until(
      'document.body.innerText.includes("Die Änderung der automatischen Verlängerung konnte nicht bestätigt werden")'
    );
    await prepare();
    await expectSummary(false);
    await purchase("MONTHLY", null);
  });
  await scenario(
    "failed refresh after toggle shows unknown and blocks checkout until recovery",
    async () => {
      await fresh("MONTHLY");
      failRead = true;
      await toggle(null);
      assert.equal(autopay, null);
      assert.equal(
        await evaluate(`${renewalButtons}.some(b => b.getAttribute("aria-pressed") === "true")`),
        false
      );
      await until('document.querySelector("[role=alert]")?.innerText.includes("Premium-")');
      const before = writes().length;
      await evaluate(`${purchaseButton}.click()`);
      await until(`${purchaseButton} && !${purchaseButton}.disabled`);
      assert.equal(await evaluate(`!!${modalText}`), false);
      assert.equal(writes().length, before);
      failRead = false;
      await evaluate('document.querySelector("[role=alert] button").click()');
      await expectSelected(null);
      await prepare();
      await expectSummary(false);
      await purchase("MONTHLY", null);
    }
  );
  for (const [initial, changed] of [
    ["MONTHLY", null],
    [null, "MONTHLY"],
  ]) {
    await scenario(
      `${initial} -> ${changed} while summary is open requires new consent`,
      async () => {
        await fresh(initial);
        await prepare();
        await expectSummary(!!initial);
        await consent();
        autopay = changed;
        const before = writes().length;
        await confirm();
        await expectSummary(!!changed);
        await until(`${orderButton}?.getAttribute("aria-disabled") === "true"`);
        assert.equal(writes().length, before);
        assert.equal(
          await evaluate(
            '[...document.querySelectorAll(".modal-content input[type=checkbox]")].every(b => !b.checked)'
          ),
          true
        );
        await purchase("MONTHLY", changed);
      }
    );
  }
  await scenario(
    "confirmation read failure keeps order reviewable without a purchase",
    async () => {
      await fresh(null);
      await prepare();
      await consent();
      failRead = true;
      const before = writes().length;
      await confirm();
      await until(
        'document.body.innerText.includes("Der aktuelle Premium- und Verlängerungsstatus konnte nicht geladen werden")'
      );
      await until(`${orderButton}`);
      assert.equal(writes().length, before);
      assert(await evaluate(`!!${modalText}`));
      failRead = false;
      await purchase("MONTHLY", null);
    }
  );
  await scenario("pending toggle blocks overlapping changes and purchase preparation", async () => {
    await fresh("MONTHLY");
    let release;
    holdWrite = new Promise((resolve) => (release = resolve));
    const beforePuts = puts().length;
    const beforeWrites = writes().length;
    await evaluate(`${renewalButtons}[1].click()`);
    await until(`${renewalButtons}.every(b => b.disabled) && ${purchaseButton}.disabled`);
    await evaluate(`${renewalButtons}[0].click(); ${purchaseButton}.click()`);
    assert.equal(puts().length, beforePuts + 1);
    assert.equal(writes().length, beforeWrites);
    assert.equal(await evaluate(`!!${modalText}`), false);
    release();
    holdWrite = null;
    await expectSelected(null);
  });
  await scenario(
    "cancellation after the confirmation read is never undone by purchase",
    async () => {
      await fresh("MONTHLY");
      await prepare();
      await expectSummary(true);
      cancelDuringPurchase = true;
      await purchase("MONTHLY", null);
    }
  );
  await scenario("purchase rejection stays visible and does not change renewal", async () => {
    await fresh(null);
    await prepare();
    await consent();
    failPurchase = true;
    const before = writes().length;
    await confirm();
    await until(
      'document.body.innerText.includes("Die Premium-Bestellung konnte nicht bestätigt werden")'
    );
    assert.equal(writes().length, before + 1);
    assert.equal(autopay, null);
    assert(await evaluate(`!!${modalText}`));
  });
  await scenario(
    "agreement identity change with same monthly plan requires fresh checkout consent",
    async () => {
      await fresh("MONTHLY");
      await prepare();
      await consent();
      renewalId = "22222222-2222-4222-8222-222222222222";
      const before = writes().length;
      await confirm();
      await until(`${orderButton}?.getAttribute("aria-disabled") === "true"`);
      assert.equal(writes().length, before);
      await purchase("MONTHLY", "MONTHLY");
    }
  );
  await scenario("pending confirmation is shown without promising enabled charges", async () => {
    await fresh(null);
    confirmed = false;
    await toggle("MONTHLY");
    await until('document.body.innerText.includes("noch im Versand")');
    await toggle(null);
    assert.equal(autopay, null);
  });
  await scenario("stale offer requires review and never activates renewal", async () => {
    await fresh(null);
    const before = puts().length;
    await evaluate(`${renewalButtons}[0].click()`);
    await until('document.querySelector("#premium-renewal-order")');
    await evaluate(
      '[...document.querySelectorAll("#premium-renewal-order input[type=checkbox]")].forEach(b => b.click())'
    );
    offerId = "changed-offer";
    await evaluate(
      '[...document.querySelectorAll("#premium-renewal-order button")].find(b => b.innerText.includes("ZAHLUNGSPFLICHTIG")).click()'
    );
    await until('!document.querySelector("#premium-renewal-order")');
    assert.equal(puts().length, before);
    assert.equal(autopay, null);
  });
  assert.deepEqual(exceptions, []);
  console.log("PASS no browser exceptions; all requests mocked; no live payments");
} finally {
  ws.close();
}
