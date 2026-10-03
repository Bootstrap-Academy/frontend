<template>
  <div>
    <button
      type="button"
      class="flex h-11 w-11 items-center justify-center rounded text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      :aria-label="t('Navigation.OpenMenu')"
      :aria-expanded="show"
      :aria-controls="menuId"
      @click="show = true"
    >
      <Bars3Icon class="h-6 w-6" aria-hidden="true" />
    </button>

    <HeadlessDialog
      :id="menuId"
      :open="show"
      :initial-focus="closeButton"
      class="fixed inset-0 z-[10000]"
      @close="closeMenu"
    >
      <div class="bg-primary/60 fixed inset-0" aria-hidden="true" />
      <div class="fixed inset-0 flex">
        <DialogPanel
          class="h-full w-72 max-w-full overflow-y-auto bg-tertiary p-[5vw] shadow-2xl sm:p-9"
        >
          <DialogTitle class="sr-only">{{ t("Navigation.MainMenu") }}</DialogTitle>
          <div class="flex items-center justify-between gap-3">
            <NuxtLink :to="authorized ? '/dashboard' : '/'" @click="closeMenu">
              <img
                src="/images/logo-text.png"
                :alt="t('AltAttributes.BootstrapAcademyLogo')"
                class="w-28 object-contain"
              />
            </NuxtLink>
            <button
              ref="closeButton"
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              :aria-label="t('Navigation.CloseMenu')"
              @click="closeMenu"
            >
              <XMarkIcon class="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <nav :aria-label="t('Navigation.MainMenu')" class="mt-10 flex flex-col gap-10">
            <NuxtLink
              v-for="{ label, pathname } of links"
              :key="pathname"
              :to="pathname"
              class="h-fit rounded border-l-2 border-transparent px-2.5 py-1.5 text-sm uppercase tracking-widest text-body transition-basic hover:text-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              exact-active-class="active-link"
              @click="closeMenu"
            >
              {{ t(label) }}
            </NuxtLink>
          </nav>
        </DialogPanel>
      </div>
    </HeadlessDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, useId, watch } from "vue";
import { Dialog as HeadlessDialog, DialogPanel, DialogTitle } from "@headlessui/vue";
import { Bars3Icon, XMarkIcon } from "@heroicons/vue/24/solid";
import { useMediaQuery } from "@vueuse/core";
import { useI18n } from "vue-i18n";

defineProps<{
  links: { label: string; pathname: string }[];
  authorized: boolean;
}>();

const { t } = useI18n();
const menuId = useId();
const show = ref(false);
const closeButton = ref<HTMLButtonElement | null>(null);
const route = useRoute();
const desktop = useMediaQuery("(min-width: 1024px)");
function closeMenu() {
  show.value = false;
}
watch(() => route.fullPath, closeMenu);
watch(desktop, (value) => {
  if (value) closeMenu();
});
</script>
