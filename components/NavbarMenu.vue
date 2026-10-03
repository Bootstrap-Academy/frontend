<template>
  <Popover v-slot="{ close }" class="relative py-3">
    <div class="flex items-center gap-1 sm:gap-2 md:gap-4">
      <UserHearts v-if="showHearts" />
      <UserCoins />

      <div class="relative">
        <Tooltip
          v-if="isPremium"
          class="absolute -right-2 -top-2"
          :heading="'Headings.Premium'"
          :content="validTill"
          :placement="'right'"
        >
          <CheckBadgeIcon class="h-6 w-6 text-[#d4af37]" />
        </Tooltip>
        <PopoverButton
          type="button"
          :aria-label="t('Navigation.AccountMenu')"
          class="rounded-full p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Avatar :name="displayName" class="h-10 w-10" aria-hidden="true" />
        </PopoverButton>
      </div>
    </div>

    <PopoverPanel
      as="nav"
      focus
      :aria-label="t('Navigation.AccountMenu')"
      class="absolute right-0 top-full z-50 grid w-60 max-w-[calc(100vw-2rem)] gap-5 rounded bg-tertiary pt-4 shadow-2xl shadow-tertiary"
    >
      <NuxtLink
        v-for="({ label, pathname }, i) of links"
        :key="i"
        :to="pathname"
        class="h-fit w-full cursor-pointer px-6 py-1.5 text-heading"
        @click="close"
      >
        {{ t(label) }}
      </NuxtLink>

      <Btn
        @click="
          close();
          onclickLogout();
        "
        full
        >{{ t("Buttons.Logout") }}</Btn
      >
    </PopoverPanel>
  </Popover>
</template>

<script>
import { CheckBadgeIcon } from "@heroicons/vue/24/solid";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/vue";
import { useI18n } from "vue-i18n";
import { useDateFormat } from "@vueuse/core";
import { usePremiumInfo } from "~~/composables/premiumFeature";

export default {
  components: { CheckBadgeIcon, Popover, PopoverButton, PopoverPanel },
  setup() {
    const { t } = useI18n();
    const premiumInfo = usePremiumInfo();
    const { showHearts } = useDailyLearning();
    const isPremium = computed(() => {
      return premiumInfo.value?.premium;
    });
    const links = [
      {
        label: "Links.MyAccount",
        pathname: "/account",
      },
      {
        label: "Links.Subscription",
        pathname: "/subscription",
      },
      {
        label: "Links.LeaderBoard",
        pathname: "/challenges/leader-board",
      },
    ];

    const validTill = computed(() => {
      const from = useDateFormat(premiumInfo.value?.since * 1000, "MMMM DD, YYYY");
      const to = useDateFormat(premiumInfo.value?.until * 1000, "MMMM DD, YYYY");
      return ` ${t("Headings.Since")}  ${from.value} ${t("Headings.Until")} ${to.value}`;
    });

    async function onclickLogout() {
      await logout();
    }

    const user = useUser();
    const displayName = computed(() => {
      return user?.value?.display_name ?? "";
    });
    return {
      showHearts,
      links,
      onclickLogout,

      isPremium,
      t,
      displayName,
      validTill,
    };
  },
};
</script>
