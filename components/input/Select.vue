<template>
  <article class="pb-5">
    <div class="flex flex-wrap items-center gap-card-sm" v-if="!!label">
      <label class="text-body-2 mb-2 block text-body font-body" :for="id ?? label">
        {{ t(label) }}
      </label>
      <p v-if="hint" class="relative z-0 pb-2 text-right text-xs text-body">
        {{ t(hint) }}
      </p>
    </div>
    <div
      class="relative h-fit w-fit cursor-pointer"
      :class="[
        btnType ? 'btn-type' : 'input-type',
        {
          sm: sm,
        },
      ]"
    >
      <select
        :name="id"
        :id="id"
        v-model="input"
        class="relative z-20 cursor-pointer appearance-none bg-transparent"
      >
        <option
          v-for="{ label, value } of options"
          :key="value"
          :value="value"
          class="bg-white text-black"
        >
          {{ t(label) }}
        </option>
      </select>

      <ChevronDownIcon class="icon absolute z-10" />
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { ChevronDownIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    hint: { type: String, default: "" },
    label: { type: String, default: "" },
    id: { type: String, default: "select" },
    sm: { type: Boolean, default: false },
    btnType: { type: Boolean, default: false },
    options: {
      default: [
        {
          label: "Headings.BestMatch",
          value: "bestMatch",
        },
        {
          label: "Headings.Latest",
          value: "latest",
        },
      ],
    },
    modelValue: { type: String, default: "" },
  },
  emits: ["update:modelValue", "valid"],
  components: { ChevronDownIcon },
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

    input.value = !!input.value ? input.value : props.options[1].value;

    const selectedOptionLabel = computed(() => {
      return (props.options.find((option) => option.value == input.value)?.label ?? "").toString();
    });

    return { input, t, selectedOptionLabel };
  },
});
</script>

<style scoped>
/* ========================================= Input Type */
.input-type {
  @apply rounded-md bg-secondary;
}
.input-type select {
  @apply rounded-md py-3 pl-4 pr-12 text-base text-white ring-2 ring-tertiary transition duration-500 ease-out font-body focus:outline-none focus:ring-accent focus:ring-offset-2 focus:ring-offset-tertiary;
}
.input-type select option {
  @apply bg-white text-black;
}
.input-type.sm select {
  @apply py-3 pl-3.5 pr-10 text-xs;
}
.input-type .icon {
  @apply right-3 top-4 h-4 w-4 text-accent;
}
.input-type.sm .icon {
  @apply right-3 top-3.5;
}

/* ======================================= Btn type */
.btn-type {
  @apply bg-transparent hover:bg-transparent;
}
.btn-type select {
  @apply h-fit w-fit rounded border border-accent py-3 pl-4 pr-12 text-base font-medium text-white outline-none font-body transition-basic focus:ring-4 focus:ring-tertiary;
}
.btn-type select option {
  @apply bg-white text-black;
}
.btn-type.sm select {
  @apply py-3 pl-3.5 pr-10 text-xs;
}
.btn-type .icon {
  @apply right-4 top-4 h-4 w-4 text-accent;
}
.btn-type.sm .icon {
  @apply right-3 top-3.5;
}
input {
  color-scheme: light;
}
</style>
