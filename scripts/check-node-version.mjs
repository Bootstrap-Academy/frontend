import { readFileSync } from "node:fs";

const expected = readFileSync(new URL("../.node-version", import.meta.url), "utf8").trim();
if (process.versions.node !== expected) {
  console.error(
    `Use Node.js ${expected} from .node-version; this command is running ${process.versions.node}.`
  );
  process.exitCode = 1;
}
