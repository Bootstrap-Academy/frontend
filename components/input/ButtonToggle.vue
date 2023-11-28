<template>
  <div
    :class="[
      !!mobileResponsive
        ? 'flex-col rounded-lg sm:flex-row sm:rounded-full'
        : 'rounded-full',
      !!primary && !secondary ? 'bg-primary border border-accent' : '',
      secondary ? 'border border-light' : '',
    ]"
    class="flex gap-3 p-2 w-fit"
  >
    <section
      @click="emitSelected(i)"
      v-for="(button, i) of buttonOptions"
      :key="i"
    >
      <p
        class="text-black text-xs sm:text-sm px-4 sm:px-6 md:px-8 cursor-pointer capitalize transition-all duration-300 font-semibold py-2 rounded-full"
        :class="[
          selectedOption == i && primary && !!!secondary
            ? 'bg-accent'
            : 'text-white',

          selectedOption == i && secondary ? 'bg-light ' : '',

          !!mobileResponsive
            ? 'rounded-lg sm:flex-row sm:rounded-full'
            : 'rounded-full',
        ]"
      >
        {{ t(button.name) }}
      </p>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";
export default defineComponent({
  props: {
    modelValue: { type: Number, default: 0 },
    buttonOptions: { type: Array as PropType<any>, default: [] },
    primary: { type: Boolean, default: true },
    secondary: { type: Boolean, default: false },
    mobileResponsive: { type: Boolean, default: true },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const selectedOption = ref(0);

    watch(
      () => props.modelValue,
      (newValue, oldValue) => {
        selectedOption.value = newValue;
      },
      { immediate: true }
    );

    function emitSelected(selected: any) {
      // When in a list each button is associated with specific content based on its index,
      // hiding some of them becomes impossible due to the shifting indexes.
      // To support this use-case, each button may have an "id" field, making changes in indexes irrelevant.
      const idOfSelectedItem = props.buttonOptions[selected].id ?? selected;

      selectedOption.value = idOfSelectedItem;
      emit("update:modelValue", idOfSelectedItem);
    }
    return { emitSelected, selectedOption, t };
  },
});
</script>

<style scoped></style>
