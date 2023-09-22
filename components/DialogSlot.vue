<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot,
} from "@headlessui/vue";
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

      <div class="fixed bg-lightGray inset-0 z-10 overflow-y-auto">
        <div
          class="flex min-h-full justify-center text-center items-center sm:p-0"
        >
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
              class="border border-accent relative transform overflow-hidden rounded-lg px-4 pt-5 pb-4 bg-primary text-left shadow-xl transition-all sm:my-8 sm:p-6"
            >
              <div class="flex justify-between items-center mb-5">
                <p class="font-semibold">{{ t(label) }}</p>
                <XMarkIcon
                  v-if="showCross"
                  @click="close()"
                  class="h-5 w-5 relative cursor-pointer text-white"
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
