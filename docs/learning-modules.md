# Individuelle Lektionsmodule

Der Player lädt zentral geprüfte eigene ES-Module innerhalb der gemeinsamen Lernoberfläche. Bestehende Video-, Quiz-, Matching-, Coding- und Lernraumkomponenten bleiben über Adapter nutzbar. Ein eigenes Modul benötigt keine HTML-Seite, eigene Navigation oder eigene Fortschrittsdatenbank.

## Browservertrag

`types/learningModule.ts` ist die öffentliche Schnittstelle. Ein browserfertiges JavaScript-Modul exportiert `apiVersion = 1` und `mount(element, host)`. Die zurückgegebene Instanz besitzt `update(context)` und `dispose()`, optional `cancelPreparation()`. Die Implementierung darf DOM, Canvas oder ein vorher gebautes Framework verwenden. Nuxtinterne Imports und zufällige Hash-Chunks der Hauptanwendung sind keine öffentlichen Abhängigkeiten.

`host.context` enthält Aktivitätskennung, Sprache, Inhalt, privaten Arbeitsstand, optionale Wiederholungskennung und den aktuellen gesperrten Zustand. Es ist eine Kopie. `host.change(state)` übergibt einen vollständigen JSON-Arbeitsstand an den bestehenden Speichercontroller. `await host.save()` bestätigt dessen Speicherung oder liefert `false`. `host.complete(answer)` fordert den vorhandenen serverseitigen Abschluss an; die Methode bestätigt selbst weder Erfolg noch XP. `host.setBusy(true/false)` meldet einen laufenden Vorgang an die Navigation. Geheimwerte und Authentifizierungstokens werden nicht durch das SDK bereitgestellt.

### Eine eigene Oberfläche für eine bestehende Aufgabe

Eine Customaktivität mit serverseitiger `exercise`-Referenz bekommt zusätzlich `host.assessment` und `host.context.assessment`. Der Kontext enthält den Aufgabentyp, eine kopierte `view` des bestehenden Abgabecontrollers (Frage, Antwortmöglichkeiten, Codebeispiele, verfügbare Umgebungen, Phase und Ergebnis) und `draft` mit den bisherigen Antwortfeldern. Änderungen an diesen Kopien ändern weder Ergebnis noch gespeicherte Versuche.

- `await host.assessment.submit({ answers: [false, true] })` für Multiple Choice.
- `await host.assessment.submit({ answer: [1, 0] })` für Matching.
- `await host.assessment.submit({ code: "print(6)", environment: "Python" })` für Coding; die Umgebung muss aus `view.environments` stammen. Ohne Angabe verwendet der Host die bisherige oder eine verfügbare Umgebung.
- `await host.assessment.check()` liest das Ergebnis eines offenen Versuchs, ohne eine Abgabe zu wiederholen.
- `await host.assessment.newAttempt()` erlaubt nach einem unklaren Ergebnis ausdrücklich eine neue Abgabe. Die Oberfläche muss dabei verständlich machen, dass der vorherige Versuch bereits zählen kann.

`submit()` liefert `false`, wenn Antwort oder Zustand keine Abgabe zulassen. `true` bedeutet nur, dass der Controller die Abgabe übernommen hat; die Oberfläche verwendet weiterhin `view.phase`, `view.error` und das Serverergebnis. Die Brücke nutzt denselben `createLearningExercise`-Controller wie die Standardoberfläche: Unsicherheitsmarkierung vor Abgabe speichern, genau ein POST, Ergebnis und Herzen abgleichen, Wiederholungen an den konkreten Versuch binden. Module erhalten keine allgemeine Requestfunktion und wählen keine fremde Aufgabe oder URL.

Bei einer verknüpften Aufgabe wirkt `host.complete(answer)` erst, wenn der Controller `phase: "correct"` meldet. Der Host fügt die gespeicherte Versuchkennung selbst hinzu; das Modul kann keinen Erfolgsnachweis übergeben. Skills und Challenges prüfen den Abschluss weiterhin serverseitig. Ein Modul ohne `exercise` verwendet unverändert die konfigurierte Introductionprüfung und lädt keine Challengeinformationen.

Das Feld `__academy_assessment` im gespeicherten Roomzustand gehört dem Host. Es bindet Antwort und Wiederaufnahmeinformationen an Aktivität, Konto, Wiederholung und Aufgabe. Es erscheint nicht in `host.context.state`; `host.change()` erhält es unabhängig vom eigenen Modulzustand. Der öffentliche `assessment.draft` enthält nur Antwortfelder. Eine tatsächliche Abgabe hält die Navigation gesperrt, auch wenn das Modul `setBusy(false)` aufruft.

### Optionale Plattformfähigkeiten

`host.capabilities` nennt, was dieser Player zusätzlich anbietet, z. B. `["llm", "project"]`. Module prüfen vor der Nutzung `if (host.llm)` bzw. `if (host.project)`. Ältere Module ohne diese Prüfung laufen unverändert; `api_version` bleibt 1.

**`host.llm`** gibt es für Lektionsaktivitäten aus einem Lernraum. Das Modul nennt nur eine Profil-ID; Systemprompt, Modelle und Grenzen legt der Server fest. Der Host holt den Lektions-Grant bei skills-ms (`POST /skills/rooms/{unit}/llm-grant?course=`), erneuert Token und Grant bei Bedarf und ruft das LLM-Gateway auf. Module sehen weder Token noch Grant, URL oder signiertes Urteil.

- `await host.llm.respond({ profile, input: [{ role: "user", content }], variables?, params?, model? }, { onDelta?, signal? })` liefert `{ ok: true, requestId, status, outputs, usage, model, redacted }` oder `{ ok: false, error }`. Mit `onDelta` wird gestreamt. Nach einem Verbindungsabbruch hängt sich der Host über dieselbe Request-ID wieder an; jedes Textstück kommt genau einmal an. `signal` bricht nur das Zuhören ab, eine begonnene Antwort wird auf dem Server fertig und abgerechnet.
- `respond` und `grade` werfen nie. `error` hat `code`, `message` (kurzer Du-Text in der Sprache der Aktivität), `fallback`, `retryable` und optional `retryAfterMs` und `resetsAt`. `fallback: true` heißt: das vorbereitete, als Beispiel gekennzeichnete Ergebnis zeigen und weitermachen (Pause, Kontingent aufgebraucht, kein Zugang, kein Profil). `retryable: true` heißt: „Nochmal“ anbieten. Beides falsch (`input_blocked`, `input_too_long`, `input_empty`) heißt: die Eingabe ändern lassen. Jede Aktivität bleibt ohne Live-Antwort abschließbar.
- Vor `respond` die Eingabe mit `host.change()` und `await host.save()` sichern. Gebrauchte Antworten gekürzt im eigenen Arbeitsstand ablegen.
- `await host.llm.info(profile)` liefert öffentliche Profildaten (Modelle, Grenzen, bei Bewertungsprofilen Kriterien-IDs und Punkte) oder `null`.
- `await host.llm.grade(answer, { profile?, signal? })` bewertet einen Freitext mit dem Bewertungsprofil der Aktivität und liefert `{ ok: true, passed, counts, score, maxScore, passScore, reason, criteria: [{ id, met, points, evidence }], model }`. `evidence` ist ein wörtliches Zitat aus der Antwort und kann dort markiert werden. `counts: true` bedeutet ein vom Gateway signiertes Bestehen: Der nächste `host.complete()` schließt die Aktivität mit genau diesem Text und dem Urteil ab (Abschlussart `llm-verdict`); was das Modul an `complete` übergibt, wird dann ignoriert. Ein neues `grade` ersetzt ein früheres Bestehen. Nicht bestanden kostet nichts; das Modul bietet neuen Versuch, nach drei Fehlversuchen eine Musterlösung zum Vergleich und das Überspringen an. Ist das Urteil beim Abschluss abgelaufen, zeigt der Player „nochmal prüfen lassen“.
- `host.llm.label(kind)` liefert ein fertiges Element zum Einfügen neben selbst gezeichneter Modellausgabe: `"live"` („KI-Antwort“, Pflicht an jeder Live-Ausgabe), `"example"` („Vorbereitete Beispielantwort“) und `"grading"` („KI-Bewertung, kann irren“, einmal an der Bewertung).

**`host.project`** gibt es innerhalb eines Kurses: ein privater, kursweiter Projektstand (höchstens 64 KiB JSON-Objekt). `await host.project.get()` liefert `{ revision, state }`, anfangs `{ revision: 0, state: {} }`. `await host.project.save(state, expectedRevision)` liefert den neuen Stand oder lehnt mit `{ code: "conflict" | "too_large" | "offline" }` ab. Bei `conflict` neu lesen, zusammenführen und erneut speichern. Ein verlorenes Speichern wiederholt der Host einmal mit derselben Request-ID.

Jede Instanz räumt bei `dispose()` ihre Listener, Timer, Worker, Medien und Grafikressourcen auf. Für Listener und asynchrone Vorgänge steht `host.signal` bereit. Das Signal wird beim Entfernen oder Fehler abgebrochen. Module dürfen nur in ihre zugewiesene Arbeitsfläche rendern und keine dauerhaften privaten Zustände in Modulglobalen halten. Der Browser behält importierten Code im Modulcache; Instanzabbau entfernt diesen Code nicht. Keine wechselnden Zufallsparameter an Importadressen anhängen.

Bei geänderter Sprache, Zustand oder Sperre ruft der Host `update()` auf. Neue Aktivität, anderes Konto oder neue Wiederholung erhalten eine neue Instanz. Verspätete Imports und Modulrückmeldungen dürfen keine inzwischen geöffnete Aktivität verändern. Der eigene Code ist vertrauenswürdiger Anwendungscode; diese Schnittstelle ist keine Sicherheits-Sandbox. Schülercode wird weiter über die vorhandene Ausführungsumgebung bearbeitet.

Browser können auch fehlgeschlagene ES-Imports zwischenspeichern. Der sichtbare Fehler-Retry speichert deshalb zuerst den aktuellen Stand und lädt anschließend dieselbe Seite neu. Bei einem Speicherfehler bleibt die Seite offen. Eine laufende Assessmentabgabe blockiert diesen Retry. So werden auch fehlgeschlagene Untermodulimporte erneut angefordert, ohne Zufallsparameter, Blobkopien oder einen zweiten Modulcache einzuführen.

## Paket bauen und registrieren

Ein eigener Quellordner enthält eine `module.json`:

```json
{ "id": "my-module", "api_version": 1, "entry": "index.js" }
```

Daneben liegen browserfertige `.js`-/`.mjs`-Dateien und benötigte Assets. Relative Imports und mit `new URL("./asset.svg", import.meta.url)` aufgelöste Assets bleiben innerhalb des Pakets. Falls TypeScript oder ein Framework verwendet wird, dessen Build vorher ausführen und den browserfertigen Ausgabeordner paketieren. Es gibt keine zusätzliche Frameworkpflicht und keine automatische gemeinsame Vue-Runtime über getrennte Builds hinweg.

```sh
node scripts/build-learning-module.mjs \
  --source path/to/browser-module \
  --output path/to/artifacts \
  --base-url https://your-asset-host.example/learning-modules/
```

Das Werkzeug erzeugt ein unveränderliches Verzeichnis unter dem SHA-256 des Paketbestands. Darin stehen die Dateien, ein `manifest.json` mit Dateihashes und eine neue `module.json` mit genau `id`, `api_version` und `entry_url`. Es lädt nichts hoch und verändert keine Registrierung. Verdeckte Dateien und Symlinks werden abgewiesen; nur den dafür vorgesehenen geprüften Modulordner übergeben.

Zuerst dieses vollständige Verzeichnis unter dem angegebenen HTTPS-Assetpfad bereitstellen und Dateihashes, JavaScript-MIME-Type, CORS sowie unveränderliches Caching prüfen. Danach den Descriptor über den internen Skills-Registryweg importieren und die gewünschte Customaktivität mit der Modul-ID verbinden. Der Asset-Origin muss dort ausdrücklich zugelassen sein. Metadaten/Registrierung und ausführbare Dateien bleiben getrennt. Die Veröffentlichung eines kompatiblen Moduls erfordert damit keinen neuen Hauptfrontendbuild. Eine zusätzliche Plattformfähigkeit oder neue SDK-Hauptversion kann hingegen einen Playerrelease benötigen.

Alte Dateien für bestehende Sitzungen erreichbar halten. Eine aktualisierte Implementierung muss vorhandene Arbeitsstände weiterhin verstehen. Artefakthashes dienen der technischen Bindung und erzeugen keine neue fachliche Aufgabe, neue Erstabschluss-XP oder eigene Inhaltsversionshistorie.

## Bestehende Inhalte und Prüfung

Für erste Integrationsprüfungen liegt ein kleines eigenständiges Modul unter `tests/fixtures/learning-module/`. Es ist kein veröffentlichtes Lernangebot. Die vorhandenen Standardrenderer und dieses Modul können denselben Player verwenden, ohne Bibliotheken für unbesuchte Aktivitäten vorab zu laden.

Prüfen: kalter/warmgeladener Einstieg, fehlender Import, Wechsel während eines Downloads oder async Mounts, gespeicherter Entwurf, Konto-/Reviewwechsel, eingeschränkte Bedienung während einer Abgabe, Mobilansicht und Aufräumen nach dem Verlassen. Serverbestätigung und bestehende XP-/Herzenregeln bleiben Teil der jeweiligen Bewertungsautorität.
