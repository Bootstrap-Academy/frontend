<template>
  <article>
    <label v-if="label" class="text-body-2 mb-2 block text-body font-body md:mb-1">
      {{ t(label) }}
    </label>
    <article class="z-3 relative flex gap-2">
      <StarIcon
        v-for="n in 5"
        :key="n"
        class="h-6 w-6 flex-shrink-0 cursor-pointer md:h-10 md:w-10"
        :class="[n <= input ? theme.text : 'text-subheading']"
        @click="input = n"
      />
    </article>

    <p
      class="relative z-0 pt-2 text-xs text-error transition duration-500 ease-out"
      :class="error ? 'opacity-100' : 'opacity-0'"
    >
      {{ error }}.
    </p>
  </article>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";
import { StarIcon } from "@heroicons/vue/24/solid";

export default defineComponent({
  props: {
    label: { type: String, default: "" },
    modelValue: { type: Number, default: 1 },
  },
  components: { StarIcon },
  emits: ["update:modelValue", "valid"],
  setup(props, { emit }) {
    const { t } = useI18n();

    const input = computed({
      get() {
        return props.modelValue;
      },
      set(value: number) {
        emit("update:modelValue", value);
      },
    });
    // ============================================================= computed

    const error = computed(() => {
      let msg: string = "";

      if (input.value < 0) {
        msg = t("Error.WebinarRating");
      }

      emit("valid", !!!msg);

      return msg;
    });

    const type = computed(() => {
      if (input.value > 4) return "success";
      else if (input.value > 2 && input.value <= 4) return "info";
      else return "error";
    });

    const theme = computed(() => {
      if (type.value == "success") {
        return {
          bg: "bg-success",
          bgLight: "bg-success-light",
          fill: "fill-success",
          stroke: "stroke-success",
          border: "border-success",
          text: "text-success",
        };
      } else if (type.value == "error") {
        return {
          bg: "bg-error",
          bgLight: "bg-error-light",
          fill: "fill-error",
          stroke: "stroke-error",
          border: "border-error",
          text: "text-error",
        };
      } else {
        return {
          bg: "bg-info",
          bgLight: "bg-info-light",
          fill: "fill-info",
          stroke: "stroke-info",
          border: "border-info",
          text: "text-info",
        };
      }
    });

    return { t, input, error, theme };
  },
});
</script>

<style scoped></style>
