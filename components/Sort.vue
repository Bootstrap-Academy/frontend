<template>
  <article class="flex h-fit flex-wrap-reverse items-center justify-between gap-2">
    <p class="flex-shrink-0 text-sm">
      {{ t("Headings.Result", { n: quantity }, quantity) }}
    </p>

    <div class="flex h-fit w-fit items-center justify-center gap-5">
      <label :for="selectId" class="flex-shrink-0 text-sm font-light text-body font-body">{{
        t(text)
      }}</label>
      <InputSelect :id="selectId" sm :options="options" btn-type v-model="selected" />
    </div>
  </article>
</template>

<script lang="ts">
import { defineComponent, useId } from "vue";
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
    const selectId = `${useId()}-sort`;

    watch(
      () => selected.value,
      (newValue, oldValue) => {
        emit("selected", newValue);
      }
    );

    return { t, selected, selectId };
  },
});
</script>

<style scoped></style>
