// An account whose e-mail address is not confirmed: where its pages lead, when a code is sent
// by itself, and what the confirmation page says. Everything the code reaches is a stand-in.
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { test } from "node:test";
import * as Vue from "vue";
import { isPublicLegalRoute } from "../composables/publicLegalRoutes.ts";
import { internalPath } from "../composables/loginRedirect.ts";
import { decodeApiError } from "../utils/apiError.ts";
import { evaluate, host, settle, tag } from "./helpers/mounted-page.mjs";

const HOUR = 60 * 60 * 1000;
const KEY = "verification-mail";
const account = (patch = {}) => ({
  id: "learner",
  name: "learner",
  display_name: "Learner",
  email: "learner@example.invalid",
  email_verified: false,
  admin: false,
  ...patch,
});
const cookie = ({ id, name, display_name }) => ({ id, name, display_name });

/** Local Storage as one browser has it; `blocked` is a browser that refuses it. */
function browserStorage(blocked = false) {
  const data = new Map();
  const local = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
  return {
    data,
    note: (id, at = Date.now()) => data.set(KEY, JSON.stringify({ id, at })),
    noted: () => JSON.parse(data.get(KEY) ?? "null")?.id ?? null,
    window: blocked
      ? {
          get localStorage() {
            throw new Error("blocked");
          },
        }
      : { localStorage: local },
  };
}
const rules = (storage = browserStorage()) =>
  evaluate("composables/emailVerification.ts", {
    isPublicLegalRoute,
    internalPath,
    window: storage.window,
  });

test("only a loaded profile with an unconfirmed address needs the confirmation", async () => {
  const { needsEmailVerification } = await rules();
  assert.equal(needsEmailVerification(account(), true), true);
  for (const [user, loaded] of [
    [account({ email_verified: true }), true],
    // The `user` cookie does not carry the field.
    [cookie(account()), true],
    [cookie(account()), false],
    [account(), false],
    [null, true],
    [undefined, true],
    [{ email_verified: false }, true],
  ])
    assert.equal(needsEmailVerification(user, loaded), false, JSON.stringify([user, loaded]));
});

test("an unconfirmed account keeps the public pages, its account and the way to correct it", async () => {
  const { openToUnverified } = await rules();
  for (const path of [
    "/",
    "/auth/login",
    "/auth/signup",
    "/auth/verify-account",
    "/AUTH/Verify-Account",
    "/account",
    "/account/mfa/disabled",
    "/profile/edit",
    "/orders",
    "/contact",
    "/start",
    "/morphcoins/paypal",
    "/docs/privacy",
    "/docs/terms-and-conditions",
    "/moderation",
    "/moderation/access",
    "/oauth/callback",
    "/vertrag-kuendigen",
    "/vertrag-widerrufen",
  ])
    for (const suffix of ["", "/", "?coins=500", "#section"])
      assert.equal(openToUnverified(path + suffix), true, path + suffix);
  for (const path of [
    "/dashboard",
    "/courses",
    "/courses/python",
    "/courses/python/watch",
    "/learn",
    "/skill-tree",
    "/challenges/all",
    "/subscription",
    "/morphcoins/buy",
    "/profile",
    "/profile/courses",
    "/profile/challenges",
    "/accounting",
    "/authors",
    "/start/again",
    "/orders/1",
  ])
    for (const suffix of ["", "/", "?from=mail", "#section"])
      assert.equal(openToUnverified(path + suffix), false, path + suffix);
});

test("every other page leads to the confirmation and names the way back", async () => {
  const { emailVerificationRedirect } = await rules();
  const to = (fullPath) => ({ path: fullPath.split(/[?#]/, 1)[0], fullPath });
  assert.deepEqual(
    emailVerificationRedirect(account(), true, to("/courses/python?skillID=a#plan")),
    {
      path: "/auth/verify-account",
      query: { redirect: "/courses/python?skillID=a#plan" },
    }
  );
  // The dashboard is where a confirmed account goes anyway.
  assert.deepEqual(emailVerificationRedirect(account(), true, to("/dashboard")), {
    path: "/auth/verify-account",
  });
  for (const [user, loaded, path] of [
    [account(), true, "/profile/edit"],
    [account(), true, "/auth/verify-account?redirect=/courses/python"],
    [account(), true, "/docs/privacy"],
    [account(), false, "/courses/python"],
    [cookie(account()), true, "/courses/python"],
    [account({ email_verified: true }), true, "/courses/python"],
    // The services let administrators through.
    [account({ admin: true }), true, "/courses/python"],
    [null, false, "/courses/python"],
  ])
    assert.equal(emailVerificationRedirect(user, loaded, to(path)), undefined, path);
});

test("after the confirmation only a page of this site that is not a login page is followed", async () => {
  const { verifiedDestination, emailVerificationRoute } = await rules();
  for (const [target, destination] of [
    ["/courses/python", "/courses/python"],
    ["/courses/python?skillID=a#plan", "/courses/python?skillID=a#plan"],
    ["/dashboard", "/dashboard"],
    [undefined, "/dashboard"],
    ["", "/dashboard"],
    [["/courses/python"], "/dashboard"],
    ["https://example.invalid/courses", "/dashboard"],
    ["//example.invalid", "/dashboard"],
    ["/auth/verify-account", "/dashboard"],
    ["/auth/login?redirect=/courses", "/dashboard"],
    ["/AUTH/signup", "/dashboard"],
    ["/authors", "/authors"],
  ])
    assert.equal(verifiedDestination(target), destination, JSON.stringify(target));
  assert.deepEqual(emailVerificationRoute("//example.invalid"), { path: "/auth/verify-account" });
});

test("the middleware sends an unconfirmed account on and runs after the legal addresses", async () => {
  const storage = browserStorage();
  const state = { user: account(), loaded: true };
  const middleware = (
    await evaluate("middleware/unverified.global.ts", {
      ...(await rules(storage)),
      defineNuxtRouteMiddleware: (handler) => handler,
      useUser: () => ({ value: state.user }),
      useProfileLoaded: () => ({ value: state.loaded }),
      navigateTo: (to) => ({ navigated: to }),
    })
  ).default;
  const to = (path) => ({ path, fullPath: path });
  assert.deepEqual(middleware(to("/skill-tree")), {
    navigated: { path: "/auth/verify-account", query: { redirect: "/skill-tree" } },
  });
  assert.equal(middleware(to("/account")), undefined);
  state.loaded = false;
  assert.equal(middleware(to("/skill-tree")), undefined);
  // Global middleware runs in the order of the file names; the old `/impressum` and
  // `/datenschutz` have to be resolved before this rule sees the target.
  const order = (await readdir(new URL("../middleware/", import.meta.url)))
    .filter((name) => name.includes(".global."))
    .sort();
  assert.deepEqual(order, ["route.global.ts", "unverified.global.ts"]);
});

test("the note lasts as long as a code works and belongs to one account", async () => {
  const storage = browserStorage();
  const { verificationMailNoted, noteVerificationMail, forgetVerificationMail, ...rest } =
    await rules(storage);
  assert.equal(rest.VERIFICATION_CODE_LIFETIME, 4 * HOUR);
  const now = Date.parse("2026-10-12T12:00:00Z");

  assert.equal(verificationMailNoted("learner", undefined, now), false);
  assert.equal(noteVerificationMail("learner", undefined, now), true);
  assert.equal(verificationMailNoted("learner", undefined, now + 4 * HOUR - 1), true);
  // Another account on this browser has not been sent anything, and its look changes nothing.
  assert.equal(verificationMailNoted("other", undefined, now + 1), false);
  assert.equal(verificationMailNoted(undefined, undefined, now + 1), false);
  assert.equal(storage.noted(), "learner");
  forgetVerificationMail("other");
  assert.equal(storage.noted(), "learner");

  // Once the code has run out, the note is gone.
  assert.equal(verificationMailNoted("learner", undefined, now + 4 * HOUR), false);
  assert.equal(storage.data.size, 0);

  // A note from the future (a changed clock) or one nobody can read is no note.
  for (const broken of [JSON.stringify({ id: "learner", at: now + 1 }), "1", '"text"', "{"]) {
    storage.data.set(KEY, broken);
    assert.equal(verificationMailNoted("learner", undefined, now), false, broken);
  }
  assert.equal(noteVerificationMail("learner", undefined, now), true);
  forgetVerificationMail("learner");
  assert.equal(storage.data.size, 0);
  assert.equal(noteVerificationMail(undefined, undefined, now), false);
});

test("a browser that keeps no note gets no note and no error", async () => {
  const { verificationMailNoted, noteVerificationMail, forgetVerificationMail } = await rules(
    browserStorage(true)
  );
  assert.equal(noteVerificationMail("learner"), false);
  assert.equal(verificationMailNoted("learner"), false);
  forgetVerificationMail("learner");
});

test("the server's refusals for an unconfirmed address share one message", () => {
  for (const [status, detail] of [
    [403, "Email not verified"],
    [412, "A verified delivery address is required"],
  ])
    for (const error of [
      { statusCode: status, data: { detail } },
      { response: { status, _data: { detail } } },
      // The API wrapper has already replaced the text by the key.
      { statusCode: status, data: { detail: "Error.AccountNotVerified" } },
    ])
      assert.equal(decodeApiError(error).messageKey, "Error.AccountNotVerified", detail);
  assert.notEqual(
    decodeApiError({ statusCode: 412, data: { detail: "Purchase not available" } }).messageKey,
    "Error.AccountNotVerified"
  );
});

test("an offer refused for an unconfirmed address leads to the confirmation and back", async () => {
  for (const [refusal, target, notices] of [
    [
      { statusCode: 403, data: { detail: "Error.AccountNotVerified" } },
      [{ path: "/auth/verify-account", query: { redirect: "/courses/python?skillID=a" } }],
      [],
    ],
    [
      { statusCode: 412, data: { detail: "A verified delivery address is required" } },
      [{ path: "/auth/verify-account", query: { redirect: "/courses/python?skillID=a" } }],
      [],
    ],
    // Any other refusal is reported as before.
    [
      { statusCode: 503, data: { detail: "Service Unavailable" } },
      [],
      [["error", "Body.PurchaseOfferUnavailable"]],
    ],
  ]) {
    const left = [];
    const said = [];
    const { requestPurchaseOffer } = await evaluate("composables/purchases.ts", {
      ...(await rules()),
      require: (name) => ({ "~/utils/apiError": { decodeApiError } })[name],
      useUser: () => ({ value: cookie(account()) }),
      useRouter: () => ({ currentRoute: { value: { fullPath: "/courses/python?skillID=a" } } }),
      localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
      POST: async () => {
        throw refusal;
      },
      navigateTo: async (to) => left.push(to),
      openSnackbar: (...args) => said.push(args),
    });
    assert.equal(await requestPurchaseOffer("/skills/course_access/python/offer"), null);
    assert.deepEqual(left, target, refusal.data.detail);
    assert.deepEqual(said, notices, refusal.data.detail);
  }
});

/**
 * The confirmation form in a mounted page. `server` is what the API holds and answers;
 * the requests for a mail go through the real `requestEmailVerification`.
 */
async function open(
  t,
  {
    user: initial = account(),
    loaded = true,
    server: held = initial,
    mail = "ok",
    seen = "visible",
    storage = browserStorage(),
    token = "token",
  } = {}
) {
  const user = Vue.ref(initial && !loaded ? cookie(initial) : initial);
  const profileLoaded = Vue.ref(!!initial && loaded);
  const visibility = Vue.ref(seen);
  const server = { user: held, mail, code: "AAAA-BBBB-CCCC-DDDD" };
  const calls = { profile: 0, mails: 0, renewed: 0, notices: [], status: [], logout: 0 };
  const timer = () => assert.fail("the page must not poll");
  const scope = {
    require: (name) =>
      ({
        vue: Vue,
        "@vueuse/core": { useDocumentVisibility: () => visibility },
        "vue-i18n": { useI18n: () => ({ t: (key) => key }) },
        "./fetch": {
          POST: async (path) => {
            assert.equal(path, `/auth/users/${user.value.id}/email`);
            calls.mails++;
            if (server.user.email_verified)
              throw { data: { detail: "Error.EmailAlreadyVerified" } };
            if (server.mail !== "ok") throw { data: { detail: "Error.TooManyRequests" } };
            return true;
          },
        },
      })[name] ?? {},
    reactive: Vue.reactive,
    setTimeout: timer,
    setInterval: timer,
    window: storage.window,
    isPublicLegalRoute,
    internalPath,
    useUser: () => user,
    useProfileLoaded: () => profileLoaded,
    useRouter: () => ({ push() {} }),
    getAccessToken: () => (user.value ? token : ""),
    getUser: async () => {
      calls.profile++;
      if (!server.user) return [null, { detail: "Error.TryAgainLater" }];
      user.value = { ...server.user };
      profileLoaded.value = true;
      return [user.value, null];
    },
    PUT: async (path, body) => {
      assert.equal(path, "/auth/users/me/email");
      if (server.code === "down") throw { data: { detail: "Error.TryAgainLater" } };
      if (body.code !== server.code) throw { data: { detail: "Error.InvalidVerificationCode" } };
      server.user = { ...server.user, email_verified: true };
      return true;
    },
    // The renewed session answers with the profile.
    refresh: async () => {
      calls.renewed++;
      user.value = { ...server.user };
      return [true, null];
    },
    logout: async () => calls.logout++,
    openSnackbar: (...args) => calls.notices.push(args),
    openDialog: () => assert.fail("no dialog on this page"),
  };
  Object.assign(scope, await evaluate("composables/emailVerification.ts", scope));
  // The two requests of this page are the real ones; the session itself is a stand-in.
  const { requestEmailVerification, verifyAccount } = await evaluate("composables/auth.ts", scope);
  Object.assign(scope, { requestEmailVerification, verifyAccount });

  const ui = host();
  const app = ui.renderer.createApp(await evaluate("components/form/VerifyAccount.vue", scope), {
    onStatus: (status) => calls.status.push(status),
  });
  app.component("Input", tag("input"));
  for (const name of ["InputBtn", "Btn"]) app.component(name, tag("button"));
  app.component("NuxtLink", tag("a"));
  app.mount(ui.root);
  t.after(() => app.unmount());
  await settle();

  const button = (label) => ui.all().find((n) => n.type === "button" && ui.text(n).includes(label));
  return {
    ui,
    user,
    server,
    calls,
    storage,
    visibility,
    says: (key) => ui.text().includes(key),
    button,
    links: () =>
      ui
        .all()
        .filter((n) => n.type === "a")
        .map((n) => n.props.to),
    field: () => ui.all().find((n) => n.type === "input"),
    press: async (label) => {
      assert.ok(button(label), `no button ${label}`);
      button(label).props.onClick();
      await settle();
    },
    async enter(code) {
      const field = this.field();
      field.props["onUpdate:modelValue"](code);
      field.props.onValid(true);
      await settle();
      await this.press("Buttons.VerifyAccount");
    },
  };
}

test("whoever arrives without a code gets one, and the page says where it went", async (t) => {
  const page = await open(t);
  assert.equal(page.calls.mails, 1);
  assert.equal(page.storage.noted(), "learner");
  assert.ok(page.says("Body.VerifyAccountSent"));
  assert.ok(!page.says("Body.VerifyAccountNotSent") && !page.says("Body.MissingEmail"));
  assert.deepEqual(page.links(), ["/profile/edit"]);
  assert.ok(page.button("Buttons.ResendAccountVerificationCode") && page.button("Buttons.Logout"));
  assert.deepEqual(page.calls.notices, []);

  // Looking at the tab again asks the server about the account, not for another mail.
  page.visibility.value = "hidden";
  await settle();
  page.visibility.value = "visible";
  await settle();
  assert.equal(page.calls.mails, 1);
  assert.equal(page.calls.profile, 2);
});

test("a reload, a second tab and the page after the registration send nothing", async (t) => {
  const storage = browserStorage();
  storage.note("learner", Date.now() - 4 * HOUR + 60000);
  const page = await open(t, { storage });
  assert.equal(page.calls.mails, 0);
  assert.ok(page.says("Body.VerifyAccountSent"));
});

test("once the last code has run out, a returning account gets a new one", async (t) => {
  const storage = browserStorage();
  storage.note("learner", Date.now() - 4 * HOUR - 1000);
  const page = await open(t, { storage });
  assert.equal(page.calls.mails, 1);
  assert.ok(page.says("Body.VerifyAccountSent"));
});

test("a note for another account on this browser does not stand for this one", async (t) => {
  const storage = browserStorage();
  storage.note("other");
  const page = await open(t, { storage });
  assert.equal(page.calls.mails, 1);
  assert.equal(storage.noted(), "learner");
});

test("a refused request is said in a sentence, is not repeated unasked and can be repeated", async (t) => {
  const page = await open(t, { mail: "limit" });
  assert.equal(page.calls.mails, 1);
  assert.ok(page.says("Body.VerifyAccountNotSent"));
  assert.ok(!page.says("Body.VerifyAccountSent"));
  assert.equal(page.storage.noted(), null, "no mail went out, so nothing is noted");
  assert.deepEqual(page.calls.notices, []);

  page.visibility.value = "hidden";
  await settle();
  page.visibility.value = "visible";
  await settle();
  assert.equal(page.calls.mails, 1, "the page does not ask again by itself");

  await page.press("Buttons.ResendAccountVerificationCode");
  assert.equal(page.calls.mails, 2);
  assert.ok(page.says("Body.VerifyAccountNotSent"));

  page.server.mail = "ok";
  await page.press("Buttons.ResendAccountVerificationCode");
  assert.equal(page.calls.mails, 3);
  assert.ok(page.says("Body.VerifyAccountSent"));
  assert.ok(!page.says("Body.VerifyAccountNotSent"));
  assert.equal(page.storage.noted(), "learner");
  assert.deepEqual(page.calls.notices, [["success", "Success.ResendAccountVerificationCode"]]);
});

test("without a place for the note nothing is sent unasked", async (t) => {
  const page = await open(t, { storage: browserStorage(true) });
  assert.equal(page.calls.mails, 0);
  assert.ok(page.says("Body.VerifyAccount"));
  assert.ok(!page.says("Body.VerifyAccountSent"));
  await page.press("Buttons.ResendAccountVerificationCode");
  assert.equal(page.calls.mails, 1);
  assert.ok(page.says("Body.VerifyAccountSent"));
});

test("an account without an address is sent to the profile, not asked for a code", async (t) => {
  for (const email of [null, ""]) {
    const page = await open(t, { user: account({ email }) });
    assert.equal(page.calls.mails, 0);
    assert.ok(page.says("Body.MissingEmail"));
    assert.equal(page.field(), undefined);
    assert.equal(page.button("Buttons.ResendAccountVerificationCode"), undefined);
    assert.deepEqual(page.links(), ["/profile/edit"]);
    assert.ok(page.says("Buttons.AddEmail") && page.button("Buttons.Logout"));
  }
});

test("a tab in the background waits until somebody looks at it", async (t) => {
  const page = await open(t, { seen: "hidden" });
  assert.equal(page.calls.profile + page.calls.mails, 0);
  page.visibility.value = "visible";
  await settle();
  assert.equal(page.calls.mails, 1);
  assert.ok(page.says("Body.VerifyAccountSent"));
});

test("a profile that did not arrive at the start is asked for first", async (t) => {
  const page = await open(t, { loaded: false });
  assert.equal(page.calls.profile, 1);
  assert.equal(page.calls.mails, 1);
  assert.ok(page.says("Body.VerifyAccountSent"));

  // Without the profile the page knows no address and names none.
  const offline = await open(t, { loaded: false, server: null });
  assert.equal(offline.calls.mails, 0);
  assert.ok(offline.says("Body.VerifyAccount"));
  assert.ok(!offline.says("Body.VerifyAccountSent"));
});

test("an address confirmed in another tab or on another device ends the page", async (t) => {
  const confirmed = account({ email_verified: true });
  // The state of this tab is older than the server's.
  const arriving = await open(t, { server: confirmed });
  assert.deepEqual(arriving.calls.status, ["success"]);
  assert.equal(arriving.calls.mails, 0);

  // Confirmed while this tab stood open: the next request for a code is told so.
  const waiting = await open(t);
  waiting.server.user = confirmed;
  await waiting.press("Buttons.ResendAccountVerificationCode");
  assert.deepEqual(waiting.calls.status, ["success"]);
  assert.deepEqual(waiting.calls.notices, []);
  assert.ok(!waiting.says("Body.VerifyAccountNotSent"));
});

test("nobody signed in: the code alone confirms, and nothing is offered that needs a session", async (t) => {
  const page = await open(t, { user: null });
  assert.equal(page.calls.profile + page.calls.mails, 0);
  assert.ok(page.says("Body.VerifyAccount"));
  assert.deepEqual(page.links(), []);
  assert.equal(page.button("Buttons.ResendAccountVerificationCode"), undefined);
  assert.equal(page.button("Buttons.Logout"), undefined);
  page.server.user = account();
  await page.enter(page.server.code);
  assert.deepEqual(page.calls.status, ["success"]);
  assert.equal(page.calls.renewed, 0);
});

test("the code: a wrong or expired one is named, the right one renews the session", async (t) => {
  const page = await open(t);
  await page.enter("XXXX-XXXX-XXXX-XXXX");
  assert.deepEqual(page.calls.notices, [["error", "Error.InvalidVerificationCode"]]);
  assert.deepEqual(page.calls.status, []);

  page.server.code = "down";
  await page.enter("AAAA-BBBB-CCCC-DDDD");
  assert.deepEqual(page.calls.notices.at(-1), ["error", "Error.VerifyEmail"]);

  page.server.code = "AAAA-BBBB-CCCC-DDDD";
  await page.enter("AAAA-BBBB-CCCC-DDDD");
  assert.deepEqual(page.calls.status, ["success"]);
  assert.equal(page.calls.renewed, 1);
  assert.equal(page.user.value.email_verified, true);
  assert.equal(page.storage.noted(), null, "nothing is left to remember");
});

test("the logout is on the page", async (t) => {
  const page = await open(t);
  await page.press("Buttons.Logout");
  assert.equal(page.calls.logout, 1);
});

test("both languages name the address and hold every text the page uses", async () => {
  for (const language of ["de", "en-US"]) {
    const { default: locale } = await import(`../locales/${language}.json`, {
      with: { type: "json" },
    });
    for (const key of ["VerifyAccountSending", "VerifyAccountSent", "VerifyAccountNotSent"])
      assert.match(locale.Body[key], /\{email\}/, `${language} ${key}`);
    assert.ok(
      locale.Body.VerifyAccountNotSent.includes(locale.Buttons.ResendAccountVerificationCode)
    );
    for (const text of [
      locale.Body.VerifyAccount,
      locale.Body.MissingEmail,
      locale.Links.ChangeEmailInProfile,
      locale.Buttons.Logout,
      locale.Buttons.AddEmail,
      locale.Buttons.Continue,
      locale.Success.ResendAccountVerificationCode,
      locale.Error.InvalidVerificationCode,
      locale.Error.VerifyEmail,
    ])
      assert.ok(typeof text === "string" && text.length > 0, language);
  }
});
