<template>
  <article class="flex h-fit flex-wrap-reverse items-center justify-between gap-2">
    <p class="flex-shrink-0 text-sm">
      {{ t("Headings.Result", { n: quantity }, quantity) }}
    </p>

    <div class="flex h-fit w-fit items-center justify-center gap-5">
      <p class="flex-shrink-0 text-sm">{{ t(text) }}</p>
      <InputSelect id="sort" sm :options="options" btn-type v-model="selected" />
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    text: { type: String, default: "Headings.SortBy" },
    quantity: { type: Number, default: 0 },
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
  },
  emits: ["selected"],
  setup(props, { emit }) {
    const { t } = useI18n();

    const selected = ref();

    watch(
      () => selected.value,
      (newValue, oldValue) => {
        emit("selected", newValue);
      }
    );

    return { t, selected };
  },
});
</script>

<style scoped></style>
