// The profile request shared by the pages that need the profile, seen from a session that changes
// under an open page. The composable runs in a mounted component; everything it reaches is a stand-in.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as Vue from "vue";
import { evaluate, host, settle } from "./helpers/mounted-page.mjs";

const here = "/morphcoins/paypal?coins=500";
const login = { path: "/auth/login", query: { redirect: here } };
const cookie = (id) => ({ id, name: id, display_name: id });
const profile = (id) => ({ ...cookie(id), email: `${id}@example.invalid`, email_verified: true });

/** Mounts a page that uses the composable; `user` is what the state holds at that moment. */
async function open(t, { user: initial, loaded = false, token = "token", seen = "visible" }) {
  const user = Vue.ref(initial);
  const profileLoaded = Vue.ref(loaded);
  const accessToken = Vue.ref(token);
  const visibility = Vue.ref(seen);
  const calls = { profile: [], notices: [], left: [] };
  const timer = () => assert.fail("the page must not poll");
  const scope = {
    require: (name) => ({ "@vueuse/core": { useDocumentVisibility: () => visibility } })[name],
    ref: Vue.ref,
    watch: Vue.watch,
    onMounted: Vue.onMounted,
    onBeforeUnmount: Vue.onBeforeUnmount,
    setTimeout: timer,
    setInterval: timer,
    useUser: () => user,
    useProfileLoaded: () => profileLoaded,
    useAccessToken: () => accessToken,
    useRoute: () => ({ fullPath: here }),
    navigateTo: (to) => calls.left.push(to),
    // Answered by the test. As in the app, the state is written before the flag.
    getUser: () =>
      new Promise((resolve) =>
        calls.profile.push((answer, failure) => {
          if (!answer) return resolve([null, failure]);
          user.value = answer;
          profileLoaded.value = true;
          resolve([answer, null]);
        })
      ),
    openSnackbar: (...args) => calls.notices.push(args),
  };
  const { useProfileLoad } = await evaluate("composables/profileLoad.ts", scope);
  let page;
  const ui = host();
  const app = ui.renderer.createApp({
    setup() {
      page = useProfileLoad();
      return () => null;
    },
  });
  app.mount(ui.root);
  t.after(() => app.unmount());
  await settle();
  return {
    calls,
    shown: () => ({ loaded: page.profileLoaded.value, failed: page.profileFailed.value }),
    /** The state as `syncSessionCookies` leaves it for whoever the cookies name now. */
    async becomes(account, nextToken = "token") {
      user.value = account;
      profileLoaded.value = false;
      accessToken.value = nextToken;
      await settle();
    },
    /** The tab comes to the foreground or goes to the background. */
    async looksLike(state) {
      visibility.value = state;
      await settle();
    },
    /** A renewed session: the same account with another token. */
    async renewed(nextToken) {
      accessToken.value = nextToken;
      await settle();
    },
    async answer(n, ...result) {
      calls.profile[n](...result);
      await settle();
    },
  };
}

const waiting = { loaded: false, failed: false };
const ready = { loaded: true, failed: false };

test("the failed request of an account that has left is not reported for the next one", async (t) => {
  const page = await open(t, { user: cookie("first") });
  assert.equal(page.calls.profile.length, 1);
  await page.becomes(cookie("second"));
  assert.equal(page.calls.profile.length, 2);

  // The request of the first account is refused once the session has changed.
  await page.answer(0, null, { error: "session_changed" });
  assert.deepEqual(page.shown(), waiting);
  assert.deepEqual(page.calls.notices, []);

  await page.answer(1, profile("second"));
  assert.deepEqual(page.shown(), ready);
  assert.deepEqual(page.calls.notices, []);
  assert.deepEqual(page.calls.left, []);
});

test("the same account is asked for again whenever it returns after nobody was signed in", async (t) => {
  for (const loaded of [true, false]) {
    const page = await open(t, { user: loaded ? profile("member") : cookie("member"), loaded });
    let requests = loaded ? 0 : 1;
    if (!loaded) await page.answer(0, profile("member"));
    assert.deepEqual(page.shown(), ready);

    for (const round of [1, 2]) {
      // The state holds nobody for a moment; the token keeps the page where it is.
      await page.becomes(null);
      assert.equal(page.calls.profile.length, requests, `round ${round}: nobody to ask for`);
      await page.becomes(cookie("member"));
      assert.equal(page.calls.profile.length, ++requests, `round ${round}: asked again`);
      assert.deepEqual(page.shown(), waiting);
      await page.answer(requests - 1, profile("member"));
      assert.deepEqual(page.shown(), ready);
    }
    assert.deepEqual(page.calls.left, []);
    assert.deepEqual(page.calls.notices, []);
  }
});

test("a page that requires a login leaves for it when the session has ended", async (t) => {
  // Ended in another tab while the profile is shown.
  const shown = await open(t, { user: profile("member"), loaded: true });
  assert.deepEqual(shown.calls.left, []);
  await shown.becomes(null, null);
  assert.deepEqual(shown.calls.left, [login]);
  assert.deepEqual(shown.calls.profile, [], "nothing is requested without a session");

  // Ended while the page was still waiting for the profile.
  const asking = await open(t, { user: cookie("member") });
  await asking.becomes(null, null);
  assert.deepEqual(asking.calls.left, [login]);
  assert.equal(asking.calls.profile.length, 1);

  // The token goes after the account: the page leaves then.
  const later = await open(t, { user: profile("member"), loaded: true });
  await later.becomes(null);
  assert.deepEqual(later.calls.left, [], "a token without an account is a session");
  await later.becomes(null, null);
  assert.deepEqual(later.calls.left, [login]);

  // In the background the page waits for someone to look at it.
  const hidden = await open(t, { user: profile("member"), loaded: true, seen: "hidden" });
  await hidden.becomes(null, null);
  assert.deepEqual(hidden.calls.left, [], "nobody is looking");
  await hidden.looksLike("visible");
  assert.deepEqual(hidden.calls.left, [login]);

  // A renewed session is a session: the page stays and asks for nothing.
  const staying = await open(t, { user: profile("member"), loaded: true });
  await staying.renewed("another token");
  assert.deepEqual(staying.calls.left, []);
  assert.deepEqual(staying.calls.profile, []);
  assert.deepEqual(staying.shown(), ready);
});

test("a tab in the background shows the profile again when the same account has signed in again", async (t) => {
  const page = await open(t, { user: cookie("member"), seen: "hidden" });
  await page.answer(0, profile("member"));
  assert.deepEqual(page.shown(), ready);

  // Another tab signs out and signs the same account in again before anyone looks at this one.
  await page.becomes(null, null);
  assert.deepEqual(page.shown(), waiting);
  await page.becomes(cookie("member"), "next token");
  assert.equal(page.calls.profile.length, 2);
  await page.answer(1, profile("member"));
  assert.deepEqual(page.shown(), ready);

  await page.looksLike("visible");
  assert.deepEqual(page.calls.left, [], "the page stayed where it was");
  assert.deepEqual(page.calls.notices, []);
});
