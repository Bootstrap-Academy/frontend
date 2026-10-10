// The profile form saves every field, so it waits for the profile before it shows or saves anything.
// The page and the form are mounted with their real scripts and templates; everything else is a stand-in.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as Vue from "vue";
import { pieces } from "./helpers/component-pieces.mjs";
import { evaluate, host, settle, tag } from "./helpers/mounted-page.mjs";

const person = { id: "member", name: "member", display_name: "Member" };
const account = (patch) => ({
  ...person,
  email: "member@example.invalid",
  email_verified: true,
  description: "",
  tags: [],
  first_name: "",
  last_name: "",
  street: "",
  zip_code: "",
  city: "",
  country: "",
  vat_id: "",
  business: false,
  leaderboard_opt_out: true,
  ...patch,
});
const cookie = ({ id, name, display_name }) => ({ id, name, display_name });
const privateBuyer = account({ country: "Deutschland" });
const business = account({
  business: true,
  first_name: "Ada",
  last_name: "Member",
  street: "Example Street 1",
  zip_code: "12345",
  city: "Example",
  country: "Österreich",
  vat_id: "ATU00000000",
});
const withoutEmail = account({ email: "", email_verified: false });
/** What the form shows and saves for a profile. */
const saved = ({ id, email_verified, ...fields }) => fields;

/** Opens the edit page for `profile`, either already loaded or with only the cookie in the state. */
async function open(t, profile, { loaded = true, coins, unsynced = false } = {}) {
  const user = Vue.ref(unsynced ? null : loaded ? profile : cookie(profile));
  const profileLoaded = Vue.ref(loaded);
  const calls = {
    profile: [],
    saved: [],
    notices: [],
    dialogs: [],
    pushed: [],
    renewed: 0,
    verification: 0,
  };
  const timer = () => assert.fail("the page must not poll");
  const scope = {
    require: (name) =>
      ({
        vue: Vue,
        "vue-i18n": { useI18n: () => ({ t: (key) => key }) },
        "@heroicons/vue/24/outline": { ExclamationCircleIcon: tag("svg") },
      })[name],
    ref: Vue.ref,
    reactive: Vue.reactive,
    computed: Vue.computed,
    watch: Vue.watch,
    onMounted: Vue.onMounted,
    onBeforeUnmount: Vue.onBeforeUnmount,
    setTimeout: timer,
    setInterval: timer,
    useUser: () => user,
    useProfileLoaded: () => profileLoaded,
    // What every request does first: the state takes over the account the cookies name.
    syncSessionCookies: () => {
      if (!unsynced || user.value) return;
      user.value = cookie(profile);
      profileLoaded.value = false;
    },
    hasEmail: Vue.computed(() => !!(user.value?.email ?? "")),
    profilePublicationEnabled: () => false,
    useRoute: () => ({ query: coins ? { coins } : {} }),
    useRouter: () => ({ push: (path) => calls.pushed.push(path) }),
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
    editUser: async (body) => {
      calls.saved.push(body);
      user.value = { ...user.value, ...body };
      return [user.value, null];
    },
    refresh: async () => calls.renewed++,
    requestEmailVerification: async () => [++calls.verification, null],
    openSnackbar: (...args) => calls.notices.push(args),
    openDialog: (...args) => calls.dialogs.push(args[1]),
  };
  Object.assign(scope, await evaluate("composables/profileLoad.ts", scope));

  const ui = host();
  const app = ui.renderer.createApp(await evaluate("pages/profile/edit.vue", scope));
  app.config.globalProperties.$t = (key) => key;
  app.component("FormProfile", await evaluate("components/form/Profile.vue", scope));
  for (const name of ["Input", "InputTextarea", "InputTags", "InputCheckbox"])
    app.component(name, tag("input"));
  app.component("InputBtn", tag("button"));
  for (const name of ["SectionTitle", "Avatar", "ProfilePublication"])
    app.component(name, tag("div"));
  app.mount(ui.root);
  t.after(() => app.unmount());
  await settle();

  const says = (key) => ui.text().includes(key);
  const input = (label) => ui.all().find((n) => n.type === "input" && n.props.label === label);
  const press = async (label) => {
    const button = ui.all().find((n) => n.type === "button" && ui.text(n).includes(label));
    assert.ok(button, `no button ${label}`);
    // The handler may wait for an answer the test gives afterwards.
    button.props.onClick();
    await settle();
  };
  return {
    ui,
    user,
    profileLoaded,
    calls,
    press,
    answer: async (...result) => {
      calls.profile.at(-1)(...result);
      await settle();
    },
    type: async (label, value) => {
      input(label).props["onUpdate:modelValue"](value);
      input(label).props.onValid?.(true);
      await settle();
    },
    field: (label) => input(label)?.props.modelValue,
    /** What the page shows right now. */
    shown: () => ({
      loading: says("Moderation.Loading"),
      failed: says("Error.TryAgainLater"),
      form: ui.all().some((n) => n.type === "form"),
    }),
    /** The values of the form the way a save would send them. */
    form: () => ({
      ...Object.fromEntries(
        [
          ["email", "Inputs.EmailAddress"],
          ["name", "Inputs.Nickname"],
          ["display_name", "Inputs.Name"],
          ["description", "Inputs.Description"],
          ["tags", "Inputs.Tags"],
          ["first_name", "Inputs.FirstName"],
          ["last_name", "Inputs.LastName"],
          ["street", "Inputs.Street"],
          ["zip_code", "Inputs.ZipCode"],
          ["city", "Inputs.City"],
          ["country", "Inputs.Country"],
        ].map(([key, label]) => [key, input(label).props.modelValue])
      ),
      vat_id: input("Inputs.VAT_ID")?.props.modelValue ?? "",
      business: !!input("Inputs.VAT_ID"),
      leaderboard_opt_out: !input("Inputs.ShowOnLeaderboard").props.modelValue,
    }),
  };
}

const waiting = { loading: true, failed: false, form: false };
const editing = { loading: false, failed: false, form: true };

test("without the profile the page shows no form and no dialog, loads the profile once and saves nothing", async (t) => {
  const page = await open(t, business, { loaded: false });
  assert.deepEqual(page.shown(), waiting);
  assert.ok(!page.ui.ever("<form>") && !page.ui.ever("<input>"), "no field was ever offered");
  assert.equal(page.calls.profile.length, 1, "one request, no repetition");
  assert.deepEqual(page.calls.dialogs, [], "the cookie cannot tell that an address is missing");
  assert.deepEqual(page.calls.saved, []);

  // The form itself refuses as well, wherever it is mounted.
  const refused = [];
  const { onclickSubmitForm } = await pieces("components/form/Profile.vue", ["onclickSubmitForm"], {
    profileLoaded: Vue.ref(false),
    form: { validate: () => true, body: () => ({}), email: { value: "" } },
    props: { data: cookie(business) },
    business: Vue.ref(false),
    showOnLeaderboard: Vue.ref(false),
    editUser: async (body) => refused.push(body),
  });
  await onclickSubmitForm();
  assert.deepEqual(refused, []);
});

test("a state that has not taken over the session cookies yet is brought up to date first", async (t) => {
  // After a start without the `user` cookie the state holds no user and still counts as loaded.
  const page = await open(t, business, { unsynced: true });
  assert.deepEqual(page.shown(), waiting);
  assert.ok(!page.ui.ever("<input>"), "no form for nobody");
  assert.deepEqual(page.calls.dialogs, []);
  assert.equal(page.calls.profile.length, 1);
  await page.answer(business);
  assert.deepEqual(page.shown(), editing);
  assert.deepEqual(page.form(), saved(business));
  assert.deepEqual(page.calls.dialogs, []);
});

test("a failed profile load offers to try again, and form and dialog follow the profile", async (t) => {
  for (const [failure, notice] of [
    [{ detail: "Internal Server Error" }, { detail: "Internal Server Error" }],
    [undefined, "Error.TryAgainLater"],
  ]) {
    const page = await open(t, withoutEmail, { loaded: false });
    await page.answer(null, failure);
    assert.deepEqual(page.shown(), { loading: false, failed: true, form: false });
    assert.deepEqual(page.calls.notices, [["error", notice]]);
    assert.equal(page.calls.profile.length, 1, "no retry on its own");
    assert.deepEqual(page.calls.dialogs, []);

    await page.press("Buttons.TryAgain");
    assert.equal(page.calls.profile.length, 2);
    assert.deepEqual(page.shown(), waiting);
    await page.answer(withoutEmail);
    assert.deepEqual(page.shown(), editing);
    assert.deepEqual(page.form(), saved(withoutEmail));
    assert.deepEqual(page.calls.dialogs, ["Headings.MissingEmail"]);
    assert.deepEqual(page.calls.saved, []);
  }
});

test("a profile that arrives late fills the form, and the same profile arriving again keeps what was typed", async (t) => {
  const page = await open(t, business, { loaded: false });
  assert.ok(!page.ui.ever("<input>"), "nothing can be typed before the profile is there");
  await page.answer(business);
  assert.deepEqual(page.shown(), editing);
  assert.deepEqual(page.form(), saved(business));
  assert.deepEqual(page.calls.dialogs, []);

  // A second answer and a renewed session deliver the same profile as a new object.
  await page.type("Inputs.City", "Typed");
  page.user.value = { ...business };
  await settle();
  assert.equal(page.field("Inputs.City"), "Typed");
  // A profile that really changed is followed, as before.
  page.user.value = { ...business, street: "Changed Street 2" };
  await settle();
  assert.deepEqual(page.form(), saved({ ...business, street: "Changed Street 2" }));
  assert.equal(page.calls.profile.length, 1);
  assert.deepEqual(page.calls.saved, []);
});

test("another account taking over the tab closes the form, and nothing typed reaches that account", async (t) => {
  const page = await open(t, privateBuyer);
  await page.type("Inputs.Street", "Typed Street 3");

  const other = { ...business, id: "other", name: "other", display_name: "Other" };
  page.user.value = cookie(other);
  page.profileLoaded.value = false;
  await settle();
  assert.deepEqual(page.shown(), waiting);
  assert.equal(page.calls.profile.length, 1);
  assert.deepEqual(page.calls.saved, []);

  await page.answer(other);
  assert.deepEqual(page.shown(), editing);
  assert.deepEqual(page.form(), saved(other));
  assert.equal(page.calls.profile.length, 1);
  assert.deepEqual(page.calls.dialogs, []);
});

test("with the profile loaded the form shows and saves what it did before", async (t) => {
  for (const [name, profile, dialogs] of [
    ["private", privateBuyer, []],
    ["business", business, []],
    ["without e-mail", withoutEmail, ["Headings.MissingEmail"]],
  ]) {
    const page = await open(t, profile);
    assert.deepEqual(page.shown(), editing, name);
    assert.deepEqual(page.form(), saved(profile), name);
    assert.deepEqual(page.calls.dialogs, dialogs, name);
    assert.equal(page.calls.profile.length, 0, `${name}: the loaded profile is not requested`);
    assert.deepEqual(page.calls.saved, [], name);
  }

  // Saving sends every field and returns to the coin order it came from.
  for (const [coins, pushed] of [
    [undefined, []],
    ["500", ["/morphcoins/paypal?coins=500"]],
  ]) {
    const page = await open(t, business, { coins });
    await page.type("Inputs.EmailAddress", business.email);
    await page.type("Inputs.City", "Vienna");
    await page.press("Buttons.Safe");
    assert.deepEqual(page.calls.saved, [saved({ ...business, city: "Vienna" })]);
    assert.deepEqual(page.calls.notices, [["success", "Success.EditProfile"]]);
    assert.deepEqual(page.calls.pushed, pushed);
    assert.equal(page.calls.renewed + page.calls.verification, 0);
  }

  // A new address renews the session and asks for its verification.
  const page = await open(t, withoutEmail, { coins: "500" });
  await page.type("Inputs.EmailAddress", "new@example.invalid");
  await page.press("Buttons.Safe");
  assert.deepEqual(page.calls.saved, [saved({ ...withoutEmail, email: "new@example.invalid" })]);
  assert.deepEqual([page.calls.renewed, page.calls.verification], [1, 1]);
  assert.deepEqual(page.calls.dialogs, ["Headings.MissingEmail", "Headings.AddedEmail"]);
  assert.deepEqual(page.calls.pushed, []);
});
