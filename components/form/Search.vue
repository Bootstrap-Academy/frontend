<template>
  <form class="flex h-fit w-full max-w-sm items-center overflow-clip rounded bg-accent shadow-xl">
    <input
      type="text"
      :placeholder="translatedPlaceholder"
      @change="onchange"
      v-model.trim="search"
      class="text-body-1 w-full px-4 py-2 text-primary outline-none font-body placeholder:text-body-1 placeholder:text-secondary placeholder:font-body"
    />

    <button @click.prevent="onclickForceSearch" class="bg-accent px-4">
      <MagnifyingGlassIcon class="h-5 w-5 fill-white" />
    </button>
  </form>
</template>

<script>
import { MagnifyingGlassIcon } from "@heroicons/vue/24/solid";
import { useI18n } from "vue-i18n";

export default {
  props: {
    placeholder: { type: String, default: "" },
    modelValue: { type: String, default: "" },
  },
  emits: ["update:modelValue"],
  components: { MagnifyingGlassIcon },
  setup(props, { emit }) {
    const search = ref(props.modelValue);

    function onchange() {
      emit("update:modelValue", search.value);

      // if (search.value.length == 1) {
      // 	emit('update:modelValue', search.value);
      // } else if (search.value.length >= props.modelValue.length + 3) {
      // 	emit('update:modelValue', search.value);
      // } else if (search.value.length <= props.modelValue.length - 3) {
      // 	emit('update:modelValue', search.value);
      // } else if (!!!search.value.length) {
      // 	emit('update:modelValue', search.value);
      // }
    }

    function onclickForceSearch() {
      emit("update:modelValue", search.value + " ");
    }

    const { t } = useI18n();

    const translatedPlaceholder = computed(() => {
      return t(props.placeholder);
    });

    return {
      MagnifyingGlassIcon,
      translatedPlaceholder,
      search,
      onclickForceSearch,
      onchange,
    };
  },
};
</script>

<style scoped></style>
