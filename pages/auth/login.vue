<template>
  <main
    class="h-screen-inner min container-fluid grid grid-cols-1 items-center gap-container pt-container pb-container midXl:grid-cols-[auto_minmax(0,0.8fr)]"
  >
    <section class="container-form">
      <h1 class="text-heading-3 mb-2 text-center">
        {{ t("Forms.Login") }}
      </h1>
      <p class="text-body-1 mb-6 md:mb-8">{{ t("Body.ChallengesNickname") }}</p>

      <FormLogin />
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

    onMounted(async () => await getOAuthProviders());

    return { t };
  },
};
</script>
