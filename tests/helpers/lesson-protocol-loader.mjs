import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, normalize, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const sourceDirectory = fileURLToPath(new URL("../../lesson-protocol/", import.meta.url));

async function filesIn(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(join(directory, entry.name), path)));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

function rewriteImports(filename, sources) {
  return (context) => {
    const factory = context.factory;
    const rewrite = (specifier) => {
      if (!ts.isStringLiteralLike(specifier) || !/^\.\.?\//.test(specifier.text)) return specifier;
      const resolved = normalize(join(dirname(filename), specifier.text));
      let replacement;
      if (sources.has(resolved)) replacement = specifier.text.replace(/\.ts$/, ".mjs");
      else if (sources.has(`${resolved}.ts`)) replacement = `${specifier.text}.mjs`;
      else if (sources.has(join(resolved, "index.ts"))) replacement = `${specifier.text}/index.mjs`;
      else if (sources.has(resolved.replace(/\.js$/, ".ts")))
        replacement = specifier.text.replace(/\.js$/, ".mjs");
      return replacement ? factory.createStringLiteral(replacement) : specifier;
    };
    const attributes = (specifier, existing) =>
      existing ??
      (ts.isStringLiteralLike(specifier) && specifier.text.endsWith(".json")
        ? factory.createImportAttributes(
            factory.createNodeArray([
              factory.createImportAttribute(
                factory.createIdentifier("type"),
                factory.createStringLiteral("json")
              ),
            ])
          )
        : undefined);
    const visit = (node) => {
      if (ts.isImportDeclaration(node))
        return factory.updateImportDeclaration(
          node,
          node.modifiers,
          node.importClause,
          rewrite(node.moduleSpecifier),
          attributes(node.moduleSpecifier, node.attributes)
        );
      if (ts.isExportDeclaration(node) && node.moduleSpecifier)
        return factory.updateExportDeclaration(
          node,
          node.modifiers,
          node.isTypeOnly,
          node.exportClause,
          rewrite(node.moduleSpecifier),
          attributes(node.moduleSpecifier, node.attributes)
        );
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
        return factory.updateCallExpression(node, node.expression, node.typeArguments, [
          rewrite(node.arguments[0]),
          ...node.arguments.slice(1),
        ]);
      return ts.visitEachChild(node, visit, context);
    };
    return (source) => ts.visitNode(source, visit);
  };
}

// Keep this dependency-free library outside Nuxt's runtime while exercising its
// real modules. Every invocation owns an isolated directory and removes it.
export async function loadLessonProtocol() {
  const directory = await mkdtemp(join(tmpdir(), "academy-lesson-protocol-"));
  const cleanup = () => rm(directory, { recursive: true, force: true });
  try {
    const files = await filesIn(sourceDirectory);
    const sources = new Set(
      files.filter((path) => path.endsWith(".ts") && !path.endsWith(".d.ts"))
    );
    for (const filename of files) {
      if (filename.startsWith(`schemas${sep}`) && filename.endsWith(".json")) {
        const destination = join(directory, filename);
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(join(sourceDirectory, filename), destination);
      } else if (sources.has(filename)) {
        const source = await readFile(join(sourceDirectory, filename), "utf8");
        const compiled = ts.transpileModule(source, {
          fileName: filename,
          compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
          reportDiagnostics: true,
          transformers: { before: [rewriteImports(filename, sources)] },
        });
        const errors = compiled.diagnostics.filter(
          (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
        );
        if (errors.length)
          throw new Error(
            ts.formatDiagnosticsWithColorAndContext(errors, {
              getCanonicalFileName: (path) => path,
              getCurrentDirectory: () => sourceDirectory,
              getNewLine: () => "\n",
            })
          );
        const destination = join(directory, filename.replace(/\.ts$/, ".mjs"));
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, compiled.outputText);
      }
    }
    return {
      directory,
      cleanup,
      async importModule(name) {
        const destination = join(directory, name.replace(/\.(?:ts|mjs)$/, "") + ".mjs");
        const path = relative(directory, destination);
        if (path === ".." || path.startsWith(`..${sep}`)) throw new Error("Module is outside SDK");
        try {
          return await import(pathToFileURL(destination).href);
        } catch (error) {
          await cleanup();
          throw error;
        }
      },
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
