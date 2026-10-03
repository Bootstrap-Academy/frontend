export function guestCopy(locale: string) {
  return locale.startsWith("en")
    ? {
        home: "Bootstrap Academy home",
        login: "Log in",
        account: "My learning",
        language: "Language",
        eyebrow: "Your first Python idea",
        title: "Give a figure directions.",
        intro:
          "Move it, try repetitions and get it to the target. See how your instructions become a small Python loop.",
        start: "Start learning",
        noAccount: "You can start without an account.",
        activity: "Understanding repetition",
        local: "Saved in this browser",
        temporary: "Your work is kept in this tab. Browser storage is unavailable.",
        offline:
          "You're offline. You can finish this exercise here and save it to your account when you're back online.",
        result: "You reached the target!",
        resultBody:
          "Four repetitions, two steps each: your figure reached space 8. You've tried the idea behind a Python loop.",
        keep: "Keep learning",
        keepBody:
          "With a free account, you can save your progress and continue in the Python course.",
        signup: "Create a free account",
        later: "Keep exploring here",
        browse: "Explore the courses",
        confirm: "Save your progress",
        accountNote: "You're logged in as",
        transfer: "Save progress and continue",
        draftOnly: "You’ll pick up at the same point in the course.",
        saving: "Saving your progress …",
        saved: "Your progress is saved in your account.",
        continue: "Continue in the course",
        verify: "Verify your email",
        verifyBody: "Verify your email to save your progress. Your work stays here.",
        profile: "Load account details",
        profileBody: "Your account details couldn't be loaded. Your work stays here.",
        retry: "Try saving again",
        conflict:
          "You already have saved work in this exercise. Open it to continue. Your work from this visit stays here.",
        changed:
          "This exercise has changed in the course. Your work stays here; open the course to continue.",
        limit:
          "You can't start another lesson today. Your work stays here. You can continue lessons you've already started.",
        resume: "Continue learning",
        saveError: "Your progress couldn't be saved to your account. Your work stays here.",
        session: "Log in again to save your progress. Your work stays here.",
        browser:
          "Saving to your account is unavailable in this browser. You can keep learning here.",
        storage:
          "Your browser couldn't keep your progress for the account transfer. Allow browser storage and try again; you can still finish here.",
      }
    : {
        home: "Bootstrap Academy Startseite",
        login: "Einloggen",
        account: "Mein Lernen",
        language: "Sprache",
        eyebrow: "Deine erste Python-Idee",
        title: "Gib einer Figur den Weg vor.",
        intro:
          "Bewege sie, probiere Wiederholungen aus und bring sie ans Ziel. Sieh, wie aus deinen Anweisungen eine kleine Python-Schleife wird.",
        start: "Jetzt lernen",
        noAccount: "Du kannst ohne Konto anfangen.",
        activity: "Wiederholungen verstehen",
        local: "In diesem Browser gespeichert",
        temporary:
          "Deine Arbeit bleibt in diesem Tab. Der Browserspeicher ist gerade nicht verfügbar.",
        offline:
          "Du bist offline. Du kannst die Übung hier abschließen und sie später in dein Konto übernehmen.",
        result: "Du hast das Ziel erreicht!",
        resultBody:
          "Vier Wiederholungen mit je zwei Schritten: Deine Figur steht auf Feld 8. Damit hast du die Idee hinter einer Python-Schleife ausprobiert.",
        keep: "Lerne weiter",
        keepBody:
          "Mit einem kostenlosen Konto kannst du deinen Fortschritt speichern und im Python-Kurs weiterlernen.",
        signup: "Kostenloses Konto anlegen",
        later: "Hier weiter ausprobieren",
        browse: "Kurse entdecken",
        confirm: "Speichere deinen Fortschritt",
        accountNote: "Du bist eingeloggt als",
        transfer: "Fortschritt speichern und weiterlernen",
        draftOnly: "Im Kurs machst du an derselben Stelle weiter.",
        saving: "Dein Fortschritt wird gespeichert …",
        saved: "Dein Fortschritt ist in deinem Konto gespeichert.",
        continue: "Im Kurs weiterlernen",
        verify: "E-Mail bestätigen",
        verifyBody:
          "Bestätige deine E-Mail, um deinen Fortschritt zu speichern. Deine Arbeit bleibt hier.",
        profile: "Kontodaten laden",
        profileBody: "Deine Kontodaten konnten nicht geladen werden. Deine Arbeit bleibt hier.",
        retry: "Speichern erneut versuchen",
        conflict:
          "Du hast in dieser Übung schon gespeicherte Arbeit. Öffne sie, um weiterzumachen. Deine Arbeit aus diesem Besuch bleibt hier erhalten.",
        changed:
          "Diese Übung hat sich im Kurs geändert. Deine bisherige Arbeit bleibt hier erhalten. Öffne den Kurs, um weiterzumachen.",
        limit:
          "Du kannst heute keine neue Lektion mehr anfangen. Deine Arbeit bleibt hier. Begonnene Lektionen kannst du fortsetzen.",
        resume: "Weiterlernen",
        saveError:
          "Dein Fortschritt konnte nicht im Konto gespeichert werden. Deine Arbeit bleibt hier erhalten.",
        session:
          "Logge dich erneut ein, um deinen Fortschritt zu speichern. Deine Arbeit bleibt hier.",
        browser:
          "Das Speichern im Konto ist in diesem Browser nicht verfügbar. Du kannst hier weiterlernen.",
        storage:
          "Dein Browser konnte deinen Fortschritt für die Übernahme nicht speichern. Erlaube den Browserspeicher und versuche es erneut. Du kannst hier weiterüben.",
      };
}
