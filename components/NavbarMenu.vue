<template>
  <button class="relative py-3 text-left" @blur="closeMenu">
    <div class="flex gap-4 items-center">
      <UserHearts />
      <UserCoins />

      <img
        @click="toggleMenu"
        :src="image"
        alt="user image"
        class="min-w-[2.5rem] min-h-[2.5rem] w-10 h-10 object-cover rounded-full"
      />
    </div>

    <Transition>
      <nav
        class="w-60 pt-4 absolute right-0 top-[115%] z-50 bg-tertiary grid gap-5 rounded overflow-clip shadow-2xl shadow-tertiary"
        v-if="show"
      >
        <NuxtLink
          v-for="({ label, pathname }, i) of links"
          :key="i"
          :to="pathname"
          class="h-fit w-full px-6 py-1.5 text-heading cursor-pointer"
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
import { ChevronDownIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

export default {
  components: { ChevronDownIcon },
  setup() {
    const { t } = useI18n();

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
        label: "Links.GetMorphcoins",
        pathname: "/morphcoins",
      },
    ];

    const show = ref(false);

    function closeMenu() {
      setTimeout(() => {
        show.value = false;
      }, 1000);
    }
    function toggleMenu() {
      show.value = !show.value;
    }
    async function onclickLogout() {
      await logout();
    }

    const user = useUser();
    const image = computed(() => {
      return user?.value?.avatar_url ?? "/images/about-2.webp";
    });
    return { links, show, closeMenu, toggleMenu, onclickLogout, t, image };
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
