// Every course is free (owner's decision of 16.10.2026). No interface text offers access to
// the courses as a part of Premium. The legal texts change with their own version and are not
// part of this check.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const locales = Object.fromEntries(
  await Promise.all(
    ["de", "en-US"].map(async (language) => [
      language,
      JSON.parse(await read(`locales/${language}.json`)),
    ])
  )
);

/** Every text of a locale file with its key. */
function texts(node, key = "") {
  if (typeof node === "string") return [[key, node]];
  return Object.entries(node).flatMap(([name, value]) =>
    texts(value, key ? `${key}.${name}` : name)
  );
}

const PROMISES = {
  de: [/zugriff auf alle kurse/i, /premium[^.]*\bkurs/i, /kurs[^.]*\bpremium/i],
  "en-US": [/access to all courses/i, /premium[^.]*\bcourse/i, /course[^.]*\bpremium/i],
};

test("no interface text offers the courses as a part of Premium", () => {
  for (const language of ["de", "en-US"]) {
    const found = texts(locales[language]).filter(([, text]) =>
      PROMISES[language].some((pattern) => pattern.test(text))
    );
    assert.deepEqual(found, [], language);
  }
});

test("the order of Premium names what Premium brings, without courses", () => {
  assert.equal(
    locales.de.Body.OrderPremiumCharacteristics,
    "Premium-Mitgliedschaft: unbegrenzte Herzen."
  );
  assert.equal(
    locales["en-US"].Body.OrderPremiumCharacteristics,
    "Premium membership: unlimited hearts."
  );
});
