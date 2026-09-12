import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ts from "typescript";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createSSRApp, createRenderer, h, nextTick, ref } from "vue";
import { renderToString } from "@vue/server-renderer";
const url = (s) => `data:text/javascript;base64,${Buffer.from(s).toString("base64")}`;
const compile = (s) =>
  ts.transpileModule(s, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
const moduleUrl = async (name) =>
  url(compile(await readFile(new URL(`../utils/${name}.ts`, import.meta.url), "utf8")));
const modelUrl = await moduleUrl("itLabModels"),
  copyUrl = await moduleUrl("itLabCopy");
const m = await import(modelUrl);
const action = (type, value) => ({ type, value });
function replay(s, actions) {
  let state = { tape: [] };
  for (const a of actions) {
    state = m.editLab(s, state, typeof a === "string" ? { type: a } : a);
    assert.ok(state, JSON.stringify(a));
  }
  return { state, ...m.readLab(s, state) };
}
const now = (s, r) => m.machineNow(s, r.model.machine);
test("26 isolated bounded scenarios reject arbitrary actions and ignore forged calculated outputs", () => {
  assert.equal(Object.keys(m.labScenarios).length, 26);
  for (const s of Object.keys(m.labScenarios)) {
    assert.deepEqual(
      m.readLab(s, {}),
      m.readLab(s, { solved: true, output: 999, files: [{ path: "/etc/passwd" }] })
    );
    assert.equal(m.editLab(s, {}, action("fetch", "https://evil.example")), null);
    assert.equal(m.readLab(s, { tape: Array(193).fill({ type: "run" }) }).invalid, true);
    assert.equal(m.readLab(s, { tape: [{ type: "__proto__" }] }).invalid, true);
  }
  for (const value of [NaN, 31, true, -1, 2.5])
    assert.equal(m.editLab("inside-computer", {}, action("value", value)), null);
  assert.equal(m.editLab("input-output", {}, action("text", "a".repeat(161))), null);
  assert.equal(m.editLab("save-restart", {}, action("select", "/etc/passwd")), null);
});
test("real I/O steps and instruction order produce correct intermediate and final values", () => {
  const partial = replay("inside-computer", ["step", "step"]);
  assert.equal(now("inside-computer", partial).value, 5);
  assert.deepEqual(now("inside-computer", partial).output, []);
  assert.deepEqual(now("inside-computer", replay("inside-computer", ["run"])).output, ["5"]);
  assert.deepEqual(now("change-rule", replay("change-rule", [action("value", 5), "run"])).output, [
    "10",
  ]);
  assert.deepEqual(now("sequence", replay("sequence", ["run"])).output, ["6"]);
  assert.deepEqual(now("sequence", replay("sequence", [action("move", 0), "run"])).output, ["3"]);
});
test("boundary conditions, accumulators and empty inputs execute deterministically and survive reload", () => {
  for (const [setting, expected] of [
    ["yes", "present"],
    ["no", "empty"],
  ])
    assert.deepEqual(
      now("state-conditions", replay("state-conditions", [action("inclusive", setting), "run"]))
        .output,
      [expected]
    );
  assert.equal(now("repeat-state", replay("repeat-state", ["run"])).sum, 6);
  assert.equal(
    now("repeat-state", replay("repeat-state", [action("resetInside", "yes"), "run"])).sum,
    1
  );
  for (const [data, count, sum] of [
    ["empty", 0, 0],
    ["boundary", 1, 1],
    ["project", 2, 5],
  ]) {
    const r = replay("project-generator", [
      action("inclusive", "yes"),
      action("resetInside", "no"),
      action("dataset", data),
      "run",
    ]);
    assert.equal(now("project-generator", r).count, count);
    assert.equal(now("project-generator", r).sum, sum);
    assert.deepEqual(
      m.readLab("project-generator", JSON.parse(JSON.stringify(r.state))).model,
      r.model
    );
    assert.ok(m.machineTrace("project-generator", r.model.machine).length <= 200);
  }
});
test("bits, actual UTF-8 byte counts and explicit palette remapping", () => {
  assert.equal(
    m.bitValue(replay("bits-values", [action("bit", 1), action("bit", 3)]).model.bits),
    5
  );
  assert.equal(
    m.bitValue(
      replay(
        "bits-values",
        [0, 1, 2, 3].map((i) => action("bit", i))
      ).model.bits
    ),
    15
  );
  for (const [text, bytes] of [
    ["A", [65]],
    ["ä", [195, 164]],
    ["Büro", [66, 195, 188, 114, 111]],
  ]) {
    const r = replay("text-bytes", [action("text", text)]);
    assert.deepEqual(m.textBytes(r.model.bits), bytes);
    const decoded = m.readLab(
      "text-bytes",
      m.editLab("text-bytes", r.state, action("decoder", "latin"))
    ).model.bits;
    assert.deepEqual(m.textBytes(decoded), bytes);
    if (text !== "A") assert.notEqual(m.decodedText(decoded), text);
  }
  const r = replay("pixel-icon", [
    action("depth", 2),
    action("colour", 2),
    "paint",
    action("depth", 1),
  ]);
  assert.equal(r.model.bits.depth, 2);
  assert.equal(r.model.bits.notice, "paletteLoss");
  const mapped = m.readLab("pixel-icon", m.editLab("pixel-icon", r.state, { type: "remap" })).model
    .bits;
  assert.equal(mapped.depth, 1);
  assert.equal(mapped.pixels[0], 1);
});
test("RAM loss, independent files, format, permission and separate recovery states", () => {
  for (const save of [false, true]) {
    const r = replay("save-restart", [
      action("edit", "19:00"),
      ...(save ? ["save"] : []),
      "power",
      "open",
    ]);
    assert.equal(r.model.workspace.processes[0].draft, save ? "19:00" : "18:00");
  }
  let r = replay("paths-formats", [
    "copy",
    "open",
    action("edit", "own copy"),
    "save",
    "rename",
    "viewImage",
  ]);
  assert.equal(r.model.workspace.files.find((f) => f.path === "/projekt/notiz.txt").data, "18:00");
  assert.equal(r.model.workspace.notice, "wrongFormat");
  r = replay("permissions", [action("edit", "mine"), "save"]);
  assert.equal(r.model.workspace.notice, "readOnly");
  assert.equal(r.model.workspace.files[0].data, "18:00");
  r = replay("permissions", [action("edit", "mine"), "saveCopy"]);
  assert.equal(r.model.workspace.files.find((f) => f.path === "/eigen/entwurf.txt").data, "mine");
  r = replay("backup-restore", [
    action("edit", "19:00"),
    "save",
    "backup",
    action("edit", "20:00"),
    "save",
    "delete",
    "restore",
    "open",
  ]);
  assert.equal(r.model.workspace.processes.at(-1).draft, "19:00");
  r = replay("backup-restore", ["backup", "syncDelete", "restore"]);
  assert.equal(r.model.workspace.notice, "noBackup");
  r = replay("project-recover", ["saveCopy", action("backupChoice", "complete"), "restore"]);
  assert.equal(
    r.model.workspace.files.filter((f) => f.path.startsWith("/wiederhergestellt/")).length,
    4
  );
  assert.ok(r.model.workspace.files.some((f) => f.path === "/eigen/entwurf.txt"));
  assert.deepEqual(r.model.workspace.backup, m.projectFiles());
});
test("processes keep independent drafts and respect RAM limit without removing the saved program", () => {
  const r = replay("program-process", [
    "open",
    action("edit", "second"),
    action("switch", 1),
    "close",
  ]);
  assert.equal(r.model.workspace.processes[0].draft, "second");
  assert.ok(r.model.workspace.files.some((f) => f.format === "program"));
  const full = replay("resource-limits", ["open", "open", "open", "open"]);
  assert.equal(full.model.workspace.notice, "ramFull");
  assert.equal(m.workspaceUsage(full.model.workspace).ram, 8);
});
test("local topology and byte positions determine transport, not arrival order", () => {
  assert.ok(
    replay("local-network", [
      action("uplink", "off"),
      action("target", "printer"),
      "test",
    ]).model.network.report.includes("printerOk")
  );
  assert.ok(
    replay("local-network", [action("uplink", "off"), "test"]).model.network.report.includes(
      "routeFailed"
    )
  );
  assert.ok(
    replay("addresses-routes", [action("route", "off"), "test"]).model.network.report.includes(
      "routeFailed"
    )
  );
  assert.deepEqual(
    replay("reliable-transfer", [action("deliver", 2), action("deliver", 0), "retry", "retry"])
      .model.network.received,
    [2, 0, 1]
  );
});
test("DNS/TLS fail before HTTP; partial HTTP and stale reports stay explicit", () => {
  assert.deepEqual(replay("project-publish", ["test"]).model.network.report, [
    "localOk",
    "dnsFailed",
  ]);
  const tls = replay("https-access", [action("tls", "off"), "test"]).model.network.report;
  assert.ok(tls.includes("tlsFailed"));
  assert.ok(!tls.some((v) => v.startsWith("http") || v.startsWith("html")));
  const forbidden = replay("https-access", [action("access", "off"), "test"]).model.network.report;
  assert.ok(forbidden.includes("tlsOk"));
  assert.ok(forbidden.includes("http403"));
  const r = replay("project-publish", [action("dns", "on"), "test"]);
  assert.ok(r.model.network.report.includes("html200"));
  assert.ok(r.model.network.report.includes("image404"));
  const changed = m.readLab(
    "project-publish",
    m.editLab("project-publish", r.state, action("image", "on"))
  ).model.network;
  assert.notEqual(changed.testedConfig, m.networkConfig(changed));
  assert.ok(changed.report.includes("image404"));
  assert.ok(
    replay("project-publish", [
      action("dns", "on"),
      action("image", "on"),
      "test",
    ]).model.network.report.includes("image200")
  );
});
const componentUrls = new Map();
async function component(name) {
  if (componentUrls.has(name)) return componentUrls.get(name);
  const file = `components/learning/${name}.vue`,
    source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const { descriptor, errors } = parse(source, { filename: file });
  assert.deepEqual(errors, []);
  let code = compile(compileScript(descriptor, { id: file, inlineTemplate: true }).content);
  for (const child of ["ItMachine", "ItBitLab", "ItWorkspace", "ItNetwork"])
    if (code.includes(`./${child}.vue`))
      code = code.replaceAll(`./${child}.vue`, await component(child));
  code = code
    .replaceAll("~/utils/itLabModels", modelUrl)
    .replaceAll("~/utils/itLabCopy", copyUrl)
    .replaceAll('from "vue"', `from ${JSON.stringify(import.meta.resolve("vue"))}`);
  code = code.replaceAll("from 'vue'", `from ${JSON.stringify(import.meta.resolve("vue"))}`);
  const result = url(code);
  componentUrls.set(name, result);
  return result;
}
const Lab = (await import(await component("ItLabRoom"))).default;
const sample = (s) => ({
  schema: "it-lab/1",
  family: m.labScenarios[s],
  scenario: s,
  intro: "Introduction",
  task: "Try it",
  observe: "Observe",
  worldNote: "Prepared state",
  checks: [
    {
      id: "result",
      question: "Which?",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      answer: "a",
      explanation: "Because",
    },
  ],
});
test("all real Vue family renderers compile and render 26 scenarios in DE/EN, including executed project", async () => {
  for (const s of Object.keys(m.labScenarios))
    for (const locale of ["de", "en"]) {
      const html = await renderToString(
        createSSRApp(Lab, { content: sample(s), state: {}, disabled: false, locale })
      );
      assert.ok(html.includes("fieldset"));
      assert.ok(html.includes("Introduction"));
    }
  const r = replay("project-generator", [
    action("inclusive", "yes"),
    action("resetInside", "no"),
    "run",
  ]);
  const html = await renderToString(
    createSSRApp(Lab, {
      content: sample("project-generator"),
      state: { model: r.state },
      disabled: false,
      locale: "en",
    })
  );
  assert.ok(html.includes("Grüße vom Treffpunkt"));
});
test("strict content checks and exact answer map exclude foreign keys", () => {
  const c = sample("input-output");
  assert.ok(m.parseLabContent(c));
  assert.equal(m.parseLabContent({ ...c, family: "exercise" }), null);
  assert.equal(m.parseLabContent({ ...c, checks: [] }), null);
  assert.equal(m.labAnswers(c, { result: "b" }), null);
  assert.deepEqual(m.labAnswers(c, { result: "a", solved: true }), { result: "a" });
});
function mount(content, initial = {}) {
  const make = (tag, text = "") => ({ tag, text, props: {}, children: [], parent: null });
  const renderer = createRenderer({
    createElement: make,
    createText: (t) => make("#text", t),
    createComment: (t) => make("#comment", t),
    setText: (n, t) => (n.text = t),
    setElementText: (n, t) => {
      n.text = t;
      n.children = [];
    },
    parentNode: (n) => n.parent,
    nextSibling: (n) => n.parent?.children[n.parent.children.indexOf(n) + 1] || null,
    patchProp: (n, k, p, v) => (n.props[k] = v),
    insert: (n, p, a) => {
      n.parent = p;
      const i = a ? p.children.indexOf(a) : -1;
      i < 0 ? p.children.push(n) : p.children.splice(i, 0, n);
    },
    remove: (n) => {
      if (n.parent) n.parent.children = n.parent.children.filter((c) => c !== n);
    },
  });
  const root = make("root"),
    state = ref(initial),
    locale = ref("de"),
    done = [];
  const app = renderer.createApp({
    setup: () => () =>
      h(Lab, {
        content,
        state: state.value,
        locale: locale.value,
        disabled: false,
        onChange: (s) => (state.value = s),
        onComplete: (a) => done.push(a),
      }),
  });
  app.mount(root);
  const all = (n = root) => [n, ...n.children.flatMap((c) => all(c))];
  return { state, locale, done, all, stop: () => app.unmount() };
}
test("actual component events preserve drafts through language/reload and emit introduced answers", async () => {
  const app = mount(sample("input-output"));
  const input = app.all().find((n) => n.tag === "input" && n.props.maxlength == 160);
  assert.ok(input);
  input.props.onInput({ target: { value: "Saved draft" } });
  await nextTick();
  app.locale.value = "en";
  await nextTick();
  assert.equal(m.readLab("input-output", app.state.value.model).model.machine.text, "Saved draft");
  app
    .all()
    .find((n) => n.tag === "input" && n.props.value === "a")
    .props.onChange();
  await nextTick();
  app
    .all()
    .find((n) => n.tag === "form")
    .props.onSubmit({ preventDefault() {} });
  await nextTick();
  const button = app.all().find((n) => n.tag === "button" && n.text === "Continue");
  assert.ok(button);
  button.props.onClick();
  assert.deepEqual(app.done, [{ result: "a" }]);
  const state = JSON.parse(JSON.stringify(app.state.value));
  app.stop();
  const restored = mount(sample("input-output"), state);
  assert.equal(
    m.readLab("input-output", restored.state.value.model).model.machine.text,
    "Saved draft"
  );
  restored.stop();
});
test("nine chapter groups count only completed units and open the current group; old paths remain ungrouped", async () => {
  const { learningChapterGroups } = await import(await moduleUrl("learningChapters"));
  const chapters = Array.from({ length: 9 }, (_, i) => ({
    id: `c${i}`,
    title: { de: `Kapitel${i}`, en: `Chapter${i}` },
  }));
  const units = Array.from({ length: 50 }, (_, i) => ({
    id: `u${i}`,
    chapter_id: `c${Math.min(8, Math.floor(i / 6))}`,
    status: i === 0 ? "completed" : i === 1 ? "skipped" : "new",
  }));
  const groups = learningChapterGroups({
    path: { chapters },
    units,
    next: { unit: { id: "u12" } },
  });
  assert.equal(groups.length, 9);
  assert.equal(groups.flatMap((g) => g.units).length, 50);
  assert.equal(groups[0].completed, 1);
  assert.equal(groups[0].skipped, 1);
  assert.equal(groups.find((g) => g.active).id, "c2");
  assert.deepEqual(learningChapterGroups({ path: {}, units: [] }), []);
});
test(
  "generated private bundle: 26 complete exact bilingual contracts and renderable content",
  { skip: !process.env.IT_LAB_CONTENT },
  async () => {
    const rooms = JSON.parse(await readFile(process.env.IT_LAB_CONTENT, "utf8"));
    assert.equal(rooms.length, 26);
    assert.deepEqual(
      new Set(rooms.map((r) => r.id.slice(4))),
      new Set(Object.keys(m.labScenarios))
    );
    for (const r of rooms)
      for (const locale of ["de", "en"]) {
        const c = m.parseLabContent(r.content[locale]);
        assert.ok(c, `${r.id}:${locale}`);
        assert.equal(r.path_id, "it-foundations");
        assert.ok(r.chapter_id);
        assert.deepEqual(m.labAnswers(c, r.completion.answer), r.completion.answer);
        const html = await renderToString(
          createSSRApp(Lab, { content: c, state: {}, disabled: false, locale })
        );
        assert.ok(html.includes("fieldset"));
      }
  }
);

test("existing room controller accepts all five lab envelopes and persists/retries through its original authority", async () => {
  const { createLearningRooms } = await import(await moduleUrl("learningRooms"));
  for (const family of new Set(Object.values(m.labScenarios))) {
    let view,
      revision = 0;
    const state = { schema: "it-lab-state/1", scenario: "input-output", model: { tape: [] } };
    const envelope = (draft = state) => ({
      unit: {
        id: "itf-input-output",
        path_id: "it-foundations",
        chapter_id: "itf-system",
        room: family,
        title: { de: "Test", en: "Test" },
        content: {},
        requires: [],
        teaches: [],
        practices: [],
      },
      progress: { revision, state: draft, status: "in_progress", result: null },
    });
    const controller = createLearningRooms({
      id: () => `request-${revision}`,
      changed: (v) => (view = v),
      request: async (path, method, body) => {
        if (path.endsWith("capabilities")) return { enabled: true };
        if (method === "PUT") {
          revision++;
          return envelope(body.state);
        }
        return {
          paths: [{ id: "it-foundations", title: { de: "IT", en: "IT" } }],
          path: {
            id: "it-foundations",
            title: { de: "IT", en: "IT" },
            chapters: [{ id: "itf-system", title: { de: "Computer", en: "Computers" } }],
          },
          next: envelope(),
        };
      },
    });
    await controller.start(true);
    assert.equal(view.status, "ready", family);
    assert.equal(view.path.chapters.length, 1);
    controller.edit({ ...state, model: { tape: [{ type: "text", value: "draft" }] } });
    await controller.save();
    assert.equal(view.dirty, false);
    assert.equal(view.room.progress.revision, 1);
  }
});

test("multi-byte repeated edits cannot exceed the private-state byte budget", () => {
  let state = { tape: [] },
    stopped = false;
  for (let i = 0; i < 192; i++) {
    const next = m.editLab(
      "input-output",
      state,
      i % 2 ? { type: "run" } : action("text", "界".repeat(160))
    );
    if (!next) {
      stopped = true;
      break;
    }
    state = next;
    assert.ok(new TextEncoder().encode(JSON.stringify(state)).length <= m.LAB_MAX_TAPE_BYTES);
  }
  assert.ok(stopped);
  const oversized = {
    tape: Array.from({ length: 192 }, (_, i) =>
      i % 2 ? { type: "run" } : action("text", "界".repeat(160))
    ),
  };
  assert.equal(m.readLab("input-output", oversized).invalid, true);
});
