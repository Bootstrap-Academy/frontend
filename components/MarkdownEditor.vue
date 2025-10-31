<template>
  <section class="markdown grid h-full max-h-[80vh] gap-card md:grid-cols-2">
    <textarea
      ref="DOM_TEXTAREA"
      v-model="markdown"
      class="h-full w-full resize-none overflow-scroll rounded-md px-4 py-2"
      rows="10"
    ></textarea>
    <div
      v-html="$md.render(markdown)"
      class="h-full max-h-[30vh] overflow-y-scroll rounded-md border-2 border-primary px-4 py-2"
    ></div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import { TrophyIcon } from "@heroicons/vue/24/outline";
import type { PropType } from "vue";

export default defineComponent({
  props: {
    data: { type: Object as PropType<any>, default: null },
    modelValue: { default: "" },
  },
  components: { TrophyIcon },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const { t } = useI18n();

    const markdown = computed({
      get() {
        return props.modelValue;
      },
      set(value: string) {
        emit("update:modelValue", value);
      },
    });

    return {
      t,
      markdown,
    };
  },
});
</script>

<style scoped></style>
