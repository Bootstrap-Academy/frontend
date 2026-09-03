<!--
✅ Responsive UI
✅ Page Title
✅ Animation

❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile
-->

<template>
  <main class="mt-main mb-main container">
    <h1>
      Allgemeine Geschäftsbedingungen (AGB) der bootstrap academy GmbH für die Lernplattform
      Bootstrap Academy
    </h1>

    <h2 class="mt-card">
      Plattform:
      <a :href="webLink" target="_blank">
        {{ webLink }}
      </a>
      <br />
      Anbieter: bootstrap academy GmbH, Wittelsbacherplatz 1, 80333 München (nachfolgend „Anbieter“
      oder „wir“)
      <br />
      E-Mail-Adresse: hallo@bootstrap.academy
    </h2>

    <article>
      <p>
        Diese AGB regeln die Nutzung der Lernplattform Bootstrap Academy (bootstrap.academy) und der
        dort angebotenen kostenlosen und kostenpflichtigen Leistungen. Sie gelten für Verbraucher
        und Unternehmer; Ziffer 22 enthält ergänzende Regelungen für Unternehmer. Die
        Widerrufsbelehrung für Verbraucher und die Datenschutzhinweise sind eigenständige Dokumente,
        die Sie im Fußbereich jeder Seite finden.
      </p>
      <h2>Inhalt</h2>
      <ul>
        <li><a href="#ziffer-1">1. Geltungsbereich und Begriffe</a></li>
        <li><a href="#ziffer-2">2. Leistungen der Plattform</a></li>
        <li><a href="#ziffer-3">3. Registrierung, Vertragsschluss und Vertragstext</a></li>
        <li><a href="#ziffer-4">4. Laufzeit und Beendigung des Nutzungsvertrags</a></li>
        <li><a href="#ziffer-5">5. Nutzungsrechte an Inhalten der Plattform</a></li>
        <li><a href="#ziffer-6">6. MorphCoins</a></li>
        <li><a href="#ziffer-7">7. Kostenpflichtige Kurse</a></li>
        <li><a href="#ziffer-8">8. Premium</a></li>
        <li><a href="#ziffer-9">9. Herzen</a></li>
        <li><a href="#ziffer-10">10. Webinare und Coachings (Events)</a></li>
        <li><a href="#ziffer-11">11. Bestellvorgang, Preise, Zahlung und Rechnungen</a></li>
        <li><a href="#ziffer-12">12. Minderjährige</a></li>
        <li><a href="#ziffer-13">13. Pflichten der Nutzer</a></li>
        <li><a href="#ziffer-14">14. Nutzerinhalte, Moderation und Meldeverfahren</a></li>
        <li>
          <a href="#ziffer-15">
            15. Einschränkung und Sperrung des Kontos, außerordentliche Kündigung
          </a>
        </li>
        <li><a href="#ziffer-16">16. Verfügbarkeit, Wartung, Änderungen und Gewährleistung</a></li>
        <li><a href="#ziffer-17">17. Datenschutz und Daten nach Vertragsende</a></li>
        <li><a href="#ziffer-18">18. Haftung</a></li>
        <li><a href="#ziffer-19">19. Freistellung</a></li>
        <li><a href="#ziffer-20">20. Änderungen dieser AGB</a></li>
        <li>
          <a href="#ziffer-21">21. Streitbeilegung, anwendbares Recht und Gerichtsstand</a>
        </li>
        <li><a href="#ziffer-22">22. Ergänzende Regelungen für Unternehmer</a></li>
      </ul>
    </article>

    <article id="ziffer-1">
      <h2>1. Geltungsbereich und Begriffe</h2>
      <p>
        1.1 Diese AGB gelten für alle Verträge zwischen dem Anbieter und Ihnen als Nutzer über die
        Nutzung der Plattform und über die dort angebotenen Leistungen: das kostenlose Nutzerkonto,
        MorphCoins, kostenpflichtige Kurse, Premium, Herzen sowie Webinare und Coachings.
        Abweichende oder ergänzende Bedingungen von Ihnen werden nicht Vertragsbestandteil, es sei
        denn, wir stimmen ihnen ausdrücklich in Textform zu.
      </p>
      <p>
        1.2 Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt,
        die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit
        zugerechnet werden können (§ 13 BGB). Unternehmer ist eine natürliche oder juristische
        Person oder eine rechtsfähige Personengesellschaft, die bei Abschluss eines Rechtsgeschäfts
        in Ausübung ihrer gewerblichen oder selbständigen beruflichen Tätigkeit handelt (§ 14 BGB).
      </p>
      <p>1.3 In diesen AGB bedeuten:</p>
      <ul>
        <li>
          „Plattform“: die Lernplattform unter bootstrap.academy einschließlich der zugehörigen
          Programmierschnittstelle (api.bootstrap.academy);
        </li>
        <li>„Nutzerkonto“: Ihr persönliches, kostenloses Konto auf der Plattform;</li>
        <li>
          „MorphCoins“: das Zahlungsmittel innerhalb der Plattform. Wir unterscheiden „gekaufte
          MorphCoins“ (gegen Geld erworben) und „Belohnungs-Coins“ (von uns als Belohnung
          gutgeschrieben), siehe Ziffer 6;
        </li>
        <li>
          „Premium“: die im Voraus bezahlte, zeitlich befristete Mitgliedschaft nach Ziffer 8;
        </li>
        <li>„Herzen“: das Spielelement nach Ziffer 9;</li>
        <li>„Events“: Webinare und Coachings nach Ziffer 10;</li>
        <li>„Nutzerinhalte“: alle Inhalte, die Sie auf der Plattform einstellen (Ziffer 14).</li>
      </ul>
      <p>1.4 Vertragssprache ist Deutsch. Maßgeblich ist die deutsche Fassung dieser AGB.</p>
    </article>

    <article id="ziffer-2">
      <h2>2. Leistungen der Plattform</h2>
      <p>
        2.1 Mit einem Nutzerkonto können Sie kostenlos nutzen: den Skilltree mit kostenlosen Kursen,
        Quizze und Zuordnungsaufgaben, Coding-Challenges, bei denen Ihr Code auf unseren Servern
        ausgeführt und geprüft wird, das Erstellen eigener Aufgaben, die Bestenliste und die Herzen.
        Für einzelne Funktionen ist eine bestätigte E-Mail-Adresse erforderlich.
      </p>
      <p>
        2.2 Kostenpflichtig sind – jeweils gegen Bezahlung mit MorphCoins – das einmalige
        Freischalten einzelner Kurse (Ziffer 7), Premium (Ziffer 8), das sofortige Auffüllen der
        Herzen (Ziffer 9) sowie Webinare und Coachings (Ziffer 10). Den Preis jeder Leistung zeigen
        wir Ihnen vor der Bestellung in MorphCoins und in Euro an (Ziffer 11).
      </p>
      <p>
        2.3 Die Inhalte der Plattform stammen von uns, von Kursleitern, die Webinare und Coachings
        durchführen, und von anderen Nutzern (Nutzerinhalte). Wir schulden die Bereitstellung der
        Plattform und der von Ihnen erworbenen Leistungen, nicht einen bestimmten Lernerfolg oder
        ein bestimmtes Prüfungsergebnis.
      </p>
      <p>
        2.4 Wir entwickeln die Plattform weiter. Kostenlose Funktionen können wir ändern, ergänzen
        oder einstellen; Änderungen, die eine von Ihnen genutzte Funktion einschränken, kündigen
        wir, soweit möglich, vorher auf der Plattform an. Für kostenpflichtige Leistungen gilt
        Ziffer 16.4.
      </p>
    </article>

    <article id="ziffer-3">
      <h2>3. Registrierung, Vertragsschluss und Vertragstext</h2>
      <p>
        3.1 Für die Nutzung der Plattform legen Sie ein Nutzerkonto an. Die Registrierung ist
        kostenlos. Erforderlich sind ein Nickname (Anmeldename; ein Pseudonym ist zulässig), ein
        Anzeigename, Ihre E-Mail-Adresse und ein Passwort. Statt eines Passworts können Sie sich mit
        einem bestehenden Konto bei GitHub, Discord oder Google registrieren und anmelden.
      </p>
      <p>
        3.2 Sie müssen mindestens 16 Jahre alt sein; das bestätigen Sie bei der Registrierung. Für
        Minderjährige gilt ergänzend Ziffer 12.
      </p>
      <p>
        3.3 Ablauf der Registrierung: Sie geben Ihre Angaben in das Registrierungsformular ein,
        bestätigen Ihr Mindestalter und akzeptieren diese AGB über ein Kontrollkästchen.
        Eingabefehler können Sie vor dem Absenden jederzeit in den Formularfeldern erkennen und
        korrigieren. Mit dem Absenden des Formulars geben Sie ein Angebot auf Abschluss des
        Nutzungsvertrags ab. Der Vertrag kommt zustande, wenn wir Ihr Nutzerkonto anlegen und Ihnen
        die E-Mail zur Bestätigung Ihrer E-Mail-Adresse senden. Kostenpflichtige Bestellungen und
        einige weitere Funktionen stehen erst nach Bestätigung Ihrer E-Mail-Adresse zur Verfügung.
      </p>
      <p>
        3.4 Wir speichern die von Ihnen akzeptierte Fassung dieser AGB zusammen mit dem Zeitpunkt
        Ihrer Zustimmung. Sie können diese Fassung jederzeit in Ihrem Nutzerkonto abrufen, speichern
        und ausdrucken; die jeweils aktuelle Fassung finden Sie unter
        bootstrap.academy/docs/terms-and-conditions. Ihre Registrierungsdaten speichern wir in Ihrem
        Nutzerkonto, wo Sie sie einsehen und ändern können.
      </p>
      <p>
        3.5 Jede Person darf nur ein Nutzerkonto haben. Das Nutzerkonto ist nicht übertragbar.
        Halten Sie Ihre Zugangsdaten geheim und informieren Sie uns unverzüglich, wenn Sie einen
        Missbrauch Ihres Kontos bemerken.
      </p>
      <p>3.6 Einem Verhaltenskodex haben wir uns nicht unterworfen.</p>
    </article>

    <article id="ziffer-4">
      <h2>4. Laufzeit und Beendigung des Nutzungsvertrags</h2>
      <p>
        4.1 Der Nutzungsvertrag läuft auf unbestimmte Zeit. Es gibt keine Mindestlaufzeit. Für das
        Nutzerkonto selbst fallen keine Entgelte an.
      </p>
      <p>
        4.2 Sie können den Nutzungsvertrag jederzeit ohne Einhaltung einer Frist beenden, indem Sie
        Ihr Konto in den Kontoeinstellungen löschen oder uns die Kündigung per E-Mail an
        hallo@bootstrap.academy mitteilen. Bei einer Kündigung per E-Mail löschen wir Ihr Konto
        innerhalb von 30 Tagen. Vor der Löschung weisen wir Sie auf noch vorhandene gekaufte
        MorphCoins hin; beantragen Sie deren Erstattung bitte vor der Löschung (Ziffer 6.7). Löschen
        Sie Ihr Konto während eines laufenden Premium-Zeitraums, erstatten wir den Preis für die
        restliche Laufzeit nicht; Sie können die Löschung auch erst zum Ende der Laufzeit vornehmen.
        Für gebuchte Events gilt Ziffer 10.5.
      </p>
      <p>
        4.3 Wir können den Nutzungsvertrag mit einer Frist von vier Wochen in Textform (E-Mail an
        Ihre hinterlegte Adresse) ordentlich kündigen. Das Recht zur außerordentlichen Kündigung aus
        wichtigem Grund (Ziffer 15.5) bleibt unberührt.
      </p>
      <p>
        4.4 Beenden wir den Nutzungsvertrag durch ordentliche Kündigung oder stellen wir die
        Plattform ein, verlieren Sie keine bezahlte Gegenleistung. Wir erstatten in diesem Fall nach
        Ziffer 6.8:
      </p>
      <ul>
        <li>nicht verbrauchte gekaufte MorphCoins zum Erwerbskurs (Ziffer 6.7);</li>
        <li>den auf die Zeit nach der Beendigung entfallenden Anteil des Premium-Preises;</li>
        <li>den Preis gebuchter, noch nicht durchgeführter Events;</li>
        <li>
          den Preis von Kursen, die Sie kostenpflichtig freigeschaltet haben und auf die Sie durch
          die Beendigung den Zugriff verlieren.
        </li>
      </ul>
      <p>
        4.5 Nach der Beendigung löschen wir Ihre Daten nach Ziffer 17.2. Sichern Sie Inhalte, die
        Sie behalten möchten (zum Beispiel eigenen Code), vor der Beendigung; auf Anfrage stellen
        wir Ihnen Ihre Daten vorher in einem maschinenlesbaren Format bereit (Ziffer 17.3).
      </p>
    </article>

    <article id="ziffer-5">
      <h2>5. Nutzungsrechte an Inhalten der Plattform</h2>
      <p>
        5.1 Sie erhalten das einfache, nicht übertragbare Recht, die Inhalte der Plattform (Kurse,
        Videos, Texte, Aufgaben) für Ihre persönliche Aus- und Weiterbildung zu nutzen. Unternehmer
        dürfen die Inhalte für die Weiterbildung der Person nutzen, für die das Nutzerkonto angelegt
        ist.
      </p>
      <p>
        5.2 Nicht erlaubt ist insbesondere, Inhalte aufzuzeichnen, herunterzuladen, zu
        vervielfältigen, öffentlich zugänglich zu machen, zu verkaufen oder sonst kommerziell zu
        verwerten, soweit dies nicht gesetzlich erlaubt ist oder wir es ausdrücklich gestatten.
        Inhalte, die unter einer offenen Lizenz stehen, dürfen Sie nach den Bedingungen dieser
        Lizenz nutzen.
      </p>
      <p>
        5.3 Kursvideos werden von YouTube (Google) eingebettet und erst nach Ihrem Klick geladen.
        Für die Wiedergabe gelten zusätzlich die Nutzungsbedingungen von YouTube; Einzelheiten
        stehen in den Datenschutzhinweisen.
      </p>
      <p>
        5.4 Das Nutzungsrecht besteht, solange der Nutzungsvertrag besteht; für Inhalte, die Sie
        über Premium nutzen, solange Premium läuft; für kostenpflichtig freigeschaltete Kurse nach
        Ziffer 7.2.
      </p>
    </article>

    <article id="ziffer-6">
      <h2>6. MorphCoins</h2>
      <p>
        6.1 MorphCoins sind das Zahlungsmittel innerhalb der Plattform. Sie können MorphCoins kaufen
        (gekaufte MorphCoins) oder von uns als Belohnung erhalten (Belohnungs-Coins). Beide Arten
        werden in einem gemeinsamen Guthaben angezeigt. Über Käufe, Gutschriften und Ausgaben führen
        wir Buch, sodass wir den gekauften, nicht verbrauchten Anteil jederzeit ermitteln können.
        Bei Ausgaben werden zuerst Belohnungs-Coins verbraucht, danach gekaufte MorphCoins. [OWNER:
        Verbrauchsreihenfolge (erst Belohnungs-Coins, dann gekaufte MorphCoins) bestätigen]
      </p>
      <p>
        6.2 Kauf: 100 MorphCoins kosten 1,00 € einschließlich 19 % Umsatzsteuer. Je Kauf können Sie
        mindestens 500 und höchstens 1.000.000 MorphCoins erwerben. Die Bezahlung erfolgt über
        PayPal; andere Zahlungsarten bieten wir derzeit nicht an. Voraussetzung ist eine bestätigte
        E-Mail-Adresse und die Angabe Ihrer Rechnungsdaten: Als Verbraucher geben Sie mindestens an,
        dass Sie nicht als Unternehmer handeln, und Ihr Land; als Unternehmer geben Sie die
        vollständigen Rechnungsdaten einschließlich Umsatzsteuer-Identifikationsnummer an (Ziffer
        22.3). Die MorphCoins werden Ihrem Guthaben gutgeschrieben, sobald PayPal uns die Zahlung
        bestätigt hat; Sie erhalten eine Kaufbestätigung mit Rechnung per E-Mail (Ziffer 11).
      </p>
      <p>
        6.3 Belohnungs-Coins vergeben wir für Beiträge zur Plattform, insbesondere für das Erstellen
        von Aufgaben, die andere Nutzer positiv bewerten, und an Kursleiter für durchgeführte
        Webinare und Coachings. [OWNER: tatsächlich bestehende Belohnungswege bestätigen – die Seite
        /morphcoins bewirbt derzeit auch „Jobs“ und „Prüfer“, wofür es keine Umsetzung gibt] Welche
        Beiträge wir mit wie vielen Belohnungs-Coins vergüten, zeigen wir an der jeweiligen Stelle
        auf der Plattform an; diese Regeln können wir für die Zukunft ändern. Bereits
        gutgeschriebene Belohnungs-Coins bleiben erhalten.
      </p>
      <p>
        6.4 Belohnungs-Coins werden Ihrem Guthaben erst gutgeschrieben, wenn Ihre Rechnungsdaten
        (Name, Anschrift, Land; bei Unternehmern zusätzlich die Umsatzsteuer-Identifikationsnummer)
        vollständig sind. Bis dahin halten wir sie für Sie zurück und zeigen sie als zurückgehaltene
        MorphCoins an. Über Belohnungs-Coins, die eine Vergütung darstellen (insbesondere Anteile
        für Kursleiter), erstellen wir monatlich eine Gutschrift im Gutschriftverfahren (§ 14 Abs. 2
        Satz 2 UStG). Sie erklären sich mit diesem Verfahren einverstanden und teilen uns mit, wenn
        Sie als Unternehmer handeln.
      </p>
      <p>
        6.5 Verwendung: Mit MorphCoins bezahlen Sie ausschließlich Leistungen auf der Plattform
        (Ziffer 2.2). MorphCoins sind nicht auf andere Nutzer übertragbar und können nicht bei
        Dritten oder außerhalb der Plattform eingelöst werden. Bei jeder Leistung zeigen wir den
        Preis in MorphCoins und den Euro-Gegenwert zum Erwerbskurs an.
      </p>
      <p>
        6.6 Kein Verfall: MorphCoins verfallen nicht durch Zeitablauf. Belohnungs-Coins haben keinen
        Geldwert; sie werden nicht ausgezahlt und entfallen mit der Löschung des Nutzerkontos
        ersatzlos. Gekaufte MorphCoins behalten ihren Gegenwert nach Ziffer 6.7.
      </p>
      <p>
        6.7 Erstattung gekaufter MorphCoins: Nicht verbrauchte gekaufte MorphCoins erstatten wir
        Ihnen jederzeit auf Anfrage per E-Mail an hallo@bootstrap.academy zum Erwerbskurs (100
        MorphCoins = 1,00 €). Wir erstellen eine Gutschrift und zahlen den Betrag innerhalb von 14
        Tagen nach Eingang Ihrer Anfrage auf das PayPal-Konto zurück, mit dem Sie bezahlt haben;
        Kosten berechnen wir dafür nicht. Die erstatteten MorphCoins ziehen wir von Ihrem Guthaben
        ab. Stellen Sie die Anfrage bitte, bevor Sie Ihr Konto löschen: Mit der Löschung wird Ihr
        Guthaben aus unserer Datenbank entfernt, und wir können den nicht verbrauchten Anteil danach
        nur noch erstatten, wenn Sie uns Kauf und Restguthaben nachweisen, zum Beispiel mit Ihren
        Rechnungen und Kaufbestätigungen. Ihre gesetzlichen Rechte, insbesondere das Widerrufsrecht,
        bleiben unberührt.
      </p>
      <p>
        6.8 Gesetzliche und in diesen AGB vorgesehene Erstattungen (zum Beispiel nach Widerruf,
        Minderung oder Vertragsbeendigung nach §§ 327m bis 327o BGB oder nach Ziffer 4.4) leisten
        wir mit demselben Zahlungsmittel, das Sie verwendet haben: Haben Sie mit gekauften
        MorphCoins bezahlt, erstatten wir nach Ihrer Wahl in MorphCoins oder in Euro zum Erwerbskurs
        auf Ihr PayPal-Konto. Haben Sie mit Belohnungs-Coins bezahlt, erstatten wir in
        Belohnungs-Coins. Eine Erstattung ausschließlich in MorphCoins gegen Ihren Willen findet
        nicht statt.
      </p>
      <p>
        6.9 Preise in MorphCoins können wir für die Zukunft ändern. Änderungen gelten nicht für
        bereits erworbene Leistungen und nicht für laufende Premium-Zeiträume. Den Erwerbskurs nach
        Ziffer 6.2 ändern wir nur nach Ziffer 20.2.
      </p>
    </article>

    <article id="ziffer-7">
      <h2>7. Kostenpflichtige Kurse</h2>
      <p>
        7.1 Einzelne Kurse sind kostenpflichtig. Den Preis zeigen wir auf der Kursseite in
        MorphCoins und in Euro an. Mit der Bestellung (Ziffer 11) schalten wir den Kurs sofort für
        Ihr Nutzerkonto frei.
      </p>
      <p>
        7.2 Die Freischaltung ist eine einmalige Leistung: Sie erhalten Zugriff auf den Kurs,
        solange Ihr Nutzerkonto besteht, ohne weitere Kosten. Der Zugriff endet mit der Beendigung
        des Nutzungsvertrags; bei einer Beendigung durch uns gilt Ziffer 4.4.
      </p>
      <p>
        7.3 Wir dürfen Kursinhalte aktualisieren, verbessern und ergänzen und einzelne Lektionen
        durch gleichwertige ersetzen. Änderungen, die den Kurs für Sie mehr als unerheblich
        beeinträchtigen, kündigen wir Ihnen vorher in Textform an; Ihnen stehen dann die Rechte aus
        § 327r BGB zu (Ziffer 16.4). Stellen wir einen kostenpflichtig freigeschalteten Kurs
        vollständig ein, erstatten wir Ihnen den gezahlten Preis nach Ziffer 6.8.
      </p>
      <p>
        7.4 Mit Premium (Ziffer 8) können Sie alle kostenpflichtigen Kurse während der
        Premium-Laufzeit nutzen, ohne sie freizuschalten. Nach dem Ende von Premium endet dieser
        Zugriff, sofern Sie den Kurs nicht gesondert freigeschaltet haben.
      </p>
    </article>

    <article id="ziffer-8">
      <h2>8. Premium</h2>
      <p>
        8.1 Leistungsumfang: Premium umfasst für die gebuchte Laufzeit den Zugriff auf alle Kurse
        der Plattform, auch auf kostenpflichtige Kurse (Ziffer 7.4), sowie die Nutzung von Quizzen,
        Zuordnungsaufgaben und Coding-Challenges ohne Verbrauch von Herzen (Ziffer 9.1). Nicht
        enthalten sind Webinare und Coachings (Ziffer 10). Der Kurskatalog kann sich während der
        Laufzeit ändern (Ziffer 16.4).
      </p>
      <p>
        8.2 Preis und Laufzeit: Premium kostet 1.000 MorphCoins (10,00 €) für einen Monat oder
        10.000 MorphCoins (100,00 €) für ein Jahr. Der Preis wird bei der Bestellung im Voraus von
        Ihrem Guthaben abgebucht. Die Laufzeit beginnt mit der Bestellung. Buchen Sie Premium,
        während ein Premium-Zeitraum läuft, verlängert sich die Laufzeit um den gebuchten Zeitraum.
      </p>
      <p>
        8.3 Ende der Laufzeit: Premium endet automatisch mit Ablauf der Laufzeit, wenn Sie die
        automatische Verlängerung nicht eingeschaltet haben. Eine Mindestlaufzeit über den gebuchten
        Zeitraum hinaus gibt es nicht.
      </p>
      <p>
        8.4 Automatische Verlängerung (optional): Bei der Bestellung und jederzeit danach können Sie
        in Ihrem Konto die automatische Verlängerung ein- oder ausschalten. Ist sie eingeschaltet,
        buchen wir zum Ende der Laufzeit den Preis der gewählten Laufzeit (Monat oder Jahr) erneut
        von Ihrem MorphCoins-Guthaben ab und verlängern Premium um diesen Zeitraum. Reicht Ihr
        Guthaben nicht aus, findet keine Verlängerung statt: Premium endet, die automatische
        Verlängerung wird abgeschaltet, und es entstehen keine Kosten. Sie sind nicht verpflichtet,
        MorphCoins für eine Verlängerung nachzukaufen.
      </p>
      <p>
        8.5 Kündigung: Sie können die automatische Verlängerung jederzeit mit Wirkung zum Ende der
        laufenden Laufzeit kündigen: über die Schaltfläche „Verträge hier kündigen“ im Fußbereich
        jeder Seite und die dortige Bestätigungsseite (§ 312k BGB), in Ihrem Konto durch Ausschalten
        der automatischen Verlängerung oder per E-Mail an hallo@bootstrap.academy. Premium läuft
        dann bis zum Ende der bezahlten Laufzeit weiter und endet danach. Den Inhalt Ihrer
        Kündigung, Datum und Uhrzeit ihres Zugangs sowie den Zeitpunkt, zu dem Premium endet,
        bestätigen wir Ihnen sofort per E-Mail. Für die restliche, bereits bezahlte Laufzeit erfolgt
        bei Ihrer Kündigung keine Erstattung. Das Recht zur außerordentlichen Kündigung aus
        wichtigem Grund, Ihr Widerrufsrecht (siehe Widerrufsbelehrung) und Ihre Rechte bei Mängeln
        (Ziffer 16.2) bleiben unberührt.
      </p>
      <p>
        8.6 Wir können Premium ordentlich nur zum Ende der laufenden Laufzeit kündigen. Stellen wir
        Premium vorher ein, gilt Ziffer 4.4 entsprechend.
      </p>
    </article>

    <article id="ziffer-9">
      <h2>9. Herzen</h2>
      <p>
        9.1 Herzen sind ein Spielelement. Jedes Nutzerkonto hat höchstens drei Herzen; angezeigt
        werden sie in halben und ganzen Herzen. Für jeden Lösungsversuch bei einem Quiz oder einer
        Zuordnungsaufgabe wird ein halbes Herz abgezogen, für jeden Lösungsversuch bei einer
        Coding-Challenge ein ganzes Herz – unabhängig davon, ob die Lösung richtig ist. Für
        Aufgaben, die Sie selbst erstellt haben, und mit Premium (Ziffer 8.1) werden keine Herzen
        abgezogen. Ohne ausreichende Herzen können Sie diese Aufgaben erst wieder bearbeiten, wenn
        Ihre Herzen aufgefüllt sind.
      </p>
      <p>
        9.2 Ihre Herzen werden täglich um 00:00 Uhr UTC (01:00 Uhr MEZ, 02:00 Uhr MESZ) automatisch
        und kostenlos vollständig aufgefüllt. Sie können die Herzen außerdem jederzeit für 50
        MorphCoins (0,50 €) sofort vollständig auffüllen; die Bestellung folgt Ziffer 11, die
        Leistung wird sofort erbracht.
      </p>
      <p>
        9.3 Herzen haben keinen Geldwert, sind nicht übertragbar und werden nicht erstattet oder
        ausgezahlt. Für Premium gilt Ziffer 8.1.
      </p>
    </article>

    <article id="ziffer-10">
      <h2>10. Webinare und Coachings (Events)</h2>
      <p>
        10.1 Auf der Plattform werden Webinare (Online-Seminare für mehrere Teilnehmer) und
        Coachings (Einzeltermine) zu festen Terminen angeboten. Vertragspartner für die Buchung ist
        der Anbieter. Durchgeführt werden Events von Kursleitern, die wir auswählen; Kursleiter
        können auch andere Nutzer der Plattform sein. Termin, Dauer, Inhalt, Kursleiter und Preis
        ergeben sich aus der jeweiligen Beschreibung.
      </p>
      <p>
        10.2 Buchung: Sie buchen einen Termin mit MorphCoins nach Ziffer 11; der Preis wird bei der
        Buchung abgebucht. Sie erhalten eine Buchungsbestätigung per E-Mail. Der Termin findet
        online statt: Coachings in einem Videokonferenzraum bei Jitsi Meet (meet.jit.si, betrieben
        von 8x8, Inc.), Webinare über den vom Kursleiter angegebenen Konferenzlink. Sie benötigen
        dafür ein Gerät mit Kamera, Mikrofon und Internetverbindung.
      </p>
      <p>
        10.3 Stornierung durch Sie: Bis 24 Stunden vor Beginn können Sie einen gebuchten Termin in
        Ihrem Kalender auf der Plattform kostenlos stornieren; die MorphCoins schreiben wir Ihrem
        Guthaben in der Art gut, in der Sie bezahlt haben. Bei einer späteren Stornierung oder bei
        Nichtteilnahme bleibt der Preis geschuldet, abzüglich der Aufwendungen, die wir und der
        Kursleiter dadurch ersparen. Ihnen bleibt der Nachweis vorbehalten, dass uns kein oder ein
        wesentlich geringerer Schaden entstanden ist; konnte der Platz anderweitig vergeben werden,
        erstatten wir den vollen Preis. [OWNER: Stornoregeln bestätigen – der Code von events-ms
        erstattet derzeit bis 7 Tage vor Beginn den vollen Preis, bis 24 Stunden vor Beginn die
        Hälfte und lässt danach keine Stornierung mehr zu; Code und AGB müssen übereinstimmen]
      </p>
      <p>
        10.4 Absage durch uns oder den Kursleiter: Fällt ein Termin aus Gründen aus, die nicht bei
        Ihnen liegen (zum Beispiel Erkrankung des Kursleiters, technische Störung auf unserer Seite,
        zu wenige Teilnehmer), erstatten wir den vollen Preis nach Ziffer 6.8. Bieten wir einen
        Ersatztermin an, können Sie diesen wahrnehmen oder die Erstattung wählen.
      </p>
      <p>
        10.5 Löschen Sie Ihr Konto, werden gebuchte Termine storniert; Ziffer 10.3 gilt
        entsprechend. Beantragen Sie in diesem Fall die Erstattung gekaufter MorphCoins nach Ziffer
        6.7 vor der Löschung.
      </p>
      <p>
        10.6 Während eines Events dürfen Sie keine Aufzeichnungen anfertigen, es sei denn, alle
        Beteiligten stimmen zu. Wer einen Termin nachhaltig stört, kann vom Kursleiter
        ausgeschlossen werden; ein Anspruch auf Erstattung besteht dann nicht, wenn Sie die Störung
        zu vertreten haben.
      </p>
      <p>
        10.7 Wir schulden die ordnungsgemäße Durchführung des Events, nicht einen bestimmten Lern-
        oder Prüfungserfolg.
      </p>
    </article>

    <article id="ziffer-11">
      <h2>11. Bestellvorgang, Preise, Zahlung und Rechnungen</h2>
      <p>
        11.1 Ablauf einer Bestellung: Sie wählen die Leistung aus (MorphCoins, Kurs, Premium,
        Auffüllen der Herzen, Event). Vor der Bestellung zeigen wir Ihnen die wesentlichen Merkmale
        der Leistung, den Gesamtpreis in MorphCoins und in Euro einschließlich Umsatzsteuer, bei
        Premium die Laufzeit und die Einstellung der automatischen Verlängerung sowie die Hinweise
        zum Widerrufsrecht an. Als Verbraucher geben Sie dort auch die in der Widerrufsbelehrung
        beschriebenen Erklärungen zur sofortigen Ausführung ab. Ihre Eingaben können Sie bis zum
        Klick auf die Bestellschaltfläche korrigieren oder die Bestellung abbrechen. Mit dem Klick
        auf die Schaltfläche „zahlungspflichtig bestellen“ geben Sie ein verbindliches Angebot ab.
      </p>
      <p>
        11.2 Vertragsschluss: Beim Kauf von MorphCoins kommt der Vertrag zustande, wenn wir die
        MorphCoins nach Bestätigung der Zahlung durch PayPal Ihrem Guthaben gutschreiben. Bei
        Leistungen, die Sie mit MorphCoins bezahlen, kommt der Vertrag zustande, wenn wir die
        Leistung freischalten oder die Buchung bestätigen; das geschieht unmittelbar nach der
        Bestellung. Über jede Bestellung erhalten Sie eine Bestätigung an Ihre hinterlegte
        E-Mail-Adresse, die den Vertragsinhalt, diese AGB und die Widerrufsbelehrung enthält (§ 312f
        BGB). Ihre Bestelldaten speichern wir in Ihrem Nutzerkonto.
      </p>
      <p>
        11.3 Preise: Alle Euro-Preise verstehen sich einschließlich der gesetzlichen Umsatzsteuer
        (derzeit 19 %). Der Euro-Gegenwert von Preisen in MorphCoins entspricht dem Erwerbskurs nach
        Ziffer 6.2. Weitere Kosten entstehen nicht; die Kosten Ihrer Internetverbindung tragen Sie
        selbst.
      </p>
      <p>
        11.4 Zahlung: MorphCoins bezahlen Sie über PayPal; die Zahlung ist mit der Bestellung
        fällig. Alle anderen Leistungen bezahlen Sie mit MorphCoins aus Ihrem Guthaben; reicht das
        Guthaben nicht aus, kommt keine Bestellung zustande. Eine Bezahlung in Raten bieten wir
        nicht an.
      </p>
      <p>
        11.5 Rechnungen und Gutschriften stellen wir elektronisch als PDF aus und senden sie an Ihre
        hinterlegte E-Mail-Adresse. Auf Anfrage senden wir Ihnen eine Rechnung erneut zu. Rechnungen
        und Gutschriften bewahren wir nach den steuerrechtlichen Vorschriften acht Jahre auf.
      </p>
    </article>

    <article id="ziffer-12">
      <h2>12. Minderjährige</h2>
      <p>
        12.1 Personen unter 16 Jahren dürfen kein Nutzerkonto anlegen. Erfahren wir, dass ein Konto
        von einer Person unter 16 Jahren angelegt wurde, löschen wir es; für gekaufte MorphCoins
        gilt Ziffer 6.7 entsprechend.
      </p>
      <p>
        12.2 Nutzer, die 16 oder 17 Jahre alt sind, dürfen die kostenlosen Leistungen ohne
        Zustimmung ihrer gesetzlichen Vertreter nutzen. Kostenpflichtige Leistungen (MorphCoins,
        Kurse, Premium, Auffüllen der Herzen, Events) dürfen Minderjährige nur mit Einwilligung
        ihrer gesetzlichen Vertreter erwerben (§§ 107, 108 BGB). Ein ohne diese Einwilligung
        geschlossener Vertrag ist von Anfang an wirksam, wenn der Minderjährige die Leistung mit
        Mitteln bewirkt, die ihm zu diesem Zweck oder zur freien Verfügung von den gesetzlichen
        Vertretern oder mit deren Zustimmung von einem Dritten überlassen wurden (§ 110 BGB).
        Minderjährige dürfen kostenpflichtige Leistungen nur bestellen, wenn diese Einwilligung
        vorliegt; wir dürfen einen Nachweis verlangen.
      </p>
      <p>
        12.3 Gesetzliche Vertreter erreichen uns bei Fragen zu einem Konto unter
        hallo@bootstrap.academy. Genehmigen sie einen Vertrag nicht, machen wir ihn rückgängig und
        erstatten die erhaltenen Zahlungen nach Ziffer 6.8.
      </p>
    </article>

    <article id="ziffer-13">
      <h2>13. Pflichten der Nutzer</h2>
      <p>13.1 Sie sind verpflichtet,</p>
      <ul>
        <li>
          bei der Registrierung und bei Bestellungen richtige und vollständige Angaben zu machen und
          diese aktuell zu halten;
        </li>
        <li>
          nur ein Nutzerkonto zu führen und es keiner anderen Person zur Nutzung zu überlassen;
        </li>
        <li>Ihre Zugangsdaten geheim zu halten;</li>
        <li>die Plattform nur im Rahmen dieser AGB und der geltenden Gesetze zu nutzen.</li>
      </ul>
      <p>13.2 Untersagt ist insbesondere,</p>
      <ul>
        <li>
          Sicherheitsmaßnahmen, Zugriffsbeschränkungen, das Herzen- oder MorphCoins-System oder die
          Bestenliste zu umgehen oder zu manipulieren, zum Beispiel durch Mehrfachkonten, Skripte
          oder das Ausnutzen von Fehlern;
        </li>
        <li>
          Inhalte der Plattform automatisiert und massenhaft abzurufen (Scraping) oder die Plattform
          durch automatisierte Zugriffe zu beeinträchtigen. Die Nutzung der öffentlich
          dokumentierten Programmierschnittstelle für eigene Werkzeuge ist erlaubt, solange sie
          diese AGB einhält und die Plattform nicht beeinträchtigt;
        </li>
        <li>
          Schadsoftware, Code oder Inhalte einzustellen, die die Plattform, unsere Systeme oder
          andere Nutzer schädigen oder die Code-Ausführungsumgebung angreifen sollen;
        </li>
        <li>
          in eingereichtem Code oder in Aufgaben Zugangsdaten, Geheimnisse oder personenbezogene
          Daten Dritter zu hinterlegen;
        </li>
        <li>
          rechtswidrige Inhalte einzustellen, insbesondere Inhalte, die Urheber-, Marken- oder
          Persönlichkeitsrechte verletzen oder die beleidigend, bedrohend, volksverhetzend,
          gewaltverherrlichend, pornografisch oder jugendgefährdend sind;
        </li>
        <li>
          andere Nutzer zu belästigen, zu täuschen oder unaufgefordert zu Werbezwecken anzusprechen;
        </li>
        <li>
          die Plattform für Werbung oder für kommerzielle Angebote zu nutzen, die nicht Teil der
          Plattform sind;
        </li>
        <li>
          das Melde- und Bewertungssystem missbräuchlich zu verwenden, etwa durch wissentlich
          falsche Meldungen.
        </li>
      </ul>
      <p>
        13.3 Prüfen Sie Dateien und Code, die Sie einreichen oder hochladen, vor der Übermittlung
        auf Schadsoftware.
      </p>
      <p>
        13.4 Verstöße können zu Maßnahmen nach den Ziffern 14 und 15 führen. Gesetzliche
        Schadensersatzansprüche bleiben unberührt.
      </p>
    </article>

    <article id="ziffer-14">
      <h2>14. Nutzerinhalte, Moderation und Meldeverfahren</h2>
      <p>
        14.1 Nutzerinhalte sind alle Inhalte, die Sie auf der Plattform einstellen: von Ihnen
        erstellte Aufgaben und Quizfragen, eingereichter Code, Bewertungen und Meldungen, Ihr
        Nickname und Ihr Anzeigename sowie Kurzbeschreibung und Schlagwörter in Ihrem Profil; bei
        Kursleitern auch die Beschreibungen ihrer Events. Für Ihre Nutzerinhalte sind Sie
        verantwortlich. Wir prüfen Nutzerinhalte nicht vorab.
      </p>
      <p>
        14.2 Sie räumen uns an Ihren Nutzerinhalten das einfache, räumlich unbeschränkte,
        unentgeltliche Recht ein, sie zum Betrieb der Plattform zu speichern, zu vervielfältigen,
        anderen Nutzern anzuzeigen, eingereichten Code auszuführen und Aufgaben, die Sie für andere
        Nutzer erstellt haben, diesen zugänglich zu machen. Das Recht endet, wenn Sie den Inhalt
        oder Ihr Konto löschen; Kopien in Datensicherungen werden nach den in den
        Datenschutzhinweisen genannten Fristen gelöscht. Weitergehende Rechte, insbesondere zur
        Nutzung für Werbung oder zum Training von KI-Modellen, räumen Sie uns nicht ein. Sie
        versichern, dass Sie über die erforderlichen Rechte an Ihren Nutzerinhalten verfügen.
      </p>
      <p>
        14.3 Beschränkungen für Nutzerinhalte: Für Nutzerinhalte gelten die Regeln in Ziffer 13.2.
        Inhalte, die gegen diese Regeln oder gegen Gesetze verstoßen, entfernen wir oder schränken
        ihre Sichtbarkeit ein; daneben können Maßnahmen nach Ziffer 15 folgen. Bei allen Maßnahmen
        gehen wir sorgfältig, objektiv und verhältnismäßig vor und berücksichtigen Ihre Rechte,
        insbesondere die Meinungsfreiheit.
      </p>
      <p>14.4 So moderieren wir:</p>
      <ul>
        <li>
          Meldungen: Andere Nutzer können von Ihnen erstellte Aufgaben über die Meldefunktion
          melden; jede Person kann uns rechtswidrige Inhalte nach Ziffer 14.5 melden. Eine über die
          Meldefunktion gemeldete Aufgabe wird bis zur Prüfung vorläufig ausgeblendet. Meldungen
          prüft ein Mensch aus unserem Team; erweist sich eine Meldung als unbegründet, wird die
          Aufgabe wieder eingeblendet.
        </li>
        <li>
          Automatische Maßnahmen: Eine von Nutzern erstellte Aufgabe wird außerdem automatisch
          ausgeblendet und uns zur Prüfung vorgelegt, wenn sie mindestens zehn negative und mehr
          negative als positive Bewertungen erhalten hat. Die Ausblendung ist vorläufig; die
          endgültige Entscheidung trifft ein Mensch. Weitere automatisierte Entscheidungen über
          Inhalte oder Konten treffen wir nicht.
        </li>
        <li>
          Maßnahmen: Je nach Schwere und Wiederholung eines Verstoßes kommen in Betracht: ein
          Hinweis oder eine Verwarnung; das Entfernen oder Ausblenden des Inhalts; die befristete
          Sperre einzelner Funktionen (derzeit: Erstellen von Aufgaben oder Abgeben von Meldungen);
          die befristete oder dauerhafte Sperrung des Kontos; die außerordentliche Kündigung (Ziffer
          15).
        </li>
        <li>
          Dauer von Funktionssperren: Die Dauer wird nicht im Einzelfall festgelegt, sondern folgt
          einer festen Staffel nach der Zahl Ihrer bisherigen Sperren derselben Art: 3 Tage, dann 7
          Tage, dann 30 Tage, danach unbefristet. Ob eine Sperre verhängt wird, entscheidet ein
          Mensch; auf Ihre Beschwerde hin prüft ein Mensch auch die Dauer.
        </li>
      </ul>
      <p>
        14.5 Meldung rechtswidriger Inhalte: Wenn Sie der Ansicht sind, dass ein Inhalt auf der
        Plattform rechtswidrig ist, melden Sie ihn per E-Mail an [OWNER: abuse@bootstrap.academy
        oder hallo@bootstrap.academy] mit folgenden Angaben: eine Begründung, warum der Inhalt
        rechtswidrig ist; die genaue Fundstelle (Link) des Inhalts; Ihr Name und Ihre E-Mail-Adresse
        (außer bei Meldungen, die sexuellen Missbrauch von Kindern betreffen); eine Erklärung, dass
        Sie überzeugt sind, dass Ihre Angaben richtig und vollständig sind. Wir bestätigen Ihnen den
        Eingang unverzüglich, prüfen die Meldung zeitnah, sorgfältig und objektiv, teilen Ihnen
        unsere Entscheidung mit und weisen dabei auf die Möglichkeit hin, die Entscheidung nach
        Ziffer 14.7 überprüfen zu lassen.
      </p>
      <p>
        14.6 Begründung unserer Entscheidungen: Entfernen oder blenden wir einen Nutzerinhalt aus,
        sperren wir Funktionen oder Ihr Konto oder kündigen wir außerordentlich, informieren wir Sie
        spätestens mit der Maßnahme per E-Mail über: die Maßnahme und ihre Dauer; die Tatsachen und
        Umstände, auf die wir uns stützen, einschließlich einer etwaigen Meldung; ob automatisierte
        Mittel beteiligt waren; die Rechtsvorschrift oder die Ziffer dieser AGB, gegen die verstoßen
        wurde, mit einer Erläuterung; sowie Ihre Möglichkeiten, die Entscheidung überprüfen zu
        lassen (Ziffer 14.7, außergerichtliche Streitbeilegung, Gerichte). Bei massenhaft
        verbreiteten irreführenden Werbeinhalten (Spam) kann die Begründung entfallen.
      </p>
      <p>
        14.7 Überprüfung: Gegen jede Maßnahme nach den Ziffern 14.3 bis 14.6 und 15 sowie gegen
        unsere Entscheidung über Ihre Meldung können Sie innerhalb von sechs Monaten kostenlos
        Beschwerde per E-Mail an hallo@bootstrap.academy einlegen und Ihren Standpunkt darlegen.
        Über die Beschwerde entscheidet ein Mensch, der an der ursprünglichen Entscheidung nicht
        beteiligt war, soweit dies bei der Größe unseres Teams möglich ist. Wir antworten
        unverzüglich in Textform und heben die Maßnahme auf, wenn sie nicht gerechtfertigt war. Der
        Rechtsweg bleibt Ihnen unbenommen.
      </p>
      <p>
        14.8 Zentrale Kontaktstelle nach Art. 11 und Art. 12 der Verordnung (EU) 2022/2065 (Digital
        Services Act) für Behörden und für Nutzer: hallo@bootstrap.academy. Kommunikation ist auf
        Deutsch und Englisch möglich.
      </p>
    </article>

    <article id="ziffer-15">
      <h2>15. Einschränkung und Sperrung des Kontos, außerordentliche Kündigung</h2>
      <p>
        15.1 Wir dürfen Ihr Konto oder einzelne Funktionen nur einschränken oder sperren, wenn Sie
        gegen diese AGB oder gegen Gesetze verstoßen haben, wenn von Ihrem Konto eine konkrete
        Gefahr für die Sicherheit der Plattform, unserer Systeme oder anderer Nutzer ausgeht oder
        wenn wir dazu gesetzlich oder behördlich verpflichtet sind. Ein bloßer Hinweis Dritter
        genügt dafür nicht; wir prüfen jede Meldung selbst.
      </p>
      <p>
        15.2 Wir wählen die mildeste geeignete Maßnahme (Ziffer 14.4) und hören Sie vorher an, es
        sei denn, sofortiges Handeln ist erforderlich, zum Beispiel bei offensichtlich
        rechtswidrigen Inhalten, bei Angriffen auf die Plattform oder aufgrund einer gesetzlichen
        Pflicht. Sperren befristen wir, soweit nicht ein schwerer oder wiederholter Verstoß eine
        dauerhafte Sperre rechtfertigt.
      </p>
      <p>
        15.3 Jede Maßnahme begründen wir nach Ziffer 14.6. Sie können sie nach Ziffer 14.7
        überprüfen lassen.
      </p>
      <p>
        15.4 Während einer Sperre Ihres Kontos buchen wir keine MorphCoins ab, und die automatische
        Verlängerung von Premium ruht. Einen laufenden, bezahlten Premium-Zeitraum verlängern wir
        nach Ihrer Wahl um die Dauer der Sperre oder erstatten den auf die Sperre entfallenden
        Anteil nach Ziffer 6.8. Gebuchte Events, an denen Sie wegen der Sperre nicht teilnehmen
        können, erstatten wir. Auch während einer Sperre stellen wir Ihnen auf Anfrage Ihre Daten in
        einem maschinenlesbaren Format bereit (Ziffer 17.3), und Sie können Ihr Konto löschen; für
        gekaufte MorphCoins gilt Ziffer 6.7.
      </p>
      <p>
        15.5 Bei einem schweren Verstoß oder bei wiederholten Verstößen trotz Verwarnung können wir
        den Nutzungsvertrag außerordentlich ohne Frist kündigen (§ 314 BGB). Dasselbe Recht haben
        Sie, wenn wir unsere Pflichten schwerwiegend verletzen. Bei einer außerordentlichen
        Kündigung durch uns erstatten wir nicht verbrauchte gekaufte MorphCoins (Ziffer 6.7) und den
        auf die Zeit nach der Kündigung entfallenden Anteil des Premium-Preises;
        Schadensersatzansprüche gegen Sie bleiben unberührt und können wir gegen die Erstattung
        aufrechnen.
      </p>
    </article>

    <article id="ziffer-16">
      <h2>16. Verfügbarkeit, Wartung, Änderungen und Gewährleistung</h2>
      <p>
        16.1 Wir bemühen uns, die Plattform rund um die Uhr verfügbar zu halten, versprechen aber
        keine ununterbrochene Verfügbarkeit. Wartungsarbeiten, die die Plattform vorübergehend
        unerreichbar machen, kündigen wir, soweit möglich, vorher auf der Plattform an und führen
        sie nach Möglichkeit außerhalb der Hauptnutzungszeiten durch. Störungen beheben wir so
        schnell, wie es uns möglich ist.
      </p>
      <p>
        16.2 Rechte bei Mängeln kostenpflichtiger Leistungen: Für MorphCoins, Kurse, Premium, das
        Auffüllen der Herzen und Events gelten die gesetzlichen Vorschriften über Verträge über
        digitale Produkte (§§ 327 ff. BGB) beziehungsweise das gesetzliche Gewährleistungsrecht.
        Entspricht eine Leistung nicht dem Vertrag – zum Beispiel, weil ein freigeschalteter Kurs
        oder Premium über längere Zeit nicht nutzbar ist –, können Sie insbesondere Nacherfüllung
        verlangen (§ 327l BGB), den Preis mindern (§ 327n BGB), den Vertrag beenden (§ 327m BGB) und
        Schadensersatz verlangen. Bei Premium muss die Leistung während der gesamten Laufzeit
        vertragsgemäß sein; wir stellen die dafür erforderlichen Aktualisierungen bereit (§ 327f
        BGB). Mängel melden Sie bitte an hallo@bootstrap.academy.
      </p>
      <p>
        16.3 Kostenlose Leistungen: Auch für kostenlose digitale Leistungen, für die Sie uns
        personenbezogene Daten bereitstellen, gelten die §§ 327 ff. BGB (§ 327 Abs. 3 BGB). Ein
        Anspruch auf den Fortbestand einzelner kostenloser Funktionen besteht nicht (Ziffer 2.4).
      </p>
      <p>
        16.4 Änderungen kostenpflichtiger digitaler Produkte, die über das zur Erhaltung der
        Vertragsmäßigkeit Erforderliche hinausgehen (zum Beispiel neue Funktionen, aktualisierte
        Kursinhalte, der Ersatz einzelner Lektionen, die Anpassung an neue technische Umgebungen
        oder Sicherheitsanforderungen), dürfen wir vornehmen, wenn dafür ein triftiger Grund besteht
        – insbesondere Sicherheit, technische Weiterentwicklung, rechtliche Anforderungen oder
        inhaltliche Aktualisierung –, Ihnen dadurch keine zusätzlichen Kosten entstehen und wir Sie
        klar und verständlich über die Änderung informieren (§ 327r BGB). Beeinträchtigt eine
        Änderung Ihren Zugriff oder die Nutzbarkeit mehr als unerheblich, informieren wir Sie vorher
        per E-Mail über die Merkmale und den Zeitpunkt der Änderung; Sie können den betroffenen
        Vertrag dann innerhalb von 30 Tagen kostenlos beenden und erhalten eine Erstattung nach §§
        327o, 327p BGB und Ziffer 6.8.
      </p>
      <p>
        16.5 Technische Voraussetzungen: ein aktueller Browser mit aktiviertem JavaScript und eine
        Internetverbindung; für Events zusätzlich Kamera und Mikrofon. Wir unterstützen die jeweils
        aktuellen Versionen verbreiteter Browser.
      </p>
    </article>

    <article id="ziffer-17">
      <h2>17. Datenschutz und Daten nach Vertragsende</h2>
      <p>
        17.1 Welche personenbezogenen Daten wir verarbeiten, steht in unseren Datenschutzhinweisen
        unter bootstrap.academy/docs/privacy. Sie sind nicht Teil dieser AGB.
      </p>
      <p>
        17.2 Löschen Sie Ihr Konto selbst, werden Ihre Kontodaten sofort gelöscht. Kündigen Sie per
        E-Mail oder endet der Vertrag auf andere Weise, löschen wir Ihre Daten innerhalb von 30
        Tagen nach Vertragsende. Rechnungen und Gutschriften bewahren wir wegen gesetzlicher
        Pflichten acht Jahre auf; Datensicherungen werden nach den in den Datenschutzhinweisen
        genannten Fristen überschrieben.
      </p>
      <p>
        17.3 Auf Anfrage stellen wir Ihnen Ihre Daten – auch während einer Sperre – innerhalb eines
        Monats in einem strukturierten, gängigen und maschinenlesbaren Format (JSON) bereit.
      </p>
    </article>

    <article id="ziffer-18">
      <h2>18. Haftung</h2>
      <p>
        18.1 Wir haften unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der
        Gesundheit, für Schäden, die auf Vorsatz oder grober Fahrlässigkeit von uns, unseren
        gesetzlichen Vertretern oder unseren Erfüllungsgehilfen beruhen, bei arglistigem
        Verschweigen eines Mangels, aus der Übernahme einer Garantie, nach dem Produkthaftungsgesetz
        sowie nach Art. 82 DSGVO.
      </p>
      <p>
        18.2 Bei einfach fahrlässiger Verletzung einer wesentlichen Vertragspflicht haften wir –
        außer in den Fällen der Ziffer 18.1 – nur für den vertragstypischen, bei Vertragsschluss
        vorhersehbaren Schaden. Wesentliche Vertragspflichten sind Pflichten, deren Erfüllung die
        ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung
        Sie regelmäßig vertrauen dürfen.
      </p>
      <p>
        18.3 Im Übrigen ist unsere Haftung für einfache Fahrlässigkeit ausgeschlossen. Die Ziffern
        18.1 bis 18.3 gelten auch für die Haftung unserer gesetzlichen Vertreter und
        Erfüllungsgehilfen.
      </p>
      <p>
        18.4 Ihre gesetzlichen Rechte bei Mängeln digitaler Produkte (§§ 327 ff. BGB) und die
        Erstattungsansprüche nach diesen AGB werden durch diese Ziffer nicht eingeschränkt.
      </p>
      <p>
        18.5 Für Nutzerinhalte und für Inhalte, die Kursleiter in Events vermitteln, haften wir nach
        den gesetzlichen Vorschriften für Hostingdienste. Wir prüfen diese Inhalte nicht vorab,
        sondern nach einer Meldung (Ziffer 14).
      </p>
    </article>

    <article id="ziffer-19">
      <h2>19. Freistellung</h2>
      <p>
        19.1 Sie stellen uns von Ansprüchen Dritter frei, die diese wegen einer schuldhaften
        Verletzung von Rechten Dritter, dieser AGB oder gesetzlicher Vorschriften durch Sie gegen
        uns geltend machen, einschließlich der angemessenen Kosten der Rechtsverteidigung in
        gesetzlicher Höhe. Die Freistellungspflicht entfällt, soweit Sie die Rechtsverletzung nicht
        zu vertreten haben oder wir sie mitverursacht haben.
      </p>
      <p>
        19.2 Sie sind verpflichtet, uns über drohende Ansprüche Dritter unverzüglich zu informieren,
        sobald Sie davon Kenntnis erlangen. Wir informieren Sie unverzüglich über Ansprüche, die
        Dritte gegen uns erheben, geben Ihnen Gelegenheit zur Stellungnahme und schließen keinen
        Vergleich ohne Ihre Zustimmung, die Sie nicht unbillig verweigern dürfen.
      </p>
    </article>

    <article id="ziffer-20">
      <h2>20. Änderungen dieser AGB</h2>
      <p>
        20.1 Wir können diese AGB für die Zukunft ändern. Über jede Änderung informieren wir Sie
        mindestens sechs Wochen vor dem Wirksamwerden per E-Mail an Ihre hinterlegte Adresse und auf
        der Plattform. In der Mitteilung nennen wir die geänderten Regelungen, den Zeitpunkt des
        Wirksamwerdens und Ihre Rechte nach dieser Ziffer.
      </p>
      <p>
        20.2 Änderungen, die Ihre Zustimmung erfordern: Änderungen, die den Leistungsumfang der
        Plattform oder kostenpflichtiger Leistungen, Preise, den Erwerbskurs, die Regeln für
        MorphCoins, Premium, Herzen oder Events, die Laufzeit- und Kündigungsregeln, die Haftung
        oder diese Ziffer betreffen, werden nur wirksam, wenn Sie ihnen ausdrücklich zustimmen. Wir
        legen Ihnen die neue Fassung bei Ihrer nächsten Anmeldung vor; Sie können sie annehmen oder
        ablehnen. Ihr Schweigen gilt nicht als Zustimmung. Lehnen Sie die neue Fassung ab, gilt für
        bestehende Verträge die bisherige Fassung weiter; neue kostenpflichtige Leistungen können
        Sie dann nur zu den bei der Bestellung geltenden Bedingungen erwerben (Ziffer 20.4). Wir
        können den Nutzungsvertrag in diesem Fall nach Ziffer 4.3 kündigen; Ziffer 4.4 gilt.
      </p>
      <p>
        20.3 Änderungen ohne Ihre ausdrückliche Zustimmung: Nur bei rein redaktionellen Änderungen,
        die den Inhalt nicht verändern, bei Änderungen, die wegen einer Gesetzesänderung oder einer
        gerichtlichen oder behördlichen Entscheidung erforderlich sind, und bei Änderungen, die
        ausschließlich zu Ihrem Vorteil sind, gilt: Widersprechen Sie der Änderung nicht bis zum
        Wirksamwerden in Textform, gilt sie als angenommen. Auf diese Folge weisen wir Sie in der
        Mitteilung besonders hin. Widersprechen Sie, können Sie den Nutzungsvertrag bis zum
        Wirksamwerden ohne Frist kündigen; wir können ihn nach Ziffer 4.3 kündigen, wenn uns die
        Fortsetzung mit der bisherigen Fassung nicht zumutbar ist. Ziffer 4.4 gilt.
      </p>
      <p>
        20.4 Für jede kostenpflichtige Bestellung gilt die Fassung dieser AGB, die wir Ihnen bei der
        Bestellung anzeigen.
      </p>
    </article>

    <article id="ziffer-21">
      <h2>21. Streitbeilegung, anwendbares Recht und Gerichtsstand</h2>
      <p>
        21.1 Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG). Bei Beschwerden wenden Sie sich
        bitte an hallo@bootstrap.academy; wir bemühen uns um eine schnelle Lösung.
      </p>
      <p>
        21.2 Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
        Sind Sie Verbraucher mit gewöhnlichem Aufenthalt in einem anderen Staat, bleiben die
        zwingenden Verbraucherschutzvorschriften dieses Staates unberührt.
      </p>
      <p>
        21.3 Sind Sie Kaufmann, juristische Person des öffentlichen Rechts oder
        öffentlich-rechtliches Sondervermögen, ist ausschließlicher Gerichtsstand München. Für
        Verbraucher gelten die gesetzlichen Gerichtsstände.
      </p>
      <p>
        21.4 Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt der Vertrag im Übrigen
        wirksam; an die Stelle der unwirksamen Bestimmung treten die gesetzlichen Vorschriften (§
        306 BGB).
      </p>
    </article>

    <article id="ziffer-22">
      <h2>22. Ergänzende Regelungen für Unternehmer</h2>
      <p>22.1 Für Nutzer, die als Unternehmer handeln, gelten diese AGB mit folgenden Maßgaben.</p>
      <p>
        22.2 Ein Widerrufsrecht besteht nicht. Die Widerrufsbelehrung sowie die Regelungen in Ziffer
        8.5 zur Kündigungsschaltfläche, in Ziffer 12 und in Ziffer 16.2 Satz 1 bis 4 gelten nur für
        Verbraucher; die gesetzlichen Gewährleistungsrechte für Unternehmer bleiben unberührt.
      </p>
      <p>
        22.3 Unternehmer können MorphCoins kaufen, wenn sie vollständige Rechnungsdaten (Name,
        Anschrift, Land) und ihre Umsatzsteuer-Identifikationsnummer angegeben haben (Ziffer 6.2);
        die Umsatzsteuer-Identifikationsnummer prüfen wir über das
        Mehrwertsteuer-Informationsaustauschsystem der Europäischen Kommission. Die Umsatzsteuer
        weisen wir in der Rechnung gesondert aus. Für Belohnungs-Coins, die eine Vergütung
        darstellen, rechnen wir im Gutschriftverfahren ab (Ziffer 6.4).
      </p>
      <p>
        22.4 Unternehmer können nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen
        aufrechnen und Zurückbehaltungsrechte nur aus demselben Vertragsverhältnis geltend machen.
      </p>
      <p>22.5 Gerichtsstand ist München (Ziffer 21.3).</p>
    </article>

    <article>
      <h2>Stand: September 2026</h2>
    </article>
  </main>
</template>

<script>
export default {
  setup() {
    const config = useRuntimeConfig().public;

    const webLink = computed(() => {
      return `${config.BASE_WEB_URL}`;
    });

    return { webLink };
  },
  head: {
    title: "AGB",
  },
};
</script>

<style scoped>
h1 {
  @apply text-heading-1;
}

h2 {
  @apply text-heading-2;
}

h3 {
  @apply text-heading-3;
}

article {
  @apply mt-container;
}

article p {
  @apply mt-card;
}
ul {
  @apply mt-card-sm;
}
ul li {
  @apply ml-10 list-disc mt-box;
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
</style>
