<template>
  <main class="mt-main mb-main container">
    <h1>Datenschutzhinweise für Bootstrap Academy</h1>

    <section id="einleitung">
      <h2>1 Einleitung</h2>
      <p>
        Hier erfährst du, welche personenbezogenen Daten wir verarbeiten, wenn du unsere Webseiten
        besuchst, bei Bootstrap Academy lernst oder uns kontaktierst. Wir erklären, wofür wir die
        Daten brauchen, welche Rechtsgrundlage gilt, wie lange wir sie speichern und wer sie erhält.
        Damit informieren wir dich nach Art. 13 und 14 der Datenschutz-Grundverordnung (DSGVO).
      </p>
      <p>
        Neben der DSGVO gelten das Bundesdatenschutzgesetz (BDSG), das
        Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz (TDDDG) für das Speichern von und den
        Zugriff auf Informationen in deinem Browser sowie das Digitale-Dienste-Gesetz (DDG).
      </p>
      <p>
        Wir setzen keine Analyse- oder Tracking-Dienste ein, versenden keinen Newsletter und werten
        dein Lernverhalten weder für Profilbildung noch für Empfehlungen aus. Dienste Dritter, die
        bei der Nutzung der Plattform Daten erhalten, benennen wir in diesen Hinweisen mit Name,
        Sitz und Rechtsgrundlage.
      </p>
    </section>

    <ol class="table-content mt-container">
      <li><a href="#verantwortliche">Verantwortliche Stelle</a></li>
      <li>
        <a href="#datenschutz-ansprechstelle">Ansprechstelle für den Datenschutz</a>
      </li>
      <li><a href="#geltungsbereich">Geltungsbereich und Systeme</a></li>
      <li><a href="#rechtsgrundlagen">Rechtsgrundlagen</a></li>
      <li><a href="#ueberblick">Überblick Verarbeitungstätigkeiten</a></li>
      <li><a href="#hosting">Hosting, Auftragsverarbeiter und Datensicherungen</a></li>
      <li><a href="#serverlogs">Server-Logs und Fehlerberichte</a></li>
      <li><a href="#cookies">Cookies und lokale Speichertechnologien</a></li>
      <li><a href="#konto">Benutzerkonto, Anmeldung und Sitzungen</a></li>
      <li><a href="#oauth">Anmeldung über GitHub, Discord oder Google</a></li>
      <li><a href="#lernen">Lernplattform, Lernfortschritt und Bestenliste</a></li>
      <li><a href="#challenges">Challenges, Code-Ausführung und Moderation</a></li>
      <li><a href="#events">Events, Webinare und Coaching</a></li>
      <li><a href="#zahlungen">MorphCoins, Premium, Herzen und Zahlungen</a></li>
      <li><a href="#videos">Kursvideos (MP4 und YouTube)</a></li>
      <li><a href="#kommunikation">E-Mails, Kontakt und Community</a></li>
      <li><a href="#analyse">Keine Analyse, kein Tracking, keine Profilbildung</a></li>
      <li><a href="#drittland">Drittlandübermittlungen</a></li>
      <li><a href="#speicherung">Speicherdauer und Löschung</a></li>
      <li><a href="#pflichtangaben">Pflichtangaben und Freiwilligkeit</a></li>
      <li><a href="#mindestalter">Mindestalter</a></li>
      <li><a href="#rechte">Deine Datenschutzrechte</a></li>
      <li><a href="#aufsicht">Beschwerderecht bei der Aufsichtsbehörde</a></li>
      <li><a href="#aenderungen">Änderungen dieser Hinweise</a></li>
    </ol>

    <section id="verantwortliche">
      <h2>2 Verantwortliche Stelle</h2>
      <p>Verantwortlich für die in diesen Hinweisen beschriebenen Verarbeitungen ist:</p>
      <p>
        bootstrap academy GmbH<br />
        Wittelsbacherplatz 1<br />
        80333 München<br />
        Deutschland<br />
        Telefon: +49 30 21928640<br />
        E-Mail:
        <a href="mailto:hallo@bootstrap.academy" class="underline-link">hallo@bootstrap.academy</a>
      </p>
      <p>
        Angaben zur Vertretung und zum Handelsregister findest du im
        <a href="/docs/imprint">Impressum</a>.
      </p>
    </section>

    <section id="datenschutz-ansprechstelle">
      <h2>3 Ansprechstelle für den Datenschutz</h2>
      <p>Wir haben keinen Datenschutzbeauftragten benannt.</p>
      <p>
        Anfragen zum Datenschutz und zur Ausübung deiner Rechte schickst du bitte an
        <a href="mailto:hallo@bootstrap.academy" class="underline-link">hallo@bootstrap.academy</a>
        mit dem Betreff „Datenschutz“ oder postalisch an die in Abschnitt 2 genannte Anschrift.
      </p>
    </section>

    <section id="geltungsbereich">
      <h2>4 Geltungsbereich und Systeme</h2>
      <p>Diese Hinweise gelten für:</p>
      <ul>
        <li>
          die Lernplattform unter
          <a href="https://bootstrap.academy" target="_blank" rel="noopener noreferrer"
            >bootstrap.academy</a
          >
          mit der Programmierschnittstelle api.bootstrap.academy (Produktivumgebung),
        </li>
        <li>
          die Testumgebung unter
          <a href="https://test.bootstrap.academy" target="_blank" rel="noopener noreferrer"
            >test.bootstrap.academy</a
          >
          und api.test.bootstrap.academy. Sie ist eine eigenständige Installation mit eigener
          Datenbank und eigenen Konten. Wer sich dort registriert, für den gelten diese Hinweise in
          gleicher Weise,
        </li>
        <li>den Code-Ausführungsdienst unter sandkasten.bootstrap.academy (Abschnitt 13),</li>
        <li>
          das interne Verwaltungs-Dashboard unter admin.bootstrap.academy, das nur Administratoren
          nutzen,
        </li>
        <li>
          Vorschau-Versionen der Weboberfläche für einzelne Entwicklungsstände
          (Pull-Request-Vorschauen auf Cloudflare Pages), die ausschließlich mit der Test-API
          verbunden sind,
        </li>
        <li>die Kommunikation mit uns per E-Mail und über das Kontaktformular.</li>
      </ul>
      <p>
        Die Plattform besteht aus mehreren Diensten mit jeweils eigener Datenbank. Die Zuordnung zu
        deinem Konto erfolgt über eine zufällig erzeugte Nutzerkennung (UUID). Welcher Dienst welche
        Daten verarbeitet:
      </p>
      <div class="legal-table-scroll" tabindex="0">
        <table>
          <thead>
            <tr>
              <th>Dienst</th>
              <th>Aufgabe</th>
              <th>Personenbezogene Daten</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Kerndienst (Konto und Shop)</td>
              <td>Registrierung, Anmeldung, Sitzungen, MorphCoins, Premium, Herzen, Rechnungen</td>
              <td>
                Kontodaten, Passwort-Hash, Sitzungen, Zwei-Faktor-Daten, Verknüpfungen mit
                Drittanbietern, Rechnungsdaten, Guthaben und Transaktionen,
                PayPal-Bestellreferenzen, Erklärungen zum Widerrufsrecht, Kündigungs- und
                Widerrufserklärungen, Datensätze zu Rechnungen, Gutschriften und
                Schlussabrechnungen, Verwaltungsprotokoll (Abschnitte 10, 11, 15)
              </td>
            </tr>
            <tr>
              <td>Skills</td>
              <td>Kurse, Lernfortschritt, Erfahrungspunkte (XP)</td>
              <td>
                Kurszugriffe, abgeschlossene Lektionen, zuletzt angesehener Kurs, Lesezeichen, XP je
                Skill (Abschnitt 12)
              </td>
            </tr>
            <tr>
              <td>Challenges</td>
              <td>Quizfragen, Zuordnungs- und Programmieraufgaben</td>
              <td>
                Einreichungen mit Quellcode, Ausführungsergebnisse, Lösungsstand, Versuche,
                Bewertungen, selbst erstellte Aufgaben, Meldungen, Sperren (Abschnitt 13)
              </td>
            </tr>
            <tr>
              <td>Events</td>
              <td>Webinare, Coachings</td>
              <td>
                Anmeldungen, Buchungen, Coaching-Angebote, Bewertungen von Kursleitern,
                Kalender-Abo-Kennung (Abschnitt 14)
              </td>
            </tr>
            <tr>
              <td>Jobs</td>
              <td>Stellenanzeigen (derzeit nicht freigeschaltet)</td>
              <td>keine nutzerbezogenen Datensätze (Abschnitt 12.3)</td>
            </tr>
            <tr>
              <td>Sandkasten</td>
              <td>Ausführung von eingereichtem Code</td>
              <td>Quellcode nur während der Ausführung, ohne Nutzerbezug (Abschnitt 13.2)</td>
            </tr>
            <tr>
              <td>Weboberfläche</td>
              <td>Anzeige im Browser</td>
              <td>Cookies, Local Storage und Session Storage (Abschnitt 9)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Alle Anwendungsdienste und Datenbanken laufen auf Servern der Hetzner Online GmbH in
        Deutschland (Abschnitt 7). Die Dienste kommunizieren untereinander über interne
        Schnittstellen, die aus dem Internet nicht erreichbar sind.
      </p>
      <p>
        Unsere Schnittstellendokumentation (OpenAPI, Swagger, Redoc) ist öffentlich und enthält
        keine personenbezogenen Daten. Auch der Quellcode ist als Open-Source-Projekt weitgehend auf
        GitHub einsehbar.
      </p>
      <p>
        Für externe Angebote, auf die wir verlinken, gelten die Datenschutzhinweise des jeweiligen
        Anbieters.
      </p>
    </section>

    <section id="rechtsgrundlagen">
      <h2>5 Rechtsgrundlagen</h2>
      <p>
        Wir verarbeiten personenbezogene Daten auf den folgenden Rechtsgrundlagen. In den
        Abschnitten 7 bis 17 nennen wir für jede Verarbeitung die konkrete Grundlage.
      </p>
      <ul>
        <li>
          <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> (Vertrag): alles, was zur Bereitstellung der
          Plattform erforderlich ist – Konto, Anmeldung, Kurse, Lernfortschritt, Challenges, Events,
          MorphCoins, Premium, Zahlungen, Anmeldung über Drittanbieter, Kauf- und
          Buchungsbestätigungen, Bearbeitung von Kündigungen und Widerrufen, Erstattungen nach einer
          Kontolöschung.
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. c DSGVO</strong> (rechtliche Verpflichtung): Aufbewahrung von
          Rechnungen, Gutschriften und Schlussabrechnungen nach Handels- und Steuerrecht, Prüfung
          von Umsatzsteuer-Identifikationsnummern, Nachweis und Bestätigung deiner Erklärungen zum
          Widerrufsrecht sowie von Kündigungen und Widerrufen (§ 312f Abs. 3, § 312k Abs. 4, § 356a
          BGB), Erfüllung deiner Rechte auf Auskunft und Datenübertragbarkeit (Art. 15, 20 DSGVO).
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> (berechtigte Interessen): Server-Logs und
          Fehlerberichte (sicherer und stabiler Betrieb, Abwehr von Angriffen, Fehlersuche),
          Datensicherungen (Schutz vor Datenverlust), Auslieferung der Weboberfläche über ein
          Content-Delivery-Netz (Verfügbarkeit, Schutz vor Überlastungsangriffen), Moderation und
          Missbrauchsschutz, Zählung fehlgeschlagener Anmeldeversuche (Abschnitt 10.4), Begrenzung
          der Anfragerate der öffentlichen Kündigungs- und Widerrufsformulare und Aufbewahrung der
          Erklärungen als Nachweis (Abschnitt 15.6), Verwaltungsprotokoll über administrative
          Zugriffe (Abschnitt 10.5), Betrieb des Discord-Bots (Abschnitt 17.3), Bestenliste
          (motivierende Lernumgebung), Beantwortung allgemeiner Anfragen (Abschnitt 17.2). Gegen
          diese Verarbeitungen kannst du Widerspruch einlegen (Abschnitt 23).
        </li>
        <li>
          <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> (Einwilligung): das Laden von YouTube-Videos
          in Kursen. Die Einwilligung gibst du durch Klick auf das jeweilige Video; sie gilt nur für
          diesen Aufruf.
        </li>
        <li>
          <strong>§ 25 TDDDG</strong>: Das Speichern von Informationen in deinem Browser und der
          Zugriff darauf (Cookies, Local Storage) erfolgt nach § 25 Abs. 2 Nr. 2 TDDDG ohne
          Einwilligung, weil es unbedingt erforderlich ist, um die von dir ausdrücklich gewünschte
          Funktion bereitzustellen (Abschnitt 9). Für das Laden von YouTube-Videos holen wir deine
          Einwilligung nach § 25 Abs. 1 TDDDG ein (Abschnitt 16).
        </li>
      </ul>
    </section>

    <section id="ueberblick">
      <h2>6 Überblick Verarbeitungstätigkeiten</h2>
      <p>
        Die Übersicht fasst alle Verarbeitungen zusammen. Einzelheiten findest du in den jeweils
        genannten Abschnitten.
      </p>
      <div class="legal-table-scroll" tabindex="0">
        <table>
          <thead>
            <tr>
              <th>Verarbeitung</th>
              <th>Zweck</th>
              <th>Datenkategorien</th>
              <th>Rechtsgrundlage</th>
              <th>Speicherdauer</th>
              <th>Empfänger</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Auslieferung der Weboberfläche (Abschnitt 7.2)</td>
              <td>Bereitstellung der Website, Schutz vor Überlastungsangriffen</td>
              <td>
                IP-Adresse, Zeitpunkt, aufgerufene URL, Browserkennung, Cookies für
                bootstrap.academy, Netzwerkfehlerberichte
              </td>
              <td>Art. 6 Abs. 1 lit. f DSGVO</td>
              <td>Keine Speicherung bei uns; bei Cloudflare nach dessen Datenschutzerklärung</td>
              <td>Cloudflare, Inc., USA (Auftragsverarbeiter, EU-US Data Privacy Framework)</td>
            </tr>
            <tr>
              <td>Server-Logs (Abschnitt 8.1)</td>
              <td>Sicherer Betrieb, Abwehr von Angriffen, Fehlersuche</td>
              <td>IP-Adresse, Zeitpunkt, URL, HTTP-Status, Browserkennung, Referrer</td>
              <td>Art. 6 Abs. 1 lit. f DSGVO</td>
              <td>
                30 Tage (auch für die Zugriffsprotokolle des Webhostings hinter
                static.bootstrap.academy, dort mit anonymisierter IP-Adresse)
              </td>
              <td>Hetzner Online GmbH, Deutschland (Hosting)</td>
            </tr>
            <tr>
              <td>Fehlerberichte (Abschnitt 8.2)</td>
              <td>Fehlerbehebung</td>
              <td>
                Fehlermeldung, Stacktrace, aufgerufene URL, Nutzerkennung, Kennung und je nach
                Fehler IP-Adresse der auslösenden Anfrage
              </td>
              <td>Art. 6 Abs. 1 lit. f DSGVO</td>
              <td>90 Tage</td>
              <td>Keine (selbst betriebenes System bei Hetzner)</td>
            </tr>
            <tr>
              <td>Cookies, Local Storage und Session Storage (Abschnitt 9)</td>
              <td>
                Anmeldung, Sitzung, Anmeldung über Drittanbieter, von dir gewählte Einstellungen
              </td>
              <td>
                Sitzungstoken, Nutzerkennung, Nickname, Anzeigename, Einstellungen, Einmalwerte
                einer laufenden Anmeldung über einen Drittanbieter
              </td>
              <td>§ 25 Abs. 2 Nr. 2 TDDDG; Art. 6 Abs. 1 lit. b DSGVO</td>
              <td>Sitzungsende; Local Storage und Session Storage siehe Abschnitt 9</td>
              <td>
                Cloudflare, Inc. (Cookies werden bei Anfragen an die Weboberfläche mitgesendet,
                Abschnitt 7.2)
              </td>
            </tr>
            <tr>
              <td>Benutzerkonto (Abschnitt 10)</td>
              <td>Bereitstellung der Plattform, Sicherheit des Kontos</td>
              <td>
                Nickname, Anzeigename, E-Mail-Adresse, Passwort-Hash, Verifizierungsstatus, Rolle,
                Sitzungen, Zwei-Faktor-Daten, Profilangaben, Altersbestätigung, Zustimmung zu den
                AGB oder Aufschub der Entscheidung, Einstellung zur Bestenliste; Zähler
                fehlgeschlagener Anmeldeversuche je Konto und je IP-Adresse (nur als Hashwert)
              </td>
              <td>Art. 6 Abs. 1 lit. b DSGVO; Zähler: lit. f</td>
              <td>
                Bis zur Kontolöschung; Sitzungen bis 30 Tage nach der letzten Nutzung; Zähler 15
                Minuten nach dem letzten Fehlversuch
              </td>
              <td>Keine (Hetzner als Hosting-Anbieter)</td>
            </tr>
            <tr>
              <td>Verwaltungsprotokoll (Abschnitt 10.5)</td>
              <td>Nachvollziehbarkeit administrativer Zugriffe auf Konten</td>
              <td>
                Kennung des handelnden Administrators, Zeitpunkt, Methode und Pfad der Anfrage,
                Kennung des betroffenen Kontos, Antwortstatus, Anfragekennung
              </td>
              <td>Art. 6 Abs. 1 lit. f DSGVO</td>
              <td>Zwölf Monate</td>
              <td>Keine</td>
            </tr>
            <tr>
              <td>Anmeldung über Drittanbieter (Abschnitt 11)</td>
              <td>Alternative Anmeldemethode</td>
              <td>
                Anbieter, Nutzerkennung und Nutzername beim Anbieter, Zeitpunkt der Verknüpfung;
                während einer Anmeldung Einmalkennung, Anbieter, Rückkehradresse, Prüfwert
              </td>
              <td>Art. 6 Abs. 1 lit. b DSGVO</td>
              <td>
                Bis zur Aufhebung der Verknüpfung in den Kontoeinstellungen oder Kontolöschung;
                Daten einer laufenden Anmeldung höchstens zehn Minuten
              </td>
              <td>
                GitHub, Inc., USA; Discord Netherlands B.V., Niederlande / Discord Inc., USA; Google
                Ireland Limited, Irland / Google LLC, USA (jeweils EU-US Data Privacy Framework)
              </td>
            </tr>
            <tr>
              <td>Lernplattform (Abschnitt 12)</td>
              <td>Kurse, Fortschrittsanzeige, XP, Bestenliste</td>
              <td>
                Kurszugriffe, abgeschlossene Lektionen, zuletzt angesehener Kurs, Lesezeichen, XP,
                Skill-Level, Lösungsstand und Versuche bei Aufgaben
              </td>
              <td>Art. 6 Abs. 1 lit. b DSGVO; Bestenliste: Art. 6 Abs. 1 lit. f DSGVO</td>
              <td>Bis zur Kontolöschung</td>
              <td>Bestenliste: angemeldete Nutzer (Anzeigename, Nickname, XP, Rang)</td>
            </tr>
            <tr>
              <td>Challenges und Code-Ausführung (Abschnitt 13)</td>
              <td>Auswertung von Programmieraufgaben, eigene Aufgaben</td>
              <td>
                Quellcode, Programmiersprache, Ergebnis, Fehlerausgaben, Laufzeit,
                Speicherverbrauch, selbst erstellte Aufgaben, Bewertungen
              </td>
              <td>Art. 6 Abs. 1 lit. b DSGVO</td>
              <td>
                Ausführung: höchstens 5 Minuten im Arbeitsspeicher; Einreichung: bis zur
                Kontolöschung
              </td>
              <td>Keine (eigener Code-Ausführungsdienst bei Hetzner)</td>
            </tr>
            <tr>
              <td>Moderation (Abschnitt 13.4)</td>
              <td>Schutz vor missbräuchlichen Inhalten und Meldungen</td>
              <td>Meldungen (Grund, Kommentar), Sperren (Art, Beginn, Ende, Grund)</td>
              <td>Art. 6 Abs. 1 lit. f DSGVO</td>
              <td>Bis zur Kontolöschung</td>
              <td>Keine</td>
            </tr>
            <tr>
              <td>Events, Webinare, Coaching (Abschnitt 14)</td>
              <td>Durchführung von Webinaren und Coachings</td>
              <td>
                Anmeldungen, Buchungen, Bewertungen, Kalender-Kennung; im Videocall IP-Adresse,
                Audio und Video
              </td>
              <td>Art. 6 Abs. 1 lit. b DSGVO</td>
              <td>Vergangene Termine: kurz nach Ende; übrige Daten bis zur Kontolöschung</td>
              <td>
                Kursleiter und Teilnehmer (Anzeigename und Nickname); 8x8, Inc., USA (Jitsi Meet,
                EU-US Data Privacy Framework) beim Beitritt zu einem Videocall
              </td>
            </tr>
            <tr>
              <td>MorphCoins, Premium, Herzen (Abschnitt 15)</td>
              <td>Abwicklung von Käufen und Guthaben</td>
              <td>
                Guthaben, Transaktionen, Premium-Status, Herzen, PayPal-Bestellkennung, Erklärungen
                zum Widerrufsrecht (Abschnitt 15.5)
              </td>
              <td>Art. 6 Abs. 1 lit. b DSGVO; Erklärungen zum Widerrufsrecht: auch lit. c</td>
              <td>
                Bis zur Kontolöschung; Erklärungen beim MorphCoins-Kauf zusätzlich im Datensatz der
                Rechnung (Abschnitt 15.4)
              </td>
              <td>PayPal (Europe) S.à r.l. et Cie, S.C.A., Luxemburg (nur Betrag und Währung)</td>
            </tr>
            <tr>
              <td>
                Rechnungen, Gutschriften, Schlussabrechnung, USt-IdNr.-Prüfung (Abschnitt 15.3,
                15.4)
              </td>
              <td>Rechnungsstellung, steuerliche Pflichten, Erstattung nach Kontolöschung</td>
              <td>Name, Anschrift, Land, E-Mail-Adresse, USt-IdNr., Inhalt des Dokuments</td>
              <td>Art. 6 Abs. 1 lit. b und lit. c DSGVO</td>
              <td>
                Acht Jahre ab Ende des Ausstellungsjahres. Nach Kontolöschung können erforderliche
                Kundenangaben und Zuordnungsnachweise für die in Abschnitt 10.7 beschriebenen Zwecke
                erhalten bleiben.
              </td>
              <td>Europäische Kommission (VIES), nur die USt-IdNr.</td>
            </tr>
            <tr>
              <td>Kündigung und Widerruf über die Plattform (Abschnitt 15.6)</td>
              <td>Entgegennahme und Bestätigung von Kündigungen und Widerrufen</td>
              <td>
                Name, E-Mail-Adresse, Vertrag, Art der Kündigung, Angaben, Eingangszeitpunkt,
                Vertragsende; Zähler je IP-Adresse und E-Mail-Adresse (nur als Hashwert)
              </td>
              <td>
                Art. 6 Abs. 1 lit. c und lit. b DSGVO; Aufbewahrung als Nachweis und Zähler: lit. f
              </td>
              <td>
                Erklärung drei Jahre ab Ende des Eingangsjahres, auch nach Kontolöschung (Abschnitt
                15.6); Zähler eine Stunde
              </td>
              <td>Hetzner Online GmbH, Deutschland (Mailserver)</td>
            </tr>
            <tr>
              <td>YouTube-Kursvideos (Abschnitt 16)</td>
              <td>Wiedergabe von YouTube-Videos nach Klick</td>
              <td>IP-Adresse, Browserdaten, angesehenes Video, von Google gesetzte Cookies</td>
              <td>Art. 6 Abs. 1 lit. a DSGVO; § 25 Abs. 1 TDDDG</td>
              <td>Keine Speicherung bei uns</td>
              <td>
                Google Ireland Limited, Irland / Google LLC, USA (EU-US Data Privacy Framework)
              </td>
            </tr>
            <tr>
              <td>E-Mails von uns (Abschnitt 17.1)</td>
              <td>
                Verifizierung, Passwort-Zurücksetzung, Kauf- und Buchungsbestätigungen,
                Bestätigungen von Kündigung, Widerruf und Stornierung
              </td>
              <td>E-Mail-Adresse, Inhalt der Nachricht, Rechnung</td>
              <td>Art. 6 Abs. 1 lit. b DSGVO; Rechnung: lit. c</td>
              <td>
                Verlängerungsbestätigungen und Versandstatus: Abschnitt 15.7; sonst keine
                Speicherung versendeter E-Mails; Rechnungen acht Jahre
              </td>
              <td>Hetzner Online GmbH, Deutschland (Mailserver)</td>
            </tr>
            <tr>
              <td>Kontakt und Support (Abschnitt 17.2)</td>
              <td>Bearbeitung von Anfragen</td>
              <td>Name, E-Mail-Adresse, Betreff, Nachricht</td>
              <td>Art. 6 Abs. 1 lit. b DSGVO; sonst lit. f</td>
              <td>Bis zur Erledigung, danach zwölf Monate (Abschnitt 17.2)</td>
              <td>Hetzner Online GmbH, Deutschland (Mailserver)</td>
            </tr>
            <tr>
              <td>Discord-Bot (Abschnitt 17.3)</td>
              <td>Moderation und Betrieb des Community-Servers</td>
              <td>
                Discord-Nutzerkennung und -Name, Beitritts-, Austritts- und Aktivitätszeitpunkte,
                Moderationsvorgänge
              </td>
              <td>Art. 6 Abs. 1 lit. f DSGVO</td>
              <td>Bis zur Löschung auf Anfrage (Abschnitt 17.3)</td>
              <td>Keine (eigener Server bei Hetzner)</td>
            </tr>
            <tr>
              <td>Datenexport (Abschnitt 23)</td>
              <td>Auskunft und Datenübertragbarkeit</td>
              <td>Alle in der Exportdatei enthaltenen Daten (Abschnitt 23)</td>
              <td>Art. 6 Abs. 1 lit. c DSGVO (Art. 15, 20 DSGVO)</td>
              <td>Wird beim Abruf erzeugt und nicht gespeichert; Abrufsperre zehn Minuten</td>
              <td>Keine</td>
            </tr>
            <tr>
              <td>Datensicherungen (Abschnitt 7.3)</td>
              <td>Schutz vor Datenverlust</td>
              <td>
                Alle gespeicherten Daten einschließlich Fehlerberichten und Discord-Bot-Datenbank,
                verschlüsselt
              </td>
              <td>Art. 6 Abs. 1 lit. f DSGVO</td>
              <td>
                Konfigurierte Sicherungsstände: 48 stündliche, 14 tägliche, 8 wöchentliche und 12
                monatliche. Keine feste Löschfrist ab der Kontolöschung (Abschnitt 7.3).
              </td>
              <td>Datensicherung in Deutschland (Abschnitt 7.3)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="hosting">
      <h2>7 Hosting, Auftragsverarbeiter und Datensicherungen</h2>
      <h3>7.1 Hetzner Online GmbH</h3>
      <p>
        Programmierschnittstelle (API), Datenbanken, Code-Ausführungsdienst, Speicher für Kursvideos
        sowie unser Fehlerberichtssystem laufen auf Servern der Hetzner Online GmbH, Industriestraße
        25, 91710 Gunzenhausen, Deutschland, in deren Rechenzentren in Falkenstein und Nürnberg.
        Unsere E-Mails versenden wir über den Mailserver eines Webhosting-Pakets der Hetzner Online
        GmbH. Hetzner ist Auftragsverarbeiter nach Art. 28 DSGVO und verarbeitet Daten nur nach
        unserer Weisung. Vorschaubilder der Kurse liefern wir außerdem über static.bootstrap.academy
        aus einem Webhosting-Paket der Hetzner Online GmbH aus (Abschnitt 8.1).
      </p>
      <h3>7.2 Cloudflare, Inc.</h3>
      <p>
        Die Weboberflächen (bootstrap.academy, test.bootstrap.academy, admin.bootstrap.academy und
        die Pull-Request-Vorschauen) werden als statische Dateien über Cloudflare Pages
        ausgeliefert; Cloudflare betreibt außerdem die DNS-Auflösung unserer Domain. Cloudflare
        beendet die TLS-Verschlüsselung für diese Hostnamen und verarbeitet dabei zu jeder Anfrage
        an die Weboberfläche IP-Adresse, Zeitpunkt, aufgerufene Adresse (URL), Browserkennung und
        die für bootstrap.academy gesetzten Cookies (Abschnitt 9). In der URL können kurzlebige
        Einmalwerte enthalten sein, etwa der Rückgabecode und die Einmalkennung (state) einer
        Anmeldung über GitHub, Discord oder Google (Abschnitt 11). Außerdem sendet dein Browser
        Berichte über Netzwerkfehler (Network Error Logging) an Cloudflare, wenn eine Verbindung zur
        Weboberfläche fehlschlägt.
      </p>
      <p>
        Anfragen an unsere Programmierschnittstelle api.bootstrap.academy – dazu gehören Anmeldung,
        Passwörter, Kontoinhalte, Lerndaten und Zahlungen – laufen nicht über Cloudflare, sondern
        direkt zu unseren Servern bei Hetzner.
      </p>
      <p>
        Anbieter: Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, USA. Cloudflare
        ist Auftragsverarbeiter nach Art. 28 DSGVO. Die Übermittlung in die USA stützt sich auf den
        Angemessenheitsbeschluss der Europäischen Kommission zum EU-US Data Privacy Framework
        (Durchführungsbeschluss (EU) 2023/1795), an dem Cloudflare teilnimmt (Abschnitt 19).
        Rechtsgrundlage der Verarbeitung ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes
        Interesse ist die schnelle, weltweit verfügbare und gegen Überlastungsangriffe geschützte
        Auslieferung der Weboberfläche. Wir selbst speichern die bei Cloudflare anfallenden
        Verbindungsdaten nicht; zur Verarbeitung bei Cloudflare informiert dessen
        Datenschutzerklärung.
      </p>
      <h3>7.3 Datensicherungen</h3>
      <p>
        Datensicherungen dienen der Wiederherstellung nach einem Ausfall und enthalten Kopien der
        hier beschriebenen Daten. Der Sicherungsplan sieht stündliche verschlüsselte Sicherungen in
        Deutschland vor. Die konfigurierte Aufbewahrung umfasst 48 stündliche, 14 tägliche, 8
        wöchentliche und 12 monatliche Sicherungsstände. Diese Anzahlen sind keine feste Löschfrist
        ab der Kontolöschung. Die Löschung im laufenden System bedeutet deshalb nicht zugleich, dass
        sämtliche Sicherungskopien gelöscht sind. Bereits erfolgte Löschungen und Einschränkungen
        müssen bei einer Wiederherstellung berücksichtigt werden. Rechtsgrundlage ist Art. 6 Abs. 1
        lit. f DSGVO (Schutz vor Datenverlust).
      </p>
      <h3>7.4 Weitere Empfänger</h3>
      <p>
        Informationen zu den in den Abschnitten 11, 14, 15 und 16 beschriebenen Diensten findest du
        in den jeweiligen Abschnitten.
      </p>
    </section>

    <section id="serverlogs">
      <h2>8 Server-Logs und Fehlerberichte</h2>
      <h3>8.1 Server-Logs</h3>
      <p>
        Unsere Webserver für api.bootstrap.academy, api.test.bootstrap.academy und
        sandkasten.bootstrap.academy protokollieren jede Anfrage mit IP-Adresse, Zeitpunkt,
        aufgerufener Adresse (URL) und Methode, HTTP-Status, Browserkennung (User-Agent) und
        Referrer. Die Systemprotokolle der Dienste enthalten technische Meldungen, die im Einzelfall
        Nutzerkennungen oder aufgerufene Adressen enthalten können; schlägt die Auswertung einer
        Programmieraufgabe wegen eines Fehlers im Auswertungsskript der Aufgabe fehl, kann die
        Fehlermeldung auch Ausgaben dieses Skripts enthalten. Namen, E-Mail-Adressen, Anschriften,
        Passwörter, Token und die Inhalte deiner Eingaben schreiben die Dienste nicht in die
        Systemprotokolle; die IP-Adresse kann dort im Fehlerfall vermerkt werden, etwa wenn zu einer
        Kündigungs- oder Widerrufserklärung (Abschnitt 15.6) die Bestätigungs-E-Mail nicht
        zugestellt werden kann. In der Testumgebung (Abschnitt 4) laufen die Dienste mit
        ausführlicherer Protokollierung; dort enthalten die Systemprotokolle zu jeder Anfrage
        IP-Adresse, Anfragekennung und vollständige Anfrageadresse und können die E-Mail-Adressen
        von Empfängern unserer E-Mails enthalten. Zweck ist der sichere und stabile Betrieb:
        Erkennen und Abwehren von Angriffen, Begrenzen von Anfrageraten, Fehlersuche.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Die Protokolle werden nach 30 Tagen gelöscht
        und sind nicht Teil der Datensicherungen. Aus den Webserver-Protokollen erzeugen wir auf
        einem selbst betriebenen Monitoring-System aggregierte Kennzahlen (Anzahl der Anfragen,
        Antwortzeiten, Fehlerquoten); diese enthalten keine IP-Adressen und keinen Personenbezug.
        Beim Abruf der Vorschaubilder von static.bootstrap.academy (Abschnitt 7.1) protokolliert der
        Webserver dieses Webhosting-Pakets Zeitpunkt, aufgerufene Datei und Browserkennung; die
        IP-Adresse wird dort nach der Dokumentation des Hosters nur anonymisiert abgelegt. Wir
        werten diese Protokolle nicht aus; sie werden nach 30 Tagen automatisch gelöscht.
      </p>
      <h3>8.2 Fehlerberichte</h3>
      <p>
        Tritt in einem unserer Dienste ein Fehler auf, wird ein Fehlerbericht an unser selbst
        betriebenes Fehlerberichtssystem (GlitchTip) auf unserem Server bei Hetzner gesendet. Ein
        Bericht enthält die Fehlermeldung, den Programmablauf (Stacktrace), die aufgerufene Adresse,
        die Kennung der auslösenden Anfrage, je nach Fehler auch deren IP-Adresse, und – wenn der
        Fehler in einer angemeldeten Sitzung auftrat – deine Nutzerkennung; bei fehlgeschlagenen
        Zahlungen kann er die Fehlerantwort von PayPal enthalten. Fehler der Testumgebung gehen an
        dasselbe System. Das System ist nur aus unserem Administrationsnetz erreichbar; ein Dienst
        Dritter ist nicht beteiligt. Die Weboberfläche im Browser sendet keine Fehlerberichte.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Fehlerbehebung). Speicherdauer: 90 Tage;
        danach werden die Berichte automatisch gelöscht.
      </p>
    </section>

    <section id="cookies">
      <h2>9 Cookies und lokale Speichertechnologien</h2>
      <p>
        Wir verwenden ausschließlich eigene Cookies, Local-Storage- und Session-Storage-Einträge
        (First Party) und keine Cookies Dritter. Alle Einträge sind unbedingt erforderlich, um die
        von dir ausdrücklich gewünschten Funktionen bereitzustellen: Anmeldung, Sitzungsverwaltung,
        die Anmeldung über GitHub, Discord oder Google und von dir gewählte Einstellungen. Für sie
        ist nach § 25 Abs. 2 Nr. 2 TDDDG keine Einwilligung erforderlich; deshalb zeigen wir keinen
        Cookie-Hinweis an. Die Verarbeitung der darin enthaltenen Daten stützt sich auf Art. 6 Abs.
        1 lit. b DSGVO. Analyse-, Marketing- oder Tracking-Cookies setzen wir nicht.
      </p>
      <p>
        Welche Dienste Dritter beim Laden von Videos (Abschnitt 16) und beim Bezahlen (Abschnitt 15)
        Informationen in deinem Browser speichern, beschreiben wir dort.
      </p>
      <div class="legal-table-scroll" tabindex="0">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Art</th>
              <th>Zweck</th>
              <th>Speicherdauer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>accessToken</code></td>
              <td>Cookie</td>
              <td>Zugriffstoken für Anfragen an die API</td>
              <td>Sitzungsende; Token serverseitig 5 Minuten gültig, wird automatisch erneuert</td>
            </tr>
            <tr>
              <td><code>refreshToken</code></td>
              <td>Cookie</td>
              <td>Erneuerung des Zugriffstokens</td>
              <td>
                Sitzungsende; Token serverseitig 30 Tage ab der letzten Erneuerung gültig, bei
                Abmeldung ungültig
              </td>
            </tr>
            <tr>
              <td><code>session</code></td>
              <td>Cookie</td>
              <td>Kennung deiner aktuellen Sitzung</td>
              <td>Sitzungsende</td>
            </tr>
            <tr>
              <td><code>user</code></td>
              <td>Cookie</td>
              <td>Nutzerkennung, Nickname und Anzeigename für die Anzeige in der Oberfläche</td>
              <td>Sitzungsende</td>
            </tr>
            <tr>
              <td><code>locale</code></td>
              <td>Cookie</td>
              <td>
                deine Sprachauswahl; wird nur gespeichert, wenn du die Sprache umstellst (die
                Voreinstellung Deutsch wird nicht gespeichert)
              </td>
              <td>Sitzungsende</td>
            </tr>
            <tr>
              <td><code>hideAnimationNextTime</code></td>
              <td>Cookie</td>
              <td>Erfolgsanimation beim nächsten Mal nicht anzeigen</td>
              <td>Sitzungsende</td>
            </tr>
            <tr>
              <td><code>lastViewCourse</code></td>
              <td>Cookie</td>
              <td>Zuletzt geöffneter Kurs</td>
              <td>Sitzungsende</td>
            </tr>
            <tr>
              <td><code>currentVideo</code>, <code>currentVideoTime</code></td>
              <td>Cookie</td>
              <td>Wiedergabeposition, um ein Kursvideo fortzusetzen</td>
              <td>Sitzungsende</td>
            </tr>
            <tr>
              <td><code>zoomLevel</code></td>
              <td>Cookie</td>
              <td>Von dir gewählte Zoomstufe des Skill-Baums</td>
              <td>Sitzungsende</td>
            </tr>
            <tr>
              <td><code>rootTree_nextNode</code>, <code>subTree_nextNode</code></td>
              <td>Cookie</td>
              <td>Zuletzt von dir ausgewählte Position im Skill-Baum (Zeile und Spalte)</td>
              <td>Sitzungsende</td>
            </tr>
            <tr>
              <td><code>selectedButton</code></td>
              <td>Local Storage</td>
              <td>Gewählter Reiter im Kursplayer</td>
              <td>Bis du den Kursplayer verlässt</td>
            </tr>
            <tr>
              <td><code>selectedButtonLeaderBoard</code></td>
              <td>Local Storage</td>
              <td>Gewählter Reiter der Bestenliste</td>
              <td>Bis du die Bestenliste verlässt</td>
            </tr>
            <tr>
              <td><code>bootstrap-academy:update-notice:…</code></td>
              <td>Local Storage</td>
              <td>
                Merkt erst nach „Verstanden“, dass der Update-Hinweis für deine Nutzerkennung und
                die jeweilige Hinweisversion in diesem Browser geschlossen wurde. Dies ist keine
                Zustimmung zu Vertrags- oder Datenschutzhinweisen.
              </td>
              <td>
                Bis du die Browserdaten löschst; eine neue Hinweisversion kann erneut angezeigt
                werden
              </td>
            </tr>
            <tr>
              <td><code>oauth_flow</code></td>
              <td>Session Storage</td>
              <td>
                Einmalkennung (state), Anbieter und Zweck einer laufenden Anmeldung oder Verknüpfung
                über GitHub, Discord oder Google, damit die Rückkehr vom Anbieter derselben Anfrage
                zugeordnet werden kann (Abschnitt 11)
              </td>
              <td>Bis zur Rückkehr vom Anbieter, spätestens bis zum Schließen des Browser-Tabs</td>
            </tr>
            <tr>
              <td><code>oauth_register_token</code></td>
              <td>Session Storage</td>
              <td>
                Registrierungstoken nach einer ersten Anmeldung über GitHub, Discord oder Google,
                bis die Registrierung abgeschlossen ist (Abschnitt 11)
              </td>
              <td>
                Bis zum Abschluss der Registrierung, spätestens bis zum Schließen des Browser-Tabs
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Alle Cookies sind Sitzungscookies: Sie werden gelöscht, wenn du den Browser schließt. Sie
        werden mit den Attributen <code>Secure</code> und <code>SameSite=Lax</code> gesetzt, also
        nur über verschlüsselte Verbindungen und nicht bei Aufrufen aus fremden Websites übertragen.
        Der Zugriffstoken ist serverseitig fünf Minuten gültig und wird mit dem Erneuerungstoken
        automatisch verlängert; der Erneuerungstoken ist serverseitig 30 Tage ab der letzten
        Erneuerung gültig und wird beim Abmelden ungültig. Die Speicherdauer der
        Local-Storage-Einträge ist in der Tabelle angegeben; sie werden nicht an unsere Server
        übertragen. Die Session-Storage-Einträge gelten nur für den jeweiligen Browser-Tab; die
        Weboberfläche sendet ihre Werte einmal an unsere Programmierschnittstelle, um die Anmeldung
        oder Registrierung abzuschließen, und löscht sie nach deren Erfolg – bricht eine
        Registrierung ab, bleibt das Registrierungstoken bis zum Schließen des Tabs gespeichert.
        Cookies für bootstrap.academy sendet dein Browser bei jeder Anfrage an die Weboberfläche
        mit, also auch an Cloudflare (Abschnitt 7.2).
      </p>
      <p>
        Du kannst Cookies, Local Storage und Session Storage jederzeit über deinen Browser löschen
        oder blockieren. Ohne die Anmelde-Cookies kannst du dich nicht anmelden.
      </p>
      <p>
        Seit September 2026 nicht mehr verwendet werden das Cookie
        <code>agreedToCookiePolicy</code> (ehemaliger Cookie-Hinweis), das Cookie
        <code>job_filters</code> und das Cookie von Google reCAPTCHA.
      </p>
    </section>

    <section id="konto">
      <h2>10 Benutzerkonto, Anmeldung und Sitzungen</h2>
      <h3>10.1 Registrierung</h3>
      <p>
        Für die Nutzung der Lernplattform ist ein kostenloses Benutzerkonto erforderlich. Bei der
        Registrierung erheben wir vier Angaben:
      </p>
      <ul>
        <li>
          <strong>Nickname</strong> (Benutzername): eindeutige Kennung deines Kontos und
          Anmeldename. Über die Weboberfläche besteht er aus 3 bis 32 Buchstaben und Ziffern; er
          muss plattformweit eindeutig sein und kann höchstens alle 30 Tage geändert werden. Ein
          Pseudonym ist ausdrücklich zulässig; ein Klarname ist nicht erforderlich. Der Nickname ist
          für andere angemeldete Nutzer sichtbar (Abschnitte 12.2 und 14).
        </li>
        <li>
          <strong>Anzeigename</strong>: der Name, den andere angemeldete Nutzer sehen, etwa in der
          Bestenliste, bei Webinaren und Coachings. Auch hier ist ein Pseudonym zulässig. Der
          Anzeigename kann jederzeit geändert werden.
        </li>
        <li>
          <strong>E-Mail-Adresse</strong>: für die Verifizierung des Kontos, das Zurücksetzen des
          Passworts und Vertragsmitteilungen (Abschnitt 17). Andere Nutzer sehen deine
          E-Mail-Adresse nicht.
        </li>
        <li>
          <strong>Passwort</strong>: wird ausschließlich als Hash gespeichert. Bei der Registrierung
          über GitHub, Discord oder Google entfällt das Passwort (Abschnitt 11).
        </li>
      </ul>
      <p>
        Zusätzlich bestätigst du bei der Registrierung, dass du mindestens 16 Jahre alt bist
        (Abschnitt 22), und stimmst den Allgemeinen Geschäftsbedingungen zu. Wir speichern die
        Altersbestätigung sowie die Version der AGB und den Zeitpunkt deiner Zustimmung; die Version
        gibt dabei unser Server vor. Legen wir dir nach einer Änderung der AGB bei der Anmeldung
        eine neue Fassung vor und verschiebst du die Entscheidung („Später entscheiden“), speichern
        wir den Zeitpunkt dieses Aufschubs; die bisher akzeptierte Fassung bleibt vermerkt. Nimmst
        du die neue Fassung später an, wird der Vermerk über den Aufschub gelöscht. Zur
        Verifizierung der E-Mail-Adresse senden wir dir einen Bestätigungscode; der Code wird
        höchstens vier Stunden zwischengespeichert und nach der Bestätigung gelöscht. Dasselbe gilt
        für den Code zum Zurücksetzen des Passworts.
      </p>
      <h3>10.2 Freiwillige Profilangaben</h3>
      <p>
        Im Profil kannst du freiwillig eine Kurzbeschreibung (über die Weboberfläche bis 250
        Zeichen) und bis zu sechs Schlagwörter (Tags) hinterlegen. Diese Angaben sehen nur du selbst
        und Administratoren. Als Profilbild wird ein Standard-Avatar angezeigt; ein eigenes Bild
        kann nicht hochgeladen werden, und ein externer Avatar-Dienst wird nicht verwendet.
      </p>
      <h3>10.3 Weitere Kontodaten</h3>
      <p>
        Zu deinem Konto speichern wir außerdem: den Verifizierungsstatus der E-Mail-Adresse, den
        Zeitpunkt der Registrierung und der letzten Anmeldung, deine Rolle (Nutzer oder
        Administrator), deine Sitzungen (Abschnitt 10.4), bei aktivierter
        Zwei-Faktor-Authentifizierung das TOTP-Geheimnis und Wiederherstellungscodes, Verknüpfungen
        mit GitHub, Discord oder Google (Abschnitt 11), dein MorphCoins-Guthaben mit allen
        Transaktionen, deine Herzen, deinen Premium-Status mit dem Kennzeichen für die automatische
        Verlängerung, PayPal-Bestellreferenzen, deine Einstellung, ob du in den Bestenlisten
        angezeigt wirst (Abschnitt 12.2), und – erst wenn du eine kostenpflichtige Leistung erwirbst
        – deine Rechnungsdaten, deine Kundennummer sowie deine Erklärungen zum Widerrufsrecht
        (Abschnitt 15).
      </p>
      <h3>10.4 Sitzungen und Zwei-Faktor-Authentifizierung</h3>
      <p>
        Bei der Anmeldung erzeugen wir eine Sitzung mit einem Zugriffstoken (fünf Minuten gültig)
        und einem Erneuerungstoken (30 Tage ab der letzten Erneuerung gültig; eine Sitzung läuft
        also 30 Tage nach der letzten Nutzung ab). Zu jeder Sitzung speichern wir ihre Kennung, eine
        aus der Browserkennung abgeleitete Gerätebezeichnung, den Zeitpunkt der Erstellung und der
        letzten Erneuerung sowie das Kennzeichen, ob die Sitzung mit einem zweiten Faktor bestätigt
        wurde. Beim Abmelden wird die Sitzung ungültig; abgelaufene Sitzungen löschen wir
        automatisch. Optional kannst du eine Zwei-Faktor-Authentifizierung (TOTP) einrichten; dafür
        speichern wir das TOTP-Geheimnis und Wiederherstellungscodes.
      </p>
      <p>
        Um das Erraten von Passwörtern zu erschweren, zählen wir fehlgeschlagene Anmeldeversuche je
        Konto und je IP-Adresse in einem Zwischenspeicher. Nach fünf Fehlversuchen für ein Konto
        sperren wir die Anmeldung für dieses Konto zunächst für eine Minute; jeder weitere
        Fehlversuch verdoppelt die Sperre (zwei, vier, acht Minuten) bis auf höchstens 15 Minuten.
        Nutzername und E-Mail-Adresse desselben Kontos teilen sich dabei einen Zähler. Nach 30
        Fehlversuchen von derselben IP-Adresse innerhalb von 15 Minuten lehnen wir weitere
        Anmeldeversuche von dieser Adresse für den Rest dieses Zeitraums ab; erfolgreiche
        Anmeldungen werden dabei nicht mitgezählt. Solange eine Sperre besteht, lehnen wir weitere
        Versuche mit einer Fehlermeldung ab, in der die Wartezeit genannt wird. Gespeichert wird nur
        ein Hashwert des Anmeldenamens bzw. der IP-Adresse mit dem Zähler. Der Zähler je Konto wird
        15 Minuten nach dem letzten Fehlversuch oder bei der nächsten erfolgreichen Anmeldung
        gelöscht; der Zähler je IP-Adresse wird 15 Minuten nach dem letzten gezählten Fehlversuch
        gelöscht und durch eine erfolgreiche Anmeldung nicht zurückgesetzt. Rechtsgrundlage für die
        Zähler ist Art. 6 Abs. 1 lit. f DSGVO (Sicherheit des Kontos).
      </p>
      <h3>10.5 Zugriff durch Administratoren und Verwaltungsprotokoll</h3>
      <p>
        Administratoren können über das Verwaltungs-Dashboard und die Programmierschnittstelle auf
        Konto- und Lerndaten zugreifen, soweit dies für Support, Abrechnung und Moderation nötig
        ist; auf deine Anfrage können sie auch den Datenexport deines Kontos erstellen (Abschnitt
        23) oder dein Konto löschen (Abschnitt 10.7). Den Quellcode deiner Einreichungen geben die
        Schnittstellen der Plattform nicht einzeln an Administratoren heraus; sie erhalten ihn nur
        als Teil des vollständigen Datenexports deines Kontos oder wenn sie sich zur Fehlersuche im
        Einzelfall in deinem Konto anmelden (Abschnitt 13.1). Administrative Zugriffe setzen eine
        Anmeldung mit Zwei-Faktor-Authentifizierung voraus.
      </p>
      <p>
        Jede verändernde Anfrage eines Administrators (Anlegen, Ändern, Löschen, Anmelden in einem
        anderen Konto) sowie der Abruf eines Datenexports, der Abruf der Nutzerliste, der Abruf der
        Liste der Rechnungsdokumente (Abschnitt 15.4) und der Abruf der Liste der Kündigungs- und
        Widerrufserklärungen (Abschnitt 15.6) werden in einem Verwaltungsprotokoll festgehalten –
        auch dann, wenn die Anfrage abgelehnt wurde. Ein Eintrag enthält Zeitpunkt, Kennung des
        handelnden Administrators, HTTP-Methode und Pfad der Anfrage (ohne Abfrageparameter;
        Kennungen im Pfad bleiben enthalten), Kennung des betroffenen Kontos, Antwortstatus und
        Anfragekennung; Inhalte der Anfrage werden nicht gespeichert. Direkte Zugriffe der Betreiber
        auf Server und Datenbank werden dort nicht erfasst. Zweck ist es, Zugriffe von
        Administratoren auf deine Daten nachvollziehen zu können; Rechtsgrundlage ist Art. 6 Abs. 1
        lit. f DSGVO (Sicherheit der Verarbeitung, Art. 32 DSGVO). Die Einträge werden nach zwölf
        Monaten automatisch gelöscht. Sie bleiben auch bestehen, wenn das handelnde oder das
        betroffene Konto gelöscht wird. Eine frühere Nutzerkennung ist nicht allein durch die
        Kontolöschung anonym. Ob sie weiterhin einer Person zugeordnet werden kann, hängt von den
        tatsächlich verbleibenden Informationen ab. Das Verwaltungsprotokoll können nur
        Administratoren einsehen.
      </p>
      <h3>10.6 Rechtsgrundlage und Speicherdauer</h3>
      <p>
        Rechtsgrundlage für das Benutzerkonto ist Art. 6 Abs. 1 lit. b DSGVO. Kontodaten speichern
        wir, bis du dein Konto löschst. Sitzungen werden mit Ablauf des Erneuerungstokens gelöscht.
      </p>
      <h3>10.7 Kontolöschung</h3>
      <p>
        Wenn du dein Konto löschst, entfernen wir die nicht mehr benötigten Daten aus deinem Konto
        und den beteiligten Diensten. Notwendige Unterlagen zu Verträgen, Abrechnungen,
        Rechtsansprüchen und Moderationsfällen bewahren wir getrennt auf. Diese Unterlagen können
        dir auch nach der Kontolöschung weiterhin zugeordnet werden.
      </p>
      <ul>
        <li>
          Rechnungen und Gutschriften bewahren wir wegen gesetzlicher Aufbewahrungspflichten weiter
          auf (Abschnitt 15.4). In unserem Datensatz ersetzen wir dabei deine Kundenangaben durch
          den Vermerk „Gelöschtes Konto“ und entfernen die Zuordnung zum Konto; Fassung und
          Zeitpunkt deiner Erklärungen zum Widerrufsrecht, die wir in den Datensatz einer Rechnung
          übernommen haben, bleiben darin erhalten (Abschnitt 15.5). Die PDF-Dateien behalten die
          Angaben, mit denen sie ausgestellt wurden.
        </li>
        <li>
          Hast du MorphCoins gekauft und ist davon bei der Löschung ein Anteil nicht verbraucht,
          erstellen wir eine Schlussabrechnung, die deinen Namen, deine Anschrift, deine
          E-Mail-Adresse und gegebenenfalls deine USt-IdNr. enthält (Abschnitt 15.4).
        </li>
        <li>
          Kündigungs- und Widerrufserklärungen (Abschnitt 15.6) bleiben als Nachweis bis zum Ablauf
          der Verjährungsfrist bestehen; die Zuordnung zum Konto wird entfernt.
        </li>
        <li>
          Einträge im Verwaltungsprotokoll (Abschnitt 10.5) bleiben bis zu zwölf Monate bestehen.
        </li>
        <li>
          Hast du Aufgaben erstellt, die Teilaufgaben anderer Nutzer enthalten, bleibt die Aufgabe
          für diese Nutzer erhalten; ihr Datensatz enthält dann weiterhin deine frühere
          Nutzerkennung. Ob diese Kennung weiterhin einer Person zugeordnet werden kann, hängt von
          den tatsächlich verbleibenden Informationen ab. Mit deinen Teilaufgaben werden auch die
          Versuche, Einreichungen und Bewertungen anderer Nutzer zu diesen Teilaufgaben gelöscht.
          Erforderliche Moderationsunterlagen und die dokumentierte Entscheidungshistorie bleiben
          nach Abschnitt 13.4 gesondert erhalten. Eine frühere Nutzerkennung ist nicht allein durch
          die Kontolöschung anonym.
        </li>
        <li>
          Die Kontolöschung allein ist keine Stornierungs- oder Widerrufserklärung für einzelne
          bezahlte Leistungen. Bestehende Leistungs- und Erstattungsansprüche bleiben davon
          getrennt; für Events gilt Ziffer 10.5 der AGB.
        </li>
        <li>
          Die Löschung im laufenden System bedeutet nicht zugleich, dass sämtliche Sicherungskopien
          gelöscht sind (Abschnitt 7.3).
        </li>
      </ul>
      <p>
        Nicht verbrauchte gekaufte MorphCoins erstatten wir auf Anfrage; stelle die Anfrage
        möglichst, bevor du dein Konto löschst (Abschnitt 15.1). Nach der Löschung erstatten wir auf
        Grundlage der Schlussabrechnung (Abschnitt 15.4). Verlangst du die Löschung stattdessen per
        E-Mail, setzen wir sie innerhalb von 30 Tagen um; ein Administrator löscht das Konto dann
        auf demselben Weg, und der Vorgang wird im Verwaltungsprotokoll festgehalten.
      </p>
    </section>

    <section id="oauth">
      <h2>11 Anmeldung über GitHub, Discord oder Google</h2>
      <p>
        Statt eines Passworts kannst du dich mit einem bestehenden Konto bei GitHub, Discord oder
        Google anmelden oder registrieren. Wenn du einen Anbieter auswählst, erzeugt unser Server
        eine zufällige Einmalkennung (state) und merkt sich dazu für höchstens zehn Minuten den
        Anbieter, die Rückkehradresse, einen zufälligen Prüfwert (PKCE) und – wenn du bereits
        angemeldet bist und eine Verknüpfung hinzufügst – deine Nutzerkennung. Dann wirst du zur
        Anmeldeseite des Anbieters weitergeleitet; der Anbieter erfährt dadurch, dass du dich bei
        Bootstrap Academy anmeldest, und verarbeitet deine Verbindungsdaten in eigener
        Verantwortung. Nach der Anmeldung leitet der Anbieter dich mit einem Einmalcode und der
        Einmalkennung zu uns zurück; die Kennung kann nur einmal eingelöst werden und wird dabei
        gelöscht. Mit dem Code rufen wir einmalig die folgenden Daten ab:
      </p>
      <div class="legal-table-scroll" tabindex="0">
        <table>
          <thead>
            <tr>
              <th>Anbieter</th>
              <th>Angefragte Berechtigung (Scope)</th>
              <th>Abgerufene Daten</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>GitHub, Inc., San Francisco, USA</td>
              <td>keine</td>
              <td>Nutzerkennung, Anmeldename</td>
            </tr>
            <tr>
              <td>
                Discord Netherlands B.V., Schiphol, Niederlande (für Nutzer im EWR) / Discord Inc.,
                San Francisco, USA
              </td>
              <td><code>identify</code></td>
              <td>Nutzerkennung, Nutzername</td>
            </tr>
            <tr>
              <td>
                Google Ireland Limited, Dublin, Irland (für Nutzer im EWR) / Google LLC, Mountain
                View, USA
              </td>
              <td><code>openid profile</code></td>
              <td>Google-Kennung, Vorname</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Wir speichern zur Verknüpfung: den Anbieter, deine Nutzerkennung und deinen Nutzernamen beim
        Anbieter sowie den Zeitpunkt der Verknüpfung. Wir speichern keine Zugriffs- oder
        Erneuerungstoken des Anbieters, keine E-Mail-Adresse, keine Kontakte und keine Repository-
        oder Organisationsdaten, und wir fragen solche Daten auch nicht an; das Zugriffstoken, das
        wir vom Anbieter für den Abruf erhalten, verwenden wir nur für diesen einen Abruf und
        schreiben es nicht in Protokolle. Die Verknüpfung nutzen wir ausschließlich zur Anmeldung.
        Bei einer Erstregistrierung über einen Anbieter halten wir Anbieter, Nutzerkennung und
        Nutzernamen bis zu zehn Minuten in einem Zwischenspeicher vor, bis du die Registrierung
        abgeschlossen hast; das zugehörige Registrierungstoken bewahrt dein Browser so lange im
        Session Storage auf (Abschnitt 9), und es kann nur einmal verwendet werden.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (die von dir gewählte Anmeldemethode).
        GitHub, Inc., Google LLC und Discord Inc. nehmen am EU-US Data Privacy Framework teil
        (Abschnitt 19). Speicherdauer: bis du die Verknüpfung aufhebst oder dein Konto löschst.
      </p>
      <p>
        Verwalten der Verknüpfungen: In den Kontoeinstellungen siehst du unter „Verknüpfte Logins“,
        welche Anbieterkonten dein Konto anmelden können, und kannst eine Verknüpfung dort entfernen
        oder eine weitere hinzufügen. Die letzte verbleibende Anmeldemethode lässt sich nicht
        entfernen; lege vorher ein Passwort fest oder verknüpfe ein weiteres Konto. Das Entfernen
        löscht die Verknüpfung bei uns. Die dem Anbieter erteilte Berechtigung hebst du zusätzlich
        in den Kontoeinstellungen von GitHub, Discord bzw. Google auf; das Zugriffstoken für den
        einmaligen Abruf speichern wir nicht und können die Berechtigung deshalb nicht für dich
        widerrufen. Die Kontoeinstellungen verlinken die jeweilige Seite des Anbieters.
      </p>
    </section>

    <section id="lernen">
      <h2>12 Lernplattform, Lernfortschritt und Bestenliste</h2>
      <h3>12.1 Lern- und Fortschrittsdaten</h3>
      <p>
        Im Dienst Skills speichern wir zu deinem Konto: welche Kurse du freigeschaltet oder mit
        MorphCoins gekauft hast, welche Lektionen du abgeschlossen hast (Lektion, Zeitpunkt), den
        zuletzt angesehenen Kurs, gesetzte Lesezeichen und deine Erfahrungspunkte (XP) je Skill, aus
        denen sich dein Skill-Level ergibt. Im Dienst Challenges speichern wir zu Quizfragen,
        Zuordnungsaufgaben und Programmieraufgaben, ob und wann du sie gelöst hast, die Anzahl
        deiner Versuche und deine Bewertung der Aufgabe (positiv, neutral, negativ). Die von dir
        gewählten Antworten auf Quizfragen speichern wir nicht. Die Wiedergabeposition in Kursvideos
        wird nur in deinem Browser gespeichert (Abschnitt 9), nicht auf unseren Servern. Für die
        Bestätigungs-E-Mail zu einem Kurskauf ruft der Dienst Skills deine E-Mail-Adresse aus dem
        Kerndienst ab und hält sie höchstens fünf Minuten im Zwischenspeicher.
      </p>
      <p>
        Zweck ist die Bereitstellung der Kurse und Aufgaben, die Anzeige deines Fortschritts und die
        Vergabe von XP. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Wir speichern diese Daten,
        bis du dein Konto löschst. Eine Auswertung für Empfehlungen, Profilbildung oder
        Produktentwicklung findet nicht statt (Abschnitt 18).
      </p>
      <h3>12.2 Bestenliste</h3>
      <p>
        Die Bestenliste zeigt angemeldeten Nutzern mit verifizierter E-Mail-Adresse eine Rangliste
        nach Gesamt-XP. Zu jedem Eintrag werden Anzeigename, Standard-Avatar, Gesamt-XP und Rang
        angezeigt; die technische Antwort enthält außerdem Nickname, Registrierungsdatum und die
        Kennzeichnung als Administrator. Es gibt Ranglisten insgesamt, je Programmiersprache und je
        Aufgabe. Für nicht angemeldete Besucher ist die Bestenliste nicht abrufbar. Deine XP je
        Skill siehst nur du selbst.
      </p>
      <p>
        Ob du in den Bestenlisten erscheinst, entscheidest du selbst: In den Profileinstellungen
        („Profil bearbeiten“, Abschnitt „Sichtbarkeit“) kannst du den Haken „In den Bestenlisten
        anzeigen“ entfernen. Du wirst dann in keiner Bestenliste mehr aufgeführt, und andere Nutzer
        können deinen Rang nicht mehr abrufen; deine XP werden weiterhin gezählt, und deinen eigenen
        Rang siehst du weiterhin. Administratoren können deinen Rang für Supportzwecke weiterhin
        abrufen. Neue Konten werden angezeigt, solange der Haken gesetzt ist. Die Änderung wirkt
        spätestens nach zehn Minuten, weil der Dienst Challenges die Angaben zu Nutzern und die
        Seiten der Bestenliste kurze Zeit zwischenspeichert.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist eine
        motivierende, gemeinschaftliche Lernumgebung. Das Entfernen des Hakens ist dein Widerspruch
        gegen diese Verarbeitung (Abschnitt 23); Gründe musst du dafür nicht angeben. Du kannst den
        Widerspruch auch per E-Mail an
        <a href="mailto:hallo@bootstrap.academy" class="underline-link">hallo@bootstrap.academy</a>
        erklären; wir setzen die Einstellung dann für dich.
      </p>
      <h3>12.3 Jobs-Bereich</h3>
      <p>
        Der Bereich „Jobs“ mit Stellenanzeigen wird in der Weboberfläche derzeit nicht angeboten;
        die Programmierschnittstelle des Dienstes Jobs ist erreichbar, speichert aber keine Daten zu
        Nutzern. Wird der Bereich angeboten, prüft der Dienst Jobs anhand deiner Skill-Level, ob dir
        die Kontaktdaten einer Stelle angezeigt werden; die Skill-Level ruft er dafür aus dem Dienst
        Skills ab und hält sie höchstens fünf Minuten im Zwischenspeicher. Diese Prüfung findet nur
        innerhalb der Plattform statt; ausschreibende Unternehmen erhalten keine Daten über dich –
        weder Profil-, Lern- noch Skill-Daten. Bewerbungen werden nicht über die Plattform
        abgewickelt.
      </p>
    </section>

    <section id="challenges">
      <h2>13 Challenges, Code-Ausführung und Moderation</h2>
      <h3>13.1 Einreichungen zu Programmieraufgaben</h3>
      <p>
        Wenn du eine Lösung zu einer Programmieraufgabe einreichst, speichern wir im Dienst
        Challenges die Einreichung (Quellcode, Programmiersprache, Zeitpunkt) und das Ergebnis der
        Auswertung (Verdikt, Begründung, Status von Kompilierung und Ausführung, Fehlerausgaben von
        Compiler und Laufzeit, Laufzeit und Speicherverbrauch). Die Standardausgabe deines Programms
        wird nicht dauerhaft gespeichert. Probeläufe an Beispielen werden ausgeführt, aber nicht
        gespeichert. Das Ergebnis einer Auswertung – einschließlich der Ausgaben deines Programms –
        hält der Dienst bis zu zehn Minuten in einem Zwischenspeicher im Arbeitsspeicher vor, dessen
        Schlüssel aus dem Quelltext gebildet wird, damit dieselbe Einreichung nicht mehrfach
        ausgeführt werden muss; diese Einträge verfallen von selbst.
      </p>
      <p>
        Nur du selbst kannst deine Einreichungen über die Plattform abrufen; die Schnittstelle gibt
        Einreichungen anderer Personen nicht an Aufgabenersteller heraus und auch nicht einzeln an
        Administratoren. Administratoren erhalten sie nur als Teil des vollständigen Datenexports
        deines Kontos (Abschnitt 23) oder wenn sie sich zur Fehlersuche im Einzelfall in deinem
        Konto anmelden; beides setzt Zwei-Faktor-Authentifizierung voraus und wird im
        Verwaltungsprotokoll festgehalten (Abschnitt 10.5). Zugriff auf die Datenbank haben nur die
        für den Betrieb zuständigen Administratoren. Eingereichter Code wird ausschließlich zur
        Auswertung der Aufgabe verwendet – nicht zur Produktverbesserung, für Analysen, als
        Trainingsdaten für KI-Modelle oder als Beispielmaterial – und nicht an Dritte weitergegeben.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Speicherdauer: bis du dein Konto löschst.
      </p>
      <h3>13.2 Code-Ausführung im Sandkasten</h3>
      <p>
        Zur Auswertung senden wir an unseren Code-Ausführungsdienst (sandkasten.bootstrap.academy,
        betrieben auf einem eigenen Server bei Hetzner in Deutschland) ausschließlich: den Namen der
        Programmierumgebung, den Quelltext, die generierten Testeingaben und die Ressourcengrenzen.
        Nutzerkennung, Sitzungsdaten, E-Mail-Adresse oder IP-Adresse werden nicht übermittelt; die
        Schnittstelle des Dienstes sieht solche Felder nicht vor. Der Dienst hält Programm und
        Arbeitsverzeichnis nur im Arbeitsspeicher, löscht das Arbeitsverzeichnis nach jedem Lauf und
        das Programm spätestens fünf Minuten nach der letzten Ausführung. Er protokolliert weder
        Quelltext noch Ausgaben; seine Kennzahlen sind Zähler je Programmiersprache.
      </p>
      <h3>13.3 Eigene Aufgaben, Bewertungen und Meldungen</h3>
      <p>
        Wenn du Aufgaben oder Quizfragen erstellst, speichern wir deren Inhalt, deine Nutzerkennung,
        den Erstellungszeitpunkt und den jeweiligen Status. Andere Nutzer können diese Inhalte
        bewerten und melden. Zu einer Meldung verarbeiten wir den betroffenen Inhalt, Zeitpunkt,
        Meldegrund, freiwillige Erläuterungen und die Nutzerkennung oder übermittelten
        Kontaktangaben der meldenden Person.
      </p>
      <p>
        Meldungen und private Belege sind von den Mitteilungen an betroffene Personen getrennt.
        Freitext einer Meldung wird nicht automatisch als Begründung an die betroffene Person
        weitergegeben. Für Entscheidungen erstellen wir gesonderte, verständliche Mitteilungen.
        Meldende Personen erhalten eine eigene Eingangsbestätigung und Ergebnismitteilung in der
        App. Gewöhnliche Eingänge und Statusmeldungen versenden wir nicht per E-Mail.
      </p>
      <p>
        Rechtsgrundlage für das Erstellen und Bewerten ist Art. 6 Abs. 1 lit. b DSGVO. Meldungen
        bearbeiten wir zur Erfüllung einschlägiger gesetzlicher Pflichten nach Art. 6 Abs. 1 lit. c
        DSGVO, insbesondere aus Art. 16 und 17 DSA; soweit keine solche Pflicht besteht, auf
        Grundlage von Art. 6 Abs. 1 lit. f DSGVO zum Schutz der Plattform und ihrer Nutzer.
      </p>
      <p>
        Für Aufgaben und Lerndaten gelten die beschriebenen Löschwege. Mit einer gelöschten
        Teilaufgabe werden auch die dazugehörigen Versuche, Einreichungen und Bewertungen gelöscht.
        Für erforderliche Unterlagen eines Moderationsfalls gelten gesondert Abschnitt 13.4 und die
        Aufbewahrungsübersicht.
      </p>
      <h3>13.4 Moderation, Beschwerden und beschränkter Zugang</h3>
      <p>
        Im jeweils zuständigen Dienst speichern wir den Anlass eines Falls, erforderliche Belege zur
        geprüften Inhaltsfassung, die anwendbare Regel und ihren Geltungsnachweis, Entscheidungen,
        verantwortliche Personen, Maßnahmen und deren Dauer sowie Beschwerden und Ergebnisse ihrer
        menschlichen Prüfung. Die Regeln und Voraussetzungen automatischer vorläufiger Ausblendungen
        sowie die menschliche Prüfung von Sperren und ihrer Dauer beschreibt AGB Ziffer 14.4.
        Automatische Auslöser und ihre tatsächlichen Auswirkungen werden dokumentiert; eine spätere
        menschliche Entscheidung entfernt diese Angaben nicht.
      </p>
      <p>
        Wir speichern die Mitteilungen für die jeweiligen Empfänger und halten getrennt fest, wann
        sie in der App bereitgestellt wurden und ob es Versandversuche, technische
        Versandbestätigungen oder Fehler gab. Dazu gehören auch noch aufbewahrte historische
        Moderationsmitteilungen. E-Mails sind bei Moderationsfällen nur für wichtige tatsächliche
        Auswirkungen auf Inhalte, Funktionen oder den Kontozugang vorgesehen sowie für einen
        ausdrücklich angeforderten Zugangslink. Gewöhnliche Meldungs- und Beschwerdeeingänge, reine
        Statusmeldungen und historische Vorgänge bleiben in der App. Das Übernehmen alter
        Moderationsfälle oder eine technische Umstellung löst keine E-Mail aus. Wird eine
        Entscheidung im Moderationsbereich tatsächlich geöffnet und angezeigt, erfassen wir diesen
        Zeitpunkt gesondert. Eine technische Versandbestätigung belegt für sich allein weder den
        tatsächlichen Zugang noch das Lesen einer Nachricht.
      </p>
      <p>
        Für den gesonderten Zugang zu Moderationsfällen prüfen wir vorhandene Zugangsnachweise
        beziehungsweise die Berechtigung zum konkreten Fall. Dabei verarbeiten wir die
        erforderlichen Konto- oder Fallkennungen, Kontaktangaben und Angaben zu Umfang, Gültigkeit
        und Widerruf der Zugangsberechtigung. Der dafür ausgegebene Zugangsschlüssel wird im
        Sitzungsspeicher des verwendeten Browsertabs gehalten und begründet keine gewöhnliche
        Kontositzung. Ein Fallzugang eröffnet keinen allgemeinen Zugriff auf Konto-, Kauf- oder
        Abrechnungsdaten. Meldungen und Beschwerden bleiben mit Text, Kennung und Bestätigungsstand
        in diesem Browsertab für einen identischen erneuten Versuch und den Eingangsbeleg
        gespeichert. Meldungen werden nur bei derselben Kontoidentität, Beschwerden nur unter
        derselben nachgewiesenen Empfängerberechtigung angezeigt.
      </p>
      <p>
        Rechtsgrundlagen sind die Durchführung des Nutzungsvertrags und des zugesagten
        Beschwerdeverfahrens nach Art. 6 Abs. 1 lit. b DSGVO, die Erfüllung einschlägiger
        gesetzlicher Pflichten nach Art. 6 Abs. 1 lit. c DSGVO sowie erforderliche Nachweis-,
        Missbrauchsschutz- und Rechtsverteidigungszwecke nach Art. 6 Abs. 1 lit. f DSGVO. Zugang zu
        privaten Fallunterlagen erhalten nur Personen, die ihn für die jeweilige Aufgabe benötigen.
        Betroffene und meldende Personen erhalten die für sie bestimmten Informationen.
      </p>
      <p>
        Erforderliche Fallunterlagen, Beschwerden, Mitteilungen und Versandnachweise löschen wir
        grundsätzlich zwölf Monate nach Abschluss des Falls. Abschluss setzt das Ende der Maßnahme
        und den Ablauf der Beschwerdefrist beziehungsweise die Entscheidung über eine noch offene
        Beschwerde voraus; maßgeblich ist der spätere Zeitpunkt. Bei einer unbefristeten Maßnahme
        gilt hierfür deren Aufhebung oder die Kontolöschung als Ende der Maßnahme. Eine
        Kontolöschung beendet eine noch laufende Beschwerdemöglichkeit nicht. Noch erforderliche
        behördliche oder vertragliche Bearbeitung bleibt gesondert nachvollziehbar.
      </p>
      <p>
        Private Belege und Kontaktangaben prüfen wir gesondert auf ihre weitere Erforderlichkeit und
        löschen oder reduzieren sie früher, sobald sie nicht mehr benötigt werden. Eine
        fortbestehende Maßnahme rechtfertigt nicht pauschal die unbegrenzte Speicherung sämtlicher
        Unterlagen. Eine längere Aufbewahrung erfolgt nur im erforderlichen Umfang wegen konkret
        einschlägiger gesetzlicher Pflichten oder zur Geltendmachung, Ausübung oder Verteidigung
        konkreter Rechtsansprüche; Grund, Umfang und weitere Prüfung werden dokumentiert. Die
        Zwölfmonatsfrist ist keine allgemeine gesetzliche Aufbewahrungsfrist.
      </p>
      <p>
        Nach der Falllöschung bewahren wir eine reduzierte technische Löschbestätigung auf. Sie
        enthält die Fall- und Bearbeitungskennung, Zeitpunkt und Prüfsumme des Löschauftrags sowie
        die Bestätigung der Löschung in verbundenen Diensten. Sie enthält weder die ursprüngliche
        Begründung noch Kontaktadresse oder Fallinhalt und verhindert, dass ein später erneut
        ausgeführter alter Auftrag gelöschte Daten wieder anlegt. Auch diese Bestätigung wird
        gesondert auf ihre Erforderlichkeit geprüft.
      </p>
    </section>

    <section id="events">
      <h2>14 Events, Webinare und Coaching</h2>
      <h3>14.1 Teilnahme und Buchung</h3>
      <p>
        Im Dienst Events speichern wir deine Anmeldungen zu Webinaren, gebuchte Coaching-Termine
        sowie – wenn du als Kursleiter tätig bist – deine angebotenen Webinare, Coachings und
        Terminfenster. Zu deinem Konto sind dort deine Nutzerkennung und die Termindaten
        gespeichert; Anzeigename und Nickname sowie – für den Versand von E-Mails – deine
        E-Mail-Adresse ruft der Dienst bei Bedarf aus dem Kerndienst ab und hält sie höchstens fünf
        Minuten im Zwischenspeicher. Bei Coachings sehen Kursleiter und buchende Person gegenseitig
        Anzeigename und Nickname; bei Webinaren sehen Teilnehmer Anzeigename und Nickname des
        Kursleiters, andere Teilnehmer werden ihnen nicht angezeigt, nur ihre Anzahl; der Kursleiter
        und Administratoren können die Nutzerkennungen der Teilnehmer abrufen. Die durchschnittliche
        Bewertung eines Kursleiters je Skill sehen alle angemeldeten Nutzer. Nach einem Webinar
        kannst du den Kursleiter mit einer Note von 1 bis 5 bewerten; bis du bewertet hast,
        speichern wir dafür eine Bewertungsanfrage mit deiner Nutzerkennung und dem Namen des
        Webinars, und sobald du bewertet hast, entfernen wir den Bezug zwischen der Bewertung und
        deiner Person. Bewertungen, die du als Kursleiter erhältst, stammen von Teilnehmern; eine
        Bewertung, die mehr als zwei Jahre älter ist als deine jüngste Bewertung im selben Skill,
        löschen wir beim nächsten Abruf deiner Bewertung. Kostenpflichtige Anmeldungen und Buchungen
        werden mit MorphCoins bezahlt (Abschnitt 15); zur Buchung erhältst du eine
        Bestätigungs-E-Mail. Wird ein Webinar oder Coaching abgesagt oder eine Anmeldung storniert,
        informieren wir alle Beteiligten – Teilnehmer und Kursleiter – per E-Mail über den Termin
        und den erstatteten Betrag; die E-Mail an die buchende Person eines Coachings nennt den
        Anzeigenamen des Kursleiters. Absagen und Stornierungen infolge einer Kontolöschung
        (Abschnitt 10.7) werden nicht per E-Mail mitgeteilt. Prüfungstermine sind in der Software
        vorgesehen, werden derzeit aber nicht angeboten.
      </p>
      <p>
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Vergangene Termine werden kurz nach ihrem
        Ende (innerhalb weniger Minuten) automatisch gelöscht; die übrigen Daten speichern wir bis
        zur Kontolöschung. Löschst du dein Konto, werden Termine, die du als Kursleiter anbietest,
        abgesagt und den Teilnehmern erstattet (Abschnitt 10.7).
      </p>
      <h3>14.2 Videokonferenzen (Jitsi Meet)</h3>
      <p>
        Für gebuchte Coaching-Termine erzeugen wir Konferenzräume auf der öffentlichen
        Jitsi-Meet-Instanz meet.jit.si, betrieben von 8x8, Inc., Campbell, Kalifornien, USA. Der
        Raumname ist eine zufällige Zeichenfolge. Wenn du einem Raum beitrittst, übermittelt dein
        Browser IP-Adresse, Browserdaten sowie deine Audio- und Videodaten an 8x8; 8x8 verarbeitet
        diese in eigener Verantwortung nach seinen Datenschutzhinweisen. Wir speichern keine Inhalte
        der Gespräche. Rechtsgrundlage für die Bereitstellung des Raums ist Art. 6 Abs. 1 lit. b
        DSGVO (Durchführung des gebuchten Termins). 8x8, Inc. nimmt am EU-US Data Privacy Framework
        teil (Abschnitt 19). Für Webinare hinterlegen Kursleiter den Konferenzlink selbst; welcher
        Anbieter dort verwendet wird, erkennst du an der Adresse des Links.
      </p>
      <h3>14.3 Kalender-Abo (iCal)</h3>
      <p>
        Du kannst deine Termine als Kalender-Abo (iCal) in eine Kalender-App übernehmen. Wenn du die
        Kalenderseite zum ersten Mal öffnest, erzeugen wir dafür eine zufällige Abo-Kennung und
        speichern sie mit dem Zeitpunkt ihrer Erzeugung zu deinem Konto im Dienst Events. Die
        Abo-Adresse enthält diese Kennung; wer die Adresse kennt, kann deine Termine abrufen. Mit
        „Abo-Link erneuern“ auf der Kalenderseite ersetzt du die Kennung jederzeit durch eine neue;
        die bisherige Adresse funktioniert dann sofort nicht mehr. Die Kennung wird mit deinem Konto
        gelöscht. Der Kalender wird bei jedem Abruf erzeugt und nicht gespeichert; er enthält nicht
        nur deine Buchungen, sondern alle künftigen Webinare und angebotenen Coaching-Termine der
        Plattform, jeweils mit Titel, Skill und Beschreibung sowie – bei Coachings – Anzeigename,
        Nickname und durchschnittlicher Bewertung des Kursleiters; bei deinen gebuchten Coachings
        zusätzlich Anzeigename und Nickname der jeweils anderen Person und den Konferenzlink. Beim
        Abruf durch deine Kalender-App wird die Adresse einschließlich der Kennung in unseren
        Server-Logs protokolliert (Abschnitt 8), und der Anbieter deiner Kalender-App erhält die
        Termindaten; diesen Anbieter wählst du selbst. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
        DSGVO (die von dir gewünschte Funktion).
      </p>
    </section>

    <section id="zahlungen">
      <h2>15 MorphCoins, Premium, Herzen und Zahlungen</h2>
      <h3>15.1 MorphCoins, Premium und Herzen</h3>
      <p>
        MorphCoins sind das Zahlungsmittel innerhalb der Plattform. Du kannst MorphCoins über PayPal
        kaufen (100 MorphCoins = 1,00 € inkl. 19 % USt., mindestens 500, höchstens 1.000.000 je
        Kauf) oder als Belohnung erhalten. Mit MorphCoins bezahlst du Premium (1.000 je Monat oder
        10.000 je Jahr, auf Wunsch mit automatischer Verlängerung), das Auffüllen der Herzen (50),
        kostenpflichtige Kurse und Events. Zu deinem Konto speichern wir dein Guthaben und jede
        Transaktion (Betrag, Beschreibung, Zeitpunkt), deinen Premium-Status mit dem Kennzeichen für
        die automatische Verlängerung sowie deine Herzen mit dem Zeitpunkt der letzten Auffüllung;
        Herzen werden täglich um 00:00 Uhr UTC aufgefüllt. Nicht verbrauchte gekaufte MorphCoins
        erstatten wir auf Anfrage per Gutschrift. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO;
        Speicherdauer bis zur Kontolöschung, für Rechnungen und Gutschriften wie in Abschnitt 15.4.
      </p>
      <h3>15.2 Zahlung über PayPal</h3>
      <p>
        MorphCoins-Käufe wickeln wir über PayPal (Europe) S.à r.l. et Cie, S.C.A., 22-24 Boulevard
        Royal, L-2449 Luxemburg, ab. Wenn du einen Kauf startest, lädt die Bezahlseite das
        PayPal-JavaScript-SDK von www.paypal.com; erst dann verbindet sich dein Browser mit PayPal.
        PayPal kann dabei Informationen in deinem Browser speichern und auslesen (etwa Cookies zur
        Betrugsprävention); dies ist zur Abwicklung der von dir gewünschten Zahlung erforderlich (§
        25 Abs. 2 Nr. 2 TDDDG). PayPal verarbeitet deine Zahlungs- und Verbindungsdaten in eigener
        Verantwortung nach seiner Datenschutzerklärung. Auf anderen Seiten wird das SDK nicht
        geladen.
      </p>
      <p>
        An PayPal übermitteln wir bei der Bestellanlage ausschließlich Betrag und Währung. Name,
        Anschrift, E-Mail-Adresse oder deine Nutzerkennung senden wir nicht an PayPal. Von PayPal
        erhalten wir ausschließlich die Bestellkennung und den Zahlungsstatus; eine
        Rechnungsanschrift erhalten wir von PayPal nicht. Wir speichern die PayPal-Bestellkennung,
        deine Nutzerkennung, die Anzahl der gekauften MorphCoins, Zeitpunkte und die
        Rechnungsnummer. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. PayPal (Europe) hat seinen
        Sitz in der EU; für Übermittlungen innerhalb des PayPal-Konzerns ist PayPal verantwortlich.
      </p>
      <h3>15.3 Rechnungsdaten und Prüfung der USt-IdNr.</h3>
      <p>
        Für Rechnungen und Gutschriften benötigen wir Rechnungsdaten, die du in deinem Profil
        angibst: ob du als Unternehmen handelst, Vor- und Nachname, Straße, Postleitzahl, Ort, Land
        und bei Unternehmen die Umsatzsteuer-Identifikationsnummer. Für den Kauf von MorphCoins als
        Privatperson sind mindestens die Angabe, dass du nicht als Unternehmen handelst, und dein
        Land erforderlich (Umsatzsteuer); Unternehmen müssen die vollständigen Rechnungsdaten
        einschließlich USt-IdNr. angeben. Wir erheben diese Daten erst, wenn du eine
        kostenpflichtige Leistung erwirbst oder MorphCoins als Belohnung gutgeschrieben bekommen
        möchtest. MorphCoins, die du als Belohnung erhältst, werden dir erst gutgeschrieben, wenn
        deine E-Mail-Adresse bestätigt ist und deine Rechnungsdaten vollständig sind; bis dahin
        halten wir sie zurück. Gutgeschrieben werden sie, wenn du deine Rechnungsdaten bei
        bestätigter E-Mail-Adresse (gegebenenfalls erneut) speicherst. Gibst du eine USt-IdNr. an,
        prüfen wir sie über das Mehrwertsteuer-Informationsaustauschsystem (VIES) der Europäischen
        Kommission; übermittelt wird ausschließlich die USt-IdNr., nicht dein Name oder deine
        Anschrift. Rechtsgrundlage dafür ist Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit den
        umsatzsteuerrechtlichen Prüfpflichten.
      </p>
      <h3>15.4 Rechnungen, Gutschriften und Schlussabrechnung</h3>
      <p>
        Zu jedem MorphCoins-Kauf erstellen wir mit der Zahlungsbestätigung von PayPal eine Rechnung,
        die wir dir als PDF mit der Kaufbestätigung per E-Mail senden; Gutschriften erstellen wir je
        Kalendermonat über MorphCoins, die du als Belohnung erhalten hast (etwa als Kursleiter oder
        für erstellte Aufgaben) – derzeit auf Anfrage –, sowie von Hand bei Erstattungen. Rechnungen
        und Gutschriften enthalten Name, Anschrift, E-Mail-Adresse und gegebenenfalls USt-IdNr. Zu
        jedem Dokument speichern wir außerdem einen Datensatz mit Nummer, Art, Ausstellungsdatum,
        den gedruckten Kundenangaben, der Zahl der MorphCoins und den Beträgen; bei Rechnungen
        zusätzlich mit Fassung und Zeitpunkt der Erklärungen zum Widerrufsrecht aus der Bestellung
        (Abschnitt 15.5). Wir erzeugen die PDF-Dateien auf unserem eigenen Server; ein externer
        Dienst ist nicht beteiligt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO für die
        Erstellung und Art. 6 Abs. 1 lit. c DSGVO für die Aufbewahrung. Wir bewahren Rechnungen und
        Gutschriften acht Jahre auf (§ 147 Abs. 3 Satz 1 AO, § 257 Abs. 4 HGB, § 14b Abs. 1 UStG),
        gerechnet ab dem Ende des Kalenderjahres der Ausstellung – auch nach einer Kontolöschung;
        danach löschen wir Datensatz und PDF-Datei automatisch. Nach einer Kontolöschung entfernen
        wir die Zuordnung des Datensatzes zum Konto und ersetzen darin die Kundenangaben durch den
        Vermerk „Gelöschtes Konto (Aufbewahrung nach § 147 Abs. 3 AO)“; die PDF-Datei behält die
        Angaben, mit denen sie ausgestellt wurde, weil eine Rechnung nachträglich nicht verändert
        werden darf. Die Liste aller Dokumente können Administratoren nach Nummer, Name und
        E-Mail-Adresse durchsuchen; jeder Abruf dieser Liste wird im Verwaltungsprotokoll
        festgehalten (Abschnitt 10.5).
      </p>
      <p>
        Schlussabrechnung: Löschst du dein Konto und ist von deinen gekauften MorphCoins ein Anteil
        nicht verbraucht (Ziffer 6.7 der AGB), erstellen wir bei der Löschung eine
        Schlussabrechnung. Sie enthält deinen Namen, deine Anschrift (soweit angegeben), deine
        E-Mail-Adresse und gegebenenfalls deine USt-IdNr., das Datum der Löschung, die Summe der
        gekauften MorphCoins, das Guthaben bei der Löschung, den nicht verbrauchten Anteil und den
        Erstattungsbetrag sowie später den Zeitpunkt, zu dem wir die Erstattung ausgeführt haben.
        Anders als Rechnungen wird sie bei der Löschung nicht pseudonymisiert, damit wir die
        Erstattung auch nach der Löschung der Person zuordnen können, die sie verlangt; den
        festgehaltenen Betrag teilen wir dir auf Anfrage an
        <a href="mailto:hallo@bootstrap.academy" class="underline-link">hallo@bootstrap.academy</a>
        mit. Hast du keine MorphCoins gekauft oder alle gekauften MorphCoins verbraucht, wird keine
        Schlussabrechnung erstellt. Notwendige Vertrags- und Anspruchsnachweise bleiben davon
        getrennt nach Abschnitt 10.7 erhalten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
        (Erfüllung deines Erstattungsanspruchs nach Ziffer 6.7 der AGB) und für die Aufbewahrung als
        Beleg über die Erstattung Art. 6 Abs. 1 lit. c DSGVO (§ 147 Abs. 1 AO). Wir bewahren die
        Schlussabrechnung wie eine Rechnung acht Jahre ab dem Ende des Kalenderjahres der Löschung
        auf und löschen sie danach automatisch; sie weist keine Umsatzsteuer aus.
      </p>
      <h3>15.5 Erklärungen zum Widerrufsrecht bei Bestellungen</h3>
      <p>
        Bestellst du als Verbraucher eine kostenpflichtige Leistung, gibst du vor der Bestellung
        über zwei Kontrollkästchen die in der
        <a href="/docs/right-of-withdrawal">Widerrufsbelehrung</a> beschriebenen Erklärungen zur
        sofortigen Ausführung ab. Wir speichern dazu die Art der Leistung (MorphCoins, Premium,
        Herzen, Kurs, Webinar oder Coaching), gegebenenfalls die Kennung des Kurses oder Termins,
        die Fassung der Widerrufsbelehrung, zu der du die Erklärungen abgegeben hast, und den
        Zeitpunkt; beim Kauf von MorphCoins speichern wir Fassung und Zeitpunkt an der Bestellung.
        Die Fassung gibt unser Server vor; IP-Adresse oder Browserkennung speichern wir dazu nicht.
        Zweck ist der Nachweis, dass du die Erklärungen abgegeben hast, und ihre Wiedergabe in der
        Kaufbestätigung (§ 312f Abs. 3, § 356 Abs. 5 und 6 BGB): Die Kaufbestätigung beim Kauf von
        MorphCoins wiederholt deine Erklärung mit Fassung und Zeitpunkt und enthält die AGB und die
        Widerrufsbelehrung als PDF. Rechtsgrundlage ist Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit
        § 312f Abs. 3 BGB sowie Art. 6 Abs. 1 lit. b DSGVO. Die Erklärungen sind im Datenexport
        enthalten (Abschnitt 23). Erforderliche Vertrags- und Anspruchsnachweise bleiben nach
        Abschnitt 10.7 gesondert erhalten. Beim Kauf von MorphCoins übernehmen wir Fassung und
        Zeitpunkt mit der Ausstellung der Rechnung zusätzlich in deren Datensatz; dort bleiben sie
        acht Jahre ab dem Ende des Ausstellungsjahres erhalten, auch nach einer Kontolöschung
        (Abschnitt 15.4).
      </p>
      <h3>15.6 Kündigung und Widerruf über die Plattform</h3>
      <p>
        Unter
        <a href="/vertrag-kuendigen">bootstrap.academy/vertrag-kuendigen</a> und
        <a href="/vertrag-widerrufen">bootstrap.academy/vertrag-widerrufen</a> (Schaltflächen
        „Verträge hier kündigen“ und „Vertrag widerrufen“ am Ende jeder Seite) kannst du Verträge
        kündigen und widerrufen, ohne angemeldet zu sein. Wir speichern die Erklärung mit Name,
        E-Mail-Adresse, betroffenem Vertrag, bei Kündigungen mit der Art der Kündigung, dem
        gewünschten Beendigungszeitpunkt und einer etwaigen Begründung, bei Widerrufen mit deinen
        Angaben zur Bestellung, sowie mit dem Zeitpunkt des Eingangs und dem ermittelten
        Vertragsende. Passt die angegebene E-Mail-Adresse zu einem Konto, vermerken wir diese
        mögliche Zuordnung zunächst als ungeprüft. Wir speichern die zu diesem Zeitpunkt vorhandene
        Verlängerungsvereinbarung und die bezahlten Zeiträume sowie deren spätere Änderungen während
        der Bearbeitung. So bleibt nachvollziehbar, welche Vereinbarung bei Eingang deiner Erklärung
        bestand. Allein Name und E-Mail-Adresse lösen keine Kontoveränderung aus. Mit einer
        freiwillig angegebenen eindeutigen Vereinbarungsnummer oder einer gesonderten Prüfung deiner
        Identität können wir die Erklärung zuordnen. Absenden kannst du sie ohne Anmeldung. Der
        öffentliche Beleg enthält nur deine Angaben und den Eingang. Was wir zu deinem Vertrag
        festgestellt haben, bestätigen wir gesondert über einen geprüften Kontaktweg. Die
        Eingangsbestätigung enthält die Erklärung, Datum und Uhrzeit des Eingangs (Europe/Berlin)
        sowie bei Kündigungen den gewünschten Termin (§ 312k Abs. 4, § 356a BGB). Wir speichern die
        genaue Nachricht mit Empfänger, Versandversuchen und Annahme durch den E-Mail-Server für
        sofortigen Versand und Wiederholung bei Fehlern; die Serverannahme beweist keine Zustellung
        im Postfach. Eine interne Benachrichtigung hilft uns, deine Erklärung zu bearbeiten und
        Erstattungen zu veranlassen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. c DSGVO (gesetzliche
        Bestätigungspflicht) und Art. 6 Abs. 1 lit. b DSGVO (Abwicklung des Vertrags).
      </p>
      <p>
        Die Erklärung bewahren wir nach Abschluss der Bearbeitung als Nachweis der Kündigung bzw.
        des Widerrufs auf, auch nach einer Kontolöschung; Rechtsgrundlage dafür ist Art. 6 Abs. 1
        lit. f DSGVO (Nachweis bis zum Ablauf der Verjährung). Die Zuordnung zum Konto wird bei der
        Kontolöschung entfernt; Name, E-Mail-Adresse, ursprüngliche Kennungen und erforderliche
        Vertragsbeobachtungen bleiben in den Nachweisen. Abgeschlossene Fälle löschen wir regelmäßig
        drei Jahre nach Ende des Jahres des spätesten Eingangs-, Bearbeitungs- oder
        Beendigungszeitpunkts (§§ 195, 199 Abs. 1 BGB). Offene Bearbeitungen, ausstehende
        Bestätigungen und noch laufende Kündigungstermine werden vorher nicht automatisch gelöscht.
        Im Browser-Tab speichern wir deine letzte Erklärung mit einer zufälligen Abrufkennung und
        dem Beleg für bis zu 24 Stunden, damit du bei einem Übertragungsfehler den bereits
        gespeicherten Eingang abrufen kannst. Du kannst diesen Tab-Speicher über die Schaltfläche am
        Beleg entfernen; Druck und Speicherung einer eigenen Kopie bleiben möglich. Die Abrufkennung
        wird auf dem Server nur als Hashwert gespeichert und gibt keinen Zugang zu
        Kontoinformationen.
      </p>
      <p>
        Um Missbrauch der öffentlichen Formulare zu begrenzen, zählen wir Erklärungen je IP-Adresse
        (höchstens 60 je Stunde) und je E-Mail-Adresse (höchstens 5 je Stunde) in einem
        Zwischenspeicher. Gespeichert wird dort nur ein Hashwert der IP-Adresse bzw. der
        E-Mail-Adresse mit dem Zähler; der Eintrag wird eine Stunde nach der letzten gezählten
        Erklärung gelöscht. Wird die Grenze überschritten, lehnen wir die Erklärung mit einer
        Fehlermeldung ab und speichern nichts; du kannst sie dann per E-Mail an
        hallo@bootstrap.academy abgeben. Rechtsgrundlage für die Zähler ist Art. 6 Abs. 1 lit. f
        DSGVO (Schutz der Formulare vor Missbrauch).
      </p>
      <h3>15.7 Nachweise zur automatischen Premium-Verlängerung</h3>
      <p>
        Eine neue monatliche Verlängerung erfordert eine gesonderte ausdrückliche Bestellung. Dafür
        speichern wir eine eindeutige Vereinbarungsnummer, die Kontokennung, den Namen und die
        E-Mail-Adresse bei der Bestellung, den Eingangszeitpunkt, den vereinbarten Coin-Preis, den
        vollständigen Erklärungstext und die vereinbarten AGB und Widerrufsinformationen. Der
        Nachweis bleibt inhaltlich unverändert. Getrennt erfassen wir Versandversuche, den
        bestätigten Versand und eine Beendigung der Verlängerung. Die E-Mail-Bestätigung wird aus
        dem gespeicherten Vertragsinhalt erzeugt; ein fehlgeschlagener Versand wird erneut versucht.
        Bei der Umstellung abgeschaltete bisherige Verlängerungen dokumentieren wir mit der
        ursprünglichen Einstellung, den bezahlten Zeiträumen und den damals gespeicherten Angaben
        zur AGB-Annahme oder -Ablehnung. Diese Angaben gelten nicht als nachträglicher Nachweis
        einer Zustimmung zum neuen Tarif. Alle diese Daten sind im Kontoexport enthalten.
      </p>
      <p>
        Rechtsgrundlagen sind Art. 6 Abs. 1 lit. b DSGVO für die Vertragsabwicklung, lit. c für die
        erforderliche Vertragsbestätigung und lit. f für den Nachweis der Vereinbarung und der
        Abschaltung. Bei Kontolöschung endet die Verlängerung und werden weitere Versandversuche
        eingestellt. Die Nachweise einschließlich ihrer Kontozuordnung bleiben zur Bearbeitung
        vertraglicher Ansprüche erhalten. Nicht mehr aktive Vereinbarungen löschen wir im
        regelmäßigen Löschlauf nach drei Jahren ab Ende des Jahres, in dem sowohl die Vereinbarung
        beendet als auch der zuletzt bezahlte Zeitraum abgelaufen ist. Für archivierte frühere
        Einstellungen beginnt diese Frist mit dem Ende des Jahres der Abschaltung, bei einem
        späteren Ende des damals bezahlten Zeitraums erst mit dem Ende dieses späteren Jahres. Dies
        sind Vertragsnachweise; die getrennten Aufbewahrungsregeln für Rechnungen und andere
        gesetzlich aufzubewahrende Finanzbelege bleiben unberührt.
      </p>
    </section>

    <section id="videos">
      <h2>16 Kursvideos (MP4 und YouTube)</h2>
      <p>
        Je nach Kurs werden Videos als MP4-Dateien oder als eingebettete YouTube-Videos
        wiedergegeben. MP4-Dateien werden im Videoplayer der Plattform abgespielt; dafür wird kein
        YouTube-Player eingebettet. Die folgenden Angaben zur Verarbeitung durch Google und zur
        Entscheidung, ein YouTube-Video zu laden, beziehen sich auf die YouTube-Einbettung.
      </p>
      <p>
        Bei YouTube-Videos zeigen wir zunächst einen Platzhalter. Erst wenn du das Video durch Klick
        startest, lädt dein Browser die YouTube-Einbettung von youtube-nocookie.com (erweiterter
        Datenschutzmodus). Dabei erhält Google deine IP-Adresse, Browserdaten und die Information,
        welches Video du ansiehst, und kann Informationen in deinem Browser speichern und auslesen.
        Verantwortlich für diese Verarbeitung ist Google Ireland Limited, Gordon House, Barrow
        Street, Dublin 4, Irland; Daten können an Google LLC, Mountain View, USA, übermittelt werden
        (Abschnitt 19).
      </p>
      <p>
        Rechtsgrundlage ist deine Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1
        TDDDG, die du durch den Klick für dieses Video erteilst. Wir speichern die Einwilligung
        nicht; bei jedem Video entscheidest du neu. Du kannst die Einwilligung mit Wirkung für die
        Zukunft widerrufen, indem du keine weiteren Videos lädst. Ohne Einwilligung kannst du die
        Videos nicht ansehen; die übrigen Kursinhalte bleiben nutzbar. Wir erhalten von Google keine
        Daten darüber, welche Videos du ansiehst.
      </p>
    </section>

    <section id="kommunikation">
      <h2>17 E-Mails, Kontakt und Community</h2>
      <h3>17.1 E-Mails von uns</h3>
      <p>
        Wir senden dir E-Mails nur bei wichtigen Anlässen oder auf deine ausdrückliche Anfrage. Dazu
        gehören nötige Nachrichten zur Kontosicherheit und Vertragsabwicklung: Bestätigung deiner
        E-Mail-Adresse, Zurücksetzen des Passworts, Kaufbestätigung mit Rechnung sowie AGB und
        Widerrufsbelehrung als PDF (Abschnitt 15.5), Bestätigung eines Kurskaufs, Bestätigungen von
        Webinar- und Coaching-Buchungen sowie von deren Stornierung oder Absage (Abschnitt 14.1) und
        Bestätigungen von Kündigungen und Widerrufen (Abschnitt 15.6). Rechtsgrundlage ist Art. 6
        Abs. 1 lit. b DSGVO, für den Rechnungsversand und die Bestätigungen nach § 312f, § 312k und
        § 356a BGB auch Art. 6 Abs. 1 lit. c DSGVO. Diese E-Mails können nicht abbestellt werden.
        Einen Newsletter oder Werbe-E-Mails versenden wir nicht.
      </p>
      <p>
        Der Versand erfolgt über einen Mailserver der Hetzner Online GmbH (Auftragsverarbeiter,
        Abschnitt 7.1). Unsere E-Mails enthalten keine Zählpixel und keine Klick-Verfolgung; das
        Logo ist in die E-Mail eingebettet, sodass beim Öffnen keine Verbindung zu einem Server
        aufgebaut wird. Vertragsbestätigungen und die zugehörigen Nachrichten- und Versandnachweise
        bewahren wir mit den Vertragsunterlagen auf. Für Verlängerungsbestätigungen gilt Abschnitt
        15.7; die übrigen Vertragsnachweise sind in den Abschnitten zu Käufen, Kündigung und
        Widerruf beschrieben. Mitteilungen und Versandnachweise zu Moderationsfällen speichern wir
        einschließlich noch aufbewahrter historischer Mitteilungen nach den Regeln im Abschnitt zu
        Moderation und Beschwerden. Persönliche Korrespondenz bewahren wir nach den Regeln im
        folgenden Abschnitt auf.
      </p>
      <h3>17.2 Persönlicher Kontakt und öffentliches Feedback</h3>
      <p>
        Persönliche Anfragen, Konto- und Löschanliegen sowie Sicherheitslücken kannst du direkt an
        die E-Mail-Adresse im
        <NuxtLink to="/docs/imprint" class="underline-link">Impressum</NuxtLink>
        senden. Wir verarbeiten dabei Absender- und Kontaktangaben, Betreff und Nachricht. Auch
        Nachrichten über die bestehende Kontaktformularschnittstelle werden als E-Mail an
        hallo@bootstrap.academy übermittelt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, wenn
        deine Anfrage dein Konto oder einen Vertrag betrifft, sonst Art. 6 Abs. 1 lit. f DSGVO
        (Beantwortung von Anfragen). Wir speichern diese Kommunikation, solange es zur Bearbeitung
        nötig ist, und löschen sie zwölf Monate nach Abschluss der Anfrage; länger nur, wenn eine
        gesetzliche Aufbewahrungspflicht besteht oder wir sie zur Geltendmachung, Ausübung oder
        Verteidigung von Rechtsansprüchen benötigen.
      </p>
      <p>
        Der Feedback-Button für Fehler und Ideen führt zu einer
        <strong>öffentlichen Meldung auf GitHub</strong>. Dafür brauchst du weder ein
        Bootstrap-Academy- noch ein GitHub-Konto. Wir übermitteln die gewählte Kategorie, den Titel
        und deine Beschreibung über unseren Server an das öffentliche Repository
        Bootstrap-Academy/Bootstrap-Academy. Bitte trage keine persönlichen Daten, Zugangsdaten oder
        Angaben zu Sicherheitslücken ein. Wir können dir keine persönliche Antwort oder Umsetzung
        versprechen.
      </p>
      <p>
        Technische Angaben fügen wir nur hinzu, wenn du die freiwillige Option einschaltest. Vor dem
        Senden siehst du alle Angaben: Version der App, Browser und verfügbare Version,
        Betriebssystem, Fenstergröße, Sprache der Oberfläche, Darstellung (Theme) und Einstellung
        für reduzierte Bewegung. Die Option ist zunächst ausgeschaltet; ohne deine Auswahl senden
        wir diese Angaben nicht mit. Konto- und Nutzerkennungen, E-Mail-Adressen, Cookies, Tokens,
        Speicherinhalte, Roh-URLs, Lernfortschritt sowie Konsolen- und Netzwerkaufzeichnungen werden
        nicht automatisch in die Meldung übernommen.
      </p>
      <p>
        Unabhängig davon kannst du ausdrücklich ein Bild auswählen oder, soweit unterstützt, den
        aktuellen Tab aufnehmen. Du nimmst das Bild auf deinem Gerät auf und bearbeitest es dort.
        Erst beim endgültigen Absenden wird es hochgeladen. Du kannst zuschneiden, markieren und
        Bereiche deckend schwärzen. Bei einer überprüften Aufnahme des aktuellen Tabs verdecken wir
        bekannte private Bereiche zusätzlich. Prüfe trotzdem das gesamte Bild. Wir übertragen nur
        das fertige Bild, das du bestätigt hast. Zuschneiden und Schwärzen sind darin fest
        gespeichert und lassen sich nicht als Bearbeitungsebene entfernen. Die Originaldatei wird
        nicht übertragen. Unser Server prüft das Bild und erzeugt es ohne die Metadaten der
        Originaldatei neu.
      </p>
      <p>
        Soweit die von dir gewählte Veröffentlichung personenbezogene Daten enthält, erfolgt sie mit
        deiner Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO durch die entsprechend beschriftete
        Sendeschaltfläche. Du entscheidest selbst, ob technische Angaben und ein Bild enthalten
        sind. Du kannst diese Auswahl vor dem Senden ändern und die Einwilligung für die Zukunft
        über hallo@bootstrap.academy widerrufen. Bitte nenne dazu den Link deiner Meldung. Dein Text
        und dein Bild können persönliche Angaben enthalten. Eine Meldung ist deshalb nicht
        automatisch anonym.
      </p>
      <p>
        GitHub, Inc., USA, erhält den öffentlichen Meldungstext und gegebenenfalls einen Link auf
        das öffentlich abrufbare Bild. Angaben zu Drittlandübermittlungen findest du in Abschnitt 19
        und in den
        <a
          href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
          target="_blank"
          rel="noopener noreferrer"
          class="underline-link"
          >Datenschutzhinweisen von GitHub</a
        >. Öffentliche Meldungen bleiben zur nachvollziehbaren Fehlerbearbeitung auf GitHub
        erhalten, bis sie dort bearbeitet oder gelöscht werden. Unsere Bilddateien werden nach 90
        Tagen unzugänglich und spätestens bei der anschließenden stündlichen Bereinigung gelöscht;
        auf eine berechtigte Anfrage können wir sie vorher entfernen. Eine Löschung bei uns entfernt
        keine bereits von GitHub oder Dritten angelegten Kopien.
      </p>
      <p>
        Damit dieselbe Meldung nicht mehrfach veröffentlicht wird, speichern wir eine zufällige
        Vorgangskennung, einen Prüfwert des Inhalts, den Zeitpunkt, eine Kennzeichnung für den
        Abgleich und gegebenenfalls den Link zur GitHub-Meldung und eine zufällige Bildkennung. Der
        Beleg enthält keine Kopie von Titel, Beschreibung, Diagnosewerten oder IP-Adresse. Die
        Anzahl dieser Belege ist begrenzt. Sie werden nicht nach einer festen Frist gelöscht,
        sondern bleiben erhalten, solange der Dienst die zugehörigen Vorgangskennungen akzeptiert.
        Zum Schutz vor Missbrauch zählen wir Anfragen anhand der IP-Adresse und des Zeitpunkts bis
        zu einer Stunde im Arbeitsspeicher. Die Anzahl dieser Zähler ist begrenzt. Diese Angaben
        senden wir nicht an GitHub. Grundlage dieser Schutzmaßnahmen ist Art. 6 Abs. 1 lit. f DSGVO
        (zuverlässige Zustellung und Schutz vor missbräuchlicher Veröffentlichung).
      </p>
      <h3>17.3 Discord-Community</h3>
      <p>
        Für unsere Discord-Community betreiben wir den Bot „MorpheusHelper“ (Quellcode öffentlich
        auf GitHub) auf unserem Server bei Hetzner mit eigener Datenbank. Der Bot speichert dort
        Discord-Nutzerkennungen und -Namen, die Zeitpunkte von Server-Beitritten, Austritten,
        Namensänderungen und der Verifizierung, den Zeitpunkt der jeweils letzten Nachricht eines
        Mitglieds sowie Moderationsvorgänge (Meldungen, Verwarnungen, Stummschaltungen, Kicks,
        Sperren und interne Team-Notizen) mit Begründung, ausführendem Team-Mitglied und
        Zeitstempel. Hinzu kommen Konfigurationsdaten (Rollen- und Kanalkennungen, Reaktionsrollen)
        und Einträge über automatisch entfernte Nachrichten mit Nutzerkennung, Nutzername, Kanal und
        Zeitpunkt, bei Treffern des Wortfilters einschließlich des betroffenen Nachrichtentexts;
        weitere Nachrichteninhalte speichert der Bot nicht. Zweck ist die Moderation und der Betrieb
        des Community-Servers; Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Interesse an einem
        sicheren und regelkonformen Community-Betrieb). Eine automatische Löschung sieht der Bot
        nicht vor; wir löschen Einträge auf Anfrage (Abschnitt 23), soweit sie nicht zur
        Durchsetzung einer laufenden Sperre benötigt werden. Für die Nutzung von Discord selbst
        gelten die Datenschutzhinweise von Discord. Daten aus der Lernplattform werden nicht an den
        Bot oder an Discord übermittelt.
      </p>
    </section>

    <section id="analyse">
      <h2>18 Keine Analyse, kein Tracking, keine Profilbildung</h2>
      <p>
        Wir setzen keine Webanalyse, keine Werbenetzwerke, keine Tracking-Pixel und keine Dienste
        zur Reichweitenmessung ein – weder auf der Website noch in E-Mails. Wir bilden keine
        Nutzerprofile, geben keine Lernempfehlungen auf Basis deines Verhaltens und werten Lern-,
        Leistungs- oder Code-Daten nicht für Produktentwicklung, Werbung oder das Training von
        KI-Modellen aus. Die einzigen Auswertungen sind aggregierte Betriebskennzahlen und
        Fehlerberichte auf selbst betriebenen Systemen (Abschnitt 8). Die einzigen Verwendungen von
        Lerndaten außerhalb der jeweiligen Kursfunktion sind die Bestenliste (Abschnitt 12.2) und
        die Skill-Level-Prüfung im derzeit nicht freigeschalteten Jobs-Bereich (Abschnitt 12.3).
      </p>
    </section>

    <section id="drittland">
      <h2>19 Drittlandübermittlungen</h2>
      <p>
        Unsere Server stehen in Deutschland. In den folgenden Fällen werden personenbezogene Daten
        an Empfänger in den USA übermittelt:
      </p>
      <div class="legal-table-scroll" tabindex="0">
        <table>
          <thead>
            <tr>
              <th>Empfänger</th>
              <th>Anlass</th>
              <th>Grundlage der Übermittlung</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cloudflare, Inc.</td>
              <td>Auslieferung der Weboberfläche, DNS (Abschnitt 7.2)</td>
              <td>EU-US Data Privacy Framework</td>
            </tr>
            <tr>
              <td>GitHub, Inc.</td>
              <td>Anmeldung über GitHub und öffentliches Feedback (Abschnitte 11 und 17.2)</td>
              <td>EU-US Data Privacy Framework</td>
            </tr>
            <tr>
              <td>Google LLC</td>
              <td>Anmeldung über Google, YouTube-Videos (Abschnitte 11 und 16)</td>
              <td>EU-US Data Privacy Framework</td>
            </tr>
            <tr>
              <td>Discord Inc.</td>
              <td>Anmeldung über Discord (Abschnitt 11)</td>
              <td>EU-US Data Privacy Framework</td>
            </tr>
            <tr>
              <td>8x8, Inc.</td>
              <td>Jitsi Meet für Coachings (Abschnitt 14.2)</td>
              <td>EU-US Data Privacy Framework</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Alle genannten Unternehmen sind nach dem EU-US Data Privacy Framework zertifiziert.
        Grundlage der Übermittlung ist der Angemessenheitsbeschluss der Europäischen Kommission vom
        10. Juli 2023 (Durchführungsbeschluss (EU) 2023/1795) nach Art. 45 DSGVO. Die Zertifizierung
        kannst du in der Teilnehmerliste unter
        <a
          href="https://www.dataprivacyframework.gov/list"
          target="_blank"
          rel="noopener noreferrer"
          >www.dataprivacyframework.gov</a
        >
        prüfen. Auch bei Anbietern mit Sitz in der Europäischen Union können Daten außerhalb der
        Europäischen Union verarbeitet werden. PayPal beschreibt solche internationalen
        Verarbeitungen in seiner
        <a
          href="https://www.paypal.com/lu/legalhub/paypal/privacy-full"
          target="_blank"
          rel="noopener noreferrer"
          >Datenschutzerklärung</a
        >. Übermittlungen, die du selbst auslöst – etwa an den Anbieter deiner Kalender-App –,
        liegen in deiner Hand.
      </p>
    </section>

    <section id="speicherung">
      <h2>20 Speicherdauer und Löschung</h2>
      <p>
        Wir speichern personenbezogene Daten nur so lange, wie es für den Zweck oder aufgrund
        gesetzlicher Aufbewahrungspflichten erforderlich ist. Es gelten folgende Fristen:
      </p>
      <div class="legal-table-scroll" tabindex="0">
        <table>
          <thead>
            <tr>
              <th>Datenkategorie</th>
              <th>Speicherdauer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Konto, Profil, Zwei-Faktor-Daten, Altersbestätigung, AGB-Zustimmung oder -Aufschub,
                Einstellung zur Bestenliste, Kundennummer, Erklärungen zum Widerrufsrecht
              </td>
              <td>
                Bis zur Kontolöschung, soweit die Angaben nicht als erforderliche Vertrags- oder
                Anspruchsnachweise nach Abschnitt 10.7 gesondert erhalten bleiben. Erklärungen zum
                Widerrufsrecht beim Kauf von MorphCoins bleiben zusätzlich im Datensatz der Rechnung
                (acht Jahre, Abschnitt 15.4).
              </td>
            </tr>
            <tr>
              <td>E-Mail-Bestätigungscode, Code zum Zurücksetzen des Passworts</td>
              <td>Bis zur Verwendung, höchstens vier Stunden</td>
            </tr>
            <tr>
              <td>Verknüpfungen mit GitHub, Discord oder Google</td>
              <td>
                Bis zur Aufhebung der Verknüpfung in den Kontoeinstellungen oder bis zur
                Kontolöschung; Daten einer laufenden Anmeldung über einen Anbieter höchstens zehn
                Minuten
              </td>
            </tr>
            <tr>
              <td>Sitzungen</td>
              <td>Bis 30 Tage nach der letzten Nutzung oder bis zur Abmeldung</td>
            </tr>
            <tr>
              <td>Zähler fehlgeschlagener Anmeldeversuche je Konto</td>
              <td>
                Bis 15 Minuten nach dem letzten Fehlversuch oder bis zur nächsten erfolgreichen
                Anmeldung
              </td>
            </tr>
            <tr>
              <td>Zähler fehlgeschlagener Anmeldeversuche je IP-Adresse</td>
              <td>
                Bis 15 Minuten nach dem letzten Fehlversuch; eine erfolgreiche Anmeldung löscht ihn
                nicht
              </td>
            </tr>
            <tr>
              <td>Verwaltungsprotokoll</td>
              <td>Zwölf Monate, auch nach Kontolöschung</td>
            </tr>
            <tr>
              <td>Lern- und Fortschrittsdaten, XP, Lesezeichen</td>
              <td>Bis zur Kontolöschung</td>
            </tr>
            <tr>
              <td>
                Einreichungen, Ausführungsergebnisse, Lösungsstand, Versuche, Bewertungen, eigene
                Aufgaben
              </td>
              <td>
                Bis zur jeweiligen Löschung beziehungsweise Kontolöschung; erforderliche
                Moderationsunterlagen gesondert nach Abschnitt 13.4
              </td>
            </tr>
            <tr>
              <td>
                Moderationsfälle, Entscheidungen, Sperrennachweise, Beschwerden, Mitteilungen und
                Versandnachweise
              </td>
              <td>
                Grundsätzlich zwölf Monate nach Fallabschluss; Abschluss und begrenzte Ausnahmen
                nach Abschnitt 13.4
              </td>
            </tr>
            <tr>
              <td>Private Moderationsbelege und fallbezogene Kontaktangaben</td>
              <td>
                Nur solange erforderlich; gesonderte Prüfung und gegebenenfalls frühere Reduzierung
                nach Abschnitt 13.4
              </td>
            </tr>
            <tr>
              <td>Code im Ausführungsdienst</td>
              <td>Höchstens fünf Minuten nach der letzten Ausführung, nur im Arbeitsspeicher</td>
            </tr>
            <tr>
              <td>Event-Daten</td>
              <td>
                Vergangene Termine: kurz nach dem Ende; Bewertungen von Kursleitern: bis zwei Jahre
                nach der jeweils jüngsten Bewertung (Abschnitt 14.1); übrige Daten bis zur
                Kontolöschung
              </td>
            </tr>
            <tr>
              <td>Kalender-Abo-Kennung</td>
              <td>Bis zur Erneuerung durch dich oder bis zur Kontolöschung</td>
            </tr>
            <tr>
              <td>MorphCoins, Transaktionen, Herzen, Premium, PayPal-Bestellreferenzen</td>
              <td>Bis zur Kontolöschung</td>
            </tr>
            <tr>
              <td>Rechnungsdaten im Profil</td>
              <td>Bis zur Kontolöschung</td>
            </tr>
            <tr>
              <td>Rechnungen und Gutschriften</td>
              <td>
                Acht Jahre ab Ende des Ausstellungsjahres, auch nach Kontolöschung. Erforderliche
                Kundenangaben und Zuordnungsnachweise können für die in Abschnitt 10.7 beschriebenen
                Zwecke erhalten bleiben.
              </td>
            </tr>
            <tr>
              <td>Schlussabrechnung (nur bei nicht verbrauchten gekauften MorphCoins)</td>
              <td>Acht Jahre ab Ende des Jahres der Kontolöschung</td>
            </tr>
            <tr>
              <td>Kündigungs- und Widerrufserklärungen</td>
              <td>
                Drei Jahre ab Ende des maßgeblichen Abschluss-/Beendigungsjahres; offene Fälle und
                Versandaufträge bleiben bis zur Klärung erhalten (Abschnitt 15.6)
              </td>
            </tr>
            <tr>
              <td>Zähler zur Begrenzung der Kündigungs- und Widerrufsformulare</td>
              <td>Eine Stunde nach der letzten gezählten Erklärung</td>
            </tr>
            <tr>
              <td>Datenexport</td>
              <td>Wird beim Abruf erzeugt und nicht gespeichert</td>
            </tr>
            <tr>
              <td>Server-Logs</td>
              <td>
                30 Tage (auch für die Zugriffsprotokolle des Webhostings hinter
                static.bootstrap.academy, dort mit anonymisierter IP-Adresse)
              </td>
            </tr>
            <tr>
              <td>Fehlerberichte</td>
              <td>90 Tage</td>
            </tr>
            <tr>
              <td>Kontakt- und Support-Kommunikation</td>
              <td>Bis zur Erledigung, danach zwölf Monate (Abschnitt 17.2)</td>
            </tr>
            <tr>
              <td>Discord-Bot</td>
              <td>Bis zur Löschung auf Anfrage (Abschnitt 17.3)</td>
            </tr>
            <tr>
              <td>Datensicherungen</td>
              <td>
                Konfigurierte Sicherungsstände: 48 stündliche, 14 tägliche, 8 wöchentliche und 12
                monatliche. Keine feste Löschfrist ab der Kontolöschung (Abschnitt 7.3).
              </td>
            </tr>
            <tr>
              <td>Cookies, Local Storage und Session Storage</td>
              <td>Abschnitt 9</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Bei einer Kontolöschung werden nicht mehr benötigte Daten aus dem gewöhnlichen Konto und den
        beteiligten Diensten entfernt (Abschnitt 10.7). Notwendige Vertrags-, Abrechnungs-,
        Anspruchs- und Moderationsnachweise bleiben davon getrennt erhalten. Die Löschung im
        laufenden System bedeutet nicht zugleich, dass sämtliche Sicherungskopien gelöscht sind.
      </p>
    </section>

    <section id="pflichtangaben">
      <h2>21 Pflichtangaben und Freiwilligkeit</h2>
      <p>
        Für die Registrierung sind Nickname, Anzeigename, E-Mail-Adresse und Passwort (bei Anmeldung
        über GitHub, Discord oder Google: die Verknüpfung statt des Passworts) sowie die Bestätigung
        des Mindestalters und die Zustimmung zu den AGB erforderlich. Ohne diese Angaben können wir
        kein Konto anlegen; die Pflicht ergibt sich aus dem Nutzungsvertrag. Kurzbeschreibung und
        Tags im Profil sind freiwillig. Rechnungsdaten sind nur erforderlich, wenn du MorphCoins
        kaufst oder MorphCoins als Belohnung gutgeschrieben bekommen möchtest; ohne sie kannst du
        keine MorphCoins kaufen, und verdiente MorphCoins werden zurückgehalten (Abschnitt 15.3);
        alle übrigen Funktionen bleiben nutzbar. Alle weiteren Verarbeitungen ergeben sich aus
        Funktionen, die du selbst nutzt (Kurse, Aufgaben, Events, Videos).
      </p>
    </section>

    <section id="mindestalter">
      <h2>22 Mindestalter</h2>
      <p>
        Die Plattform richtet sich an Personen ab 16 Jahren. Bei der Registrierung bestätigst du,
        dass du mindestens 16 Jahre alt bist; eine weitergehende Altersprüfung nehmen wir nicht vor
        und erheben kein Geburtsdatum. Personen unter 16 Jahren dürfen kein Konto anlegen. Erfahren
        wir, dass ein Konto von einer Person unter 16 Jahren angelegt wurde, löschen wir es. Eltern
        und Erziehungsberechtigte erreichen uns bei Fragen zu einem Konto unter
        <a href="mailto:hallo@bootstrap.academy" class="underline-link">hallo@bootstrap.academy</a>.
        Einwilligungen (Abschnitt 16) können nach Art. 8 DSGVO nur Personen ab 16 Jahren wirksam
        erteilen. Für kostenpflichtige Leistungen, die Minderjährige ab 16 Jahren erwerben, gelten
        die §§ 107 bis 110 BGB (Zustimmung der gesetzlichen Vertreter); Einzelheiten stehen in den
        Allgemeinen Geschäftsbedingungen.
      </p>
    </section>

    <section id="rechte">
      <h2>23 Deine Datenschutzrechte</h2>
      <p>Du hast gegenüber uns folgende Rechte:</p>
      <ul>
        <li>
          <strong>Auskunft</strong> (Art. 15 DSGVO): Du kannst erfahren, welche Daten wir über dich
          gespeichert haben. Die meisten Daten siehst du direkt in deinem Konto; eine Datei mit den
          in der Plattform zu deinem Konto gespeicherten Daten lädst du jederzeit selbst herunter
          (siehe Datenübertragbarkeit). Weitergehende Auskünfte – etwa zu Daten, die nicht in der
          Datei enthalten sind, oder nach einer Kontolöschung – erteilen wir auf Anfrage.
        </li>
        <li>
          <strong>Berichtigung</strong> (Art. 16 DSGVO): Nickname, Anzeigename, E-Mail-Adresse,
          Profil- und Rechnungsdaten kannst du selbst im Profil ändern.
        </li>
        <li>
          <strong>Löschung</strong> (Art. 17 DSGVO): Dein Konto löschst du selbst in den
          Kontoeinstellungen (Abschnitt 10.7). Einzelne Daten löschen wir auf Anfrage, soweit keine
          Aufbewahrungspflicht besteht.
        </li>
        <li><strong>Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO).</li>
        <li>
          <strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO): In den Kontoeinstellungen kannst du
          unter „Meine Daten herunterladen“ jederzeit eine Datei im JSON-Format abrufen. Sie enthält
          aus dem Kerndienst deine Konto- und Profildaten einschließlich Rechnungsdaten,
          AGB-Zustimmung und Bestenlisten-Einstellung, deine Sitzungen (ohne Token), Verknüpfungen
          mit GitHub, Discord oder Google, Guthaben, Herzen, Transaktionen, Premium-Status,
          MorphCoins-Bestellungen, die Datensätze deiner Rechnungen und Gutschriften, deine
          Kündigungs- und Widerrufserklärungen und deine Erklärungen zum Widerrufsrecht; aus dem
          Dienst Skills Kurszugriffe, zuletzt angesehene Kurse, abgeschlossene Lektionen,
          Lesezeichen und XP; aus dem Dienst Challenges Lösungsstand, Versuche, Einreichungen mit
          Quellcode und Ergebnis, Bewertungen, selbst erstellte Aufgaben und die für dich bestimmten
          Moderationsmitteilungen mit Beschwerde- und Maßnahmenstand; aus dem Dienst Events
          erstellte und gebuchte Webinare, angebotene und gebuchte Coaching-Termine, wöchentliche
          Terminfenster und Bewertungen. Nicht enthalten sind Passwort-Hash,
          Zwei-Faktor-Geheimnisse, Sitzungstoken, die Kalender-Abo-Kennung, deine Kundennummer (sie
          ist Teil der Nummern von Gutschriften und Schlussabrechnungen), die Einträge des
          Verwaltungsprotokolls, Server-Logs und Fehlerberichte sowie der Zeitpunkt deiner
          Altersbestätigung; Auskunft dazu erhältst du auf Anfrage. Ist einer der Dienste beim Abruf
          nicht erreichbar, erhältst du die übrigen Daten, und die Datei nennt den fehlenden Teil.
          Der Abruf ist auf einmal je zehn Minuten begrenzt. Auf Anfrage erstellen wir die Datei
          auch für dich; dieser Abruf durch einen Administrator wird im Verwaltungsprotokoll
          festgehalten (Abschnitt 10.5).
        </li>
        <li>
          <strong>Widerruf von Einwilligungen</strong> (Art. 7 Abs. 3 DSGVO) mit Wirkung für die
          Zukunft. Die Einwilligung zum Laden von YouTube-Videos widerrufst du, indem du keine
          weiteren Videos lädst (Abschnitt 16). Die beim Kauf digitaler Inhalte erklärte Zustimmung
          zur sofortigen Vertragsausführung betrifft dein Widerrufsrecht als Verbraucher, nicht die
          Datenverarbeitung; Einzelheiten stehen in der
          <a href="/docs/right-of-withdrawal">Widerrufsbelehrung</a>.
        </li>
        <li>
          <strong>Beschwerde</strong> bei einer Aufsichtsbehörde (Art. 77 DSGVO, Abschnitt 24).
        </li>
      </ul>
      <h3>Widerspruchsrecht (Art. 21 DSGVO)</h3>
      <p>
        <strong>
          Du kannst der Verarbeitung deiner personenbezogenen Daten jederzeit aus Gründen
          widersprechen, die sich aus deiner besonderen Situation ergeben. Das gilt für
          Verarbeitungen, die wir auf Art. 6 Abs. 1 lit. f DSGVO stützen. Das betrifft die
          Server-Logs, die Fehlerberichte, die Datensicherungen, die Auslieferung der Weboberfläche
          über Cloudflare, die Moderation, den Discord-Bot (Abschnitt 17.3), die Bestenliste, das
          Verwaltungsprotokoll (Abschnitt 10.5), die Zähler fehlgeschlagener Anmeldeversuche und der
          Kündigungs- und Widerrufsformulare, die Aufbewahrung von Kündigungs- und
          Widerrufserklärungen als Nachweis (Abschnitt 15.6) und die Beantwortung allgemeiner
          Anfragen (Abschnitt 17.2). Wir verarbeiten die Daten dann nicht mehr, es sei denn, wir
          können zwingende schutzwürdige Gründe für die Verarbeitung nachweisen, die deine
          Interessen, Rechte und Freiheiten überwiegen, oder die Verarbeitung dient der
          Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen. Direktwerbung betreiben
          wir nicht. Schicke deinen Widerspruch an
          <a href="mailto:hallo@bootstrap.academy" class="underline-link">hallo@bootstrap.academy</a
          >. Der Anzeige in den Bestenlisten widersprichst du am einfachsten, indem du in den
          Profileinstellungen den Haken „In den Bestenlisten anzeigen“ entfernst (Abschnitt 12.2).
        </strong>
      </p>
      <p>
        Wenn du deine Rechte ausüben möchtest, schreib an
        <a href="mailto:hallo@bootstrap.academy" class="underline-link">hallo@bootstrap.academy</a>
        oder an die in Abschnitt 2 genannte Anschrift. Um deine Anfrage zuzuordnen, bitten wir dich
        bei Bedarf, von der bei uns hinterlegten E-Mail-Adresse zu schreiben oder deine Identität
        anders nachzuweisen. Wir antworten unverzüglich, spätestens innerhalb eines Monats; ist
        ausnahmsweise eine Verlängerung nach Art. 12 Abs. 3 DSGVO nötig, informieren wir dich
        innerhalb dieses Monats darüber. Zu automatisierten Entscheidungen siehe Abschnitt 13.4.
      </p>
    </section>

    <section id="aufsicht">
      <h2>24 Beschwerderecht bei der Aufsichtsbehörde</h2>
      <p>
        Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, insbesondere
        in dem Mitgliedstaat deines gewöhnlichen Aufenthaltsorts, deines Arbeitsplatzes oder des
        Orts des mutmaßlichen Verstoßes (Art. 77 DSGVO). Für uns zuständig ist das Bayerische
        Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach,
        <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer"
          >www.lda.bayern.de</a
        >.
      </p>
    </section>

    <section id="aenderungen">
      <h2>25 Änderungen dieser Hinweise</h2>
      <p>
        Wir passen diese Hinweise an, wenn sich unsere Datenverarbeitung oder die Rechtslage ändert.
        Die aktuelle Fassung ist jederzeit unter
        <a href="https://bootstrap.academy/docs/privacy" target="_blank" rel="noopener noreferrer"
          >https://bootstrap.academy/docs/privacy</a
        >
        abrufbar.
      </p>
      <p>
        Seit September 2026 nicht mehr eingesetzt: Google reCAPTCHA, Gravatar, der Cookie-Hinweis
        und die Newsletter-Funktion.
      </p>
      <p><strong>Stand:</strong> September 2026</p>
    </section>
  </main>
</template>

<script>
export default {
  setup() {
    return {};
  },
  head: {
    title: "Datenschutz",
  },
};
</script>

<style scoped>
main {
  min-width: 0;
  overflow-wrap: anywhere;
}

.legal-table-scroll {
  max-width: 100%;
  overflow-x: auto;
}

h1 {
  @apply text-heading-1;
}

h2 {
  @apply text-heading-2;
}

h3 {
  @apply text-heading-3;
}

h4 {
  @apply text-heading-4 -mb-2 mt-card;
}

table {
  @apply w-full mt-card;
  min-width: 40rem;
  border-collapse: collapse;
}

table th {
  @apply text-body-1 box text-heading font-heading;
}

table td {
  @apply text-body-1 box align-top text-body font-body;
}

table,
th,
td {
  border: 1px solid white;
}

td a {
  @apply my-4 block;
}

section {
  @apply mt-container;
}

p {
  @apply mt-card-sm;
}

ul {
  @apply mt-card-sm;
}

ul li {
  @apply ml-10 list-disc mt-box;
}

ol li {
  @apply ml-10 list-decimal mt-box;
}

a {
  @apply relative cursor-pointer pb-2;
}

a::after {
  content: "";
  position: absolute;
  width: max(50%, 25px);
  height: 1px;
  background-color: var(--color-accent);
  bottom: 0;
  left: 0;
}

.table-content li a {
  @apply block cursor-pointer pb-0 mt-card-sm;
  position: static;
}

.table-content li a::after {
  content: none;
}
</style>
