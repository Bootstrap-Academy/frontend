<template>
	<article class="flex" :class="[gap, horizontal ? 'flex-wrap' : 'flex-col']">
		<InputRadio
			v-for="(option, i) of options"
			:key="i"
			:name="name"
			:label="option.label"
			:value="option.value"
			v-model="input"
			:sm="sm"
			:data-tooltip="t(option.tooltip ?? '')"
		/>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    horizontal: { type: Boolean, default: false },
    sm: { type: Boolean, default: false },
    gap: { type: String, default: 'gap-card-sm' },
    options: { type: Array as PropType<any[]>, default: [] },
    label: { type: String, default: '' },
    name: { type: String, default: '' },
    modelValue: { default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, expose }) {
    const { t } = useI18n();

    const input = computed({
      get() {
        return props.modelValue;
      },
      set(value: string) {
        emit('update:modelValue', value);
      },
    });

    function reset() {
      input.value = '';
    }

    expose({ reset });

    return {
      t,
      input,
    };
  },
});
</script>

<style scoped></style>
