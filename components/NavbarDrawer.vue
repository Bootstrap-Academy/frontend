<template>
  <div>
    <Icon class="cursor-pointer" :icon="Bars3Icon" @click="toggleMenu" />

    <Transition>
      <section
        v-if="show"
        class="fixed left-0 top-0 z-[10000] h-screen w-screen"
        @click.self="closeMenu"
      >
        <aside class="h-full w-72 bg-tertiary p-[5vw] shadow-2xl sm:p-9">
          <NuxtLink :to="authorized ? '/dashboard' : '/'" class="flex items-center gap-card-sm">
            <img
              src="/images/logo-text.png"
              :alt="t('AltAttributes.BootstrapAcademyLogo')"
              class="w-28 cursor-pointer object-contain"
            />
          </NuxtLink>

          <nav class="mt-10 flex flex-col gap-10">
            <NuxtLink
              v-for="({ label, pathname }, i) of links"
              :key="i"
              :to="pathname"
              class="h-fit rounded rounded-t-none border-l-2 border-transparent px-2.5 py-1.5 text-sm uppercase tracking-widest text-body transition-basic hover:bg-tertiary hover:text-heading"
              exactActiveClass="active-link"
              @click.prevent="closeMenu"
            >
              {{ t(label) }}
            </NuxtLink>
          </nav>
        </aside>
      </section>
    </Transition>
  </div>
</template>

<script>
import { Bars3Icon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

export default {
  components: { Bars3Icon },
  props: {
    links: { default: [] },
    authorized: { type: Boolean, default: false },
  },
  setup() {
    const { t } = useI18n();

    const show = ref(false);

    function closeMenu() {
      setTimeout(() => {
        show.value = false;
      }, 100);
    }
    function toggleMenu() {
      show.value = !show.value;
    }

    return { show, closeMenu, toggleMenu, Bars3Icon, t };
  },
};
</script>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: all 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateX(-50%);
}
</style>
