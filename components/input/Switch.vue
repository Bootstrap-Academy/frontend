<template>
  <div>
    <label class="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" value="" id="default-toggle" class="peer sr-only" v-model="input" />
      <div
        class="peer h-8 w-16 rounded-full bg-[#2d405c] p-2 duration-500 ease-out after:absolute after:left-[2px] after:top-[0.375rem] after:h-5 after:w-5 after:translate-x-[0.25rem] after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-[2.25rem]"
      ></div>
    </label>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const input = computed({
      get() {
        return props.modelValue;
      },
      set(value) {
        emit("update:modelValue", value);
      },
    });
    return { input };
  },
});
</script>

<style scoped></style>
