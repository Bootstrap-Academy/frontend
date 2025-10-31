!
<template>
  <div class="rounded-md p-2">
    <div
      class="cursor-pointer rounded bg-info p-4 text-center font-bold text-primary"
      v-on:click="isOpen = !isOpen"
    >
      {{ t(title) }}
    </div>
    <Transition name="fade" mode="out-in">
      <div class="mt-4 flex w-full justify-center border-2 border-primary px-2 py-3" v-if="isOpen">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const props = defineProps<{
  title: string;
}>();

const { t } = useI18n();

const isOpen = ref(false);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 1s;
}
.fade-enter,
.fade-leave-to,
.fade-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
