<template>
  <div
    :class="[
      !!mobileResponsive ? 'flex-col rounded-lg sm:flex-row sm:rounded-full' : 'rounded-full',
      !!primary && !secondary ? 'border border-accent bg-primary' : '',
      secondary ? 'border border-light' : '',
    ]"
    class="flex w-fit gap-3 p-2"
  >
    <section
      v-for="(button, i) of options"
      :key="i"
      @click="!button.disabled ? emitSelected(i) : null"
    >
      <p
        class="cursor-pointer rounded-full px-2 py-2 text-xs font-semibold capitalize text-black transition-all duration-300 sm:px-6 sm:text-sm md:px-8"
        :class="[
          {
            'px-2.5': smInMobile,
            'px-4': !smInMobile,
          },
          selectedOption == i && primary && !secondary ? 'bg-accent' : 'text-white',
          selectedOption == i && secondary ? 'bg-light' : '',
          button.disabled ? 'opacity-50' : '',
          mobileResponsive ? 'rounded-lg sm:flex-row sm:rounded-full' : 'rounded-full',
        ]"
      >
        {{ t(button.name) }}
      </p>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
const props = defineProps({
  modelValue: { type: Number, default: 0 },
  buttonOptions: { type: Array as PropType<any>, default: [] },
  primary: { type: Boolean, default: true },
  secondary: { type: Boolean, default: false },
  mobileResponsive: { type: Boolean, default: true },
  smInMobile: { type: Boolean, default: false },
});

const emits = defineEmits(["update:modelValue"]);
const { t } = useI18n();
const selectedOption = ref(0);

const options = computed(() => props.buttonOptions);

watch(
  () => props.modelValue,
  (newValue, oldValue) => {
    selectedOption.value = newValue;
    if (options.value[selectedOption.value]?.disabled) {
      selectedOption.value = 0;
      emits("update:modelValue", 0);
    }
  },
  { immediate: true }
);

watch(
  () => options.value,
  (newOptions) => {
    if (newOptions[selectedOption.value]?.disabled) {
      selectedOption.value = 0;
      emits("update:modelValue", 0);
    }
  }
);

function emitSelected(selected: any) {
  selectedOption.value = selected;
  emits("update:modelValue", selected);
}
</script>
