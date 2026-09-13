import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function resolvedDestination(path) {
  try {
    return await realpath(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return join(await resolvedDestination(dirname(path)), basename(path));
  }
}

/** Package already-built browser ES modules. This command never uploads or registers content. */
export async function buildLearningModule({ source, output, baseUrl, allowLocal = false }) {
  const root = await realpath(resolve(source));
  const destination = await resolvedDestination(resolve(output));
  if (destination === root || destination.startsWith(root + sep)) {
    throw new Error("The output directory must be outside the module source");
  }
  const definitionPath = join(root, "module.json");
  if (!(await lstat(definitionPath)).isFile()) {
    throw new Error("module.json must be a regular file, not a symbolic link");
  }
  const definition = JSON.parse(await readFile(definitionPath, "utf8"));
  if (
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(definition.id) ||
    definition.api_version !== 1 ||
    typeof definition.entry !== "string" ||
    !/\.(m?js)$/.test(definition.entry)
  ) {
    throw new Error("Expected module.json with id, api_version: 1 and a browser .js/.mjs entry");
  }
  const base = new URL(baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");
  const local =
    allowLocal &&
    base.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  if (
    (base.protocol !== "https:" && !local) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error("Use a credential-free HTTPS asset base URL");
  }
  const files = [];
  async function collect(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const name = relative(root, path).split(sep).join("/");
      if (name === "module.json") continue;
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) {
        throw new Error(`Hidden files and symbolic links are not module assets: ${name}`);
      }
      if (/[\\\x00-\x1f\x7f]/.test(entry.name)) {
        throw new Error("Module asset names cannot contain backslashes or control characters");
      }
      if (entry.isDirectory()) await collect(path);
      else if (entry.isFile()) {
        const bytes = await readFile(path);
        files.push({ path: name, sha256: sha256(bytes), bytes: bytes.length, content: bytes });
      } else throw new Error(`Unsupported module asset: ${name}`);
    }
  }
  await collect(root);
  if (!files.some((file) => file.path === definition.entry)) {
    throw new Error("The module entry must name a file inside the source directory");
  }
  if (files.some((file) => file.path === "manifest.json")) {
    throw new Error("manifest.json is reserved for the generated package manifest");
  }
  const inventory = files.map(({ content: _content, ...file }) => file);
  const artifactSha256 = sha256(JSON.stringify({ definition, files: inventory }));
  const directory = join(destination, artifactSha256);
  const encodedEntry = definition.entry.split("/").map(encodeURIComponent).join("/");
  const descriptor = {
    id: definition.id,
    api_version: 1,
    entry_url: new URL(`${artifactSha256}/${encodedEntry}`, base).href,
  };
  const generated = {
    "module.json": Buffer.from(JSON.stringify(descriptor, null, 2) + "\n"),
    "manifest.json": Buffer.from(
      JSON.stringify({ artifact_sha256: artifactSha256, definition, files: inventory }, null, 2) +
        "\n"
    ),
  };
  await mkdir(destination, { recursive: true });
  const temporary = join(destination, `.module-${process.pid}-${randomUUID()}`);
  await mkdir(temporary);
  try {
    for (const file of files) {
      const target = join(temporary, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, { flag: "wx" });
    }
    for (const [name, content] of Object.entries(generated)) {
      await writeFile(join(temporary, name), content, { flag: "wx" });
    }
    try {
      await rename(temporary, directory);
    } catch (error) {
      if (!["EEXIST", "ENOTEMPTY"].includes(error.code)) throw error;
      // Immutable artifacts are reusable only if their full contents match.
      const expected = [
        ...files,
        ...Object.entries(generated).map(([path, content]) => ({ path, content })),
      ];
      const existing = [];
      async function list(folder) {
        for (const entry of await readdir(folder, { withFileTypes: true })) {
          const path = join(folder, entry.name);
          if (entry.isSymbolicLink()) {
            throw new Error("An existing immutable artifact contains a symbolic link");
          }
          if (entry.isDirectory()) await list(path);
          else existing.push(relative(directory, path).split(sep).join("/"));
        }
      }
      await list(directory);
      if (
        JSON.stringify(existing.sort()) !== JSON.stringify(expected.map((file) => file.path).sort())
      ) {
        throw new Error("An existing immutable artifact differs from this package");
      }
      for (const file of expected) {
        if (
          !(await lstat(join(directory, file.path))).isFile() ||
          !(await readFile(join(directory, file.path))).equals(file.content)
        ) {
          throw new Error("An existing immutable artifact differs from this package");
        }
      }
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  return { directory, module: descriptor, artifact_sha256: artifactSha256, files: inventory };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({
      options: {
        source: { type: "string" },
        output: { type: "string" },
        "base-url": { type: "string" },
        "allow-local": { type: "boolean", default: false },
      },
    });
    if (!values.source || !values.output || !values["base-url"]) {
      throw new Error(
        "Usage: node scripts/build-learning-module.mjs --source DIR --output DIR --base-url HTTPS_URL"
      );
    }
    const result = await buildLearningModule({
      source: values.source,
      output: values.output,
      baseUrl: values["base-url"],
      allowLocal: values["allow-local"],
    });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
