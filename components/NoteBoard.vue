<template>
  <div :class="bgClasses" class="px-5 py-3 rounded-md">
    <section>
      <component :is="icon" class="h-6 w-6 text-white inline-block mr-5" />
      <p
        :class="textClasses"
        class="font-semibold text-xl inline-block text-dark"
      >
        {{ t(heading) }}
      </p>
    </section>
    <p class="text-white pl-11" :class="textClasses">{{ t(content) }}</p>
  </div>
</template>

<script setup lang="ts">
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckIcon,
  NoSymbolIcon,
} from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";

const props = defineProps({
  heading: { type: String, default: "default heading" },
  content: { type: String, default: "default content" },
  NoteType: { type: String, default: "error" },
});

const { t } = useI18n();
const icon = computed(() => {
  if (props.NoteType == "error") return NoSymbolIcon;
  else if (props.NoteType == "info") return InformationCircleIcon;
  else if (props.NoteType == "warning") return ExclamationTriangleIcon;
  else if (props.NoteType == "success") return CheckIcon;
});

// const iconClasses = computed(() => {
//   return [
//     {
//       "text-error": props.NoteType == "error",
//       "text-info": props.NoteType == "info",
//       "text-warning": props.NoteType == "warning",
//       "text-success": props.NoteType == "success",
//     },
//   ];
// });

const bgClasses = computed(() => {
  return [
    {
      "bg-error": props.NoteType == "error",
      "bg-info": props.NoteType == "info",
      "bg-warning": props.NoteType == "warning",
      "bg-success": props.NoteType == "success",
    },
  ];
});

const textClasses = computed(() => {
  return [
    {
      //   "text-white": props.NoteType == "error",
      //   "text-info": props.NoteType == "info",
      //   "text-warning": props.NoteType == "warning",
      //   "text-success": props.NoteType == "success",
    },
  ];
});
</script>

<style scoped></style>
