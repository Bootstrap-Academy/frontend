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
    <h1 class="text-heading-1">Impressum</h1>

    <h2 class="text-heading-2 mb-box mt-card">Angaben gemäß § 5 DDG</h2>
    <p>
      bootstrap academy GmbH
      <br />
      Wittelsbacherplatz 1
      <br />
      80333 München
      <br />
      Deutschland
    </p>

    <p>
      Rechtsform: Gesellschaft mit beschränkter Haftung (GmbH)
      <br />
      <strong>Vertreten durch den Geschäftsführer:</strong>
      Daniel Michael Bauer
    </p>

    <p>
      Registergericht: Amtsgericht München
      <br />
      Handelsregisternummer: HRB 275681
    </p>

    <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE354823768</p>

    <h2 class="text-heading-2 mb-box mt-card">Kontakt</h2>
    <p>
      Telefon: +49 30 21928640
      <br />
      E-Mail: hallo@bootstrap.academy
      <br />
      Kontaktformular:
      <NuxtLink to="/contact">bootstrap.academy/contact</NuxtLink>
    </p>

    <h2 class="text-heading-2 mb-box mt-card">Verantwortlich im Sinne des § 18 Abs. 2 MStV</h2>
    <p>
      Daniel Michael Bauer
      <br />
      Wittelsbacherplatz 1
      <br />
      80333 München
    </p>

    <h2 class="text-heading-2 mb-box mt-card">
      Kontaktstelle nach Art. 11 und Art. 12 der Verordnung (EU) 2022/2065 (Digital Services Act)
    </h2>
    <p>
      Zentrale Kontaktstelle für die Behörden der Mitgliedstaaten, die Europäische Kommission und
      das Europäische Gremium für digitale Dienste sowie für die Nutzerinnen und Nutzer unseres
      Dienstes: E-Mail hallo@bootstrap.academy. Die Kommunikation ist auf Deutsch und Englisch
      möglich.
    </p>

    <h2 class="text-heading-2 mb-box mt-card">Meldung rechtswidriger Inhalte</h2>
    <p>
      Inhalte auf der Plattform, die Sie für rechtswidrig halten, können Sie per E-Mail an
      hallo@bootstrap.academy melden (Art. 16 DSA). Welche Angaben eine Meldung enthalten sollte und
      wie wir Meldungen bearbeiten, beschreibt Ziffer 14 unserer
      <NuxtLink to="/docs/terms-and-conditions#ziffer-14">Allgemeinen Geschäftsbedingungen</NuxtLink
      >.
    </p>

    <h2 class="text-heading-2 mb-box mt-card">Verbraucherstreitbeilegung</h2>
    <p>
      Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
      Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).
    </p>

    <h2 class="text-heading-2 mb-box mt-card">Weitere Rechtstexte</h2>
    <p>
      <NuxtLink to="/docs/terms-and-conditions">Allgemeine Geschäftsbedingungen</NuxtLink>
      <br />
      <NuxtLink to="/docs/right-of-withdrawal">Widerrufsbelehrung</NuxtLink>
      <br />
      <NuxtLink to="/docs/privacy">Datenschutzhinweise</NuxtLink>
    </p>

    <p>Stand: September 2026</p>
  </main>
</template>

<script>
export default {
  head: {
    title: "Impressum",
  },
  setup() {
    return {};
  },
};
</script>

<style scoped></style>
