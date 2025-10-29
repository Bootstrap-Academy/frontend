<template>
  <div>
    <div class="flex flex-wrap items-center gap-card-sm">
      <label v-if="!noLabel" class="text-body-2 mb-2 block text-body font-body" :for="id ?? label">
        {{ t(label) }}
      </label>
      <p
        v-if="hint"
        class="relative z-0 pb-2 text-xs text-body"
        :class="noLabel ? 'text-left' : 'text-right'"
      >
        {{ t(hint) }}
      </p>
    </div>
    <input
      :disabled="disabled"
      class="relative z-10 block w-full appearance-none rounded-md px-4 py-3 text-base ring-2 transition duration-500 ease-out focus:outline-none focus:ring-offset-2"
      :class="[
        {
          'valid:ring-accent invalid:ring-error': (touched && input) || error,
          'cursor-not-allowed': disabled,
        },
        light
          ? 'bg-white text-subheading ring-subheading focus:ring-subheading focus:ring-offset-subheading'
          : 'bg-secondary text-white ring-tertiary focus:ring-accent focus:ring-offset-tertiary',
      ]"
      ref="DOM_INPUT"
      :placeholder="noLabel ? t(label) : t(placeholder)"
      :type="type"
      :name="name != '' ? name : label"
      :id="id != '' ? id : label"
      v-model="input"
      @blur="touched = true"
      :autocomplete="autocomplete"
      :min="min"
    />

    <p
      class="relative z-0 pt-2 text-xs text-error transition duration-500 ease-out"
      :class="error ? 'translate-y-0 opacity-100' : 'translate-y-[-100%] opacity-0'"
    >
      {{ error }}.
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    min: { type: String || Number, default: "" },
    autocomplete: { type: String, default: "true" },
    hint: { type: String, default: "" },
    name: { type: String, default: "" },
    id: { type: String, default: "" },
    type: { type: String, default: "text" },
    label: { type: String, default: "" },
    noLabel: { type: Boolean, default: false },
    noTrim: { type: Boolean, default: false },
    light: { type: Boolean, default: false },
    placeholder: { type: String, default: "" },
    rules: { type: Array, default: [] },
    modelValue: { default: "" },
    disabled: { type: Boolean, default: false },
    focusThis: { type: Boolean, default: false },
  },
  emits: ["update:modelValue", "valid"],
  setup(props, { emit }) {
    const { t } = useI18n();

    const input = computed({
      get() {
        return props.modelValue;
      },
      set(value: string) {
        emit("update:modelValue", value);
      },
    });

    const touched = ref(!!props.modelValue);

    const DOM_INPUT = ref<HTMLInputElement | null>(null);

    const error = computed(() => {
      if (!!!DOM_INPUT.value || (!touched.value && !input.value)) return "";

      let msg: string = "";

      props.rules
        .slice()
        .reverse()
        .forEach((rule: any) => {
          if (rule(input.value) != true) {
            const [string, placeholder] = rule(input.value).split("_");

            if (!!placeholder) {
              msg = t(string, {
                placeholder: t(placeholder),
              });
            } else if (!!string) {
              msg = t(string);
            } else {
              msg = t(rule(input.value));
            }
          }
        });

      DOM_INPUT.value.setCustomValidity(msg);
      emit("valid", !!!msg);
      return msg;
    });
    onMounted(() => {
      if (props.focusThis == true) {
        DOM_INPUT.value?.focus();
      }
    });
    return { t, input, error, DOM_INPUT, touched };
  },
});
</script>

<style scoped>
::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
</style>
