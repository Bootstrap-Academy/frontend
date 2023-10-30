<template>
  <article
    class="style-card bg-secondary w-full max-w-3xl relative overflow-y-scroll max-h-full z-[9999]"
  >
    <div class="card grid gap-x-4 md:gap-x-6 grid-cols-[auto_1fr]">
      <component
        class="h-10 w-10 row-span-2 md:row-span-3"
        :class="[theme.fill]"
        :is="theme.icon"
      ></component>

      <h6 class="text-heading-2 text-heading font-heading">
        {{ t(heading) }}
      </h6>

      <p class="text-body-1 text-body font-body m-0 mt-box">
        {{ t(body) }}
      </p>

      <div class="col-span-2 md:col-span-1">
        <slot name="content" :t="t" />
      </div>
    </div>

    <div class="card flex flex-wrap gap-card justify-end bg-[#1c3250]">
      <Btn
        v-if="!!secondaryBtn.label"
        :bgColor="theme.bg"
        :borderColor="theme.border"
        secondary
        @click="
          secondaryBtn.onclick();
          closeDialog();
        "
      >
        {{ t(secondaryBtn.label) }}
      </Btn>
      <Btn
        v-if="!!primaryBtn.label"
        :bgColor="theme.bg"
        :borderColor="theme.border"
        @click="
          primaryBtn.onclick();
          closeDialog();
        "
      >
        {{ t(primaryBtn.label) }}
      </Btn>
    </div>
  </article>
</template>

<script lang="ts">
import {
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
} from "@heroicons/vue/24/solid";

import { defineComponent } from "vue";
import type { PropType } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  props: {
    dialog: { type: Object as PropType<any>, default: null },
  },
  components: {
    ExclamationCircleIcon,
    InformationCircleIcon,
    XCircleIcon,
    CheckCircleIcon,
  },
  setup(props) {
    const { t } = useI18n();

    const type = computed(() => {
      return props.dialog?.type ?? "info";
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
          icon: CheckCircleIcon,
        };
      } else if (type.value == "error") {
        return {
          bg: "bg-error",
          bgLight: "bg-error-light",
          fill: "fill-error",
          stroke: "stroke-error",
          border: "border-error",
          text: "text-error",
          icon: XCircleIcon,
        };
      } else if (type.value == "warning") {
        return {
          bg: "bg-warning",
          bgLight: "bg-warning-light",
          fill: "fill-warning",
          stroke: "stroke-warning",
          border: "border-warning",
          text: "text-warning",
          icon: ExclamationCircleIcon,
        };
      } else {
        return {
          bg: "bg-info",
          bgLight: "bg-info-light",
          fill: "fill-info",
          stroke: "stroke-info",
          border: "border-info",
          text: "text-info",
          icon: InformationCircleIcon,
        };
      }
    });

    const heading = computed(() => {
      return props.dialog?.heading ?? "";
    });

    const body = computed(() => {
      return props.dialog?.body ?? "";
    });

    const primaryBtn = computed(() => {
      return {
        label: props.dialog?.primaryBtn?.label ?? "",
        onclick: props.dialog?.primaryBtn?.onclick ?? null,
      };
    });

    const secondaryBtn = computed(() => {
      let label = props.dialog?.secondaryBtn?.label ?? "";

      return {
        label: label,
        onclick: !!label ? props.dialog.secondaryBtn.onclick : () => {},
      };
    });

    return {
      t,
      theme,
      heading,
      body,
      primaryBtn,
      secondaryBtn,
    };
  },
});
</script>

<style scoped></style>
