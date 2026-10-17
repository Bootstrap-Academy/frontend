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
// Premium is bought through an offer and its acceptance, as the backend issues them: the
// offer names the monthly renewal the account has, and an acceptance whose renewal no longer
// matches fails without a charge (`refusal: "offer_changed"`).
let offers = [];
const states = new Map();

const declaration =
  "Ich verlange ausdrücklich, dass mit der bestellten Leistung vor Ablauf der Widerrufsfrist begonnen wird. Meine gesetzlichen Widerrufs- und Mängelrechte bleiben unberührt.";
const monthlyRenewal = () => (autopay === "MONTHLY" ? 1000 : null);
function premiumOffer(kind) {
  const yearly = kind === "premium_yearly";
  const renewal = monthlyRenewal();
  const unit = yearly ? "Jahr" : "Monat";
  const lines = [
    { role: "product", text: "Premium" },
    { role: "detail", text: "Unbegrenzte Herzen." },
    {
      role: "term",
      text: renewal
        ? `Laufzeit: 1 ${unit}. Danach läuft deine monatliche Verlängerung weiter (1.000 Morphcoins je Monat).`
        : `Laufzeit: 1 ${unit}, ohne automatische Verlängerung.`,
    },
    {
      role: "detail",
      text: "Premium startet direkt nach der Bestätigungsmail, spätestens in 24 Stunden. Läuft schon Premium, schließt die neue Zeit daran an.",
    },
    {
      role: "price",
      text: yearly
        ? "Gesamtpreis: 10.000 Morphcoins (100,00 € inkl. 19 % MwSt.; 8,33 € je Monat), keine weiteren Kosten."
        : "Gesamtpreis: 1.000 Morphcoins (10,00 € inkl. 19 % MwSt.), keine weiteren Kosten.",
    },
    { role: "payment", text: "Du zahlst aus deinem Guthaben." },
  ];
  const offer = {
    id: `96000000-0000-4000-8000-${String(offers.length + 1).padStart(12, "0")}`,
    hash: `renewal-test-hash-${offers.length + 1}`,
    text: lines.map((line) => line.text).join("\n"),
    declaration,
    recipient: `${profile.display_name} <${profile.email}>`,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    user_id: profile.id,
    source: "backend",
    document_hash: "renewal-test-documents",
    provision_window_seconds: 86400,
    product: {
      kind,
      reference: kind,
      title: yearly ? "Premium für ein Jahr" : "Premium für einen Monat",
      description: "Unbegrenzte Herzen.",
      coins: yearly ? 10000 : 1000,
      facts: {
        months: yearly ? 12 : 1,
        automatic_renewal: false,
        renewal: renewal ? { monthly_price: renewal } : null,
      },
      revision: "renewal-test",
      service_starts_at: null,
    },
    summary: { de: { lines, declaration }, en: { lines, declaration } },
  };
  offers.push(offer);
  states.set(offer.id, "offered");
  return offer;
}

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
  else if (url.pathname === "/shop/learning/policy")
    data = { mode: "legacy", premium: true, heart_sales: true, single_course_sales: true };
  else if (url.pathname === "/shop/coins/config") data = { coins_per_euro: 100, vat_percent: 19 };
  else if (url.pathname === "/shop/hearts/config")
    data = { hearts_max: 6, hearts_refill_price: 50 };
  else if (url.pathname === "/shop/premium/renewal-offer/me")
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
  } else if (
    /^\/shop\/purchases\/offers\/premium_(monthly|yearly)$/.test(url.pathname) &&
    request.method === "POST"
  ) {
    data = { state: "offered", offer: premiumOffer(url.pathname.split("/").pop()) };
  } else if (url.pathname === "/shop/purchases" && request.method === "GET") {
    data = offers.map((offer) => ({ state: states.get(offer.id), offer }));
  } else if (/^\/shop\/purchases\/[0-9a-f-]{36}$/.test(url.pathname)) {
    const offer = offers.find((candidate) => candidate.id === url.pathname.split("/").pop());
    data = offer ? { state: states.get(offer.id), offer } : { detail: "Not found" };
    if (!offer) status = 404;
  } else if (url.pathname === "/shop/purchases/accept" && request.method === "POST") {
    const offer = offers.find((candidate) => candidate.id === body.order_id);
    trace.before = autopay;
    trace.kind = offer?.product.kind;
    if (cancelDuringPurchase) autopay = null;
    if (failPurchase) status = 400;
    else if (!offer || states.get(offer.id) !== "offered") status = 409;
    else if ((offer.product.facts.renewal?.monthly_price ?? null) !== monthlyRenewal()) {
      // The renewal the offer names is no longer the account's: refused, nothing charged.
      states.set(offer.id, "failed");
      data = {
        state: "failed",
        offer,
        review_reason: "Offer expired or changed; no charge",
        refusal: "offer_changed",
      };
    } else {
      // Buying Premium never changes the separately ordered renewal.
      states.set(offer.id, "fulfilled");
      data = { state: "fulfilled", offer };
    }
    trace.after = autopay;
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

/** Like `until`, for a condition on this side, such as the requests counted so far. */
async function untilHere(condition, label) {
  const deadline = Date.now() + 20000;
  while (!condition()) {
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
  requests.filter(
    (request) => request.method === "POST" && request.path === "/shop/purchases/accept"
  );
const offerRequests = () =>
  requests.filter(
    (request) => request.method === "POST" && request.path.startsWith("/shop/purchases/offers/")
  );
const puts = () => requests.filter((request) => request.method === "PUT");

async function fresh(initial) {
  autopay = initial;
  confirmed = true;
  offerId = "test-current-offer";
  failRead = failWrite = loseWriteResponse = failPurchase = cancelDuringPurchase = false;
  holdWrite = null;
  offers = [];
  states.clear();
  await cmd("Page.navigate", { url: `${appUrl}/subscription` });
  // Recovery entries of an earlier scenario belong to offers this one does not know.
  await until("document.readyState === 'complete'");
  await evaluate("localStorage.clear(), true");
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
    // The plan toggle is a group of buttons; the renewal switch has no "Jährlich".
    await evaluate(
      '[...document.querySelectorAll("[role=group] button")].find(b => b.textContent.trim() === "Jährlich").click()'
    );
    await until(`${purchaseButton}?.innerText.includes("10.000")`);
  }
  await evaluate(`${purchaseButton}.click()`);
  await until(`${modalText}`);
}

/** The term line of the offer in the dialog names the monthly renewal, or that there is none. */
async function expectSummary(enabled) {
  const term = enabled
    ? "Danach läuft deine monatliche Verlängerung weiter (1.000 Morphcoins je Monat)."
    : "ohne automatische Verlängerung.";
  await until(`${modalText}?.includes(${JSON.stringify(term)})`, `term line ${term}`);
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

/** Accepts the offer in the dialog: one acceptance of the shown offer, the renewal unchanged. */
async function purchase(expectedPlan, expectedRenewal) {
  const before = writes().length;
  await consent();
  await confirm();
  await until(`!${modalText}`);
  assert.equal(writes().length, before + 1);
  const offer = offers.at(-1);
  assert.deepEqual(writes().at(-1).body, {
    order_id: offer.id,
    offer_hash: offer.hash,
    accepted: true,
    early_performance_requested: true,
  });
  assert.equal(
    writes().at(-1).kind,
    expectedPlan === "YEARLY" ? "premium_yearly" : "premium_monthly"
  );
  assert.equal(states.get(offer.id), "fulfilled");
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
  // A sign-in writes the session with the tokens; the learning policy is read for its owner.
  for (const [name, value] of Object.entries({
    user: JSON.stringify(profile),
    session: JSON.stringify({ id: "renewal-test-session" }),
    accessToken: token,
    refreshToken: "test-refresh",
    authGeneration: "renewal-test-generation",
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
  // A yearly setting has no monthly renewal agreement, so the offer names none; buying
  // Premium leaves the setting as it is.
  await scenario("yearly setting -> monthly extension keeps the yearly setting", async () => {
    await fresh("YEARLY");
    await prepare();
    await expectSummary(false);
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
      const quoted = offerRequests().length;
      await evaluate(`${purchaseButton}.click()`);
      await until(`${purchaseButton} && !${purchaseButton}.disabled`);
      assert.equal(await evaluate(`!!${modalText}`), false);
      assert.equal(writes().length, before);
      assert.equal(offerRequests().length, quoted, "no offer without a known renewal");
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
        // A new offer with the new term line and the notice above the empty boxes.
        await expectSummary(!!changed);
        await until(`${modalText}?.includes("Das Angebot war nicht mehr aktuell.")`);
        await until(`${orderButton}?.getAttribute("aria-disabled") === "true"`);
        assert.equal(writes().length, before);
        assert.equal(offers.length, 2);
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
    // The held request reaches the count here only once the browser has sent it; under load
    // that can come after the buttons are disabled.
    await untilHere(() => puts().length === beforePuts + 1, "the first change is sent");
    await evaluate(`${renewalButtons}[0].click(); ${purchaseButton}.click()`);
    // Give a second request, should one go out, the time to be counted.
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(puts().length, beforePuts + 1);
    assert.equal(writes().length, beforeWrites);
    assert.equal(await evaluate(`!!${modalText}`), false);
    release();
    holdWrite = null;
    await expectSelected(null);
  });
  // The renewal ends after the confirmation read, while the acceptance is on its way: the
  // server refuses the offer that still names it, nothing is charged, and the dialog shows a
  // new offer without a renewal. The purchase never brings the renewal back.
  await scenario(
    "cancellation after the confirmation read is never undone by purchase",
    async () => {
      await fresh("MONTHLY");
      await prepare();
      await expectSummary(true);
      await consent();
      cancelDuringPurchase = true;
      const before = writes().length;
      await confirm();
      await until(`${modalText}?.includes("Das Angebot war nicht mehr aktuell.")`);
      await expectSummary(false);
      assert.equal(writes().length, before + 1);
      assert.equal(states.get(offers[0].id), "failed");
      cancelDuringPurchase = false;
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
      'document.body.innerText.includes("Wir konnten den Abschluss noch nicht bestätigen.")'
    );
    assert.equal(writes().length, before + 1);
    assert.equal(autopay, null);
    assert(await evaluate(`!!${modalText}`));
  });
  // Another confirmation of the same monthly renewal (same price) leaves the term line true,
  // so the offer stays and its acceptance goes through.
  await scenario(
    "agreement identity change with the same monthly price keeps the offer",
    async () => {
      await fresh("MONTHLY");
      await prepare();
      renewalId = "22222222-2222-4222-8222-222222222222";
      await purchase("MONTHLY", "MONTHLY");
      assert.equal(offers.length, 1);
    }
  );
  await scenario("pending confirmation is shown without promising enabled charges", async () => {
    await fresh(null);
    confirmed = false;
    await toggle("MONTHLY");
    await until('document.body.innerText.includes("ist noch nicht bestätigt")');
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
    await until(
      '[...document.querySelectorAll("#premium-renewal-order input[type=checkbox]")].length === 3 && [...document.querySelectorAll("#premium-renewal-order input[type=checkbox]")].every(b => !b.checked)'
    );
    assert.equal(puts().length, before);
    assert.equal(autopay, null);
  });
  assert.deepEqual(exceptions, []);
  console.log("PASS no browser exceptions; all requests mocked; no live payments");
} finally {
  ws.close();
}
