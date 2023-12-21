<template>
	<article class="flex" :class="[gap, horizontal ? 'flex-wrap' : 'flex-col']">
		<InputCheckbox
			v-for="({ label, value }, i) of mappedOptions"
			:key="i"
			:name="name"
			:label="label"
			:value="value"
			v-model="mappedOptions[i].selected"
			:sm="sm"
		/>
	</article>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    horizontal: { type: Boolean, default: false },
    sm: { type: Boolean, default: false },
    gap: { type: String, default: 'gap-card-sm' },
    options: { default: [] },
    label: { type: String, default: '' },
    name: { type: String, default: '' },
    modelValue: { default: [] },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, expose }) {
    const { t } = useI18n();

    const mappedOptions: any[] = reactive([]);

    watch(
      () => props.options,
      (newValue, oldValue) => {
        setMappedOptions(newValue);
      },
      { deep: true, immediate: true }
    );

    watch(
      () => mappedOptions,
      (newValue, oldValue) => {
        let arr = newValue.filter((option) => option.selected == true);
        arr = arr.map((option) => option.value);
        emit('update:modelValue', arr);
      },
      { deep: true }
    );

    function setMappedOptions(newValue: any[], falseOnly = false) {
      let arr = newValue.map((option) => {
        let currentOption = props.modelValue.find(
          (value) => option.value == value
        );
        return { ...option, selected: falseOnly ? false : !!currentOption };
      });
      Object.assign(mappedOptions, [...arr]);
    }

    function reset() {
      setMappedOptions(props.options, true);
    }

    expose({ reset });

    return {
      t,
      mappedOptions,
    };
  },
});
</script>

<style scoped></style>
