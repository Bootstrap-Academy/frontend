import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse, compileTemplate } from "@vue/compiler-sfc";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const text = (html) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const current = await read("pages/docs/terms-and-conditions.vue");
const original = await read("components/legal/TermsAndConditionsR3.vue");
const privacy = await read("pages/docs/privacy.vue");
const clause = (source, number) => {
  const value = source.match(
    new RegExp(`<p>\\s*${number.replaceAll(".", "\\.")}\\s+[\\s\\S]*?</p>`)
  );
  assert(value, `clause ${number} exists`);
  return text(value[0]);
};
const section = (source, number) => {
  const value = source.match(new RegExp(`<article id="ziffer-${number}">([\\s\\S]*?)</article>`));
  assert(value, `section ${number} exists`);
  return text(value[1]);
};

test("r3 and r2 originals remain byte-exact and independently accessible", async () => {
  assert.equal(
    createHash("sha256").update(original).digest("hex"),
    "9b67adc0148012c7ca7465320aef00c9e8dba82b84d2d93cc3b9c3cb5d662777"
  );
  assert.equal(
    createHash("sha256")
      .update(await read("components/legal/TermsAndConditionsR2.vue"))
      .digest("hex"),
    "6e959b7ccb304285f6abb1ac59389e2eadb1310998ea430daed77e3e18fb71a7"
  );
  assert(original.includes("Fassung: 2026-09-r3"));
  const archive = await read("pages/docs/terms-and-conditions-2026-09-r3.vue");
  assert(archive.includes("<TermsAndConditionsR3 />"));
  assert(!archive.includes("navigateTo"));
  assert(current.includes('href="/docs/terms-and-conditions-2026-09-r3"'));
});

test("r4 preserves current prices, refund rights, course access and the whole-heart rule", () => {
  for (const number of ["6.2", "6.5", "6.6", "6.7", "6.8", "6.9"]) {
    assert.equal(clause(current, number), clause(original, number), number);
  }
  for (const number of [7, 9]) {
    assert.equal(section(current, number), section(original, number), `section ${number}`);
  }
  assert.equal(
    section(current, 8),
    section(original, 8).replace("Nicht enthalten sind Webinare und Coachings (Ziffer 10). ", "")
  );
  assert.equal(clause(current, "20.3"), clause(original, "20.3"));
  assert(current.includes("Fassung: 2026-09-r4"));
  assert(
    text(current).includes(
      "Diese Fassung gilt für neue Verträge, wenn wir sie beim Abschluss vereinbaren."
    )
  );
});

test("current document templates compile and every local contents link resolves once", async () => {
  for (const [file, source] of [
    ["pages/docs/terms-and-conditions.vue", current],
    ["pages/docs/privacy.vue", privacy],
    [
      "pages/docs/terms-and-conditions-2026-09-r3.vue",
      await read("pages/docs/terms-and-conditions-2026-09-r3.vue"),
    ],
  ]) {
    const parsed = parse(source, { filename: file });
    assert.deepEqual(parsed.errors, [], file);
    const compiled = compileTemplate({
      source: parsed.descriptor.template.content,
      filename: file,
      id: file,
    });
    assert.deepEqual(compiled.errors, [], file);
    const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${file}: duplicate section ID`);
    for (const match of source.matchAll(/\bhref="#([^"]+)"/g)) {
      assert(ids.includes(match[1]), `${file}: missing ${match[1]}`);
    }
  }
  assert.equal([...current.matchAll(/<article id="ziffer-\d+">/g)].length, 22);
  assert(!/Ziffer 10\.[3-7]\b/.test(current));
  assert(!/Abschnitt 14\.[123]\b/.test(privacy));
});

test("new acquisition and storage descriptions distinguish preserved history from the current offer", () => {
  const terms = text(current);
  const notice = text(privacy);
  assert(terms.includes("Neue MorphCoins kannst du ausschließlich kaufen."));
  assert(
    terms.includes(
      "Bereits vorhandenes Guthaben und bereits entstandene Vergütungsansprüche bleiben erhalten."
    )
  );
  assert(terms.includes("Webinare und Coachings bieten wir nicht mehr an."));
  assert(!terms.includes("korrigierte Aufgabe neu erstellen"));
  assert(!terms.includes("Belohnungs-Coins vergeben wir für Beiträge"));
  assert(notice.includes("privaten Bearbeitungsstand"));
  assert(notice.includes("letzten vier Speicher- oder Abschlussbestätigungen je Einheit"));
  assert(
    notice.includes(
      "Deine gewählten Antworten können auch Bestandteil eines gespeicherten Lernraums sein."
    )
  );
  assert(!notice.includes("Die von dir gewählten Antworten auf Quizfragen speichern wir nicht."));
  assert(!notice.includes("geben keine Lernempfehlungen auf Basis deines Verhaltens"));
  assert(!notice.includes("Jitsi"));
  assert(!notice.includes("8x8"));
});
