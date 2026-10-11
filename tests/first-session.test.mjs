// The way of a new visitor to the first solved exercise: what each page shows and asks on that way.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { parse } from "@vue/compiler-sfc";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const locales = Object.fromEntries(
  await Promise.all(
    ["de", "en-US"].map(async (language) => [
      language,
      JSON.parse(await read(`locales/${language}.json`)),
    ])
  )
);

/** Every element of a component's template, each with the elements it stands in. */
async function elements(path) {
  const found = [];
  (function visit(node, parents) {
    if (node.type === 1) found.push({ node, parents });
    for (const child of node.children ?? [])
      visit(child, node.type === 1 ? [...parents, node] : parents);
    for (const branch of node.branches ?? []) visit(branch, parents);
  })(parse(await read(path)).descriptor.template.ast, []);
  return found;
}
const attribute = (node, name) => node.props.find((p) => p.name === name)?.value?.content;
const bound = (node, name) => node.props.find((p) => p.arg?.content === name)?.exp?.content;
const condition = (node) =>
  node.props.find((p) => ["if", "else-if"].includes(p.name))?.exp?.content.replace(/\s+/g, " ");

test("the pricing page shows a visitor without an account the plans, and reports nothing as missing", async () => {
  const page = await elements("pages/subscription/index.vue");
  // The cards do not wait for what only an account can load.
  const card = page.find(({ node }) => node.tag === "SubscriptionCard").node;
  assert.equal(condition(card), "policyKnown || guest");
  assert.equal(bound(card, "guest"), "guest");
  // The message about a Premium state that did not load is for accounts.
  const alerts = page.filter(({ node }) => attribute(node, "role") === "alert");
  const missing = alerts.filter(({ node }) =>
    node.loc.source.includes("Error.PremiumStatusUnavailable")
  );
  assert.equal(missing.length, 1);
  assert.equal(condition(missing[0].node), "!guest && !premiumStatusKnown && !premiumBusy");
  // Nothing asks for that state on arrival, so nothing fails and nothing pops up.
  const source = await read("pages/subscription/index.vue");
  assert.match(source, /const guest = computed\(\(\) => !accessToken\.value\);/);
  const mounted = source.slice(source.indexOf("onMounted(async () => {"));
  const loads = mounted.slice(0, mounted.indexOf("});"));
  assert.match(loads, /\.\.\.\(guest\.value \? \[\] : \[refreshPremiumStatus\(\)\]\)/);
  assert.equal(loads.match(/refreshPremiumStatus\(\)/g).length, 1);
  assert.match(loads, /getPremiumPlans\(\)/);
  for (const language of ["de", "en-US"])
    assert(locales[language].Links.CreateFreeAccount, language);
});

test("the sign-up form asks for one name and states the rules of its fields before an error", async () => {
  const form = await elements("components/form/Signup.vue");
  const inputs = form.filter(({ node }) => node.tag === "Input").map(({ node }) => node);
  assert.deepEqual(
    inputs.map((node) => attribute(node, "id")),
    ["SignupUsername", "SignupEmail", "SignupPassword"]
  );
  const hints = Object.fromEntries(
    inputs.map((node) => [attribute(node, "id"), attribute(node, "hint")])
  );
  assert.deepEqual(hints, {
    SignupUsername: "Inputs.NicknameRule",
    SignupEmail: undefined,
    SignupPassword: "Inputs.PasswordRule",
  });
  // The rule a field checks is the sentence it shows, so the two cannot drift apart.
  const source = await read("components/form/Signup.vue");
  assert.match(source, /\/\^\[a-zA-Z\\d\]\{3,32\}\$\/\.test\(v\) \|\| "Inputs\.NicknameRule"/);
  assert.match(source, /\.\{8,\}\)\?\$\/\.test\(v\) \|\| "Inputs\.PasswordRule"/);
  for (const language of ["de", "en-US"]) {
    const { Inputs } = locales[language];
    assert.match(Inputs.NicknameRule, /3\D+32/, language);
    assert.match(Inputs.PasswordRule, /8/, language);
  }
  // The account still gets a display name: the one name the form asks for.
  assert.match(source, /obj\.display_name = form\.name\.value;/);
  assert(!source.includes("Inputs.DisplayName"));
  // Both consents stay.
  const boxes = form.filter(({ node }) => node.tag === "InputCheckbox");
  assert.deepEqual(
    boxes.map(({ node }) => attribute(node, "id")),
    ["TermsAndConditions", "MinimumAge"]
  );
});

test("a field writes its rule once: a broken rule turns the hint red and is not repeated below", async () => {
  const Vue = await import("vue");
  const { evaluate, host, settle } = await import("./helpers/mounted-page.mjs");
  const sentences = {
    "Inputs.NicknameRule": "three to 32 letters and digits",
    "Error.InputEmpty": "please enter: {placeholder}",
  };
  const t = (key, named = {}) =>
    (sentences[key] ?? key).replace(/\{(\w+)\}/g, (whole, name) => named[name] ?? whole);
  const Input = await evaluate("components/input/index.vue", {
    require: (name) => ({ vue: Vue, "vue-i18n": { useI18n: () => ({ t }) } })[name],
    computed: Vue.computed,
    ref: Vue.ref,
    onMounted: Vue.onMounted,
  });
  const rules = [
    (v) => !!v || "Error.InputEmpty_Inputs.Nickname",
    (v) => /^[a-zA-Z\d]{3,32}$/.test(v) || "Inputs.NicknameRule",
  ];
  async function field(value, hint = "Inputs.NicknameRule") {
    const { root, renderer, all } = host();
    renderer
      .createApp({
        render: () =>
          Vue.h(Input, {
            id: "f",
            label: "Inputs.Nickname",
            hint,
            rules,
            modelValue: value,
            showError: true,
          }),
      })
      .mount(root);
    await settle();
    const text = (node) => [node.text, ...node.children.map(text)].join("").trim();
    const paragraph = (id) => all().find((node) => node.props.id === id);
    return {
      hint: paragraph("f-hint") && {
        says: text(paragraph("f-hint")),
        red: String(paragraph("f-hint").props.class).includes("text-error"),
      },
      below: text(paragraph("f-error")),
      invalid: all().find((node) => node.type === "input").props["aria-invalid"] === "true",
    };
  }
  // A name that fits: the rule stands there, in the colour of text.
  assert.deepEqual(await field("Mara42"), {
    hint: { says: sentences["Inputs.NicknameRule"], red: false },
    below: "",
    invalid: false,
  });
  // A name with a space: the same sentence turns red, and nothing repeats it below the field.
  assert.deepEqual(await field("Mara Lernt"), {
    hint: { says: sentences["Inputs.NicknameRule"], red: true },
    below: "",
    invalid: true,
  });
  // Another failure than the hint's rule is still said below the field.
  assert.deepEqual(await field(""), {
    hint: { says: sentences["Inputs.NicknameRule"], red: false },
    below: "please enter: Inputs.Nickname",
    invalid: true,
  });
  // A field without a hint says its broken rule below, as before.
  assert.deepEqual(await field("Mara Lernt", ""), {
    hint: undefined,
    below: sentences["Inputs.NicknameRule"],
    invalid: true,
  });
});

test("the sign-up form offers the sign-in providers of the log-in form, with the same building block", async () => {
  const login = await elements("components/form/Login.vue");
  const signup = await elements("components/form/Signup.vue");
  const block = (form) => form.filter(({ node }) => node.tag === "FormOAuthProviders");
  assert.equal(block(login).length, 1);
  assert.equal(block(signup).length, 1);
  assert.equal(attribute(block(login)[0].node, "label"), "Body.OrLoginWith");
  assert.equal(attribute(block(login)[0].node, "action"), "Buttons.LoginWithProvider");
  assert.equal(attribute(block(signup)[0].node, "label"), "Body.OrSignupWith");
  assert.equal(attribute(block(signup)[0].node, "action"), "Buttons.SignupWithProvider");
  // An account that has just come back from its provider is not offered the providers again.
  assert.equal(condition(block(signup)[0].node), "!register_token");
  // The block loads the providers itself and starts the flow the log-in form started.
  const source = await read("components/form/OAuthProviders.vue");
  assert.match(source, /onMounted\(getOAuthProviders\);/);
  assert.match(source, /await startOAuthFlow\(provider_id\)/);
  assert(!(await read("components/form/Login.vue")).includes("startOAuthFlow"));
  for (const language of ["de", "en-US"]) {
    const { Body, Buttons } = locales[language];
    assert(Body.OrSignupWith && Body.OrSignupWith !== Body.OrLoginWith, language);
    assert(Buttons.SignupWithProvider.includes("{provider}"), language);
  }
});

test("the practice step of the guest exercise says its result where the figure stands, once", async () => {
  const Vue = await import("vue");
  const { renderToString } = await import("vue/server-renderer");
  const { compileScript } = await import("@vue/compiler-sfc");
  const ts = (await import("typescript")).default;
  const { descriptor } = parse(await read("components/learning/LoopExplorer.vue"));
  const code = ts.transpileModule(
    compileScript(descriptor, { id: "loop-explorer", inlineTemplate: true }).content,
    { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS } }
  ).outputText;
  const exports = {};
  new Function("require", "exports", code)((name) => ({ vue: Vue })[name], exports);
  const exercise = JSON.parse(await read("utils/guest/loops-intro.json"));
  for (const language of ["de", "en"]) {
    const content = exercise.content[language];
    const explorer = async (practiceRepetitions) => {
      const html = await renderToString(
        Vue.createSSRApp({
          render: () =>
            Vue.h(exports.default, {
              content,
              state: { stage: 3, practiceRepetitions },
              disabled: false,
              locale: language,
            }),
        })
      );
      const result = html.match(/<p class="experiment-result[^"]*"[^>]*>(.*?)<\/p>/s);
      return { html, result: result[0], says: result[1].trim() };
    };
    // On the way the line says where the figure stands.
    const before = await explorer(3);
    assert.equal(
      before.says,
      content.practice.position.replace("{count}", 3).replace("{position}", 6)
    );
    assert(!before.result.includes("reached"), language);
    assert(!before.html.includes(content.practice.correct), language);
    assert.match(before.html, /<button[^>]*class="action next-action"[^>]*disabled/, language);
    // At the target the same line is the result, and nothing below the slider repeats it.
    const at = await explorer(content.practice.target / content.practice.stride);
    assert.equal(at.says, content.practice.correct, language);
    assert(at.result.includes("reached"), language);
    assert.equal(at.html.split(content.practice.correct).length - 1, 1, language);
    assert(!/<button[^>]*class="action next-action"[^>]*disabled/.test(at.html), language);
  }
  // Letting go of the slider at the target brings the button that leads on into view.
  const explorer = await elements("components/learning/LoopExplorer.vue");
  const slider = explorer.find(({ node }) => attribute(node, "type") === "range").node;
  assert.equal(slider.props.find((p) => p.arg?.content === "change").exp.content, "showWayOn");
  const actions = explorer.find(({ node }) => attribute(node, "class") === "step-actions").node;
  assert.equal(attribute(actions, "ref"), "actions");
  const source = await read("components/learning/LoopExplorer.vue");
  assert.match(
    source,
    /if \(stage\.value === 3 && practiceCorrect\.value\)\s+actions\.value\?\.scrollIntoView\(\{ block: "nearest" \}\);/
  );
});

test("the log-in page starts with its form; the note for moved accounts unfolds below it", async () => {
  const page = await elements("pages/auth/login.vue");
  const form = page.find(({ node }) => node.tag === "FormLogin");
  const note = page.find(
    ({ node }) =>
      node.loc.source.startsWith("<p") && node.loc.source.includes("Body.ChallengesNickname")
  );
  const fold = page.find(({ node }) => node.tag === "details").node;
  // The note is inside the part that unfolds, and that part comes after the form.
  assert(note.parents.includes(fold));
  assert(fold.loc.start.offset > form.node.loc.end.offset);
  const summary = page.find(({ node }) => node.tag === "summary");
  assert(summary.parents.includes(fold));
  assert.match(summary.node.loc.source, /t\("Body\.ChallengesNicknameQuestion"\)/);
  // Unfolding it does not take the focus from the first field, which would then report
  // itself as required: the press on the line leaves the focus alone.
  const press = summary.node.props.find((p) => p.name === "on" && p.arg?.content === "mousedown");
  assert(press && !press.exp, "the press itself does nothing");
  assert.deepEqual(
    press.modifiers.map((modifier) => modifier.content ?? modifier),
    ["prevent"]
  );
  // Nothing but the heading stands between the top of the page and the form.
  const before = page.filter(
    ({ node, parents }) =>
      parents.includes(form.parents.at(-1)) && node.loc.end.offset <= form.node.loc.start.offset
  );
  assert.deepEqual(
    before.map(({ node }) => node.tag),
    ["h1"]
  );
  for (const language of ["de", "en-US"]) {
    const { Body } = locales[language];
    assert.match(Body.ChallengesNicknameQuestion, /the-morpheus\.cc\?$/, language);
    assert.match(Body.ChallengesNickname, /the-morpheus\.cc/, language);
  }
});

test("a refused log-in says in plain words what does not fit", () => {
  assert.equal(
    locales.de.Error.InvalidCredentials,
    "E-Mail-Adresse, Nickname oder Passwort stimmt nicht."
  );
  assert.equal(
    locales["en-US"].Error.InvalidCredentials,
    "E-mail address, nickname or password isn’t right."
  );
});
