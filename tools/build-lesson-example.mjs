import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";
const [out, origin] = process.argv.slice(2);
if (!out || !origin || new URL(origin).origin !== origin)
  throw new Error("Usage: node tools/build-lesson-example.mjs OUT CONTENT_ORIGIN");
const source = path.resolve(import.meta.dirname, "../lesson-protocol/examples/restore");
const sha = (data) => createHash("sha256").update(data).digest("hex");
const canonical = (value) =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
          .join(",")}}`
      : JSON.stringify(value);
const code = await build({
  entryPoints: [path.join(source, "main.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  target: "es2023",
  minify: true,
});
const files = new Map([["main.js", code.outputFiles[0].contents]]);
for (const file of ["index.html", "style.css", "state.schema.json"])
  files.set(file, await fs.readFile(path.join(source, file)));
const types = {
  "index.html": "text/html",
  "main.js": "text/javascript",
  "style.css": "text/css",
  "state.schema.json": "application/json",
};
const assets = [...files]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, bytes]) => ({
    path: name,
    sha256: sha(bytes),
    mediaType: types[name],
    bytes: bytes.length,
    loading: "initial",
  }));
const manifest = JSON.parse(
  await fs.readFile(path.resolve(source, "../../fixtures/manifest.json"), "utf8")
);
manifest.requires = [];
manifest.optional = [];
manifest.assets = assets;
const packageHash = sha(canonical(assets));
const base = origin + "/packages/" + packageHash + "/";
const manifestBytes = Buffer.from(JSON.stringify(manifest));
const descriptor = {
  id: manifest.id,
  api_version: 2,
  entry_url: base,
  manifest_url: base + "manifest.json",
  manifest_hash: sha(manifestBytes),
  package_hash: packageHash,
};
const destination = path.resolve(out, "site/packages", packageHash);
await fs.mkdir(destination, { recursive: true });
for (const [name, bytes] of files) await fs.writeFile(path.join(destination, name), bytes);
await fs.writeFile(path.join(destination, "manifest.json"), manifestBytes);
await fs.writeFile(
  path.resolve(out, "descriptor.json"),
  JSON.stringify(descriptor, null, 2) + "\n"
);
await fs.writeFile(
  path.resolve(out, "site/404.html"),
  "<!doctype html><title>Not found</title><p>Not found</p>"
);
await fs.writeFile(
  path.resolve(out, "site/_headers"),
  `/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors https://test.bootstrap.academy http://localhost:58761
  Permissions-Policy: camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=(), fullscreen=(), payment=(), usb=()
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  Access-Control-Allow-Origin: *
  Access-Control-Expose-Headers: Content-Security-Policy
/packages/*
  Cache-Control: public, max-age=31536000, immutable
`
);
console.log(
  JSON.stringify({
    descriptor,
    files: files.size,
    totalBytes: [...files.values()].reduce((sum, b) => sum + b.length, 0),
    scriptBytes: files.get("main.js").length,
  })
);
