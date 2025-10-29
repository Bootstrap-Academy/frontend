<script setup lang="ts">
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from "@headlessui/vue";
import { useDialogSlot } from "../composables/dialogSlot";
import { XMarkIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

const props = defineProps({
  label: { type: String, defalt: "" },
  showCross: { type: Boolean, default: true },
  propClass: { type: String, default: "" },
});
const emits = defineEmits(["closeFunction"]);

const { t }: any = useI18n();
const open: any = useDialogSlot();
function close() {
  open.value = false;
  emits("closeFunction");
}
</script>

<template>
  <TransitionRoot as="template" :show="open">
    <Dialog as="div" class="relative z-10" @close="closeDialog()">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 backdrop-blur-sm transition-opacity" />
      </TransitionChild>

      <div class="bg-lightGray fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center text-center sm:p-0">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              :class="propClass ? propClass : ''"
              class="relative transform overflow-hidden rounded-lg border border-accent bg-primary px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:p-6"
            >
              <div class="mb-5 flex items-center justify-between">
                <p class="font-semibold">{{ t(label) }}</p>
                <XMarkIcon
                  v-if="showCross"
                  @click="close()"
                  class="relative h-5 w-5 cursor-pointer text-white"
                />
              </div>
              <slot />
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
