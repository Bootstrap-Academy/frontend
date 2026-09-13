import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "@vue/compiler-sfc";
import { ref } from "vue";
import ts from "typescript";

const source = await readFile(new URL("../composables/skilltree.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("skilltree.ts", source, ts.ScriptTarget.Latest, true);
const declaration = ast.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === "scrollMapToNode"
);
const code = ts.transpileModule(declaration.getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
const { scrollMapToNode } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

function fixture(width = 390, height = 820) {
  const calls = [];
  const node = {
    getAttribute: (name) => ({ x: "840", y: "1260" })[name],
    ownerSVGElement: { clientWidth: 2700, clientHeight: 3300 },
  };
  const map = [[node]];
  const viewport = {
    clientWidth: width,
    clientHeight: height,
    scrollLeft: 0,
    scrollTop: 0,
    getBoundingClientRect: () => ({ left: 20, top: 90, width, height }),
    scroll: (options) => calls.push({ scroll: options }),
  };
  return { map, viewport, calls };
}

for (const scale of [0.4, 1, 1.7, 3]) {
  test(`selected node is centered at zoom ${scale} using Panzoom's unscaled translation`, () => {
    const { map, viewport, calls } = fixture();
    // This is the installed @panzoom/panzoom API: deliberately no getTransform().
    const panzoom = {
      getScale: () => scale,
      pan: (x, y, options) => calls.push({ x, y, options }),
    };
    scrollMapToNode(map, viewport, 120, 0, 0, true, panzoom);
    assert.equal(calls.length, 1);
    const { x, y, options } = calls[0];
    // The outer SVG is treated like HTML: scale(s) translate(x,y), origin 50% 50%.
    assert(Math.abs((900 - 1350 + x) * scale + 1350 - viewport.clientWidth / 2) < 1e-9);
    assert(Math.abs((1320 - 1650 + y) * scale + 1650 - viewport.clientHeight / 2) < 1e-9);
    assert.deepEqual(options, { animate: true });
  });
}

for (const scale of [0.4, 1, 1.7, 3]) {
  test(`existing native scroll is preserved when centering at zoom ${scale}`, () => {
    const { map, viewport, calls } = fixture();
    viewport.scrollLeft = 705;
    viewport.scrollTop = 910;
    scrollMapToNode(map, viewport, 120, 0, 0, true, {
      getScale: () => scale,
      pan: (x, y) => calls.push({ x, y }),
    });
    const { x, y } = calls[0];
    assert(Math.abs((900 - 1350 + x) * scale + 1350 - viewport.scrollLeft - 195) < 1e-9);
    assert(Math.abs((1320 - 1650 + y) * scale + 1650 - viewport.scrollTop - 410) < 1e-9);
    assert.equal(calls.length, 1);
  });
}

test("initial centering keeps animation disabled", () => {
  const { map, viewport, calls } = fixture(1280, 800);
  scrollMapToNode(map, viewport, 120, 0, 0, false, {
    getScale: () => 2,
    pan: (x, y, options) => calls.push(options),
  });
  assert.deepEqual(calls, [{ animate: false }]);
});

test("uninitialized panzoom retains the existing native scroll fallback", () => {
  const { map, viewport, calls } = fixture(1280, 800);
  scrollMapToNode(map, viewport, 120, 0, 0, false);
  assert.deepEqual(calls, [{ scroll: { left: 260, top: 920, behavior: "auto" } }]);
});

test("missing node or viewport during setup causes no movement", () => {
  const { map, viewport, calls } = fixture();
  scrollMapToNode([], viewport, 120, 0, 0, true);
  scrollMapToNode([[]], viewport, 120, 0, 0, true);
  scrollMapToNode(map, null, 120, 0, 0, true);
  assert.deepEqual(calls, []);
});

for (const page of ["pages/skill-tree/index.vue", "pages/skill-tree/[id]/index.vue"]) {
  const sfc = parse(await readFile(new URL(`../${page}`, import.meta.url), "utf8"));
  const tree = ts.createSourceFile(
    "page.ts",
    sfc.descriptor.script.content,
    ts.ScriptTarget.Latest,
    true
  );
  let initialize;
  function find(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "initializePanzoom")
      initialize = node;
    ts.forEachChild(node, find);
  }
  find(tree);
  const script = ts.transpileModule(initialize.getText(tree), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  function setup() {
    const timers = [];
    const calls = [];
    const instance = {};
    const current = ref(null);
    const schedule = (run) => timers.push(run);
    const start = new Function(
      "Panzoom",
      "svgRef",
      "mainRef",
      "panzoomInstance",
      "pendingTarget",
      "setTimeout",
      "nextTick",
      "scrollToNode",
      "handleWheel",
      "MAX_SCALE",
      "MIN_SCALE",
      `${script}; return initializePanzoom;`
    )(
      () => {
        schedule(() => calls.push("library initial reset"));
        return instance;
      },
      { value: {} },
      { value: { style: {}, addEventListener() {} } },
      current,
      { value: { row: 10, column: 10 } },
      schedule,
      (run) => run(),
      (row, column, smooth) => calls.push({ row, column, smooth }),
      () => {},
      3,
      0.4
    );
    return { start, current, instance, timers, calls };
  }
  test(`${page}: center only after the library has reset its initial pan`, () => {
    const f = setup();
    f.start();
    assert.deepEqual(f.calls, []);
    assert.equal(f.timers.length, 2);
    for (const run of f.timers) run();
    assert.deepEqual(f.calls, ["library initial reset", { row: 10, column: 10, smooth: false }]);
  });
  for (const replacement of [null, {}]) {
    test(`${page}: a disposed or replaced instance cannot recenter later (${replacement === null ? "disposed" : "replaced"})`, () => {
      const f = setup();
      f.start();
      f.current.value = replacement;
      for (const run of f.timers) run();
      assert.deepEqual(f.calls, ["library initial reset"]);
    });
  }
}
