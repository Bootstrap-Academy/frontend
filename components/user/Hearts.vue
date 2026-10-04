<!--
  The heart counter in the navigation bar. The API counts half hearts
  (`hearts_max` is 6), the interface shows whole hearts drawn in halves, which
  is the unit the interface uses: three hearts, one heart per incorrect solution.
-->
<template>
  <NuxtLink
    to="/subscription"
    :aria-label="label"
    class="group flex items-center gap-2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
  >
    <div v-if="!isPremmium" class="text-heading hover:text-white">
      <article class="flex h-10 items-center gap-1 rounded-full bg-tertiary px-5 py-2">
        <template v-for="slot of slots" :key="slot">
          <SvgFullHeart v-if="hearts >= slot * 2" :color="'accent'" class="h-3 w-3 sm:h-5 sm:w-5" />
          <SvgHalfHeart
            v-else-if="hearts === slot * 2 - 1"
            :color="'accent'"
            class="h-3 w-3 sm:h-5 sm:w-5"
          />
          <OutlineHeartIcon v-else class="h-4 w-4 text-accent sm:h-6 sm:w-6" />
        </template>

        <PlusIcon class="ml-1 block h-3 w-3 flex-shrink-0 sm:h-3.5 sm:w-3.5" />
      </article>
    </div>
    <div
      v-else-if="isPremmium"
      class="flex items-center justify-between gap-1 rounded-full bg-light px-3 py-1"
    >
      <SolidHeartIcon class="h-7 w-7 text-[#FFD700]" />
      <span class="-mt-1 text-lg text-[#FFD700]"> ∞ </span>
    </div>
  </NuxtLink>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { PlusIcon } from "@heroicons/vue/24/outline";
import { HeartIcon as SolidHeartIcon } from "@heroicons/vue/24/solid";
import { HeartIcon as OutlineHeartIcon } from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
import { useHeartInfo } from "~~/composables/hearts";

export default defineComponent({
  props: {
    sm: { type: Boolean, default: false },
  },
  components: { PlusIcon, SolidHeartIcon, OutlineHeartIcon },
  setup() {
    const loading = ref(true);
    const heartInfo: any = useHeartInfo();
    const premiumInfo: any = usePremiumInfo();
    const heartConfig = useHeartConfig();
    const hearts = computed(() => {
      return heartInfo.value?.hearts ?? 0;
    });
    const isPremmium = computed(() => {
      return premiumInfo.value?.premium ?? false;
    });

    // One entry per whole heart, so the row always shows how many are missing.
    const slots = computed(() =>
      Array.from({ length: heartSlots(heartConfig.value) }, (_, index) => index + 1)
    );

    // The drawn hearts are decorative; the link says the count in words.
    const { t, locale } = useI18n();
    const label = computed(() =>
      isPremmium.value
        ? t("Body.UnlimitedHearts")
        : t("Navigation.Hearts", {
            hearts: formatHearts(hearts.value, locale.value),
            max: slots.value.length,
          })
    );

    onMounted(async () => {
      await Promise.all([getHearts(), getPremiumStatus(), loadHeartConfig()]);
      loading.value = false;
    });

    return {
      loading,
      hearts,
      slots,
      label,
      isPremmium,
      OutlineHeartIcon,
      SolidHeartIcon,
    };
  },
});
</script>

<style scoped></style>
