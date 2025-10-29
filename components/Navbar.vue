<template>
  <section class="container-fluid flex items-center justify-between py-4">
    <!-- START -->
    <NuxtLink :to="authorized ? '/dashboard' : '/'" class="hidden items-center gap-card-sm lg:flex">
      <img
        src="/images/logo-text.png"
        :alt="t('AltAttributes.BootstrapAcademyLogo')"
        class="cursor-pointer object-contain lg:w-28 xl:w-36"
      />
    </NuxtLink>
    <NavbarDrawer class="block lg:hidden" :links="links" :authorized="authorized" />

    <!-- CENTER -->
    <nav class="hidden w-fit flex-wrap justify-center place-self-center lg:flex lg:gap-5 xl:gap-10">
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
  @apply h-fit rounded border-b-2 border-primary px-2.5 py-1.5 uppercase tracking-widest text-body transition-basic hover:bg-tertiary hover:text-heading lg:text-xs xl:text-sm;
}
.link.active {
  @apply rounded-b-none border-accent text-body;
}
</style>
