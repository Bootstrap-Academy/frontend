<template>
  <div ref="root">
    <Input
      :label="label"
      v-model="input"
      @valid="emitValid($event)"
      :rules="rules"
      :noLabel="noLabel"
      :placeholder="placeholder"
      :type="type"
      :name="name"
      :id="id"
      no-trim
      hint="Body.AddTags"
    />
    <div class="relative z-30 mt-2 min-h-[35px]">
      <div class="flex flex-wrap gap-3" v-if="tags && tags.length > 0">
        <TransitionGroup mode="out-in" name="slide-up">
          <Chip v-for="tag of tags" :key="tag">
            {{ tag }}
            <button
              :ref="(el) => setRemover(tag, el)"
              type="button"
              class="-m-1 rounded-full p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[currentColor]"
              :aria-label="t('Buttons.RemoveTag', { tag })"
              @click="onclickRemoveTag(tag)"
            >
              <XMarkIcon class="h-4 w-4" aria-hidden="true" />
            </button>
          </Chip>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { XMarkIcon } from "@heroicons/vue/24/solid";
import { defineComponent, nextTick } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  components: { XMarkIcon },
  props: {
    name: { type: String, default: "" },
    id: { type: String, default: "" },
    type: { type: String, default: "text" },
    label: { type: String, default: "" },
    noLabel: { type: Boolean, default: false },
    placeholder: { type: String, default: "" },
    rules: { type: Array, default: [] },
    modelValue: { type: Array as PropType<string[]>, default: [] },
  },
  emits: ["update:modelValue", "valid"],
  setup(props, { emit }) {
    const { t } = useI18n();

    const root = ref<HTMLElement | null>(null);
    const input = ref("");
    const isValid = ref(true);
    const removers = new Map<string, HTMLElement>();
    function setRemover(tag: string, el: unknown) {
      if (el instanceof HTMLElement) removers.set(tag, el);
      else removers.delete(tag);
    }

    const tags = computed(() => {
      if (!isValid.value || !!!input.value.includes(" ")) {
        return [...props.modelValue];
      }

      let arr: string[] = input.value.split(" ");

      arr = arr.filter((string) => !!string);
      arr = [...props.modelValue, ...arr];
      arr = [...new Set(arr)];

      emit("update:modelValue", [...arr]);

      input.value = "";

      return arr;
    });

    function onclickRemoveTag(chip: string) {
      const index = props.modelValue.indexOf(chip);
      let newArr = props.modelValue.filter((item) => item != chip);
      emit("update:modelValue", newArr);
      // Focus stays in the list: on the next tag's remove button, or the field once none is left.
      nextTick(() =>
        (
          removers.get(newArr[index] ?? newArr[index - 1] ?? "") ??
          root.value?.querySelector("input")
        )?.focus()
      );
    }

    function emitValid(valid: boolean) {
      isValid.value = valid;
      emit("valid", valid);
    }

    return { t, root, emitValid, input, tags, setRemover, onclickRemoveTag };
  },
});
</script>
