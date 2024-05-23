<template>
  <section class="container-fluid py-4 flex items-center justify-between">
    <!-- START -->
    <NuxtLink to="/" class="hidden lg:flex gap-card-sm items-center">
      <img
        src="/images/logo-text.png"
        :alt="t('AltAttributes.BootstrapAcademyLogo')"
        class="object-contain lg:w-28 xl:w-36 cursor-pointer"
      />
    </NuxtLink>
    <NavbarDrawer class="block lg:hidden" :links="links" />

    <!-- CENTER -->
    <nav
      class="w-fit hidden lg:flex flex-wrap justify-center place-self-center lg:gap-5 xl:gap-10"
    >
      <NuxtLink
        v-for="{ label, pathname } of links"
        :key="label"
        :to="pathname"
        class="link"
        exactActiveClass="active"
      >
        {{ t(label) }}
      </NuxtLink>
    </nav>

    <!-- END -->
    <NavbarMenu v-if="authorized" class="justify-self-end" />
    <NuxtLink v-else to="/auth/login" class="justify-self-end">
      <Btn>{{ t("Buttons.Login") }}</Btn>
    </NuxtLink>
  </section>
</template>

<script>
import { useI18n } from "vue-i18n";

export default {
  props: {
    links: { default: [] },
    authorized: { type: Boolean, default: false },
  },
  setup() {
    const { t } = useI18n();

    return { t };
  },
};
</script>

<style scoped>
.link {
  @apply transition-basic h-fit px-2.5 py-1.5 rounded hover:bg-tertiary border-b-2 border-primary uppercase lg:text-xs xl:text-sm tracking-widest text-body hover:text-heading;
}
.link.active {
  @apply text-body border-accent rounded-b-none;
}
</style>
