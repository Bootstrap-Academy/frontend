<template>
	<div>
		<label class="inline-flex relative items-center cursor-pointer">
			<input
				type="checkbox"
				value=""
				id="default-toggle"
				class="sr-only peer"
				v-model="input"
			/>
			<div
				class="p-2 w-16 h-8 rounded-full peer bg-[#2d405c] peer-checked:bg-accent after:translate-x-[0.25rem] peer-checked:after:translate-x-[2.25rem] after:content-[''] after:absolute after:top-[0.375rem] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all duration-500 ease-out"
			></div>
		</label>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const input = computed({
      get() {
        return props.modelValue;
      },
      set(value) {
        emit('update:modelValue', value);
      },
    });
    return { input };
  },
});
</script>

<style scoped></style>
