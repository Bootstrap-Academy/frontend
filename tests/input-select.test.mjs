import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../utils/inputSelect.ts", import.meta.url), "utf8");
const { selectInitialValue } = new Function(
  ts.transpileModule(source.replace(/^export /gm, ""), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
  }).outputText + "\nreturn { selectInitialValue };"
)();

test("select initializes empty/single-option lists without losing existing or legacy defaults", () => {
  assert.equal(selectInitialValue("", []), "");
  assert.equal(selectInitialValue("", [{ value: "only" }]), "only");
  assert.equal(selectInitialValue("", [{ value: "first" }, { value: "second" }]), "second");
  assert.equal(selectInitialValue("", [{ value: "first" }, { value: "" }]), "");
  assert.equal(selectInitialValue("saved", []), "saved");
  assert.equal(selectInitialValue("saved", [{ value: "different" }]), "saved");
});
