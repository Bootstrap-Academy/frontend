<template>
	<div class="width">
		<article class="flex justify-between items-center gap-card">
			<label for="" class="text-heading-4 text-body font-heading">
				{{ label }}
			</label>

			<div class="text-heading-4 text-heading font-heading">
				{{ prefix }}{{ abbreviateNumber(value) }}
			</div>
		</article>
		<input
			ref="DOM_INPUT"
			type="range"
			class="w-full"
			:min="min"
			:max="max"
			v-model="value"
			@change="emitRange"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';

export default defineComponent({
  props: {
    min: { type: Number, default: 1500 },
    max: { type: Number, default: 9000 },
    modelValue: { type: Number, default: 4000 },
    label: { type: String, default: '' },
    prefix: { type: String, default: '' },
    reduce: { type: Number, default: 10 },
  },
  emits: ['update:modelValue', 'valid'],
  setup(props, { emit }) {
    const DOM_INPUT = ref<HTMLInputElement | null>(null);

    const value = ref(0);

    onMounted(() => {
      value.value = props.modelValue;
      setRange(props.modelValue);
    });

    watch(
      () => props.modelValue,
      (newValue, oldValue) => {
        value.value = newValue;
      }
    );

    function setRange(val: string | number) {
      let value = val;

      if (typeof value == 'string') {
        value = parseInt(value);
      }

      let total = props.max - props.min;
      let filled = value / total;
      let percent = filled * 100;
      percent = percent - props.reduce;

      if (!DOM_INPUT.value) return;
      DOM_INPUT.value.style.background = `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${percent}%, white ${percent}%,  white 100%)`;
    }

    function emitRange() {
      emit('update:modelValue', value.value);
    }

    watch(
      () => value.value,
      (newValue, oldValue) => {
        setRange(newValue);
      }
    );

    return { DOM_INPUT, setRange, emitRange, value };
  },
});
</script>

<style scoped>
.width {
	--margin-left: 1.5rem;
	width: calc(100% - var(--margin-left));
}
input[type='range'] {
	border-radius: 8px;
	height: 7px;
	outline: none;
	transition: background 450ms ease-in;
	-webkit-appearance: none;
	border: none;
}
input[type='range']::-webkit-slider-thumb {
	-webkit-appearance: none;
	background-color: var(--color-accent);
	width: 20px;
	height: 20px;
	border-radius: 20px;
	border: none;
	outline: none;
	cursor: pointer;
}
input[type='range']::-moz-range-thumb {
	-webkit-appearance: none;
	background-color: var(--color-accent);
	width: 20px;
	height: 20px;
	border-radius: 20px;
	border: none;
	outline: none;
	cursor: pointer;
}
</style>
