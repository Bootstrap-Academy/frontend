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

test("statistics explanation keeps its existing-data limits, legal basis and objection route", () => {
  const statistics = privacy.match(/<section id="statistiken">([\s\S]*?)<\/section>/)?.[1];
  assert(statistics, "statistics section exists");
  const explanation = text(statistics);
  for (const wording of [
    "Wir wollen die Academy für alle besser machen.",
    "ob neue Funktionen wirklich genutzt werden, welche Lektionen schwerfallen",
    "wie sich die Grenzen beim kostenlosen Lernen auswirken",
    "intern Daten aus, die wir nach diesen Hinweisen ohnehin speichern",
    "nur so weit, wie es dafür nötig ist",
    "Zusätzlich erheben wir nichts.",
    "dass sich daraus keine Angaben über einzelne Personen ableiten lassen",
    "Jede Angabe beruht auf mindestens zehn Personen",
    "beziehen wir deine Daten in künftige Auswertungen nicht mehr ein",
    "Für Entscheidungen über einzelne Personen nutzen wir die Ergebnisse nie",
    "Einzeldaten geben wir nicht weiter",
    "Verarbeitung bis zur Anonymisierung",
    "Art. 6 Abs. 1 lit. f DSGVO",
    "überwiegt, weil",
    "nur Ergebnisse ohne Personenbezug verwenden",
    "aus Gründen deiner besonderen Situation widersprechen (Art. 21 DSGVO)",
  ]) {
    assert(explanation.includes(wording), wording);
  }
  assert(statistics.includes('href="#datenschutz-ansprechstelle"'));
  assert(statistics.includes('href="#rechte"'));
  assert(text(privacy).includes("Fassung: 2026-10-r2"));
});

test("profile sharing is described as consent with its exact audience, scope and withdrawal", () => {
  const sharing = privacy.match(/<h3 id="profilfreigabe">([\s\S]*?)<h3>12\.3/)?.[1];
  assert(sharing, "profile sharing section exists");
  const explanation = text(sharing);
  for (const wording of [
    "Dein Lernstand ist privat.",
    "Das gilt für neue und bestehende Konten; eine frühere Einstellung zur Bestenliste zählt nicht als Freigabe.",
    "andere angemeldete Nutzer mit bestätigter E-Mail-Adresse",
    "Anzeigenamen, den Standard-Avatar, deine Gesamt-XP sowie deine Plätze und Punkte",
    "Nickname, E-Mail-Adresse, einzelne Skills, Bio, Tags, Lösungen und Projektstände bleiben privat.",
    "Plätze und Teilnehmerzahlen berücksichtigen nur freigegebene Konten.",
    "„Wieder privat stellen“",
    "Art. 6 Abs. 1 lit. a DSGVO",
    "Art. 6 Abs. 1 lit. c in Verbindung mit Art. 7 Abs. 1 DSGVO",
    "in deinem Datenexport enthalten und werden mit deinem Konto gelöscht",
  ]) {
    assert(explanation.includes(wording), wording);
  }
  const notice = text(privacy);
  assert(!notice.includes("In den Bestenlisten anzeigen"));
  assert(!notice.includes("Bestenliste (motivierende Lernumgebung)"));
  assert(!notice.includes("Der Nickname ist für andere angemeldete Nutzer sichtbar"));
  assert(!explanation.includes("Nutzerkennung"), "public leaderboards carry no account ID");
  assert(explanation.includes("Für dich freigeben werden wir dein Profil nie"));
});

test("browser storage section names its categories without promising more than the app does", () => {
  const storage = privacy.match(/<section id="cookies">([\s\S]*?)<\/section>/)?.[1];
  assert(storage, "browser storage section exists");
  const explanation = text(storage);
  for (const wording of [
    "Lernen ohne Konto",
    "bis 30 Tage nach der letzten Nutzung",
    "Der Rückkehrhinweis liegt 24 Stunden im Session Storage.",
    "Kündigungen und Widerrufe gelten 24 Stunden",
    "Fristen prüft die App, wenn du die Seite wieder öffnest.",
    "Cookies sendet dein Browser von selbst nur an die Weboberfläche",
    "§ 25 Abs. 2 Nr. 2 TDDDG",
    "nur die Zieladresse in der App und eine Ablaufzeit",
    "auch in anderen offenen Tabs dieses Browsers",
    "Beim Abmelden und nach einer Kontolöschung bleiben die Einträge",
  ]) {
    assert(explanation.includes(wording), wording);
  }
  assert(!explanation.includes("nicht an unsere Server übertragen"));
  const reports = text(
    privacy.match(/<h3>8\.2 Fehlerberichte<\/h3>([\s\S]*?)<\/section>/)?.[1] ?? ""
  );
  assert(
    reports.includes(
      "Werte aus dem Arbeitsspeicher des Programms nehmen wir in keinen Fehlerbericht auf"
    )
  );
  assert(!/<code>/.test(storage), "categories replace individual storage keys");
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
