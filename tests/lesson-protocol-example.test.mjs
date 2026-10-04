import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { loadLessonProtocol } from "./helpers/lesson-protocol-loader.mjs";

const compiled = await loadLessonProtocol();
after(compiled.cleanup);
const { validateManifest } = await compiled.importModule("validation");
const { canonicalJson } = await compiled.importModule("schema");
const directory = await mkdtemp(join(tmpdir(), "academy-lesson-example-"));
after(() => rm(directory, { recursive: true, force: true }));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("portrait and landscape examples have valid manifests and distinct immutable packages", async () => {
  const descriptors = [];
  for (const orientation of ["portrait", "landscape"]) {
    const out = join(directory, orientation);
    await promisify(execFile)(process.execPath, [
      fileURLToPath(new URL("../tools/build-lesson-example.mjs", import.meta.url)),
      out,
      "http://127.0.0.2:58762",
      orientation,
    ]);
    const descriptor = JSON.parse(await readFile(join(out, "descriptor.json")));
    const root = join(out, "site/packages", descriptor.package_hash);
    const manifestBytes = await readFile(join(root, "manifest.json"));
    const manifest = validateManifest(JSON.parse(manifestBytes));
    assert.equal(manifest.stage.orientation, orientation);
    assert(manifest.stage.safeMargin >= 16 && manifest.stage.safeMargin <= 32);
    assert.equal(sha(manifestBytes), descriptor.manifest_hash);
    assert.equal(sha(canonicalJson(manifest.assets)), descriptor.package_hash);
    for (const asset of manifest.assets) {
      const bytes = await readFile(join(root, asset.path));
      assert.equal(bytes.length, asset.bytes);
      assert.equal(sha(bytes), asset.sha256);
    }
    descriptors.push(descriptor);
  }
  assert.notEqual(descriptors[0].package_hash, descriptors[1].package_hash);
  assert.notEqual(descriptors[0].manifest_url, descriptors[1].manifest_url);
});
