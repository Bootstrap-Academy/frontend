// The coin order asks a private buyer for the missing country in place; synthetic stand-ins only.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import * as Vue from "vue";
import { pieces } from "./helpers/component-pieces.mjs";

const page = "pages/morphcoins/paypal.vue";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const account = (patch) => ({ email: "buyer@example.invalid", email_verified: true, ...patch });

test("only a private buyer without a country is asked for it", async () => {
  for (const [user, asked, offer, loaded = true] of [
    [null, false, false],
    [account({ business: null, country: null }), true, false],
    [account({ business: false, country: "" }), true, false],
    [account({ business: false, country: "Deutschland" }), false, true],
    [account({ business: false, country: "Deutschland", email_verified: false }), false, false],
    [account({ business: true, country: null }), false, false],
    // Before the profile has arrived the state only holds what the cookie carries.
    [{ id: "buyer", name: "buyer", display_name: "Buyer" }, false, false, false],
    [account({ business: false, country: null }), false, false, false],
    [account({ business: false, country: "Deutschland" }), false, false, false],
  ]) {
    const { needsCountry, canBuy } = await pieces(page, ["canBuy", "needsCountry"], {
      computed: Vue.computed,
      user: Vue.ref(user),
      profileLoaded: Vue.ref(loaded),
    });
    assert.equal(!!needsCountry.value, asked, JSON.stringify(user));
    assert.equal(!!canBuy.value, offer, JSON.stringify(user));
  }
});

test("the browser language preselects Austria and Switzerland, everything else Germany", async () => {
  const names = ["COUNTRIES", "countryOptions", "suggestedCountry"];
  const german = await pieces(page, names, { computed: Vue.computed, locale: Vue.ref("de") });
  for (const [language, expected] of [
    ["de-AT", "Österreich"],
    ["de-CH", "Schweiz"],
    ["fr-CH", "Schweiz"],
    ["de", "Deutschland"],
    ["de-DE", "Deutschland"],
    ["en-US", "Deutschland"],
    ["", "Deutschland"],
    ["not a language", "Deutschland"],
    [undefined, "Deutschland"],
  ])
    assert.equal(german.suggestedCountry(language), expected, String(language));
  // The German spelling is stored whatever the interface language shows.
  assert.deepEqual(german.countryOptions.value, [
    { value: "Deutschland", label: "Deutschland" },
    { value: "Österreich", label: "Österreich" },
    { value: "Schweiz", label: "Schweiz" },
  ]);
  const english = await pieces(page, names, { computed: Vue.computed, locale: Vue.ref("en-US") });
  assert.deepEqual(english.countryOptions.value, [
    { value: "Deutschland", label: "Germany" },
    { value: "Österreich", label: "Austria" },
    { value: "Schweiz", label: "Switzerland" },
  ]);
});

test("the country is saved by the button only, trimmed and at most 64 characters long", async () => {
  for (const [choice, other, saved] of [
    ["Österreich", "", "Österreich"],
    ["Schweiz", "ignored while a listed country is chosen", "Schweiz"],
    ["", "  Luxemburg ", "Luxemburg"],
    ["", "   ", null],
    ["", "x".repeat(65), null],
  ]) {
    const calls = [];
    const attempted = Vue.ref(false);
    const { saveCountry } = await pieces(page, ["saveCountry"], {
      needsCountry: Vue.ref(true),
      countryChoice: Vue.ref(choice),
      otherCountry: Vue.ref(other),
      countryAttempted: attempted,
      savingCountry: Vue.ref(false),
      editUser: async (body) => {
        calls.push(body);
        return [{}, null];
      },
    });
    await saveCountry();
    assert.deepEqual(calls, saved ? [{ country: saved, business: false }] : [], other || choice);
    assert.equal(attempted.value, true);
  }
  // Nothing is written for an account the page does not ask.
  const unasked = [];
  const { saveCountry: idle } = await pieces(page, ["saveCountry"], {
    needsCountry: Vue.ref(false),
    countryChoice: Vue.ref("Deutschland"),
    otherCountry: Vue.ref(""),
    countryAttempted: Vue.ref(false),
    savingCountry: Vue.ref(false),
    editUser: async (body) => unasked.push(body),
  });
  await idle();
  assert.deepEqual(unasked, []);
  for (const [failure, shown] of [
    [{ detail: "Internal Server Error" }, { detail: "Internal Server Error" }],
    [undefined, "Error.TryAgainLater"],
  ]) {
    const notices = [];
    const { saveCountry } = await pieces(page, ["saveCountry"], {
      needsCountry: Vue.ref(true),
      countryChoice: Vue.ref("Deutschland"),
      otherCountry: Vue.ref(""),
      countryAttempted: Vue.ref(false),
      savingCountry: Vue.ref(false),
      editUser: async () => [null, failure],
      openSnackbar: (...args) => notices.push(args),
    });
    await saveCountry();
    assert.deepEqual(notices, [["error", shown]]);
  }
});

test("the page offers three countries and a free text field in both languages", async () => {
  const source = await read(page);
  assert.match(source, /<option v-for="option of countryOptions"/);
  assert.match(source, /<option value="">\{\{ t\("Inputs\.OtherCountry"\) \}\}<\/option>/);
  assert.match(source, /<Input\s+v-if="!countryChoice"\s+v-model="otherCountry"/);
  assert.equal(source.split("editUser(").length - 1, 1, "nothing is saved outside the button");
  assert.match(source, /countryChoice\.value = suggestedCountry\(navigator\.language\);/);
  for (const language of ["de", "en-US"]) {
    const locale = JSON.parse(await read(`locales/${language}.json`));
    assert.equal(typeof locale.Body.CountryForInvoice, "string");
    assert.equal(typeof locale.Inputs.OtherCountry, "string");
  }
});
