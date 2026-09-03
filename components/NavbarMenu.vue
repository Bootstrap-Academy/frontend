<template>
  <button class="relative py-3 text-left" @blur="closeMenu">
    <div class="flex items-center gap-1 sm:gap-2 md:gap-4">
      <UserHearts />
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
        <Avatar
          @click="toggleMenu"
          :name="displayName"
          class="h-10 min-h-[2.5rem] w-10 min-w-[2.5rem]"
        />
      </div>
    </div>

    <Transition>
      <nav
        class="absolute right-0 top-[115%] z-50 grid w-60 gap-5 overflow-clip rounded bg-tertiary pt-4 shadow-2xl shadow-tertiary"
        v-if="show"
      >
        <NuxtLink
          v-for="({ label, pathname }, i) of links"
          :key="i"
          :to="pathname"
          class="h-fit w-full cursor-pointer px-6 py-1.5 text-heading"
          @click="closeMenu"
        >
          {{ t(label) }}
        </NuxtLink>

        <Btn @click="onclickLogout" full>{{ t("Buttons.Logout") }}</Btn>
      </nav>
    </Transition>
  </button>
</template>

<script>
import { ChevronDownIcon, SparklesIcon, CheckBadgeIcon } from "@heroicons/vue/24/solid";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useNow, useDateFormat } from "@vueuse/core";
import { usePremiumInfo } from "~~/composables/premiumFeature";

export default {
  components: { ChevronDownIcon, SparklesIcon, CheckBadgeIcon },
  setup() {
    const { t } = useI18n();
    const premiumInfo = usePremiumInfo();
    const show = ref(false);
    const isPremium = computed(() => {
      return premiumInfo.value?.premium;
    });
    const router = useRouter();
    let links = [
      {
        label: "Links.MyProfile",
        pathname: "/profile",
      },
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
      {
        label: "Links.GetMorphcoins",
        pathname: "/morphcoins",
      },
    ];

    const validTill = computed(() => {
      const from = useDateFormat(premiumInfo.value?.since * 1000, "MMMM DD, YYYY");
      const to = useDateFormat(premiumInfo.value?.until * 1000, "MMMM DD, YYYY");
      return ` ${t("Headings.Since")}  ${from.value} ${t("Headings.Until")} ${to.value}`;
    });

    function closeMenu() {
      setTimeout(() => {
        show.value = false;
      }, 1000);
    }
    function toggleMenu() {
      show.value = !show.value;
    }
    async function onclickLogout() {
      try {
        await logout();
        // console.log("back");
        // router.push("/auth/login");
      } catch (error) {}
    }

    const user = useUser();
    const displayName = computed(() => {
      return user?.value?.display_name ?? "";
    });
    return {
      links,
      show,
      closeMenu,
      toggleMenu,
      onclickLogout,

      isPremium,
      t,
      displayName,
      validTill,
    };
  },
};
</script>

<style scoped>
/* we will explain what these classes do next! */
.v-enter-active,
.v-leave-active {
  transition: all 0.5s ease-out;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateY(25%);
}
</style>
