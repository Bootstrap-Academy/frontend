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
	<main class="container mt-main mb-main">
		<h1 class="text-heading-1">Impressum</h1>

		<h2 class="text-heading-2 mt-card mb-box">
			Angaben gem&auml;&szlig; &sect; 5 TMG
		</h2>
		<p>
			bootstrap academy GmbH
			<br />
			Wittelsbacherplatz 1
			<br />
			80333 M&uuml;nchen
		</p>

		<p>
			Handelsregister: HRB 275681
			<br />
			Registergericht: Amtsgericht M&uuml;nchen
		</p>

		<p>
			<strong>Vertreten durch:</strong>
			<br />
			Dan Bauer
		</p>

		<h2 class="text-heading-2 mt-card mb-box">Kontakt</h2>
		<p>
			Telefon: +49 89 24 88 62 51 0
			<br />
			E-Mail: hallo@bootstrap.academy
		</p>

		<h2 class="text-heading-2 mt-card mb-box">Redaktionell verantwortlich</h2>
		<p>
			Cedric M&ouml;ssner
			<br />
			c/o RA Matutis
			<br />
			Berliner Stra&szlig;e 57
			<br />
			14467 Potsdam
		</p>

		<h2 class="text-heading-2 mt-card mb-box">EU-Streitschlichtung</h2>
		<p>
			Die Europ&auml;ische Kommission stellt eine Plattform zur
			Online-Streitbeilegung (OS) bereit:
			<a
				href="https://ec.europa.eu/consumers/odr/"
				target="_blank"
				rel="noopener noreferrer"
			>
				https://ec.europa.eu/consumers/odr/
			</a>
			.
			<br />
			Unsere E-Mail-Adresse finden Sie oben im Impressum.
		</p>

		<h2 class="text-heading-2 mt-card mb-box">
			Verbraucher&shy;streit&shy;beilegung/Universal&shy;schlichtungs&shy;stelle
		</h2>
		<p>
			Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor
			einer Verbraucherschlichtungsstelle teilzunehmen.
		</p>
	</main>
</template>

<script>
export default {
  head: {
    title: 'Imprint',
  },
  setup() {
    return {};
  },
};
</script>

<style scoped></style>
