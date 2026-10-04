import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { compileScript, compileTemplate, parse } from "@vue/compiler-sfc";
import { createRenderer, h, nextTick, reactive, ref } from "vue";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = await fs.readFile(
  new URL("../components/challenges/CodeEditor.vue", import.meta.url),
  "utf8"
);
const { descriptor } = parse(source);
const script = compileScript(descriptor, { id: "challenge-editor-test" });
const template = compileTemplate({
  source: descriptor.template.content,
  filename: "CodeEditor.vue",
  id: "challenge-editor-test",
});
let code =
  script.content.replace("export default", "const component =") +
  "\n" +
  template.code +
  "\ncomponent.render = render; export default component;";
code = ts.transpileModule(code, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
code = code
  .replaceAll(
    'from "~/utils/apiError"',
    `from ${JSON.stringify(new URL("../utils/apiError.ts", import.meta.url).href)}`
  )
  .replace(
    /from ["']vue["']/g,
    `from ${JSON.stringify(pathToFileURL(require.resolve("vue")).href)}`
  )
  .replace(/import \{ useI18n \} from "vue-i18n";/, "const useI18n = () => ({ t: key => key });")
  .replace(/import \{ HeartIcon \} from "@heroicons\/vue\/24\/outline";/, "const HeartIcon = {};")
  .replace(
    /import \{\s*createSubmission,[\s\S]*?\} from "~~\/composables\/codingChallenges";/,
    "const createSubmission = (...args) => globalThis.__challengeEditorDependencies.createSubmission(...args); const getEnvironments = () => globalThis.__challengeEditorDependencies.getEnvironments(); const useEnvironments = () => globalThis.__challengeEditorDependencies.useEnvironments(); const useCodingSubmission = () => globalThis.__challengeEditorDependencies.useCodingSubmission();"
  )
  .replace('import("monaco-editor")', "globalThis.__loadChallengeEditorMonaco()");
// Keep the import replacement scoped to the coding dependency, never Vue imports.
assert(code.includes("defineComponent"));
const { default: component } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const flush = async () => {
  for (let i = 0; i < 6; i++) await nextTick();
};

function fixture(mobile = false) {
  let observed,
    vm,
    finish,
    loads = 0,
    creates = 0,
    disposed = 0;
  const env = ref({ python: { example: "print(1)" } }),
    submission = ref(null);
  const globals = [
    "window",
    "IntersectionObserver",
    "usePremiumInfo",
    "useDailyLearning",
    "useDailyAttemptLimit",
    "getPremiumStatus",
    "openSnackbar",
    "__loadChallengeEditorMonaco",
    "__challengeEditorDependencies",
  ];
  const previous = new Map(
    globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  );
  globalThis.window = { matchMedia: () => ({ matches: mobile }) };
  globalThis.IntersectionObserver = class {
    constructor(callback) {
      observed = { callback, disconnected: false };
    }
    observe(target) {
      observed.target = target;
    }
    disconnect() {
      observed.disconnected = true;
    }
  };
  globalThis.usePremiumInfo = () => ref({ premium: true });
  globalThis.useDailyLearning = () => ({ isDaily: ref(false) });
  globalThis.useDailyAttemptLimit = () => ({ attemptLimit: ref(null), handleLimit: () => false });
  globalThis.getPremiumStatus = async () => {};
  const attempts = [];
  globalThis.openSnackbar = () => {};
  globalThis.__challengeEditorDependencies = {
    async createSubmission(_challenge, _coding, payload) {
      attempts.push(payload);
      return [false, "fixture-error"];
    },
    getEnvironments: async () => {},
    useEnvironments: () => env,
    useCodingSubmission: () => submission,
  };
  const models = [],
    languages = [];
  globalThis.__loadChallengeEditorMonaco = () => {
    loads++;
    return new Promise((resolve) => {
      finish = () =>
        resolve({
          editor: {
            create(_target, options) {
              creates++;
              models.push(options);
              let value = options.value;
              return {
                getValue: () => value,
                setValue: (next) => {
                  value = next;
                },
                getModel: () => ({
                  onDidChangeContent() {},
                  dispose() {
                    disposed++;
                  },
                }),
                dispose() {
                  disposed++;
                },
              };
            },
            setModelLanguage(_model, language) {
              languages.push(language);
            },
          },
        });
    });
  };
  const node = (type) => ({ type, children: [], props: {}, style: {}, parent: null });
  const detach = (child) => {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
  };
  const renderer = createRenderer({
    createElement: node,
    createText: () => node("text"),
    createComment: () => node("comment"),
    setText(child, text) {
      child.text = text;
    },
    setElementText(child, text) {
      child.text = text;
      child.children = [];
    },
    parentNode: (child) => child.parent,
    nextSibling: (child) => child.parent?.children[child.parent.children.indexOf(child) + 1],
    insert(child, parent, anchor) {
      detach(child);
      child.parent = parent;
      const at = anchor ? parent.children.indexOf(anchor) : -1;
      if (at < 0) parent.children.push(child);
      else parent.children.splice(at, 0, child);
    },
    remove: detach,
    patchProp(child, key, _old, value) {
      child.props[key] = value;
    },
  });
  const props = reactive({ modelValue: "initial", selectedLanguage: "python", showButtons: false });
  const app = renderer.createApp({
    render: () =>
      h(component, {
        ...props,
        ref: (value) => {
          vm = value;
        },
        "onUpdate:modelValue": (value) => {
          props.modelValue = value;
        },
      }),
  });
  app.config.warnHandler = () => {};
  app.mount(node("root"));
  return {
    props,
    submission,
    models,
    languages,
    attempts,
    get vm() {
      return vm;
    },
    get loads() {
      return loads;
    },
    get creates() {
      return creates;
    },
    get disposed() {
      return disposed;
    },
    visible() {
      observed.callback([{ isIntersecting: true, intersectionRatio: 1, target: observed.target }]);
    },
    finish() {
      finish();
    },
    unmount() {
      app.unmount();
    },
    cleanup() {
      app.unmount();
      for (const [key, value] of previous)
        if (value) Object.defineProperty(globalThis, key, value);
        else delete globalThis[key];
    },
  };
}

test("hidden coding does not load Monaco; mobile typing and saved submissions use native editing", async () => {
  const f = fixture(true);
  try {
    await flush();
    assert.equal(f.loads, 0);
    f.visible();
    await flush();
    assert.equal(f.loads, 0);
    await f.vm.fnCreateSubmission();
    assert.equal(f.attempts.at(-1).code, "initial");
    f.vm.nativeInput({ target: { value: "print('phone')" } });
    await flush();
    assert.equal(f.props.modelValue, "print('phone')");
    f.submission.value = { code: "saved", environment: "python" };
    await flush();
    assert.equal(f.props.modelValue, "saved");
    await f.vm.fnCreateSubmission();
    assert.equal(f.attempts.at(-1).code, "saved");
  } finally {
    f.cleanup();
  }
});

test("visible desktop coding loads once, preserves edits during loading and disposes model/editor", async () => {
  const f = fixture();
  try {
    await flush();
    assert.equal(f.loads, 0);
    f.visible();
    f.visible();
    await flush();
    assert.equal(f.loads, 1);
    f.vm.nativeInput({ target: { value: "typed before load" } });
    await flush();
    f.finish();
    await flush();
    assert.equal(f.creates, 1);
    assert.equal(f.models[0].value, "typed before load");
    assert.equal(f.models[0].language, "python");
    f.props.selectedLanguage = "java";
    await flush();
    assert.deepEqual(f.languages, ["java"]);
    f.unmount();
    assert.equal(f.disposed, 2);
  } finally {
    f.cleanup();
  }
});

test("unmounting while Monaco loads never creates an editor", async () => {
  const f = fixture();
  try {
    await flush();
    f.visible();
    await flush();
    f.unmount();
    f.finish();
    await flush();
    assert.equal(f.creates, 0);
  } finally {
    f.cleanup();
  }
});
