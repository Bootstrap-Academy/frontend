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
		<h1>Widerrufsbelehrung</h1>

		<p>
			Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken
			abschließt, die überwiegend weder ihrer gewerblichen noch ihrer
			selbständigen beruflichen Tätigkeit zugerechnet werden können.
		</p>

		<article>
			<h2>Widerrufsrecht</h2>
			<p>
				Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen
				diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage
				ab dem Tag des Vertragsschlusses. Um Ihr Widerrufsrecht auszuüben,
				müssen Sie uns (bootstrap academy GmbH, Wittelsbacherplatz 1, 80333
				München, +49 89 24 88 62 51 0, E-Mail-Adresse: hallo@bootstrap.academy)
				mittels einer eindeutigen Erklärung (z.B. ein mit der Post versandter
				Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu
				widerrufen, informieren. Sie können dafür das beigefügte
				Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
				Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung
				über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist
				absenden.
			</p>
		</article>

		<article>
			<h2>Folgen des Widerrufs</h2>
			<p>
				Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die
				wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit
				Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine
				andere Art der Lieferung als die von uns angebotene, günstigste
				Standardlieferung gewählt haben), unverzüglich und spätestens binnen
				vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über
				Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese
				Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der
				ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen
				wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen
				wegen dieser Rückzahlung Entgelte berechnet. Haben Sie verlangt, dass
				die Dienstleistungen während der Widerrufsfrist beginnen sollen, so
				haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der
				bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des
				Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits
				erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag
				vorgesehenen Dienstleistungen entspricht.
			</p>
		</article>

		<article>
			<h2>Vorzeitiges Erlöschen des Widerrufsrechts</h2>
			<p>
				Das Widerrufsrecht erlischt vorzeitig mit vollständiger Erbringung der
				Dienstleistungen
			</p>
			<ul>
				<li>
					bei Verträgen über die unentgeltliche Erbringung von Dienstleistungen.
				</li>
				<li>
					bei Verträgen über die entgeltliche Erbringung von Dienstleistungen,
					sofern Sie ausdrücklich zugestimmt haben, dass mit der Erbringung der
					Dienstleistungen vor Ablauf der Widerrufsfrist begonnen wird und Sie
					von uns eine Bestätigung über Ihre Zustimmung und Kenntnis vom
					vorzeitigen Erlöschen des Widerrufsrechts auf einem dauerhaften
					Datenträger erhalten haben.
				</li>
			</ul>
		</article>

		<h2 class="text-heading-1 mt-container">Muster-Widerrufsformular</h2>

		<p>
			(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses
			Formular aus und senden Sie es zurück.)
		</p>

		<p>
			An
			<br />
			bootstrap academy GmbH
			<br />
			Wittelsbacherplatz 1
			<br />
			80333 München
			<br />
		</p>

		<p>E-Mail-Adresse: hallo@bootstrap.academy</p>

		<p>
			- Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
			Vertrag über die Erbringung der folgenden
			Dienstleistungen_________________________________ Bestellt am (*)/erhalten
			am (*)
		</p>

		<p>
			________________________________
			<br />
			Name des/der Verbraucher(s)
		</p>

		<p>
			__________________________________
			<br />
			Anschrift des/der Verbraucher(s)
		</p>

		<p>
			_____________________________________________________________________
			<br />
			Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)
		</p>

		<p>
			___________________
			<br />
			Datum
		</p>

		<p>
			---------------------------------------
			<br />
			(*) Unzutreffendes streichen.
		</p>
	</main>
</template>

<script>
export default {
  setup() {
    return {};
  },
  head: {
    title: 'Right of Withdrawal',
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

p {
	@apply mt-card;
}
ul {
	@apply mt-card-sm;
}
ul li {
	@apply mt-box list-disc ml-10;
}

a {
	@apply cursor-pointer underline-link;
}
</style>
