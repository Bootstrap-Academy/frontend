import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("responsive course thumbnails are complete, smaller WebP files", async () => {
  const images = JSON.parse(
    await fs.readFile(new URL("../assets/course-thumbnails.json", import.meta.url))
  );
  assert(Object.keys(images).length > 0);
  for (const [source, image] of Object.entries(images)) {
    assert.equal(new URL(source).origin, "https://static.bootstrap.academy");
    assert.deepEqual(
      image.variants.map((v) => v.width),
      [400, 800]
    );
    for (const variant of image.variants) {
      const data = await fs.readFile(new URL(`../public${variant.src}`, import.meta.url));
      assert.equal(data.toString("ascii", 0, 4), "RIFF");
      assert.equal(data.toString("ascii", 8, 12), "WEBP");
      assert(data.length < image.originalBytes, source);
    }
  }
});
