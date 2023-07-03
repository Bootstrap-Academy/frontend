<template>
  <div
    :class="
      buttonOptions?.length > 2
        ? 'flex-col rounded-lg sm:flex-row sm:rounded-full'
        : 'rounded-full'
    "
    class="flex gap-3 p-2 w-fit bg-primary border border-accent"
  >
    <section
      @click="emitSelected(i)"
      v-for="(button, i) of buttonOptions"
      :key="i"
    >
      <p
        class="text-black text-xs sm:text-sm px-4 sm:px-6 md:px-8 cursor-pointer capitalize transition-all duration-300 font-semibold py-2 rounded-full"
        :class="[
          selectedOption == i ? 'bg-accent' : 'text-white',
          buttonOptions?.length > 2
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
import { PropType } from "vue";
import { useI18n } from "vue-i18n";
export default defineComponent({
  props: {
    modelValue: { type: Number, default: 0 },
    buttonOptions: { type: Array as PropType<any>, default: [] },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const { t } = useI18n();
    const selectedOption = ref(0);

    function emitSelected(selected: any) {
      selectedOption.value = selected;
      emit("update:modelValue", selected);
    }
    return { emitSelected, selectedOption, t };
  },
});
</script>

<style scoped></style>
