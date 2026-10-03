import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

// Run manually when a managed course image changes. Builds never contact the image host.
const root = path.resolve(import.meta.dirname, "..");
const manifestFile = path.join(root, "assets/course-thumbnails.json");
const sources = process.argv[2]
  ? JSON.parse(await fs.readFile(process.argv[2], "utf8"))
  : Object.keys(JSON.parse(await fs.readFile(manifestFile, "utf8")));
const encoder = process.env.CWEBP || "cwebp";
const output = path.join(root, "public/course-thumbnails");
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "academy-thumbnails-"));
const manifest = {};
await fs.mkdir(output, { recursive: true });
try {
  for (const source of sources) {
    const url = new URL(source);
    if (
      url.origin !== "https://static.bootstrap.academy" ||
      !url.pathname.startsWith("/thumbnails/")
    )
      throw new Error("Only Academy thumbnail originals are supported");
    const response = await fetch(url);
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/"))
      throw new Error(`Image download failed: ${url.pathname} (${response.status})`);
    const original = Buffer.from(await response.arrayBuffer());
    const hash = crypto.createHash("sha256").update(original).digest("hex");
    const input = path.join(temporary, "original.jpg");
    await fs.writeFile(input, original);
    const variants = [];
    for (const width of [400, 800]) {
      const name = `${hash.slice(0, 16)}-${width}.webp`;
      execFileSync(encoder, [
        "-quiet",
        "-q",
        "80",
        "-resize",
        String(width),
        "0",
        input,
        "-o",
        path.join(output, name),
      ]);
      variants.push({ width, src: `/course-thumbnails/${name}` });
    }
    manifest[source] = { sha256: hash, originalBytes: original.length, variants };
  }
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Generated ${sources.length} managed images, two WebP widths each.`);
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
