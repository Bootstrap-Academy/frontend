<template>
  <article>
    <div class="relative z-10 flex gap-4">
      <div class="relative">
        <input
          class="absolute z-10 cursor-pointer opacity-0"
          :class="sm ? 'h-4 w-4' : 'h-6 w-6'"
          type="checkbox"
          v-model="input"
          :id="id ?? label"
        />

        <div
          class="tick relative z-0"
          :class="sm ? 'sm h-4 w-4 ring-transparent' : 'h-6 w-6 ring-secondary'"
        >
          <CheckIcon class="icon" :class="[sm ? 'h-4 w-4 stroke-[3]' : 'h-5 w-5 stroke-[3]']" />
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
            class="inline-block h-fit w-fit text-accent hover:underline"
            :class="sm ? 'text-xs' : 'text-base'"
          >
            {{ $t(link?.label ?? "Home") }}.
          </NuxtLink>
        </span>
      </label>
    </div>
    <p
      v-if="required"
      class="relative z-0 pt-2 text-xs text-error transition duration-500 ease-out"
      :class="error ? 'translate-y-0 opacity-100' : 'translate-y-[-100%] opacity-0'"
    >
      {{ error ? $t(error) : "" }}.
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
    /**
     * Show the "this is required" message even though the box has never been
     * touched. Forms set this after a submit that was refused, so that a
     * required box the user simply left alone is pointed out.
     */
    showError: { type: Boolean, default: false },
    label: { type: String, default: "" },
    link: {
      type: Object as PropType<{ to: string; label: string }>,
      default: null,
    },
    modelValue: { default: false },
  },
  emits: ["update:modelValue", "valid"],
  setup(props, { emit }) {
    // ============================================================= refs
    const touched = ref(false);

    // ============================================================= computed
    const input = computed({
      get() {
        return props.modelValue;
      },
      set(value) {
        touched.value = true;
        emit("update:modelValue", value);
        emit("valid", !!value);
      },
    });

    // The message stays hidden until the user has touched the box or the form
    // asked for it, so an untouched form does not start out red.
    const error = computed(() =>
      props.required && !props.modelValue && (touched.value || props.showError)
        ? "Error.CheckboxRequired"
        : ""
    );

    // ============================================================= functions
    return { input, error };
  },
});
</script>

<style scoped>
input[type="checkbox"] + .tick {
  @apply flex items-center justify-center rounded-sm bg-heading ring-4 transition duration-200 focus:outline-none;
}
input[type="checkbox"] + .tick.sm {
  @apply ring-2;
}
input[type="checkbox"]:checked + .tick {
  @apply bg-accent ring-8 ring-tertiary;
}
input[type="checkbox"]:checked + .tick.sm {
  @apply ring-0;
}

input[type="checkbox"] + .tick > .icon {
  @apply stroke-transparent text-transparent;
}
input[type="checkbox"]:checked + .tick > .icon {
  @apply stroke-primary text-primary;
}
</style>
