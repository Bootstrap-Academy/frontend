<template>
  <article>
    <div class="flex gap-4 relative z-10">
      <div class="relative">
        <input
          class="absolute z-10 opacity-0 cursor-pointer"
          :class="sm ? ' h-4 w-4' : 'h-6 w-6'"
          type="checkbox"
          v-model="input"
          :id="id ?? label"
        />

        <div
          class="relative tick z-0"
          :class="sm ? 'h-4 w-4 ring-transparent sm' : 'h-6 w-6 ring-secondary'"
        >
          <CheckIcon
            class="icon"
            :class="[sm ? ' h-4 w-4 stroke-[3]' : 'h-5 w-5 stroke-[3]']"
          />
        </div>
      </div>
      <label class="flex gap-3 text-body font-body" :for="id ?? label">
        <span :class="sm ? 'text-xs' : 'text-body-1'"
          >{{ $t(label) }}

          <NuxtLink
            v-if="link"
            :to="link?.to ?? '/'"
            blank
            :target="target"
            class="hover:underline text-accent inline-block h-fit w-fit"
            :class="sm ? 'text-xs' : 'text-base'"
          >
            {{ $t(link?.label ?? "Home") }}.
          </NuxtLink>
        </span>
      </label>
    </div>
    <p
      v-if="required"
      class="transition ease-out duration-500 pt-2 text-xs text-error relative z-0"
      :class="
        error ? 'translate-y-0 opacity-100' : 'translate-y-[-100%] opacity-0'
      "
    >
      {{ error }}.
    </p>
  </article>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import type { PropType } from "vue";
import { CheckIcon } from "@heroicons/vue/24/solid";

export default defineComponent({
  components: { CheckIcon },
  props: {
    sm: { type: Boolean, default: false },
    target: { type: String, default: "" },
    id: { type: String, default: "" },
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
    return { input, error };
  },
});
</script>

<style scoped>
input[type="checkbox"] + .tick {
  @apply rounded-sm bg-heading focus:outline-none transition duration-200 flex items-center justify-center ring-4;
}
input[type="checkbox"] + .tick.sm {
  @apply ring-2;
}
input[type="checkbox"]:checked + .tick {
  @apply bg-accent ring-tertiary ring-8;
}
input[type="checkbox"]:checked + .tick.sm {
  @apply ring-0;
}

input[type="checkbox"] + .tick > .icon {
  @apply text-transparent stroke-transparent;
}
input[type="checkbox"]:checked + .tick > .icon {
  @apply text-primary stroke-primary;
}
</style>
