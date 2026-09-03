<template>
  <footer class="container-fluid relative z-0 flex flex-col items-center gap-7 bg-tertiary pt-8">
    <img
      src="/images/logo-text.png"
      :alt="t('AltAttributes.BootstrapAcademyLogo')"
      class="mb-5 block w-40 object-contain md:mt-2 lg:hidden"
    />

    <nav class="flex flex-wrap justify-center gap-container">
      <NuxtLink v-for="({ label, pathname }, i) of webLinks" :key="i" :to="pathname">
        {{ t(label) }}
      </NuxtLink>
    </nav>

    <article class="my-2.5 flex justify-center gap-10 md:my-5">
      <a href="https://twitter.com/TheMorpheusTuts" target="_blank">
        <IconTwitter class="fill-accent transition-basic hover:scale-125" />
      </a>
      <a href="https://www.instagram.com/TheMorpheusTuts/" target="_blank">
        <IconInstagram class="fill-accent transition-basic hover:scale-125" />
      </a>
      <a href="https://www.youtube.com/user/themorpheus407" target="_blank">
        <IconYoutube class="fill-accent transition-basic hover:scale-125" />
      </a>
      <a href="https://github.com/Bootstrap-Academy" target="_blank">
        <IconGithub class="fill-accent transition-basic hover:scale-125" />
      </a>
    </article>

    <section
      class="flex w-full flex-wrap-reverse justify-center border-t border-subheading py-6 gap-container midXl:flex-nowrap"
    >
      <p class="mt-0.5 text-center text-sm text-subheading md:text-left">
        Ⓒ {{ new Date().getFullYear() }}
        {{ t("Body.Copyright") }}
      </p>
      <nav class="flex flex-wrap justify-center gap-2.5 text-sm text-subheading md:gap-5">
        <template v-for="({ label, pathname }, i) of usefulLinks" :key="i">
          <span class="text-accent" v-if="i > 0">|</span>
          <NuxtLink :to="pathname" class="text-hover">
            {{ t(label) }}
          </NuxtLink>
        </template>
      </nav>
    </section>
  </footer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  setup() {
    const { t } = useI18n();

    let webLinks = [
      {
        label: "Links.Home",
        pathname: "/",
      },
      {
        label: "Links.SkillTree",
        pathname: "/skill-tree",
      },
      {
        label: "Links.Contact",
        pathname: "/contact",
      },
    ];

    let usefulLinks = [
      {
        label: "Links.Privacy",
        pathname: "/docs/privacy",
      },
      {
        label: "Links.TermsAndConditions",
        pathname: "/docs/terms-and-conditions",
      },
      {
        label: "Links.RightOfWithdrawal",
        pathname: "/docs/right-of-withdrawal",
      },
      {
        label: "Links.Imprint",
        pathname: "/docs/imprint",
      },
    ];

    return {
      webLinks,
      usefulLinks,
      t,
    };
  },
});
</script>

<style scoped>
footer a {
  @apply text-base text-body font-body transition-basic;
}
</style>
