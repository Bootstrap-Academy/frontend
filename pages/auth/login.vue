<template>
  <main
    class="h-screen-inner min container-fluid grid grid-cols-1 items-center gap-container pt-container pb-container midXl:grid-cols-[auto_minmax(0,0.8fr)]"
  >
    <section class="container-form">
      <h1 class="text-heading-3 mb-6 text-center md:mb-8">
        {{ t("Forms.Login") }}
      </h1>

      <FormLogin />

      <!--
        The note about accounts that moved here from the-morpheus.cc concerns few who log in.
        It stands below the form and unfolds for those it is for.

        The first field of the form holds the focus when the page opens, and a field that
        loses the focus empty reports itself as required. Pressing the line would take the
        focus away, so the press leaves it where it is; the click still unfolds the note.
      -->
      <details class="text-body mt-card">
        <summary
          @mousedown.prevent
          class="text-body-1 cursor-pointer font-body focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {{ t("Body.ChallengesNicknameQuestion") }}
        </summary>
        <p class="text-body-1 mt-2">{{ t("Body.ChallengesNickname") }}</p>
      </details>
    </section>

    <article class="hidden flex-col items-center gap-8 midXl:flex">
      <SectionTitle
        center
        subheading="Buttons.Login"
        heading="Headings.WelcomeBack"
        body="Body.Login"
      />
      <SvgLogin class="max-w-3xl" />
    </article>
  </main>
</template>

<script>
import { useI18n } from "vue-i18n";

definePageMeta({ layout: "inner" });

export default {
  setup() {
    const { t } = useI18n();
    useHead(() => ({ title: `${t("Buttons.Login")} · Bootstrap Academy` }));

    return { t };
  },
};
</script>
