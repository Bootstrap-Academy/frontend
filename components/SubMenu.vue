hear
<template>
  <article class="relative h-fit w-fit" @focusout="show = false" tabindex="0">
    <div
      class="h-fit cursor-pointer"
      @click="show = !show"
      :class="[sm ? 'p-2' : 'p-3', { 'rounded bg-secondary': filled }]"
    >
      <EllipsisVerticalIcon class="h-5 w-5 text-body" />
    </div>

    <transition name="slide-up" mode="in-out">
      <button
        v-if="show"
        class="absolute right-[100%] top-[-40%] z-50 grid w-fit appearance-none gap-2 bg-tertiary p-4 style-box"
        :class="filled ? 'right-[150%]' : 'right-[100%]'"
      >
        <p
          class="text-body-2 cursor-pointer whitespace-nowrap text-left text-heading"
          v-for="(item, i) of list"
          :key="i"
          @click="item.onclick"
        >
          {{ t(item.label) }}
        </p>
      </button>
    </transition>
  </article>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
import { defineComponent } from "vue";
import type { PropType } from "vue";
import { EllipsisVerticalIcon } from "@heroicons/vue/24/outline";

export default defineComponent({
  components: { EllipsisVerticalIcon },
  props: {
    list: { type: Array as PropType<any[]>, default: [] },
    sm: { type: Boolean, default: false },
    filled: { type: Boolean, default: false },
  },
  setup(props) {
    const { t } = useI18n();

    const show = ref(false);

    return { t, show };
  },
});
</script>

<style scoped></style>
