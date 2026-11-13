// Submit the real forms and inspect their requests and notices; services are stand-ins.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as Vue from "vue";
import { evaluate, host, settle, tag } from "./helpers/mounted-page.mjs";

async function open(t, name, answer = [null, { detail: "Error.InvalidCredentials" }]) {
  const calls = { requests: [], notices: [], pushed: [], disabled: 0, dialogs: [] };
  const request = async (body) => {
    calls.requests.push(body);
    return answer;
  };
  const scope = {
    require: (module) =>
      ({
        vue: Vue,
        "vue-i18n": { useI18n: () => ({ t: (key) => key }) },
        "~/utils/guest/handoff": { guestReturnPath: () => "", authorizeGuestHandoff() {} },
      })[module],
    reactive: Vue.reactive,
    computed: Vue.computed,
    useRouter: () => ({ push: (path) => calls.pushed.push(path) }),
    useRoute: () => ({ query: {} }),
    internalPath: () => "",
    hasEmail: Vue.ref(true),
    login: request,
    forgotPassword: request,
    disableMFA: async () => {
      calls.disabled++;
      return [true, null];
    },
    refresh: async () => {},
    openSnackbar: (...args) => calls.notices.push(args),
    openDialog: (...args) => calls.dialogs.push(args),
  };
  const ui = host();
  const app = ui.renderer.createApp(await evaluate(`components/form/${name}.vue`, scope));
  for (const component of ["Input", "InputOTP"]) app.component(component, tag("input"));
  app.component("InputBtn", tag("button"));
  app.component("NuxtLink", tag("a"));
  app.component("FormOAuthProviders", tag("div"));
  const form = app.mount(ui.root);
  t.after(() => app.unmount());
  await settle();
  return {
    calls,
    form,
    async type(label, value) {
      const input = ui.all().find((node) => node.type === "input" && node.props.label === label);
      assert.ok(input, label);
      input.props["onUpdate:modelValue"](value);
      input.props.onValid?.(true);
      await settle();
    },
    async submit() {
      ui.all()
        .find((node) => node.type === "button")
        .props.onClick();
      if (name === "DisableMFA") await calls.dialogs.at(-1)[4].onclick();
      await settle();
    },
  };
}

const forms = ["Login", "DisableMFA", "ForgotPassword"];
const identifierLabel = (name) =>
  name === "ForgotPassword" ? "Inputs.EmailAddress" : "Inputs.EmailOrUsername";

async function fill(page, name, identifier) {
  await page.type(identifierLabel(name), identifier);
  if (name !== "ForgotPassword") await page.type("Inputs.Password", " password with spaces ");
  if (name === "DisableMFA") await page.type("Inputs.MFACode", "123456");
}

for (const name of forms) {
  test(`${name} silently trims the identifier before sending and preserves credentials`, async (t) => {
    for (const identifier of [
      "learner@example.invalid",
      ...(name === "ForgotPassword" ? [] : ["Learner_1"]),
    ]) {
      const page = await open(t, name);
      await fill(page, name, ` \t${identifier} \u00a0`);
      await page.submit();
      assert.equal(page.calls.requests.length, 1);
      const body = page.calls.requests[0];
      assert.equal(body[name === "ForgotPassword" ? "email" : "name_or_email"], identifier);
      if (name !== "ForgotPassword") assert.equal(body.password, " password with spaces ");
      if (name === "DisableMFA") assert.equal(body.mfa_code, "123456");
      assert.equal(page.form.form.submitting, false);
    }
  });

  test(`${name} shows the existing credentials message once for a plaintext 422`, async (t) => {
    const page = await open(t, name, [
      null,
      "Failed to deserialize the JSON body into the target type: name_or_email: data did not match any variant of untagged enum UserNameOrEmailAddress at line 1 column 31",
    ]);
    const identifier = name === "ForgotPassword" ? "learner name@example.invalid" : "learner name";
    await fill(page, name, identifier);
    await page.submit();
    // A display name stays invalid; trimming never joins words into another account name.
    assert.equal(
      page.calls.requests[0][name === "ForgotPassword" ? "email" : "name_or_email"],
      identifier
    );
    assert.deepEqual(page.calls.notices, [["error", "Error.InvalidCredentials"]]);
    assert.equal(page.calls.disabled, 0);
    assert.equal(page.form.form.submitting, false);
  });

  test(`${name} never opens a blank notice for missing or empty error details`, async (t) => {
    for (const error of [
      null,
      undefined,
      {},
      { detail: "" },
      { detail: " \t" },
      { detail: "Error.InvalidCredentials" },
    ]) {
      const page = await open(t, name, [null, error]);
      await fill(page, name, "learner@example.invalid");
      await page.submit();
      assert.deepEqual(page.calls.notices, [["error", "Error.InvalidCredentials"]]);
    }
  });

  test(`${name} retains a meaningful API error`, async (t) => {
    const page = await open(t, name, [null, { detail: "Error.RecaptchaFailed" }]);
    await fill(page, name, "learner@example.invalid");
    await page.submit();
    assert.deepEqual(page.calls.notices, [["error", "Error.RecaptchaFailed"]]);
  });
}

test("login still asks for MFA and shows an incorrect code on the second attempt", async (t) => {
  const page = await open(t, "Login", [null, { detail: "Error.InvalidCode" }]);
  await fill(page, "Login", "learner@example.invalid ");
  await page.submit();
  assert.equal(page.form.needMFA, true);
  assert.deepEqual(page.calls.notices, []);
  await page.type("Inputs.MFACode", "123456");
  await page.submit();
  assert.equal(page.calls.requests[1].name_or_email, "learner@example.invalid");
  assert.equal(page.calls.requests[1].mfa_code, "123456");
  assert.deepEqual(page.calls.notices, [["error", "Error.InvalidCode"]]);
});

test("login retains the rate limit notice and its waiting time", async (t) => {
  const page = await open(t, "Login", [
    null,
    { detail: "Error.TooManyFailedLoginAttempts", retry_after: 120 },
  ]);
  await fill(page, "Login", "learner@example.invalid");
  await page.submit();
  assert.deepEqual(page.calls.notices, [
    ["error", "Error.TooManyFailedLoginAttempts", "", false, { wait: "Body.WaitMinutes" }],
  ]);
});

test("a successful login with trailing whitespace continues normally", async (t) => {
  const page = await open(t, "Login", [{ user: { id: "learner" } }, null]);
  await fill(page, "Login", "learner@example.invalid ");
  await page.submit();
  assert.equal(page.calls.requests[0].name_or_email, "learner@example.invalid");
  assert.deepEqual(page.calls.pushed, ["/dashboard"]);
  assert.deepEqual(page.calls.notices, []);
});
