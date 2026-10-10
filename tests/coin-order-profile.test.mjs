// The coin order waits for the profile before it says anything about the buyer.
// The page is mounted with its real script and template; everything it reaches is a stand-in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { compileTemplate, parse } from "@vue/compiler-sfc";
import ts from "typescript";
import * as Vue from "vue";
import { pieces } from "./helpers/component-pieces.mjs";

const page = "pages/morphcoins/paypal.vue";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const { descriptor } = parse(await read(page));
const template = compileTemplate({
  source: descriptor.template.content,
  filename: page,
  id: "coin-order",
});
assert.deepEqual(template.errors, []);
const code = ts.transpileModule(`${descriptor.script.content}\n${template.code}`, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
}).outputText;

const tag =
  (name) =>
  (props, { slots }) =>
    Vue.h(name, props, slots.default?.());
const children = {
  NuxtLink: tag("a"),
  Btn: tag("button"),
  InputBtn: tag("button"),
  Input: tag("input"),
  PaypalCheckoutStatus: tag("aside"),
  OrderContract: tag("div"),
  OrderSummary: (props, { slots }) =>
    Vue.h("section", [slots.characteristics?.(), slots.consent?.()]),
};

/** Element tree that keeps everything ever written to it, so a passing state cannot hide. */
function host() {
  const said = [];
  const node = (type, text = "") => {
    if (type !== "comment") said.push(text);
    return {
      type,
      text,
      props: {},
      children: [],
      parent: null,
      // What `v-model` on the select touches.
      options: [],
      selectedIndex: -1,
      addEventListener() {},
    };
  };
  const detach = (n) => {
    if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1);
    n.parent = null;
  };
  const write = (n, text) => {
    said.push(text);
    n.text = text;
  };
  const renderer = Vue.createRenderer({
    createElement: (type) => node(type),
    createText: (text) => node("text", text),
    createComment: (text) => node("comment", text),
    setText: write,
    setElementText: (n, text) => {
      write(n, text);
      n.children = [];
    },
    patchProp: (n, key, _old, value) => {
      if (key === "id") said.push(`#${value}`);
      n.props[key] = value;
    },
    insert: (n, parent, anchor = null) => {
      detach(n);
      n.parent = parent;
      parent.children.splice(
        anchor ? parent.children.indexOf(anchor) : parent.children.length,
        0,
        n
      );
    },
    remove: detach,
    parentNode: (n) => n.parent,
    nextSibling: (n) => n.parent?.children[n.parent.children.indexOf(n) + 1],
  });
  const root = node("root");
  const all = (n = root) => [n, ...n.children.flatMap(all)];
  const text = (n = root) =>
    n.type === "comment" ? "" : [n.text, ...n.children.map(text)].join(" ");
  return { root, renderer, all, text, ever: (what) => said.some((s) => s.includes(what)) };
}

const settle = async () => {
  for (let turn = 0; turn < 5; turn++) {
    await new Promise(setImmediate);
    await Vue.nextTick();
  }
};

const person = { id: "buyer", name: "buyer", display_name: "Buyer", email_verified: true };
const account = (patch) => ({ ...person, email: "buyer@example.invalid", ...patch });
const cookie = ({ id, name, display_name }) => ({ id, name, display_name });
const privateWithoutCountry = account({ business: false, country: null });
const privateWithCountry = account({ business: false, country: "Deutschland" });
const invoice = { first_name: "Ada", last_name: "Buyer", street: "Example Street 1" };
const business = account({ business: true, ...invoice, zip_code: "12345", vat_id: "DE000000000" });
const businessIncomplete = account({ business: true, ...invoice, zip_code: "12345", vat_id: "" });

/** Opens the page for `profile`, either already loaded or with only the cookie in the state. */
async function open(t, profile, loaded = true) {
  const user = Vue.ref(loaded ? profile : cookie(profile));
  const profileLoaded = Vue.ref(loaded);
  const calls = { profile: [], saved: [], offers: [], notices: [] };
  const timer = () => assert.fail("the page must not poll");
  const scope = {
    exports: {},
    require: (name) =>
      ({
        vue: Vue,
        "vue-i18n": { useI18n: () => ({ t: (key) => key, locale: Vue.ref("de") }) },
        "@heroicons/vue/24/outline": { ExclamationCircleIcon: tag("svg") },
      })[name],
    ref: Vue.ref,
    computed: Vue.computed,
    watch: Vue.watch,
    nextTick: Vue.nextTick,
    onMounted: Vue.onMounted,
    onBeforeUnmount: Vue.onBeforeUnmount,
    setTimeout: timer,
    setInterval: timer,
    COIN_PURCHASE_MIN: 500,
    COIN_PURCHASE_MAX: 1_000_000,
    useRoute: () => ({ query: { coins: "500" } }),
    usePaypalCheckout: () => ({
      checkout: Vue.ref(null),
      busy: Vue.ref(false),
      error: Vue.ref(""),
    }),
    useCoinConfig: () => Vue.ref({}),
    usePaypalClientID: () => Vue.ref(""),
    useUser: () => user,
    useProfileLoaded: () => profileLoaded,
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
    requestPurchaseOffer: async (path) => {
      calls.offers.push(path);
      return { id: "offer-1", user_id: user.value.id, product: { coins: 500 } };
    },
    openSnackbar: (...args) => calls.notices.push(args),
  };
  const environment = new Proxy(scope, {
    has: () => true,
    get: (target, key) =>
      key === Symbol.unscopables
        ? undefined
        : key in target
          ? target[key]
          : key in globalThis
            ? globalThis[key]
            : () => {},
  });
  new Function("environment", `with (environment) { ${code} }`)(environment);

  const ui = host();
  const app = ui.renderer.createApp({ ...scope.exports.default, render: scope.exports.render });
  for (const [name, component] of Object.entries(children)) app.component(name, component);
  const vm = app.mount(ui.root);
  t.after(() => app.unmount());
  await settle();

  const says = (key) => ui.text().includes(key);
  const press = async (label) => {
    const button = ui.all().find((n) => n.type === "button" && ui.text(n).includes(label));
    assert.ok(button, `no button ${label}`);
    // The handler may wait for an answer the test gives afterwards.
    button.props.onClick();
    await settle();
  };
  const answer = async (...result) => {
    calls.profile.at(-1)(...result);
    await settle();
  };
  /** What the page tells the buyer right now. */
  const shown = () => ({
    loading: says("Moderation.Loading"),
    failed: says("Error.TryAgainLater"),
    question: ui.all().some((n) => n.props.id === "order-country"),
    buyer: says("Headings.Business") ? "business" : says("Headings.Person") ? "private" : null,
    incomplete: says("Body.MissingProfileInfo") || says("Headings.Missing"),
  });
  return { ui, vm, user, profileLoaded, calls, shown, press, answer };
}

const silent = { loading: true, failed: false, question: false, buyer: null, incomplete: false };
const offered = ["/shop/coins/paypal/offers/500"];

test("without the profile the page loads it once, says nothing about the buyer and saves nothing", async (t) => {
  const order = await open(t, business, false);
  assert.deepEqual(order.shown(), silent);
  assert.equal(order.calls.profile.length, 1);
  assert.deepEqual(order.calls.offers, []);

  // No button offers it, and a call that arrives anyway is refused.
  await order.vm.saveCountry();
  await settle();
  assert.deepEqual(order.calls.saved, []);
  assert.equal(order.calls.profile.length, 1, "one request, no repetition");
  assert.deepEqual(order.shown(), silent);
});

test("a business profile that arrives late never passes through the question for a private buyer", async (t) => {
  const order = await open(t, business, false);
  await order.answer(business);
  assert.deepEqual(order.shown(), {
    loading: false,
    failed: false,
    question: false,
    buyer: "business",
    incomplete: false,
  });
  for (const never of ["#order-country", "Body.CountryForInvoice", "Headings.Person"])
    assert.ok(!order.ui.ever(never), never);
  assert.ok(!order.ui.ever("Body.MissingProfileInfo") && !order.ui.ever("Headings.Missing"));
  assert.deepEqual(order.calls.offers, offered, "the offer follows the profile");
  assert.equal(order.calls.profile.length, 1);
  assert.deepEqual(order.calls.saved, []);
  assert.deepEqual(order.calls.notices, []);
});

test("a failed profile load is reported with a way to try again and still asks nothing", async (t) => {
  for (const [failure, notice] of [
    [{ detail: "Internal Server Error" }, { detail: "Internal Server Error" }],
    [undefined, "Error.TryAgainLater"],
  ]) {
    const order = await open(t, privateWithoutCountry, false);
    await order.answer(null, failure);
    assert.deepEqual(order.shown(), { ...silent, loading: false, failed: true });
    assert.deepEqual(order.calls.notices, [["error", notice]]);
    assert.equal(order.calls.profile.length, 1, "no retry on its own");
    await order.vm.saveCountry();
    assert.deepEqual(order.calls.saved, []);

    await order.press("Buttons.TryAgain");
    order.vm.loadProfile();
    assert.equal(order.calls.profile.length, 2, "a second press does not send a second request");
    assert.deepEqual(order.shown(), silent);
    await order.answer(privateWithoutCountry);
    assert.deepEqual(order.shown(), {
      loading: false,
      failed: false,
      question: true,
      buyer: "private",
      incomplete: false,
    });
    assert.deepEqual(order.calls.notices, [["error", notice]]);
  }
});

test("with the profile loaded the four kinds of buyer see what they saw before", async (t) => {
  for (const [name, profile, expected, offers] of [
    ["private without country", privateWithoutCountry, { question: true, buyer: "private" }, []],
    ["private with country", privateWithCountry, { question: false, buyer: "private" }, offered],
    ["business, complete", business, { question: false, buyer: "business" }, offered],
    [
      "business, incomplete",
      businessIncomplete,
      { question: false, buyer: "business", incomplete: true },
      [],
    ],
  ]) {
    const order = await open(t, profile);
    assert.deepEqual(
      order.shown(),
      { loading: false, failed: false, incomplete: false, ...expected },
      name
    );
    assert.deepEqual(order.calls.offers, offers, name);
    assert.equal(order.calls.profile.length, 0, `${name}: the loaded profile is not requested`);
    assert.deepEqual(order.calls.saved, [], name);
  }

  // The answer of a private buyer is saved by the button and leads on to the offer.
  const order = await open(t, privateWithoutCountry);
  await order.press("Buttons.Continue");
  assert.deepEqual(order.calls.saved, [{ country: "Deutschland", business: false }]);
  assert.deepEqual(order.shown(), {
    loading: false,
    failed: false,
    question: false,
    buyer: "private",
    incomplete: false,
  });
  assert.deepEqual(order.calls.offers, offered);
});

test("another account taking over the tab gets its own profile request and no question", async (t) => {
  const order = await open(t, privateWithoutCountry);
  assert.equal(order.shown().question, true);

  const other = { ...business, id: "other", name: "other", display_name: "Other" };
  order.user.value = cookie(other);
  order.profileLoaded.value = false;
  await settle();
  assert.deepEqual(order.shown(), silent);
  assert.equal(order.calls.profile.length, 1);
  await order.vm.saveCountry();
  assert.deepEqual(order.calls.saved, []);

  await order.answer(other);
  assert.deepEqual(order.shown(), {
    loading: false,
    failed: false,
    question: false,
    buyer: "business",
    incomplete: false,
  });
  assert.equal(order.calls.profile.length, 1);
});

test("the coin shop leaves the decision to the order page while the profile is missing", async () => {
  for (const [user, loaded, passes] of [
    [cookie(person), false, true],
    [account({ email_verified: true }), true, true],
    [account({ email_verified: false }), true, false],
    [null, true, false],
  ]) {
    const pushed = [];
    const notices = [];
    const { onclickSubmitForm } = await pieces(
      "components/form/BuyCoins.vue",
      ["onclickSubmitForm"],
      {
        user: Vue.ref(user),
        profileLoaded: Vue.ref(loaded),
        form: { validate: () => true, morphCoins: { value: 500 } },
        router: { push: (path) => pushed.push(path) },
        openSnackbar: (...args) => notices.push(args),
      }
    );
    await onclickSubmitForm();
    assert.deepEqual(pushed, passes ? ["/morphcoins/paypal?coins=500"] : [], JSON.stringify(user));
    assert.deepEqual(notices, passes ? [] : [["error", "Error.AccountNotVerified"]]);
  }
});

test("the loading state and the retry use texts both languages already have", async () => {
  for (const language of ["de", "en-US"]) {
    const locale = JSON.parse(await read(`locales/${language}.json`));
    assert.equal(typeof locale.Moderation.Loading, "string");
    assert.equal(typeof locale.Error.TryAgainLater, "string");
    assert.equal(typeof locale.Buttons.TryAgain, "string");
  }
});
