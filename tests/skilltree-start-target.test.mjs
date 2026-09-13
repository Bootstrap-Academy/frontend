import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "@vue/compiler-sfc";
import ts from "typescript";

const source = await readFile(new URL("../composables/skilltree.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("skilltree.ts", source, ts.ScriptTarget.Latest, true);
const declaration = ast.statements.find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === "resolveInitialSkilltreeTarget"
);
const code = ts.transpileModule(declaration.getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
const { resolveInitialSkilltreeTarget: resolve } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);
const nodes = [
  { row: 0, column: 2 },
  { row: 2, column: 2 },
  { row: 2, column: 4 },
  { row: 4, column: 2 },
  { row: 4, column: 4 },
];

test("a saved occupied position is retained even away from the middle", () => {
  assert.deepEqual(resolve(nodes, { row: 4, column: 4 }, 8, 7), { row: 4, column: 4 });
});

test("the existing root Start target remains valid", () => {
  assert.deepEqual(resolve([{ row: 10, column: 10 }], { row: 10, column: 10 }, 20, 20), {
    row: 10,
    column: 10,
  });
});

test("fresh, stale, empty-cell and malformed targets resolve inside the actual small tree", () => {
  for (const preferred of [
    null,
    { row: 10, column: 10 },
    { row: 3, column: 3 },
    { row: "2", column: 2 },
  ]) {
    assert.deepEqual(resolve(nodes, preferred, 8, 7), { row: 2, column: 2 });
  }
});

test("nearest occupied target is deterministic without changing the API node order", () => {
  const reverse = [...nodes].reverse();
  const before = structuredClone(reverse);
  assert.deepEqual(resolve(reverse, undefined, 8, 7), { row: 2, column: 2 });
  assert.deepEqual(reverse, before);
});

test("empty grids and invalid or unrenderable nodes produce no target", () => {
  assert.equal(resolve([], null, 8, 7), null);
  assert.equal(resolve(nodes, null, 0, 0), null);
  assert.equal(
    resolve(
      [
        { row: 8, column: 2 },
        { row: -1, column: 2 },
        { row: 2.5, column: 2 },
      ],
      null,
      8,
      7
    ),
    null
  );
});

for (const page of ["pages/skill-tree/index.vue", "pages/skill-tree/[id]/index.vue"]) {
  const sfc = parse(await readFile(new URL(`../${page}`, import.meta.url), "utf8"));
  const tree = ts.createSourceFile(
    "page.ts",
    sfc.descriptor.script.content,
    ts.ScriptTarget.Latest,
    true
  );
  let watcher;
  function find(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(tree) === "watch" &&
      node.arguments[0]?.getText(tree) === "() => map"
    )
      watcher = node.arguments[1];
    ts.forEachChild(node, find);
  }
  find(tree);
  assert(watcher, `${page} map watcher exists`);
  const script = ts.transpileModule(`const observe = ${watcher.getText(tree)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2023 },
  }).outputText;
  for (const [preferred, expected] of [
    [
      { row: 10, column: 10 },
      { row: 2, column: 2 },
    ],
    [
      { row: 4, column: 4 },
      { row: 4, column: 4 },
    ],
  ]) {
    test(`${page}: actual initialization watcher selects ${JSON.stringify(expected)} for ${JSON.stringify(preferred)}`, () => {
      const calls = [],
        setup = { value: false };
      const observe = new Function(
        "nextTick",
        "createPathways",
        "resolveInitialSkilltreeTarget",
        "nodes",
        "nextNode",
        "totalRows",
        "totalColumns",
        "scrollToNode",
        "setupComplete",
        `${script}; return observe;`
      )(
        (run) => run(),
        () => {},
        resolve,
        nodes,
        { value: preferred },
        { value: 8 },
        { value: 7 },
        (row, column, smooth) => calls.push({ row, column, smooth }),
        setup
      );
      observe([[{}]]);
      assert.deepEqual(calls, [{ ...expected, smooth: false }]);
      assert.equal(setup.value, true);
    });
  }
}
