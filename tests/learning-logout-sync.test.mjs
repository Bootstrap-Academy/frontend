import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const compile = (source) =>
  ts.transpileModule(source.replace(/^import[\s\S]*?;\n/gm, "").replace(/^export /gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
  }).outputText;
const source = await readFile(new URL("../utils/learningLogoutSync.ts", import.meta.url), "utf8");
const code = compile(source);
function utility(bindings = {}) {
  return new Function(
    ...Object.keys(bindings),
    `${code}\nreturn { learningLogoutSignal, acceptLearningLogout, broadcastLearningLogout, LEARNING_LOGOUT_CHANNEL, LEARNING_LOGOUT_SIGNAL };`
  )(...Object.values(bindings));
}
const ended = { userId: "A", sessionId: "S", generation: "first" };
const signal = { version: 1, ...ended };

test("only well-formed logout signals can clear copies; later logins to the same account are fenced", () => {
  const { learningLogoutSignal, acceptLearningLogout } = utility();
  for (const value of [
    null,
    "A",
    {},
    { ...signal, version: 2 },
    { ...signal, userId: "" },
    { ...signal, generation: null },
  ])
    assert.equal(learningLogoutSignal(value), null);
  assert.deepEqual(learningLogoutSignal(signal), signal);
  assert.equal(acceptLearningLogout(signal, ended), true);
  assert.equal(acceptLearningLogout(signal, { ...ended, userId: "" }), true);
  assert.equal(acceptLearningLogout(signal, { ...ended, userId: "B" }), true);
  assert.equal(acceptLearningLogout(signal, { ...ended, sessionId: "new" }), false);
  assert.equal(acceptLearningLogout(signal, { ...ended, generation: "new" }), false);
});

test("both transports carry only the ended identity and remove the storage signal immediately", () => {
  const messages = [],
    events = [],
    map = new Map();
  class BroadcastChannel {
    constructor(name) {
      this.name = name;
    }
    postMessage(value) {
      messages.push({ channel: this.name, value });
    }
    close() {
      this.closed = true;
    }
  }
  const window = {
    localStorage: {
      setItem(key, value) {
        events.push([key, value]);
        map.set(key, value);
      },
      removeItem(key) {
        map.delete(key);
      },
    },
  };
  const u = utility({ window, BroadcastChannel });
  u.broadcastLearningLogout({
    ...ended,
    accessToken: "never-send",
    refreshToken: "never-send",
    user: { email: "never-send" },
  });
  assert.deepEqual(messages, [{ channel: u.LEARNING_LOGOUT_CHANNEL, value: signal }]);
  assert.deepEqual(JSON.parse(events[0][1]), signal);
  assert.equal(events[0][0], u.LEARNING_LOGOUT_SIGNAL);
  assert.equal(map.size, 0);
  const fallback = utility({
    window,
    BroadcastChannel: class {
      constructor() {
        throw Error("blocked");
      }
    },
  });
  assert.doesNotThrow(() => fallback.broadcastLearningLogout(ended));
  assert.equal(events.length, 2);
  const blocked = utility({
    window: {
      localStorage: {
        setItem() {
          throw Error("blocked");
        },
        removeItem() {
          throw Error("blocked");
        },
      },
    },
    BroadcastChannel,
  });
  assert.doesNotThrow(() => blocked.broadcastLearningLogout(ended));
  assert.equal(messages.length, 2);
});

const pluginCode = compile(
  (
    await readFile(new URL("../plugins/learning-logout-sync.client.ts", import.meta.url), "utf8")
  ).replace("export default", "const plugin =")
);
test("the receiver synchronizes ownership before cleanup, preserves another account, and unregisters", () => {
  const calls = [],
    window = new EventTarget();
  let current = { ...ended },
    receiver,
    cleanup;
  const bindings = {
    ...utility(),
    window,
    BroadcastChannel: class {
      constructor() {
        receiver = this;
      }
      close() {
        calls.push("closed");
      }
    },
    defineNuxtPlugin: (setup) => setup,
    getSessionSnapshot: () => {
      calls.push("sync");
      return current;
    },
    setStates: (value) => {
      assert.equal(value, null);
      calls.push("reset");
      current = { userId: "", sessionId: "", generation: "logout" };
    },
    clearLearningStorage: (user) => calls.push(`clear:${user}`),
  };
  window.localStorage = { removeItem() {} };
  const plugin = new Function(...Object.keys(bindings), `${pluginCode}\nreturn plugin;`)(
    ...Object.values(bindings)
  );
  plugin({
    runWithContext: (run) => run(),
    vueApp: {
      onUnmount: (run) => {
        cleanup = run;
      },
    },
  });
  receiver.onmessage({ data: signal });
  assert.deepEqual(calls, ["sync", "reset", "clear:A"]);
  calls.length = 0;
  current = { ...ended, userId: "B" };
  const event = new Event("storage");
  Object.assign(event, { key: bindings.LEARNING_LOGOUT_SIGNAL, newValue: JSON.stringify(signal) });
  window.dispatchEvent(event);
  assert.deepEqual(calls, ["sync", "clear:A"]);
  calls.length = 0;
  current = { ...ended, generation: "new-login" };
  receiver.onmessage({ data: signal });
  assert.deepEqual(calls, ["sync"]);
  cleanup();
  calls.length = 0;
  window.dispatchEvent(event);
  assert.deepEqual(calls, []);
});

const userSource = await readFile(new URL("../composables/user.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("user.ts", userSource, ts.ScriptTarget.Latest, true);
const deletionCode = compile(
  ast.statements
    .find((node) => ts.isFunctionDeclaration(node) && node.name.text === "deleteUser")
    .getText(ast)
);
for (const outcome of ["deleted", "failed", "other-login"])
  test(`account deletion ${outcome} clears only the deleted account after confirmation`, async () => {
    let current = { ...ended, identity: "A:S" };
    const calls = [];
    const bindings = {
      getSessionSnapshot: () => ({ ...current }),
      DELETE: async (path) => {
        assert.equal(path, "/auth/users/A");
        if (outcome === "failed") throw { data: "offline" };
        if (outcome === "other-login")
          current = { ...ended, identity: "B:T", userId: "B", generation: "new" };
        return { ok: true };
      },
      setStates: () => calls.push("reset"),
      clearLearningStorage: (user) => calls.push(`clear:${user}`),
      broadcastLearningLogout: (session) => calls.push(`broadcast:${session.userId}`),
    };
    const deletion = new Function(...Object.keys(bindings), `${deletionCode}\nreturn deleteUser;`)(
      ...Object.values(bindings)
    );
    const result = await deletion();
    assert.deepEqual(
      calls,
      outcome === "failed"
        ? []
        : outcome === "other-login"
          ? ["clear:A", "broadcast:A"]
          : ["reset", "clear:A", "broadcast:A"]
    );
    if (outcome === "failed") assert.equal(result[1], "offline");
  });
