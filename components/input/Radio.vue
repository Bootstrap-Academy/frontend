<template>
  <article>
    <div class="form-radio relative z-10 flex items-center gap-4">
      <input
        class="form-radio-input flex cursor-pointer appearance-none items-center justify-center rounded-3xl bg-white text-center text-base font-light text-white ring-4 transition duration-200 font-body checked:bg-accent checked:ring-tertiary focus:outline-none"
        :class="
          sm ? 'h-4 w-4 ring-transparent checked:ring-0' : 'h-6 w-6 ring-secondary checked:ring-8'
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
      class="relative z-0 translate-y-[-100%] pt-2 text-xs text-error transition duration-500 ease-out"
      :class="{
        'translate-y-0': error,
      }"
    >
      {{ error }}.
    </p>
  </article>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    value: { type: String, default: "" },
    name: { type: String, default: "" },
    sm: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    label: { type: String, default: "" },
    link: {
      type: Object as PropType<{ to: string; label: string }>,
      default: null,
    },
    modelValue: { default: false },
  },
  emits: ["update:modelValue", "valid"],
  setup(props, { emit }) {
    const { t } = useI18n();

    // ============================================================= computed
    const input = computed({
      get() {
        return props.modelValue;
      },
      set(value) {
        emit("update:modelValue", value);
        error.value = value ? "" : "This is required";
        emit("valid", !!!error.value);
      },
    });

    // ============================================================= refs
    const error = ref("");

    // ============================================================= functions
    return { input, error, t };
  },
});
</script>

<style scoped></style>
