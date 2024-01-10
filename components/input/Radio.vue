<template>
	<article>
		<div class="form-radio flex items-center gap-4 relative z-10">
			<input
				class="form-radio-input rounded-3xl appearance-none bg-white checked:bg-accent focus:outline-none transition duration-200 cursor-pointer text-white text-base font-body text-center font-light flex items-center justify-center ring-4 checked:ring-tertiary"
				:class="
					sm
						? 'h-4 w-4 ring-transparent checked:ring-0'
						: 'h-6 w-6 ring-secondary checked:ring-8'
				"
				type="radio"
				v-model="input"
				:value="value"
				:id="label"
				:name="name"
			/>
			<label
				class="form-radio-label text-body font-body"
				:class="sm ? 'text-sm' : 'text-base'"
				:for="label"
			>
				{{ t(label) }}
			</label>
		</div>
		<p
			v-if="required"
			class="transition ease-out duration-500 translate-y-[-100%] pt-2 text-xs text-error relative z-0"
			:class="{
				'translate-y-0': error,
			}"
		>
			{{ error }}.
		</p>
	</article>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    value: { type: String, default: '' },
    name: { type: String, default: '' },
    sm: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    label: { type: String, default: '' },
    link: {
      type: Object as PropType<{ to: string; label: string }>,
      default: null,
    },
    modelValue: { default: false },
  },
  emits: ['update:modelValue', 'valid'],
  setup(props, { emit }) {
    const { t } = useI18n();

    // ============================================================= computed
    const input = computed({
      get() {
        return props.modelValue;
      },
      set(value) {
        emit('update:modelValue', value);
        error.value = value ? '' : 'This is required';
        emit('valid', !!!error.value);
      },
    });

    // ============================================================= refs
    const error = ref('');

    // ============================================================= functions
    return { input, error, t };
  },
});
</script>

<style scoped></style>
