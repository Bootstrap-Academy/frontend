import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createI18n, useI18n } from "vue-i18n";
import ts from "typescript";

for (const file of [
  "pages/learn.vue",
  "components/learning/ExerciseRoom.vue",
  "components/learning/CodeEditor.vue",
]) {
  test(`${file}: compiled SFC resolves i18n from the installed module, without a global hook`, async () => {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    const { descriptor, errors } = parse(source, { filename: file });
    assert.deepEqual(errors, []);
    const compiled = compileScript(descriptor, { id: file });
    // Nuxt auto-imports Vue hooks, but this project does not auto-import vue-i18n.
    // Test the compiler's real module binding; injecting a global useI18n here
    // would conceal the exact runtime failure this regression test protects.
    assert.equal(compiled.imports.useI18n?.source, "vue-i18n");
    assert.equal(compiled.imports.useI18n?.isType, false);
    const ast = ts.createSourceFile("compiled.ts", compiled.content, ts.ScriptTarget.Latest, true);
    const imports = ast.statements
      .filter((node) => ts.isImportDeclaration(node) && node.moduleSpecifier.text === "vue-i18n")
      .map((node) =>
        node
          .getText(ast)
          .replace(/(["'])vue-i18n\1/, JSON.stringify(import.meta.resolve("vue-i18n")))
      );
    const probe = `${imports.join("\n")}\nexport { useI18n as compiledHook };`;
    const runtime = await import(
      `data:text/javascript;base64,${Buffer.from(probe).toString("base64")}`
    );
    assert.equal(runtime.compiledHook, useI18n);
    const app = createSSRApp({
      setup() {
        const { t } = runtime.compiledHook();
        return () => h("p", t("check"));
      },
    });
    app.use(
      createI18n({ legacy: false, locale: "de", messages: { de: { check: "Lernraum bereit" } } })
    );
    assert.equal(await renderToString(app), "<p>Lernraum bereit</p>");
  });
}
