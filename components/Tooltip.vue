<script setup>
import { arrow, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { useI18n } from "vue-i18n";
import { ref } from "vue";
const { t } = useI18n();
const props = defineProps({
  heading: String,
  content: String,
  placement: {
    type: String,
    default: "bottom",
  },
});

const referenceRef = ref();
const floatingRef = ref();
const arrowRef = ref();
const isHidden = ref(true);

async function calculatePosition() {
  const { x, y, middlewareData, placement } = await computePosition(
    referenceRef.value,
    floatingRef.value,
    {
      placement: props.placement,
      middleware: [
        offset(8),
        flip(),
        shift({ padding: 5 }),
        arrow({ element: arrowRef.value }),
      ],
    }
  );

  Object.assign(floatingRef.value.style, {
    left: `${x}px`,
    top: `${y}px`,
  });

  const { x: arrowX, y: arrowY } = middlewareData.arrow;

  const opposedSide = {
    left: "right",
    right: "left",
    bottom: "top",
    top: "bottom",
  }[placement.split("-")[0]];

  Object.assign(arrowRef.value.style, {
    left: arrowX ? `${arrowX}px` : "",
    top: arrowY ? `${arrowY}px` : "",
    bottom: "",
    right: "",
    [opposedSide]: "-5px",
  });
}

function hide() {
  isHidden.value = true;
}

function show() {
  isHidden.value = false;
  calculatePosition();
}
</script>

<template>
  <div class="inline-block mb-0 pb-0">
    <div
      ref="referenceRef"
      class="cursor-pointer"
      @blur="hide"
      @focus="show"
      @mouseenter="show"
      @mouseleave="hide"
    >
      <slot />
    </div>
    <div
      @mouseenter="show"
      @mouseleave="hide"
      ref="floatingRef"
      :class="[
        ' absolute w-max max-w-[380px] text-sm top-0 left-0 z-50 bg-light text-subheading p-3  rounded-md cursor-default',
        isHidden && 'hidden',
      ]"
    >
      <p class="block text-white" v-if="!!heading">{{ t(heading) }}</p>
      <p class="mt-3" v-if="!!props.content">
        {{ t(props.content) }}
      </p>
      <div
        ref="arrowRef"
        class="absolute bg-light h-[10px] w-[10px] rotate-45"
      ></div>
    </div>
  </div>
</template>
