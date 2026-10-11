import fs from "node:fs/promises";
import path from "node:path";

// Run manually when a course is added or removed:
//
//   node scripts/build-course-list.mjs <address of the API>
//
// It writes the list of course addresses that the sitemap is built from
// (modules/discoverable.ts). Builds never contact the API, so the sitemap of a build is
// known before it is built and does not depend on the API being reachable then.
const api = process.argv[2];
if (!api) throw new Error("Usage: node scripts/build-course-list.mjs <address of the API>");
const response = await fetch(new URL("/skills/courses", api));
if (!response.ok) throw new Error(`The course list could not be read (${response.status})`);
const ids = (await response.json()).map((course) => course.id).sort();
// An id becomes part of an address as it is.
const odd = ids.filter((id) => typeof id !== "string" || !/^[a-z0-9_-]+$/i.test(id));
if (!ids.length || odd.length) throw new Error(`Unexpected course ids: ${JSON.stringify(odd)}`);
const file = path.resolve(import.meta.dirname, "../assets/public-course-ids.json");
await fs.writeFile(file, JSON.stringify(ids, null, 2) + "\n");
console.log(`Wrote ${ids.length} course ids.`);
