// Runs named functions and constants of a component against stand-ins for everything they reach.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { parse } from "@vue/compiler-sfc";

/**
 * `path` is relative to the repository root. The named declarations are taken from the
 * component's script in source order; every other name resolves to `scope`, then to the
 * runtime, then to a no-op.
 */
export async function pieces(path, names, scope) {
  const source = await readFile(new URL(`../../${path}`, import.meta.url), "utf8");
  const { descriptor } = parse(source);
  const script = (descriptor.scriptSetup ?? descriptor.script).content;
  const ast = ts.createSourceFile("component.ts", script, ts.ScriptTarget.Latest, true);
  const found = new Map();
  (function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text))
      found.set(node.name.text, node.getText(ast));
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((d) => names.includes(d.name.getText(ast)))
    )
      found.set(node.declarationList.declarations[0].name.getText(ast), node.getText(ast));
    ts.forEachChild(node, visit);
  })(ast);
  assert.deepEqual([...found.keys()].sort(), [...names].sort(), path);
  const code = ts.transpileModule([...found.values()].join("\n"), {
    compilerOptions: { target: ts.ScriptTarget.ES2023 },
  }).outputText;
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
  return new Function(
    "environment",
    `with (environment) { ${code}\nreturn { ${names.join(", ")} }; }`
  )(environment);
}
