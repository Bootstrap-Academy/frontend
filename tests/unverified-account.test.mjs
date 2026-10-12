// An account whose e-mail address is not confirmed: where its pages lead, when a code is sent
// by itself, and what the confirmation page says. Everything the code reaches is a stand-in.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse } from "@vue/compiler-sfc";
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

/** The Web Locks of one browser: one holder per name, every other request waits in line. */
function browserLocks() {
  const tails = new Map();
  const held = new Set();
  const asked = [];
  const waited = [];
  return {
    held,
    asked,
    // Whether a request found another one before it and had to wait for its turn.
    waited,
    request(name, action) {
      asked.push(name);
      waited.push(tails.has(name));
      const turn = (tails.get(name) ?? Promise.resolve()).then(async () => {
        held.add(name);
        try {
          return await action();
        } finally {
          held.delete(name);
          if (tails.get(name) === tail) tails.delete(name);
        }
      });
      const tail = turn.catch(() => {});
      tails.set(name, tail);
      return turn;
    },
  };
}

/**
 * What all windows of one browser share: Local Storage and the locks. `blocked` is a
 * browser that refuses the storage.
 */
function browserStorage(blocked = false) {
  const data = new Map();
  const local = {
    get length() {
      return data.size;
    },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
  return {
    data,
    local,
    locks: browserLocks(),
    // `open` is a request whose answer never arrived.
    note: (id, at = Date.now(), open = false) =>
      data.set(`${KEY}:${id}`, JSON.stringify(open ? { id, at, open } : { id, at })),
    // What the note of an account holds.
    read: (id) => JSON.parse(data.get(`${KEY}:${id}`) ?? "null"),
    // The accounts this browser holds a note for.
    noted: () => [...data.keys()].map((key) => key.replace(`${KEY}:`, "")).sort(),
    window: blocked
      ? {
          get localStorage() {
            throw new Error("blocked");
          },
        }
      : { localStorage: local },
  };
}
const rules = (storage = browserStorage(), navigator = { locks: storage.locks }) =>
  evaluate("composables/emailVerification.ts", {
    isPublicLegalRoute,
    internalPath,
    window: storage.window,
    navigator,
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
    // The dashboard written with a slash at its end is the dashboard.
    ["/dashboard/", "/dashboard"],
    ["/Dashboard//", "/dashboard"],
    ["/dashboard/learn", "/dashboard/learn"],
    ["/dashboard?tab=skills", "/dashboard?tab=skills"],
    ["/dashboards", "/dashboards"],
  ])
    assert.equal(verifiedDestination(target), destination, JSON.stringify(target));
  assert.deepEqual(emailVerificationRoute("//example.invalid"), { path: "/auth/verify-account" });
  assert.deepEqual(emailVerificationRoute("/dashboard/"), { path: "/auth/verify-account" });
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
  const {
    verificationMailNote,
    verificationMailNoted,
    noteVerificationRequest,
    noteVerificationMail,
    forgetVerificationMail,
    ...rest
  } = await rules(storage);
  assert.equal(rest.VERIFICATION_CODE_LIFETIME, 4 * HOUR);
  const now = Date.parse("2026-10-12T12:00:00Z");

  assert.equal(verificationMailNoted("learner", undefined, now), false);
  assert.equal(verificationMailNote("learner", undefined, now), "");
  // A request is noted with its answer still open. That is the one further field,
  // and it is there only as long as the answer is missing.
  assert.equal(noteVerificationRequest("learner", undefined, now), true);
  assert.deepEqual(storage.read("learner"), { id: "learner", at: now, open: true });
  assert.equal(verificationMailNote("learner", undefined, now + 4 * HOUR - 1), "open");
  assert.equal(verificationMailNoted("learner", undefined, now + 4 * HOUR - 1), true);
  // The answer of the server settles it.
  assert.equal(noteVerificationMail("learner", undefined, now), true);
  assert.equal(verificationMailNote("learner", undefined, now + 4 * HOUR - 1), "sent");
  assert.equal(verificationMailNoted("learner", undefined, now + 4 * HOUR - 1), true);
  // The note holds the account and the time, and nothing else.
  assert.deepEqual(storage.read("learner"), { id: "learner", at: now });
  // Only the plain value `true` leaves the answer open.
  for (const open of [false, "true", 1, null, {}]) {
    storage.data.set(`${KEY}:learner`, JSON.stringify({ id: "learner", at: now, open }));
    assert.equal(verificationMailNote("learner", undefined, now), "sent", JSON.stringify(open));
  }
  assert.equal(noteVerificationMail("learner", undefined, now), true);
  // Another account on this browser has not been sent anything, and its look changes nothing.
  assert.equal(verificationMailNoted("other", undefined, now + 1), false);
  assert.equal(verificationMailNoted(undefined, undefined, now + 1), false);
  assert.deepEqual(storage.noted(), ["learner"]);
  forgetVerificationMail("other");
  forgetVerificationMail(undefined);
  assert.deepEqual(storage.noted(), ["learner"]);

  // Every account has its own note: the second one does not replace the first one's.
  assert.equal(noteVerificationMail("other", undefined, now + HOUR), true);
  assert.deepEqual(storage.noted(), ["learner", "other"]);
  assert.equal(verificationMailNoted("learner", undefined, now + HOUR), true);
  forgetVerificationMail("other");
  assert.deepEqual(storage.noted(), ["learner"]);

  // Once the code has run out, the note is gone, and so is an open one.
  assert.equal(verificationMailNoted("learner", undefined, now + 4 * HOUR), false);
  assert.equal(storage.data.size, 0);
  assert.equal(noteVerificationRequest("learner", undefined, now), true);
  assert.equal(verificationMailNote("learner", undefined, now + 4 * HOUR), "");
  assert.equal(storage.data.size, 0);

  // A note from the future (a changed clock), one nobody can read or one that names
  // another account is no note.
  for (const broken of [
    JSON.stringify({ id: "learner", at: now + 1 }),
    JSON.stringify({ id: "other", at: now }),
    "1",
    '"text"',
    "{",
  ]) {
    storage.data.set(`${KEY}:learner`, broken);
    assert.equal(verificationMailNoted("learner", undefined, now), false, broken);
  }
  assert.equal(noteVerificationMail("learner", undefined, now), true);
  forgetVerificationMail("learner");
  assert.equal(storage.data.size, 0);
  assert.equal(noteVerificationMail(undefined, undefined, now), false);
  assert.equal(noteVerificationRequest(undefined, undefined, now), false);
});

test("the start of the app removes every note whose code has run out", async () => {
  const storage = browserStorage();
  const { clearExpiredVerificationMails } = await rules(storage);
  const now = Date.parse("2026-10-12T12:00:00Z");
  storage.note("current", now - 4 * HOUR + 1);
  storage.note("unanswered", now - HOUR, true);
  // Accounts that never came back to this browser: nobody else looks at their notes.
  storage.note("expired", now - 4 * HOUR);
  storage.note("expired-unanswered", now - 30 * 24 * HOUR, true);
  storage.note("from-the-future", now + 1);
  storage.data.set(`${KEY}:unreadable`, "{");
  storage.data.set(`${KEY}:another-account`, JSON.stringify({ id: "current", at: now }));
  storage.data.set(KEY, JSON.stringify({ id: "current", at: now }));
  storage.data.set("payment", "pending");
  storage.data.set(`${KEY}s`, "not a note");

  clearExpiredVerificationMails(storage.local, now);
  assert.deepEqual([...storage.data.keys()].sort(), [
    "payment",
    `${KEY}:current`,
    `${KEY}:unanswered`,
    `${KEY}s`,
  ]);
  // What stays is left as it was.
  assert.deepEqual(storage.read("unanswered"), { id: "unanswered", at: now - HOUR, open: true });
});

test("the one note for all accounts that earlier builds kept is removed", async () => {
  for (const use of [
    (r) => r.verificationMailNoted("learner"),
    (r) => r.noteVerificationMail("learner"),
    (r) => r.forgetVerificationMail("learner"),
  ]) {
    const storage = browserStorage();
    storage.data.set(KEY, JSON.stringify({ id: "learner", at: Date.now() }));
    use(await rules(storage));
    assert.ok(!storage.data.has(KEY));
  }
  // It does not stand for a code that was sent: the account gets a fresh one.
  const storage = browserStorage();
  storage.data.set(KEY, JSON.stringify({ id: "learner", at: Date.now() }));
  assert.equal((await rules(storage)).verificationMailNoted("learner"), false);
});

test("looking for the note and writing it is one step for all windows of the browser", async () => {
  const storage = browserStorage();
  const { withVerificationMailLock } = await rules(storage);
  const order = [];
  const window = (name) =>
    withVerificationMailLock("learner", async () => {
      order.push(`${name} in`);
      assert.ok(storage.locks.held.has(`${KEY}:learner`));
      await settle();
      order.push(`${name} out`);
    });
  await Promise.all([window("first"), window("second")]);
  assert.deepEqual(order, ["first in", "first out", "second in", "second out"]);
  assert.deepEqual(storage.locks.asked, [`${KEY}:learner`, `${KEY}:learner`]);

  // A browser without the lock, and one that refuses it, still run the step, once.
  for (const navigator of [
    {},
    null,
    { locks: { request: async () => Promise.reject(new Error("The operation is insecure.")) } },
  ]) {
    let runs = 0;
    await (
      await rules(storage, navigator)
    ).withVerificationMailLock("learner", async () => void runs++);
    assert.equal(runs, 1);
  }
  // What goes wrong inside the step is not run a second time.
  let runs = 0;
  await assert.rejects(
    withVerificationMailLock("learner", async () => {
      runs++;
      throw new Error("inside");
    }),
    /inside/
  );
  assert.equal(runs, 1);
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
 * the requests for a mail go through the real `requestEmailVerification`. `mail` is what
 * becomes of such a request: "ok", "limit" (the server refuses) or "lost" (no answer arrives).
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
  const calls = {
    profile: 0,
    mails: 0,
    locked: [],
    // Whether the note said "answer open" at the moment the request went out.
    open: [],
    codes: 0,
    renewed: 0,
    notices: [],
    status: [],
    logout: 0,
  };
  const lock = () => !!storage.locks?.held?.has(`${KEY}:${user.value.id}`);
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
            calls.open.push(storage.read(user.value.id)?.open === true);
            // Whether this window held the lock from the request to its answer.
            const before = lock();
            await new Promise(setImmediate);
            calls.locked.push(before && lock());
            if (server.user.email_verified)
              throw { response: { status: 412 }, data: { detail: "Error.EmailAlreadyVerified" } };
            if (server.mail === "limit")
              throw { response: { status: 429 }, data: { detail: "Error.TooManyRequests" } };
            // The request broke off or its answer was lost: nobody knows whether a mail went out.
            if (server.mail === "lost") throw new TypeError("Failed to fetch");
            return true;
          },
        },
      })[name] ?? {},
    reactive: Vue.reactive,
    setTimeout: timer,
    setInterval: timer,
    window: storage.window,
    navigator: { locks: storage.locks },
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
      calls.codes++;
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
  // A template ref hands an element out wrapped, so the document names the cursor's place alike.
  scope.document = {
    get activeElement() {
      return ui.focused() && Vue.reactive(ui.focused());
    },
  };
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
    // The one sentence of the page on what became of the code.
    sentence: () =>
      ui.text(ui.all().find((n) => n.type === "p" && n.props.role === "status")).trim(),
    // What a screen reader is told without the cursor moving.
    spoken: () => ui.text(ui.all().find((n) => n.type === "p" && n.props.role === "alert")).trim(),
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
      await this.press("Buttons.ConfirmCode");
    },
    // The Enter key in the field: the form is sent while the cursor stays where it is.
    async pressEnter() {
      this.field().focus();
      ui.all()
        .find((n) => n.type === "form")
        .props.onSubmit({ preventDefault() {} });
      await settle();
    },
  };
}

test("whoever arrives without a code gets one, and the page says where it went", async (t) => {
  const page = await open(t);
  assert.equal(page.calls.mails, 1);
  assert.deepEqual(page.calls.locked, [true], "no other window looks for the note meanwhile");
  assert.deepEqual(page.calls.open, [true], "the request is noted before it is made");
  assert.deepEqual(page.storage.noted(), ["learner"]);
  // The answer has arrived: the note holds the account and the time again, and nothing else.
  assert.deepEqual(Object.keys(page.storage.read("learner")), ["id", "at"]);
  assert.equal(page.sentence(), "Body.VerifyAccountSent");
  assert.ok(!page.says("Body.VerifyAccountNotSent") && !page.says("Body.VerifyAccountNoEmail"));
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

test("two accounts on one browser each get one code and keep their own note", async (t) => {
  const storage = browserStorage();
  const other = account({ id: "other", name: "other", email: "other@example.invalid" });
  assert.equal((await open(t, { user: other, storage })).calls.mails, 1);
  assert.equal((await open(t, { storage })).calls.mails, 1);
  assert.deepEqual(storage.noted(), ["learner", "other"]);
  // Each of them comes back to a code that still works.
  assert.equal((await open(t, { user: other, storage })).calls.mails, 0);
  assert.equal((await open(t, { storage })).calls.mails, 0);
});

test("two windows that arrive at the same moment ask for one code", async (t) => {
  const storage = browserStorage();
  const [first, second] = await Promise.all([open(t, { storage }), open(t, { storage })]);
  await settle();
  assert.equal(first.calls.mails + second.calls.mails, 1);
  assert.deepEqual([...first.calls.locked, ...second.calls.locked], [true]);
  assert.deepEqual(storage.locks.asked, [`${KEY}:learner`, `${KEY}:learner`]);
  assert.deepEqual(storage.locks.waited, [false, true], "the second window waited for the first");
  for (const page of [first, second]) assert.ok(page.says("Body.VerifyAccountSent"));
});

test("a browser without the lock between windows still sends one code", async (t) => {
  for (const locks of [undefined, { request: async () => Promise.reject(new Error("refused")) }]) {
    const storage = browserStorage();
    storage.locks = locks;
    const page = await open(t, { storage });
    assert.equal(page.calls.mails, 1);
    assert.ok(page.says("Body.VerifyAccountSent"));
    assert.deepEqual(storage.noted(), ["learner"]);
  }
});

test("the account changes while the page asks the server: nothing is sent for either", async (t) => {
  const other = account({ id: "other", name: "other", email: "other@example.invalid" });
  const page = await open(t, { server: other });
  assert.equal(page.user.value.id, "other");
  assert.equal(page.calls.mails, 0);
  assert.deepEqual(page.storage.noted(), []);
  assert.ok(page.says("Body.VerifyAccount"));
  assert.ok(!page.says("Body.VerifyAccountSent"));
});

test("a refused request is said in a sentence, is not repeated unasked and can be repeated", async (t) => {
  const page = await open(t, { mail: "limit" });
  assert.equal(page.calls.mails, 1);
  assert.ok(page.says("Body.VerifyAccountNotSent"));
  assert.ok(!page.says("Body.VerifyAccountSent"));
  assert.deepEqual(page.storage.noted(), [], "the server said no, so nothing is noted");
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
  // The sentence of the page says it, once: no second message next to it.
  assert.equal(page.sentence(), "Body.VerifyAccountResent");
  assert.deepEqual(page.calls.notices, []);
  assert.deepEqual(page.storage.read("learner") && Object.keys(page.storage.read("learner")), [
    "id",
    "at",
  ]);

  // The next look finds the note of a code that was sent.
  page.visibility.value = "hidden";
  await settle();
  page.visibility.value = "visible";
  await settle();
  assert.equal(page.calls.mails, 3);
  assert.equal(page.sentence(), "Body.VerifyAccountSent");
});

test("a request without an answer: the page says that it does not know, here and in every other window", async (t) => {
  const storage = browserStorage();
  const page = await open(t, { storage, mail: "lost" });
  assert.equal(page.calls.mails, 1);
  // Neither a code that was sent nor one that was not: nobody knows which.
  assert.equal(page.sentence(), "Body.VerifyAccountOpen");
  assert.ok(!page.says("Body.VerifyAccountSent") && !page.says("Body.VerifyAccountNotSent"));
  assert.ok(page.button("Buttons.ResendAccountVerificationCode"));
  assert.deepEqual(Object.keys(storage.read("learner")), ["id", "at", "open"]);
  assert.equal(storage.read("learner").open, true);

  // The next look at the open page.
  page.visibility.value = "hidden";
  await settle();
  page.visibility.value = "visible";
  await settle();
  assert.equal(page.calls.mails, 1, "no second request by itself");
  assert.equal(page.sentence(), "Body.VerifyAccountOpen");

  // A reload and a second tab read the same note.
  for (const again of [await open(t, { storage, mail: "lost" }), await open(t, { storage })]) {
    assert.equal(again.calls.mails, 0);
    assert.equal(again.sentence(), "Body.VerifyAccountOpen");
    assert.ok(!again.says("Body.VerifyAccountSent") && !again.says("Body.VerifyAccountNotSent"));
  }

  // The visitor can still ask. Without an answer the page still does not know.
  const reloaded = await open(t, { storage, mail: "lost" });
  await reloaded.press("Buttons.ResendAccountVerificationCode");
  assert.equal(reloaded.calls.mails, 1);
  assert.equal(reloaded.sentence(), "Body.VerifyAccountOpen");
  assert.equal(storage.read("learner").open, true);
  // An answer of the server decides about the note: a refusal removes it.
  reloaded.server.mail = "limit";
  await reloaded.press("Buttons.ResendAccountVerificationCode");
  assert.equal(reloaded.calls.mails, 2);
  assert.equal(reloaded.sentence(), "Body.VerifyAccountNotSent");
  assert.deepEqual(storage.noted(), []);
  // And a code that went out closes it.
  reloaded.server.mail = "ok";
  await reloaded.press("Buttons.ResendAccountVerificationCode");
  assert.equal(reloaded.sentence(), "Body.VerifyAccountResent");
  assert.deepEqual(Object.keys(storage.read("learner")), ["id", "at"]);
});

test("a request without an answer after a code that was sent leaves its answer open", async (t) => {
  const storage = browserStorage();
  const page = await open(t, { storage });
  assert.equal(page.sentence(), "Body.VerifyAccountSent");
  page.server.mail = "lost";
  await page.press("Buttons.ResendAccountVerificationCode");
  assert.equal(page.calls.mails, 2);
  assert.equal(page.sentence(), "Body.VerifyAccountOpen");
  assert.equal((await open(t, { storage })).sentence(), "Body.VerifyAccountOpen");
});

test("a browser that keeps no note still learns that the answer is missing", async (t) => {
  const page = await open(t, { storage: browserStorage(true), mail: "lost" });
  assert.equal(page.calls.mails, 0);
  await page.press("Buttons.ResendAccountVerificationCode");
  assert.equal(page.calls.mails, 1);
  assert.equal(page.sentence(), "Body.VerifyAccountOpen");
});

test("the account changes while this window waits for another one: nothing is sent for either", async (t) => {
  const storage = browserStorage();
  const other = account({ id: "other", name: "other", email: "other@example.invalid" });
  // Another window holds the lock of the first account.
  let release;
  const held = storage.locks.request(
    `${KEY}:learner`,
    () => new Promise((done) => (release = done))
  );
  const page = await open(t, { storage });
  assert.equal(page.calls.profile, 1);
  assert.equal(page.calls.mails, 0, "this window waits for its turn");

  // A login in another tab arrives here through the shared session.
  page.user.value = other;
  await settle();
  release();
  await held;
  await settle();
  assert.equal(page.calls.mails, 0);
  assert.deepEqual(storage.noted(), []);
  assert.equal(page.sentence(), "Body.VerifyAccount");
});

test("without a place for the note nothing is sent unasked", async (t) => {
  const page = await open(t, { storage: browserStorage(true) });
  assert.equal(page.calls.mails, 0);
  assert.equal(page.sentence(), "Body.VerifyAccount");
  await page.press("Buttons.ResendAccountVerificationCode");
  assert.equal(page.calls.mails, 1);
  assert.equal(page.sentence(), "Body.VerifyAccountResent");
});

test("an account without an address is sent to the profile, not asked for a code", async (t) => {
  for (const email of [null, ""]) {
    const page = await open(t, { user: account({ email }) });
    assert.equal(page.calls.mails, 0);
    assert.ok(page.says("Body.VerifyAccountNoEmail"));
    assert.ok(!page.field());
    assert.ok(!page.button("Buttons.ResendAccountVerificationCode"));
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
  // The state of this tab is older than the server's, and so is the note of this browser.
  const storage = browserStorage();
  storage.note("learner");
  storage.note("other");
  const arriving = await open(t, { server: confirmed, storage });
  assert.deepEqual(arriving.calls.status, ["success"]);
  assert.equal(arriving.calls.mails, 0);
  assert.deepEqual(storage.noted(), ["other"], "a confirmed account leaves no note behind");

  // Confirmed while this tab stood open: the next request for a code is told so.
  const waiting = await open(t);
  assert.deepEqual(waiting.storage.noted(), ["learner"]);
  waiting.server.user = confirmed;
  await waiting.press("Buttons.ResendAccountVerificationCode");
  assert.deepEqual(waiting.calls.status, ["success"]);
  assert.deepEqual(waiting.calls.notices, []);
  assert.ok(!waiting.says("Body.VerifyAccountNotSent"));
  assert.deepEqual(waiting.storage.noted(), []);
});

test("nobody signed in: the code alone confirms, and nothing is offered that needs a session", async (t) => {
  const page = await open(t, { user: null });
  assert.equal(page.calls.profile + page.calls.mails, 0);
  assert.ok(page.says("Body.VerifyAccount"));
  assert.deepEqual(page.links(), []);
  assert.ok(!page.button("Buttons.ResendAccountVerificationCode"));
  assert.ok(!page.button("Buttons.Logout"));
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
  assert.deepEqual(page.storage.noted(), [], "nothing is left to remember");
});

test("a code that cannot be right is said once, in the line at the field", async (t) => {
  const page = await open(t);
  const form = page.ui.all().find((n) => n.type === "form");
  let bubbles = 0;
  form.reportValidity = () => void bubbles++;
  // The browser does not put its own bubble over the button either.
  assert.equal(form.props.novalidate, "");
  assert.ok(!page.field().props["show-error"]);

  // Nothing entered: the field itself says what is missing and takes the cursor.
  await page.press("Buttons.ConfirmCode");
  assert.equal(page.field().props["show-error"], true);
  assert.ok(page.ui.focused() === page.field());

  // A code in the wrong form: the rule of the field names the form.
  const [missing, form16] = page.field().props.rules;
  assert.equal(missing(""), "Error.VerificationCodeMissing");
  assert.equal(form16("abc"), "Error.VerificationCodeFormat");
  assert.equal(form16("ab12-CD34-ef56-GH78"), true);
  page.field().props["onUpdate:modelValue"]("abc");
  page.field().props.onValid(false);
  await page.press("Buttons.ConfirmCode");

  assert.deepEqual(page.calls.notices, [], "no second message next to the field");
  assert.equal(bubbles, 0);
  assert.equal(page.calls.codes, 0, "the server is not asked about it");
});

test("with the Enter key the cursor does not move, so the line at the field is said aloud", async (t) => {
  const page = await open(t);
  assert.equal(page.spoken(), "");

  // The button: the cursor moves into the field, and the field itself is read out with its line.
  page.button("Buttons.ConfirmCode").focus();
  await page.press("Buttons.ConfirmCode");
  assert.ok(page.ui.focused() === page.field());
  assert.equal(page.spoken(), "");

  // The Enter key in the empty field.
  await page.pressEnter();
  assert.equal(page.spoken(), "Error.VerificationCodeMissing");
  await page.pressEnter();
  assert.equal(page.spoken(), "Error.VerificationCodeMissing");

  page.field().props["onUpdate:modelValue"]("abc");
  page.field().props.onValid(false);
  await page.pressEnter();
  assert.equal(page.spoken(), "Error.VerificationCodeFormat");
  assert.deepEqual(page.calls.notices, []);
  assert.equal(page.calls.codes, 0);
});

test("the logout is on the page", async (t) => {
  const page = await open(t);
  await page.press("Buttons.Logout");
  assert.equal(page.calls.logout, 1);
});

test("the logout removes the note of the account that leaves", async () => {
  const storage = browserStorage();
  storage.note("learner");
  storage.note("other");
  const state = (value = null) => ({ value });
  const user = state(account());
  const scope = {
    require: (name) =>
      ({
        "./fetch": {},
        "~/utils/sessionRefresh": { revokeSession: async () => true, withSessionRefreshLock() {} },
        "~/utils/learningStorage": {
          prepareLearningLogout: async () => true,
          clearLearningStorage() {},
        },
        "~/utils/learningLogoutSync": { broadcastLearningLogout() {} },
      })[name],
    window: storage.window,
    navigator: { locks: storage.locks },
    isPublicLegalRoute,
    internalPath,
    useUser: () => user,
    useRuntimeConfig: () => ({ public: { BASE_API_URL: "" } }),
    getSessionSnapshot: () => ({ identity: "learner", generation: 1, accessToken: "token" }),
    setStates: () => (user.value = null),
  };
  for (const name of [
    "useCoins",
    "usePaypalClientID",
    "useMyCourses",
    "useCourses",
    "useCourse",
    "useVideoSRC",
    "useXP",
  ])
    scope[name] = () => state();
  Object.assign(scope, await evaluate("composables/emailVerification.ts", scope));
  const { logout } = await evaluate("composables/auth.ts", scope);

  assert.deepEqual(await logout(), [true, null]);
  assert.equal(user.value, null);
  assert.deepEqual(storage.noted(), ["other"]);
});

/** The bar above the pages of the inner layout, as `route` and the session make it. */
async function header(t, name, user, guestReturn = null) {
  const pushed = [];
  const ui = host();
  const app = ui.renderer.createApp(
    await evaluate("components/NavbarBack.vue", {
      require: (module) =>
        ({
          vue: Vue,
          "@heroicons/vue/24/solid": { ArrowLeftIcon: {} },
          "vue-i18n": { useI18n: () => ({ t: (key) => key }) },
          "~/utils/guest/handoff": { guestReturnPath: () => guestReturn },
        })[module],
      computed: Vue.computed,
      console: { log() {} },
      useRouter: () => ({ push: (to) => pushed.push(to), go: () => pushed.push("back") }),
      useRoute: () => ({ name, query: {}, params: {} }),
      useUser: () => Vue.ref(user),
    })
  );
  app.component("Btn", tag("button"));
  app.mount(ui.root);
  t.after(() => app.unmount());
  await settle();
  return {
    pushed,
    button: () => ui.all().find((n) => n.type === "button"),
    logo: () => ui.all().find((n) => n.type === "img"),
  };
}

test("the bar above the confirmation offers no way back that leads back to it", async (t) => {
  // A signed-in account would go to the login, on to the dashboard and back here.
  for (const user of [account(), account({ email_verified: true }), cookie(account())]) {
    const bar = await header(t, "auth-verify-account", user);
    assert.ok(!bar.button());
    assert.ok(bar.logo(), "the bar keeps its logo");
  }
  // An account that came from the guest exercise keeps its way back to it.
  for (const user of [account(), cookie(account())]) {
    const bar = await header(t, "auth-verify-account", user, "/start");
    assert.ok(bar.button());
    bar.button().props.onClick();
    assert.deepEqual(bar.pushed, ["/start"]);
  }
  // Nobody signed in: the way back is the login, also with an exercise that was begun.
  for (const user of [null, undefined, { id: "" }])
    for (const guestReturn of [null, "/start"]) {
      const bar = await header(t, "auth-verify-account", user, guestReturn);
      assert.ok(bar.button());
      assert.ok(bar.logo());
      bar.button().props.onClick();
      assert.deepEqual(bar.pushed, ["/auth/login"]);
    }
  // Every other page keeps its button and its target, with or without a session.
  for (const user of [account(), null]) {
    const bar = await header(t, "profile-edit", user, "/start");
    assert.ok(bar.button());
    bar.button().props.onClick();
    assert.deepEqual(bar.pushed, ["/dashboard"]);
  }
});

/** The page around the form. `query` is what the address carries; the form is a stand-in. */
async function confirmation(t, query = {}, guestReturn = "") {
  let head = () => ({});
  const scope = {
    require: (name) =>
      ({
        // Leaving and entering need a real document; the page only swaps the two views.
        vue: { ...Vue, Transition: (_, { slots }) => slots.default?.() },
        "vue-i18n": { useI18n: () => ({ t: (key) => key, locale: Vue.ref("de") }) },
        "~/utils/guest/handoff": { guestReturnPath: () => guestReturn },
        "~/utils/guest/copy": { guestCopy: () => ({ continue: "Guest.Continue" }) },
      })[name],
    ref: Vue.ref,
    computed: Vue.computed,
    definePageMeta() {},
    useRoute: () => ({ query }),
    useHead: (made) => (head = made),
    isPublicLegalRoute,
    internalPath,
    window: browserStorage().window,
  };
  Object.assign(scope, await evaluate("composables/emailVerification.ts", scope));
  const ui = host();
  const app = ui.renderer.createApp(await evaluate("pages/auth/verify-account.vue", scope));
  app.config.globalProperties.$t = (key) => key;
  app.component("SectionTitle", tag("header"));
  app.component("SvgVerifyAccount", tag("svg"));
  app.component("FormVerifyAccount", tag("form"));
  app.component("NuxtLink", tag("a"));
  app.component("Btn", tag("button"));
  app.mount(ui.root);
  t.after(() => app.unmount());
  await settle();
  const one = (type) => ui.all().find((n) => n.type === type);
  return {
    // What the tab says at this moment.
    title: () => head().title,
    form: () => one("form"),
    heading: () => one("header")?.props.heading,
    link: () => one("a") && { to: one("a").props.to, label: ui.text(one("a")).trim() },
    async confirm() {
      one("form").props.onStatus("success");
      await settle();
    },
  };
}

test("the page names its purpose and leads a confirmed account only to a page of this site", async (t) => {
  for (const [redirect, to, label] of [
    ["/courses/python?skillID=a#plan", "/courses/python?skillID=a#plan", "Buttons.Continue"],
    [undefined, "/dashboard", "CharacterDashboard.Nav"],
    ["/dashboard", "/dashboard", "CharacterDashboard.Nav"],
    ["/dashboard/", "/dashboard", "CharacterDashboard.Nav"],
    ["https://example.invalid/courses", "/dashboard", "CharacterDashboard.Nav"],
    ["//example.invalid", "/dashboard", "CharacterDashboard.Nav"],
    ["/auth/login?redirect=/courses", "/dashboard", "CharacterDashboard.Nav"],
    [["/courses/a", "https://example.invalid"], "/dashboard", "CharacterDashboard.Nav"],
  ]) {
    const page = await confirmation(t, { redirect });
    assert.equal(page.heading(), "Headings.ConfirmEmail");
    assert.equal(page.title(), "Headings.ConfirmEmail · Bootstrap Academy");
    assert.ok(page.form() && !page.link(), "the form stands until the address is confirmed");
    await page.confirm();
    assert.ok(!page.form());
    // The card says that the address is confirmed, and so does the tab.
    assert.equal(page.title(), "Headings.EmailConfirmed · Bootstrap Academy");
    assert.deepEqual(page.link(), { to, label }, JSON.stringify(redirect));
  }
  // A guest who began an exercise goes back to it first.
  const guest = await confirmation(t, { redirect: "/courses/python" }, "/start");
  await guest.confirm();
  assert.deepEqual(guest.link(), { to: "/start", label: "Guest.Continue" });
});

test("the success card carries no white or light-grey surface", async () => {
  const { descriptor } = parse(
    await readFile(new URL("../components/svg/VerifyAccount.vue", import.meta.url), "utf8")
  );
  const fills = [...descriptor.template.content.matchAll(/fill="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(fills.length > 20);
  for (const fill of fills.filter((value) => value !== "none")) {
    assert.match(fill, /^#[0-9A-F]{6}$/, fill);
    // Every channel of a white or light-grey fill is high; a dark or a clear colour has a low one.
    const lowest = Math.min(...[1, 3, 5].map((i) => parseInt(fill.slice(i, i + 2), 16)));
    assert.ok(lowest < 192, fill);
  }
});

test("both languages name the address and hold every text the page uses", async () => {
  for (const language of ["de", "en-US"]) {
    const { default: locale } = await import(`../locales/${language}.json`, {
      with: { type: "json" },
    });
    for (const key of [
      "VerifyAccountSending",
      "VerifyAccountSent",
      "VerifyAccountResent",
      "VerifyAccountOpen",
      "VerifyAccountNotSent",
    ])
      assert.match(locale.Body[key], /\{email\}/, `${language} ${key}`);
    // The two sentences without a code that surely went out point at the way to a new one.
    for (const key of ["VerifyAccountNotSent", "VerifyAccountOpen"])
      assert.ok(locale.Body[key].includes(locale.Buttons.ResendAccountVerificationCode), key);
    // The sentence for an answer that never came claims neither a sent code nor a failed one.
    assert.doesNotMatch(
      locale.Body.VerifyAccountOpen,
      /geschickt|gesendet|konnten|we've sent|couldn't/i
    );
    // The sentence of a visit in which nothing was sent does not take a mail for granted.
    assert.match(locale.Body.VerifyAccount, /^(Wenn du|If you)/);
    // Said once: the message that used to stand next to the sentence is gone.
    assert.ok(!("ResendAccountVerificationCode" in locale.Success));
    const texts = [
      locale.Headings.ConfirmEmail,
      locale.Headings.EmailConfirmed,
      locale.Body.VerifyAccount,
      locale.Body.VerifyAccountSending,
      locale.Body.VerifyAccountSent,
      locale.Body.VerifyAccountResent,
      locale.Body.VerifyAccountOpen,
      locale.Body.VerifyAccountNotSent,
      locale.Body.VerifyAccountNoEmail,
      locale.Inputs.VerificationCode,
      locale.Buttons.ConfirmCode,
      locale.Buttons.ResendAccountVerificationCode,
      locale.Links.ChangeEmailInProfile,
      locale.Buttons.Logout,
      locale.Buttons.AddEmail,
      locale.Buttons.Continue,
      locale.Success.VerifyAccount,
      locale.Error.VerificationCodeMissing,
      locale.Error.VerificationCodeFormat,
      locale.Error.InvalidVerificationCode,
      locale.Error.VerifyEmail,
      // The ways to the page say what the page says: the dialogs after the registration and
      // after a changed address, the card in the account and the note of the coin order.
      locale.Buttons.VerifyAccount,
      locale.Headings.VerifyAccount,
      locale.Body.VerifyAccountCard,
      locale.Error.AccountNotVerified,
    ];
    for (const text of texts) assert.ok(typeof text === "string" && text.length > 0, language);
    // One word for the thing the mail brings, on the whole page.
    assert.equal(locale.Inputs.VerificationCode, "Code");
    // The English "verify" counts as well as "verified", "verification" and "verifizieren".
    for (const text of texts)
      assert.doesNotMatch(text, /verif[iy]|schlüssel|\bkey\b/i, `${language}: ${text}`);
  }
});
