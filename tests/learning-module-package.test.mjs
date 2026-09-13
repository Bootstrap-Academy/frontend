import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildLearningModule } from "../scripts/build-learning-module.mjs";

test("module artifacts are reproducible, independently addressable, and change with an asset", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "academy-module-package-"));
  try {
    const source = join(temporary, "source");
    await cp(new URL("./fixtures/learning-module/", import.meta.url), source, { recursive: true });
    const options = {
      source,
      output: join(temporary, "output"),
      baseUrl: "https://lessons.example/modules",
    };
    const first = await buildLearningModule(options);
    assert.deepEqual(await buildLearningModule(options), first);
    assert.deepEqual(
      JSON.parse(await readFile(join(first.directory, "module.json"), "utf8")),
      first.module
    );
    assert.equal(
      first.module.entry_url,
      `https://lessons.example/modules/${first.artifact_sha256}/index.js`
    );
    await writeFile(join(source, "style.css"), "button { font: inherit; }\n");
    const second = await buildLearningModule(options);
    assert.notEqual(second.artifact_sha256, first.artifact_sha256);
    assert.equal(
      await readFile(join(first.directory, "index.js"), "utf8"),
      await readFile(join(source, "index.js"), "utf8")
    );
    await writeFile(join(second.directory, "index.js"), "changed after publication");
    await assert.rejects(buildLearningModule(options), /immutable artifact differs/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("packaging refuses source escapes, private files, and ambiguous upload destinations", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "academy-module-package-"));
  try {
    const source = join(temporary, "source");
    await cp(new URL("./fixtures/learning-module/", import.meta.url), source, { recursive: true });
    const options = {
      source,
      output: join(temporary, "output"),
      baseUrl: "https://lessons.example/modules",
    };
    await assert.rejects(
      buildLearningModule({ ...options, output: join(source, "dist") }),
      /outside/
    );
    await assert.rejects(
      buildLearningModule({ ...options, baseUrl: "https://user:password@lessons.example/" }),
      /credential-free/
    );
    await writeFile(join(source, ".env"), "LOCAL_FIXTURE=true");
    await assert.rejects(buildLearningModule(options), /Hidden files/);
    await rm(join(source, ".env"));
    await symlink(join(temporary, "outside"), join(source, "linked"));
    await assert.rejects(buildLearningModule(options), /symbolic links/);
    await rm(join(source, "linked"));
    const original = await buildLearningModule(options);
    const external = join(temporary, "outside.js");
    await cp(join(original.directory, "index.js"), external);
    await rm(join(original.directory, "index.js"));
    await symlink(external, join(original.directory, "index.js"));
    await assert.rejects(buildLearningModule(options), /symbolic link/);
    const alias = join(temporary, "source-alias");
    await symlink(source, alias);
    await assert.rejects(
      buildLearningModule({ ...options, output: join(alias, "output") }),
      /outside/
    );
    const definition = await readFile(join(source, "module.json"));
    await writeFile(join(temporary, "definition.json"), definition);
    await rm(join(source, "module.json"));
    await symlink(join(temporary, "definition.json"), join(source, "module.json"));
    await assert.rejects(buildLearningModule(options), /symbolic link/);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
