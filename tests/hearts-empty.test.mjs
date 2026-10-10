// Synthetic state only: when a submit form shows the way forward instead of its button.
process.env.TZ = "Europe/Berlin";
import { decodeApiError } from "../utils/apiError.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as Vue from "vue";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
async function evaluate(file, bindings, exported) {
  const code = ts
    .transpileModule(await read(file), {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    })
    .outputText.replace(/^import .*?;\n/gm, "")
    .replace(/^export /gm, "");
  return new Function(...Object.keys(bindings), `${code}\nreturn {${exported}};`)(
    ...Object.values(bindings)
  );
}
const shop = await evaluate(
  "composables/shop.ts",
  {},
  "displayHearts,nextHeartRefill,heartRefillTime"
);

async function fixture(t, { hearts = 6, premium = false, premiumKnown = true, mode = "legacy" }) {
  const heartInfo = Vue.ref(hearts === null ? null : { hearts });
  const policy = Vue.ref(mode);
  const state = { heartInfo, policy, server: hearts, reads: [] };
  const { useHeartsEmpty } = await evaluate(
    "composables/hearts.ts",
    {
      ref: Vue.ref,
      computed: Vue.computed,
      watch: Vue.watch,
      decodeApiError,
      displayHearts: shop.displayHearts,
      useState: () => heartInfo,
      usePremiumInfo: () => Vue.ref(premium === null ? null : { premium }),
      usePremiumStatusKnown: () => Vue.ref(premiumKnown),
      useDailyLearning: () => ({
        isDaily: Vue.computed(() => policy.value === "daily"),
        showHearts: Vue.computed(() => ["legacy", "shadow"].includes(policy.value)),
      }),
      useUser: () => Vue.ref({ id: "learner" }),
      GET: async (path) => {
        state.reads.push(path);
        return { hearts: state.server };
      },
    },
    "useHeartsEmpty"
  );
  const scope = Vue.effectScope();
  t.after(() => scope.stop());
  return { ...state, state, api: scope.run(useHeartsEmpty) };
}
const settle = async () => {
  await new Promise(setImmediate);
  await Vue.nextTick();
};
const refusal = { statusCode: 403, data: { error: "not_enough_hearts" } };

test("an empty balance replaces the submit button only for a known hearts account without Premium", async (t) => {
  for (const [given, expected, why] of [
    [{ hearts: 0 }, true, "no heart left"],
    [{ hearts: 1 }, true, "half a heart is not enough for an attempt"],
    [{ hearts: 2 }, false, "one whole heart allows an attempt"],
    [{ hearts: 0, mode: "shadow" }, true, "shadow mode still charges hearts"],
    [{ hearts: null }, false, "an unknown balance is not an empty one"],
    [{ hearts: 0, premium: true }, false, "Premium needs no hearts"],
    [{ hearts: 0, premium: null, premiumKnown: false }, false, "Premium status not loaded yet"],
    [{ hearts: 0, mode: "daily" }, false, "daily learning needs no hearts"],
    [{ hearts: 0, mode: null }, false, "an unknown policy keeps the submit button"],
  ])
    assert.equal((await fixture(t, given)).api.heartsEmpty.value, expected, why);
});

test("a refused attempt shows the way forward without a balance and yields once a heart is back", async (t) => {
  const f = await fixture(t, { hearts: null, premium: null, premiumKnown: false, mode: null });
  for (const other of [
    { statusCode: 429, data: { error: "too_many_requests" } },
    { statusCode: 403, data: { error: "permission_denied" } },
    { statusCode: 503, data: { error: "not_enough_hearts" } },
    new Error("Offline"),
  ])
    assert.equal(f.api.handleNoHearts(other), false, "other errors stay with the caller");
  assert.equal(f.api.heartsEmpty.value, false);
  assert.deepEqual(f.reads, []);

  f.state.server = 0;
  assert.equal(f.api.handleNoHearts(refusal), true);
  assert.equal(f.api.heartsEmpty.value, true);
  await settle();
  assert.deepEqual(f.reads, ["/shop/hearts/learner"], "the refusal reads the balance once");
  assert.equal(f.api.heartsEmpty.value, true);

  // A purchased or automatic refill arrives as a new balance.
  f.heartInfo.value = { hearts: 6 };
  await settle();
  assert.equal(f.api.heartsEmpty.value, false);
});

test("a refusal that the balance contradicts does not keep the submit button away", async (t) => {
  const f = await fixture(t, { hearts: 6 });
  assert.equal(f.api.handleNoHearts(refusal), true);
  assert.equal(f.api.heartsEmpty.value, true);
  await settle();
  assert.equal(f.api.heartsEmpty.value, false);
});

test("a refusal reported without an error object counts the same way", async (t) => {
  const f = await fixture(t, { hearts: null, premium: null, premiumKnown: false, mode: null });
  f.state.server = 0;
  f.api.reportNoHearts();
  assert.equal(f.api.heartsEmpty.value, true);
  await settle();
  assert.deepEqual(f.reads, ["/shop/hearts/learner"]);
  assert.equal(f.api.heartsEmpty.value, true);
  f.heartInfo.value = { hearts: 2 };
  await settle();
  assert.equal(f.api.heartsEmpty.value, false);
});

test("the free refill is shown as 00:00 UTC in the visitor's own time of day", () => {
  const summer = new Date("2026-10-10T12:00:00Z");
  assert.equal(shop.nextHeartRefill(summer), Date.UTC(2026, 9, 11));
  assert.equal(shop.heartRefillTime("de", summer), "02:00");
  assert.equal(shop.heartRefillTime("en-US", summer), "02:00");
  assert.equal(shop.heartRefillTime("de", new Date("2026-12-01T23:59:59Z")), "01:00");
});

test("quiz, matching and coding hand the hearts refusal to the way forward in both languages", async () => {
  for (const path of [
    "components/form/QuizAnswer.vue",
    "components/form/SolveMatching.vue",
    "components/challenges/CodeEditor.vue",
  ]) {
    const component = await read(path);
    assert.match(component, /<UserHeartsEmpty\s+v-if="[^"]*heartsEmpty"/, path);
    assert.match(component, /handleLimit\(error\) (\|\| |&& !)handleNoHearts\(error\)/, path);
  }
  for (const language of ["de", "en-US"]) {
    const locale = JSON.parse(await read(`locales/${language}.json`));
    assert.match(locale.Body.HeartsEmpty, /\{time\}/);
    assert.equal(typeof locale.Links.UnlimitedHeartsWithPremium, "string");
  }
});

test("the learning room and the coding task list show the same way forward", async () => {
  const room = await read("components/learning/ExerciseRoom.vue");
  assert.match(room, /<UserHeartsEmpty v-if="heartsEmpty"/);
  assert.match(room, /if \(error === "NoHearts"\) reportNoHearts\(\);/);
  // The sentence about the missing heart is not repeated next to the block.
  assert.match(room, /view\.error && !\(view\.error === 'NoHearts' && heartsEmpty\)/);
  const list = await read("components/CodingChallenge/List.vue");
  assert.match(list, /<div v-if="heartsEmpty"[^>]*>\s*<UserHeartsEmpty \/>/);
  assert.match(list, /hearts\.value < 2\) \{\s*reportNoHearts\(\);/);
  assert(
    !list.includes("Error.NotEnoughHearts"),
    "a refused task no longer answers with a snackbar"
  );
});
