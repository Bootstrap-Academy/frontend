<template>
  <section
    class="hide-scrollbar container-fluid flex snap-x snap-mandatory items-center justify-between overflow-x-scroll bg-accent pt-card pb-card gap-container"
  >
    <img
      v-for="(sponsor, i) of sponsors"
      :key="i"
      :src="`/images/sponsors/${sponsor}.webp`"
      :alt="t('AltAttributes.SponsorLogo')"
      class="w-28 flex-shrink-0 snap-center object-contain opacity-80 transition duration-200 ease-out hover:opacity-100"
    />
  </section>
</template>

<script>
import { useI18n } from "vue-i18n";

export default {
  setup() {
    const { t } = useI18n();

    let sponsors = ["BWB", "FHDW", "GBI", "ITCS", "MT5", "WINGO"];

    return { t, sponsors };
  },
};
</script>

<style scoped>
img {
  filter: brightness(0) invert(1);
}
</style>
