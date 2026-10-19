<!--
  Terms 2026-10 under their own address (`composables/terms.ts`). While no start is configured
  the page does not exist. From the announcement until the start it says that the version does
  not apply yet and leads to the version in force; from the start it shows the text alone.
  The link of the notice on the platform leads here, so until the start the box names what
  clause 20.1 asks the notice to name: the start, who the version applies to, the changed
  clauses and the rights for existing contracts. Wording: draft v3, `seitenkaesten.md`.
-->
<template>
  <div>
    <aside v-if="!terms.inForce" class="mt-main container" aria-label="Angekündigte Fassung">
      <h1 class="text-heading-1">AGB – Fassung 2026-10</h1>
      <p class="mt-card">
        Diese Fassung haben wir angekündigt. Sie gilt ab dem {{ terms.date }} für neue Konten und
        neue Bestellungen; bis dahin gilt die
        <a class="underline" href="/docs/terms-and-conditions">aktuelle AGB-Fassung</a>. Deine
        bestehenden Verträge ändern sich nur, wenn du ausdrücklich zustimmst (Ziffern 20.2 und
        20.3).
      </p>
      <p class="mt-card">
        Geändert sind der Kopf mit Beginn und Geltungsbereich und diese Ziffern:
      </p>
      <ul class="mt-card-sm">
        <li class="ml-10 list-disc mt-box">
          Alle Kurse sind kostenlos, und einzelne Kurse verkaufen wir nicht mehr. Früher gekaufte
          Kurse behältst du (Ziffern 1.1, 2.1, 2.2, 4.4, 5.4, 7 und 16.2).
        </li>
        <li class="ml-10 list-disc mt-box">
          Premium heißt Üben ohne Herzen und enthält keinen gesonderten Kurszugang mehr; früher
          bestellte Premium-Zeiträume behalten ihren Umfang (Ziffer 8.1).
        </li>
        <li class="ml-10 list-disc mt-box">
          Bei MorphCoins und Herzen bestellst du ohne Häkchen. Bei einer einzelnen
          Premium-Bestellung bleibt ein Häkchen für den frühen Start, wenn sie innerhalb der
          Widerrufsfrist beginnt (Ziffer 11.1).
        </li>
        <li class="ml-10 list-disc mt-box">
          Kurse kannst du auch als Gast öffnen; um in ihnen zu lernen, legst du ein Konto an (Ziffer
          3.1).
        </li>
        <li class="ml-10 list-disc mt-box">
          Mit 16 oder 17 Jahren brauchst du auch für das kostenlose Konto die Einwilligung deiner
          gesetzlichen Vertreter (Ziffer 12.2).
        </li>
        <li class="ml-10 list-disc mt-box">
          In der englischen Oberfläche gibt es die Angaben im Bestelldialog und die
          Widerrufsbelehrung auch auf Englisch (Ziffer 1.4).
        </li>
      </ul>
      <p class="mt-card">
        Ab demselben Tag gilt die neue
        <a class="underline" href="/docs/right-of-withdrawal-2026-10"
          >Widerrufsbelehrung, Fassung 2026-10</a
        >.
      </p>
    </aside>
    <TermsAndConditions202610 :effective-date="terms.date" />
  </div>
</template>

<script setup lang="ts">
import TermsAndConditions202610 from "../../components/legal/TermsAndConditions202610.vue";

const terms = terms202610();
if (!terms.published)
  throw createError({ statusCode: 404, statusMessage: "Not Found", fatal: true });
</script>
